const API_URL = import.meta.env.PUBLIC_API_URL;

class UsersAdminService {
  private getAuthHeaders() {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('accessToken');
    const sessionId = localStorage.getItem('activeSessionId');
    return {
      'Authorization': `Bearer ${token}`,
      'x-session-id': sessionId || '',
      'Content-Type': 'application/json'
    };
  }

  async getAllUsers() {
    const response = await fetch(`${API_URL}/admin/users`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener los usuarios');
    return response.json();
  }

  async updateUserRole(id: string, role: string) {
    const response = await fetch(`${API_URL}/admin/users/${id}/role`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al actualizar el rol');
    }
    return response.json();
  }

  async disableUser(id: string) {
    const response = await fetch(`${API_URL}/admin/users/${id}/disable`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al desactivar el usuario');
    }
    return response.json();
  }

  async enableUser(id: string) {
    const response = await fetch(`${API_URL}/admin/users/${id}/enable`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al reactivar el usuario');
    }
    return response.json();
  }
}

export const usersAdminService = new UsersAdminService();
