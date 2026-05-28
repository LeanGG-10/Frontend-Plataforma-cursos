const API_URL = import.meta.env.PUBLIC_API_URL;

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

class CategoryService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    const sessionId = localStorage.getItem('activeSessionId');
    return {
      'Authorization': `Bearer ${token}`,
      'x-session-id': sessionId || '',
      'Content-Type': 'application/json',
    };
  }

  async getAllCategories(): Promise<Category[]> {
    const response = await fetch(`${API_URL}/categories`);
    if (!response.ok) throw new Error('Error al cargar categorías');
    return response.json();
  }

  async createCategory(name: string): Promise<Category> {
    const response = await fetch(`${API_URL}/categories`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al crear categoría');
    }
    return response.json();
  }

  async updateCategory(id: string, name: string): Promise<Category> {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al actualizar categoría');
    }
    return response.json();
  }

  async deleteCategory(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/categories/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Error al eliminar categoría');
    }
  }
}

export const categoryService = new CategoryService();
