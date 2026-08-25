import React, { useState, useEffect } from 'react';
import { authService, type AuthError } from '../../services/auth.service';

export default function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [apiErrorMsg, setApiErrorMsg] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  
  useEffect(() => {
    // Solo en cliente
    if (typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      if (type !== 'recovery' || !accessToken) {
        window.location.href = '/forgot-password';
      } else {
        setToken(accessToken);
      }
    }
  }, []);

  const isValidLength = password.length >= 6 && password.length <= 12;
  const isMatch = password === confirmPassword && password.length > 0;
  const canSubmit = isValidLength && isMatch && token !== null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    
    setStatus('loading');
    setApiErrorMsg('');

    try {
      await authService.resetPassword(token!, password);
      window.location.href = '/login?message=password_updated';
    } catch (err: any) {
      setStatus('error');
      const errorData = err as AuthError;
      const msg = Array.isArray(errorData.message) ? errorData.message[0] : errorData.message;
      
      const lowerMsg = (msg || '').toLowerCase();
      if (lowerMsg.includes('same as') || lowerMsg.includes('igual') || lowerMsg.includes('previous')) {
        setApiErrorMsg('La nueva contraseña no puede ser igual a la actual');
      } else if (lowerMsg.includes('length') || lowerMsg.includes('caracteres') || lowerMsg.includes('policy')) {
        setApiErrorMsg('La contraseña debe tener entre 6 y 12 caracteres');
      } else {
        setApiErrorMsg('Ocurrió un error. Por favor solicita un nuevo enlace');
      }
    }
  };

  // Si no hay token, se muestra un estado de carga temporal mientras redirige
  if (!token) {
    return <div className="animate-pulse flex space-x-4">
      <div className="flex-1 space-y-6 py-1">
        <div className="h-2 bg-primary/20 rounded"></div>
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <div className="h-2 bg-primary/20 rounded col-span-2"></div>
            <div className="h-2 bg-primary/20 rounded col-span-1"></div>
          </div>
          <div className="h-2 bg-primary/20 rounded"></div>
        </div>
      </div>
    </div>;
  }

  return (
    <div className="w-full auth-view animate-fade-in">
      <div className="mb-10">
        <h2 className="text-3xl font-display text-primary mb-2">Crear nueva contraseña</h2>
        <p className="text-primary/90 font-semibold text-sm font-body">Ingresa tu nueva contraseña para acceder a tu cuenta.</p>
      </div>

      {status === 'error' && (
        <div className="mb-8 p-4 rounded-lg flex items-start gap-3 animate-fade-in bg-red-500/10 border border-red-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div className="text-xs text-red-500/90 leading-relaxed font-body">
            {apiErrorMsg}
            {apiErrorMsg.includes('nuevo enlace') && (
              <a href="/forgot-password" className="block mt-1 font-bold underline hover:text-red-500">Solicitar enlace aquí</a>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        <div className="group relative">
          <label htmlFor="reset-password" className="block text-[10px] font-bold uppercase tracking-widest text-primary/90 font-semibold group-focus-within:text-secondary transition-colors">Nueva Contraseña</label>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              id="reset-password" 
              name="password"
              placeholder="Mín. 6 caracteres, máx. 12"
              maxLength={12}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (status === 'error') setStatus('idle');
              }}
              className={`w-full bg-transparent border-b py-3 outline-none focus:border-secondary transition-all font-body text-primary placeholder:text-primary/20 ${password.length > 0 && !isValidLength ? 'border-red-500' : 'border-primary/10'}`}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-primary/30 hover:text-secondary transition-all duration-200 p-2 cursor-pointer hover:-translate-y-[calc(50%+1px)]"
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88 12 12l2.12 2.12M15.12 15.12 17 17M2 12l2-2m6-2 2-2 3 3M19 12l3 3M3 3l18 18"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          {password.length > 0 && !isValidLength && <span className="error-msg text-[11px] text-red-500 mt-1 block">La contraseña debe tener entre 6 y 12 caracteres</span>}
          {password.length === 12 && <span className="pass-limit-msg text-[10px] text-secondary mt-1 block italic animate-pulse">Límite de 12 caracteres alcanzado</span>}
        </div>

        <div className="group relative">
          <label htmlFor="reset-confirm" className="block text-[10px] font-bold uppercase tracking-widest text-primary/90 font-semibold group-focus-within:text-secondary transition-colors">Confirmar Contraseña</label>
          <input 
            type={showPassword ? 'text' : 'password'} 
            id="reset-confirm" 
            placeholder="Repite tu nueva contraseña"
            maxLength={12}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (status === 'error') setStatus('idle');
            }}
            className={`w-full bg-transparent border-b py-3 outline-none focus:border-secondary transition-all font-body text-primary placeholder:text-primary/20 ${confirmPassword.length > 0 && !isMatch ? 'border-red-500' : 'border-primary/10'}`}
          />
          {confirmPassword.length > 0 && !isMatch && <span className="error-msg text-[11px] text-red-500 mt-1 block">Las contraseñas no coinciden</span>}
        </div>

        <button 
          type="submit" 
          disabled={!canSubmit || status === 'loading'}
          className={`w-full py-4 mt-4 inline-block px-8 text-sm tracking-[0.2em] uppercase font-bold transition-all duration-200 rounded-md text-center cursor-pointer bg-secondary text-primary shadow-xl ${(!canSubmit || status === 'loading') ? 'opacity-50 cursor-not-allowed' : 'hover:-translate-y-px active:translate-y-0 hover:bg-secondary/90 hover:shadow-2xl'}`}
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Guardando...
            </span>
          ) : (
            'Actualizar Contraseña'
          )}
        </button>
      </form>
    </div>
  );
}
