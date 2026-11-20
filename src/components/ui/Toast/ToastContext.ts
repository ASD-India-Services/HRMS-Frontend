import { createContext, useContext } from 'react';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ToastContextValue {
  showToast: (message: string, severity?: ToastSeverity) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
