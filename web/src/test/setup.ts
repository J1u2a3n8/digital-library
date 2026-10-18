import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import '../utils/dates';
import { resetFakeDb } from './fakeApi';
import { getScreenWidth, setScreenWidth } from './screen';
import { server } from './server';

// jsdom no implementa matchMedia; MUI lo usa en useMediaQuery.
function matchesQuery(query: string): boolean {
  const maxWidth = /max-width:\s*([\d.]+)px/.exec(query);
  const minWidth = /min-width:\s*([\d.]+)px/.exec(query);
  if (maxWidth && getScreenWidth() > Number(maxWidth[1])) return false;
  if (minWidth && getScreenWidth() < Number(minWidth[1])) return false;
  return true;
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: matchesQuery(query),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));

beforeEach(() => {
  resetFakeDb();
  setScreenWidth(1280);
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => server.close());
