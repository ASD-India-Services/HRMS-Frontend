import { useAttendanceToday } from '@/hooks/useAttendance'
import { CheckInButton } from './components/CheckInButton'
import { AttendanceStatus } from './components/AttendanceStatus'
import { CardSkeleton, ErrorState } from '@/components/Skeleton'
import { PageContainer } from '@/components/ui/PageContainer'
import { PageHeader } from '@/components/ui/PageHeader'

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
    <PageContainer>
      <PageHeader title="Attendance" subtitle="Mark your daily attendance with location verification" />
      <div className="max-w-lg space-y-8">
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
    </PageContainer>
  )
}
