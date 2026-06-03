// TS Interfaces for Backend Contracts
export interface CreateOrderResponse {
  orderID: string;
}

export interface CaptureOrderResponse {
  success: boolean;
}

export interface ReadUrlResponse {
  url: string;
}

// Strict Types for PayPal SDK to prevent global 'any' usages
export interface PayPalButtonStyles {
  layout?: 'vertical' | 'horizontal';
  color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
  shape?: 'rect' | 'pill';
  label?: 'paypal' | 'checkout' | 'pay' | 'buynow';
  height?: number;
}

export interface PayPalButtonsInstance {
  render: (container: string | HTMLElement | null) => Promise<void>;
}

export interface PayPalSDK {
  Buttons: (options: {
    style?: PayPalButtonStyles;
    createOrder?: () => Promise<string>;
    onApprove?: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: Error) => void;
  }) => PayPalButtonsInstance;
}

export function setupPayPalButton(wrapperElement: HTMLDivElement) {
  const wrapper = wrapperElement;
  const bookId = wrapper.getAttribute('data-book-id') || '';
  const apiUrl = wrapper.getAttribute('data-api-url') || '';
  const paypalClientId = wrapper.getAttribute('data-paypal-client-id') || '';

  // Component DOM references
  const loader = wrapper.querySelector('#paypal-loading') as HTMLDivElement;
  const loginPrompt = wrapper.querySelector('#paypal-login-prompt') as HTMLDivElement;
  const readBtn = wrapper.querySelector('#paypal-read-btn') as HTMLButtonElement;
  const paypalContainer = wrapper.querySelector('#paypal-buttons-container') as HTMLDivElement;
  const errorBanner = wrapper.querySelector('#paypal-error-banner') as HTMLDivElement;
  const errorMessage = wrapper.querySelector('#paypal-error-message') as HTMLParagraphElement;
  const errorTitle = wrapper.querySelector('#paypal-error-title') as HTMLParagraphElement;
  const errorClose = wrapper.querySelector('#paypal-error-close') as HTMLButtonElement;
  const feedbackBanner = wrapper.querySelector('#paypal-feedback-banner') as HTMLDivElement;

  // Retrieve storage keys directly from AuthService conventions
  function getAuthSession() {
    const token = localStorage.getItem('accessToken');
    const sessionId = localStorage.getItem('activeSessionId');
    return { token, sessionId };
  }

  const userDataStr = localStorage.getItem('elite_user_data');

  // Initialize UI flow
  init();

  async function init() {
    // Bind error close button
    errorClose?.addEventListener('click', hideError);

    const { token } = getAuthSession();
    if (!token) {
      // User not logged in, show login prompt
      hideElement(loader);
      showElement(loginPrompt);
      return;
    }

    // Check if user is ADMIN directly from local state first
    if (userDataStr) {
      try {
        const user = JSON.parse(userDataStr);
        if (user?.role === 'ADMIN') {
          setupReadMode();
          return;
        }
      } catch (e) {
        // Defensive parse catch
      }
    }

    // Check server access permissions (ADMIN or past purchases)
    const hasAccess = await checkAccess();
    if (hasAccess) {
      setupReadMode();
    } else {
      await initPayPalSDK();
    }
  }

  // Helper functions for DOM manipulations
  function showElement(el: HTMLElement) {
    if (el) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    }
  }

  function hideElement(el: HTMLElement) {
    if (el) {
      el.classList.remove('flex');
      el.classList.add('hidden');
    }
  }

  function showError(title: string, message: string) {
    if (errorBanner && errorMessage && errorTitle) {
      errorTitle.textContent = title;
      errorMessage.textContent = message;
      showElement(errorBanner);
    }
  }

  function hideError() {
    if (errorBanner) {
      hideElement(errorBanner);
    }
  }

  // Server permission query
  async function checkAccess(): Promise<boolean> {
    const { token, sessionId } = getAuthSession();
    if (!token) return false;
    try {
      const response = await fetch(`${apiUrl}/products/${bookId}/read-url`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-session-id': sessionId || '',
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200 || response.status === 201) {
        return true;
      }

      return false;
    } catch (err) {
      return false;
    }
  }

  // Setup direct read button on click gesture to prevent pop-up blocking
  function setupReadMode() {
    hideElement(loader);
    hideElement(paypalContainer);
    hideElement(loginPrompt);
    showElement(readBtn);

    // Event listener on read button
    readBtn.onclick = async () => {
      try {
        hideError();
        readBtn.disabled = true;
        const textSpan = readBtn.querySelector('span');
        const originalText = textSpan ? textSpan.textContent : 'Leer Obra';
        if (textSpan) textSpan.textContent = 'Obteniendo acceso...';

        const { token, sessionId } = getAuthSession();
        if (!token) {
          showError('Sesión Requerida', 'Tu sesión ha expirado o no has iniciado sesión.');
          if (textSpan) textSpan.textContent = originalText;
          readBtn.disabled = false;
          return;
        }

        const response = await fetch(`${apiUrl}/products/${bookId}/read-url`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-session-id': sessionId || '',
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 200 || response.status === 201) {
          const data: ReadUrlResponse = await response.json();
          if (data.url) {
            window.open(data.url, '_blank', 'noopener,noreferrer');
          } else {
            showError('Error de dirección', 'No se obtuvo un enlace válido para visualizar el libro.');
          }
        } else if (response.status === 401) {
          showError('Sesión Expirada', 'Tu sesión ha expirado. Por favor, recarga la página e inicia sesión nuevamente.');
        } else {
          showError('Acceso denegado', 'No cuentas con los permisos o la compra activa para leer este libro.');
        }

        if (textSpan) textSpan.textContent = originalText;
        readBtn.disabled = false;
      } catch (err) {
        showError('Error de conexión', 'No se pudo contactar al servidor. Revisa tu conexión de red.');
        readBtn.disabled = false;
      }
    };
  }

  // PayPal SDK loader & renderer
  async function initPayPalSDK() {
    if (!paypalClientId) {
      hideElement(loader);
      showError('Error de Configuración', 'El identificador público de PayPal (Client ID) no está definido. Comuníquese con soporte.');
      return;
    }

    try {
      await loadScript(`https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(paypalClientId)}&currency=USD&intent=capture`);
      
      const win = window as unknown as { paypal?: PayPalSDK };
      if (!win.paypal) {
        throw new Error('PayPal SDK no disponible en el objeto window.');
      }

      // Pre-clear the mount node to avoid duplicate buttons rendering and memory leaks
      const mountNode = wrapper.querySelector('#paypal-button-mount') as HTMLDivElement;
      if (mountNode) {
        mountNode.innerHTML = '';
      }

      // Render buttons
      win.paypal.Buttons({
        style: {
          layout: 'vertical',
          color: 'gold',
          shape: 'rect',
          label: 'pay'
        },
        createOrder: async () => {
          hideError();
          const { token, sessionId } = getAuthSession();
          if (!token) {
            showError('Sesión Expirada', 'No se encontró una sesión activa. Por favor, inicia sesión de nuevo.');
            throw new Error('UNAUTHORIZED');
          }
          try {
            const res = await fetch(`${apiUrl}/payments/paypal/create-order`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-session-id': sessionId || '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ productId: bookId })
            });

            if (res.status === 401) {
              showError('Sesión Expirada', 'Tu sesión ha expirado. Por favor, recarga la página e inicia sesión nuevamente.');
              throw new Error('UNAUTHORIZED');
            }

            if (!res.ok) {
              const errText = await res.text();
              throw new Error(errText || 'Error al iniciar la orden de pago');
            }

            const data: CreateOrderResponse = await res.json();
            if (!data.orderID) {
              throw new Error('El servidor no retornó un orderID válido');
            }
            return data.orderID;

          } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message !== 'UNAUTHORIZED') {
              showError('Error de Pago', 'No pudimos registrar tu orden. Inténtalo de nuevo.');
            }
            throw error;
          }
        },
        onApprove: async (data: { orderID: string }) => {
          hideError();
          showElement(loader);
          hideElement(paypalContainer);

          const { token, sessionId } = getAuthSession();
          if (!token) {
            showError('Sesión Expirada', 'Tu sesión expiró mientras realizabas el pago. Por favor, recarga la página e inicia sesión nuevamente.');
            hideElement(loader);
            showElement(paypalContainer);
            return;
          }

          try {
            const res = await fetch(`${apiUrl}/payments/paypal/capture-order`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'x-session-id': sessionId || '',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ paypalOrderId: data.orderID })
            });

            if (res.status === 401) {
              showError('Sesión Expirada', 'Tu sesión expiró mientras realizabas el pago. Por favor, recarga la página e inicia sesión nuevamente.');
              hideElement(loader);
              showElement(paypalContainer);
              return;
            }

            if (!res.ok) {
              const errText = await res.text();
              throw new Error(errText || 'Error al capturar la orden de pago');
            }

            const captureData: CaptureOrderResponse = await res.json();
            if (captureData.success) {
              showElement(feedbackBanner);
              setupReadMode();
            } else {
              throw new Error('La captura de pago no fue confirmada por el servidor.');
            }
          } catch (err: unknown) {
            showError('Falla de Captura', 'El dinero no pudo ser capturado o verificado. Contacta a soporte.');
            hideElement(loader);
            showElement(paypalContainer);
          }
        },
        onCancel: () => {
          showError('Pago Cancelado', 'Has cancelado la transacción de pago de PayPal.');
        },
        onError: (err: Error) => {
          const errStr = String(err).toLowerCase();
          if (errStr.includes('decline') || errStr.includes('insufficient')) {
            showError('Fondos Insuficientes', 'La transacción fue rechazada por fondos insuficientes o rechazo de tarjeta.');
          } else {
            showError('Falla de Transacción', 'Ocurrió un error inesperado con PayPal. Inténtalo de nuevo o usa otro método de pago.');
          }
        }
      }).render(mountNode);

      hideElement(loader);
      showElement(paypalContainer);

    } catch (err) {
      hideElement(loader);
      showError('Falla de Carga', 'No se pudo cargar la pasarela de PayPal de forma segura. Revisa tu conexión de red o extensiones bloqueadoras de anuncios.');
    }
  }

  function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let existing: HTMLElement | null = null;
      const scripts = document.getElementsByTagName('script');
      for (let i = 0; i < scripts.length; i++) {
        if (scripts[i].getAttribute('src') === src) {
          existing = scripts[i];
          break;
        }
      }

      if (existing) {
        const win = window as unknown as { paypal?: PayPalSDK };
        if (win.paypal) {
          resolve();
          return;
        }
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', (e) => reject(e));
        return;
      }

      try {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      } catch (err) {
        reject(err);
      }
    });
  }
}

// Auto-run if running inside browser
if (typeof document !== 'undefined') {
  document.querySelectorAll('.elite-paypal-wrapper').forEach((wrapperElement) => {
    setupPayPalButton(wrapperElement as HTMLDivElement);
  });
}
