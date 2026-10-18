import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { fakeDb } from '../test/fakeApi';
import { renderApp } from '../test/renderApp';
import { server } from '../test/server';

async function typeDate(user: ReturnType<typeof renderApp>['user'], digits: string) {
  await user.type(screen.getByLabelText(/Fecha de publicación/), digits);
}

describe('Agregar obra', () => {
  it('muestra errores de validación inline', async () => {
    const { user } = renderApp('/works/new');
    await screen.findByRole('list', { name: 'Autores encontrados' });

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El título es obligatorio.')).toBeInTheDocument();
    expect(screen.getByText('La fecha de publicación es obligatoria.')).toBeInTheDocument();
    expect(screen.getByText('Seleccioná al menos un autor.')).toBeInTheDocument();
  });

  it('crea una obra con un autor existente y uno nuevo', async () => {
    window.localStorage.setItem('library.actorName', 'María');
    const { user, router } = renderApp('/works/new');
    await screen.findByRole('list', { name: 'Autores encontrados' });

    await user.type(screen.getByLabelText(/Título/), 'Historias de cronopios');
    await typeDate(user, '01011962');

    await user.click(screen.getByRole('checkbox', { name: 'Julio Cortázar' }));
    await user.type(screen.getByLabelText('Buscar autor'), 'Autora Invitada');
    await user.click(await screen.findByRole('button', { name: 'Crear autor “Autora Invitada”' }));

    const selected = screen.getByLabelText('Autores seleccionados');
    expect(within(selected).getByText('Julio Cortázar')).toBeInTheDocument();
    expect(within(selected).getByText('Nuevo')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/works'));
    expect(await screen.findByText('Obra creada')).toBeInTheDocument();
    expect(fakeDb.lastActorHeader).toBe('Mar%C3%ADa');
    const created = fakeDb.works.find((work) => work.title === 'Historias de cronopios')!;
    expect(created.publicationDate).toBe('1962-01-01');
    expect(created.authorIds).toHaveLength(2);
  });

  it('muestra en el campo el error que devuelve la API', async () => {
    const { user } = renderApp('/works/new');
    await screen.findByRole('list', { name: 'Autores encontrados' });

    await user.type(screen.getByLabelText(/Título/), 'Error de servidor');
    await typeDate(user, '01012000');
    await user.click(screen.getByRole('checkbox', { name: 'Julio Cortázar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('El título no es válido para el servidor.')).toBeInTheDocument();
  });

  it('muestra un error general si la API falla', async () => {
    server.use(
      http.post('*/api/works', () => HttpResponse.json({ detail: 'Se cayó todo.' }, { status: 500 })),
    );
    const { user } = renderApp('/works/new');
    await screen.findByRole('list', { name: 'Autores encontrados' });

    await user.type(screen.getByLabelText(/Título/), 'Obra');
    await typeDate(user, '01012000');
    await user.click(screen.getByRole('checkbox', { name: 'Julio Cortázar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Se cayó todo.')).toBeInTheDocument();
  });

  it('muestra un error general si la API devuelve 400 sin campos conocidos', async () => {
    server.use(
      http.post('*/api/works', () =>
        HttpResponse.json({ errors: { otroCampo: ['Dato raro.'] } }, { status: 400 }),
      ),
    );
    const { user } = renderApp('/works/new');
    await screen.findByRole('list', { name: 'Autores encontrados' });

    await user.type(screen.getByLabelText(/Título/), 'Obra');
    await typeDate(user, '01012000');
    await user.click(screen.getByRole('checkbox', { name: 'Julio Cortázar' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Dato raro.')).toBeInTheDocument();
  });

  it('pide confirmación al cancelar con cambios', async () => {
    const { user, router } = renderApp('/works/new');
    await screen.findByRole('list', { name: 'Autores encontrados' });

    await user.type(screen.getByLabelText(/Título/), 'Borrador');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    const dialog = await screen.findByRole('dialog', { name: '¿Descartar los cambios?' });
    await user.click(within(dialog).getByRole('button', { name: 'Seguir editando' }));
    expect(router.state.location.pathname).toBe('/works/new');

    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));
    await user.click(await screen.findByRole('button', { name: 'Descartar' }));
    expect(router.state.location.pathname).toBe('/works');
  });

  it('cancelar sin cambios vuelve directo al listado', async () => {
    const { user, router } = renderApp('/works/new');
    await screen.findByRole('list', { name: 'Autores encontrados' });

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(router.state.location.pathname).toBe('/works');
  });
});

describe('Editar obra', () => {
  it('carga la obra y deshabilita Guardar hasta que haya cambios', async () => {
    const { user } = renderApp('/works/2/edit');

    const titleInput = await screen.findByDisplayValue('Rayuela');
    expect(screen.getByLabelText(/Fecha de publicación/)).toHaveValue('28/06/1963');
    expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await user.type(titleInput, ' (revisada)');

    expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled();
  });

  it('guarda cambios, muestra el toast y crea la versión 2', async () => {
    const { user } = renderApp('/works/2/edit');
    const titleInput = await screen.findByDisplayValue('Rayuela');

    await user.clear(titleInput);
    await user.type(titleInput, 'Rayuela (revisada)');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Cambios guardados')).toBeInTheDocument();
    expect(await screen.findByText(/Versión 2/)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled());

    await user.click(screen.getByRole('button', { name: 'Ver historial' }));
    const drawer = await screen.findByRole('dialog', { name: 'Historial' });
    expect(await within(drawer).findByText('Versión 2')).toBeInTheDocument();
    expect(within(drawer).getByText('Versión 1')).toBeInTheDocument();
    expect(within(drawer).getByText('María')).toBeInTheDocument();
  });

  it('ante un 409 muestra el diálogo y permite recargar', async () => {
    const { user } = renderApp('/works/2/edit');
    const titleInput = await screen.findByDisplayValue('Rayuela');

    // Otra persona guarda antes.
    fakeDb.works[1]!.title = 'Rayuela (cambio de otro usuario)';
    fakeDb.works[1]!.rowVersion = 'AAAAAAAAB99=';

    await user.type(titleInput, ' mío');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));

    const dialog = await screen.findByRole('dialog', { name: 'La obra fue modificada por otro usuario' });
    await user.click(within(dialog).getByRole('button', { name: 'Recargar' }));

    expect(await screen.findByDisplayValue('Rayuela (cambio de otro usuario)')).toBeInTheDocument();
  });

  it('ante un 409 puede cancelar y conservar lo escrito', async () => {
    const { user } = renderApp('/works/2/edit');
    const titleInput = await screen.findByDisplayValue('Rayuela');
    fakeDb.works[1]!.rowVersion = 'AAAAAAAAB99=';

    await user.type(titleInput, ' mío');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    const dialog = await screen.findByRole('dialog', { name: 'La obra fue modificada por otro usuario' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByDisplayValue('Rayuela mío')).toBeInTheDocument();
  });

  it('muestra un aviso si la obra no existe', async () => {
    renderApp('/works/999/edit');

    expect(await screen.findByText('No encontramos esta obra')).toBeInTheDocument();
  });

  it('muestra error con reintento si falla la carga', async () => {
    server.use(
      http.get('*/api/works/:id', () => HttpResponse.json({ detail: 'Falla temporal.' }, { status: 500 })),
    );
    renderApp('/works/2/edit');

    expect(await screen.findByText('Falla temporal.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
