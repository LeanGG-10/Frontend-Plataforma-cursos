import React, { useState, useEffect } from 'react';
import { coursesService } from '../../services/courses.service';
import { authService } from '../../services/auth.service';
import { Loader2, Check, X, AlertTriangle, AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface AdminActionBarProps {
  courseId: string;
  currentStatus: string;
}

export default function AdminActionBar({ courseId, currentStatus }: AdminActionBarProps) {
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
      const token = localStorage.getItem('accessToken') || '';
      await coursesService.approveCourse(courseId, token);
      setStatus('PUBLISHED');
      setMessageModal({
        visible: true,
        type: 'success',
        title: '¡Curso Aprobado!',
        message: '¡Curso aprobado y publicado con éxito!',
        onClose: () => window.location.reload()
      });
    } catch (err: any) {
      setMessageModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al aprobar el curso'
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
      const token = localStorage.getItem('accessToken') || '';
      await coursesService.rejectCourse(courseId, reason, token);
      setStatus('REJECTED');
      setShowRejectModal(false);
      setMessageModal({
        visible: true,
        type: 'success',
        title: 'Curso Rechazado',
        message: 'Curso rechazado con éxito',
        onClose: () => window.location.reload()
      });
    } catch (err: any) {
      setMessageModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: err.message || 'Error al rechazar el curso'
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
            <p className="text-sm font-semibold">Este curso está pendiente de aprobación</p>
            <p className="text-xs text-slate-400">Eres administrador. Por favor, revisa el contenido antes de decidir.</p>
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Rechazar Curso</h3>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Especifica el motivo del rechazo para informar al profesor:
                </label>
                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ej. El temario está incompleto o falta contenido en las primeras lecciones..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                />
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !reason.trim()}
                  className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {approvalConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">Aprobar Curso</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">¿Estás seguro de que deseas aprobar y publicar este curso?</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setApprovalConfirmModal(false)}
                className="px-4 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmApprove}
                className="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Sí, aprobar curso
              </button>
            </div>
          </div>
        </div>
      )}

      {messageModal.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                messageModal.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                messageModal.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
              }`}>
                {messageModal.type === 'success' && <CheckCircle2 size={24} />}
                {messageModal.type === 'error' && <X size={24} />}
                {messageModal.type === 'warning' && <AlertCircle size={24} />}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{messageModal.title}</h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm">{messageModal.message}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setMessageModal(prev => ({ ...prev, visible: false }));
                  if (messageModal.onClose) messageModal.onClose();
                }}
                className="px-4 py-2 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
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
