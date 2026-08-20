/**
 * Employee Self-Service Dashboard
 *
 * Dedicated dashboard view for general employees and non-admin roles.
 * Displays personal attendance status, leave balances summary,
 * recent leave requests, recent expense claims, and quick shortcuts.
 *
 * All sections are strictly permission-gated via <Can>, so sections
 * automatically hide when the user lacks the required permission.
 */

import { Link } from 'react-router-dom';
import { useAttendanceToday, useCheckIn, useCheckOut, getDeviceId } from '@/hooks/useAttendance';
import { useLeaveBalances, useLeaveApplications } from '@/hooks/useLeaves';
import { useExpenseClaims } from '@/hooks/useExpenses';
import { Can } from '@/components/Can';

export function EmployeeDashboard() {
  const { data: attendanceToday, isLoading: attendanceLoading } = useAttendanceToday();
  const checkInMut = useCheckIn();
  const checkOutMut = useCheckOut();

  const { data: balances = [], isLoading: balancesLoading } = useLeaveBalances();
  const { data: applicationsData, isLoading: appsLoading } = useLeaveApplications({ page: 1, page_size: 5 });
  const { data: expensesData, isLoading: expensesLoading } = useExpenseClaims({ page: 1, page_size: 5 });

  const triggerCheckIn = () => {
    const doCheckIn = (lat = 0, lng = 0) =>
      checkInMut.mutate({ device_id: getDeviceId(), latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lng.toFixed(6)) });

    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          (p) => doCheckIn(p.coords.latitude, p.coords.longitude),
          () => doCheckIn(),
        )
      : doCheckIn();
  };

  const triggerCheckOut = () => {
    const doCheckOut = (lat = 0, lng = 0) =>
      checkOutMut.mutate({ device_id: getDeviceId(), latitude: parseFloat(lat.toFixed(6)), longitude: parseFloat(lng.toFixed(6)) });

    navigator.geolocation
      ? navigator.geolocation.getCurrentPosition(
          (p) => doCheckOut(p.coords.latitude, p.coords.longitude),
          () => doCheckOut(),
        )
      : doCheckOut();
  };

  const isCheckedIn = !!attendanceToday?.check_in;
  const isCheckedOut = !!attendanceToday?.check_out;

  const fmtTime = (t: string | null) => {
    if (!t) return '--:--';
    // t can be "HH:MM:SS" or a full ISO string
    const date = t.includes('T') ? new Date(t) : new Date(`1970-01-01T${t}`);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Quick Action Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Can permissions={['leaves.view']}>
          <Link
            to="/my-leaves/apply"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 transition-colors"
          >
            ✈️ Apply for Leave
          </Link>
        </Can>
        <Can permissions={['attendance.view']}>
          <Link
            to="/my-attendance"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            ⏰ My Attendance Logs
          </Link>
        </Can>
        <Can permissions={['expenses.view']}>
          <Link
            to="/expenses/new"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            🧾 Submit Expense
          </Link>
        </Can>
        <Can permissions={['payroll.view']}>
          <Link
            to="/payroll"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
          >
            📄 View Payslips
          </Link>
        </Can>
      </div>

      {/* Top Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Attendance Widget */}
        <Can permissions={['attendance.view']}>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⏱️</span>
                <h2 className="text-base font-semibold text-gray-900">Today's Attendance</h2>
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isCheckedOut
                    ? 'bg-gray-100 text-gray-800'
                    : isCheckedIn
                    ? 'bg-green-100 text-green-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isCheckedOut ? 'Checked Out' : isCheckedIn ? 'Checked In' : 'Not Clocked In'}
              </span>
            </div>

            {attendanceLoading ? (
              <div className="h-24 animate-pulse rounded bg-gray-100" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-3 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Check In</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{fmtTime(attendanceToday?.check_in ?? null)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Check Out</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{fmtTime(attendanceToday?.check_out ?? null)}</p>
                  </div>
                </div>

                <div>
                  {!isCheckedIn && !isCheckedOut && (
                    <button
                      onClick={triggerCheckIn}
                      disabled={checkInMut.isPending}
                      className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {checkInMut.isPending ? 'Clocking In…' : 'Clock In Now'}
                    </button>
                  )}
                  {isCheckedIn && !isCheckedOut && (
                    <button
                      onClick={triggerCheckOut}
                      disabled={checkOutMut.isPending}
                      className="w-full rounded-lg bg-rose-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:opacity-50 transition-colors"
                    >
                      {checkOutMut.isPending ? 'Clocking Out…' : 'Clock Out Now'}
                    </button>
                  )}
                  {isCheckedOut && (
                    <p className="w-full text-center text-xs font-medium text-gray-500 py-2">
                      ✅ Shift completed for today
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Can>

        {/* Leave Balances Widget */}
        <Can permissions={['leaves.view']}>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌴</span>
                <h2 className="text-base font-semibold text-gray-900">My Leave Balances</h2>
              </div>
              <Link to="/my-leaves" className="text-xs font-medium text-primary-600 hover:text-primary-800">
                View All →
              </Link>
            </div>

            {balancesLoading ? (
              <div className="h-24 animate-pulse rounded bg-gray-100" />
            ) : balances.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No leave balance records available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {balances.slice(0, 6).map((b, i) => (
                  <div key={b.id ?? i} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <p className="text-xs font-medium text-gray-500 truncate">{b.leave_type_name}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">
                      {b.available_balance ?? b.remaining_days ?? 0}
                      <span className="text-xs font-normal text-gray-400 ml-1">days</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Can>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Leave Applications */}
        <Can permissions={['leaves.view']}>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Recent Leave Requests</h3>
              <Link to="/my-leaves" className="text-xs font-medium text-primary-600 hover:text-primary-800">
                View History →
              </Link>
            </div>

            {appsLoading ? (
              <div className="space-y-2">
                <div className="h-8 animate-pulse rounded bg-gray-100" />
                <div className="h-8 animate-pulse rounded bg-gray-100" />
              </div>
            ) : !applicationsData?.results?.length ? (
              <p className="text-xs text-gray-500 py-4 text-center">No recent leave requests found.</p>
            ) : (
              <div className="space-y-3">
                {applicationsData.results.slice(0, 4).map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-gray-800">{app.leave_type.name}</p>
                      <p className="text-gray-500">
                        {app.from_date} → {app.to_date} ({app.total_days} {app.total_days === 1 ? 'day' : 'days'})
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium capitalize ${
                        app.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : app.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Can>

        {/* Recent Expenses */}
        <Can permissions={['expenses.view']}>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Recent Expense Claims</h3>
              <Link to="/expenses" className="text-xs font-medium text-primary-600 hover:text-primary-800">
                View All →
              </Link>
            </div>

            {expensesLoading ? (
              <div className="space-y-2">
                <div className="h-8 animate-pulse rounded bg-gray-100" />
                <div className="h-8 animate-pulse rounded bg-gray-100" />
              </div>
            ) : !expensesData?.results?.length ? (
              <p className="text-xs text-gray-500 py-4 text-center">No recent expense claims submitted.</p>
            ) : (
              <div className="space-y-3">
                {expensesData.results.slice(0, 4).map((exp) => (
                  <div key={exp.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-gray-800">{exp.expense_type.name}</p>
                      <p className="text-gray-500">₹{exp.amount} · {exp.expense_date}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium capitalize ${
                        exp.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : exp.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : exp.status === 'paid'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {exp.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Can>
      </div>
    </div>
  );
}
