const API_URL = import.meta.env.PUBLIC_API_URL;

export interface CreateCoursePayload {
  title: string;
  description: string;
  courseCategoryId?: string;
  price: number;
  status: 'DRAFT' | 'PUBLISHED';
  coverImage?: string;
  instructor: string;
  duration: number;
  level: 'Principiante' | 'Intermedio' | 'Avanzado';
  totalLessons: number;
  overrideDuplicateWarning?: boolean;
}

class CoursesService {
  private getAuthHeaders(isMultipart = false) {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('accessToken');
    const sessionId = localStorage.getItem('activeSessionId');
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'x-session-id': sessionId || ''
    };
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  async uploadCover(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/courses/upload-cover`, {
      method: 'POST',
      headers: this.getAuthHeaders(true),
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al subir la imagen de portada');
    }
    const data = await response.json();
    return data.url;
  }

  async createCourse(payload: CreateCoursePayload) {
    const response = await fetch(`${API_URL}/courses`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 409 && error.code === 'DUPLICATE_TITLE_WARNING') {
        throw { isDuplicateWarning: true, message: error.message };
      }
      throw new Error(error.message || 'Error al crear el curso');
    }

    return response.json();
  }

  async getAllCourses() {
    const response = await fetch(`${API_URL}/courses`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error('Error al obtener los cursos');
    }

    return response.json();
  }

  async getAllCoursesForAdmin() {
    const response = await fetch(`${API_URL}/courses/admin`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener los cursos');
    return response.json();
  }

  async getMyCourses() {
    const response = await fetch(`${API_URL}/courses/mine`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener tus cursos');
    return response.json();
  }

  async deactivateCourse(id: string) {
    const response = await fetch(`${API_URL}/courses/${id}/deactivate`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al desactivar el curso');
    }
    return response.json();
  }

  async reactivateCourse(id: string) {
    const response = await fetch(`${API_URL}/courses/${id}/reactivate`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al reactivar el curso');
    }
    return response.json();
  }
}

export const coursesService = new CoursesService();
