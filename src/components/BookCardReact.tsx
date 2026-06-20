import React from 'react';
import { Trash2, ChevronRight } from 'lucide-react';

interface BookCardProps {
  id: string;
  title: string;
  author: string;
  price: string;
  category: string;
  image: string;
  isEditing: boolean;
  onDelete: (id: string, title: string) => void;
  onAccess?: () => void;
  variant?: 'light' | 'dark';
}

const BookCardReact: React.FC<BookCardProps> = ({
  id,
  title,
  author,
  price,
  category,
  image,
  isEditing,
  onDelete,
  onAccess,
  variant = 'light'
}) => {
  const bgClass = variant === 'light' ? 'bg-[#F7F2E8]' : 'bg-[#0F172A]';
  const textClass = variant === 'light' ? 'text-[#0F172A]' : 'text-[#F7F2E8]';
  
  return (
    <div 
      onClick={() => onAccess?.()}
      className={`group cursor-pointer p-6 rounded-[12px] transition-all duration-500 border border-[#C9A44A]/5 ${bgClass} shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] hover:scale-105 flex flex-col h-full relative overflow-hidden`}
    >
      
      {/* Delete Button - Only in Edit Mode */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id, title);
        }}
        className={`absolute top-4 right-4 z-20 p-2 bg-red-500/10 backdrop-blur-md text-red-500 rounded-full border border-red-500/20 transition-all duration-300 hover:bg-red-500 hover:text-white cursor-pointer ${
          isEditing ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'
        }`}
      >
        <Trash2 size={18} />
      </button>

      <div className="aspect-[3/4] mb-6 overflow-hidden relative rounded-[8px] bg-white/10">
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        
        {/* Action Button - Fades in on hover (Only if NOT editing) */}
        {!isEditing && (
          <div className="absolute inset-0 bg-[#0F172A]/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center backdrop-blur-[2px]">
            <a 
              href={`/libros/${id}`}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#C9A44A] text-[#0F172A] px-6 py-2.5 rounded-[8px] font-body text-[11px] font-bold tracking-widest uppercase transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 hover:bg-white hover:scale-105 cursor-pointer"
            >
              Ver detalles
            </a>
          </div>
        )}
        
        <span className="absolute top-4 left-4 bg-[#C9A44A]/90 backdrop-blur-sm text-[#0F172A] px-3 py-1 rounded-[6px] text-[10px] font-bold uppercase tracking-wider shadow-sm">
          {typeof category === 'object' && category !== null ? (category as any).name : category}
        </span>
      </div>
      
      <div className="space-y-2 flex-grow">
        <h3 className={`text-xl font-display font-semibold transition-colors duration-300 group-hover:text-[#C9A44A] ${textClass}`}>
          {title}
        </h3>
        <p className={`text-sm font-body italic opacity-60 ${textClass}`}>
          {author}
        </p>
      </div>
      
      <div className="pt-6 flex justify-between items-center border-t border-[#C9A44A]/10 mt-4">
        <span className={`text-lg font-display font-bold ${textClass}`}>
          {price}
        </span>
        <div className="text-[#C9A44A] opacity-40 group-hover:opacity-100 transition-opacity duration-300">
          <ChevronRight size={20} />
        </div>
      </div>
    </div>
  );
};

export default BookCardReact;
