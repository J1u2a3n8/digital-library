import { screen, waitFor, within } from '@testing-library/react';
import { delay, http, HttpResponse } from 'msw';
import { addFakeWork, fakeDb } from '../test/fakeApi';
import { currentSearch, renderApp } from '../test/renderApp';
import { setScreenWidth } from '../test/screen';
import { server } from '../test/server';

async function waitForRows() {
  const table = await screen.findByRole('table', { name: 'Listado de obras' });
  return within(table).getAllByRole('row').slice(1);
}

describe('Listado de obras', () => {
  it('muestra título, contador y filas de la tabla', async () => {
    renderApp('/works');

    const rows = await waitForRows();

    expect(screen.getByRole('heading', { level: 1, name: 'Obras' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('3 obras');
    expect(rows).toHaveLength(3);
    expect(within(rows[0]!).getByText('Cien años de soledad')).toBeInTheDocument();
    expect(within(rows[0]!).getByText('30/05/1967')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–3 de 3')).toBeInTheDocument();
  });

  it('redirige la raíz a /works', async () => {
    const { router } = renderApp('/');

    await waitForRows();
    expect(router.state.location.pathname).toBe('/works');
  });

  it('muestra un skeleton mientras carga', async () => {
    server.use(
      http.get('*/api/works', async () => {
        await delay('infinite');
        return HttpResponse.json({});
      }),
    );

    renderApp('/works');

    expect(await screen.findByRole('table', { name: 'Cargando obras' })).toBeInTheDocument();
  });

  it('muestra el estado vacío sin filtros', async () => {
    fakeDb.works = [];
    renderApp('/works');

    expect(await screen.findByText('Todavía no hay obras')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear la primera obra' })).toHaveAttribute('href', '/works/new');
  });

  it('muestra el estado vacío con filtros y permite limpiarlos', async () => {
    const { user, router } = renderApp('/works?title=inexistente');

    expect(await screen.findByText('No encontramos obras con esos filtros')).toBeInTheDocument();
    const emptyStateButtons = screen.getAllByRole('button', { name: 'Limpiar filtros' });
    await user.click(emptyStateButtons[emptyStateButtons.length - 1]!);

    await waitForRows();
    expect(currentSearch(router).get('title')).toBeNull();
  });

  it('muestra el error y reintenta', async () => {
    let calls = 0;
    server.use(
      http.get('*/api/works', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ detail: 'La base no responde.' }, { status: 500 })
          : HttpResponse.json({ items: [], pageNumber: 1, pageSize: 10, totalItems: 0, totalPages: 0 });
      }),
    );
    const { user } = renderApp('/works');

    expect(await screen.findByText('La base no responde.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Todavía no hay obras')).toBeInTheDocument();
  });

  it('aplica el filtro de título con debounce y vuelve a la página 1', async () => {
    const { user, router } = renderApp('/works?pageNumber=2&sortBy=authorCount');
    await screen.findByText('Mostrando 0–0 de 3').catch(() => undefined);

    await user.type(screen.getByLabelText('Título'), 'rayuela');

    expect(currentSearch(router).get('title')).toBeNull();
    await waitFor(() => expect(currentSearch(router).get('title')).toBe('rayuela'));
    expect(currentSearch(router).get('pageNumber')).toBeNull();
    expect(currentSearch(router).get('sortBy')).toBe('authorCount');

    const rows = await waitForRows();
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 obra'));
    expect(rows.length).toBeGreaterThan(0);
  });

  it('Buscar aplica los textos sin esperar', async () => {
    const { user, router } = renderApp('/works');
    await waitForRows();

    await user.type(screen.getByLabelText('Autor'), 'borges');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(currentSearch(router).get('authorName')).toBe('borges');
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 obra'));
  });

  it('combina fecha y mínimo de autores con chips que se pueden quitar', async () => {
    const { user, router } = renderApp('/works');
    await waitForRows();

    await user.type(screen.getByLabelText('Fecha de publicación'), '01011967');
    await waitFor(() => expect(currentSearch(router).get('publicationDate')).toBe('1967-01-01'));

    await user.click(screen.getByLabelText('Mínimo de autores'));
    await user.click(await screen.findByRole('option', { name: '2+' }));

    await waitFor(() => expect(currentSearch(router).get('minimumAuthorCount')).toBe('2'));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('1 obra'));
    expect(screen.getByRole('button', { name: 'Quitar filtro Fecha: 01/01/1967' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Quitar filtro Autores: 2+' }));

    await waitFor(() => expect(currentSearch(router).get('minimumAuthorCount')).toBeNull());
    expect(currentSearch(router).get('publicationDate')).toBe('1967-01-01');

    await user.click(screen.getByLabelText('Mínimo de autores'));
    await user.click(await screen.findByRole('option', { name: 'Cualquiera' }));
    expect(currentSearch(router).get('minimumAuthorCount')).toBeNull();
  });

  it('no pierde un filtro elegido mientras corre el debounce del texto', async () => {
    const { user, router } = renderApp('/works');
    await waitForRows();

    await user.type(screen.getByLabelText('Título'), 'libro');
    await user.click(screen.getByLabelText('Mínimo de autores'));
    await user.click(await screen.findByRole('option', { name: '2+' }));

    await waitFor(() => expect(currentSearch(router).get('title')).toBe('libro'));
    expect(currentSearch(router).get('minimumAuthorCount')).toBe('2');
  });

  it('limpiar filtros vacía los campos y la URL', async () => {
    const { user, router } = renderApp('/works?title=libro&authorName=borges');
    await waitForRows();

    expect(screen.getByLabelText('Título')).toHaveValue('libro');
    await user.click(screen.getAllByRole('button', { name: 'Limpiar filtros' })[0]!);

    await waitFor(() => expect(screen.getByLabelText('Título')).toHaveValue(''));
    expect(screen.getByLabelText('Autor')).toHaveValue('');
    expect(currentSearch(router).toString()).toBe('');
  });

  it('ordena al hacer click en los encabezados y marca aria-sort', async () => {
    const { user, router } = renderApp('/works');
    await waitForRows();

    const titleHeader = screen.getByRole('columnheader', { name: /Título/ });
    expect(titleHeader).toHaveAttribute('aria-sort', 'ascending');

    await user.click(screen.getByRole('button', { name: /Autores/ }));
    expect(currentSearch(router).get('sortBy')).toBe('authorCount');
    await waitFor(() =>
      expect(screen.getByRole('columnheader', { name: /Autores/ })).toHaveAttribute('aria-sort', 'ascending'),
    );

    await user.click(screen.getByRole('button', { name: /Autores/ }));
    expect(currentSearch(router).get('sortDirection')).toBe('desc');

    const rows = await waitForRows();
    await waitFor(() =>
      expect(within(rows[0]!).getByText('El libro de los seres imaginarios')).toBeInTheDocument(),
    );
  });

  it('pagina y cambia el tamaño de página conservando filtros', async () => {
    for (let number = 1; number <= 12; number++) {
      addFakeWork(`Obra ${String(number).padStart(2, '0')}`, '2000-01-01', [1]);
    }
    const { user, router } = renderApp('/works?title=obra');
    await waitForRows();
    await waitFor(() => expect(screen.getByText('Mostrando 1–10 de 12')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));

    await waitFor(() => expect(screen.getByText('Mostrando 11–12 de 12')).toBeInTheDocument());
    expect(currentSearch(router).get('pageNumber')).toBe('2');
    expect(currentSearch(router).get('title')).toBe('obra');

    await user.click(screen.getByLabelText('Por página'));
    await user.click(await screen.findByRole('option', { name: '20' }));

    await waitFor(() => expect(screen.getByText('Mostrando 1–12 de 12')).toBeInTheDocument());
    expect(currentSearch(router).get('pageSize')).toBe('20');
    expect(currentSearch(router).get('pageNumber')).toBeNull();
  });

  it('corrige una página fuera de rango', async () => {
    const { router } = renderApp('/works?pageNumber=9');

    await waitFor(() => expect(currentSearch(router).get('pageNumber')).toBeNull());
    expect(await waitForRows()).toHaveLength(3);
  });

  it('en mobile muestra cards en lugar de tabla', async () => {
    setScreenWidth(400);
    renderApp('/works');

    const list = await screen.findByRole('list', { name: 'Listado de obras' });

    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('30/05/1967 · 1 autor')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nueva obra' })).toBeInTheDocument();
  });

  it('abre el historial en un drawer y lo cierra', async () => {
    const { user } = renderApp('/works');
    await waitForRows();

    await user.click(screen.getByRole('button', { name: 'Ver historial de Rayuela' }));

    const drawer = await screen.findByRole('dialog', { name: 'Historial' });
    expect(await within(drawer).findByText('Versión 1')).toBeInTheDocument();
    expect(within(drawer).getByText('Actual')).toBeInTheDocument();
    expect(within(drawer).getByText('seed')).toBeInTheDocument();
    expect(within(drawer).getByText('Publicada el 28/06/1963')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: 'Cerrar historial' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Historial' })).not.toBeInTheDocument());
  });

  it('el historial muestra error y estado vacío', async () => {
    server.use(
      http.get('*/api/works/:id/history', ({ params }) =>
        params.id === '1'
          ? HttpResponse.json({ detail: 'Sin conexión al historial.' }, { status: 500 })
          : HttpResponse.json([]),
      ),
    );
    const { user } = renderApp('/works');
    await waitForRows();

    await user.click(screen.getByRole('button', { name: 'Ver historial de Cien años de soledad' }));
    expect(await screen.findByText('Sin conexión al historial.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cerrar historial' }));

    await user.click(await screen.findByRole('button', { name: 'Ver historial de Rayuela' }));
    expect(await screen.findByText('Sin versiones')).toBeInTheDocument();
  });

  it('el link Editar lleva a la edición', async () => {
    const { user, router } = renderApp('/works');
    await waitForRows();

    await user.click(screen.getByRole('link', { name: 'Editar Rayuela' }));

    expect(router.state.location.pathname).toBe('/works/2/edit');
  });
});

describe('Rutas', () => {
  it('muestra 404 para rutas desconocidas', async () => {
    renderApp('/no-existe');

    expect(await screen.findByText('Página no encontrada')).toBeInTheDocument();
  });

  it('guarda el nombre de quien edita al salir del campo', async () => {
    const { user } = renderApp('/works');

    await user.type(screen.getByLabelText('Tu nombre para el historial de cambios'), 'María');
    await user.tab();

    expect(window.localStorage.getItem('library.actorName')).toBe('María');
  });
});
