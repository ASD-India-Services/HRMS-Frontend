import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateProgress } from './OnboardingTracking';

const taskStatusArb = fc.constantFrom('pending', 'in_progress', 'completed');

// Use integer timestamps to avoid invalid date issues
const isoDateArb = fc.integer({ min: 946684800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString());

const taskArb = fc.record({
  id: fc.uuid(),
  employee: fc.string(),
  title: fc.string(),
  category: fc.string(),
  status: taskStatusArb,
  due_date: isoDateArb,
  completed_at: fc.option(isoDateArb, { nil: null }),
  created_at: isoDateArb,
  updated_at: isoDateArb,
});

/**
 * Property 9: Onboarding Progress Calculation
 * Validates: Requirements 10.3, 10.4
 */
describe('Property 9: Onboarding Progress Calculation', () => {
  it('progress = (completed / total) * 100 rounded', () => {
    fc.assert(
      fc.property(
        fc.array(taskArb, { minLength: 1, maxLength: 50 }),
        (tasks) => {
          const progress = calculateProgress(tasks);
          const completed = tasks.filter(t => t.status === 'completed').length;
          const expected = Math.round((completed / tasks.length) * 100);
          expect(progress).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('empty task list returns 0%', () => {
    expect(calculateProgress([])).toBe(0);
  });

  it('all completed returns 100%', () => {
    fc.assert(
      fc.property(
        fc.array(taskArb.map(t => ({ ...t, status: 'completed' })), { minLength: 1, maxLength: 20 }),
        (tasks) => {
          expect(calculateProgress(tasks)).toBe(100);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('none completed returns 0%', () => {
    fc.assert(
      fc.property(
        fc.array(taskArb.map(t => ({ ...t, status: 'pending' })), { minLength: 1, maxLength: 20 }),
        (tasks) => {
          expect(calculateProgress(tasks)).toBe(0);
        }
      ),
      { numRuns: 50 }
    );
  });
});
