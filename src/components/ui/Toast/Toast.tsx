/**
 * Toast — ToastProvider plus useToast, to replace window.alert().
 * Usage: const { showToast } = useToast(); showToast('Saved', 'success');
 */
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { ToastContext, type ToastSeverity } from './ToastContext';

interface ToastItem {
  id: number;
  message: string;
  severity: ToastSeverity;
}

const AUTO_DISMISS_MS = 5000;

const SEVERITY_CLASSES: Record<ToastSeverity, string> = {
  success: 'bg-success-lighter text-success-darker',
  info: 'bg-info-lighter text-info-darker',
  warning: 'bg-warning-lighter text-warning-darker',
  error: 'bg-error-lighter text-error-darker',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, severity: ToastSeverity = 'info') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, severity }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              role={t.severity === 'error' ? 'alert' : 'status'}
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded px-4 py-3 text-sm shadow-z20 ${SEVERITY_CLASSES[t.severity]}`}
            >
              <span>{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="shrink-0 font-bold opacity-70 hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
