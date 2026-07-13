import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { encodeFiltersToParams, decodeFiltersFromParams } from './useFilterSync';

/**
 * Property 7: Filter URL Sync Round-Trip
 * Validates: Requirements 17.2
 */
describe('Property 7: Filter URL Sync Round-Trip', () => {
  it('encoding and decoding preserves filter values (round-trip)', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-z_]+$/.test(s) && s !== '__proto__'),
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.length > 0)
        ),
        (filters) => {
          const keys = Object.keys(filters);
          if (keys.length === 0) return;
          
          const encoded = encodeFiltersToParams(filters);
          const searchParams = new URLSearchParams(encoded);
          const decoded = decodeFiltersFromParams(searchParams, keys);
          
          // All non-empty original values should be preserved
          for (const key of keys) {
            if (filters[key]) {
              expect(decoded[key]).toBe(filters[key]);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty filter values are excluded from encoding', () => {
    fc.assert(
      fc.property(
        fc.dictionary(
          fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)),
          fc.constantFrom('', 'value1', '', 'value2', '')
        ),
        (filters) => {
          const encoded = encodeFiltersToParams(filters);
          for (const [key, value] of Object.entries(filters)) {
            if (value === '') {
              expect(encoded).not.toHaveProperty(key);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
