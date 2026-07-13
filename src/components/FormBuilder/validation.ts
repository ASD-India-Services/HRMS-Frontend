/**
 * Validation utilities for the FormBuilder component.
 *
 * Provides field-level and form-level validation based on
 * declarative ValidationRule definitions.
 *
 * Requirements: 18.1
 */

import type { FieldSchema, ValidationRule } from '@/types/form';

/**
 * Validates a single field value against an array of validation rules.
 * Returns the first error message if validation fails, or null if valid.
 */
export function validateField(
  value: unknown,
  rules: ValidationRule[],
  formValues: Record<string, unknown>
): string | null {
  for (const rule of rules) {
    const error = applyRule(value, rule, formValues);
    if (error) {
      return error;
    }
  }
  return null;
}

/**
 * Validates all fields in a form and returns a map of field name → error message
 * for fields that have validation errors. Fields without errors are omitted.
 */
export function validateForm(
  fields: FieldSchema[],
  values: Record<string, unknown>
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const rules = buildRulesForField(field);
    if (rules.length === 0) continue;

    const fieldValue = values[field.name];
    const error = validateField(fieldValue, rules, values);
    if (error) {
      errors[field.name] = error;
    }
  }

  return errors;
}

/**
 * Builds the effective validation rules for a field, prepending a
 * required rule if the field is marked required but doesn't already
 * have one in its validation array.
 */
function buildRulesForField(field: FieldSchema): ValidationRule[] {
  const rules: ValidationRule[] = field.validation ? [...field.validation] : [];

  if (field.required && !rules.some((r) => r.type === 'required')) {
    rules.unshift({
      type: 'required',
      message: `${field.label} is required`,
    });
  }

  return rules;
}

/**
 * Applies a single validation rule to a value.
 * Returns the error message if the rule is violated, or null if valid.
 */
function applyRule(
  value: unknown,
  rule: ValidationRule,
  formValues: Record<string, unknown>
): string | null {
  switch (rule.type) {
    case 'required':
      return validateRequired(value) ? null : rule.message;

    case 'email':
      return validateEmail(value) ? null : rule.message;

    case 'phone':
      return validatePhone(value) ? null : rule.message;

    case 'minLength':
      return validateMinLength(value, rule.value as number) ? null : rule.message;

    case 'maxLength':
      return validateMaxLength(value, rule.value as number) ? null : rule.message;

    case 'min':
      return validateMin(value, rule.value as number) ? null : rule.message;

    case 'max':
      return validateMax(value, rule.value as number) ? null : rule.message;

    case 'pattern':
      return validatePattern(value, rule.value as string) ? null : rule.message;

    case 'dateAfter':
      return validateDateAfter(value, rule.value, formValues) ? null : rule.message;

    case 'dateBefore':
      return validateDateBefore(value, rule.value, formValues) ? null : rule.message;

    case 'custom':
      return validateCustom(value, rule, formValues) ? null : rule.message;

    default:
      return null;
  }
}

// --- Individual validators ---

function validateRequired(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function validateEmail(value: unknown): boolean {
  if (!isNonEmptyString(value)) return true; // skip validation for empty (required handles that)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value as string);
}

function validatePhone(value: unknown): boolean {
  if (!isNonEmptyString(value)) return true;
  const str = value as string;
  // Allow digits, optional leading +, dashes, spaces, parentheses. Min 7 chars after stripping formatting.
  const phoneRegex = /^[+]?[\d\s\-()]+$/;
  if (!phoneRegex.test(str)) return false;
  const digitsOnly = str.replace(/\D/g, '');
  return digitsOnly.length >= 7;
}

function validateMinLength(value: unknown, minLen: number): boolean {
  if (!isNonEmptyString(value)) return true;
  return (value as string).length >= minLen;
}

function validateMaxLength(value: unknown, maxLen: number): boolean {
  if (!isNonEmptyString(value)) return true;
  return (value as string).length <= maxLen;
}

function validateMin(value: unknown, min: number): boolean {
  const num = toNumber(value);
  if (num === null) return true; // skip for non-numeric
  return num >= min;
}

function validateMax(value: unknown, max: number): boolean {
  const num = toNumber(value);
  if (num === null) return true;
  return num <= max;
}

function validatePattern(value: unknown, pattern: string): boolean {
  if (!isNonEmptyString(value)) return true;
  const regex = new RegExp(pattern);
  return regex.test(value as string);
}

function validateDateAfter(
  value: unknown,
  ruleValue: unknown,
  formValues: Record<string, unknown>
): boolean {
  if (!isNonEmptyString(value)) return true;
  const dateValue = new Date(value as string);
  if (isNaN(dateValue.getTime())) return true;

  const compareDate = resolveDateValue(ruleValue, formValues);
  if (!compareDate) return true;

  return dateValue.getTime() > compareDate.getTime();
}

function validateDateBefore(
  value: unknown,
  ruleValue: unknown,
  formValues: Record<string, unknown>
): boolean {
  if (!isNonEmptyString(value)) return true;
  const dateValue = new Date(value as string);
  if (isNaN(dateValue.getTime())) return true;

  const compareDate = resolveDateValue(ruleValue, formValues);
  if (!compareDate) return true;

  return dateValue.getTime() < compareDate.getTime();
}

function validateCustom(
  value: unknown,
  rule: ValidationRule,
  formValues: Record<string, unknown>
): boolean {
  if (!rule.validate) return true;
  return rule.validate(value, formValues);
}

// --- Helpers ---

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return isNaN(value) ? null : value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Resolves a date comparison value. If the ruleValue is a field name that
 * exists in formValues, uses that field's value as the date. Otherwise,
 * treats ruleValue as a date string.
 */
function resolveDateValue(
  ruleValue: unknown,
  formValues: Record<string, unknown>
): Date | null {
  if (typeof ruleValue !== 'string') return null;

  // Check if ruleValue is a field name referencing another field's date
  if (ruleValue in formValues) {
    const fieldValue = formValues[ruleValue];
    if (typeof fieldValue === 'string') {
      const date = new Date(fieldValue);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  // Otherwise treat as a direct date string
  const date = new Date(ruleValue);
  return isNaN(date.getTime()) ? null : date;
}
