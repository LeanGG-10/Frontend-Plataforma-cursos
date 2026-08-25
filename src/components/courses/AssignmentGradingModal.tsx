import React, { useState, useEffect } from 'react';
import { X, Loader2, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { coursesService } from '../../services/courses.service';

interface Submission {
  id: string;
  lesson_id: string;
  profile_id: string;
  file_url: string | null;
  download_url: string | null;
  started_at: string;
  submitted_at: string | null;
  grade: number | null;
  feedback: string | null;
  profile: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

interface Props {
  sectionId: string;
  lessonId: string;
  lessonTitle: string;
  onClose: () => void;
}

export default function AssignmentGradingModal({ sectionId, lessonId, lessonTitle, onClose }: Props) {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingGrade, setSubmittingGrade] = useState<string | null>(null);

  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({});

  useEffect(() => {
    fetchSubmissions();
  }, [sectionId, lessonId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const data = await coursesService.getLessonSubmissions(sectionId, lessonId);
      setSubmissions(data);
      
      const initialGrades: Record<string, { grade: string; feedback: string }> = {};
      data.forEach((sub: Submission) => {
        initialGrades[sub.id] = {
          grade: sub.grade !== null ? String(sub.grade) : '',
          feedback: sub.feedback || ''
        };
      });
      setGrades(initialGrades);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las entregas');
    } finally {
      setLoading(false);
    }
  };
  const getFileExtension = (url: string) => {
    try {
      const urlWithoutQuery = url.split('?')[0];
      const parts = urlWithoutQuery.split('.');
      return parts.length > 1 ? parts.pop() : 'file';
    } catch {
      return 'file';
    }
  };

  const handleDownload = async (e: React.MouseEvent, url: string, baseName: string) => {
    e.preventDefault();
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Error downloading');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${baseName}.${getFileExtension(url)}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      void 0; /* error log removed */ // ('Download failed', error);
      window.open(url, '_blank');
    }
  };

  const handleSaveGrade = async (submissionId: string) => {
    const data = grades[submissionId];
    if (!data.grade) return;
    
    try {
      setSubmittingGrade(submissionId);
      await coursesService.gradeSubmission(
        sectionId,
        lessonId,
        submissionId,
        parseFloat(data.grade),
        data.feedback
      );
      await fetchSubmissions(); // Refresh to get the updated status
    } catch (err: any) {
      alert(err.message || 'Error al guardar calificación');
    } finally {
      setSubmittingGrade(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 rounded-t-2xl">
          <div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Entregas de Alumnos</h3>
            <p className="text-sm text-slate-500 mt-1">{lessonTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-700 rounded-full shadow-sm cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
              <p className="text-slate-500">Cargando entregas...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <p className="text-slate-500 font-medium">No hay entregas registradas para esta tarea todavía.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3">Alumno</th>
                    <th className="px-4 py-3">Estado</th>
                    <th className="px-4 py-3 text-center">Archivo</th>
                    <th className="px-4 py-3 w-32">Nota</th>
                    <th className="px-4 py-3 w-64">Feedback</th>
                    <th className="px-4 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900 dark:text-white">{sub.profile.full_name || 'Sin Nombre'}</p>
                        <p className="text-xs text-slate-500">{sub.profile.email}</p>
                      </td>
                      <td className="px-4 py-4">
                        {sub.submitted_at ? (
                          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10 px-2 py-1 rounded-md w-fit">
                            <CheckCircle size={14} />
                            <span className="text-xs font-medium">Entregado</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-400/10 px-2 py-1 rounded-md w-fit">
                            <AlertCircle size={14} />
                            <span className="text-xs font-medium">Pendiente</span>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          Inicio: {new Date(sub.started_at).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {sub.download_url ? (
                          <button
                            onClick={(e) => handleDownload(e, sub.download_url!, `${sub.profile.full_name || 'Estudiante'}_${lessonTitle}`.replace(/[^a-zA-Z0-9_ -]/g, ''))}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                          >
                            <Download size={14} />
                            Descargar
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Sin archivo</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={grades[sub.id]?.grade || ''}
                          onChange={(e) => setGrades({ ...grades, [sub.id]: { ...grades[sub.id], grade: e.target.value } })}
                          className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none disabled:opacity-50"
                          disabled={submittingGrade === sub.id}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <textarea
                          rows={2}
                          value={grades[sub.id]?.feedback || ''}
                          onChange={(e) => setGrades({ ...grades, [sub.id]: { ...grades[sub.id], feedback: e.target.value } })}
                          placeholder="Comentarios..."
                          className="w-full px-2 py-1.5 rounded text-sm border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none disabled:opacity-50"
                          disabled={submittingGrade === sub.id}
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => handleSaveGrade(sub.id)}
                          disabled={!grades[sub.id]?.grade || submittingGrade === sub.id}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2 justify-center w-full cursor-pointer"
                        >
                          {submittingGrade === sub.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            'Guardar'
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
