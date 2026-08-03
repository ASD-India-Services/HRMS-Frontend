/**
 * CrudModal — Reusable modal for creating/editing records.
 *
 * Renders a form overlay with configurable fields, validation,
 * and submit handling. Works with the createCrudHooks pattern.
 *
 * Field types: text, textarea, select, date, number, checkbox
 */

import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldConfig {
  /** Field key (matches the API payload key) */
  key: string;
  /** Display label */
  label: string;
  /** Input type */
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox';
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Options for select fields (static) */
  options?: FieldOption[];
  /** Endpoint to fetch options dynamically (for select fields) */
  optionsEndpoint?: string;
  /** Key to use as the label from API response items (defaults to 'name') */
  optionsLabelKey?: string;
}

export interface CrudModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title (e.g., "Create KRA") */
  title: string;
  /** Field configuration array */
  fields: FieldConfig[];
  /** Pre-populated values for editing */
  initialValues?: Record<string, unknown>;
  /** Submit handler — receives form data object */
  onSubmit: (data: Record<string, unknown>) => void;
  /** Loading state (disables form during submission) */
  isLoading?: boolean;
  /** Server-side validation errors (field key → error message) */
  apiErrors?: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EMPTY_INITIAL_VALUES: Record<string, unknown> = {};

export function CrudModal({
  isOpen,
  onClose,
  title,
  fields,
  initialValues = EMPTY_INITIAL_VALUES,
  onSubmit,
  isLoading = false,
  apiErrors,
}: CrudModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Merge apiErrors into displayed errors
  const displayErrors = useMemo(() => {
    return { ...errors, ...(apiErrors ?? {}) };
  }, [errors, apiErrors]);

  // Reset form when modal opens or initialValues change
  useEffect(() => {
    if (isOpen) {
      const defaults: Record<string, unknown> = {};
      fields.forEach((field) => {
        if (field.type === 'checkbox') {
          defaults[field.key] = initialValues[field.key] ?? false;
        } else {
          defaults[field.key] = initialValues[field.key] ?? '';
        }
      });
      setFormData(defaults);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleChange = useCallback((key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.required) {
        const val = formData[field.key];
        if (val === '' || val === null || val === undefined) {
          newErrors[field.key] = `${field.label} is required`;
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [fields, formData]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="crud-modal-title">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} aria-hidden="true" />

      {/* Modal panel */}
      <div className="relative z-10 w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 id="crud-modal-title" className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="max-h-[60vh] overflow-y-auto px-6 py-4 space-y-4">
            {fields.map((field) => (
              <div key={field.key}>
                {field.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!formData[field.key]}
                      onChange={(e) => handleChange(field.key, e.target.checked)}
                      disabled={isLoading}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    {field.label}
                  </label>
                ) : (
                  <>
                    <label htmlFor={`crud-field-${field.key}`} className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-0.5">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        id={`crud-field-${field.key}`}
                        value={(formData[field.key] as string) ?? ''}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLoading}
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    ) : field.type === 'select' ? (
                      <AsyncSelectField
                        field={field}
                        value={(formData[field.key] as string) ?? ''}
                        onChange={(val) => handleChange(field.key, val)}
                        disabled={isLoading}
                      />
                    ) : (
                      <input
                        id={`crud-field-${field.key}`}
                        type={field.type}
                        value={(formData[field.key] as string) ?? ''}
                        onChange={(e) => handleChange(field.key, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                        placeholder={field.placeholder}
                        disabled={isLoading}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    )}
                  </>
                )}
                {displayErrors[field.key] && (
                  <p className="mt-1 text-xs text-red-600">{displayErrors[field.key]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isLoading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AsyncSelectField — Handles both static and API-fetched options
// ---------------------------------------------------------------------------

function AsyncSelectField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldConfig;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  const labelKey = field.optionsLabelKey ?? 'name';

  const { data: fetchedOptions } = useQuery<FieldOption[]>({
    queryKey: ['crud-modal-options', field.optionsEndpoint],
    queryFn: async () => {
      if (!field.optionsEndpoint) return [];
      const res = await api.get(field.optionsEndpoint);
      const rawData = res.data;
      const items = Array.isArray(rawData) ? rawData : rawData.results ?? [];
      return items.map((item: Record<string, unknown>) => ({
        value: String(item.id ?? ''),
        label: String(
          item[labelKey] ??
          item.name ??
          item.title ??
          (item.first_name ? `${item.first_name} ${item.last_name ?? ''}`.trim() : null) ??
          item.id ??
          ''
        ),
      }));
    },
    enabled: !!field.optionsEndpoint,
    staleTime: 5 * 60 * 1000,
  });

  const options = field.options ?? fetchedOptions ?? [];

  return (
    <select
      id={`crud-field-${field.key}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
    >
      <option value="">Select {field.label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}
