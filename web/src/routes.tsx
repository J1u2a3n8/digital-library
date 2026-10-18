import { Navigate, type RouteObject } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { WorkCreatePage } from './pages/WorkCreatePage';
import { WorkEditPage } from './pages/WorkEditPage';
import { WorksListPage } from './pages/WorksListPage';

export const appRoutes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <Navigate to="/works" replace /> },
      { path: '/works', element: <WorksListPage /> },
      { path: '/works/new', element: <WorkCreatePage /> },
      { path: '/works/:id/edit', element: <WorkEditPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
