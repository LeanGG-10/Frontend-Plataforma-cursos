import React, { useState, useEffect } from 'react';
import { coursesService } from '../../services/courses.service';
import { authService } from '../../services/auth.service';
import { Loader2, PlayCircle, FileText, ClipboardList, BookOpen, AlertCircle, ChevronLeft, Menu, X, Trophy } from 'lucide-react';
import StudentAssignmentView from './StudentAssignmentView';
import StudentQuizView from './StudentQuizView';

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  is_published: boolean;
  position: number;
  description?: string;
  is_final_exam?: boolean;
  quiz_time_limit_minutes?: number;
  passing_score_percentage?: number;
}

interface Section {
  id: string;
  title: string;
  is_published: boolean;
  position: number;
  lessons: Lesson[];
}

export default function CourseLMSViewer({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  
  const [courseTitle, setCourseTitle] = useState('');
  const [sections, setSections] = useState<Section[]>([]);
  const [activeLesson, setActiveLesson] = useState<{ sectionId: string; lesson: Lesson } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lessonUrl, setLessonUrl] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    const checkAccessAndLoad = async () => {
      const token = localStorage.getItem('accessToken');
      const sessionId = localStorage.getItem('activeSessionId');
      
      if (!token) {
        setShowAccessModal(true);
        setLoading(false);
        return;
      }

      try {
        const accessData = await coursesService.getCourseAccessStatus(courseId, token, sessionId || '');
        if (!accessData.hasAccess && !accessData.isOwner && accessData.role !== 'ADMIN') {
          setShowAccessModal(true);
          setLoading(false);
          return;
        }
        
        setHasAccess(true);

        const data = await coursesService.getPublicCourseDetails(courseId);
        setCourseTitle(data.title);
        
        // Filter sections with published lessons
        const publishedSections = (data.sections || [])
          .map((s: any) => ({
            ...s,
            lessons: (s.lessons || []).filter((l: any) => l.is_published).sort((a: any, b: any) => a.position - b.position)
          }))
          .filter((s: any) => s.lessons.length > 0)
          .sort((a: any, b: any) => a.position - b.position);

        setSections(publishedSections);
        
        if (publishedSections.length > 0 && publishedSections[0].lessons.length > 0) {
          setActiveLesson({ sectionId: publishedSections[0].id, lesson: publishedSections[0].lessons[0] });
        }
      } catch (error) {
        console.error(error);
        setShowAccessModal(true);
      } finally {
        setLoading(false);
      }
    };

    checkAccessAndLoad();
  }, [courseId]);

  useEffect(() => {
    if (activeLesson && activeLesson.lesson.content_type !== 'ASSIGNMENT') {
      const fetchUrl = async () => {
        setLoadingContent(true);
        try {
          const data = await coursesService.getLessonSignedUrl(activeLesson.sectionId, activeLesson.lesson.id);
          setLessonUrl(data.url);
        } catch (error) {
          console.error(error);
          setLessonUrl(null);
        } finally {
          setLoadingContent(false);
        }
      };
      fetchUrl();
    } else {
      setLessonUrl(null);
    }
  }, [activeLesson]);

  const getIconForType = (type: string) => {
    switch (type) {
      case 'VIDEO': return <PlayCircle size={16} />;
      case 'DOCUMENT': return <FileText size={16} />;
      case 'ASSIGNMENT': return <ClipboardList size={16} />;
      case 'QUIZ': return <Trophy size={16} />;
      case 'EXE_LEARNING': return <BookOpen size={16} />;
      default: return <FileText size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400">Cargando curso...</p>
      </div>
    );
  }

  if (showAccessModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
        <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-700">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-900/30 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h3>
            <p className="text-slate-300">
              No has adquirido este curso o tu sesión ha expirado. Serás redirigido a la página del curso para realizar la compra o iniciar sesión.
            </p>
          </div>
          <div className="bg-slate-900/50 p-6 flex justify-center">
            <a
              href={`/cursos/${courseId}`}
              className="px-6 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors w-full text-center"
            >
              Volver al Curso
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-slate-900">
      {/* Sidebar */}
      <div 
        className={`${sidebarOpen ? 'w-80' : 'w-0'} flex-shrink-0 bg-slate-800 border-r border-slate-700 transition-all duration-300 overflow-hidden flex flex-col h-full`}
      >
        <div className="p-4 border-b border-slate-700 flex items-center gap-3">
          <a href={`/cursos/${courseId}`} className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors">
            <ChevronLeft size={20} />
          </a>
          <h2 className="font-bold text-white text-sm line-clamp-2 leading-tight">{courseTitle}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {sections.map((section, sIdx) => (
            <div key={section.id} className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">
                Módulo {sIdx + 1}: {section.title}
              </h3>
              <div className="space-y-1">
                {section.lessons.map((lesson) => {
                  const isActive = activeLesson?.lesson.id === lesson.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLesson({ sectionId: section.id, lesson })}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
                        isActive 
                          ? 'bg-indigo-600/20 text-indigo-400 font-medium border border-indigo-500/30' 
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white border border-transparent'
                      }`}
                    >
                      <span className={isActive ? 'text-indigo-400' : 'text-slate-500'}>
                        {getIconForType(lesson.content_type)}
                      </span>
                      <span className="text-sm truncate flex-1">{lesson.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <h1 className="font-bold text-lg text-white">
              {activeLesson?.lesson.title || 'Selecciona una lección'}
            </h1>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4 md:p-8">
          <div className="max-w-5xl mx-auto h-full flex flex-col">
            {activeLesson ? (
              activeLesson.lesson.content_type === 'ASSIGNMENT' ? (
                <StudentAssignmentView sectionId={activeLesson.sectionId} lessonId={activeLesson.lesson.id} title={activeLesson.lesson.title} />
              ) : activeLesson.lesson.content_type === 'QUIZ' ? (
                <StudentQuizView 
                  sectionId={activeLesson.sectionId} 
                  lessonId={activeLesson.lesson.id} 
                  title={activeLesson.lesson.title}
                  isFinalExam={activeLesson.lesson.is_final_exam}
                  timeLimitMinutes={activeLesson.lesson.quiz_time_limit_minutes}
                  passingScore={activeLesson.lesson.passing_score_percentage}
                />
              ) : (
                <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                  <div className="w-full shrink-0 min-h-[400px] aspect-video bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex flex-col relative shadow-2xl">
                    {loadingContent ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800/50 backdrop-blur-sm z-10">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                        <p className="text-slate-400 font-medium">Cargando contenido...</p>
                      </div>
                    ) : lessonUrl ? (
                      activeLesson.lesson.content_type === 'VIDEO' ? (
                        <video 
                          controls 
                          className="w-full h-full object-contain bg-black outline-none absolute inset-0"
                          src={lessonUrl}
                          controlsList="nodownload"
                        />
                      ) : activeLesson.lesson.content_type === 'DOCUMENT' || activeLesson.lesson.content_type === 'EXE_LEARNING' ? (
                        <iframe 
                          src={lessonUrl} 
                          className="w-full h-full border-none bg-white absolute inset-0"
                          title={activeLesson.lesson.title}
                        />
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-800/30">
                          <FileText className="w-16 h-16 text-slate-600 mb-4" />
                          <h3 className="text-xl font-bold text-slate-300 mb-2">Contenido disponible</h3>
                          <a 
                            href={lessonUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors"
                          >
                            Abrir contenido en nueva pestaña
                          </a>
                        </div>
                      )
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-800/30">
                        <AlertCircle className="w-16 h-16 text-slate-600 mb-4" />
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Contenido no disponible</h3>
                        <p className="text-slate-500">Hubo un problema al cargar este contenido.</p>
                      </div>
                    )}
                  </div>

                  {activeLesson.lesson.description && (
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 shadow-xl shrink-0">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-indigo-400" />
                        Descripción
                      </h3>
                      <div 
                        className="prose prose-invert max-w-none text-slate-300"
                        dangerouslySetInnerHTML={{ __html: activeLesson.lesson.description }}
                      />
                    </div>
                  )}
                </div>
              )
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <BookOpen className="w-20 h-20 text-slate-700 mb-6" />
                <h2 className="text-2xl font-bold text-slate-400">Comienza a aprender</h2>
                <p className="text-slate-500 mt-2">Selecciona una lección del temario para comenzar.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
