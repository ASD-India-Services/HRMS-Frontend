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

import { ButtonLink } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';
import { EmptyState } from '@/components/EmptyState';
import { useAttendanceToday } from '@/hooks/useAttendance';
import { useLeaveBalances, useLeaveApplications } from '@/hooks/useLeaves';
import { useExpenseClaims } from '@/hooks/useExpenses';
import { Can } from '@/components/Can';
import { CheckInButton } from '@/pages/attendance/components/CheckInButton';
import { formatDate } from '@/utils/formatters';

export function EmployeeDashboard() {
  const { data: attendanceToday, isLoading: attendanceLoading } = useAttendanceToday();

  const { data: balances = [], isLoading: balancesLoading } = useLeaveBalances();
  const { data: applicationsData, isLoading: appsLoading } = useLeaveApplications({ page: 1, page_size: 5 });
  const { data: expensesData, isLoading: expensesLoading } = useExpenseClaims({ page: 1, page_size: 5 });

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
          <ButtonLink to="/my-leaves/apply" startIcon={<Iconify icon="leaves" />}>
            Apply for Leave
          </ButtonLink>
        </Can>
        <Can permissions={['attendance.view']}>
          <ButtonLink to="/my-attendance" variant="outlined" color="inherit" startIcon={<Iconify icon="attendance" />}>
            My Attendance Logs
          </ButtonLink>
        </Can>
        <Can permissions={['expenses.view']}>
          <ButtonLink to="/expenses/new" variant="outlined" color="inherit" startIcon={<Iconify icon="expenses" />}>
            Submit Expense
          </ButtonLink>
        </Can>
        <Can permissions={['payroll.view']}>
          <ButtonLink to="/payroll" variant="outlined" color="inherit" startIcon={<Iconify icon="salarySlips" />}>
            View Payslips
          </ButtonLink>
        </Can>
      </div>

      {/* Top Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Attendance Widget */}
        <Can permissions={['attendance.view']}>
          <Card>
            <CardHeader
              title="Today's Attendance"
              action={
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isCheckedOut
                      ? 'bg-surface-neutral text-ink-primary'
                      : isCheckedIn
                      ? 'bg-success-lighter text-success-dark'
                      : 'bg-warning-lighter text-warning-dark'
                  }`}
                >
                  {isCheckedOut ? 'Checked Out' : isCheckedIn ? 'Checked In' : 'Not Clocked In'}
                </span>
              }
            />
            <CardContent>
              {attendanceLoading ? (
                <div className="h-24 animate-pulse rounded bg-surface-neutral" />
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-neutral p-3 text-center">
                    <div>
                      <p className="text-xs text-ink-secondary">Check In</p>
                      <p className="mt-1 text-sm font-bold text-ink-primary">{fmtTime(attendanceToday?.check_in ?? null)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-secondary">Check Out</p>
                      <p className="mt-1 text-sm font-bold text-ink-primary">{fmtTime(attendanceToday?.check_out ?? null)}</p>
                    </div>
                  </div>
                  <CheckInButton record={attendanceToday} />
                </div>
              )}
            </CardContent>
          </Card>
        </Can>

        {/* Leave Balances Widget */}
        <Can permissions={['leaves.view']}>
          <Card>
            <CardHeader
              title="My Leave Balances"
              action={
                <ButtonLink to="/my-leaves" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                  View All
                </ButtonLink>
              }
            />
            <CardContent>
              {balancesLoading ? (
                <div className="h-24 animate-pulse rounded bg-surface-neutral" />
              ) : balances.length === 0 ? (
                <EmptyState module="leaves" title="No leave balances" description="No leave balance records available." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {balances.slice(0, 6).map((b, i) => (
                    <div key={b.id ?? i} className="rounded-lg bg-surface-neutral p-3">
                      <p className="text-xs font-medium text-ink-secondary truncate">{b.leave_type_name}</p>
                      <p className="mt-1 text-xl font-bold text-ink-primary">
                        {b.available_balance ?? b.remaining_days ?? 0}
                        <span className="text-xs font-normal text-ink-disabled ml-1">days</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Can>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Leave Applications */}
        <Can permissions={['leaves.view']}>
          <Card>
            <CardHeader
              title="Recent Leave Requests"
              action={
                <ButtonLink to="/my-leaves" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                  View History
                </ButtonLink>
              }
            />
            <CardContent>
              {appsLoading ? (
                <div className="space-y-2">
                  <div className="h-8 animate-pulse rounded bg-surface-neutral" />
                  <div className="h-8 animate-pulse rounded bg-surface-neutral" />
                </div>
              ) : !applicationsData?.results?.length ? (
                <EmptyState module="leaves" title="No recent leave requests" description="No recent leave requests found." />
              ) : (
                <div className="space-y-3">
                  {applicationsData.results.slice(0, 4).map((app) => (
                    <div key={app.id} className="flex items-center justify-between rounded-lg bg-surface-neutral p-2.5 text-xs">
                      <div>
                        <p className="font-semibold text-ink-primary">{app.leave_type.name}</p>
                        <p className="inline-flex items-center gap-1 text-ink-secondary">
                          {formatDate(app.from_date)} <Iconify icon="arrow-right" width={12} /> {formatDate(app.to_date)} ({app.total_days} {app.total_days === 1 ? 'day' : 'days'})
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium capitalize ${
                          app.status === 'approved'
                            ? 'bg-success-lighter text-success-dark'
                            : app.status === 'rejected'
                            ? 'bg-error-lighter text-error-dark'
                            : 'bg-warning-lighter text-warning-dark'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Can>

        {/* Recent Expenses */}
        <Can permissions={['expenses.view']}>
          <Card>
            <CardHeader
              title="Recent Expense Claims"
              action={
                <ButtonLink to="/expenses" variant="text" size="small" endIcon={<Iconify icon="arrow-right" />}>
                  View All
                </ButtonLink>
              }
            />
            <CardContent>
              {expensesLoading ? (
                <div className="space-y-2">
                  <div className="h-8 animate-pulse rounded bg-surface-neutral" />
                  <div className="h-8 animate-pulse rounded bg-surface-neutral" />
                </div>
              ) : !expensesData?.results?.length ? (
                <EmptyState module="expenses" title="No recent expense claims" description="No recent expense claims submitted." />
              ) : (
                <div className="space-y-3">
                  {expensesData.results.slice(0, 4).map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between rounded-lg bg-surface-neutral p-2.5 text-xs">
                      <div>
                        <p className="font-semibold text-ink-primary">{exp.expense_type.name}</p>
                        <p className="text-ink-secondary">₹{exp.amount} · {formatDate(exp.expense_date)}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium capitalize ${
                          exp.status === 'approved'
                            ? 'bg-success-lighter text-success-dark'
                            : exp.status === 'rejected'
                            ? 'bg-error-lighter text-error-dark'
                            : exp.status === 'paid'
                            ? 'bg-primary-lighter text-primary-dark'
                            : 'bg-warning-lighter text-warning-dark'
                        }`}
                      >
                        {exp.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Can>
      </div>
    </div>
  );
}
