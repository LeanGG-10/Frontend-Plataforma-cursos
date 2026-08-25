import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-primary/60 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer" 
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-secondary/10">
        <div className="flex justify-between items-center p-6 border-b border-secondary/5 bg-tertiary/30 shrink-0">
          <h3 className="text-xl font-display font-bold text-primary">{title}</h3>
          <button 
            onClick={onClose}
            title="Cancelar"
            className="p-2 hover:bg-secondary/10 rounded-full transition-colors text-primary/90 font-semibold hover:text-primary cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-8 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default Modal;
