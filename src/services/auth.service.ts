const API_URL = import.meta.env.PUBLIC_API_URL;

export const USER_STORAGE_KEY = 'elite_user_data';
export const ACCESS_TOKEN_KEY = 'accessToken';
export const SESSION_ID_KEY = 'activeSessionId';

export interface AuthResponse {
  accessToken: string;
  activeSessionId: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
    role: string;
  };
}

export interface AuthError {
  message: string | string[];
  error: string;
  statusCode: number;
}

class AuthService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData: AuthError = await response.json();
      throw errorData;
    }
    return response.json();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const url = `${API_URL}/auth/login`;
    
    const payload = {
      email: email.trim(),
      password: password.trim()
    };

    console.log(`[AuthService] Iniciando login en: ${url}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    console.log("[AuthService] Datos recibidos del server:", data);

    this.saveSession(data);
    
    // Broadcast del cambio para otros componentes
    window.dispatchEvent(new Event('auth-updated'));
    
    return data;
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const url = `${API_URL}/auth/signup`;
    const payload = {
      name: name.trim(),
      email: email.trim(),
      password: password.trim()
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    return this.handleResponse<AuthResponse>(response);
  }

  private saveSession(data: any) {
    // Limpieza de seguridad
    localStorage.clear();

    // Extraer token y sessionId de la respuesta
    const token = data.accessToken || data.access_token || data.token;
    const sessionId = data.activeSessionId || data.active_session_id || data.sessionId;
    const userData = data.user || data;
    
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    if (sessionId) localStorage.setItem(SESSION_ID_KEY, sessionId);
    
    // Extracción directa del objeto user según requerimiento
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    console.log("[AuthService] Usuario guardado en elite_user_data:", userData);
  }

  logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    window.location.href = '/login';
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getUser() {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(USER_STORAGE_KEY);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  async resendConfirmation(email: string): Promise<void> {
    const url = `${API_URL}/auth/resend-confirmation`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!response.ok) {
      const errorData: AuthError = await response.json();
      throw errorData;
    }
  }

  async recoverPassword(email: string): Promise<void> {
    const url = `${API_URL}/auth/recover-password`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });

    if (!response.ok) {
      const errorData: AuthError = await response.json();
      throw errorData;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const url = `${API_URL}/auth/reset-password`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });

    if (!response.ok) {
      const errorData: AuthError = await response.json();
      throw errorData;
    }

    // Limpiar sesión actual por seguridad
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(SESSION_ID_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export const authService = new AuthService();
