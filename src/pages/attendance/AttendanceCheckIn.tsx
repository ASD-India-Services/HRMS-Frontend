import { useAttendanceToday } from '@/hooks/useAttendance'
import { CheckInButton } from './components/CheckInButton'
import { AttendanceStatus } from './components/AttendanceStatus'
import { CardSkeleton, ErrorState } from '@/components/Skeleton'

/**
 * Attendance Check-In/Check-Out page.
 *
 * Provides a mobile-friendly interface for employees to:
 * - Check in with GPS coordinates captured from the device
 * - Check out with GPS coordinates
 * - View today's attendance status and working hours
 *
 * Validates: Requirement 27.3
 */
export function AttendanceCheckIn() {
  const { data: record, isLoading, error, refetch } = useAttendanceToday()

  return (
    <div>
      {/* Page heading */}
      <h1 className="text-2xl font-semibold text-gray-900">Attendance</h1>
      <p className="mt-1 text-sm text-gray-600">
        Mark your daily attendance with location verification
      </p>

      <div className="mt-6 max-w-lg space-y-8">
        {/* Loading state */}
        {isLoading && <CardSkeleton count={1} />}

        {/* Error fetching attendance */}
        {error && !isLoading && (
          <ErrorState onRetry={refetch} />
        )}

        {/* Check-In / Check-Out Button */}
        {!isLoading && !error && (
          <section className="flex justify-center py-4" aria-label="Attendance action">
            <CheckInButton record={record} />
          </section>
        )}

        {/* Attendance Status Card */}
        {!isLoading && !error && (
          <section aria-label="Attendance status">
            <AttendanceStatus record={record} isLoading={isLoading} />
          </section>
        )}
      </div>
    </div>
  )
}
