import React, { useState, useEffect } from 'react';
import { coursesService } from '../../services/courses.service';
import { Edit2, Users, Plus } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  categoryName: string;
  status: string;
  enrolledCount: number;
}

export const MyCoursesGrid: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await coursesService.getMyCourses();
        setCourses(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los cursos');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  if (loading) {
    return <div className="py-32 text-center text-primary/60 font-body">Cargando tus cursos...</div>;
  }

  if (error) {
    return (
      <div className="py-32 text-center">
        <div className="max-w-md mx-auto p-8 bg-red-50 rounded-[20px] border border-red-100">
           <h3 className="text-2xl font-display text-red-900 italic mb-2">{error}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
      <a
        href="/cursos/crear"
        className="group h-full min-h-[300px] border-2 border-dashed border-secondary/30 rounded-[12px] flex flex-col items-center justify-center gap-4 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary transition-all duration-500 cursor-pointer p-8 no-underline"
      >
        <div className="w-16 h-16 rounded-full bg-secondary text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
          <Plus size={32} />
        </div>
        <div className="text-center">
          <span className="block text-lg font-display font-bold text-primary italic">Crear Curso</span>
          <span className="text-xs font-body text-primary/40 uppercase tracking-widest mt-1">Nuevo programa</span>
        </div>
      </a>
      {courses.map((course) => (
        <div 
          key={course.id}
          className="group p-6 rounded-[12px] transition-all duration-500 border border-[#C9A44A]/5 bg-[#F7F2E8] text-[#0F172A] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col h-full relative overflow-hidden"
        >
          <div className="aspect-video mb-6 overflow-hidden relative rounded-[8px] bg-white/10">
            {course.coverImage ? (
              <img 
                src={course.coverImage} 
                alt={course.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#C9A44A] to-[#8C6D23] text-[#F7F2E8]">
                <span className="text-4xl opacity-50 mb-2">🎓</span>
              </div>
            )}
            
            <span className="absolute top-4 left-4 bg-[#C9A44A]/90 backdrop-blur-sm text-[#0F172A] px-3 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {course.categoryName || 'Curso'}
            </span>
            
            <span className={`absolute top-4 right-4 backdrop-blur-sm text-white px-3 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider shadow-sm ${
              course.status === 'PUBLISHED' ? 'bg-green-500/90' : 
              course.status === 'DRAFT' ? 'bg-amber-500/90' : 'bg-gray-500/90'
            }`}>
              {course.status || 'PUBLISHED'}
            </span>
          </div>
          
          <div className="space-y-2 flex-grow">
            <h3 className="text-xl font-display font-semibold transition-colors duration-300 group-hover:text-[#C9A44A] text-[#0F172A]">
              {course.title}
            </h3>
            <p className="text-xs font-body opacity-60 text-[#0F172A] mt-2 line-clamp-2">
              {course.description}
            </p>
          </div>
          
          <div className="pt-6 flex justify-between items-center border-t border-[#C9A44A]/10 mt-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]/70 uppercase tracking-wider">
              <Users size={14} />
              {course.enrolledCount} {course.enrolledCount === 1 ? 'estudiante inscrito' : 'estudiantes inscritos'}
            </div>
            <a 
              href={`/cursos/crear?id=${course.id}`}
              className="p-2 rounded-full bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-colors cursor-pointer"
              title="Editar curso"
            >
              <Edit2 size={16} />
            </a>
          </div>
        </div>
      ))}

      {courses.length === 0 && (
        <div className="col-span-full py-20 text-center">
          <p className="text-primary/60 font-body">Aún no has creado ningún curso.</p>
        </div>
      )}
    </div>
  );
};
