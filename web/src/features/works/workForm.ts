import dayjs, { type Dayjs } from 'dayjs';
import { z } from 'zod';
import type { CreateWorkRequest, WorkDetails } from '../../api/types';
import { fromExisting, maxAuthors, toAuthorInputs, type SelectedAuthor } from '../authors/selectedAuthors';
import { parseApiDate, toApiDate } from '../../utils/dates';
import { cleanSpaces, normalizeText } from '../../utils/text';

export const titleMaxLength = 300;

export const workFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'El título es obligatorio.')
    .max(titleMaxLength, `El título no puede superar los ${titleMaxLength} caracteres.`),
  publicationDate: z.custom<Dayjs | null>().superRefine((date, context) => {
    if (date === null || date === undefined) {
      context.addIssue({ code: 'custom', message: 'La fecha de publicación es obligatoria.' });
    } else if (!dayjs.isDayjs(date) || !date.isValid()) {
      context.addIssue({ code: 'custom', message: 'Ingresá una fecha válida con el formato dd/mm/aaaa.' });
    }
  }),
  authors: z
    .array(z.custom<SelectedAuthor>())
    .min(1, 'Seleccioná al menos un autor.')
    .max(maxAuthors, `Una obra puede tener como máximo ${maxAuthors} autores.`),
});

export type WorkFormValues = z.input<typeof workFormSchema>;
export type WorkFormOutput = z.output<typeof workFormSchema>;

export const emptyWorkForm: WorkFormValues = {
  title: '',
  publicationDate: null,
  authors: [],
};

export function toFormValues(work: WorkDetails): WorkFormValues {
  return {
    title: work.title,
    publicationDate: parseApiDate(work.publicationDate),
    authors: work.authors.map(fromExisting),
  };
}

export function toWorkRequest(values: WorkFormOutput): CreateWorkRequest {
  return {
    title: values.title,
    publicationDate: toApiDate(values.publicationDate)!,
    authors: toAuthorInputs(values.authors),
  };
}

/**
 * Huella comparable del formulario. Sigue las mismas reglas que el backend para decidir
 * si hay cambios: título normalizado, fecha y autores sin importar el orden.
 */
export function getFormFingerprint(values: WorkFormValues): string {
  const authorKeys = values.authors
    .map((author) =>
      author.kind === 'existing' ? `id:${author.id}` : `new:${normalizeText(author.fullName)}`,
    )
    .sort();

  return JSON.stringify({
    title: normalizeText(cleanSpaces(values.title ?? '')),
    publicationDate: values.publicationDate?.isValid()
      ? toApiDate(values.publicationDate)
      : String(values.publicationDate),
    authors: authorKeys,
  });
}
