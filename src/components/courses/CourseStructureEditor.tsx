import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Edit2, Trash2, ArrowUp, ArrowDown, BookOpen, ChevronRight, ChevronDown, Users, ClipboardList, Layers } from 'lucide-react';
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

interface CourseModule {
  id: string;
  title: string;
  position: number;
  sections: Section[];
}

interface Props {
  courseId: string;
}

type EditingItem =
  | { type: 'MODULE'; id?: string; title: string }
  | { type: 'SECTION'; id?: string; title: string; moduleId: string };

type DeleteContext =
  | { type: 'MODULE'; id: string }
  | { type: 'SECTION'; id: string; moduleId: string; courseId: string }
  | { type: 'LESSON'; id: string; parentId: string };

export default function CourseStructureEditor({ courseId }: Props) {
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);
  const [editingLessonContext, setEditingLessonContext] = useState<{ sectionId: string; lesson?: any } | null>(null);
  const [deleteContext, setDeleteContext] = useState<DeleteContext | null>(null);
  const [gradingContext, setGradingContext] = useState<{ sectionId: string; lessonId: string; lessonTitle: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchStructure(); }, [courseId]);

  const fetchStructure = async () => {
    setIsLoading(true);
    try {
      const data = await coursesService.getPublicCourseDetails(courseId);
      const sortedModules = (data.modules || [])
        .map((mod: any) => ({
          ...mod,
          sections: (mod.sections || [])
            .map((sec: any) => ({
              ...sec,
              lessons: [...(sec.lessons || [])].sort((a: any, b: any) => a.position - b.position),
            }))
            .sort((a: any, b: any) => a.position - b.position),
        }))
        .sort((a: any, b: any) => a.position - b.position);
      setModules(sortedModules);
      const initMod: Record<string, boolean> = {};
      const initSec: Record<string, boolean> = {};
      sortedModules.forEach((m: CourseModule) => {
        initMod[m.id] = true;
        m.sections.forEach((s: Section) => { initSec[s.id] = true; });
      });
      setExpandedModules(initMod);
      setExpandedSections(initSec);
    } catch (error) {
      void 0; /* error log removed */ // (error);
      alert('Error al cargar la estructura del curso');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleModule = (moduleId: string) => setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  const toggleSection = (sectionId: string) => setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));

  const moveModule = async (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === modules.length - 1)) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    const newModules = [...modules];
    [newModules[index], newModules[newIndex]] = [newModules[newIndex], newModules[index]];
    newModules.forEach((m, i) => { m.position = i; });
    setModules(newModules);
    try { await coursesService.reorderModules(courseId, newModules.map(m => ({ id: m.id, position: m.position }))); }
    catch { alert('Error al guardar el nuevo orden'); fetchStructure(); }
  };

  const moveSection = async (moduleIndex: number, sectionIndex: number, direction: 'up' | 'down') => {
    const mod = modules[moduleIndex];
    if ((direction === 'up' && sectionIndex === 0) || (direction === 'down' && sectionIndex === mod.sections.length - 1)) return;
    const newIndex = direction === 'up' ? sectionIndex - 1 : sectionIndex + 1;
    const newModules = [...modules];
    const newSections = [...mod.sections];
    [newSections[sectionIndex], newSections[newIndex]] = [newSections[newIndex], newSections[sectionIndex]];
    newSections.forEach((s, i) => { s.position = i; });
    newModules[moduleIndex].sections = newSections;
    setModules(newModules);
    try { await coursesService.reorderSections(courseId, newSections.map(s => ({ id: s.id, position: s.position }))); }
    catch { alert('Error al guardar el nuevo orden'); fetchStructure(); }
  };

  const moveLesson = async (moduleIndex: number, sectionIndex: number, lessonIndex: number, direction: 'up' | 'down') => {
    const section = modules[moduleIndex].sections[sectionIndex];
    if ((direction === 'up' && lessonIndex === 0) || (direction === 'down' && lessonIndex === section.lessons.length - 1)) return;
    const newLessonIndex = direction === 'up' ? lessonIndex - 1 : lessonIndex + 1;
    const newModules = [...modules];
    const newLessons = [...section.lessons];
    [newLessons[lessonIndex], newLessons[newLessonIndex]] = [newLessons[newLessonIndex], newLessons[lessonIndex]];
    newLessons.forEach((l, i) => { l.position = i; });
    newModules[moduleIndex].sections[sectionIndex].lessons = newLessons;
    setModules(newModules);
    try { await coursesService.reorderLessons(section.id, newLessons.map(l => ({ id: l.id, position: l.position }))); }
    catch { alert('Error al guardar el nuevo orden'); fetchStructure(); }
  };

  const handleSaveItem = async () => {
    if (!editingItem || !editingItem.title.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingItem.type === 'MODULE') {
        if (editingItem.id) { await coursesService.updateModule(courseId, editingItem.id, { title: editingItem.title }); }
        else { await coursesService.createModule(courseId, { title: editingItem.title, position: modules.length }); }
      } else if (editingItem.type === 'SECTION') {
        const mod = modules.find(m => m.id === editingItem.moduleId);
        if (editingItem.id) { await coursesService.updateSection(courseId, editingItem.id, { title: editingItem.title }); }
        else { await coursesService.createSection(courseId, { title: editingItem.title, position: mod ? mod.sections.length : 0, moduleId: editingItem.moduleId }); }
      }
      setEditingItem(null);
      await fetchStructure();
    } catch (err: any) { alert(err.message || 'Error al guardar'); }
    finally { setIsSubmitting(false); }
  };

  const confirmDelete = async () => {
    if (!deleteContext) return;
    setIsSubmitting(true);
    try {
      if (deleteContext.type === 'MODULE') { await coursesService.deleteModule(courseId, deleteContext.id); }
      else if (deleteContext.type === 'SECTION') { await coursesService.deleteSection(deleteContext.courseId, deleteContext.id); }
      else if (deleteContext.type === 'LESSON' && deleteContext.parentId) { await coursesService.deleteLesson(deleteContext.parentId, deleteContext.id); }
      setDeleteContext(null);
      await fetchStructure();
    } catch (err: any) { alert(err.message || 'Error al eliminar'); }
    finally { setIsSubmitting(false); }
  };

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-[300px]">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
      <p className="text-slate-500">Cargando estructura...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Temario del Curso</h2>
          <p className="text-sm text-slate-500 mt-1">Organiza tu curso en módulos, secciones y lecciones.</p>
        </div>
        <button onClick={() => setEditingItem({ type: 'MODULE', title: '' })} className="px-4 py-2 bg-[#B8935A] hover:bg-[#A3804C] text-white rounded-xl font-medium transition-colors flex items-center gap-2 cursor-pointer">
          <Plus size={18} /> Agregar Módulo
        </button>
      </div>

      {modules.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">Aún no hay módulos</h3>
          <p className="text-slate-500 text-center max-w-md mb-6">Comienza agregando un módulo para organizar las secciones y lecciones de tu curso.</p>
          <button onClick={() => setEditingItem({ type: 'MODULE', title: '' })} className="px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer">Crear mi primer módulo</button>
        </div>
      ) : (
        <div className="space-y-4">
          {modules.map((mod, mIdx) => (
            <div key={mod.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:border-indigo-200">
              {/* Module Header */}
              <div className="bg-indigo-50 p-4 flex items-center justify-between group border-b border-indigo-100">
                <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleModule(mod.id)}>
                  <button className="text-indigo-400 hover:text-indigo-600 transition-colors">{expandedModules[mod.id] ? <ChevronDown size={20} /> : <ChevronRight size={20} />}</button>
                  <Layers size={16} className="text-indigo-500 flex-shrink-0" />
                  <h3 className="font-bold text-indigo-900 text-base">Módulo {mIdx + 1}: {mod.title}</h3>
                  <span className="text-xs font-medium text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full ml-1">{mod.sections.length} {mod.sections.length === 1 ? 'sección' : 'secciones'}</span>
                </div>
                <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <div className="flex bg-white rounded-lg shadow-sm border border-indigo-200 overflow-hidden mr-2">
                    <button onClick={() => moveModule(mIdx, 'up')} disabled={mIdx === 0} className="p-1.5 text-indigo-400 hover:bg-indigo-100 disabled:opacity-30 transition-colors border-r border-indigo-200 cursor-pointer"><ArrowUp size={16} /></button>
                    <button onClick={() => moveModule(mIdx, 'down')} disabled={mIdx === modules.length - 1} className="p-1.5 text-indigo-400 hover:bg-indigo-100 disabled:opacity-30 transition-colors cursor-pointer"><ArrowDown size={16} /></button>
                  </div>
                  <button onClick={() => setEditingItem({ type: 'MODULE', id: mod.id, title: mod.title })} className="p-2 text-indigo-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg shadow-sm border border-indigo-200 transition-colors cursor-pointer"><Edit2 size={16} /></button>
                  <button onClick={() => setDeleteContext({ type: 'MODULE', id: mod.id })} className="p-2 text-indigo-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg shadow-sm border border-indigo-200 transition-colors cursor-pointer"><Trash2 size={16} /></button>
                </div>
              </div>

              {/* Sections */}
              {expandedModules[mod.id] && (
                <div className="p-4 space-y-3">
                  {mod.sections.length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-2 text-center">Este módulo no tiene secciones aún.</p>
                  ) : (
                    mod.sections.map((section, sIdx) => (
                      <div key={section.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden transition-all hover:border-slate-300">
                        {/* Section Header */}
                        <div className="p-3 flex items-center justify-between group/sec">
                          <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => toggleSection(section.id)}>
                            <button className="text-slate-400 hover:text-indigo-600 transition-colors">{expandedSections[section.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</button>
                            <h4 className="font-semibold text-slate-800">Sección {sIdx + 1}: {section.title}</h4>
                            <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full ml-1">{section.lessons.length} {section.lessons.length === 1 ? 'lección' : 'lecciones'}</span>
                          </div>
                          <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover/sec:opacity-100 transition-opacity">
                            <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden mr-2">
                              <button onClick={() => moveSection(mIdx, sIdx, 'up')} disabled={sIdx === 0} className="p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors border-r border-slate-200 cursor-pointer"><ArrowUp size={14} /></button>
                              <button onClick={() => moveSection(mIdx, sIdx, 'down')} disabled={sIdx === mod.sections.length - 1} className="p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"><ArrowDown size={14} /></button>
                            </div>
                            <button onClick={() => setEditingItem({ type: 'SECTION', id: section.id, title: section.title, moduleId: mod.id })} className="p-1.5 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"><Edit2 size={14} /></button>
                            <button onClick={() => setDeleteContext({ type: 'SECTION', id: section.id, moduleId: mod.id, courseId })} className="p-1.5 text-slate-400 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"><Trash2 size={14} /></button>
                          </div>
                        </div>

                        {/* Lessons */}
                        {expandedSections[section.id] && (
                          <div className="px-4 pb-3 pt-1">
                            <div className="space-y-2 mb-3">
                              {section.lessons.map((lesson, lIdx) => (
                                <div key={lesson.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-300 transition-all group/lesson">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-[#F7F2E8] text-[#B8935A] flex items-center justify-center text-xs font-medium">{lIdx + 1}</div>
                                    <span className="text-slate-700 font-medium text-sm">{lesson.title}</span>
                                    {lesson.content_type === 'ASSIGNMENT' && (<span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800"><ClipboardList size={10} />Tarea</span>)}
                                  </div>
                                  <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover/lesson:opacity-100 transition-opacity">
                                    <div className="flex bg-slate-50 rounded-lg border border-slate-200 overflow-hidden mr-2">
                                      <button onClick={() => moveLesson(mIdx, sIdx, lIdx, 'up')} disabled={lIdx === 0} className="p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors border-r border-slate-200 cursor-pointer"><ArrowUp size={14} /></button>
                                      <button onClick={() => moveLesson(mIdx, sIdx, lIdx, 'down')} disabled={lIdx === section.lessons.length - 1} className="p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"><ArrowDown size={14} /></button>
                                    </div>
                                    {lesson.content_type === 'ASSIGNMENT' && (
                                      <button onClick={() => setGradingContext({ sectionId: section.id, lessonId: lesson.id, lessonTitle: lesson.title })} className="p-1.5 mr-1 text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer" title="Ver Entregas"><Users size={16} /></button>
                                    )}
                                    <button onClick={() => setEditingLessonContext({ sectionId: section.id, lesson })} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"><Edit2 size={16} /></button>
                                    <button onClick={() => setDeleteContext({ type: 'LESSON', id: lesson.id, parentId: section.id })} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"><Trash2 size={16} /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button onClick={() => setEditingLessonContext({ sectionId: section.id })} className="flex items-center gap-2 text-sm font-medium text-[#B8935A] hover:text-[#A3804C] transition-colors py-2 px-3 rounded-lg hover:bg-[#F7F2E8] cursor-pointer">
                              <Plus size={16} /> Agregar Lección
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  <button onClick={() => setEditingItem({ type: 'SECTION', title: '', moduleId: mod.id })} className="flex items-center gap-2 text-sm font-medium text-indigo-500 hover:text-indigo-700 transition-colors py-2 px-3 rounded-lg hover:bg-indigo-50 cursor-pointer w-full">
                    <Plus size={16} /> Agregar Sección
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-4">{editingItem.id ? 'Editar' : 'Agregar'} {editingItem.type === 'MODULE' ? 'Módulo' : 'Sección'}</h3>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Título <span className="text-red-500">*</span></label>
                <input type="text" value={editingItem.title} onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })} placeholder={`Ej. ${editingItem.type === 'MODULE' ? 'Fundamentos del curso' : 'Introducción a la unidad'}`} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" autoFocus />
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
              <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-lg font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer" disabled={isSubmitting}>Cancelar</button>
              <button type="button" onClick={handleSaveItem} disabled={isSubmitting || !editingItem.title.trim()} className="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer">{isSubmitting && <Loader2 size={16} className="animate-spin" />}Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteContext && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4"><Trash2 size={24} /></div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">Confirmar eliminación</h3>
              <p className="text-slate-600 text-sm">
                {deleteContext.type === 'MODULE' && 'Este módulo y todas sus secciones y lecciones serán eliminados permanentemente.'}
                {deleteContext.type === 'SECTION' && 'Esta sección y todas sus lecciones serán eliminadas permanentemente.'}
                {deleteContext.type === 'LESSON' && 'Esta lección será eliminada permanentemente.'}
              </p>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200">
              <button type="button" onClick={() => setDeleteContext(null)} className="px-4 py-2 rounded-lg font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer" disabled={isSubmitting}>Cancelar</button>
              <button type="button" onClick={confirmDelete} disabled={isSubmitting} className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed">{isSubmitting && <Loader2 size={16} className="animate-spin" />}Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {editingLessonContext && (<LessonEditorModal courseId={courseId} sectionId={editingLessonContext.sectionId} lesson={editingLessonContext.lesson} onClose={() => setEditingLessonContext(null)} onSaveSuccess={async () => { setEditingLessonContext(null); await fetchStructure(); }} />)}
      {gradingContext && (<AssignmentGradingModal sectionId={gradingContext.sectionId} lessonId={gradingContext.lessonId} lessonTitle={gradingContext.lessonTitle} onClose={() => setGradingContext(null)} />)}
    </div>
  );
}
