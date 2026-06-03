import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupPayPalButton } from '../src/components/paypal-button';

describe('PayPalPaymentButton UI Test Suite', () => {
  const apiUrl = 'http://localhost:3000';
  const bookId = 'book-456';
  const clientId = 'client-id-abc';

  // Helper to create the component DOM structure
  function createMockDOM(opts: { bookId?: string; apiUrl?: string; clientId?: string | null } = {}) {
    const wrapper = document.createElement('div');
    wrapper.className = 'elite-paypal-wrapper';
    wrapper.setAttribute('data-book-id', opts.bookId ?? bookId);
    wrapper.setAttribute('data-api-url', opts.apiUrl ?? apiUrl);
    if (opts.clientId !== null) {
      wrapper.setAttribute('data-paypal-client-id', opts.clientId ?? clientId);
    }

    wrapper.innerHTML = `
      <div id="paypal-loading" class="flex">Verificando acceso...</div>
      <div id="paypal-login-prompt" class="hidden">
        <p>Debes iniciar sesión</p>
        <a href="/login">Iniciar Sesión</a>
      </div>
      <button id="paypal-read-btn" class="hidden">
        <span>Leer Obra</span>
      </button>
      <div id="paypal-buttons-container" class="hidden">
        <div id="paypal-button-mount"></div>
      </div>
      <div id="paypal-feedback-banner" class="hidden">
        <p id="paypal-feedback-message">El pago se ha procesado con éxito.</p>
      </div>
      <div id="paypal-error-banner" class="hidden">
        <p id="paypal-error-title"></p>
        <p id="paypal-error-message"></p>
        <button id="paypal-error-close">&times;</button>
      </div>
    `;
    return wrapper;
  }

  // Helper to trigger events
  let paypalButtonsMock: any = {};
  let paypalMock: any = {};

  beforeEach(() => {
    // Clear document body, head, and localStorage
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    localStorage.clear();
    vi.restoreAllMocks();

    // Mock window.open
    vi.stubGlobal('open', vi.fn());

    // Mock PayPal SDK global object
    paypalButtonsMock = {
      render: vi.fn().mockImplementation((mount) => {
        // Simulates rendering
        let mountEl: Element | null = null;
        if (typeof mount === 'string') {
          mountEl = document.querySelector(mount);
        } else {
          mountEl = mount;
        }
        if (mountEl) {
          mountEl.innerHTML = '<div class="mocked-paypal-buttons">PayPal UI</div>';
        }
        return Promise.resolve();
      }),
    };

    paypalMock = {
      Buttons: vi.fn().mockReturnValue(paypalButtonsMock),
    };

    vi.stubGlobal('paypal', paypalMock);

    // Mock document.createElement to return a meta for script tags (prevents JSDOM network errors and hierarchy errors in head)
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation(function (this: any, tagName: string, options?: any) {
      if (tagName.toLowerCase() === 'script') {
        const dummy = originalCreateElement.call(document, 'meta');
        // Add a src property so we can track it
        (dummy as any).src = '';
        return dummy as any;
      }
      return originalCreateElement.call(this, tagName, options);
    });

    // Mock Node.prototype.appendChild to trigger onload for our dummy scripts
    const originalAppendChild = Node.prototype.appendChild;
    vi.spyOn(Node.prototype, 'appendChild').mockImplementation(function (this: any, node: any) {
      if (node && node.tagName && node.tagName.toUpperCase() === 'META' && (node as any).src && (node as any).src.includes('paypal.com')) {
        setTimeout(() => {
          if (node.onload) {
            node.onload(new Event('load'));
          }
        }, 0);
        return node;
      }
      return originalAppendChild.call(this, node);
    });
  });

  describe('1. Happy Path (Flujos Ideales)', () => {
    it('should_initialize_paypal_buttons_correctly_if_user_does_not_own_book', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');
      localStorage.setItem('activeSessionId', 'session-123');

      // mock access check: returns 404/403 meaning book is not owned
      const fetchMock = vi.fn().mockResolvedValue({
        status: 403,
      });
      globalThis.fetch = fetchMock;

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      // Wait for async initialization
      await vi.waitFor(() => {
        const paypalContainer = wrapper.querySelector('#paypal-buttons-container');
        expect(paypalContainer?.classList.contains('hidden')).toBe(false);
      });

      expect(fetchMock).toHaveBeenCalledWith(`${apiUrl}/products/${bookId}/read-url`, expect.any(Object));
      expect(paypalMock.Buttons).toHaveBeenCalled();
      expect(paypalButtonsMock.render).toHaveBeenCalledWith(wrapper.querySelector('#paypal-button-mount'));
    });

    it('should_render_read_mode_immediately_if_user_owns_book', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');

      // mock access check: returns 200 (book is owned)
      globalThis.fetch = vi.fn().mockResolvedValue({
        status: 200,
      });

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        const readBtn = wrapper.querySelector('#paypal-read-btn');
        expect(readBtn?.classList.contains('hidden')).toBe(false);
      });

      const paypalContainer = wrapper.querySelector('#paypal-buttons-container');
      const loader = wrapper.querySelector('#paypal-loading');
      expect(paypalContainer?.classList.contains('hidden')).toBe(true);
      expect(loader?.classList.contains('hidden')).toBe(true);
    });

    it('should_render_read_mode_immediately_if_role_is_admin', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');
      localStorage.setItem('elite_user_data', JSON.stringify({ role: 'ADMIN' }));

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        const readBtn = wrapper.querySelector('#paypal-read-btn');
        expect(readBtn?.classList.contains('hidden')).toBe(false);
      });

      // admin should skip checking backend read-url in init
      expect(paypalMock.Buttons).not.toHaveBeenCalled();
    });

    it('should_process_paypal_checkout_flow_and_transition_to_read_mode_on_success', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');
      localStorage.setItem('activeSessionId', 'session-123');

      // mock initial checkAccess to fail (not owned)
      // then mock createOrder endpoint to return orderID
      // then mock captureOrder endpoint to return success: true
      const fetchMock = vi.fn().mockImplementation(async (url, options) => {
        if (url.includes(`/products/${bookId}/read-url`)) {
          return { status: 403 };
        }
        if (url.includes('/payments/paypal/create-order')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ orderID: 'paypal-order-999' }),
          };
        }
        if (url.includes('/payments/paypal/capture-order')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({ success: true }),
          };
        }
        return { status: 404 };
      });
      globalThis.fetch = fetchMock;

      // Capture options passed to paypal.Buttons
      let buttonsConfig: any = null;
      paypalMock.Buttons = vi.fn().mockImplementation((config) => {
        buttonsConfig = config;
        return paypalButtonsMock;
      });

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        expect(buttonsConfig).not.toBeNull();
      });

      // 1. Simulate SDK createOrder hook call
      const orderID = await buttonsConfig.createOrder();
      expect(orderID).toBe('paypal-order-999');
      expect(globalThis.fetch).toHaveBeenCalledWith(`${apiUrl}/payments/paypal/create-order`, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ productId: bookId }),
      }));

      // 2. Simulate SDK onApprove hook call
      await buttonsConfig.onApprove({ orderID: 'paypal-order-999' });

      // The UI should display capture loader, hide buttons container
      const loader = wrapper.querySelector('#paypal-loading');
      const paypalContainer = wrapper.querySelector('#paypal-buttons-container');
      const feedbackBanner = wrapper.querySelector('#paypal-feedback-banner');
      const readBtn = wrapper.querySelector('#paypal-read-btn');

      // Capture fetch call verified
      expect(globalThis.fetch).toHaveBeenCalledWith(`${apiUrl}/payments/paypal/capture-order`, expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ paypalOrderId: 'paypal-order-999' }),
      }));

      // Elements state verified
      expect(feedbackBanner?.classList.contains('hidden')).toBe(false);
      expect(readBtn?.classList.contains('hidden')).toBe(false);
      expect(paypalContainer?.classList.contains('hidden')).toBe(true);
    });
  });

  describe('2. Edge Cases (Casos Límite)', () => {
    it('should_render_config_error_banner_if_client_id_is_undefined', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');

      // mock access check to fail
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 403 });

      // Create DOM without paypal client id
      const wrapper = createMockDOM({ clientId: null });
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        const errorBanner = wrapper.querySelector('#paypal-error-banner');
        expect(errorBanner?.classList.contains('hidden')).toBe(false);
        const errorTitle = wrapper.querySelector('#paypal-error-title');
        expect(errorTitle?.textContent).toBe('Error de Configuración');
      });
    });

    it('should_intercept_and_show_session_expired_if_jwt_is_cleared_during_createOrder', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');

      // mock initial checkAccess to fail
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 403 });

      let buttonsConfig: any = null;
      paypalMock.Buttons = vi.fn().mockImplementation((config) => {
        buttonsConfig = config;
        return paypalButtonsMock;
      });

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        expect(buttonsConfig).not.toBeNull();
      });

      // Clear JWT before createOrder fires
      localStorage.removeItem('accessToken');

      await expect(buttonsConfig.createOrder()).rejects.toThrow('UNAUTHORIZED');

      const errorBanner = wrapper.querySelector('#paypal-error-banner');
      expect(errorBanner?.classList.contains('hidden')).toBe(false);
      const errorMessage = wrapper.querySelector('#paypal-error-message');
      expect(errorMessage?.textContent).toContain('No se encontró una sesión activa');
    });

    it('should_intercept_and_show_session_expired_if_jwt_is_cleared_during_onApprove', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');

      // mock initial checkAccess to fail
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 403 });

      let buttonsConfig: any = null;
      paypalMock.Buttons = vi.fn().mockImplementation((config) => {
        buttonsConfig = config;
        return paypalButtonsMock;
      });

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        expect(buttonsConfig).not.toBeNull();
      });

      // Clear JWT before onApprove fires
      localStorage.removeItem('accessToken');

      await buttonsConfig.onApprove({ orderID: 'order-999' });

      const errorBanner = wrapper.querySelector('#paypal-error-banner');
      expect(errorBanner?.classList.contains('hidden')).toBe(false);
      const errorMessage = wrapper.querySelector('#paypal-error-message');
      expect(errorMessage?.textContent).toContain('Tu sesión expiró mientras realizabas el pago');
    });
  });

  describe('3. Gestión de Errores Defensiva (Error Handling)', () => {
    it('should_keep_paypal_button_visible_if_backend_returns_403_initially', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');

      // mock checkAccess to return 403 (unauthorized/not owned)
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 403 });

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        const paypalContainer = wrapper.querySelector('#paypal-buttons-container');
        expect(paypalContainer?.classList.contains('hidden')).toBe(false);
      });

      expect(paypalMock.Buttons).toHaveBeenCalled();
    });

    it('should_restore_buttons_and_display_banner_if_capture_returns_500_server_error', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');

      // mock initial checkAccess to fail, and capture-order to return 500
      globalThis.fetch = vi.fn().mockImplementation(async (url) => {
        if (url.includes(`/products/${bookId}/read-url`)) {
          return { status: 403 };
        }
        if (url.includes('/payments/paypal/capture-order')) {
          return {
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
          };
        }
        return { status: 404 };
      });

      let buttonsConfig: any = null;
      paypalMock.Buttons = vi.fn().mockImplementation((config) => {
        buttonsConfig = config;
        return paypalButtonsMock;
      });

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        expect(buttonsConfig).not.toBeNull();
      });

      // Run onApprove which will trigger the capture call and fail
      await buttonsConfig.onApprove({ orderID: 'failed-order' });

      // Verify buttons are restored and error is rendered
      const loader = wrapper.querySelector('#paypal-loading');
      const paypalContainer = wrapper.querySelector('#paypal-buttons-container');
      const errorBanner = wrapper.querySelector('#paypal-error-banner');
      const errorMessage = wrapper.querySelector('#paypal-error-message');

      expect(loader?.classList.contains('hidden')).toBe(true);
      expect(paypalContainer?.classList.contains('hidden')).toBe(false);
      expect(errorBanner?.classList.contains('hidden')).toBe(false);
      expect(errorMessage?.textContent).toBe('El dinero no pudo ser capturado o verificado. Contacta a soporte.');
    });
  });

  describe('4. Mocking de APIs y Eventos Globales', () => {
    it('should_trigger_onCancel_and_show_cancelled_banner', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 403 });

      let buttonsConfig: any = null;
      paypalMock.Buttons = vi.fn().mockImplementation((config) => {
        buttonsConfig = config;
        return paypalButtonsMock;
      });

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        expect(buttonsConfig).not.toBeNull();
      });

      // Simulate SDK onCancel callback
      buttonsConfig.onCancel();

      const errorBanner = wrapper.querySelector('#paypal-error-banner');
      const errorTitle = wrapper.querySelector('#paypal-error-title');
      const errorMessage = wrapper.querySelector('#paypal-error-message');

      expect(errorBanner?.classList.contains('hidden')).toBe(false);
      expect(errorTitle?.textContent).toBe('Pago Cancelado');
      expect(errorMessage?.textContent).toContain('Has cancelado la transacción');
    });

    it('should_trigger_onError_and_show_failed_banner', async () => {
      localStorage.setItem('accessToken', 'valid-jwt');
      globalThis.fetch = vi.fn().mockResolvedValue({ status: 403 });

      let buttonsConfig: any = null;
      paypalMock.Buttons = vi.fn().mockImplementation((config) => {
        buttonsConfig = config;
        return paypalButtonsMock;
      });

      const wrapper = createMockDOM();
      document.body.appendChild(wrapper);

      setupPayPalButton(wrapper);

      await vi.waitFor(() => {
        expect(buttonsConfig).not.toBeNull();
      });

      // Simulate SDK onError callback with decline
      buttonsConfig.onError(new Error('INSTRUMENT_DECLINED'));

      const errorBanner = wrapper.querySelector('#paypal-error-banner');
      const errorTitle = wrapper.querySelector('#paypal-error-title');
      const errorMessage = wrapper.querySelector('#paypal-error-message');

      expect(errorBanner?.classList.contains('hidden')).toBe(false);
      expect(errorTitle?.textContent).toBe('Fondos Insuficientes');
      expect(errorMessage?.textContent).toContain('La transacción fue rechazada');
    });
  });
});
