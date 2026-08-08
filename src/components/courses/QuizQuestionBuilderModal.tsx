import React, { useState, useEffect } from 'react';
import { Loader2, X, Plus, Trash2, CheckCircle, AlertCircle, Edit2, Save, GripVertical } from 'lucide-react';
import { coursesService } from '../../services/courses.service';
import type { QuizQuestion, QuizOption } from '../../services/courses.service';

interface Props {
  sectionId: string;
  lessonId: string;
  onClose: () => void;
}

export default function QuizQuestionBuilderModal({ sectionId, lessonId, onClose }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [sectionId, lessonId]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const data = await coursesService.getQuizQuestions(sectionId, lessonId);
      setQuestions(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar las preguntas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingQuestion({
      question_text: '',
      explanation: '',
      options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
      ],
    });
  };

  const handleEdit = (q: QuizQuestion) => {
    setEditingQuestion(JSON.parse(JSON.stringify(q)));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar esta pregunta?')) return;
    try {
      await coursesService.deleteQuizQuestion(sectionId, lessonId, id);
      setQuestions(questions.filter(q => q.id !== id));
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleAddOption = () => {
    if (!editingQuestion) return;
    setEditingQuestion({
      ...editingQuestion,
      options: [...editingQuestion.options, { option_text: '', is_correct: false }]
    });
  };

  const handleRemoveOption = (index: number) => {
    if (!editingQuestion) return;
    if (editingQuestion.options.length <= 2) {
      alert('Debe haber al menos 2 opciones');
      return;
    }
    const newOptions = [...editingQuestion.options];
    newOptions.splice(index, 1);
    
    // Si eliminamos la correcta, marcamos la primera como correcta
    if (!newOptions.some(o => o.is_correct) && newOptions.length > 0) {
      newOptions[0].is_correct = true;
    }
    
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  const handleOptionTextChange = (index: number, text: string) => {
    if (!editingQuestion) return;
    const newOptions = [...editingQuestion.options];
    newOptions[index].option_text = text;
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  const handleSetCorrectOption = (index: number) => {
    if (!editingQuestion) return;
    const newOptions = editingQuestion.options.map((opt, i) => ({
      ...opt,
      is_correct: i === index
    }));
    setEditingQuestion({ ...editingQuestion, options: newOptions });
  };

  const handleSaveQuestion = async () => {
    if (!editingQuestion) return;
    
    // Validation
    if (!editingQuestion.question_text.trim()) {
      alert('El texto de la pregunta es obligatorio');
      return;
    }
    
    if (editingQuestion.options.some(o => !o.option_text.trim())) {
      alert('Todas las opciones deben tener texto');
      return;
    }

    const correctCount = editingQuestion.options.filter(o => o.is_correct).length;
    if (correctCount !== 1) {
      alert('Debe haber exactamente una opción correcta');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingQuestion.id) {
        await coursesService.updateQuizQuestion(sectionId, lessonId, editingQuestion.id, editingQuestion);
      } else {
        await coursesService.createQuizQuestion(sectionId, lessonId, editingQuestion);
      }
      await fetchQuestions();
      setEditingQuestion(null);
    } catch (err: any) {
      alert(err.message || 'Error al guardar la pregunta');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl my-8 flex flex-col border border-slate-200 dark:border-slate-700 h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 shrink-0 rounded-t-2xl">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            Gestionar Preguntas del Quiz
          </h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-white dark:bg-slate-700 rounded-full shadow-sm transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 dark:bg-slate-900/20">
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl flex items-start gap-3 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Cargando preguntas...</p>
            </div>
          ) : editingQuestion ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Enunciado de la Pregunta <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={editingQuestion.question_text}
                    onChange={(e) => setEditingQuestion({...editingQuestion, question_text: e.target.value})}
                    placeholder="Escribe la pregunta aquí..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-end mb-3">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Opciones de Respuesta <span className="text-red-500">*</span>
                    </label>
                    <button 
                      onClick={handleAddOption}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      <Plus size={14} /> Añadir Opción
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {editingQuestion.options.map((opt, idx) => (
                      <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors ${opt.is_correct ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                        <div className="flex items-center justify-center shrink-0">
                          <input 
                            type="radio" 
                            name="correct_option" 
                            checked={opt.is_correct}
                            onChange={() => handleSetCorrectOption(idx)}
                            className="w-5 h-5 text-green-600 focus:ring-green-500 border-slate-300"
                            title="Marcar como respuesta correcta"
                          />
                        </div>
                        <input
                          type="text"
                          value={opt.option_text}
                          onChange={(e) => handleOptionTextChange(idx, e.target.value)}
                          placeholder={`Opción ${idx + 1}`}
                          className="flex-1 bg-transparent text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
                        />
                        <button
                          onClick={() => handleRemoveOption(idx)}
                          disabled={editingQuestion.options.length <= 2}
                          className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Eliminar opción"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Pista o Explicación (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={editingQuestion.explanation || ''}
                    onChange={(e) => setEditingQuestion({...editingQuestion, explanation: e.target.value})}
                    placeholder="Mensaje pedagógico que se mostrará tras responder (ej: Recuerda la fórmula X...)"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setEditingQuestion(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveQuestion}
                  disabled={isSubmitting}
                  className="px-6 py-2 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  Guardar Pregunta
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Preguntas ({questions.length})</h4>
                  <p className="text-sm text-slate-500">Agrega las opciones de respuesta múltiple para esta lección.</p>
                </div>
                <button
                  onClick={handleAddNew}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Plus size={18} /> Nueva Pregunta
                </button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                  <div className="w-16 h-16 mx-auto bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-500 mb-4">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Sin preguntas</h3>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">Esta evaluación aún no tiene preguntas. Comienza añadiendo la primera pregunta de opción múltiple.</p>
                  <button
                    onClick={handleAddNew}
                    className="px-6 py-2.5 bg-white dark:bg-slate-700 border-2 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 font-semibold rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                  >
                    Crear primera pregunta
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, i) => (
                    <div key={q.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-start gap-4 group">
                      <div className="mt-1 text-slate-400 cursor-move">
                        <GripVertical size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 dark:text-white text-lg mb-3">
                          <span className="text-indigo-500 mr-2">{i + 1}.</span>
                          {q.question_text}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                          {q.options.map(opt => (
                            <div key={opt.id} className={`p-2.5 rounded-lg text-sm border flex items-start gap-2 ${opt.is_correct ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/50 text-green-800 dark:text-green-300' : 'bg-slate-50 border-slate-200 dark:bg-slate-900/50 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}>
                              <div className="mt-0.5 shrink-0">
                                {opt.is_correct ? <CheckCircle size={14} className="text-green-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 dark:border-slate-600" />}
                              </div>
                              <span className="leading-tight">{opt.option_text}</span>
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-xl text-sm text-blue-800 dark:text-blue-300">
                            <strong>Pista/Explicación:</strong> {q.explanation}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(q)}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          title="Editar pregunta"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => q.id && handleDelete(q.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Eliminar pregunta"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
