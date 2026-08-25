import React, { useState, useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { isEditing } from '../../store/adminStore';
import { bookService, type Book } from '../../services/book.service';
import Modal from '../ui/Modal';
import { Star, Check, Loader2, X } from 'lucide-react';

const FeaturedBooksManager: React.FC = () => {
  const editing = useStore(isEditing);
  const [showModal, setShowModal] = useState(false);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchAllBooks = async () => {
    setLoading(true);
    try {
      const response = await bookService.getAllBooks();
      setAllBooks(response.data);
    } catch (error) {
      void 0;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showModal) {
      fetchAllBooks();
    }
  }, [showModal]);

  const handleToggle = async (id: string) => {
    setTogglingId(id);
    try {
      await bookService.toggleFeatured(id);
      // Refresh list
      const updatedBooks = allBooks.map(b => 
        b.id === id ? { ...b, isFeatured: !b.isFeatured } : b
      );
      setAllBooks(updatedBooks);
      // Broadcast update for other components
      window.dispatchEvent(new Event('featured-updated'));
    } catch (error) {
      alert('Error al actualizar estado de destacado');
    } finally {
      setTogglingId(null);
    }
  };

  if (!editing) return null;

  return (
    <>
      <button 
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-6 py-3 bg-secondary text-primary rounded-full font-bold text-xs uppercase tracking-widest hover:bg-secondary/90 transition-all shadow-lg shadow-secondary/20 cursor-pointer"
      >
        <Star size={16} fill="currentColor" />
        Gestionar Destacados
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Seleccionar Libros Destacados"
      >
        <div className="space-y-6">
          <p className="text-xs text-primary/90 font-semibold font-body leading-relaxed">
            Selecciona hasta 4 obras para mostrar en la sección principal. Solo aparecerán las que tengan el icono dorado.
          </p>

          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-secondary" size={32} />
              </div>
            ) : (
              allBooks.map(book => (
                <div 
                  key={book.id} 
                  className={`flex items-center justify-between p-4 rounded-[16px] border transition-all ${
                    book.isFeatured ? 'bg-secondary/10 border-secondary' : 'bg-tertiary/20 border-secondary/5'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <img src={book.image} className="w-12 h-16 object-cover rounded-[4px] shadow-sm" alt="" />
                    <div>
                      <h4 className="text-sm font-display font-bold text-primary">{book.title}</h4>
                      <p className="text-[10px] text-primary/90 font-semibold uppercase tracking-widest">{book.author}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => handleToggle(book.id)}
                    disabled={togglingId === book.id}
                    className={`p-2 rounded-full transition-all cursor-pointer ${
                      book.isFeatured 
                        ? 'bg-secondary text-primary shadow-md' 
                        : 'bg-white text-primary/20 hover:text-secondary border border-secondary/10'
                    }`}
                  >
                    {togglingId === book.id ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : book.isFeatured ? (
                      <Check size={20} />
                    ) : (
                      <Star size={20} />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>

          <button 
            onClick={() => setShowModal(false)}
            className="w-full py-4 bg-primary text-white rounded-[12px] font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all cursor-pointer"
          >
            Finalizar Selección
          </button>
        </div>
      </Modal>
    </>
  );
};

export default FeaturedBooksManager;
