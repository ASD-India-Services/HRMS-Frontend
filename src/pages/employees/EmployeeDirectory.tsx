/**
 * Employee Directory page with search, filters, and paginated employee grid.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '@/hooks/useEmployees';
import { EmployeeCard } from './components/EmployeeCard';
import { EmployeeFilters } from './components/EmployeeFilters';
import { TableSkeleton, ErrorState } from '@/components/Skeleton';
import { EmptyState } from '@/components/EmptyState';
import { CreateButton } from '@/components/ActionButton';
import { BulkActions } from '@/components/BulkActions';
import type { EmploymentStatus, EmploymentType } from '@/types/employee';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';

const PAGE_SIZE = 12;

export function EmployeeDirectory() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState<EmploymentStatus | ''>('');
  const [department, setDepartment] = useState('');
  const [employmentType, setEmploymentType] = useState<EmploymentType | ''>('');
  const [page, setPage] = useState(1);

  // Fetch departments from API for filter dropdown
  const { data: departmentsData } = useQuery<{ id: string; name: string }[]>({
    queryKey: ['departments', 'filter-options'],
    queryFn: () =>
      api.get('/api/v1/departments/').then((r) => {
        const data = r.data;
        return Array.isArray(data) ? data : data.results ?? [];
      }),
    staleTime: 5 * 60 * 1000,
  });
  const departments = departmentsData ?? [];

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
    <PageContainer>
      <PageHeader
        title="Employee Directory"
        subtitle="Browse and search employees across your organization"
        actions={
          <>
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
          </>
        }
      />

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Iconify icon="search" width={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-disabled" />
          <Input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name, department, or designation..."
            className="pl-10 pr-4"
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
          departments={departments}
        />
      </div>

      {/* Results count */}
      {data && (
        <p className="mb-4 text-sm text-ink-secondary">
          {data.count} employee{data.count !== 1 ? 's' : ''} found
          {isFetching && <span className="ml-2 text-primary-main">Updating...</span>}
        </p>
      )}

      {/* Loading State */}
      {isLoading && <TableSkeleton columns={3} rows={6} />}

      {/* Error State */}
      {isError && <ErrorState onRetry={refetch} />}

      {/* Empty State */}
      {data && data.results.length === 0 && (
        <Card>
          <EmptyState
            module="employees"
            ctaPermission="employees.create"
            onCtaClick={() => navigate('/employees/new')}
          />
        </Card>
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
          <p className="text-sm text-ink-secondary">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outlined" color="inherit"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button variant="outlined" color="inherit"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        </nav>
      )}
    </PageContainer>
  );
}
