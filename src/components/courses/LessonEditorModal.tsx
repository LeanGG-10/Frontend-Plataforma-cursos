import React, { useState, useRef } from 'react';
import { Loader2, X, UploadCloud, FileText, Video, Package, Check, AlertCircle, ClipboardList, BookOpenCheck } from 'lucide-react';
import { coursesService } from '../../services/courses.service';
import QuizQuestionBuilderModal from './QuizQuestionBuilderModal';

interface Lesson {
 id?: string;
 title: string;
 description?: string;
 content_type?: 'VIDEO' | 'DOCUMENT' | 'EXE_LEARNING' | 'ASSIGNMENT' | 'QUIZ';
 is_published?: boolean;
 is_free_preview?: boolean;
 is_gradable?: boolean;
 max_score?: number;
 assignment_duration_hours?: number;
 allowed_file_types?: string;
 quiz_time_limit_minutes?: number;
 passing_score_percentage?: number;
 is_final_exam?: boolean;
}

interface Props {
 courseId: string;
 sectionId: string;
 lesson?: Lesson; // Si existe, es edición. Si no, creación.
 onClose: () => void;
 onSaveSuccess: () => void;
}

export default function LessonEditorModal({ courseId, sectionId, lesson, onClose, onSaveSuccess }: Props) {
 const [formData, setFormData] = useState<Lesson>({
 title: lesson?.title || '',
 description: lesson?.description || '',
 content_type: lesson?.content_type || 'VIDEO',
 is_published: lesson?.is_published ?? true,
 is_free_preview: lesson?.is_free_preview ?? false,
 is_gradable: lesson?.is_gradable ?? false,
 max_score: lesson?.max_score ?? 10.0,
 assignment_duration_hours: lesson?.assignment_duration_hours ?? 24,
 allowed_file_types: lesson?.allowed_file_types ?? 'pdf,zip,docx',
 quiz_time_limit_minutes: lesson?.quiz_time_limit_minutes ?? 15,
 passing_score_percentage: lesson?.passing_score_percentage ?? 70.0,
 is_final_exam: lesson?.is_final_exam ?? false,
 });

 const [file, setFile] = useState<File | null>(null);
 const [isSubmitting, setIsSubmitting] = useState(false);
 const [uploadProgress, setUploadProgress] = useState(0);
 const [error, setError] = useState('');
 const [showQuizBuilder, setShowQuizBuilder] = useState(false);
 
 const fileInputRef = useRef<HTMLInputElement>(null);

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 setFile(e.target.files[0]);
 }
 };

 const handleDragOver = (e: React.DragEvent) => {
 e.preventDefault();
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 if (e.dataTransfer.files && e.dataTransfer.files[0]) {
 setFile(e.dataTransfer.files[0]);
 }
 };

 const handleSave = async () => {
 if (!formData.title.trim()) {
 setError('El título de la lección es obligatorio.');
 return;
 }
 
 setIsSubmitting(true);
 setError('');
 
 try {
 let currentLessonId = lesson?.id;
 
 // 1. Crear o actualizar datos básicos
 if (!currentLessonId) {
 const res = await coursesService.createLesson(sectionId, { title: formData.title });
 currentLessonId = res.id;
 }
 
 // 2. Subir archivo si hay uno seleccionado
 if (file && currentLessonId) {
 setUploadProgress(10); // Simulated start
 const progressInterval = setInterval(() => {
 setUploadProgress(prev => (prev < 90 ? prev + 10 : prev));
 }, 300);

 await coursesService.uploadLessonFile(sectionId, currentLessonId, file);
 clearInterval(progressInterval);
 setUploadProgress(100);
 }

 // 3. Actualizar la lección con todos los campos extendidos
 if (currentLessonId) {
 await coursesService.updateLesson(sectionId, currentLessonId, {
 title: formData.title,
 description: formData.description,
 content_type: formData.content_type,
 is_published: formData.is_published,
 is_free_preview: formData.is_free_preview,
 is_gradable: formData.is_gradable,
 max_score: formData.is_gradable ? Number(formData.max_score) : null,
 assignment_duration_hours: formData.content_type === 'ASSIGNMENT' ? Number(formData.assignment_duration_hours) : null,
 allowed_file_types: formData.content_type === 'ASSIGNMENT' ? formData.allowed_file_types : null,
 quiz_time_limit_minutes: formData.content_type === 'QUIZ' ? Number(formData.quiz_time_limit_minutes) : null,
 passing_score_percentage: formData.content_type === 'QUIZ' ? Number(formData.passing_score_percentage) : null,
 is_final_exam: formData.content_type === 'QUIZ' ? formData.is_final_exam : false,
 });
 }

 onSaveSuccess();
 } catch (err: any) {
 void 0; /* error log removed */ // (err);
 setError(err.message || 'Error al guardar la lección');
 } finally {
 setIsSubmitting(false);
 setUploadProgress(0);
 }
 };

 return (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-hidden">
 <div className="bg-slate-50 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col overflow-hidden border border-slate-200 h-full max-h-full">
 
 {/* Header */}
 <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
 <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
 {lesson?.id ? <Check size={20} className="text-indigo-500" /> : <Package size={20} className="text-indigo-500" />}
 {lesson?.id ? 'Editar Lección' : 'Nueva Lección'}
 </h3>
 <div className="flex items-center gap-3">
 <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 :text-slate-200 bg-slate-50 rounded-full shadow-sm cursor-pointer">
 <X size={20} />
 </button>
 </div>
 </div>

 {/* Content */}
 <div className="p-6 space-y-6 flex-1 overflow-y-auto">
 {error && (
 <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-200 ">
 <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
 <p className="text-sm font-medium">{error}</p>
 </div>
 )}

 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
 <div className="space-y-4">
 {/* Título */}
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1.5">
 Título de la lección <span className="text-red-500">*</span>
 </label>
 <input
 type="text"
 value={formData.title}
 onChange={(e) => setFormData({ ...formData, title: e.target.value })}
 placeholder="Ej. Introducción a los conceptos básicos"
 className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
 />
 </div>

 {/* Descripción */}
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1.5">
 Descripción o instrucciones
 </label>
 <textarea
 rows={4}
 value={formData.description}
 onChange={(e) => setFormData({ ...formData, description: e.target.value })}
 placeholder="Escribe el contenido explicativo de la lección..."
 className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
 />
 </div>

 {/* Tipo de Contenido */}
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1.5">
 Tipo de Contenido
 </label>
 <div className="grid grid-cols-5 gap-2">
 <button
 type="button"
 onClick={() => setFormData({ ...formData, content_type: 'VIDEO' })}
 className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${formData.content_type === 'VIDEO' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ' : 'border-slate-200 hover:border-indigo-200 text-slate-500 '}`}
 >
 <Video size={24} className="mb-2" />
 <span className="text-xs font-semibold">Video</span>
 </button>
 <button
 type="button"
 onClick={() => setFormData({ ...formData, content_type: 'DOCUMENT' })}
 className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${formData.content_type === 'DOCUMENT' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ' : 'border-slate-200 hover:border-indigo-200 text-slate-500 '}`}
 >
 <FileText size={24} className="mb-2" />
 <span className="text-xs font-semibold">PDF/Img</span>
 </button>
 <button
 type="button"
 onClick={() => setFormData({ ...formData, content_type: 'EXE_LEARNING' })}
 className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${formData.content_type === 'EXE_LEARNING' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ' : 'border-slate-200 hover:border-indigo-200 text-slate-500 '}`}
 >
 <Package size={24} className="mb-2" />
 <span className="text-xs font-semibold text-center leading-tight">Interactivos</span>
 </button>
 <button
 type="button"
 onClick={() => setFormData({ ...formData, content_type: 'ASSIGNMENT' })}
 className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${formData.content_type === 'ASSIGNMENT' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ' : 'border-slate-200 hover:border-indigo-200 text-slate-500 '}`}
 >
 <ClipboardList size={24} className="mb-2" />
 <span className="text-xs font-semibold text-center leading-tight">Tarea</span>
 </button>
 <button
 type="button"
 onClick={() => setFormData({ ...formData, content_type: 'QUIZ' })}
 className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer ${formData.content_type === 'QUIZ' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ' : 'border-slate-200 hover:border-indigo-200 text-slate-500 '}`}
 >
 <BookOpenCheck size={24} className="mb-2" />
 <span className="text-xs font-semibold text-center leading-tight">Quiz</span>
 </button>
 </div>
 </div>

 {/* Assignment specific fields */}
 {formData.content_type === 'ASSIGNMENT' && (
 <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Límite de tiempo (Horas)
 </label>
 <input
 type="number"
 min="1"
 value={formData.assignment_duration_hours}
 onChange={(e) => setFormData({ ...formData, assignment_duration_hours: parseInt(e.target.value) || 24 })}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
 />
 <p className="text-xs text-slate-500 mt-1">
 Tiempo que tendrá el alumno para entregar la tarea tras iniciarla.
 </p>
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Extensiones permitidas
 </label>
 <input
 type="text"
 value={formData.allowed_file_types}
 onChange={(e) => setFormData({ ...formData, allowed_file_types: e.target.value })}
 placeholder="Ej. pdf,zip,docx"
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
 />
 <p className="text-xs text-slate-500 mt-1">
 Separadas por coma. Dejar vacío para permitir cualquier archivo.
 </p>
 </div>
 </div>
 )}

 {/* Quiz specific fields */}
 {formData.content_type === 'QUIZ' && (
 <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Límite de tiempo (Minutos)
 </label>
 <input
 type="number"
 min="1"
 value={formData.quiz_time_limit_minutes}
 onChange={(e) => setFormData({ ...formData, quiz_time_limit_minutes: parseInt(e.target.value) || 15 })}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
 />
 </div>
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1">
 % Aprobación
 </label>
 <input
 type="number"
 min="1"
 max="100"
 value={formData.passing_score_percentage}
 onChange={(e) => setFormData({ ...formData, passing_score_percentage: parseFloat(e.target.value) || 70.0 })}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
 />
 </div>
 </div>

 <div className="flex items-center justify-between pt-2">
 <div>
 <h4 className="text-sm font-medium text-slate-900 ">¿Es el Examen Final?</h4>
 <p className="text-xs text-slate-500">Marcar si esta evaluación define la aprobación del curso.</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input type="checkbox" className="sr-only peer" checked={formData.is_final_exam} onChange={(e) => setFormData({...formData, is_final_exam: e.target.checked})} />
 <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 :ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-50 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
 </label>
 </div>

 {lesson?.id && lesson.content_type === 'QUIZ' ? (
 <div className="pt-2 border-t border-slate-200 ">
 <button
 type="button"
 onClick={() => setShowQuizBuilder(true)}
 className="w-full py-2.5 px-4 bg-indigo-100 hover:bg-indigo-200 :bg-indigo-900/50 text-indigo-700 font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer"
 >
 <BookOpenCheck size={18} />
 Gestionar Preguntas del Quiz
 </button>
 </div>
 ) : (
 <div className="pt-2 border-t border-slate-200 ">
 <p className="text-xs text-amber-600 font-medium text-center bg-amber-50 p-2 rounded-lg border border-amber-200 ">
 Guarda la lección como "Quiz" primero para poder gestionar las preguntas.
 </p>
 </div>
 )}
 </div>
 )}
 </div>

 <div className="space-y-6">
 {/* File Upload Zone */}
 <div>
 <label className="block text-sm font-medium text-slate-700 mb-1.5">
 Archivo adjunto (Opcional)
 </label>
 <div 
 className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${file ? 'border-indigo-500 bg-indigo-50 ' : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50 :bg-slate-800'}`}
 onDragOver={handleDragOver}
 onDrop={handleDrop}
 onClick={() => fileInputRef.current?.click()}
 >
 <input 
 type="file" 
 ref={fileInputRef} 
 className="hidden" 
 onChange={handleFileChange}
 accept={formData.content_type === 'VIDEO' ? 'video/mp4,video/webm' : formData.content_type === 'DOCUMENT' ? '.pdf,.png,.jpg,.jpeg' : formData.content_type === 'ASSIGNMENT' ? '.pdf,.zip,.docx' : '.elp,.elpx,.zip,.html'}
 />
 {file ? (
 <div className="flex flex-col items-center">
 <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
 <Check size={24} />
 </div>
 <p className="text-sm font-medium text-slate-900 truncate max-w-[200px]">{file.name}</p>
 <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
 <button 
 type="button" 
 onClick={(e) => { e.stopPropagation(); setFile(null); }}
 className="mt-3 text-xs font-medium text-red-500 hover:text-red-600 cursor-pointer"
 >
 Quitar archivo
 </button>
 </div>
 ) : (
 <div className="flex flex-col items-center cursor-pointer">
 <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
 <UploadCloud size={24} />
 </div>
 <p className="text-sm font-medium text-slate-700 ">
 Haz clic para subir o arrastra el archivo aquí
 </p>
 <p className="text-xs text-slate-500 mt-1">
 Soporta MP4, PDF, PNG/JPG, .html o .elp/.zip según el tipo.
 </p>
 </div>
 )}
 
 {/* Upload Progress */}
 {isSubmitting && file && (
 <div className="mt-4 w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
 <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
 </div>
 )}
 </div>
 </div>

 {/* Toggles */}
 <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-200 ">
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-sm font-medium text-slate-900 ">Publicado</h4>
 <p className="text-xs text-slate-500">Visible para los estudiantes</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input type="checkbox" className="sr-only peer" checked={formData.is_published} onChange={(e) => setFormData({...formData, is_published: e.target.checked})} />
 <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 :ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-50 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
 </label>
 </div>
 
 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-sm font-medium text-slate-900 ">Vista Previa Gratuita</h4>
 <p className="text-xs text-slate-500">Disponible sin comprar el curso</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input type="checkbox" className="sr-only peer" checked={formData.is_free_preview} onChange={(e) => setFormData({...formData, is_free_preview: e.target.checked})} />
 <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 :ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-50 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
 </label>
 </div>

 <div className="flex items-center justify-between">
 <div>
 <h4 className="text-sm font-medium text-slate-900 ">Lección Calificable</h4>
 <p className="text-xs text-slate-500">Permite asignar una nota</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input type="checkbox" className="sr-only peer" checked={formData.is_gradable} onChange={(e) => setFormData({...formData, is_gradable: e.target.checked})} />
 <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 :ring-indigo-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-50 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
 </label>
 </div>

 {formData.is_gradable && (
 <div className="pt-2 border-t border-slate-200 ">
 <label className="block text-sm font-medium text-slate-700 mb-1">
 Puntaje Máximo
 </label>
 <input
 type="number"
 step="0.1"
 min="0"
 value={formData.max_score}
 onChange={(e) => setFormData({ ...formData, max_score: parseFloat(e.target.value) })}
 className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
 />
 </div>
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Footer */}
 <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 shrink-0">
 <button
 type="button"
 onClick={onClose}
 className="px-4 py-2 rounded-xl font-medium text-slate-700 bg-slate-50 border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
 disabled={isSubmitting}
 >
 Cancelar
 </button>
 <button
 type="button"
 onClick={handleSave}
 disabled={isSubmitting || !formData.title.trim()}
 className="px-6 py-2 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
 >
 {isSubmitting ? (
 <>
 <Loader2 size={18} className="animate-spin" />
 {file ? 'Subiendo y Guardando...' : 'Guardando...'}
 </>
 ) : (
 'Guardar Lección'
 )}
 </button>
 </div>
 </div>
 
 {showQuizBuilder && lesson?.id && (
 <QuizQuestionBuilderModal
 sectionId={sectionId}
 lessonId={lesson.id}
 onClose={() => setShowQuizBuilder(false)}
 />
 )}
 </div>
 );
}
