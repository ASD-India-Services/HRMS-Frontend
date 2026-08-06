import { useState } from 'react'
import { getCurrentPosition, isGeolocationSupported } from '@/utils/geolocation'
import type { Coordinates, GeolocationError } from '@/utils/geolocation'
import { useCheckIn, useCheckOut, getDeviceId } from '@/hooks/useAttendance'
import type { AttendanceRecord } from '@/hooks/useAttendance'

interface CheckInButtonProps {
  /** Current attendance record for today */
  record: AttendanceRecord | null | undefined
}

type ActionState = 'idle' | 'locating' | 'submitting'

/**
 * Large action button that handles GPS capture and submits check-in or check-out.
 * Shows appropriate state based on today's attendance record:
 * - No record / no check-in → Show Check In button
 * - Checked in, not checked out → Show Check Out button
 * - Both checked in and out → Show completed state
 *
 * Handles geo-fence errors from the backend:
 * - Strict mode: displays rejection message with distance info
 * - Warn mode: displays a warning but allows the check-in
 */
export function CheckInButton({ record }: CheckInButtonProps) {
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [geofenceWarning, setGeofenceWarning] = useState<string | null>(null)

  const checkIn = useCheckIn()
  const checkOut = useCheckOut()

  const hasCheckedIn = !!record?.check_in
  const hasCheckedOut = !!record?.check_out
  const isCompleted = hasCheckedIn && hasCheckedOut

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
        latitude: parseFloat(coords.latitude.toFixed(7)),
        longitude: parseFloat(coords.longitude.toFixed(7)),
      }

      let response: unknown
      if (!hasCheckedIn) {
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

  if (isCompleted) {
    return (
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-green-50 border-4 border-green-200 mb-4">
          <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-900">Attendance Complete</p>
        <p className="text-sm text-gray-500 mt-1">
          You have checked in and out for today.
        </p>
      </div>
    )
  }

  const isCheckIn = !hasCheckedIn
  const isProcessing = actionState !== 'idle'

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={handleAction}
        disabled={isProcessing}
        aria-label={isCheckIn ? 'Check in for attendance' : 'Check out from attendance'}
        className={`
          inline-flex items-center justify-center
          w-36 h-36 rounded-full
          text-white font-semibold text-lg
          shadow-lg transition-all duration-200
          focus:outline-none focus:ring-4
          disabled:opacity-70 disabled:cursor-not-allowed
          ${isCheckIn
            ? 'bg-green-500 hover:bg-green-600 focus:ring-green-200 active:scale-95'
            : 'bg-red-500 hover:bg-red-600 focus:ring-red-200 active:scale-95'
          }
          ${isProcessing ? 'animate-pulse' : ''}
        `}
      >
        {actionState === 'locating' && (
          <span className="flex flex-col items-center">
            <svg className="w-8 h-8 mb-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            </svg>
            <span className="text-sm">Locating...</span>
          </span>
        )}
        {actionState === 'submitting' && (
          <span className="flex flex-col items-center">
            <svg className="w-8 h-8 mb-1 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm">Submitting...</span>
          </span>
        )}
        {actionState === 'idle' && (
          <span className="flex flex-col items-center">
            {isCheckIn ? (
              <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            ) : (
              <svg className="w-10 h-10 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            <span>{isCheckIn ? 'Check In' : 'Check Out'}</span>
          </span>
        )}
      </button>

      {/* Current date display */}
      <p className="mt-4 text-sm text-gray-500">
        {new Date().toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      {/* Coordinates display */}
      {coordinates && (
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs text-gray-600">
          <svg className="w-3.5 h-3.5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span>
            {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
          </span>
          <span className="text-gray-400">
            (±{Math.round(coordinates.accuracy)}m)
          </span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-4 mx-auto max-w-sm rounded-md bg-red-50 border border-red-200 p-3" role="alert">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Geo-fence warning (check-in allowed but outside radius) */}
      {geofenceWarning && !error && (
        <div className="mt-4 mx-auto max-w-sm rounded-md bg-amber-50 border border-amber-200 p-3" role="alert">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-amber-700">{geofenceWarning}</p>
          </div>
        </div>
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
