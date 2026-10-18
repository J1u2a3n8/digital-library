import { setupServer } from 'msw/node';
import { handlers } from './fakeApi';

export const server = setupServer(...handlers);
