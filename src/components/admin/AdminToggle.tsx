import React, { useEffect, useState, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { isEditing, toggleEditing } from '../../store/adminStore';
import { Settings, X } from 'lucide-react';
import { USER_STORAGE_KEY } from '../../services/auth.service';

interface AdminToggleProps {
  label?: string; // ej. "Cursos" o "Libros"
}

const AdminToggle = ({ label = 'Contenido' }: AdminToggleProps) => {
  const editing = useStore(isEditing);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkAdminStatus = useCallback(() => {
    // Evitar lecturas innecesarias si ya sabemos que es admin (opcional)
    const rawData = localStorage.getItem(USER_STORAGE_KEY);
    
    // Validación de Null: Detener ejecución inmediatamente
    if (!rawData || rawData === "null" || rawData === "undefined") {
      if (isAdmin) setIsAdmin(false);
      return;
    }

    try {
      const user = JSON.parse(rawData);
      void 0; /* log removed */ // ("[AdminToggle] Verificando rol en elite_user_data");
      
      // Verificación directa según requerimiento
      const hasAdminRole = user.role === 'ADMIN';

      if (hasAdminRole !== isAdmin) {
        setIsAdmin(hasAdminRole);
      }
    } catch (e) {
      void 0; /* error log removed */ // ('[AdminToggle] Error parsing storage:', e);
      if (isAdmin) setIsAdmin(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    // Ejecución única al montar el componente
    checkAdminStatus();

    // Sincronización por Eventos Personalizados (Broadcast)
    const handleAuthUpdate = () => {
      void 0; /* log removed */ // ("[AdminToggle] Evento 'auth-updated' detectado");
      checkAdminStatus();
    };

    // Sincronización por Storage (para cambios entre pestañas)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === USER_STORAGE_KEY || e.key === null) {
        checkAdminStatus();
      }
    };

    window.addEventListener('auth-updated', handleAuthUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth-updated', handleAuthUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAdminStatus]); // checkAdminStatus está envuelto en useCallback

  if (!isAdmin) return null;

  return (
    <button
      onClick={toggleEditing}
      className={`flex items-center gap-2 px-6 py-3 rounded-[12px] font-bold text-xs uppercase tracking-widest transition-all duration-300 shadow-lg hover:scale-105 active:scale-95 cursor-pointer ${
        editing
          ? 'bg-[#1E293B] text-white border border-white/10'
          : 'bg-[#C9A44A] text-primary hover:bg-[#B6933F]'
      }`}
    >
      {editing ? (
        <>
          <X size={16} />
          <span>Cancelar Gestión</span>
        </>
      ) : (
        <>
          <Settings size={16} />
          <span>Gestionar {label}</span>
        </>
      )}
    </button>
  );
};

export default AdminToggle;
