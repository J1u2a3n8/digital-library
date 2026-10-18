import { render, screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderApp';
import { useToast } from './toastContext';

function ToastButton() {
  const showToast = useToast();
  return (
    <button type="button" onClick={() => showToast('No se pudo guardar', 'error')}>
      Avisar
    </button>
  );
}

describe('Toasts', () => {
  it('muestra el aviso y se cierra', async () => {
    const { user } = renderWithProviders(<ToastButton />);

    await user.click(screen.getByRole('button', { name: 'Avisar' }));
    expect(await screen.findByText('No se pudo guardar')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close|cerrar/i }));
    expect(screen.queryByText('No se pudo guardar')).not.toBeInTheDocument();
  });

  it('falla con un mensaje claro fuera del proveedor', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<ToastButton />)).toThrow('useToast debe usarse dentro de ToastProvider');
  });
});
