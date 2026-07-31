/**
 * TypeScript interfaces for FormBuilder component
 *
 * Defines field schema, validation rules, and the main FormBuilderProps
 * used by the schema-driven FormBuilder component.
 *
 * Requirements: 18.1
 */

export interface FieldSchema {
  name: string;
  label: string;
  type:
    | 'text'
    | 'email'
    | 'phone'
    | 'number'
    | 'date'
    | 'select'
    | 'multi-select'
    | 'textarea'
    | 'file'
    | 'toggle';
  required?: boolean;
  validation?: ValidationRule[];
  options?: { value: string; label: string }[];
  /** Async options loader (e.g., for department select) */
  optionsQuery?: {
    queryKey: string[];
    endpoint: string;
    /** Custom label key or function to derive the label from API items (default: name/title/label/id) */
    labelKey?: string | ((item: Record<string, unknown>) => string);
  };
  placeholder?: string;
  helpText?: string;
  /** Group forms into steps for multi-step forms */
  step?: number;
  /** Conditional visibility based on other field values */
  visibleWhen?: { field: string; value: unknown };
}

export interface ValidationRule {
  type:
    | 'required'
    | 'email'
    | 'phone'
    | 'minLength'
    | 'maxLength'
    | 'min'
    | 'max'
    | 'pattern'
    | 'dateAfter'
    | 'dateBefore'
    | 'custom';
  value?: unknown;
  message: string;
  /** Custom validator function */
  validate?: (value: unknown, formValues: Record<string, unknown>) => boolean;
}

export interface FormBuilderProps {
  /** Field schema definitions */
  fields: FieldSchema[];
  /** Initial values for edit mode */
  initialValues?: Record<string, unknown>;
  /** Submit handler — receives validated form data */
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  /** Cancel handler */
  onCancel?: () => void;
  /** Multi-step form step labels */
  steps?: string[];
  /** Whether the form is in a dialog/modal */
  isDialog?: boolean;
  /** Loading state from mutation */
  isSubmitting?: boolean;
}
