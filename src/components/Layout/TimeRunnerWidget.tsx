import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAttendanceToday } from '@/hooks/useAttendance';
import { useHRSettings } from '@/hooks/useHRSettings';
import { formatTime } from '@/utils/formatters';

/**
 * Format total seconds into HH:MM:SS string.
 */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0 || isNaN(totalSeconds)) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Time Runner (At-Work Tracker) Widget
 *
 * Displays a real-time running workday timer in the top header.
 * Shows/hides dynamically based on the `at_work_tracker` configuration in HR Settings.
 * Clicking the widget navigates to the attendance check-in page.
 */
export function TimeRunnerWidget() {
  const navigate = useNavigate();
  const { data: hrSettings } = useHRSettings();
  const { data: attendanceToday } = useAttendanceToday();

  // 1. Setting visibility check: defaults to enabled unless explicitly set to false
  const isEnabled = hrSettings?.at_work_tracker !== false;

  // 2. Punch-in status detection
  const isCurrentlyIn = useMemo(() => {
    if (!attendanceToday) return false;
    if (attendanceToday.is_currently_punched_in !== undefined) {
      return attendanceToday.is_currently_punched_in;
    }
    return Boolean(attendanceToday.check_in && !attendanceToday.check_out);
  }, [attendanceToday]);

  const hasPunchedToday = Boolean(attendanceToday?.check_in);
  const isPunchedOut = hasPunchedToday && !isCurrentlyIn;

  // 3. Track current tick for live second-by-second updates
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isCurrentlyIn) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isCurrentlyIn]);

  // 4. Calculate total elapsed seconds
  const elapsedSeconds = useMemo(() => {
    if (!attendanceToday || !hasPunchedToday) {
      return 0;
    }

    // A. Multi-session calculation if sessions exist
    if (Array.isArray(attendanceToday.sessions) && attendanceToday.sessions.length > 0) {
      let totalSecs = 0;
      for (const s of attendanceToday.sessions) {
        if (s.check_out_time && s.duration_hours) {
          totalSecs += Math.round(Number(s.duration_hours) * 3600);
        } else if (!s.check_out_time && s.check_in_time) {
          const startMs = new Date(s.check_in_time).getTime();
          if (!isNaN(startMs)) {
            totalSecs += Math.max(0, Math.floor((now - startMs) / 1000));
          }
        }
      }
      return totalSecs;
    }

    // B. Single-session calculation from check_in / check_out strings
    if (attendanceToday.check_in) {
      // Parse check_in time (e.g. "09:30:00" or ISO string)
      let startMs = 0;
      if (attendanceToday.check_in.includes('T')) {
        startMs = new Date(attendanceToday.check_in).getTime();
      } else {
        const parts = attendanceToday.check_in.split(':').map(Number);
        const d = new Date();
        d.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
        startMs = d.getTime();
      }

      if (isCurrentlyIn) {
        return Math.max(0, Math.floor((now - startMs) / 1000));
      }

      // If checked out: use recorded working_hours if present
      if (attendanceToday.working_hours) {
        return Math.round(Number(attendanceToday.working_hours) * 3600);
      }

      if (attendanceToday.check_out) {
        let endMs = 0;
        if (attendanceToday.check_out.includes('T')) {
          endMs = new Date(attendanceToday.check_out).getTime();
        } else {
          const parts = attendanceToday.check_out.split(':').map(Number);
          const d = new Date();
          d.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
          endMs = d.getTime();
        }
        return Math.max(0, Math.floor((endMs - startMs) / 1000));
      }
    }

    return 0;
  }, [attendanceToday, hasPunchedToday, isCurrentlyIn, now]);

  const displayTime = formatDuration(elapsedSeconds);

  // If Time Runner is toggled OFF in General Settings, don't render anything
  if (!isEnabled) {
    return null;
  }

  const tooltipText = isCurrentlyIn
    ? `Currently Clocked In • Started at ${formatTime(attendanceToday?.check_in)} • Click to Punch Out`
    : isPunchedOut
    ? `Clocked Out • Total Workday: ${displayTime} • Click to View Attendance`
    : 'Not Clocked In • Click to Punch In';

  return (
    <button
      type="button"
      onClick={() => navigate('/attendance/check-in')}
      className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md border border-blue-500 hover:border-blue-600 bg-white hover:bg-blue-50/50 text-blue-600 hover:text-blue-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 cursor-pointer select-none"
      title={tooltipText}
      aria-label={`Workday Time Runner: ${displayTime}`}
    >
      {/* Punch / Log door icon with right arrow */}
      <svg
        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0 transition-transform ${
          isCurrentlyIn ? 'group-hover:translate-x-0.5' : ''
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9"
        />
      </svg>

      {/* Live Running Timer Display */}
      <span className="font-mono text-[13px] sm:text-[14px] font-semibold tracking-tight text-blue-600 tabular-nums leading-none">
        {displayTime}
      </span>
    </button>
  );
}

