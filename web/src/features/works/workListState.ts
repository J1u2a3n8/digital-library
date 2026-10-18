import type { SortBy, SortDirection, WorkQuery } from '../../api/types';
import { parseApiDate } from '../../utils/dates';

export const pageSizeOptions = [10, 20, 50] as const;
export const minimumAuthorOptions = [1, 2, 3, 4] as const;

export const defaultWorkQuery: WorkQuery = {
  sortBy: 'title',
  sortDirection: 'asc',
  pageNumber: 1,
  pageSize: 10,
};

export type WorkFilters = Pick<WorkQuery, 'title' | 'authorName' | 'publicationDate' | 'minimumAuthorCount'>;

const sortByValues: SortBy[] = ['title', 'publicationDate', 'authorCount'];
const sortDirectionValues: SortDirection[] = ['asc', 'desc'];

function readPositiveInteger(value: string | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }
  const number = Number(value);
  return number >= 1 ? number : undefined;
}

function readText(value: string | null): string | undefined {
  const text = value?.trim();
  return text ? text : undefined;
}

/**
 * Lee el estado del listado desde la URL. Valores inválidos o ausentes vuelven al default,
 * así un link editado a mano nunca rompe la pantalla.
 */
export function parseWorkQuery(params: URLSearchParams): WorkQuery {
  const sortBy = params.get('sortBy') as SortBy | null;
  const sortDirection = params.get('sortDirection') as SortDirection | null;
  const pageSize = readPositiveInteger(params.get('pageSize'));
  const minimumAuthorCount = readPositiveInteger(params.get('minimumAuthorCount'));
  const publicationDate = params.get('publicationDate');

  return {
    title: readText(params.get('title')),
    authorName: readText(params.get('authorName')),
    publicationDate: parseApiDate(publicationDate) ? publicationDate! : undefined,
    minimumAuthorCount,
    sortBy: sortBy && sortByValues.includes(sortBy) ? sortBy : defaultWorkQuery.sortBy,
    sortDirection:
      sortDirection && sortDirectionValues.includes(sortDirection)
        ? sortDirection
        : defaultWorkQuery.sortDirection,
    pageNumber: readPositiveInteger(params.get('pageNumber')) ?? defaultWorkQuery.pageNumber,
    pageSize: pageSize && pageSize <= 100 ? pageSize : defaultWorkQuery.pageSize,
  };
}

/** Escribe el estado en la URL omitiendo los valores por defecto, para que el link quede corto. */
export function toSearchParams(query: WorkQuery): URLSearchParams {
  const params = new URLSearchParams();

  if (query.title) params.set('title', query.title);
  if (query.authorName) params.set('authorName', query.authorName);
  if (query.publicationDate) params.set('publicationDate', query.publicationDate);
  if (query.minimumAuthorCount) params.set('minimumAuthorCount', String(query.minimumAuthorCount));
  if (query.sortBy !== defaultWorkQuery.sortBy) params.set('sortBy', query.sortBy);
  if (query.sortDirection !== defaultWorkQuery.sortDirection)
    params.set('sortDirection', query.sortDirection);
  if (query.pageNumber !== defaultWorkQuery.pageNumber) params.set('pageNumber', String(query.pageNumber));
  if (query.pageSize !== defaultWorkQuery.pageSize) params.set('pageSize', String(query.pageSize));

  return params;
}

/** Cambiar un filtro siempre vuelve a la página 1; orden y tamaño de página se conservan. */
export function applyFilters(query: WorkQuery, changes: Partial<WorkFilters>): WorkQuery {
  return { ...query, ...changes, pageNumber: 1 };
}

export function clearFilters(query: WorkQuery): WorkQuery {
  return {
    ...query,
    title: undefined,
    authorName: undefined,
    publicationDate: undefined,
    minimumAuthorCount: undefined,
    pageNumber: 1,
  };
}

/** Click en el mismo encabezado invierte la dirección; en otro, empieza ascendente. */
export function toggleSort(query: WorkQuery, sortBy: SortBy): WorkQuery {
  const sortDirection: SortDirection =
    query.sortBy === sortBy && query.sortDirection === 'asc' ? 'desc' : 'asc';
  return { ...query, sortBy, sortDirection, pageNumber: 1 };
}

export function hasActiveFilters(query: WorkQuery): boolean {
  return Boolean(query.title || query.authorName || query.publicationDate || query.minimumAuthorCount);
}
