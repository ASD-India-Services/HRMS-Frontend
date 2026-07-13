/**
 * FormBuilder — Schema-driven form component
 *
 * Orchestrates fields using useFormState, handles validation on submit,
 * scrolls to first error field on invalid submit, maps API 400 errors
 * to field-level errors, and provides submit/cancel actions.
 *
 * Supports multi-step forms when `steps` prop is provided:
 * - Renders StepIndicator at the top
 * - Only shows fields for the current step
 * - Per-step validation before advancing
 * - Previous/Next navigation with Submit on the final step
 *
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 2.2, 2.7
 */

import { useCallback, useRef, useState } from 'react';
import type { FormBuilderProps, FieldSchema } from '@/types/form';
import { useFormState } from './useFormState';
import { FormField } from './FormField';
import { StepIndicator } from './StepIndicator';
import { validateForm } from './validation';

interface ApiErrorResponse {
  [key: string]: string | string[];
}

/**
 * Normalizes API 400 error responses into a flat Record<string, string>.
 * API may return errors as strings or arrays of strings.
 */
function normalizeApiErrors(apiErrors: ApiErrorResponse): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(apiErrors)) {
    if (Array.isArray(value)) {
      normalized[key] = value[0] ?? 'Invalid value';
    } else if (typeof value === 'string') {
      normalized[key] = value;
    }
  }
  return normalized;
}

export function FormBuilder({
  fields,
  initialValues,
  onSubmit,
  onCancel,
  steps,
  isSubmitting = false,
}: FormBuilderProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isMultiStep = Boolean(steps && steps.length > 0);

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const {
    values,
    errors,
    touched,
    setValue,
    setFieldTouched,
    validate,
    setApiErrors,
  } = useFormState({ fields, initialValues });

  /**
   * Returns only the fields belonging to a specific step.
   * If no step is assigned to a field and multi-step mode is active,
   * fields without a step property default to step 0.
   */
  const getFieldsForStep = useCallback(
    (step: number): FieldSchema[] => {
      return fields.filter((f) => (f.step ?? 0) === step);
    },
    [fields]
  );

  /**
   * Validates only the fields on a given step.
   * Returns true if all step fields are valid.
   */
  const validateStep = useCallback(
    (step: number): boolean => {
      const stepFields = getFieldsForStep(step);
      const stepErrors = validateForm(stepFields, values);

      // We need to merge these errors into the form state and mark touched
      if (Object.keys(stepErrors).length > 0) {
        setApiErrors(stepErrors);
        return false;
      }
      return true;
    },
    [getFieldsForStep, values, setApiErrors]
  );

  const scrollToFirstError = useCallback(() => {
    if (!formRef.current) return;

    const visibleFields = isMultiStep ? getFieldsForStep(currentStep) : fields;
    const firstErrorField = visibleFields.find((f) => errors[f.name]);
    if (!firstErrorField) return;

    const fieldElement = formRef.current.querySelector(
      `[data-field="${firstErrorField.name}"]`
    );
    if (fieldElement) {
      fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const input = fieldElement.querySelector<HTMLElement>(
        'input, select, textarea'
      );
      input?.focus();
    }
  }, [fields, errors, isMultiStep, getFieldsForStep, currentStep]);

  const handleNext = useCallback(() => {
    const isValid = validateStep(currentStep);
    if (!isValid) {
      setTimeout(scrollToFirstError, 50);
      return;
    }

    setCompletedSteps((prev) =>
      prev.includes(currentStep) ? prev : [...prev, currentStep]
    );
    setCurrentStep((prev) => prev + 1);
  }, [currentStep, validateStep, scrollToFirstError]);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (isMultiStep) {
        // On final step submit, validate ALL fields across all steps
        const isValid = validate();
        if (!isValid) {
          // If errors are on a previous step, navigate to that step
          const allStepFields = steps!.map((_, i) => getFieldsForStep(i));
          for (let i = 0; i < allStepFields.length; i++) {
            const hasStepError = allStepFields[i].some((f) => errors[f.name]);
            if (hasStepError) {
              setCurrentStep(i);
              setTimeout(scrollToFirstError, 50);
              return;
            }
          }
          setTimeout(scrollToFirstError, 50);
          return;
        }
      } else {
        const isValid = validate();
        if (!isValid) {
          setTimeout(scrollToFirstError, 50);
          return;
        }
      }

      try {
        // Mark final step as completed
        if (isMultiStep) {
          setCompletedSteps((prev) =>
            prev.includes(currentStep) ? prev : [...prev, currentStep]
          );
        }
        await onSubmit(values);
      } catch (err: unknown) {
        if (isAxiosLikeError(err) && err.response?.status === 400) {
          const apiErrors = err.response.data as ApiErrorResponse;
          const normalizedErrors = normalizeApiErrors(apiErrors);
          setApiErrors(normalizedErrors);

          // In multi-step mode, navigate to the step with the first error
          if (isMultiStep) {
            const errorFieldNames = Object.keys(normalizedErrors);
            for (let i = 0; i < steps!.length; i++) {
              const stepFields = getFieldsForStep(i);
              const hasError = stepFields.some((f) =>
                errorFieldNames.includes(f.name)
              );
              if (hasError) {
                setCurrentStep(i);
                break;
              }
            }
          }

          setTimeout(scrollToFirstError, 50);
        }
      }
    },
    [
      validate,
      values,
      onSubmit,
      setApiErrors,
      scrollToFirstError,
      isMultiStep,
      steps,
      getFieldsForStep,
      errors,
      currentStep,
    ]
  );

  // Determine which fields to render
  const visibleFields = isMultiStep ? getFieldsForStep(currentStep) : fields;
  const isFinalStep = isMultiStep && steps ? currentStep === steps.length - 1 : true;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="space-y-6"
    >
      {/* Step Indicator for multi-step forms */}
      {isMultiStep && steps && (
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          completedSteps={completedSteps}
        />
      )}

      {/* Field grid — responsive single/two column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleFields.map((field) => (
          <div
            key={field.name}
            className={
              field.type === 'textarea' || field.type === 'multi-select'
                ? 'md:col-span-2'
                : ''
            }
          >
            <FormField
              field={field}
              value={values[field.name]}
              error={errors[field.name]}
              touched={touched[field.name]}
              onChange={setValue}
              onBlur={setFieldTouched}
              formValues={values}
            />
          </div>
        ))}
      </div>

      {/* Form actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}

        {/* Previous button (multi-step, after first step) */}
        {isMultiStep && currentStep > 0 && (
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
        )}

        {/* Next button (multi-step, non-final step) */}
        {isMultiStep && !isFinalStep && (
          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        )}

        {/* Submit button (single-page mode or final step) */}
        {isFinalStep && (
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting && (
              <svg
                className="animate-spin h-4 w-4 text-white"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </button>
        )}
      </div>
    </form>
  );
}

/**
 * Type guard for Axios-like error responses
 */
function isAxiosLikeError(
  err: unknown
): err is { response?: { status: number; data: unknown } } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'response' in err &&
    typeof (err as Record<string, unknown>).response === 'object'
  );
}
