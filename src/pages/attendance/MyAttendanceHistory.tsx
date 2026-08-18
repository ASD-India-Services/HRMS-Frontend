/**
 * My Attendance History — Shows the logged-in employee's attendance records
 * with month navigation. Available to all roles with attendance.view permission.
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Attendance</h1>
        <p className="mt-1 text-sm text-gray-600">View your attendance history by month</p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Prev
        </button>
        <h2 className="text-lg font-semibold text-gray-900">{monthLabel}</h2>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          disabled={monthOffset >= 0}
          className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{presentDays}</p>
          <p className="text-xs text-gray-500 mt-1">Days Present</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{lateDays}</p>
          <p className="text-xs text-gray-500 mt-1">Late Arrivals</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totalHours.toFixed(1)}h</p>
          <p className="text-xs text-gray-500 mt-1">Total Hours</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No attendance records for this month</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Check Out</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {records.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(r.attendance_date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatTime(r.check_in)}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatTime(r.check_out)}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{formatHours(r.working_hours, r.check_in, r.check_out)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === 'present' ? 'bg-green-100 text-green-700' :
                      r.status === 'absent' ? 'bg-red-100 text-red-700' :
                      r.status === 'half_day' ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {r.status}
                      {r.is_late && ' (Late)'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatTime(t: string | null): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
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
