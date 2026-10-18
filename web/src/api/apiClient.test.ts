import { http, HttpResponse } from 'msw';
import { server } from '../test/server';
import { saveActorName } from '../utils/actorName';
import { ApiError, apiRequest, toApiError, toQueryString } from './apiClient';

describe('toApiError', () => {
  it('usa el primer error de campo en un 400', async () => {
    const response = Response.json(
      { title: 'Validation failed', errors: { title: ['El título es obligatorio.'] } },
      { status: 400 },
    );

    const error = await toApiError(response);

    expect(error.status).toBe(400);
    expect(error.message).toBe('El título es obligatorio.');
    expect(error.fieldErrors.title).toEqual(['El título es obligatorio.']);
  });

  it('usa el detail del ProblemDetails', async () => {
    const error = await toApiError(
      Response.json({ detail: 'No existe una obra con id 9.' }, { status: 404 }),
    );

    expect(error.message).toBe('No existe una obra con id 9.');
    expect(error.isNotFound).toBe(true);
    expect(error.isConflict).toBe(false);
  });

  it('usa un mensaje por defecto si no hay cuerpo JSON', async () => {
    const conflict = await toApiError(new Response('', { status: 409 }));
    const unknown = await toApiError(new Response('bad gateway', { status: 502 }));

    expect(conflict.message).toBe('La obra fue modificada por otro usuario.');
    expect(conflict.isConflict).toBe(true);
    expect(unknown.message).toBe('Ocurrió un error inesperado. Intentá de nuevo más tarde.');
  });
});

describe('apiRequest', () => {
  it('envía X-Actor codificado solo en escrituras', async () => {
    let actorOnGet: string | null = 'sin pedir';
    let actorOnPost: string | null = null;
    server.use(
      http.get('*/api/ping', ({ request }) => {
        actorOnGet = request.headers.get('X-Actor');
        return HttpResponse.json({ ok: true });
      }),
      http.post('*/api/ping', ({ request }) => {
        actorOnPost = request.headers.get('X-Actor');
        return HttpResponse.json({ ok: true });
      }),
    );
    saveActorName('María');

    await apiRequest('/ping');
    await apiRequest('/ping', { method: 'POST', body: {} });

    expect(actorOnGet).toBeNull();
    expect(actorOnPost).toBe('Mar%C3%ADa');
  });

  it('lanza ApiError legible si falla la red', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.error()));

    await expect(apiRequest('/ping')).rejects.toMatchObject({
      status: 0,
      message: 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.',
    });
  });

  it('propaga la cancelación sin convertirla en error de red', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(apiRequest('/works', { signal: controller.signal })).rejects.not.toBeInstanceOf(ApiError);
  });

  it('convierte respuestas de error en ApiError', async () => {
    server.use(http.get('*/api/ping', () => HttpResponse.json({ detail: 'Falla' }, { status: 500 })));

    await expect(apiRequest('/ping')).rejects.toBeInstanceOf(ApiError);
  });
});

describe('toQueryString', () => {
  it('omite valores vacíos', () => {
    expect(toQueryString({ title: 'rayuela', authorName: '', pageSize: 10, sortBy: undefined })).toBe(
      '?title=rayuela&pageSize=10',
    );
    expect(toQueryString({})).toBe('');
  });
});
