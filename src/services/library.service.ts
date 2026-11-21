const API_URL = import.meta.env.PUBLIC_API_URL;

export interface CourseProgress {
  totalLessons: number;
  completedLessons: number;
  percentage: number;
  total_lessons: number;
  completed_lessons: number;
  percentage_completed: number;
  completedLessonIds: string[];
}

export interface LibraryCourse {
  id: string;
  productId: string;
  title: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  instructor?: string;
  duration?: number;
  level?: string;
  category?: string;
  purchasedAt: string;
  progress: CourseProgress;
}

export interface LibraryBook {
  id: string;
  productId: string;
  title: string;
  slug?: string;
  description?: string;
  coverImage?: string;
  author?: string;
  format?: string;
  isbn?: string;
  pages?: number;
  category?: string;
  purchasedAt: string;
  hasAccess: boolean;
  readUrlEndpoint: string;
}

export interface UnifiedLibraryData {
  courses: LibraryCourse[];
  books: LibraryBook[];
  totalCourses: number;
  totalBooks: number;
}

class LibraryService {
  private getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      const sessionId = localStorage.getItem('activeSessionId');
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (sessionId) headers['x-session-id'] = sessionId;
    }
    return headers;
  }

  async getAllLibrary(): Promise<UnifiedLibraryData> {
    const response = await fetch(`${API_URL}/library/all`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener tu biblioteca');
    }

    return response.json();
  }

  async getBookReadUrl(bookId: string): Promise<string> {
    const response = await fetch(`${API_URL}/products/${bookId}/read-url`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'No tienes acceso de lectura para este libro');
    }

    const data = await response.json();
    return data.url;
  }
}

export const libraryService = new LibraryService();
