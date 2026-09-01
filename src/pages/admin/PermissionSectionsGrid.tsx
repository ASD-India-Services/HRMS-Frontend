/**
 * Shared permission picker used by the role editor screens.
 *
 * Renders a two-level hierarchy that mirrors the HRMS sidebar:
 *
 *   Section heading                     (select-all + counter)
 *     ├─ section-common permissions     (apply to the whole section)
 *     └─ SUBSECTION SUBHEADING          (select-all + counter)
 *           └─ that subsection's permissions
 */

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PermissionItem {
  id: string;
  code: string;
  display_name: string;
  module?: string;
  module_label?: string;
  subsection?: string;
  subsection_label?: string;
}

/** A subsection subheading and the permissions that belong to it. */
export interface PermissionSubsection {
  key: string;
  label: string;
  sort_order: number;
  permissions: PermissionItem[];
}

/**
 * A section heading. `common` holds permissions that apply to the whole
 * section and render directly under the heading (not under a subheading).
 */
export interface PermissionSection {
  module: string;
  label: string;
  common: PermissionItem[];
  subsections: PermissionSubsection[];
}

/**
 * Response of GET /api/v1/permissions/.
 * `sections` carries the hierarchy; remaining keys are the legacy flat
 * `module -> permissions` mapping kept for other consumers.
 */
interface PermissionsResponse {
  sections?: PermissionSection[];
  [module: string]: PermissionSection[] | PermissionItem[] | undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Every permission in a section (common + all subsections). */
export function sectionPermissions(section: PermissionSection): PermissionItem[] {
  return [...section.common, ...section.subsections.flatMap((s) => s.permissions)];
}

function titleCase(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Actions that are "higher" than view — selecting any of these implies view. */
const HIGHER_ACTIONS = new Set([
  'create',
  'edit',
  'delete',
  'manage',
  'approve',
  'mark_paid',
]);

function actionOf(code: string): string {
  const dot = code.lastIndexOf('.');
  return dot === -1 ? '' : code.slice(dot + 1);
}

/**
 * Given the currently-selected permission ids, add the matching `.view`
 * permission for any group (section-common block or subsection) where a
 * "higher" permission (create/edit/delete/manage/approve/mark_paid) is
 * selected but its view permission is not.
 *
 * This keeps view + higher permissions consistent: you cannot grant edit
 * without also granting the view that lets the user reach the page.
 *
 * Returns a new Set (never mutates the input). If nothing needs adding it
 * returns a set with the same contents.
 */
export function withImpliedViewPermissions(
  sections: PermissionSection[],
  selectedIds: Set<string>,
): Set<string> {
  const next = new Set(selectedIds);

  // Evaluate each group independently: section-common block, then each subsection.
  const groups: PermissionItem[][] = [];
  for (const section of sections) {
    if (section.common.length > 0) groups.push(section.common);
    for (const sub of section.subsections) groups.push(sub.permissions);
  }

  for (const group of groups) {
    const selectedInGroup = group.filter((p) => next.has(p.id));
    if (selectedInGroup.length === 0) continue;

    const hasHigher = selectedInGroup.some((p) => HIGHER_ACTIONS.has(actionOf(p.code)));
    if (!hasHigher) continue;

    const viewPerm = group.find((p) => actionOf(p.code) === 'view');
    if (viewPerm) next.add(viewPerm.id);
  }

  return next;
}

// ─── Data hook ───────────────────────────────────────────────────────────────

export function useAllPermissions() {
  return useQuery<PermissionSection[]>({
    queryKey: ['permissions', 'all'],
    queryFn: () =>
      api.get<PermissionsResponse>('/api/v1/permissions/').then((res) => {
        const data = res.data;
        if (Array.isArray(data?.sections)) return data.sections;

        // Fallback for an older backend that only returns module -> permissions:
        // render each module as a section with everything as section-common.
        return Object.entries(data ?? {})
          .filter(([key]) => key !== 'sections')
          .map(([module, perms]) => ({
            module,
            label: titleCase(module),
            common: (perms as PermissionItem[]) ?? [],
            subsections: [],
          }));
      }),
  });
}

// ─── Presentational pieces ───────────────────────────────────────────────────

function PermissionCheckbox({
  perm,
  checked,
  onToggle,
  accent,
}: {
  perm: PermissionItem;
  checked: boolean;
  onToggle: (permId: string) => void;
  accent: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(perm.id)}
        className={`h-4 w-4 flex-shrink-0 rounded border-gray-300 ${accent}`}
        aria-label={perm.display_name}
      />
      <span className="text-sm font-medium text-gray-700">{perm.display_name}</span>
    </label>
  );
}

export interface PermissionSectionsGridProps {
  sections: PermissionSection[];
  selectedIds: Set<string>;
  /** Toggle a single permission. */
  onTogglePermission: (permId: string) => void;
  /** Select-all / deselect-all for a section or subsection. */
  onToggleGroup: (permissions: PermissionItem[]) => void;
  /** Tailwind classes for checkbox accent colour. */
  accent?: string;
}

export function PermissionSectionsGrid({
  sections,
  selectedIds,
  onTogglePermission,
  onToggleGroup,
  accent = 'text-primary-600 focus:ring-primary-500',
}: PermissionSectionsGridProps) {
  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const allSectionPerms = sectionPermissions(section);
        if (allSectionPerms.length === 0) return null;

        const selectedCount = allSectionPerms.filter((p) => selectedIds.has(p.id)).length;
        const allSelected = selectedCount === allSectionPerms.length;
        const someSelected = !allSelected && selectedCount > 0;

        return (
          <div key={section.module} className="rounded-lg border border-gray-200 bg-white p-4">
            {/* ── Section heading ───────────────────────────────────────── */}
            <div className="mb-3 flex items-center gap-3 border-b border-gray-100 pb-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={() => onToggleGroup(allSectionPerms)}
                  className={`h-4 w-4 rounded border-gray-300 ${accent}`}
                  aria-label={`Select all ${section.label} permissions`}
                />
                <span className="text-sm font-semibold text-gray-900">{section.label}</span>
              </label>
              <span className="text-xs text-gray-400">
                {selectedCount}/{allSectionPerms.length} selected
              </span>
            </div>

            {/* ── Section-common permissions (directly under the heading) ── */}
            {section.common.length > 0 && (
              <div className="ml-6 space-y-3">
                {section.common.map((perm) => (
                  <PermissionCheckbox
                    key={perm.id}
                    perm={perm}
                    checked={selectedIds.has(perm.id)}
                    onToggle={onTogglePermission}
                    accent={accent}
                  />
                ))}
              </div>
            )}

            {/* ── Subsections ───────────────────────────────────────────── */}
            {section.subsections.length > 0 && (
              <div className={section.common.length > 0 ? 'mt-4 space-y-4' : 'space-y-4'}>
                {section.subsections.map((sub) => {
                  const subSelected = sub.permissions.filter((p) => selectedIds.has(p.id)).length;
                  const subAll = subSelected === sub.permissions.length;
                  const subSome = !subAll && subSelected > 0;

                  return (
                    <div key={sub.key} className="ml-4 border-l-2 border-gray-100 pl-4">
                      {/* Subsection subheading */}
                      <div className="mb-2 flex items-center gap-2">
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={subAll}
                            ref={(el) => {
                              if (el) el.indeterminate = subSome;
                            }}
                            onChange={() => onToggleGroup(sub.permissions)}
                            className={`h-4 w-4 rounded border-gray-300 ${accent}`}
                            aria-label={`Select all ${sub.label} permissions`}
                          />
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                            {sub.label}
                          </span>
                        </label>
                        <span className="text-xs text-gray-400">
                          {subSelected}/{sub.permissions.length}
                        </span>
                      </div>

                      {/* That subsection's permissions */}
                      <div className="ml-6 space-y-3">
                        {sub.permissions.map((perm) => (
                          <PermissionCheckbox
                            key={perm.id}
                            perm={perm}
                            checked={selectedIds.has(perm.id)}
                            onToggle={onTogglePermission}
                            accent={accent}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
