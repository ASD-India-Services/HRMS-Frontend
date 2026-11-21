# HRMS Minimal restyle report

## Licence
Design language (palette, shadows, radii, nav sizes, Public Sans) is re-implemented in Tailwind tokens (`src/index.css`, `tailwind.config.ts`). No Minimal source, MUI or Radix code is copied or installed. Icons: `@iconify-icons/solar` (per-icon modules, bundled, no API calls). Confirm the Minimal licence tier covers use of its design before release.

## Decisions
- Modal: one `ui/Modal` primitive (portal, focus trap, scroll lock). Converted modals keep old behaviour (`closeOnEscape={false}` / `closeOnOverlayClick={false}`) unless the old overlay closed on click. CrudModal, ConfirmDialog and BulkActionToolbar confirm now close on Escape.
- Select: native `<select>` styled by `ui/Select`, no custom popover.
- alert() replaced with `useToast`.
- Dark mode: `useThemeMode` hook, `theme-mode` in localStorage, `dark` class on `<html>` (pre-set by inline script in index.html), toggle in Header. Colours flow through CSS variable tokens.

## Deviations
- Raw `<table>` (43) kept with token classes: DataTable needs a react-query result and server pagination.
- 25 raw hex values remain in RichTextEditor (HTML strings inserted into saved content, e.g. table borders). They must stay literal because stored content is rendered outside the app. HelpdeskTagsTab hex is user-selectable tag colour data.
- HourAccount, RichTextEditor, OrgChart were re-skinned by class mapping only; their inline SVGs were not replaced with Iconify and nothing was split.
- Pale palette chips (red/green/amber-50 style) were mapped to `error|success|warning|secondary|info-lighter/light/dark`; in dark mode they stay light chips with dark text.
- `npm run build` fails on baseline too (131 tsc TS6133 errors); count unchanged. `vite build` succeeds.
- Deleted unreferenced `components/LoadingSpinner` and `src/assets`. Compatibility aliases `primary-50..950` and `gray-*` removed from tailwind config.

## Results (final)
tsc errors 131 (= baseline), vite build ok, lint 294 warnings (= baseline), vitest 5 files/16 tests, playwright 43 passed.
