import React, { useState, useEffect } from 'react';
import { bookService, type Book } from '../services/book.service';
import BookCardReact from './BookCardReact';
import { Loader2 } from 'lucide-react';
import { formatPrice } from '../utils/format';

const FeaturedBooksList: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatured = async () => {
    try {
      const data = await bookService.getFeaturedBooks();
      setBooks(data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching featured books:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatured();
    
    // Listen for updates from the manager
    const handleUpdate = () => fetchFeatured();
    window.addEventListener('featured-updated', handleUpdate);
    
    return () => window.removeEventListener('featured-updated', handleUpdate);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="animate-spin text-secondary" size={48} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24 text-center">
        <p className="text-red-500/60 font-display text-2xl italic mb-4">{error}</p>
        <button 
          onClick={() => fetchFeatured()}
          className="px-6 py-2 bg-secondary text-primary rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-secondary/90 transition-all cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-primary/40 font-display text-2xl italic">No hay obras destacadas en este momento.</p>
      </div>
    );
  }

  const handleAccess = (id: string) => {
    window.location.href = `/libros/${id}`;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {books.map((book) => (
        <div key={book.id} className="animate-in fade-in slide-in-from-bottom-5 duration-700">
          <BookCardReact 
            {...book} 
            price={formatPrice(book.price)}
            isEditing={false}
            onDelete={() => {}}
            onAccess={() => handleAccess(book.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default FeaturedBooksList;
