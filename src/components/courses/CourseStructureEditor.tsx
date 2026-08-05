import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, Trash2, ArrowUp, ArrowDown, BookOpen, AlertCircle, CheckCircle2, ChevronRight, ChevronDown, Users, ClipboardList } from 'lucide-react';
import { coursesService } from '../../services/courses.service';
import LessonEditorModal from './LessonEditorModal';
import AssignmentGradingModal from './AssignmentGradingModal';

interface Lesson {
  id: string;
  title: string;
  position: number;
  duration_seconds: number | null;
  content_type?: string;
}

interface Section {
  id: string;
  title: string;
  position: number;
  lessons: Lesson[];
}

interface Props {
  courseId: string;
}

export default function CourseStructureEditor({ courseId }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Modals state
  const [editingItem, setEditingItem] = useState<{ type: 'SECTION', id?: string, title: string } | null>(null);
  const [editingLessonContext, setEditingLessonContext] = useState<{ sectionId: string, lesson?: any } | null>(null);
  const [deleteContext, setDeleteContext] = useState<{ type: 'SECTION' | 'LESSON', id: string, parentId?: string } | null>(null);
  const [gradingContext, setGradingContext] = useState<{ sectionId: string, lessonId: string, lessonTitle: string } | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchStructure();
  }, [courseId]);

  const fetchStructure = async () => {
    setIsLoading(true);
    try {
      const data = await coursesService.getPublicCourseDetails(courseId);
      const sortedSections = (data.sections || []).map((sec: any) => ({
        ...sec,
        lessons: [...(sec.lessons || [])].sort((a, b) => a.position - b.position)
      })).sort((a: any, b: any) => a.position - b.position);
      
      setSections(sortedSections);
      
      // Expand all by default
      const initialExpanded: Record<string, boolean> = {};
      sortedSections.forEach((s: Section) => {
        initialExpanded[s.id] = true;
      });
      setExpandedSections(initialExpanded);
    } catch (error) {
      console.error(error);
      alert('Error al cargar la estructura del curso');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // ==========================================
  // SECTIONS
  // ==========================================
  
  const moveSection = async (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) || 
      (direction === 'down' && index === sections.length - 1)
    ) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...sections];
    
    // Swap
    const temp = newSections[index];
    newSections[index] = newSections[newIndex];
    newSections[newIndex] = temp;

    // Update positions
    newSections.forEach((sec, i) => {
      sec.position = i;
    });

    setSections(newSections);

    try {
      await coursesService.reorderSections(
        courseId, 
        newSections.map(s => ({ id: s.id, position: s.position }))
      );
    } catch (err) {
      alert('Error al guardar el nuevo orden');
      fetchStructure(); // Revert
    }
  };

  const handleSaveItem = async () => {
    if (!editingItem || !editingItem.title.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingItem.type === 'SECTION') {
        if (editingItem.id) {
          // Edit
          await coursesService.updateSection(courseId, editingItem.id, { title: editingItem.title });
        } else {
          // Create
          await coursesService.createSection(courseId, { title: editingItem.title, position: sections.length });
        }
      }
      setEditingItem(null);
      await fetchStructure();
    } catch (err: any) {
      alert(err.message || 'Error al guardar');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // LESSONS
  // ==========================================

  const moveLesson = async (sectionIndex: number, lessonIndex: number, direction: 'up' | 'down') => {
    const section = sections[sectionIndex];
    if (
      (direction === 'up' && lessonIndex === 0) || 
      (direction === 'down' && lessonIndex === section.lessons.length - 1)
    ) return;

    const newLessonIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    const newSections = [...sections];
    const newLessons = [...section.lessons];

    // Swap
    const temp = newLessons[lessonIndex];
    newLessons[lessonIndex] = newLessons[newLessonIndex];
    newLessons[newLessonIndex] = temp;

    // Update positions
    newLessons.forEach((l, i) => {
      l.position = i;
    });

    newSections[sectionIndex].lessons = newLessons;
    setSections(newSections);

    try {
      await coursesService.reorderLessons(
        section.id, 
        newLessons.map(l => ({ id: l.id, position: l.position }))
      );
    } catch (err) {
      alert('Error al guardar el nuevo orden');
      fetchStructure(); // Revert
    }
  };

  const confirmDelete = async () => {
    if (!deleteContext) return;
    setIsSubmitting(true);
    try {
      if (deleteContext.type === 'SECTION') {
        await coursesService.deleteSection(courseId, deleteContext.id);
      } else if (deleteContext.parentId) {
        await coursesService.deleteLesson(deleteContext.parentId, deleteContext.id);
      }
      setDeleteContext(null);
      await fetchStructure();
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-500 dark:text-slate-400">Cargando estructura...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Temario del Curso</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organiza tu curso en módulos y lecciones. Arrastra o usa las flechas para reordenar.
          </p>
        </div>
        <button
          onClick={() => setEditingItem({ type: 'SECTION', title: '' })}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          <Plus size={18} /> Agregar Módulo
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700">
          <BookOpen className="w-12 h-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Aún no hay módulos</h3>
          <p className="text-slate-500 dark:text-slate-400 text-center max-w-md mb-6">
            Comienza agregando un módulo (sección) para organizar tus lecciones.
          </p>
          <button
            onClick={() => setEditingItem({ type: 'SECTION', title: '' })}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
          >
            Crear mi primer módulo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section, sIdx) => (
            <div key={section.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-indigo-200 dark:hover:border-indigo-900/50">
              
              {/* Section Header */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 flex items-center justify-between group">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleSection(section.id)}>
                  <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    {expandedSections[section.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </button>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
                    Módulo {sIdx + 1}: {section.title}
                  </h3>
                  <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full ml-2">
                    {section.lessons.length} lecciones
                  </span>
                </div>
                
                <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <div className="flex bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mr-2">
                    <button 
                      onClick={() => moveSection(sIdx, 'up')}
                      disabled={sIdx === 0}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors border-r border-slate-200 dark:border-slate-700"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button 
                      onClick={() => moveSection(sIdx, 'down')}
                      disabled={sIdx === sections.length - 1}
                      className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={() => setEditingItem({ type: 'SECTION', id: section.id, title: section.title })}
                    className="p-2 text-slate-500 hover:text-indigo-600 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setDeleteContext({ type: 'SECTION', id: section.id })}
                    className="p-2 text-slate-500 hover:text-red-600 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Lessons List */}
              {expandedSections[section.id] && (
                <div className="p-4 pt-2">
                  <div className="space-y-2 mb-4">
                    {section.lessons.map((lesson, lIdx) => (
                      <div key={lesson.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all group/lesson">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-xs font-medium">
                            {lIdx + 1}
                          </div>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{lesson.title}</span>
                          {lesson.content_type === 'ASSIGNMENT' && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              <ClipboardList size={10} />
                              Tarea
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover/lesson:opacity-100 transition-opacity">
                          <div className="flex bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden mr-2">
                            <button 
                              onClick={() => moveLesson(sIdx, lIdx, 'up')}
                              disabled={lIdx === 0}
                              className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors border-r border-slate-200 dark:border-slate-700"
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button 
                              onClick={() => moveLesson(sIdx, lIdx, 'down')}
                              disabled={lIdx === section.lessons.length - 1}
                              className="p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                          
                          {lesson.content_type === 'ASSIGNMENT' && (
                            <button
                              onClick={() => setGradingContext({ sectionId: section.id, lessonId: lesson.id, lessonTitle: lesson.title })}
                              className="p-1.5 mr-1 text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 rounded-lg transition-colors flex items-center gap-1.5"
                              title="Ver Entregas"
                            >
                              <Users size={16} />
                            </button>
                          )}
                          
                          <button 
                            onClick={() => setEditingLessonContext({ sectionId: section.id, lesson })}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setDeleteContext({ type: 'LESSON', id: lesson.id, parentId: section.id })}
                            className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setEditingLessonContext({ sectionId: section.id })}
                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors py-2 px-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  >
                    <Plus size={16} /> Agregar Lección
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit/Create Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
                {editingItem.id ? 'Editar' : 'Agregar'} {editingItem.type === 'SECTION' ? 'Módulo' : 'Lección'}
              </h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  placeholder={`Ej. ${editingItem.type === 'SECTION' ? 'Introducción al curso' : 'Bienvenida y conceptos básicos'}`}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveItem}
                disabled={isSubmitting || !editingItem.title.trim()}
                className="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Confirmar eliminación</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                ¿Estás seguro de que deseas eliminar est{deleteContext.type === 'SECTION' ? 'e módulo' : 'a lección'}?
                {deleteContext.type === 'SECTION' && ' Se eliminarán todas las lecciones dentro del módulo de forma permanente.'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setDeleteContext(null)}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Editor Modal */}
      {editingLessonContext && (
        <LessonEditorModal
          courseId={courseId}
          sectionId={editingLessonContext.sectionId}
          lesson={editingLessonContext.lesson}
          onClose={() => setEditingLessonContext(null)}
          onSaveSuccess={async () => {
            setEditingLessonContext(null);
            await fetchStructure();
          }}
        />
      )}

      {/* Grading Modal */}
      {gradingContext && (
        <AssignmentGradingModal
          sectionId={gradingContext.sectionId}
          lessonId={gradingContext.lessonId}
          lessonTitle={gradingContext.lessonTitle}
          onClose={() => setGradingContext(null)}
        />
      )}

    </div>
  );
}
