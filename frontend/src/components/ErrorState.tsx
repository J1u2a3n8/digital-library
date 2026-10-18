import { Alert, Button } from '@mui/material';

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Alert
      severity="error"
      variant="outlined"
      action={
        <Button color="inherit" onClick={onRetry}>
          Reintentar
        </Button>
      }
    >
      {message}
    </Alert>
  );
}
