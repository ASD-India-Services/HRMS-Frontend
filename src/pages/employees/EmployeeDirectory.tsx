/**
 * Employee Directory page with search, filters, and paginated employee grid.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '@/hooks/useEmployees';
import { EmployeeCard } from './components/EmployeeCard';
import { EmployeeFilters } from './components/EmployeeFilters';
import { TableSkeleton, ErrorState } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { CreateButton } from '@/components/ActionButton';
import { BulkActions } from '@/components/BulkActions';
import type { EmploymentStatus, EmploymentType } from '@/types/employee';

const PAGE_SIZE = 12;

// TODO: Fetch departments from API when endpoint is available
const DEPARTMENTS = [
  { id: 1, name: 'Engineering' },
  { id: 2, name: 'Human Resources' },
  { id: 3, name: 'Marketing' },
  { id: 4, name: 'Sales' },
  { id: 5, name: 'Finance' },
  { id: 6, name: 'Operations' },
];

export function EmployeeDirectory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<EmploymentStatus | ''>('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>('');
  const [page, setPage] = useState(1);

  // Debounce search input
  const debounceTimeout = useMemo(() => {
    let timer: ReturnType<typeof setTimeout>;
    return (value: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setDebouncedSearch(value);
        setPage(1);
      }, 300);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    debounceTimeout(value);
  };

  const navigate = useNavigate();

  const { data, isLoading, isError, error, isFetching, refetch } = useEmployees({
    search: debouncedSearch || undefined,
    status: status || undefined,
    department: department || undefined,
    employment_type: employmentType || undefined,
    page,
    page_size: PAGE_SIZE,
  });

  const totalPages = data ? Math.ceil(data.count / PAGE_SIZE) : 0;

  const handleStatusChange = (value: EmploymentStatus | '') => {
    setStatus(value);
    setPage(1);
  };

  const handleDepartmentChange = (value: string) => {
    setDepartment(value);
    setPage(1);
  };

  const handleEmploymentTypeChange = (value: EmploymentType | '') => {
    setEmploymentType(value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header — title left, actions right (same row) */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
          <p className="mt-0.5 text-sm text-gray-600">
            Browse and search employees across your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BulkActions
            exportEndpoint="/api/v1/employees/export/"
            importEndpoint="/api/v1/employees/import/"
            csvHeaders="employee_id,first_name,last_name,email,phone,department,designation,employment_type,date_of_joining,status"
            exportFilename="employees_export.csv"
            exportPermission="employees.view"
            importPermission="employees.create"
            onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
          />
          <CreateButton
            label="Add Employee"
            onClick={() => navigate('/employees/new')}
            permission="employees.create"
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, department, or designation..."
            className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            aria-label="Search employees"
          />
        </div>

        {/* Filters */}
        <EmployeeFilters
          status={status}
          department={department}
          employmentType={employmentType}
          onStatusChange={handleStatusChange}
          onDepartmentChange={handleDepartmentChange}
          onEmploymentTypeChange={handleEmploymentTypeChange}
          departments={DEPARTMENTS}
        />
      </div>

      {/* Results count */}
      {data && (
        <p className="mb-4 text-sm text-gray-500">
          {data.count} employee{data.count !== 1 ? 's' : ''} found
          {isFetching && <span className="ml-2 text-primary-600">Updating...</span>}
        </p>
      )}

      {/* Loading State */}
      {isLoading && <TableSkeleton columns={3} rows={6} />}

      {/* Error State */}
      {isError && <ErrorState onRetry={refetch} />}

      {/* Empty State */}
      {data && data.results.length === 0 && (
        <EmptyState
          module="employees"
          ctaPermission="employees.create"
          onCtaClick={() => navigate('/employees/new')}
        />
      )}

      {/* Employee Grid */}
      {data && data.results.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.results.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
          <p className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
