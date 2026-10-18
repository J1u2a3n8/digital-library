import {
  applyFilters,
  clearFilters,
  defaultWorkQuery,
  hasActiveFilters,
  parseWorkQuery,
  toSearchParams,
  toggleSort,
} from './workListState';

describe('parseWorkQuery', () => {
  it('usa los valores por defecto con la URL vacía', () => {
    expect(parseWorkQuery(new URLSearchParams())).toEqual({
      ...defaultWorkQuery,
      title: undefined,
      authorName: undefined,
      publicationDate: undefined,
      minimumAuthorCount: undefined,
    });
  });

  it('lee todos los parámetros', () => {
    const query = parseWorkQuery(
      new URLSearchParams(
        'title=rayuela&authorName=cortazar&publicationDate=1963-06-28&minimumAuthorCount=2&sortBy=authorCount&sortDirection=desc&pageNumber=3&pageSize=20',
      ),
    );

    expect(query).toEqual({
      title: 'rayuela',
      authorName: 'cortazar',
      publicationDate: '1963-06-28',
      minimumAuthorCount: 2,
      sortBy: 'authorCount',
      sortDirection: 'desc',
      pageNumber: 3,
      pageSize: 20,
    });
  });

  it('ignora valores inválidos', () => {
    const query = parseWorkQuery(
      new URLSearchParams(
        'title=%20%20&publicationDate=1963-13-99&minimumAuthorCount=0&sortBy=isbn&sortDirection=up&pageNumber=-1&pageSize=500',
      ),
    );

    expect(query.title).toBeUndefined();
    expect(query.publicationDate).toBeUndefined();
    expect(query.minimumAuthorCount).toBeUndefined();
    expect(query.sortBy).toBe('title');
    expect(query.sortDirection).toBe('asc');
    expect(query.pageNumber).toBe(1);
    expect(query.pageSize).toBe(10);
  });
});

describe('toSearchParams', () => {
  it('omite los valores por defecto', () => {
    expect(toSearchParams(defaultWorkQuery).toString()).toBe('');
  });

  it('ida y vuelta conserva el estado', () => {
    const query = {
      title: 'libro',
      authorName: 'borges',
      publicationDate: '1967-01-01',
      minimumAuthorCount: 2,
      sortBy: 'publicationDate' as const,
      sortDirection: 'desc' as const,
      pageNumber: 2,
      pageSize: 50,
    };

    expect(parseWorkQuery(toSearchParams(query))).toEqual(query);
  });
});

describe('cambios de estado', () => {
  const onPageThree = { ...defaultWorkQuery, pageNumber: 3, sortBy: 'authorCount' as const };

  it('aplicar un filtro vuelve a la página 1 y conserva el orden', () => {
    const query = applyFilters(onPageThree, { title: 'rosa' });

    expect(query.pageNumber).toBe(1);
    expect(query.title).toBe('rosa');
    expect(query.sortBy).toBe('authorCount');
  });

  it('limpiar quita solo los filtros', () => {
    const query = clearFilters({ ...onPageThree, title: 'x', authorName: 'y', minimumAuthorCount: 2 });

    expect(hasActiveFilters(query)).toBe(false);
    expect(query.sortBy).toBe('authorCount');
    expect(query.pageNumber).toBe(1);
  });

  it('ordenar por la misma columna invierte la dirección', () => {
    const ascending = toggleSort(defaultWorkQuery, 'publicationDate');
    const descending = toggleSort(ascending, 'publicationDate');
    const otherColumn = toggleSort(descending, 'title');

    expect(ascending.sortDirection).toBe('asc');
    expect(descending.sortDirection).toBe('desc');
    expect(otherColumn).toMatchObject({ sortBy: 'title', sortDirection: 'asc' });
  });

  it('detecta filtros activos', () => {
    expect(hasActiveFilters(defaultWorkQuery)).toBe(false);
    expect(hasActiveFilters({ ...defaultWorkQuery, publicationDate: '1967-01-01' })).toBe(true);
  });
});
