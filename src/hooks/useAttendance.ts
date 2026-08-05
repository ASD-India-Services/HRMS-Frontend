import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ATTENDANCE } from '@/lib/endpoints'

/**
 * Attendance record returned from the backend.
 */
export interface AttendanceRecord {
  id: string
  employee: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  working_hours: number | null
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday'
  shift: string | null
  is_late: boolean
  late_reason: string
  is_outside_geofence: boolean
  created_at: string
  updated_at: string
}

interface CheckInPayload {
  device_id: string
  latitude: number
  longitude: number
}

interface CheckOutPayload {
  device_id: string
  latitude: number
  longitude: number
}

/**
 * Get a stable device identifier for check-in/check-out.
 * Uses a stored ID or generates one if not present.
 */
export function getDeviceId(): string {
  const STORAGE_KEY = 'hrms_device_id'
  let deviceId = localStorage.getItem(STORAGE_KEY)
  if (!deviceId) {
    deviceId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, deviceId)
  }
  return deviceId
}

/**
 * Hook for fetching today's attendance record.
 */
export function useAttendanceToday() {
  const today = new Date().toISOString().split('T')[0]

  return useQuery<AttendanceRecord | null>({
    queryKey: ['attendance', 'today', today],
    queryFn: async () => {
      const response = await api.get(ATTENDANCE.LIST, {
        params: { date: today },
      })
      // API may return a list; take the first record for the current user
      const records = response.data?.results ?? response.data
      if (Array.isArray(records) && records.length > 0) {
        return records[0] as AttendanceRecord
      }
      return null
    },
    refetchInterval: 60_000, // Refresh every minute to keep working hours updated
  })
}

/**
 * Hook for performing attendance check-in.
 */
export function useCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CheckInPayload) => {
      const response = await api.post(ATTENDANCE.CHECK_IN, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] })
    },
  })
}

/**
 * Hook for performing attendance check-out.
 */
export function useCheckOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CheckOutPayload) => {
      const response = await api.post(ATTENDANCE.CHECK_OUT, payload)
      return response.data as AttendanceRecord
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] })
    },
  })
}
