const API_URL = import.meta.env.PUBLIC_API_URL;

export interface Book {
  id: string;
  title: string;
  author: string;
  price: string | number;
  category: string;
  image: string; // URL de la portada
  summary?: string;
  pdfUrl?: string;
  isFeatured?: boolean;
}

class BookService {
  private getAuthHeaders() {
    const token = localStorage.getItem('accessToken');
    const sessionId = localStorage.getItem('activeSessionId');
    return {
      'Authorization': `Bearer ${token}`,
      'x-session-id': sessionId || '',
    };
  }

  private mapBook(data: any): Book {
    return {
      id: data.id,
      title: data.title,
      author: data.book?.author || 'Élite Educativa',
      price: data.price,
      category: data.categoryName || 'Sin Categoría',
      image: data.coverImage || data.coverUrl,
      summary: data.description,
      isFeatured: data.isFeatured,
    };
  }

  private async handleResponse<T>(response: Response, errorMessage: string): Promise<T> {
    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorData = await response.json();
        errorDetail = JSON.stringify(errorData);
      } catch (e) {
        errorDetail = await response.text();
      }

      console.error(`[BookService Error ${response.status}] ${errorMessage}:`, errorDetail);
      
      if (response.status === 500) {
        throw new Error('Servidor temporalmente fuera de servicio');
      }
      
      throw new Error(errorDetail || errorMessage);
    }
    return response.json();
  }

  async getAllBooks(): Promise<Book[]> {
    const response = await fetch(`${API_URL}/products`);
    const data = await this.handleResponse<any[]>(response, 'Error al obtener los libros');
    return data.map((b: any) => this.mapBook(b));
  }

  async getMyBooks(): Promise<Book[]> {
    const response = await fetch(`${API_URL}/products/mine`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    const data = await this.handleResponse<any[]>(response, 'Error al obtener tus libros');
    return data.map((b: any) => this.mapBook(b));
  }

  async createBook(formData: FormData): Promise<Book> {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    });

    const data = await this.handleResponse<any>(response, 'Error al crear el producto');
    return this.mapBook(data);
  }

  async deleteBook(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      await this.handleResponse(response, 'Error al eliminar el libro');
    }
  }

  async getFeaturedBooks(): Promise<Book[]> {
    const response = await fetch(`${API_URL}/products/featured`);
    const data = await this.handleResponse<any[]>(response, 'Error al obtener destacados');
    return data.map((b: any) => this.mapBook(b));
  }

  async toggleFeatured(id: string): Promise<Book> {
    const response = await fetch(`${API_URL}/products/${id}/featured`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    
    const data = await this.handleResponse<any>(response, 'Error al actualizar destacado');
    return this.mapBook(data);
  }

  async getBookAccessUrl(id: string): Promise<string> {
    const response = await fetch(`${API_URL}/products/${id}/access`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      await this.handleResponse(response, 'Error de acceso al archivo');
    }
    
    return response.text(); 
  }
}

export const bookService = new BookService();
