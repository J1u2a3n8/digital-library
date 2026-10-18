import { Chip, Stack } from '@mui/material';
import type { WorkQuery } from '../../../api/types';
import { formatPublicationDate } from '../../../utils/dates';
import type { WorkFilters } from '../workListState';

interface ActiveFilterChipsProps {
  query: WorkQuery;
  onRemove: (filter: keyof WorkFilters) => void;
}

export function ActiveFilterChips({ query, onRemove }: ActiveFilterChipsProps) {
  const chips: { key: keyof WorkFilters; label: string }[] = [];

  if (query.title) chips.push({ key: 'title', label: `Título: ${query.title}` });
  if (query.authorName) chips.push({ key: 'authorName', label: `Autor: ${query.authorName}` });
  if (query.publicationDate) {
    chips.push({ key: 'publicationDate', label: `Fecha: ${formatPublicationDate(query.publicationDate)}` });
  }
  if (query.minimumAuthorCount) {
    chips.push({ key: 'minimumAuthorCount', label: `Autores: ${query.minimumAuthorCount}+` });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }} aria-label="Filtros activos">
      {chips.map((chip) => (
        <Chip
          key={chip.key}
          label={chip.label}
          variant="outlined"
          onClick={() => onRemove(chip.key)}
          onDelete={() => onRemove(chip.key)}
          aria-label={`Quitar filtro ${chip.label}`}
          sx={{ bgcolor: 'background.paper' }}
        />
      ))}
    </Stack>
  );
}
