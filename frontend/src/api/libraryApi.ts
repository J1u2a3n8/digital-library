import { apiRequest, toQueryString } from './apiClient';
import type {
  Author,
  CreateWorkRequest,
  PagedResponse,
  UpdateWorkRequest,
  WorkDetails,
  WorkHistoryItem,
  WorkListItem,
  WorkQuery,
} from './types';

export const worksApi = {
  list(query: WorkQuery, signal?: AbortSignal) {
    const queryString = toQueryString({
      title: query.title,
      authorName: query.authorName,
      publicationDate: query.publicationDate,
      minimumAuthorCount: query.minimumAuthorCount,
      sortBy: query.sortBy,
      sortDirection: query.sortDirection,
      pageNumber: query.pageNumber,
      pageSize: query.pageSize,
    });
    return apiRequest<PagedResponse<WorkListItem>>(`/works${queryString}`, { signal });
  },

  get(id: number, signal?: AbortSignal) {
    return apiRequest<WorkDetails>(`/works/${id}`, { signal });
  },

  history(id: number, signal?: AbortSignal) {
    return apiRequest<WorkHistoryItem[]>(`/works/${id}/history`, { signal });
  },

  create(request: CreateWorkRequest) {
    return apiRequest<WorkDetails>('/works', { method: 'POST', body: request });
  },

  update(id: number, request: UpdateWorkRequest) {
    return apiRequest<WorkDetails>(`/works/${id}`, { method: 'PUT', body: request });
  },
};

export const authorsApi = {
  search(search: string, pageSize = 10, signal?: AbortSignal) {
    const queryString = toQueryString({ search: search.trim(), pageSize });
    return apiRequest<Author[]>(`/authors${queryString}`, { signal });
  },
};
