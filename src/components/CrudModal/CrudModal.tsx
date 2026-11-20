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
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

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
  type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'checkbox' | 'time';
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
  }, [isOpen, initialValues]);

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

  return (
    <Modal open={isOpen} onClose={onClose} labelledBy="crud-modal-title" size="md">
      <ModalHeader>
        <h2 id="crud-modal-title" className="text-lg font-bold text-ink-primary">{title}</h2>
        <button
          type="button"
          className="rounded p-1 text-ink-disabled hover:bg-grey-500/10 hover:text-ink-secondary"
          onClick={onClose}
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </ModalHeader>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <ModalBody className="max-h-[60vh] space-y-4">
          {fields.map((field) => (
            <div key={field.key}>
              {field.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm font-semibold text-ink-secondary">
                  <Checkbox
                    checked={!!formData[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.checked)}
                    disabled={isLoading}
                  />
                  {field.label}
                </label>
              ) : (
                <>
                  <label htmlFor={`crud-field-${field.key}`} className="mb-1 block text-sm font-semibold text-ink-secondary">
                    {field.label}
                    {field.required && <span className="ml-0.5 text-error-main">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <Textarea
                      id={`crud-field-${field.key}`}
                      value={(formData[field.key] as string) ?? ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      disabled={isLoading}
                      rows={3}
                    />
                  ) : field.type === 'select' ? (
                    <AsyncSelectField
                      field={field}
                      value={(formData[field.key] as string) ?? ''}
                      onChange={(val) => handleChange(field.key, val)}
                      disabled={isLoading}
                    />
                  ) : field.type === 'time' ? (
                    <TimePickerField
                      value={(formData[field.key] as string) ?? ''}
                      onChange={(val) => handleChange(field.key, val)}
                      disabled={isLoading}
                    />
                  ) : (
                    <Input
                      id={`crud-field-${field.key}`}
                      type={field.type}
                      value={(formData[field.key] as string) ?? ''}
                      onChange={(e) => handleChange(field.key, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                      placeholder={field.placeholder}
                      disabled={isLoading}
                    />
                  )}
                </>
              )}
              {displayErrors[field.key] && (
                <p className="mt-1 text-xs text-error-main">{displayErrors[field.key]}</p>
              )}
            </div>
          ))}
        </ModalBody>

        <ModalFooter>
          <Button variant="outlined" color="inherit" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" loading={isLoading}>
            Save
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// TimePickerField — Hour/Minute/AM-PM dropdown picker
// ---------------------------------------------------------------------------

function TimePickerField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  // Parse existing value (HH:MM format in 24h) into 12h components
  let hour = 9;
  let minute = 0;
  let period: 'AM' | 'PM' = 'AM';

  if (value) {
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const h24 = parseInt(match[1], 10);
      minute = parseInt(match[2], 10);
      period = h24 >= 12 ? 'PM' : 'AM';
      hour = h24 % 12 || 12;
    }
  }

  const updateTime = (h: number, m: number, p: 'AM' | 'PM') => {
    let h24 = h % 12;
    if (p === 'PM') h24 += 12;
    const timeStr = `${String(h24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange(timeStr);
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={hour}
        onChange={(e) => updateTime(parseInt(e.target.value), minute, period)}
        disabled={disabled}
        className="w-auto"
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </Select>
      <span className="font-semibold text-ink-secondary">:</span>
      <Select
        value={minute}
        onChange={(e) => updateTime(hour, parseInt(e.target.value), period)}
        disabled={disabled}
        className="w-auto"
      >
        {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
        ))}
      </Select>
      <Select
        value={period}
        onChange={(e) => updateTime(hour, minute, e.target.value as 'AM' | 'PM')}
        disabled={disabled}
        className="w-auto font-semibold"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </Select>
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
    // The modal unmounts when closed, so this field remounts each time it opens.
    // Always refetch on mount so newly created options (e.g. a category added on
    // another page) appear immediately without a full page reload.
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const options = field.options ?? fetchedOptions ?? [];

  return (
    <Select
      id={`crud-field-${field.key}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">Select {field.label}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </Select>
  );
}
