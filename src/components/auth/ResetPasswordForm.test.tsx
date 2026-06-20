import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ResetPasswordForm from './ResetPasswordForm';
import { authService } from '../../services/auth.service';
import '@testing-library/jest-dom';

vi.mock('../../services/auth.service', () => ({
  authService: {
    resetPassword: vi.fn(),
  },
}));

describe('ResetPasswordForm', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Setup estricto del window.location.hash sin redirigir de verdad el motor de JS
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, hash: '', href: 'http://localhost/reset-password' }
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation
    });
  });

  // CA 11 - Redirección Automática por Ausencia de Token
  it('debe redirigir a /forgot-password si no hay token o no es type=recovery', () => {
    window.location.hash = ''; // Sin token
    render(<ResetPasswordForm />);
    expect(window.location.href).toBe('/forgot-password');
  });

  // CA 7 - Validación del Token en la URL y Montaje de UI
  it('debe montar el formulario si el token y el tipo son correctos extrayendo el Hash sutilmente', () => {
    window.location.hash = '#access_token=token_de_prueba&type=recovery';
    render(<ResetPasswordForm />);
    expect(screen.getByLabelText(/nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
  });

  // CA 8 - Validación Inline de Políticas de Seguridad
  it('debe validar la longitud de la contraseña en línea', async () => {
    window.location.hash = '#access_token=token_de_prueba&type=recovery';
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    
    const newPassInput = screen.getByLabelText(/nueva contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /actualizar contraseña/i });

    await user.type(newPassInput, '12345'); // Menos de 6 caracteres
    expect(screen.getByText(/la contraseña debe tener entre 6 y 12 caracteres/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    await user.clear(newPassInput);
    await user.type(newPassInput, '123456');
    expect(screen.queryByText(/la contraseña debe tener entre 6 y 12 caracteres/i)).not.toBeInTheDocument();
  });

  // Gap 2 - Test de coincidencia entre newPassword y confirmPassword
  it('debe mostrar error inline y bloquear submit si las contraseñas no coinciden', async () => {
    window.location.hash = '#access_token=token_de_prueba&type=recovery';
    const user = userEvent.setup();
    render(<ResetPasswordForm />);
    
    const newPassInput = screen.getByLabelText(/nueva contraseña/i);
    const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /actualizar contraseña/i });

    await user.type(newPassInput, 'ValidPass123');
    await user.type(confirmInput, 'Different123');

    expect(screen.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
    
    // Verifica clases de botón deshabilitado (Afordancia segura)
    expect(submitBtn).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  // CA 10 - Manejo de Error por Contraseña Idéntica a la Anterior
  it('debe mostrar error visual explícito cuando el backend retorna que es idéntica a la anterior', async () => {
    window.location.hash = '#access_token=token_de_prueba&type=recovery';
    const user = userEvent.setup();
    (authService.resetPassword as any).mockRejectedValueOnce({ message: 'Same as previous password', statusCode: 400 });

    render(<ResetPasswordForm />);
    
    const newPassInput = screen.getByLabelText(/nueva contraseña/i);
    const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /actualizar contraseña/i });

    await user.type(newPassInput, 'Pass1234');
    await user.type(confirmInput, 'Pass1234');
    await user.click(submitBtn);

    expect(await screen.findByText(/la nueva contraseña no puede ser igual a la actual/i)).toBeInTheDocument();
  });

  // Gap 3 - Error genérico/desconocido y link a recovery
  it('debe mostrar error genérico de fallback y link para solicitar enlace ante errores desconocidos', async () => {
    window.location.hash = '#access_token=token_de_prueba&type=recovery';
    const user = userEvent.setup();
    (authService.resetPassword as any).mockRejectedValueOnce({ message: 'Internal Server Error', statusCode: 500 });

    render(<ResetPasswordForm />);
    
    const newPassInput = screen.getByLabelText(/nueva contraseña/i);
    const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /actualizar contraseña/i });

    await user.type(newPassInput, 'Pass1234');
    await user.type(confirmInput, 'Pass1234');
    await user.click(submitBtn);

    expect(await screen.findByText(/ocurrió un error\. por favor solicita un nuevo enlace/i)).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /solicitar enlace aquí/i });
    expect(link).toHaveAttribute('href', '/forgot-password');
  });

  // CA 9 - Cambio Exitoso de Contraseña y Redirección
  it('debe enviar credenciales limpias y redirigir con el querystring correcto al tener éxito', async () => {
    window.location.hash = '#access_token=token_de_prueba&type=recovery';
    const user = userEvent.setup();
    (authService.resetPassword as any).mockResolvedValueOnce(undefined);

    render(<ResetPasswordForm />);
    
    const newPassInput = screen.getByLabelText(/nueva contraseña/i);
    const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
    const submitBtn = screen.getByRole('button', { name: /actualizar contraseña/i });

    await user.type(newPassInput, 'Pass1234');
    await user.type(confirmInput, 'Pass1234');
    await user.click(submitBtn);

    // No imprime la password expuesta, se asume que las herramientas de test no la filtran hacia stdOut
    expect(authService.resetPassword).toHaveBeenCalledWith('token_de_prueba', 'Pass1234');
    
    await waitFor(() => {
      expect(window.location.href).toBe('/login?message=password_updated');
    });
  });
});
