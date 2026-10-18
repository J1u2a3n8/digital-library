import { ApiError } from './api/apiClient';
import { createQueryClient } from './queryClient';

describe('createQueryClient', () => {
  const retry = createQueryClient().getDefaultOptions().queries!.retry as (
    failureCount: number,
    error: Error,
  ) => boolean;

  it('no reintenta errores 4xx', () => {
    expect(retry(0, new ApiError(404, 'No existe'))).toBe(false);
    expect(retry(0, new ApiError(409, 'Conflicto'))).toBe(false);
  });

  it('reintenta hasta dos veces errores de servidor o de red', () => {
    expect(retry(0, new ApiError(500, 'Falla'))).toBe(true);
    expect(retry(1, new ApiError(0, 'Sin red'))).toBe(true);
    expect(retry(2, new ApiError(503, 'Falla'))).toBe(false);
  });
});
