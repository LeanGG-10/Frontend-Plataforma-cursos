const API_URL = import.meta.env.PUBLIC_API_URL;

export interface QuizOption {
  id?: string;
  option_text: string;
  is_correct?: boolean;
}

export interface QuizQuestion {
  id?: string;
  question_text: string;
  explanation?: string;
  position?: number;
  options: QuizOption[];
}

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
  language?: string;
  learning_objectives?: string[];
  requirements?: string[];
}

export interface UpdateCoursePayload extends Partial<CreateCoursePayload> {}

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

  async getAllCourses(page: number = 1) {
    const response = await fetch(`${API_URL}/courses?page=${page}&limit=12`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { data: [], total: 0, page: 1, totalPages: 1 };
      }
      throw new Error('Error al obtener los cursos');
    }

    return response.json();
  }

  async getAllCoursesForAdmin(page: number = 1) {
    const response = await fetch(`${API_URL}/courses/admin?page=${page}&limit=12`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al obtener los cursos');
    return response.json();
  }

  async getMyCourses(page: number = 1) {
    const response = await fetch(`${API_URL}/courses/mine?page=${page}&limit=12`, {
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
  // STRUCTURE (MODULES, SECTIONS & LESSONS)
  // ==========================================

  // --- MODULES ---

  async createModule(courseId: string, payload: { title: string; position?: number }) {
    const response = await fetch(`${API_URL}/courses/${courseId}/modules`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Error al crear el módulo');
    return response.json();
  }

  async updateModule(courseId: string, moduleId: string, payload: { title: string }) {
    const response = await fetch(`${API_URL}/courses/${courseId}/modules/${moduleId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error('Error al actualizar el módulo');
    return response.json();
  }

  async deleteModule(courseId: string, moduleId: string) {
    const response = await fetch(`${API_URL}/courses/${courseId}/modules/${moduleId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Error al eliminar el módulo');
    return response.json();
  }

  async reorderModules(courseId: string, modules: { id: string; position: number }[]) {
    const response = await fetch(`${API_URL}/courses/${courseId}/modules/reorder`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ modules }),
    });
    if (!response.ok) throw new Error('Error al reordenar los módulos');
    return response.json();
  }

  // --- SECTIONS ---

  async createSection(courseId: string, payload: { title: string; position?: number; moduleId: string }) {
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

  // ==========================================
  // ASSIGNMENTS
  // ==========================================

  async getAssignmentStatus(sectionId: string, lessonId: string) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/assignments/status`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener el estado de la tarea');
    }
    return response.json();
  }

  async startAssignment(sectionId: string, lessonId: string) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/assignments/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al iniciar la tarea');
    }
    return response.json();
  }

  async submitAssignment(sectionId: string, lessonId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/assignments/submit`, {
      method: 'POST',
      headers: this.getAuthHeaders(true),
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al enviar la tarea');
    }
    return response.json();
  }

  async getLessonSubmissions(sectionId: string, lessonId: string) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/assignments/submissions`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener las entregas');
    }
    return response.json();
  }

  async gradeSubmission(sectionId: string, lessonId: string, submissionId: string, grade: number, feedback?: string) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/assignments/submissions/${submissionId}/grade`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ grade, feedback }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al calificar la tarea');
    }
    return response.json();
  }

  // ==========================================
  // QUIZ Y EXÁMENES
  // ==========================================

  async getQuizQuestions(sectionId: string, lessonId: string): Promise<QuizQuestion[]> {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/quiz/questions`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener las preguntas del quiz');
    }
    return response.json();
  }

  async createQuizQuestion(sectionId: string, lessonId: string, payload: QuizQuestion): Promise<QuizQuestion> {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/quiz/questions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al crear la pregunta');
    }
    return response.json();
  }

  async updateQuizQuestion(sectionId: string, lessonId: string, questionId: string, payload: QuizQuestion): Promise<QuizQuestion> {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/quiz/questions/${questionId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al actualizar la pregunta');
    }
    return response.json();
  }

  async deleteQuizQuestion(sectionId: string, lessonId: string, questionId: string) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/quiz/questions/${questionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al eliminar la pregunta');
    }
    return response.json();
  }

  async submitQuizAttempt(sectionId: string, lessonId: string, answers: Record<string, string>) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/quiz/submit`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ answers }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al enviar el quiz');
    }
    return response.json();
  }

  async getQuizAttempts(sectionId: string, lessonId: string) {
    const response = await fetch(`${API_URL}/sections/${sectionId}/lessons/${lessonId}/quiz/attempts`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener los intentos del quiz');
    }
    return response.json();
  }

  async submitReview(id: string, token: string) {
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('activeSessionId') : '';
    const response = await fetch(`${API_URL}/courses/${id}/submit-review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-session-id': sessionId || '',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al enviar a revisión');
    }
    return response.json();
  }

  async cancelReview(id: string, token: string) {
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('activeSessionId') : '';
    const response = await fetch(`${API_URL}/courses/${id}/cancel-review`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-session-id': sessionId || '',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw { status: response.status, message: err.message || 'Error al cancelar la revisión' };
    }
    return response.json();
  }

  async getPendingCourses(token: string) {
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('activeSessionId') : '';
    const response = await fetch(`${API_URL}/admin/courses/pending`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-session-id': sessionId || '',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al obtener cursos pendientes');
    }
    return response.json();
  }

  async approveCourse(id: string, token: string) {
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('activeSessionId') : '';
    const response = await fetch(`${API_URL}/courses/${id}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-session-id': sessionId || '',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al aprobar el curso');
    }
    return response.json();
  }

  async rejectCourse(id: string, rejectionReason: string, token: string) {
    const sessionId = typeof window !== 'undefined' ? localStorage.getItem('activeSessionId') : '';
    const response = await fetch(`${API_URL}/courses/${id}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-session-id': sessionId || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Error al rechazar el curso');
    }
    return response.json();
  }
}

export const coursesService = new CoursesService();
