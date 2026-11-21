# Screenshots

Captured by `e2e/smoke.spec.ts` and `e2e/dark-mode.spec.ts` (API mocked, so lists are empty).
Same file name in each folder = same route.

| Folder | Content |
| --- | --- |
| `baseline/` | Original look, commit 2755019 (FEAT-001) |
| `after/` | Minimal restyle, light mode, all 33 smoke routes + departments create modal (final FEAT-006 run) |
| `after-dark/` | Dark mode (`theme-mode=dark`): dashboard, employees, org-chart, departments, attendance-hour-account, payroll, recruitment-pipeline, settings-general |

Compare `baseline/<slug>.png` with `after/<slug>.png` (and `after-dark/<slug>.png` for the dark set).
Regenerate: `SHOT_NAME=after npx playwright test` in the worktree.
