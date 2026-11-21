/**
 * Filter controls for the Employee Directory: status, department, employment type dropdowns.
 */

import type { EmploymentStatus, EmploymentType } from '@/types/employee';
import { Select } from '@/components/ui/Select';

interface EmployeeFiltersProps {
  status: EmploymentStatus | '';
  department: string;
  employmentType: EmploymentType | '';
  onStatusChange: (value: EmploymentStatus | '') => void;
  onDepartmentChange: (value: string) => void;
  onEmploymentTypeChange: (value: EmploymentType | '') => void;
  departments: { id: string; name: string }[];
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
      <Select
        selectSize="small"
        value={status}
        onChange={(e) => onStatusChange(e.target.value as EmploymentStatus | '')}
        aria-label="Filter by status"
      >
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="on_notice">On Notice</option>
        <option value="terminated">Terminated</option>
        <option value="retired">Retired</option>
      </Select>

      {/* Department Filter */}
      <Select
        selectSize="small"
        value={department}
        onChange={(e) => onDepartmentChange(e.target.value)}
        aria-label="Filter by department"
      >
        <option value="">All Departments</option>
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </Select>

      {/* Employment Type Filter */}
      <Select
        selectSize="small"
        value={employmentType}
        onChange={(e) => onEmploymentTypeChange(e.target.value as EmploymentType | '')}
        aria-label="Filter by employment type"
      >
        <option value="">All Types</option>
        <option value="permanent">Permanent</option>
        <option value="contract">Contract</option>
        <option value="intern">Intern</option>
        <option value="probation">Probation</option>
        <option value="freelance">Freelance</option>
      </Select>
    </div>
  );
}
