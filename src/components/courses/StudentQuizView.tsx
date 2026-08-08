import React, { useState, useEffect, useRef } from 'react';
import { coursesService, type QuizQuestion } from '../../services/courses.service';
import { Loader2, PlayCircle, CheckCircle2, XCircle, AlertCircle, Clock, Trophy, ChevronRight } from 'lucide-react';

interface StudentQuizViewProps {
  sectionId: string;
  lessonId: string;
  title: string;
  isFinalExam?: boolean;
  timeLimitMinutes?: number;
  passingScore?: number;
}

export default function StudentQuizView({ 
  sectionId, 
  lessonId, 
  title, 
  isFinalExam = false,
  timeLimitMinutes = 0,
  passingScore = 60 
}: StudentQuizViewProps) {
  const [phase, setPhase] = useState<'WELCOME' | 'RESOLUTION' | 'RESULTS'>('WELCOME');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const [resultData, setResultData] = useState<any>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [lessonId]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (phase === 'RESOLUTION' && endTime !== null) {
      timer = setInterval(() => {
        const now = Date.now();
        if (now >= endTime) {
          clearInterval(timer);
          setTimeLeft(0);
          handleAutoSubmit();
        } else {
          setTimeLeft(Math.floor((endTime - now) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [phase, endTime]);

  useEffect(() => {
    if (phase === 'RESOLUTION' && !submitting) {
      localStorage.setItem(`quiz_progress_${lessonId}`, JSON.stringify({
        phase,
        answers,
        endTime
      }));
    }
  }, [phase, answers, endTime, lessonId, submitting]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [qs, atts] = await Promise.all([
        coursesService.getQuizQuestions(sectionId, lessonId),
        coursesService.getQuizAttempts(sectionId, lessonId)
      ]);
      setQuestions(qs);
      setAttempts(atts);

      const savedStr = localStorage.getItem(`quiz_progress_${lessonId}`);
      if (savedStr) {
        try {
          const saved = JSON.parse(savedStr);
          if (saved.phase === 'RESOLUTION') {
            setAnswers(saved.answers || {});
            if (saved.endTime) {
              const now = Date.now();
              if (now >= saved.endTime) {
                setPhase('RESOLUTION');
                setEndTime(saved.endTime);
                setTimeLeft(0);
                submitQuiz(saved.answers || {});
              } else {
                setPhase('RESOLUTION');
                setEndTime(saved.endTime);
                setTimeLeft(Math.floor((saved.endTime - now) / 1000));
              }
            } else {
              setPhase('RESOLUTION');
              setEndTime(null);
              setTimeLeft(null);
            }
          }
        } catch (e) {
          console.error("Error parsing saved quiz session", e);
        }
      }
    } catch (error) {
      console.error('Error fetching quiz data:', error);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = () => {
    setAnswers({});
    setPhase('RESOLUTION');
    if (timeLimitMinutes > 0) {
      const et = Date.now() + timeLimitMinutes * 60 * 1000;
      setEndTime(et);
      setTimeLeft(timeLimitMinutes * 60);
      localStorage.setItem(`quiz_progress_${lessonId}`, JSON.stringify({
        phase: 'RESOLUTION',
        answers: {},
        endTime: et
      }));
    } else {
      setEndTime(null);
      setTimeLeft(null);
      localStorage.setItem(`quiz_progress_${lessonId}`, JSON.stringify({
        phase: 'RESOLUTION',
        answers: {},
        endTime: null
      }));
    }
  };

  const handleAutoSubmit = async () => {
    // Only auto-submit if in resolution phase
    if (phase === 'RESOLUTION') {
      await submitQuiz(answersRef.current);
    }
  };

  const submitQuiz = async (overrideAnswers?: Record<string, string>) => {
    const finalAnswers = overrideAnswers || answers;
    setSubmitting(true);
    try {
      const res = await coursesService.submitQuizAttempt(sectionId, lessonId, finalAnswers);
      setResultData(res);
      setPhase('RESULTS');
      localStorage.removeItem(`quiz_progress_${lessonId}`);
      // Refresh attempts history
      const atts = await coursesService.getQuizAttempts(sectionId, lessonId);
      setAttempts(atts);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Hubo un error al enviar el quiz. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const bestScore = attempts.length > 0 
    ? Math.max(...attempts.map(a => a.score))
    : null;

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-900 rounded-2xl border border-slate-800">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400">Cargando evaluación...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* PHASE A: WELCOME */}
      {phase === 'WELCOME' && (
        <div className="bg-slate-800 rounded-3xl border border-slate-700 p-8 md:p-12 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-indigo-500/10 to-transparent pointer-events-none" />
          
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 ring-1 ring-indigo-500/30">
            {isFinalExam ? <Trophy size={40} /> : <CheckCircle2 size={40} />}
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {isFinalExam ? 'Examen Final' : 'Evaluación de Lección'}
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-xl">
            Estás a punto de comenzar la evaluación: <strong className="text-white">{title}</strong>. 
            Asegúrate de estar en un ambiente tranquilo.
          </p>

          <div className="flex flex-wrap justify-center gap-6 mb-10 w-full max-w-2xl">
            <div className="flex-1 min-w-[140px] bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
              <Clock className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <div className="text-sm font-medium text-slate-400 mb-1">Tiempo Límite</div>
              <div className="text-xl font-bold text-white">
                {timeLimitMinutes > 0 ? `${timeLimitMinutes} min` : 'Sin límite'}
              </div>
            </div>
            
            <div className="flex-1 min-w-[140px] bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-3" />
              <div className="text-sm font-medium text-slate-400 mb-1">Nota Aprobatoria</div>
              <div className="text-xl font-bold text-white">{passingScore}%</div>
            </div>

            {bestScore !== null && (
              <div className="flex-1 min-w-[140px] bg-slate-900/50 rounded-2xl p-6 border border-slate-700">
                <Trophy className="w-8 h-8 text-indigo-500 mx-auto mb-3" />
                <div className="text-sm font-medium text-slate-400 mb-1">Mejor Nota</div>
                <div className="text-xl font-bold text-white">{bestScore.toFixed(0)}%</div>
              </div>
            )}
          </div>

          <button
            onClick={startQuiz}
            className="group relative px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-900/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 overflow-hidden"
          >
            <span className="relative z-10">Comenzar Evaluación</span>
            <PlayCircle size={24} className="relative z-10 group-hover:translate-x-1 transition-transform" />
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>
      )}

      {/* PHASE B: RESOLUTION */}
      {phase === 'RESOLUTION' && (
        <div className="flex flex-col gap-6">
          {/* Header & Timer */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 flex flex-col md:flex-row items-center justify-between gap-4 sticky top-4 z-20 shadow-xl">
            <div>
              <h2 className="text-xl font-bold text-white">{title}</h2>
              <p className="text-slate-400 text-sm">Responde todas las preguntas antes de enviar.</p>
            </div>
            
            {timeLeft !== null && (
              <div className={`flex items-center gap-3 px-6 py-3 rounded-xl border font-bold text-xl tracking-wider transition-colors ${
                timeLeft < 60 
                  ? 'bg-rose-500/20 border-rose-500/50 text-rose-500 animate-pulse' 
                  : 'bg-slate-900 border-slate-700 text-indigo-400'
              }`}>
                <Clock size={24} className={timeLeft < 60 ? 'animate-bounce' : ''} />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>

          {/* Questions List */}
          <div className="space-y-6">
            {questions.map((q, idx) => (
              <div key={q.id} className="bg-slate-800 rounded-2xl border border-slate-700 p-6 md:p-8 shadow-lg">
                <h3 className="text-lg font-bold text-white mb-6 flex gap-4">
                  <span className="shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm">
                    {idx + 1}
                  </span>
                  <span>{q.question_text}</span>
                </h3>
                
                <div className="space-y-3">
                  {q.options.map((opt) => {
                    const isSelected = answers[q.id!] === opt.id;
                    return (
                      <label 
                        key={opt.id} 
                        className={`relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                          isSelected 
                            ? 'bg-indigo-600/20 border-indigo-500 shadow-[0_0_0_1px_rgba(99,102,241,1)]' 
                            : 'bg-slate-900/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-indigo-500' : 'border-slate-500'
                        }`}>
                          {isSelected && <div className="w-3 h-3 rounded-full bg-indigo-500" />}
                        </div>
                        <input
                          type="radio"
                          className="sr-only"
                          name={`question-${q.id}`}
                          value={opt.id}
                          checked={isSelected}
                          onChange={() => setAnswers(prev => ({ ...prev, [q.id!]: opt.id! }))}
                        />
                        <span className={`text-base ${isSelected ? 'text-white font-medium' : 'text-slate-300'}`}>
                          {opt.option_text}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 pb-12">
            <button
              onClick={() => {
                if(Object.keys(answers).length < questions.length) {
                  if(!window.confirm('Faltan preguntas por responder. ¿Seguro que quieres enviar?')) return;
                }
                submitQuiz();
              }}
              disabled={submitting}
              className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl shadow-indigo-900/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={24} />
                  Enviando...
                </>
              ) : (
                <>
                  Enviar Evaluación
                  <ChevronRight size={24} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* PHASE C: RESULTS */}
      {phase === 'RESULTS' && resultData && (
        <div className="flex flex-col gap-8 pb-12">
          {/* Banner */}
          <div className={`rounded-3xl p-8 md:p-12 text-center relative overflow-hidden border ${
            resultData.passed 
              ? 'bg-emerald-900/20 border-emerald-500/30' 
              : 'bg-rose-900/20 border-rose-500/30'
          }`}>
            <div className={`absolute top-0 inset-x-0 h-32 opacity-20 pointer-events-none bg-gradient-to-b ${
              resultData.passed ? 'from-emerald-500 to-transparent' : 'from-rose-500 to-transparent'
            }`} />

            <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center ring-4 ${
              resultData.passed 
                ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30' 
                : 'bg-rose-500/20 text-rose-400 ring-rose-500/30'
            }`}>
              {resultData.passed ? <Trophy size={48} /> : <XCircle size={48} />}
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4">
              {resultData.passed ? '¡Felicidades, Has Aprobado!' : 'Evaluación No Aprobada'}
            </h2>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 mt-8">
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 min-w-[200px]">
                <div className="text-slate-400 font-medium mb-1">Tu Nota</div>
                <div className={`text-4xl font-black ${resultData.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {resultData.score.toFixed(0)}%
                </div>
              </div>
              
              <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700 min-w-[200px]">
                <div className="text-slate-400 font-medium mb-1">Nota Requerida</div>
                <div className="text-4xl font-black text-white">
                  {resultData.passing_score_percentage}%
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
                setPhase('WELCOME');
                setResultData(null);
                setAnswers({});
              }}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-colors border border-slate-600"
            >
              Volver a Intentar
            </button>
          </div>

          {/* Feedback Review */}
          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white px-2">Revisión de Preguntas</h3>
            
            {resultData.questionsResult.map((qRes: any, idx: number) => {
              const questionOptions = questions.find(q => q.id === qRes.questionId)?.options || [];
              
              return (
                <div key={qRes.questionId} className={`bg-slate-800 rounded-2xl p-6 border ${
                  qRes.isCorrect ? 'border-emerald-500/30' : 'border-rose-500/30'
                }`}>
                  <div className="flex gap-4 mb-6">
                    <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      qRes.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {qRes.isCorrect ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                    </div>
                    <div className="text-lg font-medium text-white pt-1">
                      {idx + 1}. {qRes.questionText}
                    </div>
                  </div>

                  <div className="space-y-3 pl-12 mb-6">
                    {questionOptions.map(opt => {
                      let bgClass = "bg-slate-900/50 border-slate-700 opacity-60";
                      let icon = null;
                      
                      if (opt.id === qRes.correctOptionId) {
                        bgClass = "bg-emerald-900/20 border-emerald-500/50 text-emerald-400 ring-1 ring-emerald-500/30";
                        icon = <CheckCircle2 size={18} className="text-emerald-500" />;
                      } else if (opt.id === qRes.selectedOptionId && !qRes.isCorrect) {
                        bgClass = "bg-rose-900/20 border-rose-500/50 text-rose-400 ring-1 ring-rose-500/30";
                        icon = <XCircle size={18} className="text-rose-500" />;
                      }

                      return (
                        <div key={opt.id} className={`flex items-center justify-between p-4 rounded-xl border ${bgClass}`}>
                          <span>{opt.option_text}</span>
                          {icon}
                        </div>
                      );
                    })}
                  </div>

                  {qRes.explanation && (
                    <div className="ml-12 mt-4 p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/20 flex gap-3">
                      <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={20} />
                      <div>
                        <div className="text-indigo-300 font-bold mb-1 text-sm">Retroalimentación</div>
                        <div className="text-slate-300 text-sm">{qRes.explanation}</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
