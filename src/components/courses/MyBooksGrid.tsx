import React, { useState, useEffect } from 'react';
import { bookService, type Book } from '../../services/book.service';
import { categoryService, type Category } from '../../services/category.service';
import { authService } from '../../services/auth.service';
import {
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Upload,
  FileText,
  Image as ImageIcon,
  BookOpen,
  Eye,
  Edit2,
} from 'lucide-react';
import Modal from '../ui/Modal';
import { formatPrice } from '../../utils/format';

export const MyBooksGrid: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal y formulario de subida
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Modal y formulario de edición (solo libros rechazados)
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);

  // Modal de advertencia de título duplicado
  const [duplicateWarning, setDuplicateWarning] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    mode: 'create' | 'edit';
  }>({
    isOpen: false,
    title: '',
    message: '',
    mode: 'create',
  });

  const currentUser = authService.getUser();

  const [formData, setFormData] = useState({
    title: '',
    author: currentUser?.full_name || 'Profesor',
    categoryId: '',
    price: '0',
    description: '',
  });

  const [files, setFiles] = useState<{
    cover: File | null;
    pdf: File | null;
  }>({
    cover: null,
    pdf: null,
  });

  const [editFormData, setEditFormData] = useState({
    title: '',
    author: '',
    categoryId: '',
    price: '0',
    description: '',
  });

  const [editFiles, setEditFiles] = useState<{
    cover: File | null;
    pdf: File | null;
  }>({
    cover: null,
    pdf: null,
  });

  const fetchBooks = async (pageNum: number = 1, append: boolean = false) => {
    try {
      const response = await bookService.getMyBooks(pageNum);
      if (append) {
        setBooks((prev) => [...prev, ...response.data]);
      } else {
        setBooks(response.data);
      }
      setTotalPages(response.totalPages || 1);
      setPage(response.page || 1);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los libros');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const data = await categoryService.getAllCategories();
      setCategories(data);
      if (data.length > 0 && !formData.categoryId) {
        setFormData((prev) => ({ ...prev, categoryId: data[0].id }));
      }
    } catch (err) {
      // Ignorar fallback silencioso
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchBooks(1, false);
    fetchCategories();
  }, []);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'cover' | 'pdf',
  ) => {
    if (e.target.files && e.target.files[0]) {
      setFiles((prev) => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleEditFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'cover' | 'pdf',
  ) => {
    if (e.target.files && e.target.files[0]) {
      setEditFiles((prev) => ({ ...prev, [type]: e.target.files![0] }));
    }
  };

  const handleOpenEditModal = (book: Book) => {
    setSelectedBook(book);
    const matchedCategory = categories.find(
      (c) => c.name.toLowerCase() === (book.category || '').toLowerCase(),
    );
    setEditFormData({
      title: book.title || '',
      author: book.author || '',
      categoryId: matchedCategory ? matchedCategory.id : (categories[0]?.id || ''),
      price: book.price !== undefined ? String(book.price) : '0',
      description: book.summary || '',
    });
    setEditFiles({ cover: null, pdf: null });
    setEditFormError(null);
    setShowEditModal(true);
  };

  const resetEditForm = () => {
    setSelectedBook(null);
    setEditFormData({
      title: '',
      author: '',
      categoryId: categories[0]?.id || '',
      price: '0',
      description: '',
    });
    setEditFiles({ cover: null, pdf: null });
    setEditFormError(null);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      author: currentUser?.full_name || 'Profesor',
      categoryId: categories[0]?.id || '',
      price: '0',
      description: '',
    });
    setFiles({ cover: null, pdf: null });
    setFormError(null);
  };

  const executeCreate = async (override: boolean = false) => {
    setFormError(null);

    if (!formData.title.trim()) {
      setFormError('Por favor ingresa el título del libro.');
      return;
    }

    if (!formData.categoryId) {
      setFormError('Por favor selecciona una categoría.');
      return;
    }

    if (!files.pdf) {
      setFormError('Es obligatorio adjuntar el archivo PDF del libro.');
      return;
    }

    if (!files.cover) {
      setFormError('Es obligatorio subir una imagen de portada para el libro.');
      return;
    }

    try {
      setSubmitting(true);
      const data = new FormData();
      data.append('title', formData.title.trim());
      data.append('author', formData.author.trim());
      data.append('categoryId', formData.categoryId);
      data.append('price', formData.price);
      if (formData.description) {
        data.append('description', formData.description.trim());
      }
      data.append('cover', files.cover);
      data.append('pdf', files.pdf);
      if (override) {
        data.append('overrideDuplicateWarning', 'true');
      }

      await bookService.createBook(data);

      setShowUploadModal(false);
      setDuplicateWarning({ isOpen: false, title: '', message: '', mode: 'create' });
      resetForm();
      setSuccessBanner(
        '¡Tu libro ha sido subido exitosamente y se encuentra En Revisión por el equipo editorial!',
      );

      // Refrescar listado para mostrar el nuevo libro en revisión
      await fetchBooks(1, false);
    } catch (err: any) {
      if (err.isDuplicateWarning) {
        setDuplicateWarning({
          isOpen: true,
          title: formData.title.trim(),
          message:
            err.message ||
            `Ya existe un libro registrado con el título "${formData.title.trim()}".`,
          mode: 'create',
        });
        return;
      }
      setFormError(
        err.message ||
          'Ocurrió un error al subir el libro. Verifica los formatos e inténtalo nuevamente.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeCreate(false);
  };

  const executeEdit = async (override: boolean = false) => {
    if (!selectedBook) return;
    setEditFormError(null);

    if (!editFormData.title.trim()) {
      setEditFormError('Por favor ingresa el título del libro.');
      return;
    }

    if (!editFormData.categoryId) {
      setEditFormError('Por favor selecciona una categoría.');
      return;
    }

    try {
      setEditSubmitting(true);
      const data = new FormData();
      data.append('title', editFormData.title.trim());
      data.append('author', editFormData.author.trim());
      data.append('categoryId', editFormData.categoryId);
      data.append('price', editFormData.price);
      if (editFormData.description) {
        data.append('description', editFormData.description.trim());
      }
      if (editFiles.cover) {
        data.append('cover', editFiles.cover);
      }
      if (editFiles.pdf) {
        data.append('pdf', editFiles.pdf);
      }
      if (override) {
        data.append('overrideDuplicateWarning', 'true');
      }

      await bookService.updateBook(selectedBook.id, data);

      setShowEditModal(false);
      setDuplicateWarning({ isOpen: false, title: '', message: '', mode: 'edit' });
      resetEditForm();
      setSuccessBanner(
        '¡Tu libro ha sido corregido y reenviado a revisión exitosamente!',
      );

      // Refrescar listado para mostrar el libro actualizado en revisión
      await fetchBooks(1, false);
    } catch (err: any) {
      if (err.isDuplicateWarning) {
        setDuplicateWarning({
          isOpen: true,
          title: editFormData.title.trim(),
          message:
            err.message ||
            `Ya existe un libro registrado con el título "${editFormData.title.trim()}".`,
          mode: 'edit',
        });
        return;
      }
      setEditFormError(
        err.message ||
          'Ocurrió un error al actualizar el libro. Verifica los datos e inténtalo nuevamente.',
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeEdit(false);
  };

  const handleConfirmDuplicate = async () => {
    if (duplicateWarning.mode === 'create') {
      await executeCreate(true);
    } else {
      await executeEdit(true);
    }
  };

  if (loading) {
    return <div className="py-32 text-center text-primary/90 font-semibold font-body">Cargando tus libros...</div>;
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
    <>
      {/* Banner de Éxito al subir libro */}
      {successBanner && (
        <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-[14px] text-emerald-800 text-sm font-body flex items-center justify-between shadow-sm animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-500 hover:text-emerald-800 font-bold ml-4 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Grid de Libros del Profesor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
        {/* Tarjeta para Subir Nuevo Libro */}
        <button
          type="button"
          onClick={() => {
            setShowUploadModal(true);
            setSuccessBanner(null);
          }}
          className="group h-full min-h-[300px] border-2 border-dashed border-secondary/30 rounded-[12px] flex flex-col items-center justify-center gap-4 bg-secondary/5 hover:bg-secondary/10 hover:border-secondary transition-all duration-500 cursor-pointer p-8 no-underline"
        >
          <div className="w-16 h-16 rounded-full bg-secondary text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
            <Plus size={32} />
          </div>
          <div className="text-center">
            <span className="block text-lg font-display font-bold text-primary italic">Subir Libro</span>
            <span className="text-xs font-body text-primary/90 font-semibold uppercase tracking-widest mt-1">Nuevo material</span>
          </div>
        </button>

        {/* Tarjetas de Libros del Profesor */}
        {books.map((book) => {
          const status = book.status || 'PENDING_REVIEW';
          const isPending = status === 'PENDING_REVIEW';
          const isPublished = status === 'PUBLISHED';
          const isRejected = status === 'REJECTED';

          return (
            <div
              key={book.id}
              className="group p-6 rounded-[12px] transition-all duration-500 border border-[#C9A44A]/5 bg-[#F7F2E8] text-[#0F172A] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col h-full relative overflow-hidden"
            >
              {/* Portada del Libro con Proporción 3:4 */}
              <div className="aspect-[3/4] mb-6 overflow-hidden relative rounded-[8px] bg-white/10">
                {book.image ? (
                  <img
                    src={book.image}
                    alt={book.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#C9A44A] to-[#8C6D23] text-[#F7F2E8]">
                    <span className="text-4xl opacity-50 mb-2">📚</span>
                  </div>
                )}

                {/* Badge de Estado Editorial (Esquina superior derecha) */}
                <span
                  className={`absolute top-3.5 right-3.5 backdrop-blur-sm text-white px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                    isPublished
                      ? 'bg-green-500/90'
                      : isRejected
                        ? 'bg-rose-500/90'
                        : isPending
                          ? 'bg-amber-500/90'
                          : 'bg-gray-500/90'
                  }`}
                >
                  {isPublished
                    ? 'PUBLISHED'
                    : isRejected
                      ? 'REJECTED'
                      : isPending
                        ? 'PENDING_REVIEW'
                        : (book.status || 'DRAFT')}
                </span>

                {/* Badge de Categoría (Esquina inferior izquierda) */}
                <span className="absolute bottom-3.5 left-3.5 bg-[#C9A44A]/90 backdrop-blur-sm text-[#0F172A] px-2.5 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider shadow-sm max-w-[70%] truncate">
                  {book.category || 'Libro'}
                </span>
              </div>

              {/* Información del Libro */}
              <div className="space-y-2 flex-grow">
                <h3 className="text-xl font-display font-semibold transition-colors duration-300 group-hover:text-[#C9A44A] text-[#0F172A]">
                  {book.title}
                </h3>
                <p className="text-xs font-body opacity-60 text-[#0F172A] mt-2 line-clamp-2">
                  {book.summary || (book.author ? `Por ${book.author}` : '')}
                </p>

                {/* Caja de Retroalimentación Editorial en caso de Rechazo */}
                {isRejected && book.rejectionReason && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-[8px] text-xs font-body text-red-800">
                    <span className="font-bold block mb-1">Motivo del Rechazo:</span>
                    <span className="italic">{book.rejectionReason}</span>
                  </div>
                )}
              </div>

              {/* Pie de Tarjeta */}
              <div className="pt-6 flex justify-between items-center border-t border-[#C9A44A]/10 mt-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0F172A]/70 uppercase tracking-wider">
                  {book.price ? formatPrice(book.price) : 'Gratis'}
                </div>
                <div className="flex items-center gap-2">
                  {isRejected && (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(book)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-900 hover:bg-amber-500 hover:text-white transition-all text-xs font-semibold cursor-pointer border border-amber-500/20 shadow-sm"
                      title="Editar libro rechazado y reenviar a revisión"
                    >
                      <Edit2 size={13} />
                      <span>Editar y Reenviar</span>
                    </button>
                  )}
                  <a
                    href={`/libros/${book.id}`}
                    className="p-2 rounded-full bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-colors cursor-pointer"
                    title="Ver detalles del libro"
                  >
                    <Eye size={16} />
                  </a>
                </div>
              </div>
            </div>
          );
        })}

        {books.length === 0 && (
          <div className="col-span-full py-20 text-center">
            <p className="text-primary/90 font-semibold font-body">Aún no has subido ningún libro.</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {!error && page < totalPages && (
        <div className="mt-12 flex justify-center animate-in fade-in duration-500">
          <button
            onClick={() => fetchBooks(page + 1, true)}
            className="px-8 py-3 bg-secondary text-primary font-bold text-xs uppercase tracking-widest rounded-[12px] hover:bg-white hover:text-primary transition-all cursor-pointer shadow-lg"
          >
            Cargar más
          </button>
        </div>
      )}

      {/* MODAL: SUBIR LIBRO (ROL PROFESOR) */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          if (!submitting) {
            setShowUploadModal(false);
            resetForm();
          }
        }}
        title="Subir Nuevo Libro para Revisión"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-xs font-body leading-relaxed flex items-start gap-2.5">
            <Clock size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <p>
              <strong>Flujo Editorial:</strong> Al enviar tu libro, se guardará en
              estado <strong>En Revisión</strong>. El equipo administrativo lo
              evaluará para su publicación. Una vez enviado, no podrás editarlo ni
              eliminarlo.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Título del Libro *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Ej: Principios de Arquitectura Limpia"
              className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                Autoría *
              </label>
              <input
                type="text"
                required
                value={formData.author}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, author: e.target.value }))
                }
                placeholder="Nombre del autor o profesor"
                className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                Categoría *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Precio (USD) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={formData.price}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, price: e.target.value }))
              }
              placeholder="0.00 (0 para acceso libre)"
              className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Sinopsis / Descripción
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Breve reseña del contenido del libro..."
              className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body resize-none"
            />
          </div>

          {/* Subida de Portada e Imagen */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-secondary" />
                Portada (JPG, PNG, WEBP) *
              </label>
              <input
                type="file"
                required
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileChange(e, 'cover')}
                className="w-full text-xs text-primary file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-secondary/15 file:text-primary hover:file:bg-secondary/25 cursor-pointer border border-secondary/20 p-1.5 rounded-lg"
              />
              {files.cover && (
                <p className="text-[11px] text-emerald-700 mt-1 truncate">
                  ✓ {files.cover.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                <FileText size={14} className="text-secondary" />
                Archivo del Libro (PDF) *
              </label>
              <input
                type="file"
                required
                accept="application/pdf"
                onChange={(e) => handleFileChange(e, 'pdf')}
                className="w-full text-xs text-primary file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-secondary/15 file:text-primary hover:file:bg-secondary/25 cursor-pointer border border-secondary/20 p-1.5 rounded-lg"
              />
              {files.pdf && (
                <p className="text-[11px] text-emerald-700 mt-1 truncate">
                  ✓ {files.pdf.name}
                </p>
              )}
            </div>
          </div>

          {/* Acciones del Modal */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-secondary/15">
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setShowUploadModal(false);
                resetForm();
              }}
              className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-primary/70 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-primary text-white hover:bg-secondary hover:text-primary transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-secondary" />
                  <span>Subiendo Libro...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Enviar a Revisión</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: EDITAR Y REENVIAR LIBRO RECHAZADO (ROL PROFESOR) */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          if (!editSubmitting) {
            setShowEditModal(false);
            resetEditForm();
          }
        }}
        title="Editar y Reenviar Libro"
      >
        <form onSubmit={handleEditSubmit} className="space-y-5">
          {editFormError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{editFormError}</span>
            </div>
          )}

          {/* Motivo de rechazo para referencia del profesor */}
          {selectedBook?.rejectionReason && (
            <div className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl text-red-900 text-xs font-body leading-relaxed flex items-start gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold mb-1">Motivo del rechazo anterior:</p>
                <p className="italic">{selectedBook.rejectionReason}</p>
              </div>
            </div>
          )}

          <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-800 text-xs font-body leading-relaxed flex items-start gap-2.5">
            <Clock size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <p>
              <strong>Reenvío a Revisión:</strong> Al guardar los cambios, tu libro
              volverá automáticamente al estado <strong>En Revisión</strong> para
              que la administración verifique las correcciones aplicadas.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Título del Libro *
            </label>
            <input
              type="text"
              required
              value={editFormData.title}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder="Ej: Principios de Arquitectura Limpia"
              className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                Autoría *
              </label>
              <input
                type="text"
                required
                value={editFormData.author}
                onChange={(e) =>
                  setEditFormData((prev) => ({ ...prev, author: e.target.value }))
                }
                placeholder="Nombre del autor o profesor"
                className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                Categoría *
              </label>
              <select
                required
                value={editFormData.categoryId}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    categoryId: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body bg-white"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Precio (USD) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={editFormData.price}
              onChange={(e) =>
                setEditFormData((prev) => ({ ...prev, price: e.target.value }))
              }
              placeholder="0.00 (0 para acceso libre)"
              className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Sinopsis / Descripción
            </label>
            <textarea
              rows={3}
              value={editFormData.description}
              onChange={(e) =>
                setEditFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Breve reseña del contenido del libro..."
              className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-secondary text-sm font-body resize-none"
            />
          </div>

          {/* Reemplazo Opcional de Archivos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-secondary" />
                Nueva Portada (Opcional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleEditFileChange(e, 'cover')}
                className="w-full text-xs text-primary file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-secondary/15 file:text-primary hover:file:bg-secondary/25 cursor-pointer border border-secondary/20 p-1.5 rounded-lg"
              />
              <p className="text-[11px] text-primary/60 mt-1">
                {editFiles.cover
                  ? `✓ ${editFiles.cover.name}`
                  : 'Dejar vacío para conservar portada actual'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5 flex items-center gap-1.5">
                <FileText size={14} className="text-secondary" />
                Nuevo Archivo PDF (Opcional)
              </label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => handleEditFileChange(e, 'pdf')}
                className="w-full text-xs text-primary file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-secondary/15 file:text-primary hover:file:bg-secondary/25 cursor-pointer border border-secondary/20 p-1.5 rounded-lg"
              />
              <p className="text-[11px] text-primary/60 mt-1">
                {editFiles.pdf
                  ? `✓ ${editFiles.pdf.name}`
                  : 'Dejar vacío para conservar PDF actual'}
              </p>
            </div>
          </div>

          {/* Acciones del Modal */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-secondary/15">
            <button
              type="button"
              disabled={editSubmitting}
              onClick={() => {
                setShowEditModal(false);
                resetEditForm();
              }}
              className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-primary/70 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-secondary text-primary hover:bg-white hover:text-primary transition-all shadow-md flex items-center gap-2 disabled:opacity-50 cursor-pointer font-bold"
            >
              {editSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin text-primary" />
                  <span>Reenviando...</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
                  <span>Guardar y Reenviar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: ADVERTENCIA DE TÍTULO DUPLICADO */}
      <Modal
        isOpen={duplicateWarning.isOpen}
        onClose={() =>
          setDuplicateWarning((prev) => ({ ...prev, isOpen: false }))
        }
        title="Aviso: Título Existente"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle
              size={24}
              className="text-amber-600 shrink-0 mt-0.5"
            />
            <div className="text-xs text-amber-900 space-y-2">
              <p className="font-semibold text-sm">
                Ya existe un libro registrado con el título «{duplicateWarning.title}»
              </p>
              <p>
                En nuestra plataforma pueden coexistir diferentes obras con el
                mismo título (por tratarse de distintas ediciones, autores o
                contenidos independientes con identificadores propios).
              </p>
              <p className="font-semibold">
                ¿Deseas continuar con la publicación de todas formas?
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-secondary/15">
            <button
              type="button"
              onClick={() =>
                setDuplicateWarning((prev) => ({ ...prev, isOpen: false }))
              }
              className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider text-primary/70 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Modificar Título
            </button>
            <button
              type="button"
              disabled={submitting || editSubmitting}
              onClick={handleConfirmDuplicate}
              className="px-6 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-secondary text-primary hover:bg-white hover:text-primary transition-all shadow-md flex items-center gap-2 cursor-pointer font-bold"
            >
              {submitting || editSubmitting ? (
                <Loader2 size={16} className="animate-spin text-primary" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              <span>Sí, continuar y publicar</span>
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};
