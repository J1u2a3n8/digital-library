import { screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { http, HttpResponse } from 'msw';
import { fakeDb } from '../../test/fakeApi';
import { renderWithProviders } from '../../test/renderApp';
import { server } from '../../test/server';
import { AuthorPicker } from './AuthorPicker';
import { fromExisting, fromNewName, type SelectedAuthor } from './selectedAuthors';

function PickerHarness({
  initial = [] as SelectedAuthor[],
  error,
}: {
  initial?: SelectedAuthor[];
  error?: string;
}) {
  const [value, setValue] = useState<SelectedAuthor[]>(initial);
  return <AuthorPicker value={value} onChange={setValue} error={error} />;
}

function selectedChips() {
  return screen.queryByLabelText('Autores seleccionados');
}

describe('AuthorPicker', () => {
  it('lista autores existentes y los selecciona con checkbox', async () => {
    const { user } = renderWithProviders(<PickerHarness />);

    const checkbox = await screen.findByRole('checkbox', { name: 'Jorge Luis Borges' });
    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(within(selectedChips()!).getByText('Jorge Luis Borges')).toBeInTheDocument();
    expect(screen.getByText('Seleccionados (1)')).toBeInTheDocument();

    await user.click(checkbox);
    expect(screen.getByText('Ningún autor seleccionado.')).toBeInTheDocument();
  });

  it('busca autores ignorando tildes', async () => {
    const { user } = renderWithProviders(<PickerHarness />);
    await screen.findByRole('checkbox', { name: 'Jorge Luis Borges' });

    await user.type(screen.getByLabelText('Buscar autor'), 'cortazar');

    await waitFor(() => expect(screen.getAllByRole('checkbox')).toHaveLength(1));
    expect(screen.getByRole('checkbox', { name: 'Julio Cortázar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear autor “cortazar”' })).toBeInTheDocument();
  });

  it('avisa "Ya existe" y no ofrece crear un duplicado', async () => {
    const { user } = renderWithProviders(<PickerHarness />);
    await screen.findByRole('checkbox', { name: 'Jorge Luis Borges' });

    await user.type(screen.getByLabelText('Buscar autor'), 'JULIO CORTAZAR');

    expect(await screen.findByText('Ya existe: se usará ese autor.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear autor/ })).not.toBeInTheDocument();
  });

  it('crea un autor nuevo con Enter y lo marca como Nuevo', async () => {
    const { user } = renderWithProviders(<PickerHarness />);
    await screen.findByRole('checkbox', { name: 'Jorge Luis Borges' });

    await user.type(screen.getByLabelText('Buscar autor'), '  Silvina   Ocampo ');
    await screen.findByRole('button', { name: 'Crear autor “Silvina Ocampo”' });
    await user.keyboard('{Enter}');

    const chips = selectedChips()!;
    expect(within(chips).getByText('Silvina Ocampo')).toBeInTheDocument();
    expect(within(chips).getByText('Nuevo')).toBeInTheDocument();
    expect(screen.getByLabelText('Buscar autor')).toHaveValue('');
  });

  it('no permite agregar dos veces el mismo autor nuevo', async () => {
    const { user } = renderWithProviders(<PickerHarness initial={[fromNewName('Silvina Ocampo')]} />);
    await screen.findByRole('checkbox', { name: 'Jorge Luis Borges' });

    await user.type(screen.getByLabelText('Buscar autor'), 'silvina ocampo');

    expect(await screen.findByText('Ese autor ya está en la lista de seleccionados.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear autor/ })).not.toBeInTheDocument();
  });

  it('no ofrece crear con menos de 2 caracteres', async () => {
    const { user } = renderWithProviders(<PickerHarness />);
    await screen.findByRole('checkbox', { name: 'Jorge Luis Borges' });

    await user.type(screen.getByLabelText('Buscar autor'), 'x');

    expect(await screen.findByText('No hay autores que coincidan con “x”.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Crear autor/ })).not.toBeInTheDocument();
  });

  it('quita un autor seleccionado desde el chip', async () => {
    const { user } = renderWithProviders(
      <PickerHarness initial={[fromExisting({ id: 2, fullName: 'Julio Cortázar' })]} />,
    );

    await user.click(screen.getByRole('button', { name: 'Quitar Julio Cortázar' }));

    expect(screen.getByText('Ningún autor seleccionado.')).toBeInTheDocument();
  });

  it('muestra el estado vacío cuando no hay autores en el sistema', async () => {
    fakeDb.authors = [];
    renderWithProviders(<PickerHarness />);

    expect(
      await screen.findByText('Todavía no hay autores. Escribí un nombre arriba para crear el primero.'),
    ).toBeInTheDocument();
  });

  it('limita a 20 autores', async () => {
    const twenty = Array.from({ length: 20 }, (_, index) =>
      fromExisting({ id: 100 + index, fullName: `Autor ${index}` }),
    );
    renderWithProviders(<PickerHarness initial={twenty} error="Revisá los autores." />);

    expect(await screen.findByText('Llegaste al máximo de 20 autores.')).toBeInTheDocument();
    expect(screen.getByText('Revisá los autores.')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Jorge Luis Borges' }).closest('[role="button"]'),
      ).toHaveAttribute('aria-disabled', 'true'),
    );
  });

  it('muestra error con reintento si falla la búsqueda', async () => {
    server.use(http.get('*/api/authors', () => HttpResponse.json({}, { status: 500 })));
    const { user } = renderWithProviders(<PickerHarness />);

    expect(await screen.findByText('No pudimos cargar los autores.')).toBeInTheDocument();
    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('checkbox', { name: 'Julio Cortázar' })).toBeInTheDocument();
  });
});
