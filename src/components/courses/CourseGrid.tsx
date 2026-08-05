import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { isEditing } from '../../store/adminStore';
import { coursesService, type CreateCoursePayload } from '../../services/courses.service';
import { courseCategoryService, type CourseCategory } from '../../services/course-category.service';
import { authService } from '../../services/auth.service';
import { formatPrice } from '../../utils/format';
import { ChevronRight, Plus, Settings, Upload, CheckCircle2, Loader2, Clock, Edit2, Trash, PlusCircle, Check, X as CloseIcon, RotateCcw } from 'lucide-react';
import Modal from '../ui/Modal';

interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImage: string;
  categoryName: string;
  type: 'BOOK' | 'COURSE';
  status?: string;
  course?: {
    instructor: string;
    level: 'PRINCIPIANTE' | 'INTERMEDIO' | 'AVANZADO' | string;
    duration: number;
  };
  isActive?: boolean;
}

const CourseCard: React.FC<{ 
  course: Course; 
  showAdminControls?: boolean;
  onRequestDeactivate?: (id: string) => void;
  onReactivate?: (id: string) => void;
}> = ({ course, showAdminControls, onRequestDeactivate, onReactivate }) => {
  return (
    <div 
      className={`group cursor-pointer p-6 rounded-[12px] transition-all duration-500 border border-[#C9A44A]/5 bg-[#F7F2E8] text-[#0F172A] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] hover:scale-105 flex flex-col h-full relative overflow-hidden`}
      onClick={() => window.location.href = `/cursos/${course.id}`}
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
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80">{course.title.substring(0, 20)}</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-[#0F172A]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
          <span 
            className="bg-[#C9A44A] text-[#0F172A] px-6 py-2.5 rounded-[8px] font-body text-[11px] font-bold tracking-widest uppercase transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:bg-white hover:scale-105 cursor-pointer"
          >
            Ver detalles
          </span>
        </div>
        
        <span className="absolute top-4 left-4 bg-[#C9A44A]/90 backdrop-blur-sm text-[#0F172A] px-3 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider shadow-sm">
          {course.categoryName || 'Curso'}
        </span>
        
        {showAdminControls && course.isActive === false && (
          <span className="absolute top-4 right-4 bg-gray-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider shadow-sm">
            Inactivo
          </span>
        )}

        {showAdminControls && (
          <div className="absolute bottom-4 right-4 z-10 flex gap-2">
            {course.isActive !== false ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRequestDeactivate?.(course.id);
                }}
                className="bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-colors cursor-pointer"
                title="Desactivar curso"
              >
                <Trash size={16} />
              </button>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onReactivate?.(course.id);
                }}
                className="bg-green-500/90 hover:bg-green-600 text-white p-2 rounded-full shadow-lg transition-colors cursor-pointer"
                title="Reactivar curso"
              >
                <RotateCcw size={16} />
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="space-y-2 flex-grow">
        <h3 className={`text-xl font-display font-semibold transition-colors duration-300 group-hover:text-[#C9A44A] text-[#0F172A]`}>
          {course.title}
        </h3>
        <p className={`text-sm font-body italic opacity-60 text-[#0F172A]`}>
          Instructor: {course.course?.instructor || 'Élite Educativa'}
        </p>
        {course.type !== 'BOOK' && course.course?.level && (
          <p className={`text-xs font-bold text-[#C9A44A] mt-1 uppercase tracking-wider`}>
            Nivel: {course.course.level.charAt(0) + course.course.level.slice(1).toLowerCase()}
          </p>
        )}
        <p className={`text-xs font-body opacity-60 text-[#0F172A] mt-2 line-clamp-2`}>
          {course.description}
        </p>
      </div>
      
      <div className="pt-6 flex justify-between items-center border-t border-[#C9A44A]/10 mt-4">
        <div className="flex flex-col">
          <span className={`text-lg font-display font-bold text-[#0F172A]`}>
            {formatPrice(course.price)}
          </span>
          {course.course?.duration && (
            <span className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-[#0F172A]/40 font-bold mt-1">
              <Clock size={10} /> {course.course.duration} horas
            </span>
          )}
        </div>
        <div className="text-[#C9A44A] opacity-40 group-hover:opacity-100 transition-opacity duration-300">
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );
};

export const CourseGrid: React.FC = () => {
  const editing = useStore(isEditing);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [categories, setCategories] = useState<CourseCategory[]>([]);

  // Category Management State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const currentUser = authService.getUser();

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    price: string;
    duration: string;
    courseCategoryId: string;
    level: 'Principiante' | 'Intermedio' | 'Avanzado';
  }>({
    title: '',
    description: '',
    price: '',
    duration: '',
    courseCategoryId: '',
    level: 'Principiante',
  });

  const [coverFile, setCoverFile] = useState<File | null>(null);

  const fetchCategories = async () => {
    try {
      const data = await courseCategoryService.getAllCategories();
      setCategories(data);
      
      const filterSelect = document.getElementById('category-filter') as HTMLSelectElement;
      if (filterSelect) {
        const currentValue = filterSelect.value;
        filterSelect.innerHTML = '<option value="Todas">Todas</option>' + 
          data.map(cat => `<option value="${cat.name}">${cat.name}</option>`).join('');
        filterSelect.value = data.some(c => c.name === currentValue) ? currentValue : 'Todas';
      }

      const pillsContainer = document.getElementById('category-pills');
      if (pillsContainer) {
        pillsContainer.innerHTML = data.map(cat => `
          <button 
            class="category-pill px-4 py-2 rounded-full border border-secondary/10 text-[11px] font-bold uppercase tracking-wider text-primary/60 hover:bg-secondary hover:text-primary transition-all cursor-pointer"
            data-category="${cat.name}"
          >
            ${cat.name}
          </button>
        `).join('');
        
        pillsContainer.querySelectorAll('.category-pill').forEach(pill => {
          pill.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const cat = target.getAttribute('data-category');
            if (cat) setCategoryFilter(cat);
          });
        });
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const data = editing 
        ? await coursesService.getAllCoursesForAdmin() 
        : await coursesService.getAllCourses();
      setCourses(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [editing]);

  useEffect(() => {
    fetchCategories();

    const filterSelect = document.getElementById('category-filter') as HTMLSelectElement;
    const handleFilterChange = (e: Event) => {
      setCategoryFilter((e.target as HTMLSelectElement).value);
    };
    
    filterSelect?.addEventListener('change', handleFilterChange);
    
    const handlePillClick = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      const cat = target.getAttribute('data-category');
      if (cat) setCategoryFilter(cat);
    };

    const pills = document.querySelectorAll('.category-pill');
    pills.forEach(pill => pill.addEventListener('click', handlePillClick));

    return () => {
      filterSelect?.removeEventListener('change', handleFilterChange);
      pills.forEach(pill => pill.removeEventListener('click', handlePillClick));
    };
  }, []);

  const filteredCourses = courses.filter(course => {
    // Only show published courses in the courses catalog
    if (course.status !== 'PUBLISHED') return false;

    if (categoryFilter === 'Todas') return true;
    const courseCategory = typeof course.categoryName === 'string' 
      ? course.categoryName 
      : 'Curso';
    return courseCategory === categoryFilter;
  });

  useEffect(() => {
    const countEl = document.getElementById('count');
    if (countEl) countEl.textContent = filteredCourses.length.toString();
  }, [filteredCourses]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      duration: '',
      courseCategoryId: '',
      level: 'Principiante',
    });
    setCoverFile(null);
  };

  const handleDeactivate = async (id: string) => {
    try {
      await coursesService.deactivateCourse(id);
      setCourses(prev => prev.map(c => c.id === id ? { ...c, isActive: false } : c));
    } catch (err: any) {
      alert(err.message || 'Error al desactivar el curso');
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await coursesService.reactivateCourse(id);
      setCourses(prev => prev.map(c => c.id === id ? { ...c, isActive: true } : c));
    } catch (err: any) {
      alert(err.message || 'Error al reactivar el curso');
    }
  };

  // Category Management Functions
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await courseCategoryService.createCategory(newCatName);
      setNewCatName('');
      fetchCategories();
    } catch (err) {
      alert('Error al crear categoría');
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingCatName.trim()) return;
    try {
      await courseCategoryService.updateCategory(id, editingCatName);
      setEditingCatId(null);
      fetchCategories();
    } catch (err) {
      alert('Error al actualizar categoría');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta categoría?')) return;
    try {
      await courseCategoryService.deleteCategory(id);
      fetchCategories();
    } catch (err) {
      alert('Error al eliminar categoría');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCoverFile(e.target.files[0]);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setUploadProgress(10);
    try {
      let coverUrl = '';
      if (coverFile) {
        coverUrl = await coursesService.uploadCover(coverFile);
        setUploadProgress(50);
      }
      
      const payload: CreateCoursePayload = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        duration: Number(formData.duration),
        courseCategoryId: formData.courseCategoryId || (categories.length > 0 ? categories[0].id : undefined),
        instructor: currentUser?.full_name || 'Instructor Genérico',
        level: formData.level,
        status: 'PUBLISHED', // Direct to published
        totalLessons: 1, // Default value
        coverImage: coverUrl
      };
      
      await coursesService.createCourse(payload);
      setUploadProgress(100);
      
      await fetchCourses();
      
      setShowAddModal(false);
      resetForm();
    } catch (err: any) {
      alert(err.message || 'Error al crear el curso');
    } finally {
      setSubmitLoading(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="py-32 text-center text-primary/60 font-body">
        Cargando cursos...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-32 text-center animate-in fade-in duration-500">
        <div className="max-w-md mx-auto p-8 bg-red-50 rounded-[20px] border border-red-100">
           <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-6 opacity-40"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
           <h3 className="text-2xl font-display text-red-900 italic mb-2">{error}</h3>
           <p className="text-red-700/60 font-body text-sm">Estamos trabajando para restablecer el servicio. Por favor, intenta de nuevo más tarde.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {editing && (
          <div className="flex flex-col gap-4">
            <button
              onClick={() => setShowAddModal(true)}
              className="group h-full min-h-[300px] border-2 border-dashed border-secondary/30 rounded-[12px] flex flex-col items-center justify-center gap-4 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary transition-all duration-500 cursor-pointer p-8"
            >
              <div className="w-16 h-16 rounded-full bg-secondary text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                <Plus size={32} />
              </div>
              <div className="text-center">
                <span className="block text-lg font-display font-bold text-primary italic">Añadir Curso</span>
                <span className="text-xs font-body text-primary/40 uppercase tracking-widest mt-1">Nuevo programa</span>
              </div>
            </button>

            <button
              onClick={() => setShowCategoryModal(true)}
              className="group border border-secondary/20 rounded-[12px] py-4 flex items-center justify-center gap-3 bg-white hover:bg-secondary/5 transition-all duration-300 cursor-pointer"
            >
              <Settings size={18} className="text-secondary group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 group-hover:text-primary">Gestionar Categorías</span>
            </button>
          </div>
        )}

        {filteredCourses.map((course) => (
          <div key={course.id} className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <CourseCard 
              course={course} 
              showAdminControls={editing} 
              onRequestDeactivate={setPendingDeactivateId}
              onReactivate={handleReactivate}
            />
          </div>
        ))}
      </div>

      {!error && filteredCourses.length === 0 && (
        <div className="py-32 text-center animate-in fade-in duration-500">
          <div className="max-w-md mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#C9A44A" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-6 opacity-20"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
            <h3 className="text-2xl font-display text-primary/60 italic mb-2">No hay cursos disponibles</h3>
            <p className="text-primary/40 font-body text-sm">Vuelve pronto para descubrir nuevos cursos o prueba con otra categoría.</p>
          </div>
        </div>
      )}

      <Modal 
        isOpen={showAddModal} 
        onClose={() => {
          if (!submitLoading) {
            setShowAddModal(false);
            resetForm();
          }
        }} 
        title="Crear Nuevo Curso"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Título del Curso</label>
            <input 
              type="text" 
              required
              disabled={submitLoading}
              placeholder="Ej. Curso Completo de React"
              className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all disabled:opacity-50"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Categoría</label>
              <select 
                required
                disabled={submitLoading || categories.length === 0}
                className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all appearance-none disabled:opacity-50"
                value={formData.courseCategoryId}
                onChange={(e) => setFormData({...formData, courseCategoryId: e.target.value})}
              >
                <option value="">Seleccione una especialidad</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Precio ($)</label>
              <input 
                type="number" 
                step="0.01"
                required
                disabled={submitLoading}
                placeholder="49.99"
                className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all disabled:opacity-50"
                value={formData.price}
                onChange={(e) => setFormData({...formData, price: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Duración (horas)</label>
              <input 
                type="number" 
                required
                disabled={submitLoading}
                placeholder="Ej. 10"
                className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all disabled:opacity-50"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Nivel</label>
              <select
                required
                disabled={submitLoading}
                className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all disabled:opacity-50 appearance-none"
                value={formData.level}
                onChange={(e) => setFormData({...formData, level: e.target.value as 'Principiante' | 'Intermedio' | 'Avanzado'})}
              >
                <option value="Principiante">Principiante</option>
                <option value="Intermedio">Intermedio</option>
                <option value="Avanzado">Avanzado</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Instructor</label>
            <input 
              type="text" 
              readOnly
              className="w-full bg-tertiary/80 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary/60 cursor-not-allowed"
              value={currentUser?.full_name || 'Instructor Genérico'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Descripción del Curso</label>
            <textarea 
              required
              disabled={submitLoading}
              rows={3}
              placeholder="Escribe de qué tratará este curso y qué aprenderán los estudiantes..."
              className="w-full bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-3 text-primary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all resize-none disabled:opacity-50"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase tracking-widest font-bold text-primary/40 ml-1">Portada (Opcional)</label>
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*"
                disabled={submitLoading}
                onChange={handleFileChange}
                className="hidden"
                id="course-cover-upload"
              />
              <label 
                htmlFor="course-cover-upload"
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-[10px] p-4 cursor-pointer transition-all ${
                  coverFile ? 'border-green-500/50 bg-green-50/50' : 'border-secondary/20 bg-tertiary/30 hover:border-secondary/50'
                } ${submitLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {coverFile ? (
                  <div className="flex flex-col items-center text-green-600">
                    <CheckCircle2 size={24} />
                    <span className="text-[10px] mt-1 font-bold truncate max-w-[200px]">{coverFile.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-primary/40 group-hover:text-secondary transition-colors">
                    <Upload size={24} />
                    <span className="text-[10px] mt-1 font-bold">Subir Imagen de Portada</span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {submitLoading && (
            <div className="space-y-2 pt-2 animate-in fade-in duration-300">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-primary/40">
                <span>Creando curso...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-secondary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(201,164,74,0.5)]"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button 
              type="button"
              onClick={resetForm}
              disabled={submitLoading}
              className="flex-1 text-primary/50 font-bold text-[10px] uppercase tracking-widest py-4 rounded-[12px] border border-secondary/10 hover:bg-tertiary/50 hover:text-primary transition-all cursor-pointer disabled:opacity-50"
            >
              Limpiar
            </button>
            <button 
              type="submit" 
              disabled={submitLoading}
              className={`flex-[2] text-primary font-bold text-[10px] uppercase tracking-widest py-4 rounded-[12px] transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer ${
                submitLoading ? 'bg-secondary/50 cursor-not-allowed' : 'bg-secondary hover:bg-secondary/90 hover:-translate-y-0.5'
              }`}
            >
              {submitLoading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Publicar Curso</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        title="Gestión de Categorías de Cursos"
      >
        <div className="space-y-6">
          {/* Add Category Input */}
          <div className="flex gap-2">
            <input 
              type="text"
              placeholder="Nueva categoría..."
              className="flex-1 bg-tertiary/50 border border-secondary/10 rounded-[10px] px-4 py-2 text-sm text-primary focus:outline-none focus:ring-1 focus:ring-secondary/50"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
            <button 
              onClick={handleAddCategory}
              className="p-2 bg-secondary text-primary rounded-[10px] hover:bg-secondary/90 transition-colors"
            >
              <PlusCircle size={20} />
            </button>
          </div>

          <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-tertiary/20 rounded-[12px] border border-secondary/5 group">
                {editingCatId === cat.id ? (
                  <div className="flex-1 flex gap-2 mr-2">
                    <input 
                      type="text"
                      autoFocus
                      className="flex-1 bg-white border border-secondary/20 rounded-[6px] px-3 py-1 text-sm text-primary outline-none"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleUpdateCategory(cat.id)}
                    />
                    <button onClick={() => handleUpdateCategory(cat.id)} className="text-green-600 hover:scale-110 transition-transform"><Check size={18} /></button>
                    <button onClick={() => setEditingCatId(null)} className="text-red-500 hover:scale-110 transition-transform"><CloseIcon size={18} /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm font-body font-medium text-primary/80">{cat.name}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditingCatName(cat.name);
                        }}
                        className="p-1.5 text-primary/40 hover:text-secondary transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 text-primary/40 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        isOpen={!!pendingDeactivateId}
        onClose={() => setPendingDeactivateId(null)}
        title="Desactivar curso"
      >
        <div className="space-y-6">
          <p className="text-primary/80 font-body text-sm">
            ¿Estás seguro de que deseas desactivar este curso? Dejará de ser visible para los estudiantes.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setPendingDeactivateId(null)}
              className="flex-1 text-primary/50 font-bold text-[10px] uppercase tracking-widest py-3 rounded-[12px] border border-secondary/10 hover:bg-tertiary/50 hover:text-primary transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (pendingDeactivateId) {
                  handleDeactivate(pendingDeactivateId);
                  setPendingDeactivateId(null);
                }
              }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold text-[10px] uppercase tracking-widest py-3 rounded-[12px] transition-all shadow-lg cursor-pointer"
            >
              Desactivar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

