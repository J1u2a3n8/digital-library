import type { Author, AuthorInput } from '../../api/types';
import { cleanSpaces, normalizeText } from '../../utils/text';

/** Autor elegido en el formulario: uno del catálogo o uno nuevo que se creará al guardar. */
export type SelectedAuthor =
  { kind: 'existing'; id: number; fullName: string } | { kind: 'new'; fullName: string };

export const maxAuthors = 20;

export function fromExisting(author: Author): SelectedAuthor {
  return { kind: 'existing', id: author.id, fullName: author.fullName };
}

export function fromNewName(name: string): SelectedAuthor {
  return { kind: 'new', fullName: cleanSpaces(name) };
}

export function getAuthorKey(author: SelectedAuthor): string {
  return author.kind === 'existing' ? `id:${author.id}` : `new:${normalizeText(author.fullName)}`;
}

export function isSameAuthor(first: SelectedAuthor, second: SelectedAuthor): boolean {
  if (first.kind === 'existing' && second.kind === 'existing') {
    return first.id === second.id;
  }
  return normalizeText(first.fullName) === normalizeText(second.fullName);
}

/** Agrega un autor sin duplicar. Si ya estaba como "nuevo" y ahora llega el existente, se reemplaza. */
export function addAuthor(selected: SelectedAuthor[], author: SelectedAuthor): SelectedAuthor[] {
  const index = selected.findIndex((current) => isSameAuthor(current, author));

  if (index === -1) {
    return [...selected, author];
  }

  if (selected[index]!.kind === 'new' && author.kind === 'existing') {
    return selected.map((current, currentIndex) => (currentIndex === index ? author : current));
  }

  return selected;
}

export function removeAuthor(selected: SelectedAuthor[], author: SelectedAuthor): SelectedAuthor[] {
  return selected.filter((current) => !isSameAuthor(current, author));
}

export function toAuthorInputs(selected: SelectedAuthor[]): AuthorInput[] {
  return selected.map((author) =>
    author.kind === 'existing' ? { id: author.id } : { name: author.fullName },
  );
}
