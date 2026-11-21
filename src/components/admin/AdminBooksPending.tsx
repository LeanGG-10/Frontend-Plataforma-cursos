import React, { useState, useEffect } from 'react';
import { bookService, type Book } from '../../services/book.service';
import {
  Loader2,
  AlertCircle,
  Calendar,
  User,
  BookOpen,
  Check,
  X,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import Modal from '../ui/Modal';
import { formatPrice } from '../../utils/format';

export default function AdminBooksPending() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estado para el modal de rechazo
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectError, setRejectError] = useState('');
  const [openingBookId, setOpeningBookId] = useState<string | null>(null);

  useEffect(() => {
    fetchPending();
  }, []);

  const handleReadBook = async (bookId: string) => {
    try {
      setOpeningBookId(bookId);
      setError('');
      const url = await bookService.getBookReadUrl(bookId);
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        setError('No se pudo obtener el enlace de lectura para este libro.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al abrir el libro para lectura');
    } finally {
      setOpeningBookId(null);
    }
  };

  const fetchPending = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await bookService.getPendingBooks();
      setBooks(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los libros pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (book: Book) => {
    if (!confirm(`¿Estás seguro de aprobar y publicar el libro "${book.title}"?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await bookService.approveBook(book.id);
      setSuccessMsg(`El libro "${book.title}" ha sido aprobado y publicado en el catálogo.`);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
    } catch (err: any) {
      setError(err.message || 'Error al aprobar el libro');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (book: Book) => {
    setSelectedBook(book);
    setRejectionReason('');
    setRejectError('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;

    if (!rejectionReason.trim()) {
      setRejectError('Debes indicar un motivo claro para el rechazo.');
      return;
    }

    try {
      setActionLoading(true);
      setRejectError('');
      await bookService.rejectBook(selectedBook.id, rejectionReason.trim());
      setSuccessMsg(`El libro "${selectedBook.title}" ha sido rechazado.`);
      setBooks((prev) => prev.filter((b) => b.id !== selectedBook.id));
      setShowRejectModal(false);
      setSelectedBook(null);
      setRejectionReason('');
    } catch (err: any) {
      setRejectError(err.message || 'Error al rechazar el libro');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white/60 rounded-2xl border border-secondary/15 min-h-[300px]">
        <Loader2 className="w-8 h-8 text-secondary animate-spin mb-4" />
        <p className="text-primary/90 font-semibold text-sm font-body">
          Cargando libros pendientes de revisión editorial...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensajes de retroalimentación */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2 text-sm font-body">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg('')}
            className="text-emerald-500 hover:text-emerald-800 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-3 border border-red-200 text-sm font-body">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
          <div className="flex-grow">
            <p className="font-semibold">{error}</p>
          </div>
          <button
            onClick={() => setError('')}
            className="text-red-400 hover:text-red-700 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {books.length === 0 ? (
        <div className="text-center py-12 px-4 bg-white/60 rounded-2xl border border-secondary/15">
          <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen size={28} />
          </div>
          <h3 className="text-lg font-semibold text-primary mb-1 font-display">
            Sin libros pendientes
          </h3>
          <p className="text-primary/70 text-sm max-w-sm mx-auto font-body">
            No hay libros pendientes de revisión editorial en este momento. ¡Todo al día!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => {
            const formattedDate = book.submittedAt
              ? new Date(book.submittedAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Fecha no registrada';

            return (
              <div
                key={book.id}
                className="bg-white/90 rounded-2xl border border-secondary/20 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Portada y Badge de Estado */}
                  <div className="relative h-48 bg-primary/10 overflow-hidden">
                    {book.image ? (
                      <img
                        src={book.image}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary/30">
                        <BookOpen size={48} />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 px-2.5 py-1 text-white text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm bg-amber-500 flex items-center gap-1">
                      <Clock size={11} />
                      En Revisión
                    </span>
                    <span className="absolute top-3 right-3 px-2.5 py-1 bg-black/70 text-white text-[10px] font-bold rounded-md">
                      {book.price ? formatPrice(book.price) : 'Gratis'}
                    </span>
                  </div>

                  {/* Datos del Libro */}
                  <div className="p-5 space-y-3">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-secondary">
                      {book.category || 'Sin Categoría'}
                    </span>
                    <h3 className="text-lg font-bold text-primary font-display line-clamp-2 leading-snug">
                      {book.title}
                    </h3>

                    <div className="space-y-1.5 text-xs text-primary/80 font-body">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-secondary/70 shrink-0" />
                        <span className="truncate">
                          Autor: <strong>{book.author}</strong>
                        </span>
                      </div>

                      {book.creator && (
                        <div className="flex items-center gap-2 text-primary/65">
                          <span className="text-[11px] font-medium truncate">
                            Docente: {book.creator.full_name || book.creator.email}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-primary/60">
                        <Calendar size={14} className="text-secondary/70 shrink-0" />
                        <span>Enviado: {formattedDate}</span>
                      </div>
                    </div>

                    {book.summary && (
                      <p className="text-xs text-primary/60 font-body line-clamp-2 pt-1 border-t border-secondary/10">
                        {book.summary}
                      </p>
                    )}
                  </div>
                </div>

                {/* Acciones de Auditoría Editorial */}
                <div className="p-5 pt-3 border-t border-secondary/10 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={openingBookId === book.id || actionLoading}
                      onClick={() => handleReadBook(book.id)}
                      className="flex-1 py-2 px-3 bg-secondary/15 hover:bg-secondary text-primary hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                      title="Abrir y leer el archivo PDF en una nueva pestaña"
                    >
                      {openingBookId === book.id ? (
                        <Loader2 size={14} className="animate-spin text-secondary" />
                      ) : (
                        <BookOpen size={14} />
                      )}
                      <span>Leer Obra</span>
                    </button>

                    <a
                      href={`/libros/${book.id}`}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-primary text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      title="Ver ficha completa y evaluar"
                    >
                      <Eye size={14} />
                      <span>Ficha</span>
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleApprove(book)}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <Check size={14} />
                      Aprobar
                    </button>

                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => openRejectModal(book)}
                      className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <X size={14} />
                      Rechazar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE RECHAZO CON MOTIVO OBLIGATORIO */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => {
          if (!actionLoading) {
            setShowRejectModal(false);
            setSelectedBook(null);
          }
        }}
        title="Rechazar Libro Editorial"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          {rejectError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{rejectError}</span>
            </div>
          )}

          <p className="text-xs font-body text-primary/80 leading-relaxed">
            Estás a punto de rechazar el libro{' '}
            <strong className="text-primary font-display text-sm">
              "{selectedBook?.title}"
            </strong>
            . Por favor ingresa el motivo del rechazo para que el profesor remitente
            pueda visualizar la retroalimentación en su panel.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
              Motivo del Rechazo *
            </label>
            <textarea
              required
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ej: El archivo PDF adjunto carece de índice o la calidad de la portada no cumple con los estándares..."
              className="w-full px-4 py-2.5 rounded-lg border border-secondary/20 focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm font-body resize-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-secondary/15">
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => {
                setShowRejectModal(false);
                setSelectedBook(null);
              }}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary/70 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Procesando...</span>
                </>
              ) : (
                <>
                  <X size={14} />
                  <span>Confirmar Rechazo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
