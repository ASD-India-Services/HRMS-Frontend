/**
 * Training module page.
 * Shows training events list with drill-down to event detail.
 * Requirements: 24.2
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrainingEvents } from '@/pages/training/TrainingEvents';
import { TrainingDetail } from '@/pages/training/TrainingDetail';
import api from '@/lib/api';

export default function Training() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Get the actual employee record for the current user (not auth user ID)
  const { data: currentEmployee } = useQuery<{ id: string }>({
    queryKey: ['employee', 'me'],
    queryFn: () => api.get('/api/v1/employees/me/').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <div>
      {selectedEventId ? (
        <TrainingDetail
          eventId={selectedEventId}
          employeeId={currentEmployee?.id || ''}
          onBack={() => setSelectedEventId(null)}
        />
      ) : (
        <TrainingEvents onSelectEvent={setSelectedEventId} />
      )}
    </div>
  );
}
