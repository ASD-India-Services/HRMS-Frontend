/**
 * useFormState — Custom hook managing form values, touched fields,
 * validation errors, and dirty state for the FormBuilder component.
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { FieldSchema } from '@/types/form';
import { validateForm, validateField } from './validation';

export interface FormState {
  values: Record<string, unknown>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isDirty: boolean;
  setValue: (name: string, value: unknown) => void;
  setValues: (values: Record<string, unknown>) => void;
  setFieldTouched: (name: string) => void;
  validate: () => boolean;
  reset: () => void;
  setApiErrors: (errors: Record<string, string>) => void;
}

export interface UseFormStateOptions {
  fields: FieldSchema[];
  initialValues?: Record<string, unknown>;
}

/**
 * Builds default values from field schemas. Uses empty string for text-like
 * fields, empty array for multi-select, false for toggle, etc.
 */
function buildDefaultValues(fields: FieldSchema[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    switch (field.type) {
      case 'multi-select':
        defaults[field.name] = [];
        break;
      case 'toggle':
        defaults[field.name] = false;
        break;
      case 'number':
        defaults[field.name] = '';
        break;
      default:
        defaults[field.name] = '';
    }
  }
  return defaults;
}

export function useFormState({ fields, initialValues }: UseFormStateOptions): FormState {
  const defaultValues = useRef(buildDefaultValues(fields));
  const mergedInitial = useRef<Record<string, unknown>>({
    ...defaultValues.current,
    ...initialValues,
  });

  const [values, setValuesState] = useState<Record<string, unknown>>(mergedInitial.current);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Sync form values when initialValues change (e.g., API data arrives for edit mode)
  const initialValuesKey = JSON.stringify(initialValues ?? {});
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      const merged = { ...defaultValues.current, ...initialValues };
      mergedInitial.current = merged;
      setValuesState(merged);
      setErrors({});
      setTouched({});
      setIsDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValuesKey]);

  const setValue = useCallback(
    (name: string, value: unknown) => {
      setValuesState((prev) => {
        const next = { ...prev, [name]: value };
        return next;
      });
      setIsDirty(true);

      // Clear error for this field when value changes
      setErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
    },
    []
  );

  const setValues = useCallback((newValues: Record<string, unknown>) => {
    setValuesState((prev) => ({ ...prev, ...newValues }));
    setIsDirty(true);
  }, []);

  const setFieldTouched = useCallback(
    (name: string) => {
      setTouched((prev) => {
        if (prev[name]) return prev;
        return { ...prev, [name]: true };
      });

      // Validate the single field on blur
      setValuesState((currentValues) => {
        const field = fields.find((f) => f.name === name);
        if (field) {
          const rules = field.validation ?? [];
          const allRules = field.required && !rules.some((r) => r.type === 'required')
            ? [{ type: 'required' as const, message: `${field.label} is required` }, ...rules]
            : rules;

          if (allRules.length > 0) {
            const error = validateField(currentValues[name], allRules, currentValues);
            setErrors((prev) => {
              if (error) {
                return { ...prev, [name]: error };
              }
              const next = { ...prev };
              delete next[name];
              return next;
            });
          }
        }
        return currentValues;
      });
    },
    [fields]
  );

  const validate = useCallback((): boolean => {
    const validationErrors = validateForm(fields, values);
    setErrors(validationErrors);

    // Mark all fields as touched on submit validation
    const allTouched: Record<string, boolean> = {};
    for (const field of fields) {
      allTouched[field.name] = true;
    }
    setTouched(allTouched);

    return Object.keys(validationErrors).length === 0;
  }, [fields, values]);

  const reset = useCallback(() => {
    setValuesState(mergedInitial.current);
    setErrors({});
    setTouched({});
    setIsDirty(false);
  }, []);

  const setApiErrors = useCallback((apiErrors: Record<string, string>) => {
    setErrors((prev) => ({ ...prev, ...apiErrors }));
    // Mark fields with API errors as touched so they show
    const touchedUpdates: Record<string, boolean> = {};
    for (const key of Object.keys(apiErrors)) {
      touchedUpdates[key] = true;
    }
    setTouched((prev) => ({ ...prev, ...touchedUpdates }));
  }, []);

  return {
    values,
    errors,
    touched,
    isDirty,
    setValue,
    setValues,
    setFieldTouched,
    validate,
    reset,
    setApiErrors,
  };
}
