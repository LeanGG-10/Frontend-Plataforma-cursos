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
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
  rejectionReason?: string | null;
  submittedAt?: string | null;
  creator?: {
    id: string;
    full_name?: string;
    email?: string;
    role?: string;
  };
}

class BookService {
  private getAuthHeaders(isMultipart = false): HeadersInit {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      const sessionId = localStorage.getItem('activeSessionId');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (sessionId) headers['x-session-id'] = sessionId;
    }
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  private mapBook(data: any): Book {
    return {
      id: data.id,
      title: data.title,
      author: data.book?.author || data.author || 'Élite Educativa',
      price: data.price,
      category:
        data.categoryName || data.book?.category?.name || 'Sin Categoría',
      image:
        data.coverImage ||
        data.coverUrl ||
        data.display?.cover_image ||
        '',
      summary: data.description || data.summary,
      isFeatured: data.isFeatured || data.display?.is_featured,
      status: data.status,
      rejectionReason:
        data.rejectionReason ?? data.book?.rejection_reason ?? null,
      submittedAt: data.submittedAt ?? data.book?.submitted_at ?? null,
      creator: data.creator,
    };
  }

  private async handleResponse<T>(
    response: Response,
    errorMessage: string,
  ): Promise<T> {
    if (!response.ok) {
      let errorDetail = '';
      let isDuplicateWarning = false;
      try {
        const errorData = await response.json();
        errorDetail = errorData.message || JSON.stringify(errorData);
        if (
          response.status === 409 &&
          errorData.code === 'DUPLICATE_TITLE_WARNING'
        ) {
          isDuplicateWarning = true;
        }
      } catch (e) {
        errorDetail = await response.text();
      }

      if (response.status === 500) {
        throw new Error('Servidor temporalmente fuera de servicio');
      }

      const error: any = new Error(errorDetail || errorMessage);
      if (isDuplicateWarning) {
        error.isDuplicateWarning = true;
      }
      throw error;
    }
    return response.json();
  }

  async getAllBooks(
    page: number = 1,
  ): Promise<{ data: Book[]; total: number; page: number; totalPages: number }> {
    const response = await fetch(`${API_URL}/products?page=${page}&limit=12`);
    const result = await this.handleResponse<any>(
      response,
      'Error al obtener los libros',
    );
    return {
      data: result.data.map((b: any) => this.mapBook(b)),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }

  async getMyBooks(
    page: number = 1,
  ): Promise<{ data: Book[]; total: number; page: number; totalPages: number }> {
    const response = await fetch(
      `${API_URL}/products/mine?page=${page}&limit=12`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      },
    );
    const result = await this.handleResponse<any>(
      response,
      'Error al obtener tus libros',
    );
    return {
      data: result.data.map((b: any) => this.mapBook(b)),
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    };
  }

  async createBook(formData: FormData): Promise<Book> {
    const response = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: this.getAuthHeaders(true),
      body: formData,
    });

    const data = await this.handleResponse<any>(
      response,
      'Error al crear el libro',
    );
    return this.mapBook(data);
  }

  async updateBook(id: string, formData: FormData): Promise<Book> {
    const response = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(true),
      body: formData,
    });

    const data = await this.handleResponse<any>(
      response,
      'Error al actualizar el libro',
    );
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
    const data = await this.handleResponse<any[]>(
      response,
      'Error al obtener destacados',
    );
    return data.map((b: any) => this.mapBook(b));
  }

  async toggleFeatured(id: string): Promise<Book> {
    const response = await fetch(`${API_URL}/products/${id}/featured`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });

    const data = await this.handleResponse<any>(
      response,
      'Error al actualizar destacado',
    );
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

  async getBookReadUrl(id: string): Promise<string> {
    const response = await fetch(`${API_URL}/products/${id}/read-url`, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      await this.handleResponse(response, 'Error de acceso a la lectura del libro');
    }

    const data = await response.json();
    return data.url;
  }

  async getPendingBooks(): Promise<Book[]> {
    const response = await fetch(`${API_URL}/admin/products/pending`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    const result = await this.handleResponse<any>(
      response,
      'Error al obtener libros pendientes',
    );
    const items = Array.isArray(result) ? result : result.data || [];
    return items.map((b: any) => this.mapBook(b));
  }

  async approveBook(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/products/${id}/approve`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      await this.handleResponse(response, 'Error al aprobar el libro');
    }
  }

  async rejectBook(id: string, rejectionReason: string): Promise<void> {
    const response = await fetch(`${API_URL}/products/${id}/reject`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
    if (!response.ok) {
      await this.handleResponse(response, 'Error al rechazar el libro');
    }
  }
}

export const bookService = new BookService();
