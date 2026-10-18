import { createContext, useContext } from 'react';

export type ToastSeverity = 'success' | 'error' | 'info';

export type ShowToast = (message: string, severity?: ToastSeverity) => void;

export const ToastContext = createContext<ShowToast | null>(null);

/** Muestra un aviso breve abajo a la derecha. */
export function useToast(): ShowToast {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast debe usarse dentro de ToastProvider');
  }
  return context;
}
