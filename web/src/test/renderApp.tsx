import { QueryClient } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../App';
import { appRoutes } from '../routes';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

/** Renderiza la aplicación completa en una ruta, con la API falsa de MSW. */
export function renderApp(initialPath = '/works') {
  const router = createMemoryRouter(appRoutes, { initialEntries: [initialPath] });
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();

  const result = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );

  return { ...result, router, user, queryClient };
}

/** Renderiza un componente suelto con los proveedores (tema, fechas, datos, toasts). */
export function renderWithProviders(ui: ReactNode) {
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  const result = render(<AppProviders queryClient={queryClient}>{ui}</AppProviders>);
  return { ...result, user, queryClient };
}

export function currentSearch(router: ReturnType<typeof createMemoryRouter>): URLSearchParams {
  return new URLSearchParams(router.state.location.search);
}
