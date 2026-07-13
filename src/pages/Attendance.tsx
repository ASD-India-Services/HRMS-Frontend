import { AttendanceCheckIn } from './attendance/AttendanceCheckIn'

/**
 * Attendance module entry point.
 * Renders the check-in/check-out page for daily attendance.
 *
 * Validates: Requirement 27.3
 */
export default function Attendance() {
  return <AttendanceCheckIn />
}
