import SearchIcon from '@mui/icons-material/Search';
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useEffect, useRef, useState } from 'react';
import type { WorkQuery } from '../../../api/types';
import { displayDateFormat, parseApiDate, toApiDate } from '../../../utils/dates';
import { minimumAuthorOptions, type WorkFilters } from '../workListState';

export const filterDebounceMs = 300;

interface WorkFiltersBarProps {
  query: WorkQuery;
  onFiltersChange: (changes: Partial<WorkFilters>) => void;
  onClear: () => void;
}

const toFilterText = (text: string) => text.trim() || undefined;

/**
 * Filtros acumulativos. Los textos se aplican solos a los 300 ms de dejar de escribir;
 * "Buscar" los aplica en el momento. Fecha y mínimo de autores se aplican al elegirlos.
 */
export function WorkFiltersBar({ query, onFiltersChange, onClear }: WorkFiltersBarProps) {
  const [titleText, setTitleText] = useState(query.title ?? '');
  const [authorText, setAuthorText] = useState(query.authorName ?? '');
  const [syncedQuery, setSyncedQuery] = useState({ title: query.title, authorName: query.authorName });
  const debounceTimer = useRef<number | undefined>(undefined);
  // El temporizador se dispara después de otros renders: siempre debe usar la URL y el callback más recientes,
  // si no, podría pisar un filtro aplicado mientras tanto (por ejemplo, el mínimo de autores).
  const latest = useRef({ query, onFiltersChange });

  useEffect(() => {
    latest.current = { query, onFiltersChange };
  });

  // Si la URL cambia desde afuera (chip quitado, limpiar, botón atrás), los campos se actualizan.
  if (syncedQuery.title !== query.title || syncedQuery.authorName !== query.authorName) {
    setSyncedQuery({ title: query.title, authorName: query.authorName });
    setTitleText(query.title ?? '');
    setAuthorText(query.authorName ?? '');
  }

  useEffect(() => () => window.clearTimeout(debounceTimer.current), []);

  const applyTexts = (title: string, authorName: string) => {
    window.clearTimeout(debounceTimer.current);
    const { query: currentQuery, onFiltersChange: applyChanges } = latest.current;
    const changes = { title: toFilterText(title), authorName: toFilterText(authorName) };
    if (changes.title !== currentQuery.title || changes.authorName !== currentQuery.authorName) {
      applyChanges(changes);
    }
  };

  const scheduleTexts = (title: string, authorName: string) => {
    window.clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => applyTexts(title, authorName), filterDebounceMs);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    applyTexts(titleText, authorText);
  };

  return (
    <Paper
      component="form"
      role="search"
      aria-label="Filtros de obras"
      onSubmit={submit}
      sx={{ p: { xs: 2, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 1.5 }}
    >
      <Typography variant="subtitle2" component="h2" sx={{ mb: 2, color: 'text.secondary' }}>
        Filtros
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2fr 2fr 1.4fr 1.2fr' },
          alignItems: 'end',
        }}
      >
        <TextField
          id="filter-title"
          label="Título"
          placeholder="Ej.: Cien años de soledad"
          value={titleText}
          onChange={(event) => {
            setTitleText(event.target.value);
            scheduleTexts(event.target.value, authorText);
          }}
          fullWidth
        />
        <TextField
          id="filter-author"
          label="Autor"
          placeholder="Ej.: Cortázar"
          value={authorText}
          onChange={(event) => {
            setAuthorText(event.target.value);
            scheduleTexts(titleText, event.target.value);
          }}
          fullWidth
        />
        <DatePicker
          label="Fecha de publicación"
          format={displayDateFormat}
          value={parseApiDate(query.publicationDate)}
          onChange={(date) => {
            if (date === null || date.isValid()) {
              onFiltersChange({ publicationDate: toApiDate(date) });
            }
          }}
          enableAccessibleFieldDOMStructure={false}
          slotProps={{
            textField: { id: 'filter-date', fullWidth: true },
            field: { clearable: true },
          }}
        />
        <TextField
          id="filter-minimum-authors"
          select
          label="Mínimo de autores"
          value={query.minimumAuthorCount ?? ''}
          onChange={(event) => {
            const value = event.target.value as string | number;
            onFiltersChange({ minimumAuthorCount: value === '' ? undefined : Number(value) });
          }}
          fullWidth
          slotProps={{ select: { displayEmpty: true } }}
        >
          <MenuItem value="">Cualquiera</MenuItem>
          {minimumAuthorOptions.map((count) => (
            <MenuItem key={count} value={count}>
              {count}+
            </MenuItem>
          ))}
        </TextField>
      </Box>

      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        spacing={1}
        sx={{ mt: 2, justifyContent: 'flex-end' }}
      >
        <Button
          type="button"
          variant="text"
          color="primary"
          onClick={() => {
            window.clearTimeout(debounceTimer.current);
            onClear();
          }}
        >
          Limpiar filtros
        </Button>
        <Button type="submit" variant="contained" startIcon={<SearchIcon />}>
          Buscar
        </Button>
      </Stack>
    </Paper>
  );
}
