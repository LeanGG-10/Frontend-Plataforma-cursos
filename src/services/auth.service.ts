const API_URL = import.meta.env.PUBLIC_API_URL;

export interface AuthResponse {
  accessToken: string;
  activeSessionId: string;
  user: {
    id: string;
    email: string;
    name?: string;
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
    
    // Trim and prepare payload to match backend DTO
    const payload = {
      email: email.trim(),
      password: password.trim()
    };

    console.log(`[AuthService] Attempting login at: ${url}`);
    console.log('[AuthService] Payload (JSON.stringify):', JSON.stringify(payload));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    console.log('[AuthService] Login response data:', data);
    this.saveSession(data);
    return data;
  }

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const url = `${API_URL}/auth/signup`;

    // Trim and prepare payload to match backend DTO
    const payload = {
      name: name.trim(),
      email: email.trim(),
      password: password.trim()
    };

    console.log(`[AuthService] Attempting register at: ${url}`);
    console.log('[AuthService] Payload (JSON.stringify):', JSON.stringify(payload));

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    // El registro solo devuelve el usuario, no iniciamos sesión automáticamente
    return data;
  }

  async resendConfirmation(email: string): Promise<any> {
    const url = `${API_URL}/auth/resend-confirmation`;
    console.log(`[AuthService] Attempting resend at: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });

    return this.handleResponse(response);
  }

  private saveSession(data: any) {
    console.log('Raw Response from Server:', data);
    
    // Limpieza previa para evitar basura de sesiones anteriores
    localStorage.clear();

    // Mapeo flexible para detectar nombres de llaves (NestJS suele usar camelCase o snake_case)
    const token = data.accessToken || data.access_token || data.token;
    const sessionId = data.activeSessionId || data.active_session_id || data.sessionId;
    const user = data.user || data.profile || data.data?.user;

    if (token) localStorage.setItem('accessToken', token);
    if (sessionId) localStorage.setItem('activeSessionId', sessionId);
    if (user) localStorage.setItem('user', JSON.stringify(user));
    
    console.log('Stored Token:', localStorage.getItem('accessToken'));
    console.log('Stored SessionID:', localStorage.getItem('activeSessionId'));

    if (!token) {
      console.log('[AuthService] Info: No se encontró un token. Esto es normal en el registro.');
    } else {
      console.log('%c[AuthSuccess] Sesión persistida correctamente.', 'color: #C9A44A; font-weight: bold;');
    }
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('activeSessionId');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  getToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getSessionId(): string | null {
    return localStorage.getItem('activeSessionId');
  }
}

export const authService = new AuthService();
