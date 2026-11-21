# Implementation Plan

Worktree: `/Users/admin/Documents/GitHub/Leadspoint CRM/hrms-frontend-worktrees/minimal-restyle` (use absolute paths). Details per phase live in `features/FEAT-00N.json`; shared facts in `context.json`.

- [ ] 1. FEAT-001 Safety net on the unmodified UI.
      Create the `hrms-frontend-worktrees/packages` symlink (package.json uses `file:../packages/auth-sdk`), `npm install`, record baseline build/lint/vitest. Add `playwright.config.ts`, `e2e/fixtures.ts` (seeded `platform_auth_*` JWT in localStorage, `page.route` API mocks, console-error guard), `e2e/smoke.spec.ts` for ~18 routes plus the /departments create modal. Screenshots go to `.agents/tasks/hrms-minimal-restyle/screens/baseline` (outside git).
      Files: playwright.config.ts, e2e/*
      Verify: `SHOT_NAME=baseline npx playwright test` passes; >= 18 PNGs; `npm run build` and `npx vitest run` pass.

- [ ] 2. FEAT-002 Tokens, Public Sans, darkMode class, Iconify, layout shell. Needs 1.
      Tokens defined once as CSS-variable channels in `src/index.css` (`:root` and `.dark`), mapped in `tailwind.config.ts` (`darkMode: 'class'`). Keep `primary-50..950` and `gray` as aliases onto the new scales so unmigrated pages stay coherent. Rebuild `Layout/{AppShell,Sidebar,Header,NavIcon}.tsx` with identical props (300px nav, 88px mini, 72px header, tinted active item). No dark toggle yet.
      Files: tailwind.config.ts, src/index.css, src/main.tsx, vite.config.ts, src/components/Layout/*, src/components/Iconify/Iconify.tsx, package.json
      Verify: `npm run build`, `npx vitest run`, `npx playwright test` pass.

- [ ] 3. FEAT-003 Shared primitives and re-skin of shared components. Needs 2.
      Add `src/components/ui/{Button,Input,Select,Textarea,Checkbox,Modal,Toast}`; re-skin CrudModal, ConfirmDialog, ActionButton, DataTable family, MetricCard, EmptyState, Skeleton, FormBuilder, ChartWidget, etc. with props unchanged. Hand-built Select/Modal/Popover, no Radix.
      Files: src/components/ui/*, src/components/{CrudModal,ConfirmDialog,ActionButton,DataTable,MetricCard,EmptyState,Skeleton,FormBuilder,ChartWidget}/*, src/App.tsx, e2e/primitives.spec.ts
      Verify: build, vitest, playwright (incl. primitives spec) pass; no page file needed edits to compile.

- [ ] 4. FEAT-004 Migrate batch A (settings, leaves, recruitment, DocumentRequests, Gratuity, CompensatoryLeave). Needs 3.
      Per module: custom modals -> Modal/CrudModal/ConfirmDialog, raw tables -> DataTable, raw controls -> ui primitives, alert -> useToast, colours -> tokens. One commit per module, review after each.
      Verify: after each module `npm run build && npx vitest run && npx playwright test`; after-screenshots compared with baseline.

- [ ] 5. FEAT-005 Migrate batch B (all remaining pages except the big three). Needs 4. Same rules and verification.

- [ ] 6. FEAT-006 HourAccount.tsx, RichTextEditor.tsx, OrgChart.tsx, cleanup, dark mode. Needs 5.
      Re-skin in place, then remove the primary/gray aliases and unreferenced code, add the dark toggle, write before/after index and report.
      Verify: build, vitest, playwright pass; `grep -rE 'bg-blue-|text-blue-|primary-[0-9]' src` empty; no raw hex outside token definitions.

## Decisions and concerns

- Select/Modal/Popover: hand-built with Tailwind, no Radix. Select stays a styled native `<select>`; Modal is a portal with Escape, scroll lock and focus trap. This adds zero dependencies beyond `@iconify/react` and `@fontsource-variable/public-sans`.
- Icons: bundle offline (Iconify offline API) so the app makes no runtime call to api.iconify.design (CSP, intranet). Exact package chosen in FEAT-002.
- Dark mode is wired in FEAT-002 but the toggle ships in FEAT-006, after all pages use tokens.
- Screenshot comparison is manual/visual (the design changes on purpose); automated checks are the smoke specs.
- Primary colour changes from blue to Minimal green `#00A76F`. Confirm that is wanted; it is the Minimal default and the plan follows it.
- LICENSE: `~/Downloads/Minimal_JavaScript_v7.7.0/LICENSE.md` only links to docs.minimals.cc/package and the MUI Store license (https://mui.com/store/license/), which I did not read in full. Concern: that license is per purchased tier/project, and this work takes only design values (colours, spacing, shadows) and no Minimal source, assets or logos. Confirm that the purchased tier covers HRMS before shipping. Iconify icon sets carry their own licenses (Solar is CC BY 4.0 as far as I recall, so verify and add attribution if so). Public Sans is OFL.
- Risks: DataTable may not cover every raw table (kept as re-skinned markup in that case); the Playwright mocks need the real list response shape (FEAT-001 reads it from the hooks).

## Digest

Verified by reading: no node_modules in the worktree; `npm run build` = `tsc -b && vite build`; lint = `oxlint`; no vitest script (`npx vitest run`, node env, alias `@`); 5 test files exist; no playwright.config or e2e dir. Build and test were NOT run (no install yet), so which tests pass today is unverified; FEAT-001 records it.

| File | Block to change | Covered by |
|---|---|---|
| tailwind.config.ts | whole `theme.extend.colors.primary` object; add `darkMode`, tokens | build + playwright smoke |
| src/index.css | `html, body` rule (`@apply bg-gray-50 text-gray-900`, system font) | smoke |
| src/main.tsx | imports (add Public Sans) | smoke |
| vite.config.ts | PWA manifest `theme_color: '#1d4ed8'` | build |
| src/components/Layout/AppShell.tsx | `AppShell()` (flex h-screen, `main p-4 sm:p-6`), `PageLoader` | smoke |
| src/components/Layout/Sidebar.tsx, Header.tsx, NavIcon.tsx | props `Sidebar{isOpen,isCollapsed,onClose,onToggleCollapse}`, `Header{onMenuToggle}`, `NavIcon{name,className}` keep | smoke |
| src/components/CrudModal/CrudModal.tsx | `CrudModalProps`, `FieldConfig` keep; internals move to Modal | primitives spec, validation.test.ts untouched |
| src/components/{ConfirmDialog,ActionButton,DataTable,MetricCard,EmptyState}/* | styling only | smoke; EmptyState.test.ts, useFilterSync.test.ts |
| src/pages/** (54 modal files, 37 raw-table pages) | JSX swaps per module | smoke per route |
| src/pages/HourAccount.tsx, src/components/RichTextEditor.tsx, src/pages/employees/OrgChart.tsx | last | smoke + screenshots |
