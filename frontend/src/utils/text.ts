/**
 * Misma regla que TextNormalizer en el backend: sin espacios extra, sin tildes y en minúsculas.
 * Sirve para detectar en el cliente si un autor ya existe o ya fue agregado.
 */
export function normalizeText(text: string): string {
  return cleanSpaces(text)
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .normalize('NFC')
    .toLowerCase();
}

export function cleanSpaces(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/** "Gabriel García Márquez" → "GG". */
export function getInitials(fullName: string): string {
  const words = cleanSpaces(fullName).split(' ').filter(Boolean);
  const initials = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return initials.map((word) => word[0]!.toUpperCase()).join('');
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
