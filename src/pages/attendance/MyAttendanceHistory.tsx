/**
 * My Attendance History — Shows the logged-in employee's attendance records
 * with month navigation. Available to all roles with attendance.view permission.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/EmptyState';
import { Iconify } from '@/components/Iconify';
import { formatDate, formatTime } from '@/utils/formatters';

export default function MyAttendanceHistory() {
  const [monthOffset, setMonthOffset] = useState(0);

  const currentMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);

  const monthParam = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const { data, isLoading } = useQuery({
    queryKey: ['my-attendance-history', monthParam],
    queryFn: () => api.get('/api/v1/attendance/', { params: { month: monthParam, mine: 'true' } }).then(r => {
      const d = r.data;
      return Array.isArray(d) ? d : d.results ?? [];
    }),
  });

  const records = data || [];

  // Stats
  const presentDays = records.filter((r: any) => r.status === 'present').length;
  const lateDays = records.filter((r: any) => r.is_late).length;
  const absentDays = records.filter((r: any) => r.status === 'absent').length;
  const onLeaveDays = records.filter((r: any) => r.status === 'on_leave').length;
  const totalHours = records.reduce((sum: number, r: any) => {
    const h = r.working_hours;
    // Try working_hours first
    if (h && h !== '0' && h !== '0.00' && h !== '00:00:00') {
      const s = String(h);
      if (s.includes(':')) {
        const parts = s.split(':').map(Number);
        return sum + (parts[0] || 0) + ((parts[1] || 0) / 60);
      }
      return sum + parseFloat(s || '0');
    }
    // Fallback: calculate from check-in/check-out
    if (r.check_in && r.check_out) {
      const [inH, inM] = r.check_in.split(':').map(Number);
      const [outH, outM] = r.check_out.split(':').map(Number);
      const mins = (outH * 60 + outM) - (inH * 60 + inM);
      if (mins > 0) return sum + (mins / 60);
    }
    return sum;
  }, 0);

  return (
    <PageContainer maxWidth="lg">
      <PageHeader title="My Attendance" subtitle="View your attendance history by month" />

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="outlined" color="inherit"
          onClick={() => setMonthOffset(o => o - 1)}
          startIcon={<Iconify icon="arrow-left" />}
        >
          Prev
        </Button>
        <h2 className="text-lg font-semibold text-ink-primary">{monthLabel}</h2>
        <Button variant="outlined" color="inherit"
          onClick={() => setMonthOffset(o => o + 1)}
          disabled={monthOffset >= 0}
          endIcon={<Iconify icon="arrow-right" />}
        >
          Next
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Present" value={presentDays} icon="success" />
        <StatCard title="Absent" value={absentDays} icon="error" />
        <StatCard title="On Leave" value={onLeaveDays} icon="leaves" />
        <StatCard title="Late" value={lateDays} icon="warning" />
        <StatCard title="Hours" value={`${totalHours.toFixed(1)}h`} icon="attendance" />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-light border-t-primary-main" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <EmptyState module="attendance" title="No attendance records" description="No attendance records for this month" />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="min-w-full divide-y divide-divider">
            <thead className="bg-surface-neutral">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Check In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Check Out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Hours</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-ink-secondary uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider bg-surface-paper">
              {records.map((r: any) => {
                const sessionCount = r.sessions?.length || r.total_sessions_count || (r.check_in ? 1 : 0);
                const hasAuto = r.sessions?.some((s: any) => s.is_auto_checkout);

                return (
                  <tr key={r.id} className="hover:bg-surface-neutral">
                    <td className="px-4 py-3 text-sm text-ink-primary font-medium">
                      {formatDate(r.attendance_date)}
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-primary">{formatTime(r.check_in)}</td>
                    <td className="px-4 py-3 text-sm text-ink-primary">
                      {r.check_out ? formatTime(r.check_out) : (r.sessions?.some((s: any) => !s.check_out_time) ? 'Active' : '—')}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-ink-primary">
                      <div className="flex items-center gap-1.5">
                        <span>{formatHours(r.working_hours, r.check_in, r.check_out)}</span>
                        {sessionCount > 1 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-secondary-lighter text-secondary-dark">
                            {sessionCount} sessions
                          </span>
                        )}
                        {hasAuto && (
                          <span
                            title="Contains auto check-out session"
                            className="inline-flex items-center px-1.5 gap-0.5 py-0.5 rounded text-[10px] font-semibold bg-warning-lighter text-warning-dark"
                          >
                            <Iconify icon="refresh" width={12} /> Auto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        r.status === 'present' ? 'bg-success-lighter text-success-dark' :
                        r.status === 'absent' ? 'bg-error-lighter text-error-dark' :
                        r.status === 'half_day' ? 'bg-warning-lighter text-warning-dark' :
                        r.status === 'on_leave' ? 'bg-primary-lighter text-primary-dark' :
                        r.status === 'holiday' ? 'bg-secondary-lighter text-secondary-dark' :
                        'bg-surface-neutral text-ink-primary'
                      }`}>
                        {r.status === 'on_leave' ? 'On Leave' : r.status === 'half_day' ? 'Half Day' : r.status}
                        {r.is_late && ' (Late)'}
                        {r.is_early_out && ' (Early Out)'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </PageContainer>
  );
}


function formatHours(h: string | number | null, checkIn?: string | null, checkOut?: string | null): string {
  // If working_hours has a value, use it
  if (h && h !== '0' && h !== '0.00' && h !== '00:00:00') {
    const s = String(h);
    if (s.includes(':')) {
      const parts = s.split(':').map(Number);
      const hrs = parts[0] || 0;
      const mins = parts[1] || 0;
      if (hrs === 0 && mins === 0) return '—';
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    const num = parseFloat(s);
    if (!num || num <= 0) return '—';
    const hrs = Math.floor(num);
    const mins = Math.round((num - hrs) * 60);
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  // Fallback: calculate from check-in and check-out times
  if (checkIn && checkOut) {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const totalMins = (outH * 60 + outM) - (inH * 60 + inM);
    if (totalMins <= 0) return '—';
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return '—';
}
