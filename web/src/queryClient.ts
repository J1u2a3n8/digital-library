import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api/apiClient';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Errores 4xx no se reintentan: repetir el mismo pedido daría el mismo resultado.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  });
}
