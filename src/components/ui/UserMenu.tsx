import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../../services/auth.service';

export const UserMenu: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Verificar estado inicial
    setIsAuthenticated(authService.isAuthenticated());
    if (authService.isAuthenticated()) {
      setUser(authService.getUser());
    }

    // Escuchar cambios de storage (login/logout en otra pestaña)
    const handleStorage = () => {
      setIsAuthenticated(authService.isAuthenticated());
      if (authService.isAuthenticated()) {
        setUser(authService.getUser());
      } else {
        setUser(null);
        setIsOpen(false);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    // Cerrar dropdown si se hace clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setIsOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <a
        href="/login"
        className="inline-flex items-center justify-center font-body transition-all duration-300 ease-in-out cursor-pointer focus:outline-none border border-secondary/50 text-tertiary bg-transparent hover:bg-secondary/10 shadow-[0_0_15px_rgba(201,160,80,0.1)] hover:shadow-[0_0_20px_rgba(201,160,80,0.2)] rounded-sm !px-3 !py-1.5 !text-[11px] sm:!px-4 sm:!py-2 sm:!text-xs lg:!px-6 lg:!text-sm relative z-[60]"
      >
        Ingresar
      </a>
    );
  }

  return (
    <div className="relative z-[60]" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/50 flex items-center justify-center text-tertiary hover:bg-secondary/20 transition-colors focus:outline-none"
        aria-label="Menú de usuario"
      >
        {/* Ícono de avatar genérico */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-[#0F172A] border border-secondary/25 ring-1 ring-black ring-opacity-5 divide-y divide-secondary/20">
          <div className="py-2 px-4">
            <p className="text-sm font-medium text-white truncate">
              {user?.full_name || user?.email || 'Usuario'}
            </p>
          </div>
          <div className="py-2">
            <div className="px-4 py-2">
              <p className="text-[10px] uppercase tracking-widest text-secondary font-semibold">MI CUENTA</p>
            </div>
            <a href="/perfil" className="block px-4 py-2 text-sm text-tertiary/90 hover:bg-white/5 hover:text-white transition-colors">Mi perfil</a>
            <a href="/mi-biblioteca" className="block px-4 py-2 text-sm text-tertiary/90 hover:bg-white/5 hover:text-white transition-colors">Mi biblioteca</a>
            <a href="/wishlist" className="block px-4 py-2 text-sm text-tertiary/90 hover:bg-white/5 hover:text-white transition-colors">Lista de deseos</a>
          </div>
          {user?.role === 'PROFESOR' && (
            <div className="py-2">
              <div className="px-4 py-2">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-semibold">DOCENCIA</p>
              </div>
              <a href="/mis-cursos" className="block px-4 py-2 text-sm text-tertiary/90 hover:bg-white/5 hover:text-white transition-colors">Mis cursos</a>
              <a href="/mis-libros" className="block px-4 py-2 text-sm text-tertiary/90 hover:bg-white/5 hover:text-white transition-colors">Mis libros</a>
            </div>
          )}
          
          {user?.role === 'ADMIN' && (
            <div className="py-2">
              <div className="px-4 py-2">
                <p className="text-[10px] uppercase tracking-widest text-secondary font-semibold">ADMINISTRACIÓN</p>
              </div>
              <a href="/admin/contenido" className="block px-4 py-2 text-sm text-tertiary/90 hover:bg-white/5 hover:text-white transition-colors">Contenido</a>
              <a href="/admin/usuarios" className="block px-4 py-2 text-sm text-tertiary/90 hover:bg-white/5 hover:text-white transition-colors">Usuarios</a>
            </div>
          )}

          <div className="py-2">
            <button
              onClick={handleLogout}
              className="w-full text-left block px-4 py-2 text-sm text-tertiary/90 hover:bg-red-500/10 hover:text-red-500 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
