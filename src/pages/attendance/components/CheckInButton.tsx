import { useState, useEffect } from 'react'
import { getCurrentPosition, isGeolocationSupported } from '@/utils/geolocation'
import type { Coordinates, GeolocationError } from '@/utils/geolocation'
import { useCheckIn, useCheckOut, getDeviceId } from '@/hooks/useAttendance'
import type { AttendanceRecord } from '@/hooks/useAttendance'
import api from '@/lib/api'
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Iconify } from '@/components/Iconify';
import { formatDate } from '@/utils/formatters'

interface CheckInButtonProps {
  /** Current attendance record for today */
  record: AttendanceRecord | null | undefined
}

type ActionState = 'idle' | 'locating' | 'submitting'

// Shift-time gating removed: employees may check in / check out at any time of day.

/**
 * Large action button that handles GPS capture and submits check-in or check-out.
 * Shows appropriate state based on today's attendance record:
 * - No record / no check-in → Show Check In button
 * - Checked in, not checked out → Show Check Out button
 * - Both checked in and out → Show completed state
 *
 * Validates shift timing before allowing check-in.
 * Handles geo-fence errors from the backend:
 * - Strict mode: displays rejection message with distance info
 * - Warn mode: displays a warning but allows the check-in
 */
export function CheckInButton({ record }: CheckInButtonProps) {
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [geofenceWarning, setGeofenceWarning] = useState<string | null>(null)
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false)

  const checkIn = useCheckIn()
  const checkOut = useCheckOut()

  // Multi-session logic
  const isCurrentlyIn = record?.is_currently_punched_in !== undefined
    ? record.is_currently_punched_in
    : (!!record?.check_in && !record?.check_out)

  const hasPriorSessions = (record?.sessions && record.sessions.length > 0) || (!!record?.check_in && !!record?.check_out)
  const isCheckIn = !isCurrentlyIn

  // Check if today is a working day (not holiday / not on leave)
  const [workingDayCheck, setWorkingDayCheck] = useState<{ is_working_day: boolean; reason: string | null }>({ is_working_day: true, reason: null })
  useEffect(() => {
    api.get('/api/v1/attendance/working-day-check/')
      .then((res) => setWorkingDayCheck(res.data))
      .catch(() => setWorkingDayCheck({ is_working_day: true, reason: null }))
  }, [])

  const isNonWorkingDay = !workingDayCheck.is_working_day

  // Policy: employees may check in / check out at any time of day. The shift
  // window no longer restricts attendance — the assigned shift is still used to
  // FLAG late arrivals (server-side), but it never blocks punching in or out.
  const shiftTimeStatus = { allowed: true, message: null as string | null }

  const handleAction = async () => {
    setError(null)
    setGeofenceWarning(null)

    if (!isGeolocationSupported()) {
      setError('Geolocation is not supported by your browser. Please use a modern browser with location services.')
      return
    }

    try {
      // Step 1: Get GPS coordinates
      setActionState('locating')
      const coords = await getCurrentPosition()
      setCoordinates(coords)

      // Step 2: Submit check-in or check-out
      setActionState('submitting')
      const deviceId = getDeviceId()
      const payload = {
        device_id: deviceId,
        latitude: parseFloat(coords.latitude.toFixed(6)),
        longitude: parseFloat(coords.longitude.toFixed(6)),
      }

      let response: unknown
      if (isCheckIn) {
        response = await checkIn.mutateAsync(payload)
      } else {
        response = await checkOut.mutateAsync(payload)
      }

      // Check for geo-fence warning in the response (warn mode)
      if (response && typeof response === 'object' && 'geofence_warning' in (response as Record<string, unknown>)) {
        const resp = response as { geofence_warning?: boolean; geofence_message?: string; geofence_distance?: number }
        if (resp.geofence_warning && resp.geofence_message) {
          setGeofenceWarning(resp.geofence_message)
        }
      }

      setActionState('idle')
    } catch (err) {
      setActionState('idle')

      // Handle geolocation errors
      if (isGeolocationError(err)) {
        setError(err.message)
        return
      }

      // Handle axios-style errors with response data (e.g., geo-fence rejection)
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const axiosErr = err as { response?: { data?: { geofence_error?: boolean; message?: string; distance?: number; detail?: string } } }
        if (axiosErr.response?.data?.geofence_error) {
          const data = axiosErr.response.data
          const friendlyMsg = `You are not within the allowed office area. Please check in from your designated office location.\n\nDistance: ${data.distance ? Math.round(data.distance) + 'm away' : 'unknown'}`
          setError(friendlyMsg)
          return
        }
        if (axiosErr.response?.data?.detail) {
          setError(axiosErr.response.data.detail)
          return
        }
        if (axiosErr.response?.data?.message) {
          setError(axiosErr.response.data.message)
          return
        }
      }

      // Handle generic API errors
      if (err instanceof Error) {
        setError(err.message)
        return
      }

      setError('An unexpected error occurred. Please try again.')
    }
  }

  const isProcessing = actionState !== 'idle'
  const isDisabledByShift = !shiftTimeStatus.allowed
  const isDisabled = isProcessing || isDisabledByShift || isNonWorkingDay

  return (
    <div className="text-center">
      {/* Non-working day message (holiday or on leave) */}
      {isNonWorkingDay && workingDayCheck.reason && (
        <div className="mb-4 mx-auto max-w-sm rounded-card bg-primary-lighter p-3" role="alert">
          <div className="flex items-center gap-2">
            <Iconify icon="info" width={20} className="shrink-0 text-primary-main" />
            <p className="text-sm text-primary-dark">{workingDayCheck.reason}. Attendance can only be entered on working days.</p>
          </div>
        </div>
      )}

      {/* Shift time restriction message */}
      {!isNonWorkingDay && isDisabledByShift && shiftTimeStatus.message && (
        <div className="mb-4 mx-auto max-w-sm rounded-card bg-warning-lighter p-3" role="alert">
          <div className="flex items-center gap-2">
            <Iconify icon="attendance" width={20} className="shrink-0 text-warning-main" />
            <p className="text-sm text-warning-dark">{shiftTimeStatus.message}</p>
          </div>
        </div>
      )}

      <Button
        color={isCheckIn ? 'success' : 'error'}
        size="large"
        onClick={() => {
          if (!isCheckIn) {
            // Show confirmation dialog before checkout
            setShowCheckoutConfirm(true)
          } else {
            handleAction()
          }
        }}
        disabled={isDisabled}
        aria-label={isCheckIn ? 'Check in for attendance' : 'Check out from attendance'}
        className={`!h-36 !w-36 !rounded-full !px-0 !text-lg shadow-z8 transition-transform duration-200 active:scale-95 disabled:blur-[1px] ${isProcessing ? 'animate-pulse' : ''}`}
      >
        {actionState === 'locating' && (
          <span className="flex flex-col items-center">
            <Iconify icon="geoLocations" width={32} className="mb-1 animate-spin" />
            <span className="text-sm">Locating...</span>
          </span>
        )}
        {actionState === 'submitting' && (
          <span className="flex flex-col items-center">
            <Iconify icon="refresh" width={32} className="mb-1 animate-spin" />
            <span className="text-sm">Submitting...</span>
          </span>
        )}
        {actionState === 'idle' && (
          <span className="flex flex-col items-center">
            <Iconify icon={isCheckIn ? 'arrow-right' : 'logout'} width={40} className="mb-1" />
            <span>
              {isCheckIn
                ? (hasPriorSessions ? 'Check In Again' : 'Check In')
                : 'Check Out'
              }
            </span>
          </span>
        )}
      </Button>
      {/* Current date display */}
      <p className="mt-4 text-sm text-ink-secondary">
        {formatDate(new Date())}
      </p>

      {/* Coordinates display */}
      {coordinates && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-neutral text-xs text-ink-secondary">
          <Iconify icon="geoLocations" width={14} className="text-secondary-main" />
          <span>
            {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
          </span>
          <span className="text-ink-disabled">
            (±{Math.round(coordinates.accuracy)}m)
          </span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 mx-auto max-w-sm rounded-card bg-error-lighter p-3" role="alert">
          <div className="flex items-start gap-2">
            <Iconify icon="error" width={20} className="mt-0.5 shrink-0 text-error-main" />
            <p className="text-sm text-error-dark">{error}</p>
          </div>
        </div>
      )}

      {/* Geo-fence warning (check-in allowed but outside radius) */}
      {geofenceWarning && !error && (
        <div className="mt-4 mx-auto max-w-sm rounded-card bg-warning-lighter p-3" role="alert">
          <div className="flex items-start gap-2">
            <Iconify icon="warning" width={20} className="mt-0.5 shrink-0 text-warning-main" />
            <p className="text-sm text-warning-dark">{geofenceWarning}</p>
          </div>
        </div>
      )}

      {/* Checkout Confirmation Dialog */}
      {showCheckoutConfirm && (
        <Modal open onClose={() => setShowCheckoutConfirm(false)} labelledBy="CheckInButton-modal-title-1" size="sm" closeOnEscape={false} closeOnOverlayClick={false}>
          <div className="mx-4 p-6 min-h-0 flex-1 overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-error-lighter">
                <Iconify icon="warning" width={20} className="text-error-main" />
              </div>
              <h3 id="CheckInButton-modal-title-1" className="text-lg font-semibold text-ink-primary">Confirm Check Out</h3>
            </div>
            <p className="text-sm text-ink-secondary mb-2">
              Are you sure you want to end your current work session?
            </p>
            <p className="text-xs text-secondary-main font-medium mb-5">
              Your session duration will be recorded. You can check back in at any time today to start a new session.
            </p>
            <div className="flex items-center justify-end gap-3">
              <Button variant="outlined" color="inherit"
                type="button"
                onClick={() => setShowCheckoutConfirm(false)}
              >
                Cancel
              </Button>
              <Button color="error"
                type="button"
                onClick={() => {
                  setShowCheckoutConfirm(false)
                  handleAction()
                }}
              >
                Yes, Check Out
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function isGeolocationError(err: unknown): err is GeolocationError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as GeolocationError).code === 'number' &&
    typeof (err as GeolocationError).message === 'string' &&
    !('response' in err)
  )
}
