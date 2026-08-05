import React, { useState, useEffect, useRef } from 'react';
import { coursesService } from '../../services/courses.service';
import { Loader2, UploadCloud, Clock, CheckCircle2, AlertCircle, FileText, X, ClipboardList } from 'lucide-react';

interface StudentAssignmentViewProps {
  sectionId: string;
  lessonId: string;
  title: string;
}

export default function StudentAssignmentView({ sectionId, lessonId, title }: StudentAssignmentViewProps) {
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<any>(null);
  const [lessonData, setLessonData] = useState<any>(null);
  const [status, setStatus] = useState<'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'GRADED' | 'EXPIRED'>('NOT_STARTED');
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await coursesService.getAssignmentStatus(sectionId, lessonId);
      setLessonData(data.lesson);
      
      if (data.status === 'NOT_STARTED') {
        setStatus('NOT_STARTED');
      } else {
        setSubmission(data);
        if (data.grade !== null) {
          setStatus('GRADED');
        } else {
          // Check expiration
          const durationHours = data.lesson?.assignment_duration_hours || 24;
          const startedAt = new Date(data.started_at);
          const now = new Date();
          const elapsed = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
          
          if (elapsed > durationHours) {
            setStatus('EXPIRED');
          } else if (data.file_url) {
            setStatus('SUBMITTED');
            // Still in progress, can replace
            calculateTimeRemaining(data.started_at, durationHours);
          } else {
            setStatus('IN_PROGRESS');
            calculateTimeRemaining(data.started_at, durationHours);
          }
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [lessonId]);

  const calculateTimeRemaining = (startedAtStr: string, durationHours: number) => {
    const startedAt = new Date(startedAtStr).getTime();
    const expiresAt = startedAt + durationHours * 60 * 60 * 1000;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const remaining = expiresAt - now;
      if (remaining <= 0) {
        setTimeRemaining(0);
        setStatus('EXPIRED');
      } else {
        setTimeRemaining(remaining);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      await coursesService.startAssignment(sectionId, lessonId);
      await fetchStatus();
    } catch (error: any) {
      alert(error.message || 'Error al iniciar la tarea');
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await coursesService.submitAssignment(sectionId, lessonId, file);
      setFile(null);
      await fetchStatus();
      alert('¡Tarea entregada con éxito!');
    } catch (error: any) {
      alert(error.message || 'Error al enviar la tarea');
    } finally {
      setUploading(false);
    }
  };

  if (loading && !submission && status === 'NOT_STARTED') {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400">Cargando actividad...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 md:p-8 shadow-xl max-w-4xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
          <ClipboardList size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-slate-400 text-sm">Actividad Práctica</p>
        </div>
      </div>

      {lessonData?.description && (
        <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700/50 mb-8 prose prose-invert max-w-none">
          <h3 className="text-lg font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <FileText size={18} /> Instrucciones
          </h3>
          <div dangerouslySetInnerHTML={{ __html: lessonData.description }} />
          
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-700/50">
            {lessonData.assignment_duration_hours && (
              <div className="bg-slate-800 px-3 py-1.5 rounded-lg text-sm text-slate-300 flex items-center gap-2">
                <Clock size={14} className="text-indigo-400" />
                Tiempo límite: <strong>{lessonData.assignment_duration_hours} horas</strong>
              </div>
            )}
            {lessonData.max_score && (
              <div className="bg-slate-800 px-3 py-1.5 rounded-lg text-sm text-slate-300 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                Nota máxima: <strong>{lessonData.max_score}</strong>
              </div>
            )}
          </div>
        </div>
      )}

      {status === 'NOT_STARTED' && (
        <div className="text-center p-8 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
          <h3 className="text-xl font-bold text-white mb-2">¿Listo para comenzar?</h3>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            Una vez que inicies, el temporizador comenzará y tendrás {lessonData?.assignment_duration_hours || 24} horas para subir tu respuesta.
          </p>
          <button
            onClick={handleStart}
            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
          >
            Iniciar Actividad
          </button>
        </div>
      )}

      {(status === 'IN_PROGRESS' || status === 'SUBMITTED') && timeRemaining !== null && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-xl border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-pulse">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-400 uppercase tracking-widest">Tiempo Restante</p>
                <p className="text-2xl font-mono font-bold text-white">{formatTime(timeRemaining)}</p>
              </div>
            </div>
            {status === 'SUBMITTED' && (
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <span className="text-emerald-400 font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 size={16} /> Entregado - Pendiente de calificación
                </span>
              </div>
            )}
          </div>

          <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 border-dashed text-center">
            {file ? (
              <div className="flex items-center justify-between p-4 bg-slate-800 rounded-xl border border-slate-700">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileText className="text-indigo-400 shrink-0" size={24} />
                  <span className="text-slate-300 font-medium truncate">{file.name}</span>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer py-8 flex flex-col items-center justify-center hover:bg-slate-800/50 transition-colors rounded-lg"
              >
                <UploadCloud className="w-12 h-12 text-indigo-400 mb-3" />
                <p className="text-white font-medium mb-1">Haz clic para seleccionar tu archivo</p>
                <p className="text-slate-500 text-sm">
                  {lessonData?.allowed_file_types || 'PDF, ZIP, DOCX'}
                </p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
              accept={lessonData?.allowed_file_types ? lessonData.allowed_file_types.split(',').map((t:string) => `.${t.trim()}`).join(',') : undefined}
            />
            
            <div className="mt-6 flex justify-end gap-3">
              {submission?.download_url && !file && (
                <a
                  href={submission.download_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
                >
                  Ver entrega actual
                </a>
              )}
              <button
                onClick={handleSubmit}
                disabled={!file || uploading}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                {submission?.file_url ? 'Reemplazar Tarea' : 'Enviar Tarea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'EXPIRED' && (
        <div className="p-6 bg-red-500/10 rounded-xl border border-red-500/30 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-red-400 mb-2">Tiempo agotado</h3>
          <p className="text-slate-300 mb-4">
            El tiempo límite para entregar esta actividad ha finalizado.
          </p>
          {submission?.download_url && (
            <a
              href={submission.download_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors"
            >
              <FileText size={18} /> Ver entrega realizada
            </a>
          )}
        </div>
      )}

      {status === 'GRADED' && (
        <div className="space-y-6">
          <div className="p-6 bg-emerald-500/10 rounded-xl border border-emerald-500/30 flex flex-col md:flex-row items-center gap-6">
            <div className="w-24 h-24 shrink-0 rounded-full bg-emerald-500/20 border-4 border-emerald-500/30 flex items-center justify-center flex-col">
              <span className="text-3xl font-black text-emerald-400">{submission?.grade}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-500/80 tracking-widest">/ {lessonData?.max_score}</span>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-bold text-emerald-400 mb-2">¡Actividad Calificada!</h3>
              <p className="text-slate-300">
                Tu tarea ha sido evaluada por el instructor.
              </p>
            </div>
            {submission?.download_url && (
              <a
                href={submission.download_url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                <FileText size={18} /> Tu entrega
              </a>
            )}
          </div>

          {submission?.feedback && (
            <div className="p-6 bg-slate-900 rounded-xl border border-slate-700 relative">
              <div className="absolute top-0 left-6 -translate-y-1/2 bg-slate-800 px-3 py-1 rounded-full border border-slate-600 text-xs font-bold text-slate-300 uppercase tracking-widest">
                Retroalimentación
              </div>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap mt-2">
                {submission.feedback}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
