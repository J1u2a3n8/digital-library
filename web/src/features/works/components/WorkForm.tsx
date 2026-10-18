import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ApiError } from '../../../api/apiClient';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { displayDateFormat } from '../../../utils/dates';
import { AuthorPicker } from '../../authors/AuthorPicker';
import {
  getFormFingerprint,
  titleMaxLength,
  workFormSchema,
  type WorkFormOutput,
  type WorkFormValues,
} from '../workForm';

interface WorkFormProps {
  initialValues: WorkFormValues;
  /** En edición, Guardar queda deshabilitado mientras no haya cambios. */
  requireChanges: boolean;
  onSubmit: (values: WorkFormOutput) => Promise<void>;
  onCancel: () => void;
}

const serverFields = ['title', 'publicationDate', 'authors'] as const;

export function WorkForm({ initialValues, requireChanges, onSubmit, onCancel }: WorkFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<WorkFormValues, unknown, WorkFormOutput>({
    resolver: zodResolver(workFormSchema),
    defaultValues: initialValues,
  });

  // Cuando llegan datos nuevos (recargar después de un 409, o luego de guardar) se reinicia el formulario.
  useEffect(() => reset(initialValues), [initialValues, reset]);

  const currentValues = useWatch({ control }) as WorkFormValues;
  const hasChanges = getFormFingerprint(currentValues) !== getFormFingerprint(initialValues);

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        let mappedToField = false;
        for (const field of serverFields) {
          const message = error.fieldErrors[field]?.[0];
          if (message) {
            setError(field, { message });
            mappedToField = true;
          }
        }
        if (!mappedToField) setFormError(error.message);
      } else {
        setFormError(error instanceof Error ? error.message : 'No se pudo guardar.');
      }
    }
  });

  const cancel = () => (hasChanges ? setIsConfirmingCancel(true) : onCancel());

  return (
    <Box component="form" onSubmit={submit} noValidate aria-label="Datos de la obra">
      {formError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {formError}
        </Alert>
      )}

      <Box
        sx={{
          display: 'grid',
          gap: { xs: 3, md: 4 },
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <Paper sx={{ p: { xs: 2, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant="h3" component="h2" sx={{ mb: 2 }}>
            Datos de la obra
          </Typography>
          <Stack spacing={3}>
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  id="work-title"
                  label="Título"
                  required
                  placeholder="Ej.: Cien años de soledad"
                  error={Boolean(errors.title)}
                  helperText={errors.title?.message ?? `Máximo ${titleMaxLength} caracteres.`}
                  slotProps={{ htmlInput: { maxLength: titleMaxLength } }}
                  fullWidth
                />
              )}
            />
            <Controller
              name="publicationDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  label="Fecha de publicación"
                  format={displayDateFormat}
                  value={field.value ?? null}
                  onChange={(date) => field.onChange(date)}
                  disableFuture={false}
                  enableAccessibleFieldDOMStructure={false}
                  slotProps={{
                    textField: {
                      id: 'work-publication-date',
                      required: true,
                      fullWidth: true,
                      error: Boolean(errors.publicationDate),
                      helperText: errors.publicationDate?.message ?? 'Formato dd/mm/aaaa.',
                    },
                  }}
                />
              )}
            />
          </Stack>
        </Paper>

        <Paper sx={{ p: { xs: 2, md: 3 }, border: 1, borderColor: 'divider', borderRadius: 3 }}>
          <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
            Autores
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Elegí autores del catálogo o creá uno nuevo si no aparece.
          </Typography>
          <Controller
            name="authors"
            control={control}
            render={({ field }) => (
              <AuthorPicker
                value={field.value ?? []}
                onChange={(authors) => field.onChange(authors)}
                error={errors.authors?.message ?? errors.authors?.root?.message}
              />
            )}
          />
        </Paper>
      </Box>

      <Stack
        direction={{ xs: 'column-reverse', sm: 'row' }}
        spacing={1.5}
        sx={{ mt: 4, justifyContent: 'flex-end' }}
      >
        <Button variant="outlined" color="inherit" onClick={cancel} sx={{ minWidth: 120 }}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || (requireChanges && !hasChanges)}
          sx={{ minWidth: 120 }}
        >
          {isSubmitting ? 'Guardando…' : 'Guardar'}
        </Button>
      </Stack>

      <ConfirmDialog
        open={isConfirmingCancel}
        title="¿Descartar los cambios?"
        message="Los cambios que hiciste en esta obra no se van a guardar."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        confirmColor="error"
        onConfirm={() => {
          setIsConfirmingCancel(false);
          onCancel();
        }}
        onCancel={() => setIsConfirmingCancel(false)}
      />
    </Box>
  );
}
