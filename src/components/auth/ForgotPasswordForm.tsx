import React, { useState } from 'react';
import { authService, type AuthError } from '../../services/auth.service';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'rate-limit' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      setErrorMsg('Correo electrónico no válido');
      return;
    }
    setErrorMsg('');
    setStatus('loading');

    try {
      await authService.recoverPassword(email);
      setStatus('success');
    } catch (err: any) {
      const errorData = err as AuthError;
      if (errorData?.statusCode === 429) {
        setStatus('rate-limit');
      } else {
        setErrorMsg('Ocurrió un error. Intenta más tarde.');
        setStatus('error');
      }
    }
  };

  return (
    <div className="w-full auth-view animate-fade-in">
      <div className="mb-10">
        <h2 className="text-3xl font-display text-primary mb-2">Recuperar Contraseña</h2>
        <p className="text-primary/50 text-sm font-body">Ingresa tu correo y te enviaremos instrucciones.</p>
      </div>

      {(status === 'success' || status === 'rate-limit' || status === 'error') && (
        <div className={`mb-8 p-4 rounded-lg flex items-start gap-3 animate-fade-in ${status === 'success' ? 'bg-secondary/10 border border-secondary/20' : 'bg-red-500/10 border border-red-500/20'}`}>
          {status === 'success' ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A44A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><path d="M22 17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.5C2 7 4 5 6.5 5H18c2.2 0 4 1.8 4 4v8Z"/><path d="m22 10-8.53 4.42a2 2 0 0 1-1.94 0L3 10"/></svg>
              <p className="text-xs text-primary/70 leading-relaxed font-body">
                Si el correo está registrado, recibirás un enlace de recuperación.
              </p>
            </>
          ) : status === 'rate-limit' ? (
             <>
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
               <p className="text-xs text-red-500/90 leading-relaxed font-body">
                 Has alcanzado el límite de intentos. Intenta de nuevo en unos minutos.
               </p>
             </>
          ) : status === 'error' ? (
             <>
               <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
               <p className="text-xs text-red-500/90 leading-relaxed font-body">
                 {errorMsg}
               </p>
             </>
          ) : null}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        <div className="group relative">
          <label htmlFor="forgot-email" className="block text-[10px] font-bold uppercase tracking-widest text-primary/40 group-focus-within:text-secondary transition-colors">Correo Electrónico</label>
          <input 
            type="email" 
            id="forgot-email" 
            name="email"
            placeholder="ejemplo@elite.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errorMsg) setErrorMsg('');
            }}
            className={`w-full bg-transparent border-b py-3 outline-none focus:border-secondary transition-all font-body text-primary placeholder:text-primary/20 ${errorMsg ? 'border-red-500' : 'border-primary/10'}`}
          />
          {errorMsg && <span className="error-msg text-[11px] text-red-500 mt-1 block">{errorMsg}</span>}
        </div>

        <button 
          type="submit" 
          disabled={status === 'loading'}
          className={`w-full py-4 mt-4 inline-block px-8 text-sm tracking-[0.2em] uppercase font-bold transition-all duration-200 rounded-md text-center cursor-pointer hover:-translate-y-px active:translate-y-0 bg-secondary text-primary hover:bg-secondary/90 shadow-xl hover:shadow-2xl ${status === 'loading' ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {status === 'loading' ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Procesando...
            </span>
          ) : (
            'Enviar Instrucciones'
          )}
        </button>
      </form>
    </div>
  );
}
