/**
 * Shift Management module — tabbed view for schedule and roster.
 * Uses internal state-based tabs (no nested Routes).
 * Requirements: 27.5
 */

import { useState } from 'react';
import { ShiftSchedule } from './shifts/ShiftSchedule';
import { ShiftRoster } from './shifts/ShiftRoster';

type Tab = 'schedule' | 'roster';

export default function Shifts() {
  const [activeTab, setActiveTab] = useState<Tab>('schedule');

  const linkClasses = (isActive: boolean) =>
    `inline-flex items-center border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'border-primary-500 text-primary-700'
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Shift Management</h1>
      <p className="mt-1 text-sm text-gray-600">
        View shift schedules, assignments, and roster planning.
      </p>

      <div className="mt-4">
        <nav className="border-b border-gray-200" aria-label="Shift navigation">
          <div className="flex gap-0">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={linkClasses(activeTab === 'schedule')}
            >
              My Schedule
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={linkClasses(activeTab === 'roster')}
            >
              Team Roster
            </button>
          </div>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'schedule' && <ShiftSchedule />}
        {activeTab === 'roster' && <ShiftRoster />}
      </div>
    </div>
  );
}
