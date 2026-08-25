import React, { useState, useEffect } from 'react';
import { coursesService } from '../../services/courses.service';
import { Loader2, AlertCircle, Calendar, User, BookOpen } from 'lucide-react';

interface CoursePending {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  status?: string;
  course?: {
    instructor: string;
    submitted_at?: string;
  };
}

export default function AdminCoursesPending() {
  const [courses, setCourses] = useState<CoursePending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPending();
  }, []);

  const fetchPending = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken') || '';
      const data = await coursesService.getPendingCourses(token);
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los cursos pendientes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white/60 rounded-2xl border border-secondary/15 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-secondary animate-spin mb-4" />
        <p className="text-primary/90 font-semibold text-sm font-body">Cargando cursos pendientes de revisión...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-2xl flex items-start gap-3 border border-red-200">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p className="text-sm font-medium font-body">{error}</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-10 px-4 bg-white/60 rounded-2xl border border-secondary/15">
        <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-4">
          <BookOpen size={28} />
        </div>
        <h3 className="text-lg font-semibold text-primary mb-1 font-display">Sin contenido para mostrar</h3>
        <p className="text-primary/90 font-semibold text-sm max-w-sm mx-auto font-body">
          No hay cursos pendientes de revisión ni borradores en este momento. ¡Todo al día!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {courses.map((course) => {
        const formattedDate = course.course?.submitted_at
          ? new Date(course.course.submitted_at).toLocaleDateString('es-ES', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Fecha no registrada';

        return (
          <div key={course.id} className="bg-white/80 rounded-2xl border border-secondary/15 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
            {/* Portada */}
            <div className="relative h-48 bg-primary/5 overflow-hidden">
              {course.coverImage ? (
                <img src={course.coverImage} alt={course.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary/30">
                  <BookOpen size={48} />
                </div>
              )}
              <span className={`absolute top-3 left-3 px-2.5 py-1 text-white text-xs font-semibold rounded-full shadow-sm ${course.status === 'DRAFT' ? 'bg-slate-500' : 'bg-amber-500'}`}>
                {course.status === 'DRAFT' ? 'Borrador' : 'Pendiente'}
              </span>
            </div>

            {/* Contenido */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-semibold text-primary line-clamp-2 mb-3 font-display">
                  {course.title}
                </h3>
                
                <div className="space-y-2 text-primary/90 font-semibold text-sm font-body">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-secondary/70" />
                    <span>{course.course?.instructor || 'Instructor desconocido'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-secondary/70" />
                    <span>Enviado: {formattedDate}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-secondary/10">
                <a
                  href={`/cursos/${course.id}`}
                  className="w-full px-4 py-2.5 bg-secondary hover:bg-secondary/90 text-primary text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm font-body"
                >
                  Revisar Curso
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
