import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { ATTENDANCE } from '@/lib/endpoints'

export interface AttendanceSession {
  id: string
  attendance: string
  employee: string
  check_in_time: string
  check_out_time: string | null
  duration_hours: number | null
  is_auto_checkout: boolean
  auto_checkout_reason: string | null
  check_in_latitude: number | null
  check_in_longitude: number | null
  check_out_latitude: number | null
  check_out_longitude: number | null
  device_id: string
  created_at: string
  updated_at: string
}

/**
 * Attendance record returned from the backend.
 */
export interface AttendanceRecord {
  id: string
  employee: string
  attendance_date: string
  check_in: string | null
  check_out: string | null
  working_hours: number | string | null
  status: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday'
  shift: string | null
  is_late: boolean
  late_reason: string
  is_early_out?: boolean
  early_out_reason?: string
  is_outside_geofence: boolean
  sessions?: AttendanceSession[]
  active_session?: AttendanceSession | null
  is_currently_punched_in?: boolean
  total_sessions_count?: number
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
        params: { date: today, mine: 'true' },
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

export interface ShiftPromptStatus {
  prompt_required: boolean
  session_id?: string
  shift_name?: string
  shift_end_time?: string
  buffer_minutes?: number
  timeout_seconds?: number
  remaining_seconds?: number
  continue_count?: number
  max_continue_prompts?: number
  can_continue?: boolean
  auto_checkout_timestamp_policy?: string
  reason?: string
  auto_checked_out?: boolean
  detail?: string
}

export interface RespondShiftPromptPayload {
  action: 'checkout' | 'continue' | 'timeout'
  session_id?: string
}

/**
 * Hook for polling shift-end prompt status for the active user session.
 */
export function useShiftPromptStatus(enabled = true) {
  return useQuery<ShiftPromptStatus>({
    queryKey: ['attendance', 'shift-prompt-status'],
    queryFn: async () => {
      const res = await api.get('/api/v1/attendance/shift-prompt-status/')
      return res.data
    },
    enabled,
    refetchInterval: 30_000, // Poll every 30 seconds
    staleTime: 10_000,
  })
}

/**
 * Hook for submitting employee response or automated timeout to shift-end prompt.
 */
export function useRespondShiftPrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: RespondShiftPromptPayload) => {
      const res = await api.post('/api/v1/attendance/respond-shift-prompt/', payload)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}


