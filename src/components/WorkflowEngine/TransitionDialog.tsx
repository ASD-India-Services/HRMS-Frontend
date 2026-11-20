/**
 * TransitionDialog
 *
 * Modal dialog shown when a workflow transition requires confirmation,
 * a reason, or additional form fields before execution.
 *
 * - If `transition.confirm` is set: shows title and message
 * - If `transition.requiresReason`: shows a textarea for the reason
 * - If `transition.formFields`: renders simplified inline form fields
 * - Submit/Cancel buttons control form submission
 *
 * Requirements: 5.4, 6.4, 13.3, 14.3
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import api from '@/lib/api';
import type { WorkflowTransition } from '@/types/workflow';
import type { FieldSchema } from '@/types/form';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

interface TransitionDialogProps {
  /** The transition being executed */
  transition: WorkflowTransition;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close the dialog */
  onClose: () => void;
  /** Submit the transition with collected data */
  onSubmit: (data: Record<string, unknown>) => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
}

function renderField(field: FieldSchema, value: unknown, onChange: (val: unknown) => void) {
  const id = `transition-field-${field.name}`;

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
    case 'number':
      return (
        <Input
          id={id}
          type={field.type === 'phone' ? 'tel' : field.type}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'select':
      return (
        <AsyncTransitionSelect
          id={id}
          field={field}
          value={(value as string) ?? ''}
          onChange={onChange}
        />
      );
    case 'textarea':
      return (
        <Textarea
          id={id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
        />
      );
    default:
      return (
        <Input
          id={id}
          type="text"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      );
  }
}

export function TransitionDialog({
  transition,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
}: TransitionDialogProps) {
  const [reason, setReason] = useState('');
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: Record<string, unknown> = { ...formData };
    if (transition.requiresReason) {
      data.reason = reason;
      data.comments = reason;
      data.rejection_reason = reason;
    }
    onSubmit(data);
  };

  const handleFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const title = transition.confirm?.title ?? `Confirm: ${transition.action}`;
  const message = transition.confirm?.message;

  const isReasonEmpty = transition.requiresReason && !reason.trim();

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transition-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9999] bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div className="relative z-[10000] mx-4 w-full max-w-lg rounded-lg bg-surface-paper p-6 shadow-2xl ring-1 ring-black/5">
        <h2
          id="transition-dialog-title"
          className="text-lg font-semibold text-ink-primary"
        >
          {title}
        </h2>

        {message && (
          <p className="mt-2 text-sm text-ink-secondary">{message}</p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Reason field */}
          {transition.requiresReason && (
            <div>
              <label
                htmlFor="transition-reason"
                className="block text-sm font-medium text-ink-primary"
              >
                Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="transition-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for this action..."
                rows={3}
                required
                className="mt-1"
              />
            </div>
          )}

          {/* Additional form fields */}
          {transition.formFields?.map((field) => (
            <div key={field.name}>
              <label
                htmlFor={`transition-field-${field.name}`}
                className="block text-sm font-medium text-ink-primary"
              >
                {field.label}
                {field.required && <span className="text-red-500"> *</span>}
              </label>
              <div className="mt-1">
                {renderField(field, formData[field.name], (val) =>
                  handleFieldChange(field.name, val)
                )}
              </div>
              {field.helpText && (
                <p className="mt-1 text-xs text-ink-secondary">{field.helpText}</p>
              )}
            </div>
          ))}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outlined" color="inherit"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Go Back
            </Button>
            <button
              type="submit"
              disabled={isSubmitting || isReasonEmpty}
              className={`inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                transition.variant === 'destructive'
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-primary-main hover:bg-primary-dark focus:ring-primary-main'
              }`}
            >
              {isSubmitting && (
                <svg
                  className="mr-2 h-4 w-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {transition.action}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// AsyncTransitionSelect — fetches options from API if optionsQuery is provided
// ---------------------------------------------------------------------------

function AsyncTransitionSelect({
  id,
  field,
  value,
  onChange,
}: {
  id: string;
  field: FieldSchema;
  value: string;
  onChange: (val: unknown) => void;
}) {
  const endpoint = field.optionsQuery?.endpoint;

  const { data: fetchedOptions } = useQuery<{ value: string; label: string }[]>({
    queryKey: ['transition-select-options', endpoint],
    queryFn: async () => {
      if (!endpoint) return [];
      const res = await api.get(endpoint);
      const rawData = res.data;
      const items = Array.isArray(rawData) ? rawData : rawData.results ?? [];
      return items.map((item: Record<string, unknown>) => ({
        value: String(item.id ?? ''),
        label: String(
          item.full_name ??
          item.name ??
          item.title ??
          (item.first_name ? `${item.first_name} ${item.last_name ?? ''}`.trim() : null) ??
          item.id ??
          ''
        ),
      }));
    },
    enabled: !!endpoint,
    staleTime: 5 * 60 * 1000,
  });

  const options = field.options ?? fetchedOptions ?? [];

  return (
    <Select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{field.placeholder ?? 'Select...'}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  );
}
