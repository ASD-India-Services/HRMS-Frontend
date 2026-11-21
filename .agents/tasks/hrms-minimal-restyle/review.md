# Minimal restyle of HRMS frontend (Tailwind tokens, ui primitives, Iconify)

The branch re-skins about 250 files onto semantic Tailwind tokens (Public Sans, RGB-channel CSS variables). It adds `ui/` primitives (Button, Input, Select, Textarea, Checkbox, Modal, Toast), replaces hand-built modals and `alert()` calls with them, and moves nav icons to Iconify with inlined Solar data. Routes, API calls, permission checks and public props of existing components are unchanged. Evidence in FEAT-001..006 and the commit messages shows tsc at the 131-error baseline, lint at 294 warnings, vitest 16/16 and playwright 34 passing (not re-run here).

Watch for: `alert()` became toasts (likely, a presentation change only); raw hex remains only as data (confirmed).

**Verdict**: APPROVED

## High-level view

All five findings from the previous pass are fixed in 0ff6a2a. `package.json` adds only `@iconify/react` and `@fontsource-variable/public-sans`. `@iconify-icons/solar` is gone and the used icon data lives in `Iconify/solarIcons.ts`. The unused `tax` icon is removed. The dark-mode toggle, `useThemeMode`, the `index.html` pre-paint script and the `theme-mode` key are removed. The `dark` tokens and `darkMode: 'class'` stay as inert config.

Behaviour parity holds. CrudModal and the BulkActionToolbar confirm pass `closeOnEscape={false}`, and converted modals keep their old Escape and overlay behaviour. `Button` defaults to `type="button"`, and form submit buttons carry explicit `type="submit"`. A scripted comparison of every file containing a `<form>` against the base found no untyped, handler-less button that lost its submit behaviour.

Colour migration is complete. No `bg/text/border-blue-*` or `primary-NNN` classes remain in `src`. Raw hex remains only in RichTextEditor (stored HTML content and highlight swatches), HelpdeskTagsTab (user-chosen tag colours), and the PWA `theme-color` values in `index.html` and `vite.config.ts`, which cannot use CSS variables.

Every new component and module is imported elsewhere, and `LoadingSpinner` was deleted as unused.

<details>
<summary>Issues (0)</summary>

No blocking issues.

</details>

## Non-blocking notes

- `alert()` to `useToast` (likely): error messages are no longer modal and blocking. Presentation change only.
- RecruitmentStages: a malformed cog SVG path was fixed (the commit says it threw a console error). This is an unrequested but harmless fix.
- `tsc -b` still reports the 131 baseline errors, so `npm run build` fails as it did before the change.
