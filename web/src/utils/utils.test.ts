import dayjs from 'dayjs';
import { getActorName, saveActorName } from './actorName';
import { formatDateTime, formatPublicationDate, parseApiDate, toApiDate } from './dates';
import { cleanSpaces, getInitials, normalizeText, pluralize } from './text';

describe('normalizeText', () => {
  it.each([
    ['Gabriel García Márquez', 'gabriel garcia marquez'],
    ['  JULIO   CORTÁZAR ', 'julio cortazar'],
    ['Ñandú', 'nandu'],
    ['', ''],
  ])('normaliza "%s" como el backend', (input, expected) => {
    expect(normalizeText(input)).toBe(expected);
  });
});

describe('text helpers', () => {
  it('limpia espacios sin tocar tildes', () => {
    expect(cleanSpaces('  Isabel   Allende ')).toBe('Isabel Allende');
  });

  it('arma iniciales con primera y última palabra', () => {
    expect(getInitials('Gabriel García Márquez')).toBe('GM');
    expect(getInitials('borges')).toBe('B');
  });

  it('usa singular o plural', () => {
    expect(pluralize(1, 'obra', 'obras')).toBe('1 obra');
    expect(pluralize(12, 'obra', 'obras')).toBe('12 obras');
  });
});

describe('dates', () => {
  it('lee YYYY-MM-DD como fecha local, sin corrimiento de zona horaria', () => {
    const date = parseApiDate('1967-05-30')!;
    expect(date.date()).toBe(30);
    expect(date.month()).toBe(4);
    expect(date.year()).toBe(1967);
  });

  it('rechaza fechas inválidas o vacías', () => {
    expect(parseApiDate('1967-13-45')).toBeNull();
    expect(parseApiDate('')).toBeNull();
    expect(parseApiDate(undefined)).toBeNull();
  });

  it('convierte a formato de API', () => {
    expect(toApiDate(dayjs('2012-08-20'))).toBe('2012-08-20');
    expect(toApiDate(null)).toBeUndefined();
    expect(toApiDate(dayjs('nada'))).toBeUndefined();
  });

  it('muestra dd/MM/yyyy', () => {
    expect(formatPublicationDate('1967-05-30')).toBe('30/05/1967');
    expect(formatPublicationDate('no-es-fecha')).toBe('no-es-fecha');
  });

  it('muestra fecha y hora del historial', () => {
    expect(formatDateTime('2026-10-18T14:30:00Z')).toMatch(/^18\/10\/2026 \d{2}:30$/);
  });
});

describe('actorName', () => {
  it('guarda y lee el nombre recortado', () => {
    saveActorName('  María ');
    expect(getActorName()).toBe('María');
  });

  it('borra el nombre si queda vacío', () => {
    saveActorName('Juan');
    saveActorName('   ');
    expect(getActorName()).toBe('');
  });

  it('no falla si el almacenamiento no está disponible', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });

    expect(getActorName()).toBe('');
    expect(() => saveActorName('Juan')).not.toThrow();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
