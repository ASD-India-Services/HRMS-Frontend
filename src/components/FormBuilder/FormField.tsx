/**
 * FormField — Renders a single form field based on FieldSchema.type
 *
 * Supports: text, email, phone, number, date, select, multi-select,
 * textarea, file, and toggle field types.
 *
 * Shows label, help text, and error message (if touched and has error).
 * Handles `visibleWhen` conditional rendering.
 * Handles `optionsQuery` for dynamic select options from API.
 *
 * Requirements: 18.1, 18.2
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { FieldSchema } from '@/types/form';

export interface FormFieldProps {
  field: FieldSchema;
  value: unknown;
  error?: string;
  touched?: boolean;
  onChange: (name: string, value: unknown) => void;
  onBlur: (name: string) => void;
  /** All form values for conditional visibility checks */
  formValues: Record<string, unknown>;
}

export function FormField({
  field,
  value,
  error,
  touched,
  onChange,
  onBlur,
  formValues,
}: FormFieldProps) {
  // Fetch dynamic options if optionsQuery is defined
  const { data: dynamicOptions } = useQuery<{ value: string; label: string }[]>({
    queryKey: field.optionsQuery?.queryKey ?? ['noop'],
    queryFn: async () => {
      if (!field.optionsQuery) return [];
      const res = await api.get(field.optionsQuery.endpoint);
      const rawData = res.data;
      // Handle paginated responses ({count, results: [...]})
      const items = Array.isArray(rawData) ? rawData : rawData.results ?? [];
      const { labelKey } = field.optionsQuery;
      // Map to {value, label} — use custom labelKey, or fall back to id/name/title
      return items.map((item: Record<string, unknown>) => {
        let label: string;
        if (typeof labelKey === 'function') {
          label = labelKey(item);
        } else if (typeof labelKey === 'string') {
          label = String(item[labelKey] ?? item.id ?? '');
        } else {
          label = String(item.name ?? item.title ?? item.label ?? item.id ?? '');
        }
        return {
          value: String(item.id ?? ''),
          label,
        };
      });
    },
    enabled: !!field.optionsQuery,
    staleTime: 5 * 60 * 1000,
  });

  // Merge static options with dynamic options
  const resolvedOptions = field.options ?? dynamicOptions ?? [];
  // Handle conditional visibility
  if (field.visibleWhen) {
    const { field: dependentField, value: expectedValue } = field.visibleWhen;
    if (formValues[dependentField] !== expectedValue) {
      return null;
    }
  }

  const showError = touched && error;
  const fieldId = `field-${field.name}`;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  const baseInputClasses = `w-full px-3 py-2 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
    showError
      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300'
  }`;

  const describedBy = [
    showError ? errorId : null,
    field.helpText ? helpId : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="flex flex-col gap-1" data-field={field.name}>
      <label htmlFor={fieldId} className="text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {renderInput()}

      {field.helpText && !showError && (
        <p id={helpId} className="text-xs text-gray-500">
          {field.helpText}
        </p>
      )}

      {showError && (
        <p id={errorId} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );

  function renderInput() {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'number':
        return (
          <input
            id={fieldId}
            name={field.name}
            type={getInputType(field.type)}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            className={baseInputClasses}
            onChange={(e) => {
              const inputValue =
                field.type === 'number' ? e.target.value : e.target.value;
              onChange(field.name, inputValue);
            }}
            onBlur={() => onBlur(field.name)}
            aria-invalid={showError ? true : undefined}
            aria-describedby={describedBy || undefined}
          />
        );

      case 'date':
        return (
          <input
            id={fieldId}
            name={field.name}
            type="date"
            value={String(value ?? '')}
            className={baseInputClasses}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={() => onBlur(field.name)}
            aria-invalid={showError ? true : undefined}
            aria-describedby={describedBy || undefined}
          />
        );

      case 'select':
        return (
          <select
            id={fieldId}
            name={field.name}
            value={String(value ?? '')}
            className={baseInputClasses}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={() => onBlur(field.name)}
            aria-invalid={showError ? true : undefined}
            aria-describedby={describedBy || undefined}
          >
            <option value="">
              {field.placeholder ?? `Select ${field.label}`}
            </option>
            {resolvedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'multi-select':
        return (
          <fieldset
            aria-describedby={describedBy || undefined}
            aria-invalid={showError ? true : undefined}
          >
            <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-md min-h-[40px]">
              {field.options?.map((opt) => {
                const selected = Array.isArray(value) && value.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="inline-flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      onChange={() => {
                        const current = Array.isArray(value) ? [...value] : [];
                        const nextValue = selected
                          ? current.filter((v) => v !== opt.value)
                          : [...current, opt.value];
                        onChange(field.name, nextValue);
                      }}
                    />
                    <span className="text-gray-700">{opt.label}</span>
                  </label>
                );
              })}
              {(!field.options || field.options.length === 0) && (
                <span className="text-sm text-gray-400">No options available</span>
              )}
            </div>
          </fieldset>
        );

      case 'textarea':
        return (
          <textarea
            id={fieldId}
            name={field.name}
            value={String(value ?? '')}
            placeholder={field.placeholder}
            rows={4}
            className={baseInputClasses}
            onChange={(e) => onChange(field.name, e.target.value)}
            onBlur={() => onBlur(field.name)}
            aria-invalid={showError ? true : undefined}
            aria-describedby={describedBy || undefined}
          />
        );

      case 'file':
        return (
          <input
            id={fieldId}
            name={field.name}
            type="file"
            className={`${baseInputClasses} file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100`}
            onChange={(e) => {
              const files = e.target.files;
              onChange(field.name, files && files.length > 0 ? files[0] : null);
            }}
            onBlur={() => onBlur(field.name)}
            aria-invalid={showError ? true : undefined}
            aria-describedby={describedBy || undefined}
          />
        );

      case 'toggle':
        return (
          <button
            id={fieldId}
            type="button"
            role="switch"
            aria-checked={Boolean(value)}
            aria-describedby={describedBy || undefined}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              value ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
            onClick={() => {
              onChange(field.name, !value);
              onBlur(field.name);
            }}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                value ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        );

      default:
        return null;
    }
  }
}

function getInputType(fieldType: string): string {
  switch (fieldType) {
    case 'email':
      return 'email';
    case 'phone':
      return 'tel';
    case 'number':
      return 'number';
    default:
      return 'text';
  }
}
