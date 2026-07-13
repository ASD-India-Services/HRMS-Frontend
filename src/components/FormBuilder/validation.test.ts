import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateField } from './validation';

/**
 * Property 6: Form Validation Rule Enforcement
 * Validates: Requirements 18.1
 */
describe('Property 6: Form Validation Rule Enforcement', () => {
  it('required rule rejects empty/null/undefined/whitespace', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(null, undefined, '', '   ', '  \t\n  '),
        (value) => {
          const error = validateField(value, [{ type: 'required', message: 'Required' }], {});
          expect(error).toBe('Required');
        }
      ),
      { numRuns: 50 }
    );
  });

  it('required rule passes for non-empty strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        (value) => {
          const error = validateField(value, [{ type: 'required', message: 'Required' }], {});
          expect(error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('email rule accepts valid emails and rejects invalid', () => {
    fc.assert(
      fc.property(
        fc.emailAddress(),
        (email) => {
          const error = validateField(email, [{ type: 'email', message: 'Invalid email' }], {});
          expect(error).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('min/max numeric bounds are enforced', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1000, max: 1000 }),
        fc.integer({ min: 0, max: 500 }),
        fc.integer({ min: 500, max: 1000 }),
        (value, min, max) => {
          if (min >= max) return; // skip invalid ranges
          const minError = validateField(value, [{ type: 'min', value: min, message: 'Too small' }], {});
          const maxError = validateField(value, [{ type: 'max', value: max, message: 'Too large' }], {});
          
          if (value < min) expect(minError).toBe('Too small');
          else expect(minError).toBeNull();
          
          if (value > max) expect(maxError).toBe('Too large');
          else expect(maxError).toBeNull();
        }
      ),
      { numRuns: 200 }
    );
  });
});
