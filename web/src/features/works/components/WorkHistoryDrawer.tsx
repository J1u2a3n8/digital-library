import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import {
  Box,
  Chip,
  Drawer,
  IconButton,
  Skeleton,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useId } from 'react';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorState } from '../../../components/ErrorState';
import { formatDateTime, formatPublicationDate } from '../../../utils/dates';
import { useWorkHistory } from '../useWorkQueries';
import { AuthorChip } from '../../authors/AuthorChip';

interface WorkHistoryDrawerProps {
  workId: number | null;
  workTitle?: string;
  onClose: () => void;
}

/** Historial de versiones de una obra, en forma de línea de tiempo. */
export function WorkHistoryDrawer({ workId, workTitle, onClose }: WorkHistoryDrawerProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const titleId = useId();
  const historyQuery = useWorkHistory(workId);

  return (
    <Drawer
      anchor="right"
      open={workId !== null}
      onClose={onClose}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-labelledby': titleId,
          sx: { width: isMobile ? '100%' : 420, borderRadius: isMobile ? 0 : undefined },
        } as object,
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: 'flex-start', p: 3, pb: 2, borderBottom: 1, borderColor: 'divider' }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id={titleId} variant="h2" component="h2">
            Historial
          </Typography>
          {workTitle && (
            <Typography color="text.secondary" noWrap>
              {workTitle}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar historial" edge="end">
          <CloseIcon />
        </IconButton>
      </Stack>

      <Box sx={{ p: 3, overflowY: 'auto' }}>
        {historyQuery.isPending && workId !== null && (
          <Stack spacing={2} aria-label="Cargando historial">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} variant="rounded" height={96} />
            ))}
          </Stack>
        )}

        {historyQuery.isError && (
          <ErrorState message={historyQuery.error.message} onRetry={() => historyQuery.refetch()} />
        )}

        {historyQuery.isSuccess && historyQuery.data.length === 0 && (
          <EmptyState
            icon={<HistoryIcon />}
            title="Sin versiones"
            description="Esta obra todavía no tiene versiones registradas."
          />
        )}

        {historyQuery.isSuccess && historyQuery.data.length > 0 && (
          <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {historyQuery.data.map((version, index) => (
              <Box
                component="li"
                key={version.versionNumber}
                sx={{
                  position: 'relative',
                  pl: 3,
                  pb: index === historyQuery.data.length - 1 ? 0 : 3,
                  // Línea de la timeline
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    left: 5,
                    top: 8,
                    bottom: 0,
                    borderLeft: index === historyQuery.data.length - 1 ? 0 : '1px solid',
                    borderColor: 'divider',
                  },
                }}
              >
                <Box
                  aria-hidden
                  sx={{
                    position: 'absolute',
                    left: 0,
                    top: 6,
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    border: 2,
                    borderColor: version.isCurrent ? 'primary.main' : 'divider',
                    bgcolor: version.isCurrent ? 'primary.main' : 'background.paper',
                  }}
                />
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                  <Typography component="h3" sx={{ fontWeight: 600 }}>
                    Versión {version.versionNumber}
                  </Typography>
                  {version.isCurrent && <Chip label="Actual" size="small" color="secondary" />}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {formatDateTime(version.createdAtUtc)} ·{' '}
                  {version.changeKind === 'Created' ? 'Creada' : 'Editada'} por{' '}
                  <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                    {version.changedBy}
                  </Box>
                </Typography>

                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.5,
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'background.default',
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>{version.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Publicada el {formatPublicationDate(version.publicationDate)}
                  </Typography>
                  <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 0.75 }}>
                    {version.authors.map((author) => (
                      <AuthorChip key={author.id} name={author.fullName} size="small" />
                    ))}
                  </Stack>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Drawer>
  );
}
