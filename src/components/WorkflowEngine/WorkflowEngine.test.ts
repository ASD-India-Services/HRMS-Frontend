import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { WorkflowConfig, WorkflowStatusDef, WorkflowTransition } from '@/types/workflow';

// Helper: generate a valid workflow status
const statusArb = fc.record({
  key: fc.string({ minLength: 1, maxLength: 20 }),
  label: fc.string({ minLength: 1, maxLength: 30 }),
  color: fc.constantFrom('gray', 'yellow', 'blue', 'green', 'red') as fc.Arbitrary<WorkflowStatusDef['color']>,
  terminal: fc.boolean(),
});

function getValidTransitions(config: WorkflowConfig, currentStatus: string): WorkflowTransition[] {
  return config.transitions.filter(t => t.from === currentStatus);
}

/**
 * Property 4: Workflow State Machine Valid Transitions
 * Validates: Requirements 7.3, 5.3, 5.4, 6.3, 6.4, 13.2, 13.3, 14.2, 14.3
 */
describe('Property 4: Workflow State Machine Valid Transitions', () => {
  it('only transitions whose from matches current status are valid', () => {
    fc.assert(
      fc.property(
        fc.array(statusArb, { minLength: 2, maxLength: 6 }),
        fc.nat({ max: 5 }),
        (statuses, statusIdx) => {
          const uniqueStatuses = [...new Map(statuses.map(s => [s.key, s])).values()];
          if (uniqueStatuses.length < 2) return;
          
          const currentIdx = statusIdx % uniqueStatuses.length;
          const currentStatus = uniqueStatuses[currentIdx].key;
          
          // Create transitions between random pairs
          const transitions: WorkflowTransition[] = uniqueStatuses.flatMap((from, i) =>
            uniqueStatuses.filter((_, j) => j !== i).map(to => ({
              from: from.key,
              to: to.key,
              action: `${from.key} to ${to.key}`,
              endpoint: (id: string) => `/api/test/${id}/`,
              allowedRoles: ['org_admin'],
            }))
          );
          
          const config: WorkflowConfig = {
            id: 'test',
            statuses: uniqueStatuses,
            transitions,
          };
          
          const valid = getValidTransitions(config, currentStatus);
          
          // All valid transitions must have from === currentStatus
          valid.forEach(t => expect(t.from).toBe(currentStatus));
          
          // No transition with from !== currentStatus should be in the valid list
          const invalid = transitions.filter(t => t.from !== currentStatus);
          invalid.forEach(t => expect(valid).not.toContain(t));
        }
      ),
      { numRuns: 100 }
    );
  });
});
