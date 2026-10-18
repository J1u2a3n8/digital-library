import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/es';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);
dayjs.locale('es');

export const apiDateFormat = 'YYYY-MM-DD';
export const displayDateFormat = 'DD/MM/YYYY';

/**
 * Lee 'YYYY-MM-DD' como fecha local, sin pasar por new Date() (que la tomaría como UTC
 * y podría mostrar el día anterior según la zona horaria).
 */
export function parseApiDate(value: string | undefined | null): Dayjs | null {
  if (!value) {
    return null;
  }

  const date = dayjs(value, apiDateFormat, true);
  return date.isValid() ? date : null;
}

export function toApiDate(date: Dayjs | null | undefined): string | undefined {
  return date && date.isValid() ? date.format(apiDateFormat) : undefined;
}

/** '1967-05-30' → '30/05/1967'. */
export function formatPublicationDate(value: string): string {
  return parseApiDate(value)?.format(displayDateFormat) ?? value;
}

/** Fecha y hora local de un timestamp UTC, para el historial. */
export function formatDateTime(utcValue: string): string {
  return dayjs(utcValue).format('DD/MM/YYYY HH:mm');
}
