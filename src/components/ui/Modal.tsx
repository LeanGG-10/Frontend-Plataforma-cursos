import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-primary/60 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer" 
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-secondary/10">
        <div className="flex justify-between items-center p-6 border-b border-secondary/5 bg-tertiary/30">
          <h3 className="text-xl font-display font-bold text-primary">{title}</h3>
          <button 
            onClick={onClose}
            title="Cancelar"
            className="p-2 hover:bg-secondary/10 rounded-full transition-colors text-primary/40 hover:text-primary cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
