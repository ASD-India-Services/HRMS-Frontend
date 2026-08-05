import type { AttendanceRecord } from '@/hooks/useAttendance'

interface AttendanceStatusProps {
  record: AttendanceRecord | null | undefined
  isLoading: boolean
}

/**
 * Displays today's attendance status including check-in time,
 * check-out time, working hours, and status badges.
 */
export function AttendanceStatus({ record, isLoading }: AttendanceStatusProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-5 w-40 bg-gray-200 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
          <div className="h-16 bg-gray-100 rounded" />
        </div>
      </div>
    )
  }

  const checkInTime = record?.check_in
    ? formatTime(record.check_in)
    : '—'

  const checkOutTime = record?.check_out
    ? formatTime(record.check_out)
    : '—'

  const workingHours = record?.working_hours
    ? formatWorkingHours(record.working_hours)
    : '—'

  const status = record?.status ?? 'absent'

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Today&apos;s Attendance
        </h2>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard
          label="Check In"
          value={checkInTime}
          icon={
            <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          }
          subtext={record?.is_late ? 'Late entry' : undefined}
          subtextColor="text-amber-600"
        />

        <InfoCard
          label="Check Out"
          value={checkOutTime}
          icon={
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
        />

        <InfoCard
          label="Working Hours"
          value={workingHours}
          icon={
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <InfoCard
          label="Location"
          value={record?.is_outside_geofence ? 'Outside fence' : record?.check_in ? 'Captured' : 'Not available'}
          icon={
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
          subtext={record?.is_outside_geofence ? 'Outside geo-fence' : undefined}
          subtextColor={record?.is_outside_geofence ? 'text-red-600' : 'text-gray-500'}
        />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    present: { bg: 'bg-green-100', text: 'text-green-800', label: 'Present' },
    absent: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Not Marked' },
    half_day: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Half Day' },
    on_leave: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'On Leave' },
  }

  const { bg, text, label } = config[status] ?? config.absent

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      {label}
    </span>
  )
}

interface InfoCardProps {
  label: string
  value: string
  icon: React.ReactNode
  subtext?: string
  subtextColor?: string
}

function InfoCard({ label, value, icon, subtext, subtextColor = 'text-gray-500' }: InfoCardProps) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
      {subtext && (
        <p className={`text-xs mt-0.5 ${subtextColor}`}>{subtext}</p>
      )}
    </div>
  )
}

function formatTime(timeStr: string): string {
  try {
    // Backend returns time as "HH:MM:SS" or "HH:MM:SS.microseconds"
    const match = timeStr.match(/^(\d{2}):(\d{2})/)
    if (match) {
      const h = parseInt(match[1], 10)
      const m = match[2]
      const ampm = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 || 12
      return `${h12}:${m} ${ampm}`
    }
    // Fallback: try parsing as full ISO date
    const date = new Date(timeStr)
    if (isNaN(date.getTime())) return timeStr
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return timeStr
  }
}

function formatWorkingHours(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
