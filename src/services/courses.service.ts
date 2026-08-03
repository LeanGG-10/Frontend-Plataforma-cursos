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

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {
  language?: string;
  learning_objectives?: string[];
  requirements?: string[];
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

  async updateCourse(id: string, payload: UpdateCoursePayload) {
    const response = await fetch(`${API_URL}/courses/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Error al actualizar el curso');
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

  async getCourseAccessStatus(id: string, token: string, sessionId: string) {
    const response = await fetch(`${API_URL}/products/${id}/access-status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-session-id': sessionId || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        return { hasAccess: false, isOwner: false, role: 'STUDENT' };
      }
      throw new Error('Error al verificar acceso al curso');
    }

    return response.json();
  }

  async getPublicCourseDetails(id: string) {
    const response = await fetch(`${API_URL}/courses/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Error al obtener los detalles del curso');
    }

    return response.json();
  }

  // ==========================================
  // STRUCTURE (SECTIONS & LESSONS)
  // ==========================================

  async createSection(courseId: string, payload: { title: string; position?: number }) {
    const response = await fetch(`${API_URL}/courses/${courseId}/sections`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Error al crear la sección');
    return response.json();
  }

  async updateSection(courseId: string, sectionId: string, payload: { title: string }) {
    const response = await fetch(`${API_URL}/courses/${courseId}/sections/${sectionId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Error al actualizar la sección');
    return response.json();
  }

  async deleteSection(courseId: string, sectionId: string) {
    const response = await fetch(`${API_URL}/courses/${courseId}/sections/${sectionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al eliminar la sección');
    return response.json();
  }

  async reorderSections(courseId: string, sections: { id: string; position: number }[]) {
    const response = await fetch(`${API_URL}/courses/${courseId}/sections/reorder`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ sections }),
    });
    if (!response.ok) throw new Error('Error al reordenar las secciones');
    return response.json();
  }

  async createLesson(sectionId: string, payload: { title: string; position?: number }) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Error al crear la lección');
    return response.json();
  }

  async updateLesson(sectionId: string, lessonId: string, payload: any) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Error al actualizar la lección');
    return response.json();
  }

  async uploadLessonFile(sectionId: string, lessonId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/upload`, {
      method: 'POST',
      headers: this.getAuthHeaders(true),
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al subir el archivo de la lección');
    }
    return response.json();
  }

  async getLessonSignedUrl(sectionId: string, lessonId: string) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/signed-url`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener la URL segura de la lección');
    }
    return response.json();
  }

  async deleteLesson(sectionId: string, lessonId: string) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al eliminar la lección');
    return response.json();
  }

  async reorderLessons(sectionId: string, lessons: { id: string; position: number }[]) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/reorder`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ lessons }),
    });
    if (!response.ok) throw new Error('Error al reordenar las lecciones');
    return response.json();
  }
}

export const coursesService = new CoursesService();
