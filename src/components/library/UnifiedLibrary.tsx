import React, { useState, useEffect } from 'react';
import {
  libraryService,
  type UnifiedLibraryData,
  type LibraryCourse,
  type LibraryBook,
} from '../../services/library.service';
import {
  BookOpen,
  GraduationCap,
  PlayCircle,
  Eye,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const UnifiedLibrary: React.FC = () => {
  const [data, setData] = useState<UnifiedLibraryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'courses' | 'books'>('all');
  const [readingBookId, setReadingBookId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchLibrary = async () => {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const response = await libraryService.getAllLibrary();
      setData(response);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        window.location.href = '/login';
        return;
      }
      setError(
        err.message ||
          'No se pudo cargar tu biblioteca. Por favor verifica tu conexión e inténtalo nuevamente.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleReadBook = async (bookId: string) => {
    setReadingBookId(bookId);
    setActionError(null);
    try {
      const url = await libraryService.getBookReadUrl(bookId);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setActionError('No se obtuvo una URL válida para la lectura.');
      }
    } catch (err: any) {
      setActionError(
        err.message ||
          'Error al abrir el libro. Verifica que tu sesión esté activa.',
      );
    } finally {
      setReadingBookId(null);
    }
  };

  // Filtrado reactivo en cliente sin recargar la página
  const courses = data?.courses || [];
  const books = data?.books || [];
  const totalCourses = data?.totalCourses || 0;
  const totalBooks = data?.totalBooks || 0;
  const totalItems = totalCourses + totalBooks;

  const showCourses = filter === 'all' || filter === 'courses';
  const showBooks = filter === 'all' || filter === 'books';

  const visibleCoursesCount = showCourses ? courses.length : 0;
  const visibleBooksCount = showBooks ? books.length : 0;
  const currentViewTotal = visibleCoursesCount + visibleBooksCount;

  // Estado de Carga (Skeletons)
  if (loading) {
    return (
      <div className="w-full space-y-10 animate-pulse">
        {/* Skeleton Filters */}
        <div className="flex flex-wrap gap-3 pb-4 border-b border-secondary/10">
          <div className="h-10 w-28 bg-primary/10 rounded-full"></div>
          <div className="h-10 w-28 bg-primary/10 rounded-full"></div>
          <div className="h-10 w-28 bg-primary/10 rounded-full"></div>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-white/60 rounded-[16px] p-5 border border-secondary/10 flex flex-col space-y-4"
            >
              <div className="aspect-video w-full bg-primary/10 rounded-[10px]"></div>
              <div className="h-5 bg-primary/15 rounded w-3/4"></div>
              <div className="h-4 bg-primary/10 rounded w-1/2"></div>
              <div className="h-3 bg-primary/10 rounded w-full"></div>
              <div className="h-10 bg-primary/10 rounded-full w-full mt-auto"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Estado de Error
  if (error) {
    return (
      <div className="py-20 text-center">
        <div className="max-w-md mx-auto p-8 bg-red-50/80 backdrop-blur-sm rounded-[20px] border border-red-200 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-xl font-display font-bold text-red-900 mb-2">
            No se pudo sincronizar tu biblioteca
          </h3>
          <p className="text-red-700/90 text-sm font-body mb-6 leading-relaxed">
            {error}
          </p>
          <button
            onClick={fetchLibrary}
            className="inline-flex items-center gap-2 bg-primary text-white hover:bg-secondary hover:text-primary transition-all duration-300 px-6 py-2.5 rounded-full font-body font-bold text-xs uppercase tracking-wider cursor-pointer shadow-md"
          >
            <RefreshCw size={14} />
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Estado Vacío Global (Sin ninguna compra en user_library)
  if (totalItems === 0) {
    return (
      <div className="py-20 text-center">
        <div className="max-w-lg mx-auto p-10 bg-white/60 backdrop-blur-sm rounded-[24px] border border-secondary/15 shadow-sm text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary/10 border border-secondary/25 flex items-center justify-center text-secondary shadow-inner">
            <BookOpen size={36} />
          </div>
          <h3 className="text-3xl font-display font-bold text-primary mb-3">
            Tu biblioteca está vacía
          </h3>
          <p className="text-primary/75 text-sm sm:text-base font-body mb-8 leading-relaxed max-w-md mx-auto">
            Aún no has adquirido cursos ni libros. Explora nuestro catálogo y
            comienza a aprender con los mejores contenidos hoy mismo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/cursos"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-secondary hover:text-primary transition-all duration-300 px-7 py-3 rounded-full font-body font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-secondary/20"
            >
              <GraduationCap size={16} />
              Explorar Cursos
            </a>
            <a
              href="/libros"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-primary border border-secondary/40 hover:bg-secondary/10 hover:border-secondary transition-all duration-300 px-7 py-3 rounded-full font-body font-bold text-xs uppercase tracking-wider shadow-sm"
            >
              <BookOpen size={16} />
              Explorar Libros
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-10">
      {/* Mensaje de acción en caso de error temporal (p. ej. fallo al abrir URL de lectura) */}
      {actionError && (
        <div className="p-4 rounded-[12px] bg-red-50 border border-red-200 text-red-800 text-xs font-body flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-700 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Barra de Filtros Interactivos (Tabs sin recarga) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-secondary/15">
        <div className="inline-flex p-1.5 bg-white/70 backdrop-blur-sm rounded-full border border-secondary/20 shadow-sm">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-5 py-2 rounded-full font-body text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              filter === 'all'
                ? 'bg-primary text-secondary shadow-md'
                : 'text-primary/70 hover:text-primary hover:bg-white/50'
            }`}
          >
            Todos{' '}
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${
                filter === 'all'
                  ? 'bg-secondary/20 text-secondary'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {totalItems}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('courses')}
            className={`px-5 py-2 rounded-full font-body text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              filter === 'courses'
                ? 'bg-primary text-secondary shadow-md'
                : 'text-primary/70 hover:text-primary hover:bg-white/50'
            }`}
          >
            Cursos{' '}
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${
                filter === 'courses'
                  ? 'bg-secondary/20 text-secondary'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {totalCourses}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('books')}
            className={`px-5 py-2 rounded-full font-body text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              filter === 'books'
                ? 'bg-primary text-secondary shadow-md'
                : 'text-primary/70 hover:text-primary hover:bg-white/50'
            }`}
          >
            Libros{' '}
            <span
              className={`ml-1.5 px-2 py-0.5 rounded-full text-[10px] ${
                filter === 'books'
                  ? 'bg-secondary/20 text-secondary'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {totalBooks}
            </span>
          </button>
        </div>

        <p className="text-xs font-body text-primary/60 font-medium">
          Mostrando <span className="font-bold text-primary">{currentViewTotal}</span> contenidos
        </p>
      </div>

      {/* Estado vacío para filtro específico (ej. si tiene cursos pero no libros) */}
      {currentViewTotal === 0 && (
        <div className="py-16 text-center bg-white/40 rounded-[20px] border border-secondary/10 p-8">
          <p className="text-primary/70 font-body text-sm mb-4">
            No tienes {filter === 'courses' ? 'cursos' : 'libros'} en tu
            biblioteca en este momento.
          </p>
          <a
            href={filter === 'courses' ? '/cursos' : '/libros'}
            className="inline-flex items-center gap-2 bg-secondary text-primary font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full hover:bg-primary hover:text-white transition-all shadow-sm"
          >
            Explorar {filter === 'courses' ? 'Cursos' : 'Libros'}
          </a>
        </div>
      )}

      {/* SECCIÓN 1: CURSOS ADQUIRIDOS */}
      {showCourses && courses.length > 0 && (
        <section className="space-y-6">
          {filter === 'all' && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center text-secondary">
                <GraduationCap size={18} />
              </div>
              <h2 className="text-2xl font-display font-bold text-primary">
                Mis Cursos en Progreso
              </h2>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {courses.map((course: LibraryCourse) => {
              const percentage = Math.min(
                100,
                Math.max(0, course.progress?.percentage || 0),
              );
              const isCompleted = percentage === 100;
              const hasStarted = percentage > 0;

              return (
                <div
                  key={course.id}
                  className="bg-white/80 backdrop-blur-sm rounded-[16px] border border-secondary/15 overflow-hidden shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-10px_rgba(201,160,80,0.2)] transition-all duration-300 flex flex-col group"
                >
                  {/* Portada del curso */}
                  <div className="aspect-video relative overflow-hidden bg-primary/10">
                    {course.coverImage ? (
                      <img
                        src={course.coverImage}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary to-slate-800 text-secondary">
                        <GraduationCap size={44} className="opacity-60 mb-1" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                    {/* Badge de Categoría */}
                    <span className="absolute top-3 left-3 bg-[#C9A44A] text-primary px-2.5 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider shadow-sm">
                      {course.category || 'Curso'}
                    </span>

                    {/* Badge de Nivel */}
                    {course.level && (
                      <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-[6px] text-[10px] font-medium tracking-wider">
                        {course.level}
                      </span>
                    )}
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="p-5 flex flex-col flex-grow space-y-4">
                    <div className="space-y-1.5 flex-grow">
                      <h3
                        className="font-display font-bold text-lg text-primary line-clamp-2 group-hover:text-secondary transition-colors"
                        title={course.title}
                      >
                        {course.title}
                      </h3>
                      {course.instructor && (
                        <p className="text-xs font-body text-primary/70">
                          Instructor: <span className="font-semibold text-primary">{course.instructor}</span>
                        </p>
                      )}
                    </div>

                    {/* Metadatos (duración / lecciones) */}
                    <div className="flex items-center gap-4 text-[11px] text-primary/60 font-body py-1 border-t border-secondary/10">
                      {course.duration ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock size={12} className="text-secondary" />
                          {Math.round(course.duration / 60)}h
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <Layers size={12} className="text-secondary" />
                        {course.progress?.totalLessons || 0} lecciones
                      </span>
                    </div>

                    {/* Barra de Progreso y Porcentaje */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-body">
                        <span className="font-bold text-primary flex items-center gap-1.5">
                          {isCompleted ? (
                            <>
                              <CheckCircle2 size={14} className="text-green-600" />
                              <span className="text-green-700">Completado</span>
                            </>
                          ) : (
                            <span>{percentage}% completado</span>
                          )}
                        </span>
                        <span className="text-primary/60 text-[11px]">
                          {course.progress?.completedLessons || 0}/{course.progress?.totalLessons || 0} lecs.
                        </span>
                      </div>

                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${
                            isCompleted ? 'bg-green-600' : 'bg-[#C9A44A]'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Botón de Acción Directo: /cursos/[id]/aprender */}
                    <a
                      href={`/cursos/${course.id}/aprender`}
                      className={`w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-[10px] font-body font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-sm ${
                        isCompleted
                          ? 'bg-slate-100 text-primary hover:bg-primary hover:text-white border border-secondary/20'
                          : hasStarted
                            ? 'bg-primary text-secondary hover:bg-secondary hover:text-primary shadow-md hover:shadow-secondary/20'
                            : 'bg-primary text-white hover:bg-secondary hover:text-primary shadow-md'
                      }`}
                    >
                      <PlayCircle size={15} />
                      {isCompleted
                        ? 'Repasar Curso'
                        : hasStarted
                          ? 'Continuar Aprendiendo'
                          : 'Comenzar Curso'}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECCIÓN 2: LIBROS ADQUIRIDOS */}
      {showBooks && books.length > 0 && (
        <section className="space-y-6 pt-4">
          {filter === 'all' && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-secondary/15 flex items-center justify-center text-secondary">
                <BookOpen size={18} />
              </div>
              <h2 className="text-2xl font-display font-bold text-primary">
                Mis Libros y Obras
              </h2>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {books.map((book: LibraryBook) => {
              const isReading = readingBookId === book.id;

              return (
                <div
                  key={book.id}
                  className="bg-white/80 backdrop-blur-sm rounded-[16px] border border-secondary/15 overflow-hidden shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-10px_rgba(201,160,80,0.2)] transition-all duration-300 flex flex-col group"
                >
                  {/* Portada del Libro con ratio elegante */}
                  <div className="aspect-[4/3] relative overflow-hidden bg-primary/10">
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary to-slate-900 text-secondary">
                        <BookOpen size={44} className="opacity-60 mb-1" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                    {/* Badge de Categoría */}
                    <span className="absolute top-3 left-3 bg-secondary text-primary px-2.5 py-1 rounded-[6px] text-[10px] font-black uppercase tracking-wider shadow-sm">
                      {book.category || 'Libro'}
                    </span>

                    {/* Badge de Formato */}
                    <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-[6px] text-[10px] font-medium tracking-wider">
                      {book.format || 'PDF'}
                    </span>
                  </div>

                  {/* Cuerpo de la Tarjeta */}
                  <div className="p-5 flex flex-col flex-grow space-y-4">
                    <div className="space-y-1.5 flex-grow">
                      <h3
                        className="font-display font-bold text-lg text-primary line-clamp-2 group-hover:text-secondary transition-colors"
                        title={book.title}
                      >
                        {book.title}
                      </h3>
                      {book.author && (
                        <p className="text-xs font-body text-primary/70">
                          Autoría: <span className="font-semibold text-primary">{book.author}</span>
                        </p>
                      )}
                    </div>

                    {/* Detalles Técnicos */}
                    <div className="flex items-center justify-between text-[11px] text-primary/60 font-body py-2 border-t border-secondary/10">
                      <span>{book.pages ? `${book.pages} páginas` : 'Edición Digital'}</span>
                      <span className="text-green-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Acceso habilitado
                      </span>
                    </div>

                    {/* Botón "Leer Obra" (Visor en nueva pestaña target="_blank" con visualización inline) */}
                    <button
                      type="button"
                      onClick={() => handleReadBook(book.id)}
                      disabled={isReading}
                      className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white hover:bg-secondary hover:text-primary transition-all duration-300 py-3 px-4 rounded-[10px] font-body font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-secondary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isReading ? (
                        <>
                          <RefreshCw size={15} className="animate-spin text-secondary" />
                          <span>Obteniendo lectura...</span>
                        </>
                      ) : (
                        <>
                          <Eye size={15} />
                          <span>Leer Obra</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
