import React, { useState, useEffect } from 'react';
import { bookService } from '../../services/book.service';
import { authService } from '../../services/auth.service';
import { Loader2, Check, X, AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface AdminBookActionBarProps {
  bookId: string;
  currentStatus?: string;
}

export default function AdminBookActionBar({ bookId, currentStatus = 'PENDING_REVIEW' }: AdminBookActionBarProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [approvalConfirmModal, setApprovalConfirmModal] = useState(false);
  const [messageModal, setMessageModal] = useState<{ visible: boolean; type: 'success' | 'error' | 'warning'; title: string; message: string; onClose?: () => void }>({ visible: false, type: 'success', title: '', message: '' });

  useEffect(() => {
    const user = authService.getUser();
    if (user && user.role === 'ADMIN') {
      setIsAdmin(true);
    }
  }, []);

  if (!isAdmin) return null;
  if (status !== 'PENDING_REVIEW' && !messageModal.visible) return null;

  const handleApproveClick = () => {
    setApprovalConfirmModal(true);
  };

  const confirmApprove = async () => {
    setApprovalConfirmModal(false);
    setIsSubmitting(true);
    try {
      await bookService.approveBook(bookId);
      setStatus('PUBLISHED');
      setMessageModal({
        visible: true,
        type: 'success',
        title: '¡Libro Aprobado!',
        message: '¡El libro ha sido aprobado y publicado en el catálogo con éxito!',
        onClose: () => window.location.reload()
      });
    } catch (err: any) {
      setMessageModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al aprobar el libro'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setMessageModal({
        visible: true,
        type: 'warning',
        title: 'Atención',
        message: 'Por favor ingresa un motivo para el rechazo'
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await bookService.rejectBook(bookId, reason.trim());
      setStatus('REJECTED');
      setShowRejectModal(false);
      setMessageModal({
        visible: true,
        type: 'success',
        title: 'Libro Rechazado',
        message: 'El libro ha sido rechazado con éxito',
        onClose: () => window.location.reload()
      });
    } catch (err: any) {
      setMessageModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al rechazar el libro'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {status === 'PENDING_REVIEW' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 text-white p-4 border-t border-slate-700/50 backdrop-blur-md flex flex-col md:flex-row justify-between items-center gap-4 font-sans">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold">Este libro está pendiente de aprobación editorial</p>
              <p className="text-xs text-slate-400">Eres administrador. Por favor, revisa el contenido de la obra antes de decidir.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setShowRejectModal(true)}
              className="flex-1 md:flex-none px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <X size={16} /> Rechazar
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApproveClick}
              className="flex-1 md:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              Aprobar y Publicar
            </button>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <form onSubmit={handleReject}>
              <div className="p-6">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Rechazar Libro</h3>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Especifica el motivo del rechazo para informar al profesor:
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej. El archivo PDF no tiene la calidad requerida o falta información editorial..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Approval */}
      {approvalConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Aprobar y Publicar Libro</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
              ¿Estás seguro de que deseas aprobar este libro? Al hacerlo, estará disponible de forma pública en el catálogo.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setApprovalConfirmModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmApprove}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
              >
                Sí, Aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messageModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-700 p-6 text-center">
            <div className="flex justify-center mb-4">
              {messageModal.type === 'success' && <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-full text-emerald-600 dark:text-emerald-400"><CheckCircle2 size={32} /></div>}
              {messageModal.type === 'error' && <div className="p-3 bg-red-100 dark:bg-red-900/40 rounded-full text-red-600 dark:text-red-400"><AlertCircle size={32} /></div>}
              {messageModal.type === 'warning' && <div className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-full text-amber-600 dark:text-amber-400"><Info size={32} /></div>}
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{messageModal.title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">{messageModal.message}</p>
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  const cb = messageModal.onClose;
                  setMessageModal({ visible: false, type: 'success', title: '', message: '' });
                  if (cb) cb();
                }}
                className="px-6 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
