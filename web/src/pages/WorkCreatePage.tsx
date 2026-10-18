import { useNavigate } from 'react-router';
import { PageHeader } from '../components/PageHeader';
import { useToast } from '../components/toastContext';
import { WorkForm } from '../features/works/components/WorkForm';
import { useCreateWork } from '../features/works/useWorkQueries';
import { emptyWorkForm, toWorkRequest } from '../features/works/workForm';

export function WorkCreatePage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const createWork = useCreateWork();

  return (
    <>
      <PageHeader
        title="Agregar obra"
        subtitle="Registrá una obra con uno o varios autores."
        backTo="/works"
      />
      <WorkForm
        initialValues={emptyWorkForm}
        requireChanges={false}
        onSubmit={async (values) => {
          await createWork.mutateAsync(toWorkRequest(values));
          showToast('Obra creada');
          navigate('/works');
        }}
        onCancel={() => navigate('/works')}
      />
    </>
  );
}
