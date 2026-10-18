import HistoryIcon from '@mui/icons-material/History';
import { Button, Skeleton, Stack } from '@mui/material';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError } from '../api/apiClient';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/toastContext';
import { WorkForm } from '../features/works/components/WorkForm';
import { WorkHistoryDrawer } from '../features/works/components/WorkHistoryDrawer';
import { useUpdateWork, useWork } from '../features/works/useWorkQueries';
import { toFormValues, toWorkRequest } from '../features/works/workForm';

export function WorkEditPage() {
  const params = useParams();
  const workId = Number(params.id);
  const navigate = useNavigate();
  const showToast = useToast();
  const workQuery = useWork(workId);
  const updateWork = useUpdateWork(workId);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);

  const work = workQuery.data;
  // Se recalcula solo cuando cambia la versión guardada (rowVersion), no en cada render.
  const initialValues = useMemo(() => (work ? toFormValues(work) : null), [work]);

  const header = (
    <PageHeader
      title="Editar obra"
      subtitle={
        work ? `Versión ${work.versionNumber} · cada cambio guardado crea una versión nueva.` : undefined
      }
      backTo="/works"
      actions={
        work && (
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<HistoryIcon />}
            onClick={() => setIsHistoryOpen(true)}
          >
            Ver historial
          </Button>
        )
      }
    />
  );

  if (workQuery.isPending) {
    return (
      <>
        {header}
        <Stack spacing={2} aria-label="Cargando obra">
          <Skeleton variant="rounded" height={56} />
          <Skeleton variant="rounded" height={240} />
        </Stack>
      </>
    );
  }

  if (workQuery.isError) {
    const isNotFound = workQuery.error instanceof ApiError && workQuery.error.isNotFound;
    return (
      <>
        {header}
        {isNotFound ? (
          <EmptyState
            title="No encontramos esta obra"
            description="Puede que el enlace esté mal escrito."
            action={
              <Button component={Link} to="/works" variant="contained">
                Ir al listado
              </Button>
            }
          />
        ) : (
          <ErrorState message={workQuery.error.message} onRetry={() => workQuery.refetch()} />
        )}
      </>
    );
  }

  return (
    <>
      {header}
      <WorkForm
        initialValues={initialValues!}
        requireChanges
        onSubmit={async (values) => {
          try {
            await updateWork.mutateAsync({ ...toWorkRequest(values), rowVersion: work!.rowVersion });
            showToast('Cambios guardados');
          } catch (error) {
            if (error instanceof ApiError && error.isConflict) {
              setHasConflict(true);
              return;
            }
            throw error;
          }
        }}
        onCancel={() => navigate('/works')}
      />

      <ConfirmDialog
        open={hasConflict}
        title="La obra fue modificada por otro usuario"
        message="Alguien guardó cambios mientras editabas. Recargá para ver la versión actual; tus cambios sin guardar se van a perder."
        confirmLabel="Recargar"
        cancelLabel="Cancelar"
        onConfirm={async () => {
          setHasConflict(false);
          await workQuery.refetch();
        }}
        onCancel={() => setHasConflict(false)}
      />

      <WorkHistoryDrawer
        workId={isHistoryOpen ? workId : null}
        workTitle={work?.title}
        onClose={() => setIsHistoryOpen(false)}
      />
    </>
  );
}
