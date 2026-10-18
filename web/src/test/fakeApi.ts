import { http, HttpResponse } from 'msw';
import type { Author, WorkDetails, WorkHistoryItem, WorkListItem } from '../api/types';
import { normalizeText } from '../utils/text';

/**
 * API falsa en memoria para las pruebas de UI. Imita las reglas del backend
 * (filtros AND, orden, paginación, rowVersion) lo justo para probar la interfaz.
 */
interface FakeWork {
  id: number;
  title: string;
  publicationDate: string;
  authorIds: number[];
  versionNumber: number;
  rowVersion: string;
  history: WorkHistoryItem[];
}

export const fakeDb = {
  authors: [] as Author[],
  works: [] as FakeWork[],
  lastActorHeader: null as string | null,
};

export function resetFakeDb() {
  fakeDb.authors = [
    { id: 1, fullName: 'Gabriel García Márquez' },
    { id: 2, fullName: 'Julio Cortázar' },
    { id: 3, fullName: 'Jorge Luis Borges' },
    { id: 4, fullName: 'Margarita Guerrero' },
  ];
  fakeDb.works = [];
  fakeDb.lastActorHeader = null;
  addFakeWork('Cien años de soledad', '1967-05-30', [1]);
  addFakeWork('Rayuela', '1963-06-28', [2]);
  addFakeWork('El libro de los seres imaginarios', '1967-01-01', [3, 4]);
}

function authorsOf(ids: number[]): Author[] {
  return ids.map((id) => fakeDb.authors.find((author) => author.id === id)!);
}

export function addFakeWork(title: string, publicationDate: string, authorIds: number[]): FakeWork {
  const work: FakeWork = {
    id: fakeDb.works.length + 1,
    title,
    publicationDate,
    authorIds,
    versionNumber: 1,
    rowVersion: 'AAAAAAAAB9E=',
    history: [],
  };
  work.history.push({
    versionNumber: 1,
    title,
    publicationDate,
    authors: authorsOf(authorIds),
    createdAtUtc: '2026-10-18T14:00:00Z',
    changedBy: 'seed',
    changeKind: 'Created',
    isCurrent: true,
  });
  fakeDb.works.push(work);
  return work;
}

function toDetails(work: FakeWork): WorkDetails {
  const authors = authorsOf(work.authorIds);
  return {
    id: work.id,
    title: work.title,
    publicationDate: work.publicationDate,
    authors,
    authorCount: authors.length,
    versionNumber: work.versionNumber,
    rowVersion: work.rowVersion,
  };
}

function resolveAuthorIds(inputs: ({ id: number } | { name: string })[]): number[] {
  const ids: number[] = [];
  for (const input of inputs) {
    let id: number;
    if ('id' in input) {
      id = input.id;
    } else {
      const existing = fakeDb.authors.find(
        (author) => normalizeText(author.fullName) === normalizeText(input.name),
      );
      if (existing) {
        id = existing.id;
      } else {
        id = fakeDb.authors.length + 1;
        fakeDb.authors.push({ id, fullName: input.name });
      }
    }
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

function validationProblem(errors: Record<string, string[]>) {
  return HttpResponse.json(
    { title: 'Validation failed', status: 400, detail: 'One or more validation errors occurred.', errors },
    { status: 400 },
  );
}

export const handlers = [
  http.get('*/api/works', ({ request }) => {
    const params = new URL(request.url).searchParams;
    const title = normalizeText(params.get('title') ?? '');
    const authorName = normalizeText(params.get('authorName') ?? '');
    const publicationDate = params.get('publicationDate');
    const minimumAuthorCount = Number(params.get('minimumAuthorCount') ?? 0);
    const sortBy = params.get('sortBy') ?? 'title';
    const direction = params.get('sortDirection') === 'desc' ? -1 : 1;
    const pageNumber = Number(params.get('pageNumber') ?? 1);
    const pageSize = Number(params.get('pageSize') ?? 10);

    const items: WorkListItem[] = fakeDb.works
      .filter((work) => !title || normalizeText(work.title).includes(title))
      .filter(
        (work) =>
          !authorName ||
          authorsOf(work.authorIds).some((author) => normalizeText(author.fullName).includes(authorName)),
      )
      .filter((work) => !publicationDate || work.publicationDate === publicationDate)
      .filter((work) => work.authorIds.length >= minimumAuthorCount)
      .map((work) => ({
        id: work.id,
        title: work.title,
        publicationDate: work.publicationDate,
        authorCount: work.authorIds.length,
      }))
      .sort((first, second) => {
        const key = sortBy as keyof WorkListItem;
        const compared = first[key] < second[key] ? -1 : first[key] > second[key] ? 1 : 0;
        return compared * direction || first.id - second.id;
      });

    return HttpResponse.json({
      items: items.slice((pageNumber - 1) * pageSize, pageNumber * pageSize),
      pageNumber,
      pageSize,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / pageSize),
    });
  }),

  http.get('*/api/works/:id', ({ params }) => {
    const work = fakeDb.works.find((current) => current.id === Number(params.id));
    if (!work) {
      return HttpResponse.json(
        { status: 404, detail: `No existe una obra con id ${params.id}.` },
        { status: 404 },
      );
    }
    return HttpResponse.json(toDetails(work));
  }),

  http.get('*/api/works/:id/history', ({ params }) => {
    const work = fakeDb.works.find((current) => current.id === Number(params.id));
    return HttpResponse.json([...(work?.history ?? [])].reverse());
  }),

  http.post('*/api/works', async ({ request }) => {
    fakeDb.lastActorHeader = request.headers.get('X-Actor');
    const body = (await request.json()) as {
      title: string;
      publicationDate: string;
      authors: ({ id: number } | { name: string })[];
    };
    if (body.title.toLowerCase() === 'error de servidor') {
      return validationProblem({ title: ['El título no es válido para el servidor.'] });
    }
    const work = addFakeWork(body.title, body.publicationDate, resolveAuthorIds(body.authors));
    return HttpResponse.json(toDetails(work), { status: 201 });
  }),

  http.put('*/api/works/:id', async ({ params, request }) => {
    fakeDb.lastActorHeader = request.headers.get('X-Actor');
    const work = fakeDb.works.find((current) => current.id === Number(params.id))!;
    const body = (await request.json()) as {
      title: string;
      publicationDate: string;
      authors: ({ id: number } | { name: string })[];
      rowVersion: string;
    };
    if (body.rowVersion !== work.rowVersion) {
      return HttpResponse.json(
        { status: 409, title: 'Conflict', detail: 'La obra fue modificada por otro usuario.' },
        { status: 409 },
      );
    }
    work.history.forEach((version) => (version.isCurrent = false));
    work.title = body.title;
    work.publicationDate = body.publicationDate;
    work.authorIds = resolveAuthorIds(body.authors);
    work.versionNumber += 1;
    work.rowVersion = `AAAAAAAAB${work.versionNumber}E=`;
    work.history.push({
      versionNumber: work.versionNumber,
      title: work.title,
      publicationDate: work.publicationDate,
      authors: authorsOf(work.authorIds),
      createdAtUtc: '2026-10-18T15:00:00Z',
      changedBy: 'María',
      changeKind: 'Updated',
      isCurrent: true,
    });
    return HttpResponse.json(toDetails(work));
  }),

  http.get('*/api/authors', ({ request }) => {
    const search = normalizeText(new URL(request.url).searchParams.get('search') ?? '');
    const results = fakeDb.authors
      .filter((author) => normalizeText(author.fullName).includes(search))
      .sort((first, second) => {
        const firstExact = normalizeText(first.fullName) === search ? 0 : 1;
        const secondExact = normalizeText(second.fullName) === search ? 0 : 1;
        return firstExact - secondExact || first.fullName.localeCompare(second.fullName);
      })
      .slice(0, 10);
    return HttpResponse.json(results);
  }),
];
