import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  UsersIcon,
  TagIcon,
  CloudIcon,
  BriefcaseIcon,
  ExternalLinkIcon,
} from './SettingsIcons';

export { EmployeePermissionTab } from './EmployeePermissionTab';

export function UserGroupTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink-primary">User Groups &amp; Roles</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Organize employees into functional user groups (e.g. HR Admin, Department Head, Payroll Manager, Field Staff).
        </p>
      </div>

      <div className="rounded-2xl border border-divider bg-surface-neutral/50 p-6 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-lighter text-primary-main">
          <UsersIcon className="h-6 w-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-base font-bold text-ink-primary">Configured User Groups</h3>
          <p className="mt-1 text-xs text-ink-secondary">
            Assign custom user groups and associate role policies to entire teams at once.
          </p>
        </div>
        <div>
          <Link
            to="/roles"
            className="inline-flex items-center gap-2 rounded-md bg-primary-main px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-primary-dark transition-colors"
          >
            <span>View User Groups in Roles</span>
            <ExternalLinkIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HistoryTagsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink-primary">History Tags</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Configure audit log markers and automated history tags for tracking changes across employee records.
        </p>
      </div>

      <div className="rounded-2xl border border-divider bg-surface-paper p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <TagIcon className="h-5 w-5 text-primary-main" />
          <h3 className="text-base font-semibold text-ink-primary">Active Audit Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {['SALARY_REVISION', 'PROMOTION', 'DEPARTMENT_TRANSFER', 'LEAVE_ADJUSTMENT', 'ATTENDANCE_OVERRIDE'].map(
            (tag) => (
              <span
                key={tag}
                className="rounded-lg border border-divider bg-surface-neutral px-3 py-1 font-mono text-xs font-semibold text-ink-primary"
              >
                #{tag}
              </span>
            )
          )}
        </div>
        <p className="text-xs text-ink-secondary">
          Audit entries are automatically logged and can be viewed under <strong>Administration &gt; Audit Logs</strong>.
        </p>
      </div>
    </div>
  );
}

export { GdriveBackupTab } from './GdriveBackupTab';

export function EmploymentTypesTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink-primary">Employment Types</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Define worker categories available during onboarding and contract renewals.
        </p>
      </div>

      <div className="rounded-2xl border border-divider bg-surface-paper p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="h-5 w-5 text-primary-main" />
          <h3 className="text-sm font-semibold text-ink-primary">Standard Organization Employment Types</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {['Permanent / Full-Time', 'Contract / Consultant', 'Probationary', 'Internship', 'Part-Time', 'Freelance'].map(
            (item) => (
              <div key={item} className="rounded-xl border border-divider bg-surface-neutral/70 p-3 text-xs font-semibold text-ink-primary">
                {item}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export function AttendanceBreakpointsTab() {
  return (
    <div className="space-y-6 py-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Attendance Breakpoints</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Configure minimum hours required for Full Day, Half Day, and Short Leave classifications.
        </p>
      </div>
      <hr className="border-divider" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-divider bg-surface-paper p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-main">Full Day Minimum</span>
          <div className="text-2xl font-extrabold text-ink-primary">8.0 hrs</div>
          <p className="text-xs text-ink-secondary">Working hours required to mark complete presence.</p>
        </div>
        <div className="rounded-xl border border-divider bg-surface-paper p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Half Day Minimum</span>
          <div className="text-2xl font-extrabold text-ink-primary">4.0 hrs</div>
          <p className="text-xs text-ink-secondary">Working hours between 4.0 and 8.0 marked as Half Day.</p>
        </div>
        <div className="rounded-xl border border-divider bg-surface-paper p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">Absent Cutoff</span>
          <div className="text-2xl font-extrabold text-ink-primary">&lt; 4.0 hrs</div>
          <p className="text-xs text-ink-secondary">Work logged under 4 hours marked as Absent/LOP.</p>
        </div>
      </div>
    </div>
  );
}

export function IpRestrictionsTab() {
  return (
    <div className="space-y-6 py-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-primary">IP Restrictions &amp; Geofencing</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Restrict web check-ins to approved office network IP subnets and GPS boundaries.
        </p>
      </div>
      <hr className="border-divider" />
      <div className="rounded-xl border border-divider bg-surface-paper p-6 space-y-4">
        <h3 className="text-base font-semibold text-ink-primary">Allowed Corporate IP Ranges</h3>
        <div className="space-y-2">
          {['10.0.0.0/8 (Corporate Internal LAN)', '192.168.1.0/24 (HQ Facility Wi-Fi)', '203.0.113.45 (Gateway Public IP)'].map((ip) => (
            <div key={ip} className="flex items-center justify-between rounded-lg border border-divider bg-surface-neutral px-4 py-2 text-xs font-mono text-ink-primary">
              <span>{ip}</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">Whitelisted</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GraceTimeTab() {
  return (
    <div className="space-y-6 py-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-ink-primary">Grace Time &amp; Penalties</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Set permissible check-in delays and automated deduction rules for late coming and early departures.
        </p>
      </div>
      <hr className="border-divider" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-divider bg-surface-paper p-6 space-y-3">
          <h3 className="text-sm font-bold text-ink-primary">Check-in Grace Period</h3>
          <div className="text-2xl font-bold text-ink-primary">15 Minutes</div>
          <p className="text-xs text-ink-secondary">Delay permitted beyond designated shift start without penalty.</p>
        </div>
        <div className="rounded-xl border border-divider bg-surface-paper p-6 space-y-3">
          <h3 className="text-sm font-bold text-ink-primary">Late Penalty Rule</h3>
          <div className="text-2xl font-bold text-ink-primary">3 Late = 0.5 Day LOP</div>
          <p className="text-xs text-ink-secondary">Cumulative monthly late arrivals trigger automated half-day leave deduction.</p>
        </div>
      </div>
    </div>
  );
}
