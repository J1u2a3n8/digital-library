import AddIcon from '@mui/icons-material/Add';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import {
  Button,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import type { WorkListItem, WorkQuery } from '../api/types';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { PageHeader } from '../components/PageHeader';
import { ActiveFilterChips } from '../features/works/components/ActiveFilterChips';
import { WorkCards } from '../features/works/components/WorkCards';
import { WorkFiltersBar } from '../features/works/components/WorkFiltersBar';
import { WorkHistoryDrawer } from '../features/works/components/WorkHistoryDrawer';
import { WorksPagination } from '../features/works/components/WorksPagination';
import { WorksTable } from '../features/works/components/WorksTable';
import { useWorksList } from '../features/works/useWorkQueries';
import {
  applyFilters,
  clearFilters,
  hasActiveFilters,
  parseWorkQuery,
  toSearchParams,
  toggleSort,
} from '../features/works/workListState';
import { pluralize } from '../utils/text';

function LoadingRows({ isMobile }: { isMobile: boolean }) {
  if (isMobile) {
    return (
      <Stack spacing={1.5} aria-label="Cargando obras">
        {[1, 2, 3, 4].map((row) => (
          <Skeleton key={row} variant="rounded" height={88} />
        ))}
      </Stack>
    );
  }

  return (
    <Table aria-label="Cargando obras">
      <TableBody>
        {[1, 2, 3, 4, 5].map((row) => (
          <TableRow key={row}>
            <TableCell>
              <Skeleton width="60%" />
            </TableCell>
            <TableCell sx={{ width: '22%' }}>
              <Skeleton width="70%" />
            </TableCell>
            <TableCell sx={{ width: '12%' }}>
              <Skeleton width="30%" />
            </TableCell>
            <TableCell sx={{ width: '14%' }}>
              <Skeleton width="60%" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function WorksListPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [searchParams, setSearchParams] = useSearchParams();
  const query = parseWorkQuery(searchParams);
  const worksQuery = useWorksList(query);
  const [historyWork, setHistoryWork] = useState<WorkListItem | null>(null);

  // Todo el estado del listado vive en la URL: se puede compartir, refrescar y volver atrás.
  // Se calcula sobre la URL más reciente, por si cambió entre el render y el evento.
  const updateQuery = (change: (current: WorkQuery) => WorkQuery, replace = false) => {
    setSearchParams((current) => toSearchParams(change(parseWorkQuery(current))), { replace });
  };

  const data = worksQuery.data;
  const filtersActive = hasActiveFilters(query);

  // Si la URL pide una página que ya no existe (por ejemplo, tras filtrar), se va a la última.
  useEffect(() => {
    if (data && data.totalPages > 0 && query.pageNumber > data.totalPages) {
      setSearchParams(toSearchParams({ ...query, pageNumber: data.totalPages }), { replace: true });
    }
  }, [data, query, setSearchParams]);

  const renderContent = () => {
    if (worksQuery.isPending) {
      return <LoadingRows isMobile={isMobile} />;
    }

    if (worksQuery.isError && !data) {
      return <ErrorState message={worksQuery.error.message} onRetry={() => worksQuery.refetch()} />;
    }

    if (!data || data.items.length === 0) {
      return filtersActive ? (
        <EmptyState
          icon={<SearchOffIcon />}
          title="No encontramos obras con esos filtros"
          description="Probá quitar alguno de los filtros o buscar con otro texto."
          action={
            <Button variant="outlined" color="inherit" onClick={() => updateQuery(clearFilters, true)}>
              Limpiar filtros
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="Todavía no hay obras"
          description="Cuando registres la primera obra, va a aparecer en este catálogo."
          action={
            <Button component={Link} to="/works/new" variant="contained" startIcon={<AddIcon />}>
              Crear la primera obra
            </Button>
          }
        />
      );
    }

    return (
      <Stack spacing={3}>
        {worksQuery.isError && (
          <ErrorState message={worksQuery.error.message} onRetry={() => worksQuery.refetch()} />
        )}
        {isMobile ? (
          <WorkCards works={data.items} onShowHistory={setHistoryWork} />
        ) : (
          <WorksTable
            works={data.items}
            query={query}
            onSort={(sortBy) => updateQuery((current) => toggleSort(current, sortBy))}
            onShowHistory={setHistoryWork}
          />
        )}
        <WorksPagination
          pageNumber={query.pageNumber}
          pageSize={query.pageSize}
          totalItems={data.totalItems}
          totalPages={data.totalPages}
          onPageChange={(pageNumber) => updateQuery((current) => ({ ...current, pageNumber }))}
          onPageSizeChange={(pageSize) => updateQuery((current) => ({ ...current, pageSize, pageNumber: 1 }))}
        />
      </Stack>
    );
  };

  return (
    <>
      <PageHeader
        title="Obras"
        subtitle="Explorá, filtrá y ordená el catálogo."
        actions={
          isMobile && (
            <Button component={Link} to="/works/new" variant="contained" startIcon={<AddIcon />} fullWidth>
              Nueva obra
            </Button>
          )
        }
      />

      <Stack spacing={3}>
        <WorkFiltersBar
          query={query}
          onFiltersChange={(changes) => updateQuery((current) => applyFilters(current, changes), true)}
          onClear={() => updateQuery(clearFilters, true)}
        />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}
        >
          <ActiveFilterChips
            query={query}
            onRemove={(filter) =>
              updateQuery((current) => applyFilters(current, { [filter]: undefined }), true)
            }
          />
          <Typography
            aria-live="polite"
            role="status"
            sx={{ fontWeight: 600, ml: { sm: 'auto' }, whiteSpace: 'nowrap' }}
          >
            {data ? pluralize(data.totalItems, 'obra', 'obras') : ' '}
          </Typography>
        </Stack>

        <Paper
          sx={{
            p: isMobile ? 0 : { md: 1 },
            border: isMobile ? 0 : 1,
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: isMobile ? 'transparent' : 'background.paper',
            opacity: worksQuery.isPlaceholderData ? 0.6 : 1,
            transition: 'opacity 120ms',
          }}
        >
          {renderContent()}
        </Paper>
      </Stack>

      <WorkHistoryDrawer
        workId={historyWork?.id ?? null}
        workTitle={historyWork?.title}
        onClose={() => setHistoryWork(null)}
      />
    </>
  );
}
