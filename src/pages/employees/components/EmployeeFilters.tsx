/**
 * Filter controls for the Employee Directory: status, department, employment type dropdowns.
 */

import type { EmploymentStatus, EmploymentType } from '@/types/employee';

interface EmployeeFiltersProps {
  status: EmploymentStatus | '';
  department: string;
  employmentType: EmploymentType | '';
  onStatusChange: (value: EmploymentStatus | '') => void;
  onDepartmentChange: (value: string) => void;
  onEmploymentTypeChange: (value: EmploymentType | '') => void;
  departments: { id: number; name: string }[];
}

export function EmployeeFilters({
  status,
  department,
  employmentType,
  onStatusChange,
  onDepartmentChange,
  onEmploymentTypeChange,
  departments,
}: EmployeeFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Status Filter */}
      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value as EmploymentStatus | '')}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="on_notice">On Notice</option>
        <option value="terminated">Terminated</option>
        <option value="retired">Retired</option>
      </select>

      {/* Department Filter */}
      <select
        value={department}
        onChange={(e) => onDepartmentChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        aria-label="Filter by department"
      >
        <option value="">All Departments</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id.toString()}>
            {dept.name}
          </option>
        ))}
      </select>

      {/* Employment Type Filter */}
      <select
        value={employmentType}
        onChange={(e) => onEmploymentTypeChange(e.target.value as EmploymentType | '')}
        className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        aria-label="Filter by employment type"
      >
        <option value="">All Types</option>
        <option value="permanent">Permanent</option>
        <option value="contract">Contract</option>
        <option value="intern">Intern</option>
        <option value="probation">Probation</option>
        <option value="freelance">Freelance</option>
      </select>
    </div>
  );
}
