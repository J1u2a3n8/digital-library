import SearchOffIcon from '@mui/icons-material/SearchOff';
import { Button } from '@mui/material';
import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState';

export function NotFoundPage() {
  return (
    <EmptyState
      icon={<SearchOffIcon />}
      title="Página no encontrada"
      description="La dirección que abriste no existe en la biblioteca."
      action={
        <Button component={Link} to="/works" variant="contained">
          Ir a Obras
        </Button>
      }
    />
  );
}
