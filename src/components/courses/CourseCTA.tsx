import { useEffect, useState, useRef } from 'react';
import { coursesService } from '../../services/courses.service';
import { setupPayPalButton } from '../paypal-button';

interface CourseCTAProps {
  productId: string;
  price: number;
}

export default function CourseCTA({ productId, price }: CourseCTAProps) {
  const [loading, setLoading] = useState(true);
  const [accessData, setAccessData] = useState<{ hasAccess: boolean; isOwner: boolean; role: string } | null>(null);
  const paypalWrapperRef = useRef<HTMLDivElement>(null);

  // Read environment variables via import.meta.env
  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
  const PAYPAL_CLIENT_ID = import.meta.env.PUBLIC_PAYPAL_CLIENT_ID || 'test';

  useEffect(() => {
    const checkAccess = async () => {
      const token = localStorage.getItem('accessToken');
      const sessionId = localStorage.getItem('activeSessionId');
      
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await coursesService.getCourseAccessStatus(productId, token, sessionId || '');
        setAccessData(data);
      } catch (error) {
        console.error('Failed to check access status', error);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [productId]);

  useEffect(() => {
    if (!loading && (!accessData?.hasAccess && !accessData?.isOwner && accessData?.role !== 'ADMIN')) {
      if (paypalWrapperRef.current) {
        setupPayPalButton(paypalWrapperRef.current);

        const handlePaymentSuccess = () => {
          setAccessData(prev => prev ? { ...prev, hasAccess: true } : { hasAccess: true, isOwner: false, role: 'ESTUDIANTE' });
        };
        
        const wrapper = paypalWrapperRef.current;
        wrapper.addEventListener('paymentSuccess', handlePaymentSuccess);
        
        return () => {
          wrapper.removeEventListener('paymentSuccess', handlePaymentSuccess);
        };
      }
    }
  }, [loading, accessData]);

  if (loading) {
    return (
      <div className="bg-white/40 backdrop-blur-md p-8 rounded-[16px] border border-white/60 shadow-sm animate-pulse flex flex-col items-center justify-center min-h-[150px]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="mt-4 text-xs text-primary/60 uppercase tracking-widest font-bold">Verificando acceso...</p>
      </div>
    );
  }

  const hasFullAccess = accessData?.isOwner || accessData?.role === 'ADMIN';

  if (hasFullAccess) {
    return (
      <div className="bg-white/40 backdrop-blur-md p-8 rounded-[16px] border border-white/60 shadow-sm flex flex-col gap-4">
        <h3 className="text-[10px] uppercase tracking-[0.4em] text-secondary font-black text-center mb-2">Panel de Control</h3>
        <a 
          href={`/cursos/crear?id=${productId}`}
          className="w-full bg-primary text-white py-3 px-6 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-all text-center flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          Editar Curso
        </a>
        {accessData?.hasAccess && (
          <a 
            href={`/cursos/${productId}/aprender`}
            className="w-full bg-white text-primary border border-primary/20 py-3 px-6 rounded-full text-sm font-bold uppercase tracking-wider hover:border-secondary hover:text-secondary transition-all text-center"
          >
            Vista Previa
          </a>
        )}
      </div>
    );
  }

  if (accessData?.hasAccess) {
    return (
      <div className="bg-[#E8F7F0]/40 backdrop-blur-md p-8 rounded-[16px] border border-[#2ecc71]/30 shadow-sm flex flex-col gap-4 items-center">
        <div className="w-12 h-12 bg-[#2ecc71]/10 rounded-full flex items-center justify-center text-[#2ecc71] mb-2">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
        </div>
        <h3 className="text-xl font-display font-bold text-primary text-center">¡Ya estás inscrito!</h3>
        <p className="text-sm text-primary/60 text-center mb-4">Tienes acceso total a los contenidos de este curso.</p>
        <a 
          href={`/cursos/${productId}/aprender`}
          className="w-full bg-[#2ecc71] text-white py-3 px-6 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-[#27ae60] transition-all text-center"
        >
          Continuar Aprendiendo
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white/40 backdrop-blur-md p-6 lg:p-8 rounded-[16px] border border-white/60 shadow-sm flex flex-col gap-6">
      <div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-secondary font-black mb-2 text-center lg:text-left">Inversión Única</p>
        <div className="flex items-baseline justify-center lg:justify-start gap-4">
          <span className="text-5xl font-display font-bold text-primary">
            ${price.toFixed(2)}
          </span>
          <span className="text-xs text-primary/40 font-body">USD</span>
        </div>
      </div>

      <hr className="border-secondary/10" />

      <div 
        ref={paypalWrapperRef}
        className="elite-paypal-wrapper w-full"
        data-book-id={productId} 
        data-api-url={API_URL} 
        data-paypal-client-id={PAYPAL_CLIENT_ID}
      >
        <div id="paypal-loading" className="flex justify-center items-center py-8">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>

        <div id="paypal-login-prompt" className="hidden flex-col items-center justify-center gap-4 py-6 text-center">
          <svg className="w-12 h-12 text-secondary opacity-50 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          <p className="text-sm font-bold text-primary">Inicia sesión para inscribirte</p>
          <p className="text-xs text-primary/60 max-w-[250px]">Necesitas una cuenta para guardar tu progreso y acceder al curso.</p>
          <a href="/login" className="mt-2 bg-secondary text-primary px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-colors">
            Ir al Acceso
          </a>
        </div>

        <button id="paypal-read-btn" className="hidden w-full bg-primary text-white py-3.5 px-6 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center justify-center gap-2 group">
          <span>Inscribirse Ahora</span>
        </button>

        <div id="paypal-buttons-container" className="hidden flex-col w-full min-h-[150px]">
          <div id="paypal-button-mount" className="w-full relative z-0"></div>
          <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-primary/40 uppercase tracking-widest">
             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z"/></svg>
             Pago Seguro y Encriptado
          </div>
        </div>

        <div id="paypal-error-banner" className="hidden mt-4 bg-red-50 border border-red-100 rounded-lg p-4 relative overflow-hidden flex flex-col gap-1 items-start">
           <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
           <p id="paypal-error-title" className="text-red-800 text-xs font-bold uppercase tracking-wider mb-1">Error</p>
           <p id="paypal-error-message" className="text-red-600 text-sm font-medium leading-snug">Se produjo un error.</p>
           <button id="paypal-error-close" className="absolute top-3 right-3 text-red-400 hover:text-red-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
           </button>
        </div>

        <div id="paypal-feedback-banner" className="hidden mt-4 bg-[#E8F7F0] border border-[#2ecc71]/20 rounded-lg p-4 relative overflow-hidden flex-col gap-1 items-start">
           <div className="absolute top-0 left-0 w-1 h-full bg-[#2ecc71]"></div>
           <p className="text-[#2ecc71] text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
             ¡Pago Completado!
           </p>
           <p className="text-[#27ae60] text-sm font-medium leading-snug">Tu inscripción ha sido exitosa. Ahora tienes acceso al curso.</p>
        </div>
      </div>
    </div>
  );
}
