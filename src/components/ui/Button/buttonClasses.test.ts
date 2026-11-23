import { describe, it, expect } from 'vitest';
import { buttonClasses, type ButtonColor, type ButtonSize, type ButtonVariant } from './buttonClasses';

const VARIANTS: ButtonVariant[] = ['contained', 'outlined', 'soft', 'text'];
const COLORS: ButtonColor[] = ['inherit', 'primary', 'secondary', 'info', 'success', 'warning', 'error'];
const SIZES: ButtonSize[] = ['small', 'medium', 'large'];

describe('buttonClasses', () => {
  it('returns classes for every variant x colour x size', () => {
    for (const variant of VARIANTS) {
      for (const color of COLORS) {
        for (const size of SIZES) {
          expect(buttonClasses({ variant, color, size }).trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('uses the Minimal heights 30 / 36 / 48 px', () => {
    expect(buttonClasses({ size: 'small' })).toContain('h-[30px]');
    expect(buttonClasses({ size: 'medium' })).toContain('h-9');
    expect(buttonClasses({ size: 'large' })).toContain('h-12');
  });

  it('makes icon-only buttons round squares of the same sizes', () => {
    const classes = buttonClasses({ variant: 'text', color: 'inherit', size: 'medium', iconOnly: true });
    expect(classes).toContain('rounded-full');
    expect(classes).toContain('h-9 w-9');
  });
});
