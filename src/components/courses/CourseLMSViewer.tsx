import React, { useState, useEffect, useRef } from 'react';
import { coursesService } from '../../services/courses.service';
import { authService } from '../../services/auth.service';
import { Loader2, PlayCircle, FileText, ClipboardList, BookOpen, AlertCircle, ChevronLeft, Menu, X, Trophy, ExternalLink, Package, Download, ChevronRight, ChevronDown } from 'lucide-react';
import StudentAssignmentView from './StudentAssignmentView';
import StudentQuizView from './StudentQuizView';

const isImage = (url: string | null) => {
  if (!url) return false;
  const urlWithoutQuery = url.split('?')[0];
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(urlWithoutQuery);
};

const isPdf = (url: string | null) => {
  if (!url) return false;
  const urlWithoutQuery = url.split('?')[0];
  return /\.pdf$/i.test(urlWithoutQuery);
};

const isElp = (url: string | null) => {
  if (!url) return false;
  const urlWithoutQuery = url.split('?')[0];
  return /\.(elp|elpx)$/i.test(urlWithoutQuery);
};

const isZip = (url: string | null) => {
  if (!url) return false;
  const urlWithoutQuery = url.split('?')[0];
  return /\.zip$/i.test(urlWithoutQuery);
};

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

interface CourseModule {
  id: string;
  title: string;
  position: number;
  sections: Section[];
}

function LessonFeedItem({ sectionId, lesson }: { sectionId: string; lesson: Lesson }) {
  const [lessonUrl, setLessonUrl] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  useEffect(() => {
    if (!['ASSIGNMENT', 'QUIZ'].includes(lesson.content_type)) {
      const fetchUrl = async () => {
        setLoadingContent(true);
        try {
          const data = await coursesService.getLessonSignedUrl(sectionId, lesson.id);
          setLessonUrl(data.url);
          setDownloadUrl(data.downloadUrl || data.url);
        } catch (error: any) {
          console.log("Aviso:", error.message);
          setLessonUrl(null);
          setDownloadUrl(null);
        } finally {
          setLoadingContent(false);
        }
      };
      fetchUrl();
    }
  }, [sectionId, lesson.id, lesson.content_type]);

  if (lesson.content_type === 'ASSIGNMENT') {
    return <StudentAssignmentView sectionId={sectionId} lessonId={lesson.id} title={lesson.title} />;
  }
  
  if (lesson.content_type === 'QUIZ') {
    return (
      <StudentQuizView 
        sectionId={sectionId} 
        lessonId={lesson.id} 
        title={lesson.title}
        isFinalExam={lesson.is_final_exam}
        timeLimitMinutes={lesson.quiz_time_limit_minutes}
        passingScore={lesson.passing_score_percentage}
      />
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {lesson.description && (
        <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white/50 p-6 shadow-sm shrink-0">
          <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
            <FileText size={20} className="text-secondary" />
            Descripción
          </h3>
          <div 
            className="prose max-w-none text-primary/80"
            dangerouslySetInnerHTML={{ __html: lesson.description }}
          />
        </div>
      )}

      <div className="w-full min-h-[400px] aspect-video bg-white/80 backdrop-blur-md rounded-2xl overflow-hidden border border-white/50 flex flex-col relative shadow-xl shrink-0">
        {loadingContent ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
            <Loader2 className="w-8 h-8 text-secondary animate-spin mb-4" />
            <p className="text-primary/90 font-semibold font-medium">Cargando contenido...</p>
          </div>
        ) : lessonUrl ? (
          lesson.content_type === 'VIDEO' ? (
            <video 
              controls 
              className="w-full h-full object-contain bg-black outline-none absolute inset-0"
              src={lessonUrl}
              controlsList="nodownload"
            />
          ) : lesson.content_type === 'EXE_LEARNING' ? (
            (isElp(lessonUrl) || isZip(lessonUrl)) ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/30">
                <Package className="w-16 h-16 text-secondary mb-4" />
                <h3 className="text-xl font-bold text-primary mb-2">
                  {isZip(lessonUrl) ? 'Paquete SCORM / Archivo ZIP' : 'Archivo de eXeLearning'}
                </h3>
                <p className="text-primary/90 font-semibold max-w-md mb-6">
                  {isZip(lessonUrl) 
                    ? <>Este es un paquete SCORM o archivo comprimido (.zip). Descárgalo para ver su contenido.</>
                    : <>Este es un archivo de proyecto (.elp). Para ejecutar o visualizar este archivo, debes tener <strong>eXeLearning</strong> instalado en tu computadora.</>}
                </p>
                <a 
                  href={downloadUrl || lessonUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-6 py-3 bg-secondary hover:bg-[#b08d3c] text-white rounded-xl font-medium transition-colors shadow-lg flex items-center gap-2 border border-secondary/50 cursor-pointer"
                >
                  <Download size={20} /> Descargar Archivo
                </a>
              </div>
            ) : (
              <>
                <iframe 
                  src={lessonUrl} 
                  className="w-full h-full border-none bg-white absolute inset-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
                  title={lesson.title}
                />
              </>
            )
          ) : lesson.content_type === 'DOCUMENT' ? (
            <>
              {isImage(lessonUrl) ? (
                <img 
                  src={lessonUrl} 
                  alt={lesson.title}
                  className="w-full h-full object-contain bg-white/10 absolute inset-0"
                />
              ) : isPdf(lessonUrl) ? (
                <object 
                  data={lessonUrl} 
                  type="application/pdf"
                  className="w-full h-full border-none bg-white absolute inset-0"
                >
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white/50">
                    <FileText className="w-16 h-16 text-primary/90 font-semibold mb-4" />
                    <p className="text-primary/90 font-semibold mb-4">Tu navegador no soporta la visualización de PDFs incrustados.</p>
                    <a 
                      href={downloadUrl || lessonUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-6 py-2 bg-secondary hover:bg-[#b08d3c] text-white rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Descargar PDF
                    </a>
                  </div>
                </object>
              ) : (
                <iframe 
                  src={lessonUrl} 
                  className="w-full h-full border-none bg-white absolute inset-0"
                  title={lesson.title}
                />
              )}
              <div className="absolute top-4 right-4 z-20">
                <a 
                  href={downloadUrl || lessonUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-4 py-2 bg-white/80 hover:bg-white backdrop-blur-md text-primary text-sm rounded-lg font-bold transition-colors shadow-lg flex items-center gap-2 border border-white/50 cursor-pointer"
                >
                  <ExternalLink size={16} /> Abrir en nueva pestaña
                </a>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/30">
              <FileText className="w-16 h-16 text-primary/90 font-semibold mb-4" />
              <h3 className="text-xl font-bold text-primary mb-2">Contenido disponible</h3>
              <a 
                href={lessonUrl} 
                target="_blank" 
                rel="noreferrer"
                className="px-6 py-2.5 bg-secondary hover:bg-[#b08d3c] text-white rounded-xl font-medium transition-colors cursor-pointer"
              >
                Abrir contenido en nueva pestaña
              </a>
            </div>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white/30">
            <AlertCircle className="w-16 h-16 text-primary/90 font-semibold mb-4" />
            <h3 className="text-xl font-bold text-primary mb-2">Contenido no disponible</h3>
            <p className="text-primary/90 font-semibold">Hubo un problema al cargar este contenido.</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default function CourseLMSViewer({ courseId }: { courseId: string }) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  
  const [courseTitle, setCourseTitle] = useState('');
  const [modules, setModules] = useState<CourseModule[]>([]);
  
  // Navigation State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  
  // Sidebar expanded state
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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
        
        // Use modules if available, else wrap sections in a default module
        let rawModules: any[] = data.modules || [];
        if (!data.modules && data.sections) {
           rawModules = [{ id: 'default-mod', title: 'Módulo Principal', position: 0, sections: data.sections }];
        }

        const formattedModules = rawModules
          .map((m: any) => ({
            ...m,
            sections: (m.sections || [])
              .map((s: any) => ({
                ...s,
                lessons: (s.lessons || []).filter((l: any) => l.is_published).sort((a: any, b: any) => a.position - b.position)
              }))
              .filter((s: any) => s.lessons.length > 0)
              .sort((a: any, b: any) => a.position - b.position)
          }))
          .filter((m: any) => m.sections.length > 0)
          .sort((a: any, b: any) => a.position - b.position);

        setModules(formattedModules);
        
        if (formattedModules.length > 0) {
          const firstMod = formattedModules[0];
          setExpandedModules({ [firstMod.id]: true });
          if (firstMod.sections.length > 0) {
            const firstSec = firstMod.sections[0];
            setExpandedSections({ [firstSec.id]: true });
            setActiveModuleId(firstMod.id);
            setActiveSectionId(firstSec.id);
          }
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

  const toggleModule = (modId: string) => setExpandedModules(prev => ({ ...prev, [modId]: !prev[modId] }));
  const toggleSection = (secId: string) => setExpandedSections(prev => ({ ...prev, [secId]: !prev[secId] }));

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

  const handleLessonClick = (modId: string, secId: string, lessonId: string) => {
    setActiveModuleId(modId);
    setActiveSectionId(secId);
    setExpandedModules(prev => ({ ...prev, [modId]: true }));
    setExpandedSections(prev => ({ ...prev, [secId]: true }));

    // Small delay to allow the section to render before scrolling
    setTimeout(() => {
      const el = document.getElementById(`lesson-${lessonId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#fcfbf9]">
        <Loader2 className="w-8 h-8 text-secondary animate-spin mb-4" />
        <p className="text-primary/90 font-semibold">Cargando curso...</p>
      </div>
    );
  }

  if (showAccessModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#fcfbf9]/90 backdrop-blur-md">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-white/50">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-2xl font-bold text-primary mb-2">Acceso Denegado</h3>
            <p className="text-primary/90 font-semibold">
              No has adquirido este curso o tu sesión ha expirado. Serás redirigido a la página del curso para realizar la compra o iniciar sesión.
            </p>
          </div>
          <div className="bg-white/50 p-6 flex justify-center border-t border-primary/5">
            <a
              href={`/cursos/${courseId}`}
              className="px-6 py-3 rounded-xl font-bold text-white bg-secondary hover:bg-[#b08d3c] transition-colors w-full text-center cursor-pointer"
            >
              Volver al Curso
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Flatten sections to allow "Next / Prev" section navigation easily
  const allSectionsFlat = modules.flatMap(m => m.sections.map(s => ({ ...s, moduleId: m.id, moduleTitle: m.title })));
  const currentSectionIndex = allSectionsFlat.findIndex(s => s.id === activeSectionId);
  const activeSectionData = allSectionsFlat[currentSectionIndex];

  const goPrevSection = () => {
    if (currentSectionIndex > 0) {
      const prev = allSectionsFlat[currentSectionIndex - 1];
      setActiveModuleId(prev.moduleId);
      setActiveSectionId(prev.id);
      setExpandedModules(p => ({ ...p, [prev.moduleId]: true }));
      setExpandedSections(p => ({ ...p, [prev.id]: true }));
    }
  };

  const goNextSection = () => {
    if (currentSectionIndex < allSectionsFlat.length - 1) {
      const nxt = allSectionsFlat[currentSectionIndex + 1];
      setActiveModuleId(nxt.moduleId);
      setActiveSectionId(nxt.id);
      setExpandedModules(p => ({ ...p, [nxt.moduleId]: true }));
      setExpandedSections(p => ({ ...p, [nxt.id]: true }));
    }
  };

  return (
    <div className="flex h-full w-full bg-[#fcfbf9]">
      {/* Sidebar */}
      <div 
        className={`${sidebarOpen ? 'w-80' : 'w-0'} shrink-0 bg-white/60 backdrop-blur-md border-r border-white/40 transition-all duration-300 overflow-hidden flex flex-col h-full`}
      >
        <div className="p-4 border-b border-white/40 flex items-center gap-3">
          <a href={`/cursos/${courseId}`} className="p-2 bg-primary/5 hover:bg-primary/10 text-primary/90 font-semibold rounded-lg transition-colors cursor-pointer">
            <ChevronLeft size={20} />
          </a>
          <h2 className="font-bold text-primary text-sm line-clamp-2 leading-tight">{courseTitle}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {modules.map((mod, mIdx) => (
            <div key={mod.id} className="space-y-1">
              <button 
                onClick={() => toggleModule(mod.id)}
                className="w-full flex items-center justify-between text-left px-2 py-2 text-primary/90 font-semibold hover:text-primary transition-colors cursor-pointer"
              >
                <h3 className="text-xs font-bold uppercase tracking-wider line-clamp-1">
                  Módulo {mIdx + 1}: {mod.title}
                </h3>
                {expandedModules[mod.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              {expandedModules[mod.id] && (
                <div className="pl-2 space-y-3 mt-1">
                  {mod.sections.map((section, sIdx) => {
                    const isSecActive = activeSectionId === section.id;
                    return (
                      <div key={section.id} className="space-y-1">
                        <button 
                          onClick={() => {
                            setActiveModuleId(mod.id);
                            setActiveSectionId(section.id);
                            toggleSection(section.id);
                          }}
                          className={`cursor-pointer w-full flex items-center justify-between text-left px-2 py-1.5 rounded transition-colors ${
                            isSecActive ? 'text-secondary' : 'text-primary/90 font-semibold hover:text-primary/90'
                          }`}
                        >
                          <span className="text-[13px] font-semibold line-clamp-1">
                            Sección {sIdx + 1}: {section.title}
                          </span>
                          {expandedSections[section.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        </button>

                        {expandedSections[section.id] && (
                          <div className="pl-3 space-y-1 mt-1 border-l border-primary/10 ml-1">
                            {section.lessons.map((lesson) => (
                              <button
                                key={lesson.id}
                                onClick={() => handleLessonClick(mod.id, section.id, lesson.id)}
                                className={`cursor-pointer w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-colors ${
                                  isSecActive 
                                    ? 'hover:bg-white/80 text-primary/80 font-medium' 
                                    : 'text-primary/90 font-semibold hover:bg-white/50'
                                }`}
                              >
                                <span className={isSecActive ? 'text-secondary/90' : 'text-primary/90 font-semibold'}>
                                  {getIconForType(lesson.content_type)}
                                </span>
                                <span className="text-sm truncate flex-1">{lesson.title}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-white/50 flex items-center px-4 justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-primary/90 font-semibold hover:text-primary hover:bg-white/50 rounded-lg transition-colors cursor-pointer"
            >
              <Menu size={24} />
            </button>
            {activeSectionData ? (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-primary/90 font-semibold tracking-widest">{activeSectionData.moduleTitle}</span>
                <h1 className="font-bold text-lg text-primary leading-tight">
                  {activeSectionData.title}
                </h1>
              </div>
            ) : (
              <h1 className="font-bold text-lg text-primary">Selecciona una sección</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={goPrevSection}
              disabled={currentSectionIndex <= 0}
              className="p-2 bg-white/80 text-primary/90 font-semibold hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm border border-white/50"
              title="Sección Anterior"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={goNextSection}
              disabled={currentSectionIndex === -1 || currentSectionIndex >= allSectionsFlat.length - 1}
              className="p-2 bg-white/80 text-primary/90 font-semibold hover:bg-white rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-sm border border-white/50"
              title="Siguiente Sección"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </header>

        {/* Content Area - Feed */}
        <main className="flex-1 overflow-y-auto bg-transparent p-4 md:p-8 custom-scrollbar scroll-smooth">
          <div className="max-w-5xl mx-auto flex flex-col gap-12 pb-24">
            {activeSectionData ? (
              activeSectionData.lessons.map((lesson: any, idx: number) => (
                <div key={lesson.id} id={`lesson-${lesson.id}`} className="flex flex-col gap-4 scroll-mt-24">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-white text-secondary flex items-center justify-center font-bold text-sm shrink-0 border border-white/50 shadow-sm">
                      {idx + 1}
                    </div>
                    <h2 className="text-2xl font-bold text-primary">{lesson.title}</h2>
                  </div>
                  <LessonFeedItem sectionId={activeSectionData.id} lesson={lesson} />
                </div>
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center mt-20">
                <BookOpen className="w-20 h-20 text-primary/20 mb-6" />
                <h2 className="text-2xl font-bold text-primary/90 font-semibold">Comienza a aprender</h2>
                <p className="text-primary/90 font-semibold mt-2">Selecciona una sección del temario para comenzar.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
