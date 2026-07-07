import React, { useState, useEffect } from 'react';
import { bookService } from '../../services/book.service';
import { Edit2 } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  summary?: string;
  image: string;
  category: string;
}

export const MyBooksGrid: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const data = await bookService.getMyBooks();
        setBooks(data);
      } catch (err: any) {
        setError(err.message || 'Error al cargar los libros');
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  if (loading) {
    return <div className="py-32 text-center text-primary/60 font-body">Cargando tus libros...</div>;
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
      {books.map((book) => (
        <div 
          key={book.id}
          className="group p-6 rounded-[12px] transition-all duration-500 border border-[#C9A44A]/5 bg-[#F7F2E8] text-[#0F172A] shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] flex flex-col h-full relative overflow-hidden"
        >
          <div className="aspect-[2/3] mb-6 overflow-hidden relative rounded-[8px] bg-white/10">
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
            
            <span className="absolute top-4 left-4 bg-[#C9A44A]/90 backdrop-blur-sm text-[#0F172A] px-3 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider shadow-sm">
              {book.category || 'Libro'}
            </span>
          </div>
          
          <div className="space-y-2 flex-grow">
            <h3 className="text-xl font-display font-semibold transition-colors duration-300 group-hover:text-[#C9A44A] text-[#0F172A]">
              {book.title}
            </h3>
            <p className="text-xs font-body opacity-60 text-[#0F172A] mt-2 line-clamp-2">
              {book.summary}
            </p>
          </div>
          
          <div className="pt-6 flex justify-end items-center border-t border-[#C9A44A]/10 mt-4">
            <button 
              className="p-2 rounded-full bg-secondary/10 text-secondary hover:bg-secondary hover:text-white transition-colors cursor-pointer"
              title="Editar libro (Próximamente)"
            >
              <Edit2 size={16} />
            </button>
          </div>
        </div>
      ))}

      {books.length === 0 && (
        <div className="col-span-full py-20 text-center">
          <p className="text-primary/60 font-body">Aún no has creado ningún libro.</p>
        </div>
      )}
    </div>
  );
};
