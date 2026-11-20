/**
 * Onboarding module page.
 * Shows the onboarding checklist for the selected or current employee.
 * Supports switching employees for HR/Admin oversight.
 * Requirements: 24.2
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { OnboardingChecklist } from '@/pages/onboarding/OnboardingChecklist';
import api from '@/lib/api';

export default function Onboarding() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Fetch the actual employee record for the current user
  const { data: currentEmployee } = useQuery<{ id: string; full_name?: string }>({
    queryKey: ['employee', 'me'],
    queryFn: () => api.get('/api/v1/employees/me/').then((r) => r.data),
    staleTime: 10 * 60 * 1000,
  });

  // Fetch employee list for admin/HR to switch between employees
  const { data: employeesData } = useQuery<{ results: Array<{ id: string; full_name: string; email: string }> }>({
    queryKey: ['employees', 'options'],
    queryFn: () => api.get('/api/v1/employees/').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!selectedEmployeeId && currentEmployee?.id) {
      setSelectedEmployeeId(currentEmployee.id);
    }
  }, [currentEmployee, selectedEmployeeId]);

  const activeEmployeeId = selectedEmployeeId || currentEmployee?.id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Checklist</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and complete new hire onboarding tasks and orientation milestones.
          </p>
        </div>

        {/* Employee Switcher for HR/Admins */}
        {employeesData?.results && employeesData.results.length > 0 && (
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-xs">
            <label htmlFor="employee-select" className="text-xs font-semibold text-gray-500 whitespace-nowrap">
              Viewing Employee:
            </label>
            <select
              id="employee-select"
              value={activeEmployeeId || ''}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="rounded-md border border-gray-200 py-1 pl-2.5 pr-8 text-xs font-medium text-gray-800 bg-gray-50 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 cursor-pointer"
            >
              {employeesData.results.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name || emp.email} {emp.id === currentEmployee?.id ? '(Me)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="mt-4">
        {activeEmployeeId ? (
          <OnboardingChecklist employeeId={activeEmployeeId} />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
            Loading checklist...
          </div>
        )}
      </div>
    </div>
  );
}
