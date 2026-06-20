import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ForgotPasswordForm from './ForgotPasswordForm';
import { authService } from '../../services/auth.service';
import '@testing-library/jest-dom';

vi.mock('../../services/auth.service', () => ({
  authService: {
    recoverPassword: vi.fn(),
  },
}));

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // CA 1 y CA 2 - Comportamiento del Formulario y Mensaje Genérico
  it('debe mostrar mensaje genérico tras un envío exitoso sin revelar existencia del email', async () => {
    const user = userEvent.setup();
    (authService.recoverPassword as any).mockResolvedValueOnce(undefined);

    render(<ForgotPasswordForm />);
    
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const submitBtn = screen.getByRole('button', { name: /enviar instrucciones/i });

    await user.type(emailInput, 'test@elite.com');
    await user.click(submitBtn);

    expect(authService.recoverPassword).toHaveBeenCalledWith('test@elite.com');
    
    // Verifica mensaje genérico
    expect(await screen.findByText(/si tu email está registrado, recibirás un enlace/i)).toBeInTheDocument();
  });

  // Gap 1 - CA 6 (Rate limiting HTTP 429)
  it('debe mostrar mensaje de demasiados intentos ante un error 429 (Rate Limit)', async () => {
    const user = userEvent.setup();
    (authService.recoverPassword as any).mockRejectedValueOnce({ statusCode: 429 });

    render(<ForgotPasswordForm />);
    
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const submitBtn = screen.getByRole('button', { name: /enviar instrucciones/i });

    await user.type(emailInput, 'test@elite.com');
    await user.click(submitBtn);

    // Verifica mensaje específico
    expect(await screen.findByText(/demasiados intentos\. espera unos minutos/i)).toBeInTheDocument();
  });

  // CA 13 - Estado de Carga y Doble Submit
  it('debe mostrar estado de carga, deshabilitar botón e impedir doble submit', async () => {
    const user = userEvent.setup();
    
    // Simular retraso artificial
    let resolvePromise: any;
    const promise = new Promise(resolve => { resolvePromise = resolve; });
    (authService.recoverPassword as any).mockReturnValue(promise);

    render(<ForgotPasswordForm />);
    
    const emailInput = screen.getByLabelText(/correo electrónico/i);
    const submitBtn = screen.getByRole('button', { name: /enviar instrucciones/i });

    await user.type(emailInput, 'test@elite.com');
    await user.click(submitBtn);

    // Estado inactivo y estilo visual Premium Ux
    expect(submitBtn).toBeDisabled();
    expect(submitBtn).toHaveTextContent(/procesando/i);
    expect(submitBtn).toHaveClass('opacity-70', 'cursor-not-allowed');

    // Intentar doble click
    await user.click(submitBtn);
    
    expect(authService.recoverPassword).toHaveBeenCalledTimes(1);

    // Resolver para no dejar promise colgada y asegurar limpieza
    resolvePromise(undefined);
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });
  });
});
