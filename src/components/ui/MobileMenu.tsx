import React, { useState, useEffect } from 'react';

interface NavLink {
  name: string;
  href: string;
}

interface MobileMenuProps {
  links: NavLink[];
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ links }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Bloquea el scroll del cuerpo de la página cuando el menú está abierto
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    
    // Cleanup preventivo en caso de que el componente se desmonte
    return () => document.body.classList.remove('overflow-hidden');
  }, [isOpen]);

  return (
    <>
      {/* Botón Hamburguesa Minimalista */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden relative z-[60] w-8 h-8 flex flex-col items-center justify-center cursor-pointer text-white hover:text-secondary transition-colors duration-300 ml-2 sm:ml-4 focus:outline-none"
        aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={isOpen}
      >
        <span className={`absolute h-[2px] w-6 bg-current transition-all duration-300 ease-in-out origin-center ${isOpen ? 'rotate-45' : '-translate-y-2'}`} />
        <span className={`absolute h-[2px] w-6 bg-current transition-all duration-300 ease-in-out ${isOpen ? 'opacity-0' : 'opacity-100'}`} />
        <span className={`absolute h-[2px] w-6 bg-current transition-all duration-300 ease-in-out origin-center ${isOpen ? '-rotate-45' : 'translate-y-2'}`} />
      </button>

      {/* Overlay Pantalla Completa (Glassmorphism) */}
      <div 
        className={`fixed inset-0 z-[55] bg-slate-950/95 backdrop-blur-md transition-all duration-500 ease-in-out lg:hidden flex flex-col justify-center items-center ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <nav className={`w-full flex flex-col items-center justify-center transform transition-all duration-500 ease-out delay-100 ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
          <ul className="flex flex-col items-center w-full space-y-6">
            {links.map((link, idx) => (
              <li key={idx} className="w-full text-center">
                <a
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="inline-block w-full py-4 px-8 font-serif text-4xl tracking-wide text-white/90 hover:text-secondary hover:scale-105 active:bg-white/5 transition-all duration-300 cursor-pointer"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
};
