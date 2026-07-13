/**
 * Unit tests for EmptyState module messages.
 *
 * Validates Property 14: Empty state messages are unique per module.
 * Validates Requirements 17.1, 17.2, 17.3.
 */

import { describe, it, expect } from 'vitest';
import { MODULE_MESSAGES } from './EmptyState';

const REQUIRED_MODULES = [
  'employees',
  'leaves',
  'attendance',
  'payroll',
  'recruitment',
  'appraisals',
  'expenses',
  'onboarding',
  'training',
  'grievances',
  'travel',
  'overtime',
  'settlements',
];

describe('EmptyState MODULE_MESSAGES', () => {
  it('defines messages for all required HRMS modules', () => {
    for (const mod of REQUIRED_MODULES) {
      expect(MODULE_MESSAGES[mod]).toBeDefined();
      expect(MODULE_MESSAGES[mod].title).toBeTruthy();
      expect(MODULE_MESSAGES[mod].description).toBeTruthy();
      expect(MODULE_MESSAGES[mod].ctaLabel).toBeTruthy();
    }
  });

  it('has unique titles across all modules (Property 14)', () => {
    const titles = Object.values(MODULE_MESSAGES).map((m) => m.title);
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(titles.length);
  });

  it('has unique descriptions across all modules (Property 14)', () => {
    const descriptions = Object.values(MODULE_MESSAGES).map((m) => m.description);
    const uniqueDescriptions = new Set(descriptions);
    expect(uniqueDescriptions.size).toBe(descriptions.length);
  });

  it('has unique CTA labels across all modules', () => {
    const labels = Object.values(MODULE_MESSAGES).map((m) => m.ctaLabel);
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(labels.length);
  });

  it('each message contains non-empty strings', () => {
    for (const [module, messages] of Object.entries(MODULE_MESSAGES)) {
      expect(messages.title.trim().length).toBeGreaterThan(0);
      expect(messages.description.trim().length).toBeGreaterThan(0);
      expect(messages.ctaLabel.trim().length).toBeGreaterThan(0);
    }
  });
});
