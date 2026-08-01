import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, X, Loader2, AlertCircle, Save, Send, BookOpen, CheckCircle2 } from 'lucide-react';
import { coursesService, type CreateCoursePayload } from '../../services/courses.service';
import { authService } from '../../services/auth.service';

interface Category {
  id: string;
  name: string;
}

interface Props {
  categories: Category[];
}

export default function CourseCreationForm({ categories }: Props) {
  const [formData, setFormData] = useState<CreateCoursePayload>({
    title: '',
    description: '',
    courseCategoryId: '',
    price: '' as unknown as number,
    status: 'DRAFT',
    instructor: '', 
    duration: '' as unknown as number,
    level: 'Principiante',
    totalLessons: 0,
  });

  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setUserRole(user.role);
    }
    if (user?.full_name) {
      setFormData(prev => ({ ...prev, instructor: user.full_name }));
    }
  }, []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Duplicate modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateMessage, setDuplicateMessage] = useState('');
  const [pendingAction, setPendingAction] = useState<'DRAFT' | 'PUBLISHED' | null>(null);
  const [submitAction, setSubmitAction] = useState<'DRAFT' | 'PUBLISHED'>('DRAFT');

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
    try {
      await coursesService.createCourse({
        ...formData,
        price: Number(formData.price) || 0,
        duration: Number(formData.duration) || 0,
        status: action,
        overrideDuplicateWarning: overrideDuplicate
      });
      const successMessage = userRole === 'PROFESOR'
        ? 'Tu curso se guardará como borrador. Un administrador deberá revisarlo y publicarlo.'
        : `Curso ${action === 'PUBLISHED' ? 'publicado' : 'guardado'} con éxito!`;
      alert(successMessage);
      window.location.href = '/cursos'; // Redirección tras éxito
    } catch (err: any) {
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
    executeSubmit(action, false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 font-sans">
      <form className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
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
      </form>

      {/* Footer / Acciones */}
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
    </div>
  );
}
