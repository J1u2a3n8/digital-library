import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormHelperText,
  InputAdornment,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { authorsApi } from '../../api/libraryApi';
import { cleanSpaces, normalizeText } from '../../utils/text';
import { useDebouncedValue } from '../../utils/useDebouncedValue';
import { AuthorChip } from './AuthorChip';
import {
  addAuthor,
  fromExisting,
  fromNewName,
  getAuthorKey,
  isSameAuthor,
  maxAuthors,
  removeAuthor,
  type SelectedAuthor,
} from './selectedAuthors';

interface AuthorPickerProps {
  value: SelectedAuthor[];
  onChange: (authors: SelectedAuthor[]) => void;
  error?: string;
}

const minimumNewNameLength = 2;
const maximumNewNameLength = 200;

/**
 * Panel de autores: buscar en el catálogo, marcar con checkbox o crear uno nuevo
 * sin salir del formulario. Evita duplicados comparando nombres normalizados.
 */
export function AuthorPicker({ value, onChange, error }: AuthorPickerProps) {
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);

  const authorsQuery = useQuery({
    queryKey: ['authors', 'search', debouncedSearch.trim()],
    queryFn: ({ signal }) => authorsApi.search(debouncedSearch, 10, signal),
  });

  const results = authorsQuery.data ?? [];
  const cleanSearch = cleanSpaces(searchText);
  const normalizedSearch = normalizeText(searchText);
  const isSearchUpToDate = debouncedSearch === searchText;
  const exactMatch = isSearchUpToDate
    ? results.find((author) => normalizeText(author.fullName) === normalizedSearch)
    : undefined;
  const alreadySelectedAsNew = value.some(
    (author) => author.kind === 'new' && normalizeText(author.fullName) === normalizedSearch,
  );
  const isFull = value.length >= maxAuthors;
  const canCreate =
    isSearchUpToDate &&
    !authorsQuery.isFetching &&
    cleanSearch.length >= minimumNewNameLength &&
    cleanSearch.length <= maximumNewNameLength &&
    !exactMatch &&
    !alreadySelectedAsNew;
  const catalogIsEmpty = authorsQuery.isSuccess && results.length === 0 && debouncedSearch.trim() === '';

  const isSelected = (author: SelectedAuthor) => value.some((current) => isSameAuthor(current, author));

  const toggle = (author: SelectedAuthor) => {
    if (isSelected(author)) {
      onChange(removeAuthor(value, author));
    } else if (!isFull) {
      onChange(addAuthor(value, author));
    }
  };

  const createNew = () => {
    if (!canCreate || isFull) return;
    onChange(addAuthor(value, fromNewName(cleanSearch)));
    setSearchText('');
  };

  return (
    <Stack spacing={1.5}>
      <TextField
        id="author-search"
        label="Buscar autor"
        placeholder="Escribí un nombre"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            // Enter crea el autor si no existe; nunca envía el formulario desde este campo.
            event.preventDefault();
            createNew();
          }
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        fullWidth
      />

      <Paper
        variant="outlined"
        sx={{ borderRadius: 1.5, overflow: 'hidden', borderColor: error ? 'error.main' : 'divider' }}
      >
        {authorsQuery.isPending && (
          <Stack spacing={1} sx={{ p: 2 }} aria-label="Cargando autores">
            <Skeleton height={28} />
            <Skeleton height={28} />
            <Skeleton height={28} />
          </Stack>
        )}

        {authorsQuery.isError && (
          <Alert
            severity="error"
            sx={{ m: 1 }}
            action={
              <Button color="inherit" size="small" onClick={() => authorsQuery.refetch()}>
                Reintentar
              </Button>
            }
          >
            No pudimos cargar los autores.
          </Alert>
        )}

        {catalogIsEmpty && (
          <Typography color="text.secondary" sx={{ p: 2 }}>
            Todavía no hay autores. Escribí un nombre arriba para crear el primero.
          </Typography>
        )}

        {authorsQuery.isSuccess && results.length > 0 && (
          <List
            dense
            disablePadding
            aria-label="Autores encontrados"
            sx={{ maxHeight: 264, overflowY: 'auto' }}
          >
            {results.map((author) => {
              const candidate = fromExisting(author);
              const checked = isSelected(candidate);
              const checkboxId = `author-option-${author.id}`;
              return (
                <ListItem key={author.id} disablePadding divider>
                  <ListItemButton
                    onClick={() => toggle(candidate)}
                    disabled={!checked && isFull}
                    sx={{ py: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Checkbox
                        edge="start"
                        checked={checked}
                        tabIndex={-1}
                        disableRipple
                        slotProps={{ input: { 'aria-labelledby': checkboxId } }}
                      />
                    </ListItemIcon>
                    <ListItemText id={checkboxId} primary={author.fullName} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}

        {authorsQuery.isSuccess && results.length === 0 && debouncedSearch.trim() !== '' && (
          <Typography color="text.secondary" sx={{ px: 2, pt: 2, pb: canCreate ? 0 : 2 }}>
            No hay autores que coincidan con “{debouncedSearch.trim()}”.
          </Typography>
        )}

        {exactMatch && (
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', px: 2, py: 1.5, color: 'success.main' }}
          >
            <CheckCircleOutlineIcon fontSize="small" />
            <Typography variant="body2">Ya existe: se usará ese autor.</Typography>
          </Stack>
        )}

        {alreadySelectedAsNew && cleanSearch && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
            Ese autor ya está en la lista de seleccionados.
          </Typography>
        )}

        {canCreate && (
          <Box sx={{ p: 1 }}>
            <Button
              startIcon={<AddIcon />}
              onClick={createNew}
              disabled={isFull}
              fullWidth
              sx={{ justifyContent: 'flex-start' }}
            >
              Crear autor “{cleanSearch}”
            </Button>
          </Box>
        )}
      </Paper>

      <Box>
        <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
          Seleccionados ({value.length})
        </Typography>
        {value.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Ningún autor seleccionado.
          </Typography>
        ) : (
          <Stack
            direction="row"
            useFlexGap
            sx={{ flexWrap: 'wrap', gap: 1 }}
            aria-label="Autores seleccionados"
          >
            {value.map((author) => (
              <AuthorChip
                key={getAuthorKey(author)}
                name={author.fullName}
                isNew={author.kind === 'new'}
                onDelete={() => onChange(removeAuthor(value, author))}
              />
            ))}
          </Stack>
        )}
        {isFull && <FormHelperText>Llegaste al máximo de {maxAuthors} autores.</FormHelperText>}
        {error && <FormHelperText error>{error}</FormHelperText>}
      </Box>
    </Stack>
  );
}
