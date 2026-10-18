import { Alert, Snackbar } from '@mui/material';
import { useCallback, useState, type ReactNode } from 'react';
import { ToastContext, type ShowToast, type ToastSeverity } from './toastContext';

interface Toast {
  id: number;
  message: string;
  severity: ToastSeverity;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback<ShowToast>((message, severity = 'success') => {
    setToast({ id: Date.now(), message, severity });
  }, []);

  const close = () => setToast(null);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <Snackbar
        key={toast?.id}
        open={toast !== null}
        autoHideDuration={4000}
        onClose={(_, reason) => reason !== 'clickaway' && close()}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast ? (
          <Alert severity={toast.severity} variant="filled" onClose={close} sx={{ minWidth: 280 }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </ToastContext.Provider>
  );
}
