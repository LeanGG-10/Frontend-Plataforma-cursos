import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, Loader2, AlertCircle, Save, Send, BookOpen, CheckCircle2, Trash2, Plus } from 'lucide-react';
import { coursesService, type CreateCoursePayload } from '../../services/courses.service';
import { authService } from '../../services/auth.service';
import CourseStructureEditor from './CourseStructureEditor';

interface Category {
  id: string;
  name: string;
}

interface Props {
  courseId?: string;
  categories: Category[];
}

interface CourseFormData extends Omit<CreateCoursePayload, 'status'> {
  status: 'DRAFT' | 'PUBLISHED' | 'PENDING_REVIEW' | 'REJECTED';
  language: string;
  learning_objectives: string[];
  requirements: string[];
}

export default function CourseCreationForm({ courseId, categories }: Props) {
  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    courseCategoryId: '',
    price: '' as unknown as number,
    status: 'DRAFT',
    instructor: '', 
    duration: '' as unknown as number,
    level: 'Principiante',
    totalLessons: 0,
    language: 'Español',
    learning_objectives: [''],
    requirements: [''],
  });

  const [isLoadingCourse, setIsLoadingCourse] = useState(!!courseId);
  const [activeTab, setActiveTab] = useState<'INFO' | 'STRUCTURE'>('INFO');

  const [userRole, setUserRole] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [showReviewConfirm, setShowReviewConfirm] = useState(false);

  const handleCancelReview = async () => {
    if (!courseId) return;
    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('accessToken') || '';
      await coursesService.cancelReview(courseId, token);
      setFormData(prev => ({ ...prev, status: 'DRAFT' }));
      setSuccessModal({
        visible: true,
        message: 'La revisión del curso ha sido cancelada exitosamente y el curso ha vuelto a estado de borrador.'
      });
    } catch (err: any) {
      console.error(err);
      if (err.status === 400) {
        alert("El tiempo límite de 1 hora para cancelar la revisión ha expirado");
      } else {
        alert(err.message || "Error al cancelar la revisión");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSubmitReview = async () => {
    if (!courseId) return;
    setShowReviewConfirm(false);
    setIsSubmitting(true);
    setSubmitStatus({ visible: true, status: 'LOADING', message: 'Enviando a revisión...', redirectUrl: '' });
    try {
      const token = localStorage.getItem('accessToken') || '';
      await coursesService.submitReview(courseId, token);
      setFormData(prev => ({ ...prev, status: 'PENDING_REVIEW' }));
      setSubmitStatus({
        visible: true,
        status: 'SUCCESS',
        message: 'Curso enviado a revisión con éxito!',
        redirectUrl: `/cursos/${courseId}`
      });
    } catch (err: any) {
      setSubmitStatus(prev => ({ ...prev, visible: false }));
      alert(err.message || 'Error al enviar a revisión');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setUserRole(user.role);
    }
    if (user?.full_name) {
      setFormData(prev => ({ ...prev, instructor: user.full_name }));
    }
  }, []);

  useEffect(() => {
    if (courseId) {
      coursesService.getPublicCourseDetails(courseId)
        .then(data => {
          setFormData(prev => ({
            ...prev,
            title: data.title,
            description: data.description || '',
            courseCategoryId: data.course?.course_category_id || '',
            price: data.price,
            status: data.status,
            instructor: data.course?.instructor || '',
            duration: data.course?.duration || 0,
            level: (data.course?.level.charAt(0) + data.course?.level.slice(1).toLowerCase()) as any,
            totalLessons: data.course?.total_lessons || 0,
            language: data.course?.language || 'Español',
            learning_objectives: data.course?.learning_objectives?.length ? data.course.learning_objectives : [''],
            requirements: data.course?.requirements?.length ? data.course.requirements : [''],
          }));
          setRejectionReason(data.course?.rejection_reason || null);
          setSubmittedAt(data.course?.submitted_at || null);
        })
        .catch(err => {
          console.error(err);
          alert('Error al cargar el curso');
        })
        .finally(() => {
          setIsLoadingCourse(false);
        });
    }
  }, [courseId]);

  const handleListChange = (field: 'learning_objectives' | 'requirements', index: number, value: string) => {
    setFormData(prev => {
      const newList = [...prev[field]];
      newList[index] = value;
      return { ...prev, [field]: newList };
    });
  };

  const addListItem = (field: 'learning_objectives' | 'requirements') => {
    setFormData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  };

  // Delete modal state
  const [deleteContext, setDeleteContext] = useState<{ field: 'learning_objectives' | 'requirements', index: number } | null>(null);
  const [successModal, setSuccessModal] = useState<{ visible: boolean, message: string }>({ visible: false, message: '' });

  const confirmRemoveListItem = (field: 'learning_objectives' | 'requirements', index: number) => {
    setDeleteContext({ field, index });
  };

  const executeRemove = () => {
    if (!deleteContext) return;
    const { field, index } = deleteContext;
    
    setFormData(prev => {
      const newList = prev[field].filter((_, i) => i !== index);
      if (newList.length === 0) newList.push('');
      return { ...prev, [field]: newList };
    });
    
    const isObjective = field === 'learning_objectives';
    setDeleteContext(null);
    setSuccessModal({
      visible: true,
      message: isObjective ? "Objetivo de aprendizaje eliminado correctamente" : "Requisito eliminado correctamente"
    });
  };

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Duplicate modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<'DRAFT' | 'PUBLISHED' | null>(null);
  const [submitAction, setSubmitAction] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

  // Submit modal state
  const [showSubmitConfirm, setShowSubmitConfirm] = useState<{ visible: boolean, action: 'DRAFT' | 'PUBLISHED' | null }>({ visible: false, action: null });
  const [submitStatus, setSubmitStatus] = useState<{ visible: boolean, status: 'LOADING' | 'SUCCESS', message: string, redirectUrl: string }>({ visible: false, status: 'LOADING', message: '', redirectUrl: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // CA-07: Validación Título
    if (name === 'title' && value.length > 100) {
      setErrors(prev => ({ ...prev, title: 'El título no puede superar los 100 caracteres' }));
      return;
    } else if (name === 'title') {
      setErrors(prev => ({ ...prev, title: '' }));
    }

    // CA-09: Validación Descripción
    if (name === 'description' && value.length > 2000) {
      setErrors(prev => ({ ...prev, description: 'La descripción no puede superar los 2000 caracteres' }));
      return;
    } else if (name === 'description') {
      setErrors(prev => ({ ...prev, description: '' }));
    }

    const val = type === 'number' ? (value === '' ? ('' as unknown as number) : Number(value)) : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const validateForm = (action: 'DRAFT' | 'PUBLISHED') => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) newErrors.title = 'El título es obligatorio';
    if (!formData.description.trim()) newErrors.description = 'La descripción es obligatoria';
    if (!formData.courseCategoryId) newErrors.courseCategoryId = 'Debes seleccionar una categoría';
    if (!formData.instructor.trim()) newErrors.instructor = 'El instructor es obligatorio';
    if (formData.price < 0) newErrors.price = 'El precio no puede ser negativo';
    if (formData.duration <= 0) newErrors.duration = 'La duración debe ser mayor a 0';

    // Portada ahora es opcional

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageFile = async (file: File) => {
    // CA-11: Validación de tamaño y formato
    if (file.size > 5 * 1024 * 1024) {
      alert("La imagen no puede superar los 5MB");
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert("Formato de imagen no soportado. Usa JPG, PNG o WEBP");
      return;
    }

    // CA-12: Preview instantáneo
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setUploadingImage(true);
    setErrors(prev => ({ ...prev, coverImage: '' }));

    // CA-13: Subida asíncrona
    try {
      const uploadedUrl = await coursesService.uploadCover(file);
      setFormData(prev => ({ ...prev, coverImage: uploadedUrl }));
    } catch (err: any) {
      alert(err.message || "Error al subir la imagen");
      setPreviewUrl(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageFile(file);
  };

  const executeSubmit = async (action: 'DRAFT' | 'PUBLISHED', overrideDuplicate = false) => {
    if (!validateForm(action)) return;

    setIsSubmitting(true);
    setSubmitStatus({ visible: true, status: 'LOADING', message: 'Guardando cambios...', redirectUrl: '' });
    
    try {
      const filteredObjectives = formData.learning_objectives.filter(o => o.trim() !== '');
      const filteredRequirements = formData.requirements.filter(o => o.trim() !== '');

      const basePayload = {
        title: formData.title,
        description: formData.description,
        courseCategoryId: formData.courseCategoryId || undefined,
        price: Number(formData.price) || 0,
        status: action,
        coverImage: formData.coverImage,
        instructor: formData.instructor,
        duration: Number(formData.duration) || 0,
        level: formData.level,
        totalLessons: Number(formData.totalLessons) || 0,
        overrideDuplicateWarning: overrideDuplicate,
      };

      if (courseId) {
        const updatePayload = {
          ...basePayload,
          language: formData.language,
          learning_objectives: filteredObjectives,
          requirements: filteredRequirements,
        };
        await coursesService.updateCourse(courseId, updatePayload);
        setSubmitStatus({
          visible: true,
          status: 'SUCCESS',
          message: 'Curso actualizado con éxito!',
          redirectUrl: `/cursos/${courseId}`
        });
      } else {
        await coursesService.createCourse(basePayload as any);
        const successMessage = userRole === 'PROFESOR'
          ? 'Tu curso se guardará como borrador. Un administrador deberá revisarlo y publicarlo.'
          : `Curso ${action === 'PUBLISHED' ? 'publicado' : 'guardado'} con éxito!`;
        setSubmitStatus({
          visible: true,
          status: 'SUCCESS',
          message: successMessage,
          redirectUrl: '/cursos'
        });
      }
    } catch (err: any) {
      setSubmitStatus(prev => ({ ...prev, visible: false }));
      // CA-20: La Trampa del 409
      if (err.isDuplicateWarning) {
        setDuplicateMessage(err.message);
        setPendingAction(action);
        setShowDuplicateModal(true);
      } else {
        alert(err.message || 'Ocurrió un error inesperado');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onActionClick = (e: React.MouseEvent<HTMLButtonElement>, action: 'DRAFT' | 'PUBLISHED') => {
    e.preventDefault();
    setSubmitAction(action);
    if (!validateForm(action)) return;

    if (courseId) {
      setShowSubmitConfirm({ visible: true, action });
    } else {
      executeSubmit(action, false);
    }
  };

  if (isLoadingCourse) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Cargando detalles del curso...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 font-sans">
      
      {formData.status === 'REJECTED' && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3 border border-red-200 dark:border-red-900/50">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="text-sm font-semibold">Este curso fue rechazado por el Administrador.</p>
            {rejectionReason && <p className="text-xs mt-1">Motivo: {rejectionReason}</p>}
          </div>
        </div>
      )}

      {formData.status === 'PENDING_REVIEW' && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-xl flex items-start justify-between gap-3 border border-amber-200 dark:border-amber-900/50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            <div>
              <p className="text-sm font-semibold">Curso enviado a revisión</p>
              <p className="text-xs mt-1">El curso está siendo revisado por un administrador y no se puede modificar.</p>
            </div>
          </div>
          {userRole === 'PROFESOR' && (
            <button
              type="button"
              onClick={handleCancelReview}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
            >
              Cancelar Revisión
            </button>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('INFO')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'INFO' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Información General
        </button>
        <button 
          onClick={() => setActiveTab('STRUCTURE')}
          className={`px-4 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'STRUCTURE' ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Temario y Módulos
        </button>
      </div>

      <div className={activeTab === 'INFO' ? 'block' : 'hidden'}>
        <form className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <fieldset disabled={formData.status === 'PENDING_REVIEW'} className="lg:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Columna Principal - Datos Generales */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Título del Curso <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-2 ${
                errors.title 
                  ? 'border-red-500 focus:ring-red-500/20' 
                  : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
              }`}
              placeholder="Ej. Master en Desarrollo Web"
            />
            <div className="flex justify-between mt-1">
              {errors.title ? (
                <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {errors.title}</span>
              ) : (
                <span className="text-xs text-slate-400">Máx 100 caracteres</span>
              )}
              <span className={`text-xs ${formData.title.length > 90 ? 'text-amber-500' : 'text-slate-400'}`}>
                {formData.title.length}/100
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Descripción <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              value={formData.description}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-xl border bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-2 resize-none ${
                errors.description 
                  ? 'border-red-500 focus:ring-red-500/20' 
                  : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
              }`}
              placeholder="Escribe una descripción detallada del curso..."
            />
            <div className="flex justify-between mt-1">
              {errors.description ? (
                <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12}/> {errors.description}</span>
              ) : (
                <span className="text-xs text-slate-400">Máx 2000 caracteres</span>
              )}
              <span className={`text-xs ${formData.description.length > 1900 ? 'text-amber-500' : 'text-slate-400'}`}>
                {formData.description.length}/2000
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="language" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Idioma <span className="text-red-500">*</span>
            </label>
            <select
              id="language"
              name="language"
              value={formData.language}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20 appearance-none"
            >
              <option value="Español">Español</option>
              <option value="Inglés">Inglés</option>
              <option value="Portugués">Portugués</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Lo que aprenderás
            </label>
            {formData.learning_objectives.map((obj, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={obj}
                  onChange={(e) => handleListChange('learning_objectives', i, e.target.value)}
                  placeholder="Ej. Crear aplicaciones escalables..."
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => confirmRemoveListItem('learning_objectives', i)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 dark:bg-slate-800/50 dark:hover:bg-red-900/20 rounded-xl"
                  title="Eliminar objetivo"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addListItem('learning_objectives')}
              className="text-sm text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline"
            >
              <Plus size={16} /> Agregar objetivo
            </button>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Requisitos previos
            </label>
            {formData.requirements.map((req, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={req}
                  onChange={(e) => handleListChange('requirements', i, e.target.value)}
                  placeholder="Ej. Conocimientos básicos de HTML..."
                  className="flex-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-2 focus:border-indigo-500 focus:ring-indigo-500/20"
                />
                <button
                  type="button"
                  onClick={() => confirmRemoveListItem('requirements', i)}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 dark:bg-slate-800/50 dark:hover:bg-red-900/20 rounded-xl"
                  title="Eliminar requisito"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addListItem('requirements')}
              className="text-sm text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline"
            >
              <Plus size={16} /> Agregar requisito
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="instructor" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Instructor <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="instructor"
                name="instructor"
                value={formData.instructor}
                readOnly={userRole === 'PROFESOR'}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-xl border transition-all focus:outline-none ${
                  userRole === 'PROFESOR'
                    ? 'border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
                }`}
              />
              {errors.instructor && <span className="text-xs text-red-500">{errors.instructor}</span>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="courseCategoryId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Categoría <span className="text-red-500">*</span>
              </label>
              <select
                id="courseCategoryId"
                name="courseCategoryId"
                value={formData.courseCategoryId}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:outline-none focus:ring-2 appearance-none ${
                  errors.courseCategoryId ? 'border-red-500' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500/20'
                }`}
              >
                <option value="">Selecciona una categoría</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.courseCategoryId && <span className="text-xs text-red-500">{errors.courseCategoryId}</span>}
            </div>
          </div>
        </div>

        {/* Columna Lateral - Metadata y Portada */}
        <div className="space-y-6">
          
          {/* Subida de Portada */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Portada del Curso <span className="text-slate-400 text-xs font-normal">(Opcional)</span>
            </label>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className={`relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-2xl transition-all overflow-hidden bg-slate-50 dark:bg-slate-800/30
                ${previewUrl ? 'border-indigo-500/50' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'}
                ${errors.coverImage ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : ''}
              `}
            >
              {previewUrl ? (
                <>
                  <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                  
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                      <span className="text-xs font-medium text-white">Subiendo...</span>
                    </div>
                  )}

                  {!uploadingImage && (
                    <button
                      type="button"
                      onClick={() => { setPreviewUrl(null); setFormData(prev => ({ ...prev, coverImage: undefined })); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-md"
                    >
                      <X size={16} />
                    </button>
                  )}
                  
                  {formData.coverImage && !uploadingImage && (
                     <div className="absolute bottom-2 right-2 px-2 py-1 bg-green-500/90 text-white text-[10px] font-bold rounded-md backdrop-blur-md flex items-center gap-1">
                       <CheckCircle2 size={12} /> Subida
                     </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-5 text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 rounded-full flex items-center justify-center mb-3">
                    <UploadCloud size={24} />
                  </div>
                  <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">Sube un archivo</span> o arrástralo
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">JPG, PNG o WEBP (Máx. 5MB)</p>
                </div>
              )}
              <input 
                ref={fileInputRef} 
                type="file" 
                className="hidden" 
                accept="image/jpeg, image/png, image/webp"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
                }}
              />
            </div>
            {errors.coverImage && <span className="text-xs text-red-500">{errors.coverImage}</span>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="price" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Precio (USD)</label>
              <input
                type="number"
                id="price"
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="level" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nivel</label>
              <select
                id="level"
                name="level"
                value={formData.level}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none appearance-none"
              >
                <option value="PRINCIPIANTE">Principiante</option>
                <option value="INTERMEDIO">Intermedio</option>
                <option value="AVANZADO">Avanzado</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Horas Totales</label>
            <input
              type="number"
              id="duration"
              name="duration"
              min="0"
              value={formData.duration}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
            {errors.duration && <span className="text-xs text-red-500">{errors.duration}</span>}
          </div>
        </div>
          </fieldset>
        </form>

        {formData.status !== 'PENDING_REVIEW' && (
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-end gap-4 items-center">
            {/* CA-21: Loading state buttons */}
            <button
              type="button"
              disabled={isSubmitting || uploadingImage}
              onClick={(e) => onActionClick(e, 'DRAFT')}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && submitAction === 'DRAFT' ? (
                <><Loader2 size={18} className="animate-spin" /> Guardando...</>
              ) : (
                <><Save size={18} /> Guardar como borrador</>
              )}
            </button>
            
            {userRole === 'PROFESOR' && courseId && (formData.status === 'DRAFT' || formData.status === 'REJECTED') && (
              <button
                type="button"
                disabled={isSubmitting || uploadingImage}
                onClick={() => setShowReviewConfirm(true)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} /> Enviar a revisión
              </button>
            )}

            {userRole !== 'PROFESOR' && (
              <button
                type="button"
                disabled={isSubmitting || uploadingImage}
                onClick={(e) => {
                  setSubmitAction('PUBLISHED');
                  onActionClick(e, 'PUBLISHED');
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting && submitAction === 'PUBLISHED' ? (
                  <><Loader2 size={18} className="animate-spin" /> Publicando...</>
                ) : (
                  <><Send size={18} /> Publicar</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {activeTab === 'STRUCTURE' && (
        <div className="animate-in fade-in duration-300">
          {courseId ? (
            <CourseStructureEditor courseId={courseId} />
          ) : (
            <div className="py-16 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <BookOpen className="w-12 h-12 text-slate-400 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Guarda tu curso primero</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md">
                Guarda la información general del curso como borrador para comenzar a agregar módulos y lecciones.
              </p>
              <button 
                onClick={() => setActiveTab('INFO')}
                className="mt-6 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
              >
                Volver a Información General
              </button>
            </div>
          )}
        </div>
      )}

      {/* CA-20: Modal de Confirmación de Duplicados */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mb-4">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Posible duplicado</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{duplicateMessage}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  if (pendingAction) executeSubmit(pendingAction, true);
                }}
                className="px-4 py-2 rounded-lg font-medium text-white bg-amber-600 hover:bg-amber-700 transition-colors"
              >
                Sí, guardar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mb-4">
                <Save size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Confirmar cambios</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                ¿Estás seguro de que deseas continuar con los cambios realizados en el curso?
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm({ visible: false, action: null })}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitConfirm({ visible: false, action: null });
                  if (showSubmitConfirm.action) executeSubmit(showSubmitConfirm.action, false);
                }}
                className="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Progress Modal */}
      {submitStatus.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-8 text-center flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 transition-colors duration-500 ${
                submitStatus.status === 'LOADING' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'bg-green-100 dark:bg-green-900/30 text-green-600'
              }`}>
                {submitStatus.status === 'LOADING' ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={32} className="animate-in zoom-in duration-300" />
                )}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {submitStatus.status === 'LOADING' ? 'Procesando...' : '¡Éxito!'}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{submitStatus.message}</p>
            </div>
            {submitStatus.status === 'SUCCESS' && (
              <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-center border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => window.location.href = submitStatus.redirectUrl}
                  className="w-full px-4 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  Continuar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Confirmar eliminación</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                {deleteContext.field === 'learning_objectives' 
                  ? '¿Desea eliminar este objetivo de aprendizaje del curso?' 
                  : '¿Desea eliminar este requisito del curso?'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDeleteContext(null)}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeRemove}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">¡Completado!</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{successModal.message}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSuccessModal({ visible: false, message: '' })}
                className="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Confirmation Modal */}
      {showReviewConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mb-4">
                <Send size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Enviar a revisión</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Atención: El curso será enviado a revisión. Solo tendrás 1 hora para cancelar esta solicitud si deseas hacer ajustes. ¿Confirmar envío?
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowReviewConfirm(false)}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitReview}
                className="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
              >
                Confirmar envío
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
