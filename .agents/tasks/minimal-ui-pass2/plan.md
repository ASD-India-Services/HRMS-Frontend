# Implementation Plan: Minimal UI pass 2

Worktree: `/Users/admin/Documents/GitHub/Leadspoint CRM/hrms-frontend-worktrees/minimal-ui-pass2` (branch `minimal-ui-pass2`). Detailed per-feature steps are in `features/FEAT-00N.json` next to this file; `context.json` holds the shared project facts.

Decision (open point): Button keeps Minimal's four variants (contained, outlined, soft, text) and seven colours (inherit, primary, secondary, info, success, warning, error). Sizes follow Minimal: small 30px, medium 36px (default), large 48px. Icons go before the label (startIcon, 18px). IconButton is round, sizes 30/36/48, variants text and soft, aria-label required. ButtonLink gives links the same look. Usage rule: one contained primary per page header, secondary = outlined inherit, cancel = text inherit, destructive = error.

Baseline measured in the worktree: 385 raw `<button>` in src/pages (about 100 more in src/components, 46 in RichTextEditor), 20 raw `<select>` in src/pages, 105 h1 elements with 5 different class strings, 463 `bg-surface-paper` card uses across 105 files with at least 6 different card class strings, 82 pages wrapped in `mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8` on top of AppShell's own main padding (the cause of the shifting x offsets), 36 files with emoji or glyph icons, 5 pages importing recharts directly.

- [ ] 1. FEAT-001 Foundation. Add buttonClasses, ButtonLink, IconButton, Card/CardHeader/CardContent, PageContainer, PageHeader, StatCard, chartTheme + ChartCard, Select with chevron, new Iconify icons, sidebar group icons; unify AppShell main padding; rebuild MetricCard, ChartWidget, EmptyState on them; migrate every raw button/select in src/components.
      Files: src/components/ui/{Button,Card,PageContainer,StatCard,Chart,Select}/*, src/components/{Layout,Iconify,MetricCard,ChartWidget,EmptyState,DataTable,CrudModal,FormBuilder,BulkActions,WorkflowEngine,leaves}/*, RichTextEditor.tsx, src/config/navigation.ts
      Verify: gate (tsc <=131 errors, oxlint <=294 warnings, `npx vitest run`, `npx vite build`, `npx playwright test e2e/primitives.spec.ts`); `grep -rn '<button' src/components | grep -v ui/Button` is empty.
- [ ] 2. FEAT-002 Migrate module sub-directories except recruitment and settings (depends on 1).
      Verify: gate; grep for raw button/select/emoji in those dirs is empty.
- [ ] 3. FEAT-003 Migrate the 86 top-level src/pages/*.tsx (depends on 1; independent of 2).
      Verify: gate; `grep -nE '<button|<select' src/pages/*.tsx` is empty.
- [ ] 4. FEAT-004 Migrate recruitment and settings (depends on 1).
      Verify: gate.
- [ ] 5. FEAT-005 Expand screenshot spec to every module, capture `after2`, run the final grep gate (depends on 1-4).
      Verify: `npx playwright test` all pass; gate numbers recorded.
- [ ] 6. Review loop: fixer runs the full gate and fixes seams; reviewer compares `screens/after2` side by side (container offsets, card, stat card, chart, empty state, button, select) and re-runs the grep gate; verdict in `review.json`.

## Digest

Verified by reading (not by running): build is `npm run build` (`tsc -b && vite build`), lint `npm run lint` (oxlint), e2e `npm run test:e2e`; vitest config exists (`vitest.config.ts`). Baseline from the previous report, not re-run: tsc 131, oxlint 294, vitest 16/16, playwright 34.

| File | Block to change | Test |
|---|---|---|
| src/components/ui/Button/Button.tsx | `Button` forwardRef; move COLOR_CLASSES/SIZE_CLASSES to buttonClasses.ts; add startIcon/endIcon | new buttonClasses unit test; e2e/primitives.spec.ts |
| src/components/ui/Select/Select.tsx | `Select` forwardRef, `h-10 pr-8` | primitives, smoke |
| src/components/Layout/AppShell.tsx | `<main className="flex-1 overflow-y-auto ... p-4 sm:p-6 lg:px-10 lg:py-8">` | smoke screenshots |
| src/components/Layout/Sidebar.tsx | group caption `<button>` (about line 150), collapse buttons | smoke |
| src/config/navigation.ts | `interface NavGroup { label; items }` add `icon` | smoke |
| src/components/MetricCard/MetricCard.tsx | `MetricCard`, `TrendIndicator`; props in src/types/dashboard.ts `MetricCardProps` | smoke /dashboard |
| src/components/ChartWidget/ChartWidget.tsx | `getChartColors`, `renderLineChart/Bar/Pie/Funnel`, `ChartWidget` wrapper | smoke /dashboard |
| src/components/EmptyState/EmptyState.tsx | `EmptyState` render, CTA `<button>` | EmptyState.test.ts |
| src/components/DataTable/{DataTable,FilterBar,Pagination}.tsx | raw `<select>`, `<button>`, table wrapper at DataTable.tsx:374 | useFilterSync.test.ts, smoke list pages |
| src/components/RichTextEditor.tsx | 46 toolbar buttons | smoke |
| src/pages/** | wrappers, h1 blocks, cards, buttons, selects | smoke + final grep gate |
| e2e/smoke.spec.ts | `ROUTES` array (32 entries), `SHOT_DIR` default | full playwright run |
