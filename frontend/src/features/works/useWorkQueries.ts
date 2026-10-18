import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { worksApi } from '../../api/libraryApi';
import type { CreateWorkRequest, UpdateWorkRequest, WorkQuery } from '../../api/types';

export const workKeys = {
  all: ['works'] as const,
  list: (query: WorkQuery) => ['works', 'list', query] as const,
  details: (id: number) => ['works', 'details', id] as const,
  history: (id: number) => ['works', 'history', id] as const,
};

export function useWorksList(query: WorkQuery) {
  return useQuery({
    queryKey: workKeys.list(query),
    queryFn: ({ signal }) => worksApi.list(query, signal),
    // Mientras llega la página nueva se sigue mostrando la anterior (sin parpadeo).
    placeholderData: keepPreviousData,
  });
}

export function useWork(id: number) {
  return useQuery({
    queryKey: workKeys.details(id),
    queryFn: ({ signal }) => worksApi.get(id, signal),
  });
}

export function useWorkHistory(id: number | null) {
  return useQuery({
    queryKey: workKeys.history(id ?? 0),
    queryFn: ({ signal }) => worksApi.history(id!, signal),
    enabled: id !== null,
  });
}

export function useCreateWork() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateWorkRequest) => worksApi.create(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['authors'] });
    },
  });
}

export function useUpdateWork(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateWorkRequest) => worksApi.update(id, request),
    onSuccess: async (work) => {
      queryClient.setQueryData(workKeys.details(id), work);
      await queryClient.invalidateQueries({ queryKey: workKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['authors'] });
    },
  });
}
