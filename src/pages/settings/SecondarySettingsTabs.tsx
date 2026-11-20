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
        <h2 className="text-xl font-bold tracking-tight text-gray-900">User Groups &amp; Roles</h2>
        <p className="mt-1 text-sm text-gray-500">
          Organize employees into functional user groups (e.g. HR Admin, Department Head, Payroll Manager, Field Staff).
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <UsersIcon className="h-6 w-6" />
        </div>
        <div className="max-w-md mx-auto">
          <h3 className="text-base font-bold text-gray-900">Configured User Groups</h3>
          <p className="mt-1 text-xs text-gray-500">
            Assign custom user groups and associate role policies to entire teams at once.
          </p>
        </div>
        <div>
          <Link
            to="/roles"
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
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
        <h2 className="text-xl font-bold tracking-tight text-gray-900">History Tags</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure audit log markers and automated history tags for tracking changes across employee records.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <TagIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-semibold text-gray-900">Active Audit Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {['SALARY_REVISION', 'PROMOTION', 'DEPARTMENT_TRANSFER', 'LEAVE_ADJUSTMENT', 'ATTENDANCE_OVERRIDE'].map(
            (tag) => (
              <span
                key={tag}
                className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1 font-mono text-xs font-semibold text-gray-700"
              >
                #{tag}
              </span>
            )
          )}
        </div>
        <p className="text-xs text-gray-500">
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
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Employment Types</h2>
        <p className="mt-1 text-sm text-gray-500">
          Define worker categories available during onboarding and contract renewals.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <BriefcaseIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-900">Standard Organization Employment Types</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
          {['Permanent / Full-Time', 'Contract / Consultant', 'Probationary', 'Internship', 'Part-Time', 'Freelance'].map(
            (item) => (
              <div key={item} className="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-xs font-semibold text-gray-800">
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
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Attendance Breakpoints</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure minimum hours required for Full Day, Half Day, and Short Leave classifications.
        </p>
      </div>
      <hr className="border-gray-200" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Full Day Minimum</span>
          <div className="text-2xl font-extrabold text-gray-900">8.0 hrs</div>
          <p className="text-xs text-gray-500">Working hours required to mark complete presence.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-600">Half Day Minimum</span>
          <div className="text-2xl font-extrabold text-gray-900">4.0 hrs</div>
          <p className="text-xs text-gray-500">Working hours between 4.0 and 8.0 marked as Half Day.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-red-600">Absent Cutoff</span>
          <div className="text-2xl font-extrabold text-gray-900">&lt; 4.0 hrs</div>
          <p className="text-xs text-gray-500">Work logged under 4 hours marked as Absent/LOP.</p>
        </div>
      </div>
    </div>
  );
}

export function IpRestrictionsTab() {
  return (
    <div className="space-y-6 py-2">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">IP Restrictions &amp; Geofencing</h2>
        <p className="mt-1 text-sm text-gray-500">
          Restrict web check-ins to approved office network IP subnets and GPS boundaries.
        </p>
      </div>
      <hr className="border-gray-200" />
      <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">Allowed Corporate IP Ranges</h3>
        <div className="space-y-2">
          {['10.0.0.0/8 (Corporate Internal LAN)', '192.168.1.0/24 (HQ Facility Wi-Fi)', '203.0.113.45 (Gateway Public IP)'].map((ip) => (
            <div key={ip} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-mono text-gray-800">
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
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">Grace Time &amp; Penalties</h2>
        <p className="mt-1 text-sm text-gray-500">
          Set permissible check-in delays and automated deduction rules for late coming and early departures.
        </p>
      </div>
      <hr className="border-gray-200" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Check-in Grace Period</h3>
          <div className="text-2xl font-bold text-gray-900">15 Minutes</div>
          <p className="text-xs text-gray-500">Delay permitted beyond designated shift start without penalty.</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
          <h3 className="text-sm font-bold text-gray-800">Late Penalty Rule</h3>
          <div className="text-2xl font-bold text-gray-900">3 Late = 0.5 Day LOP</div>
          <p className="text-xs text-gray-500">Cumulative monthly late arrivals trigger automated half-day leave deduction.</p>
        </div>
      </div>
    </div>
  );
}
