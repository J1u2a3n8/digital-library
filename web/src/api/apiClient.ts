import { getActorName } from '../utils/actorName';

const baseUrl = '/api';

const defaultMessages: Record<number, string> = {
  400: 'Revisá los datos ingresados.',
  404: 'No encontramos lo que buscabas.',
  409: 'La obra fue modificada por otro usuario.',
  500: 'Ocurrió un error inesperado. Intentá de nuevo más tarde.',
};

interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
  errors?: Record<string, string[]>;
}

/**
 * Error de la API ya traducido a un mensaje legible y a errores por campo.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/** Convierte una respuesta ProblemDetails (RFC 9457) en ApiError. */
export async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails = {};

  try {
    problem = (await response.json()) as ProblemDetails;
  } catch {
    // Respuesta sin cuerpo JSON (por ejemplo, un 502 del proxy).
  }

  const fieldErrors = problem.errors ?? {};
  const firstFieldError = Object.values(fieldErrors)[0]?.[0];
  const message =
    (response.status === 400 && firstFieldError) ||
    problem.detail ||
    defaultMessages[response.status] ||
    defaultMessages[500];

  return new ApiError(response.status, message, fieldErrors);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const actorName = getActorName();
  if (actorName && options.method && options.method !== 'GET') {
    // Los headers solo aceptan ASCII: "María" viaja como "Mar%C3%ADa" y la API lo decodifica.
    headers['X-Actor'] = encodeURIComponent(actorName);
  }

  let response: Response;
  try {
    response = await fetch(new URL(`${baseUrl}${path}`, window.location.origin), {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    // La cancelación (cambio de filtros, desmontar) no es un error de red.
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(0, 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  return (await response.json()) as T;
}

/** Arma un query string ignorando valores vacíos. */
export function toQueryString(values: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}
