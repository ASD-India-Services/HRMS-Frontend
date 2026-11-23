import type { AttendanceRecord } from '@/hooks/useAttendance'
import { Card } from '@/components/ui/Card'
import { Iconify } from '@/components/Iconify'

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
      <div className="rounded-lg border border-divider bg-surface-paper p-6 shadow-sm animate-pulse">
        <div className="h-5 w-40 bg-grey-200 rounded mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-surface-neutral rounded" />
          <div className="h-16 bg-surface-neutral rounded" />
          <div className="h-16 bg-surface-neutral rounded" />
          <div className="h-16 bg-surface-neutral rounded" />
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
  const sessions = record?.sessions || []
  const isCurrentlyIn = record?.is_currently_punched_in ?? (!!record?.check_in && !record?.check_out)

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-ink-primary">
            Today&apos;s Attendance
          </h2>
          {isCurrentlyIn && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-lighter text-success-dark">
              <span className="h-1.5 w-1.5 rounded-full bg-success-main animate-pulse" />
              Active Session
            </span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <InfoCard
          label="First Check In"
          value={checkInTime}
          icon={
            <Iconify icon="arrow-right" width={20} className="text-success-main" />
          }
          subtext={record?.is_late ? 'Late entry' : undefined}
          subtextColor="text-warning-main"
        />

        <InfoCard
          label="Last Check Out"
          value={isCurrentlyIn ? 'Active Now' : checkOutTime}
          icon={
            <Iconify icon="logout" width={20} className="text-error-main" />
          }
        />

        <InfoCard
          label="Total Hours"
          value={workingHours}
          icon={
            <Iconify icon="attendance" width={20} className="text-primary-main" />
          }
        />

        <InfoCard
          label="Location"
          value={record?.is_outside_geofence ? 'Outside fence' : record?.check_in ? 'Captured' : 'Not available'}
          icon={
            <Iconify icon="geoLocations" width={20} className="text-secondary-main" />
          }
          subtext={record?.is_outside_geofence ? 'Outside geo-fence' : undefined}
          subtextColor={record?.is_outside_geofence ? 'text-error-main' : 'text-ink-secondary'}
        />
      </div>

      {/* Multiple Sessions Breakdown */}
      {sessions.length > 0 && (
        <div className="mt-5 border-t border-divider pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-ink-primary">
              Today&apos;s Sessions ({sessions.length})
            </h3>
            <span className="text-xs text-ink-secondary font-medium">
              Cumulative Hours: {workingHours}
            </span>
          </div>

          <div className="space-y-2">
            {sessions.map((sess, idx) => {
              const active = !sess.check_out_time
              return (
                <div
                  key={sess.id || idx}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg text-sm transition-colors ${
                    active
                      ? 'bg-success-lighter/50'
                      : 'bg-surface-neutral hover:bg-surface-neutral/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-paper text-xs font-bold text-ink-secondary">
                      {idx + 1}
                    </span>
                    <span className="inline-flex items-center gap-1 font-medium text-ink-primary">
                      {formatTime(sess.check_in_time)} <Iconify icon="arrow-right" width={14} /> {sess.check_out_time ? formatTime(sess.check_out_time) : 'Active Now'}
                    </span>
                    {active && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-success-lighter text-success-dark">
                        In Progress
                      </span>
                    )}
                    {sess.is_auto_checkout && (
                      <span
                        title={sess.auto_checkout_reason || 'Auto checked out'}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-warning-lighter text-warning-dark"
                      >
                        <Iconify icon="refresh" width={12} /> Auto-out
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 sm:mt-0 text-xs text-ink-secondary">
                    {sess.duration_hours != null ? (
                      <span className="font-semibold text-ink-primary">
                        {formatWorkingHours(sess.duration_hours)}
                      </span>
                    ) : (
                      <span className="text-success-main font-medium">Tracking...</span>
                    )}
                    {sess.auto_checkout_reason && (
                      <span className="text-[11px] text-warning-main italic">
                        ({sess.auto_checkout_reason})
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    present: { bg: 'bg-success-lighter', text: 'text-success-dark', label: 'Present' },
    absent: { bg: 'bg-surface-neutral', text: 'text-ink-primary', label: 'Not Marked' },
    half_day: { bg: 'bg-warning-lighter', text: 'text-warning-dark', label: 'Half Day' },
    on_leave: { bg: 'bg-primary-lighter', text: 'text-primary-dark', label: 'On Leave' },
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

function InfoCard({ label, value, icon, subtext, subtextColor = 'text-ink-secondary' }: InfoCardProps) {
  return (
    <div className="rounded-lg bg-surface-neutral p-3">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs font-medium text-ink-secondary uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-lg font-semibold text-ink-primary">{value}</p>
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

function formatWorkingHours(hours: number | string): string {
  const num = typeof hours === 'number' ? hours : parseFloat(String(hours))
  if (isNaN(num)) return String(hours)
  const h = Math.floor(num)
  const m = Math.round((num - h) * 60)
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
