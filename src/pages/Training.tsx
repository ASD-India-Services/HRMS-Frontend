/**
 * Training module page.
 * Shows training events list with drill-down to event detail.
 * Requirements: 24.2
 */

import { useState } from 'react';
import { TrainingEvents } from '@/pages/training/TrainingEvents';
import { TrainingDetail } from '@/pages/training/TrainingDetail';

export default function Training() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // In production, employeeId comes from auth context / user profile.
  const employeeId = 1; // TODO: replace with actual auth employee ID

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Training</h1>
      <p className="mt-1 text-sm text-gray-600">
        Training events, enrollments, and learning management.
      </p>
      <div className="mt-6">
        {selectedEventId ? (
          <TrainingDetail
            eventId={selectedEventId}
            employeeId={employeeId}
            onBack={() => setSelectedEventId(null)}
          />
        ) : (
          <TrainingEvents
            employeeId={employeeId}
            onSelectEvent={setSelectedEventId}
          />
        )}
      </div>
    </div>
  );
}
