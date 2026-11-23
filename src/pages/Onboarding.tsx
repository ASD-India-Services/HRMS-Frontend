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
import { Select } from '@/components/ui/Select';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { StateView } from '@/components/ui/StateView';

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
    <PageContainer>
      <PageHeader title="Onboarding Checklist" subtitle="View and complete new hire onboarding tasks and orientation milestones." actions={
        <>
{/* Employee Switcher for HR/Admins */}
        {employeesData?.results && employeesData.results.length > 0 && (
          <Card className="flex items-center gap-2 px-3 py-2">
            <label htmlFor="employee-select" className="text-xs font-semibold text-ink-secondary whitespace-nowrap">
              Viewing Employee:
            </label>
            <Select
              id="employee-select"
              value={activeEmployeeId || ''}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="pl-2.5 pr-8 font-medium cursor-pointer"
            >
              {employeesData.results.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name || emp.email} {emp.id === currentEmployee?.id ? '(Me)' : ''}
                </option>
              ))}
            </Select>
          </Card>
        )}
        </>
      } />

      <div className="mt-4">
        {activeEmployeeId ? (
          <OnboardingChecklist employeeId={activeEmployeeId} />
        ) : (
          <Card>
            <StateView icon="attendance" title="Loading checklist..." role="status" />
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
