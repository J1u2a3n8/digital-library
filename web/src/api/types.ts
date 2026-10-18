// Contratos de la API (ver Swagger). Las fechas de publicación viajan como 'YYYY-MM-DD'.

export interface Author {
  id: number;
  fullName: string;
}

export interface WorkListItem {
  id: number;
  title: string;
  publicationDate: string;
  authorCount: number;
}

export interface WorkDetails {
  id: number;
  title: string;
  publicationDate: string;
  authors: Author[];
  authorCount: number;
  versionNumber: number;
  rowVersion: string;
}

export interface WorkHistoryItem {
  versionNumber: number;
  title: string;
  publicationDate: string;
  authors: Author[];
  createdAtUtc: string;
  changedBy: string;
  changeKind: 'Created' | 'Updated';
  isCurrent: boolean;
}

export interface PagedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Un autor del request: existente por id o nuevo por nombre (nunca ambos). */
export type AuthorInput = { id: number } | { name: string };

export interface CreateWorkRequest {
  title: string;
  publicationDate: string;
  authors: AuthorInput[];
}

export interface UpdateWorkRequest extends CreateWorkRequest {
  rowVersion: string;
}

export type SortBy = 'title' | 'publicationDate' | 'authorCount';
export type SortDirection = 'asc' | 'desc';

export interface WorkQuery {
  title?: string;
  authorName?: string;
  publicationDate?: string;
  minimumAuthorCount?: number;
  sortBy: SortBy;
  sortDirection: SortDirection;
  pageNumber: number;
  pageSize: number;
}
