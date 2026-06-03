import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.hoisted(() => {
  vi.stubEnv('PUBLIC_API_URL', 'http://localhost:3000');
});

import { authService, ACCESS_TOKEN_KEY, SESSION_ID_KEY, USER_STORAGE_KEY } from '../src/services/auth.service';

describe('AuthService Test Suite', () => {
  const mockApiUrl = 'http://localhost:3000';

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Clear all mocks
    vi.restoreAllMocks();
  });

  describe('1. Happy Path (Flujos Ideales)', () => {
    it('should_store_credentials_and_trigger_event_on_successful_login', async () => {
      const mockUserData = { id: 'u1', email: 'test@elite.com', role: 'USER', name: 'Test User' };
      const mockResponse = {
        accessToken: 'mock-jwt-token',
        activeSessionId: 'mock-session-id',
        user: mockUserData,
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      globalThis.fetch = fetchMock;

      const eventListenerMock = vi.fn();
      window.addEventListener('auth-updated', eventListenerMock);

      const result = await authService.login('test@elite.com', 'password123');

      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@elite.com', password: 'password123' }),
      });

      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('mock-jwt-token');
      expect(localStorage.getItem(SESSION_ID_KEY)).toBe('mock-session-id');
      expect(localStorage.getItem(USER_STORAGE_KEY)).toBe(JSON.stringify(mockUserData));

      expect(eventListenerMock).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
      
      window.removeEventListener('auth-updated', eventListenerMock);
    });

    it('should_call_signup_endpoint_with_correct_payload_on_register', async () => {
      const mockResponse = { success: true };
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      globalThis.fetch = fetchMock;

      const result = await authService.register('Test User', 'test@elite.com', 'password123');

      expect(fetchMock).toHaveBeenCalledWith(`${mockApiUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test User', email: 'test@elite.com', password: 'password123' }),
      });
      expect(result).toEqual(mockResponse);
    });

    it('should_clear_credentials_and_redirect_on_logout', () => {
      localStorage.setItem(ACCESS_TOKEN_KEY, 'some-token');
      localStorage.setItem(SESSION_ID_KEY, 'some-session');
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ role: 'ADMIN' }));

      // Mock window.location
      const locationMock = { href: '' };
      vi.stubGlobal('location', locationMock as any);

      authService.logout();

      expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
      expect(localStorage.getItem(SESSION_ID_KEY)).toBeNull();
      expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
      expect(locationMock.href).toBe('/login');
    });
  });

  describe('2. Edge Cases (Casos Límite)', () => {
    it('should_correctly_identify_authentication_state', () => {
      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.getUser()).toBeNull();

      localStorage.setItem(ACCESS_TOKEN_KEY, 'token');
      expect(authService.isAuthenticated()).toBe(true);

      localStorage.setItem(USER_STORAGE_KEY, 'invalid-json');
      expect(authService.getUser()).toBeNull();
    });

    it('should_retrieve_user_and_token_correctly', () => {
      const mockUser = { email: 'admin@elite.com', role: 'ADMIN' };
      localStorage.setItem(ACCESS_TOKEN_KEY, 'my-token');
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));

      expect(authService.getToken()).toBe('my-token');
      expect(authService.getUser()).toEqual(mockUser);
    });
  });

  describe('3. Gestión de Errores Defensiva (Error Handling)', () => {
    it('should_throw_error_payload_if_login_endpoint_returns_non_ok', async () => {
      const mockError = { message: 'Invalid credentials', error: 'Unauthorized', statusCode: 401 };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockError,
      });

      await expect(authService.login('test@elite.com', 'wrong-pass')).rejects.toEqual(mockError);
    });

    it('should_throw_error_payload_if_register_endpoint_returns_non_ok', async () => {
      const mockError = { message: 'Email already exists', error: 'Conflict', statusCode: 409 };
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => mockError,
      });

      await expect(authService.register('Test', 'test@elite.com', 'pass')).rejects.toEqual(mockError);
    });
  });
});
