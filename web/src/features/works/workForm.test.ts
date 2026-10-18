import dayjs from 'dayjs';
import {
  addAuthor,
  fromExisting,
  fromNewName,
  getAuthorKey,
  removeAuthor,
  toAuthorInputs,
} from '../authors/selectedAuthors';
import { emptyWorkForm, getFormFingerprint, toFormValues, toWorkRequest, workFormSchema } from './workForm';

const cortazar = fromExisting({ id: 2, fullName: 'Julio Cortázar' });
const borges = fromExisting({ id: 3, fullName: 'Jorge Luis Borges' });

describe('workFormSchema', () => {
  it('pide título, fecha y al menos un autor', () => {
    const result = workFormSchema.safeParse(emptyWorkForm);

    expect(result.success).toBe(false);
    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toEqual([
      'El título es obligatorio.',
      'La fecha de publicación es obligatoria.',
      'Seleccioná al menos un autor.',
    ]);
  });

  it('rechaza fechas incompletas y títulos largos', () => {
    const result = workFormSchema.safeParse({
      title: 'a'.repeat(301),
      publicationDate: dayjs('fecha mal'),
      authors: [cortazar],
    });

    const messages = result.error!.issues.map((issue) => issue.message);
    expect(messages).toContain('El título no puede superar los 300 caracteres.');
    expect(messages).toContain('Ingresá una fecha válida con el formato dd/mm/aaaa.');
  });

  it('rechaza más de 20 autores', () => {
    const authors = Array.from({ length: 21 }, (_, index) =>
      fromExisting({ id: index + 1, fullName: `A${index}` }),
    );

    const result = workFormSchema.safeParse({ title: 'x', publicationDate: dayjs('2000-01-01'), authors });

    expect(result.error!.issues[0]!.message).toBe('Una obra puede tener como máximo 20 autores.');
  });

  it('recorta el título al validar', () => {
    const result = workFormSchema.parse({
      title: '  Rayuela  ',
      publicationDate: dayjs('1963-06-28'),
      authors: [cortazar],
    });

    expect(result.title).toBe('Rayuela');
  });
});

describe('conversión del formulario', () => {
  it('arma el request con autores existentes y nuevos', () => {
    const request = toWorkRequest({
      title: 'Rayuela',
      publicationDate: dayjs('1963-06-28'),
      authors: [cortazar, fromNewName('  Nuevo   Autor ')],
    });

    expect(request).toEqual({
      title: 'Rayuela',
      publicationDate: '1963-06-28',
      authors: [{ id: 2 }, { name: 'Nuevo Autor' }],
    });
  });

  it('carga una obra existente en el formulario', () => {
    const values = toFormValues({
      id: 1,
      title: 'Rayuela',
      publicationDate: '1963-06-28',
      authors: [{ id: 2, fullName: 'Julio Cortázar' }],
      authorCount: 1,
      versionNumber: 1,
      rowVersion: 'x',
    });

    expect(values.title).toBe('Rayuela');
    expect(values.publicationDate?.format('DD/MM/YYYY')).toBe('28/06/1963');
    expect(values.authors).toEqual([cortazar]);
  });

  it('la huella ignora mayúsculas, espacios y orden de autores', () => {
    const original = { title: 'Rayuela', publicationDate: dayjs('1963-06-28'), authors: [cortazar, borges] };
    const same = { title: '  RAYUELA ', publicationDate: dayjs('1963-06-28'), authors: [borges, cortazar] };
    const changed = { ...original, publicationDate: dayjs('1963-06-29') };

    expect(getFormFingerprint(same)).toBe(getFormFingerprint(original));
    expect(getFormFingerprint(changed)).not.toBe(getFormFingerprint(original));
    expect(getFormFingerprint(emptyWorkForm)).not.toBe(getFormFingerprint(original));
  });
});

describe('selectedAuthors', () => {
  it('no agrega duplicados por id ni por nombre normalizado', () => {
    let selected = addAuthor([], cortazar);
    selected = addAuthor(selected, cortazar);
    selected = addAuthor(selected, fromNewName('Nuevo'));
    selected = addAuthor(selected, fromNewName('NUEVO'));

    expect(selected).toHaveLength(2);
  });

  it('reemplaza un autor nuevo por el existente con el mismo nombre', () => {
    const selected = addAuthor([fromNewName('julio cortazar')], cortazar);

    expect(selected).toEqual([cortazar]);
  });

  it('quita autores y genera claves estables', () => {
    expect(removeAuthor([cortazar, borges], cortazar)).toEqual([borges]);
    expect(getAuthorKey(cortazar)).toBe('id:2');
    expect(getAuthorKey(fromNewName('Ana Pérez'))).toBe('new:ana perez');
    expect(toAuthorInputs([borges])).toEqual([{ id: 3 }]);
  });
});
