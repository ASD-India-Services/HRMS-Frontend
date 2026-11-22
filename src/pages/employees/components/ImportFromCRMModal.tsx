/**
 * Import from CRM — bring existing single-sign-on users (already in
 * Identity Center, e.g. CRM users) into HRMS as employees.
 *
 * Lists the organization's IC members, marks who is already an employee,
 * and imports the selected ones (backend also turns on their DigiHRMS access).
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Iconify } from '@/components/Iconify';
import { useToast } from '@/components/ui/Toast';

interface ICMember {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  hrms_access: boolean;
  is_active: boolean;
  is_employee: boolean;
}

interface ImportResponse {
  summary: Record<string, number>;
  hrms_access_granted: boolean;
  hrms_access_error: string | null;
  results: { user_id: string; email?: string; action: string; detail?: string }[];
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Admin',
  org_admin: 'Admin',
  manager: 'Manager',
  supervisor: 'Supervisor',
  agent: 'Agent',
  employee: 'Employee',
};

interface Props {
  open: boolean;
  onClose: () => void;
  departments: { id: string; name: string }[];
}

export function ImportFromCRMModal({ open, onClose, departments }: Props) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [joiningDate, setJoiningDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [departmentId, setDepartmentId] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery<{ members: ICMember[] }>({
    queryKey: ['employees', 'ic-members'],
    queryFn: () => api.get('/api/v1/employees/ic-members/').then((r) => r.data),
    enabled: open,
    staleTime: 30 * 1000,
  });

  const members = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.members ?? []).filter((m) => {
      if (!m.is_active) return false;
      if (!q) return true;
      return `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(q);
    });
  }, [data, search]);

  const importable = members.filter((m) => !m.is_employee);
  const alreadyCount = members.length - importable.length;
  const allSelected = importable.length > 0 && importable.every((m) => selected.has(m.user_id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(importable.map((m) => m.user_id)));

  const importMutation = useMutation({
    mutationFn: () =>
      api
        .post<ImportResponse>('/api/v1/employees/import-from-ic/', {
          user_ids: Array.from(selected),
          defaults: {
            date_of_joining: joiningDate || undefined,
            department_id: departmentId || undefined,
          },
        })
        .then((r) => r.data),
    onSuccess: (res) => {
      const done = (res.summary.created ?? 0) + (res.summary.linked ?? 0);
      const failed = (res.summary.error ?? 0) + (res.summary.skipped ?? 0);
      showToast(
        `${done} user${done === 1 ? '' : 's'} imported${failed ? `, ${failed} could not be imported` : ''}.`,
        failed ? 'warning' : 'success',
      );
      if (res.hrms_access_error) {
        showToast(`Imported, but DigiHRMS access could not be turned on: ${res.hrms_access_error}`, 'warning');
      }
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Import failed. Please try again.';
      showToast(detail, 'error');
    },
  });

  const handleClose = () => {
    if (importMutation.isPending) return;
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  const errorText =
    (error as { response?: { data?: { detail?: string } } } | null)?.response?.data?.detail ??
    'Could not load users.';

  return (
    <Modal open={open} onClose={handleClose} labelledBy="import-crm-title" size="lg">
      <ModalHeader>
        <div>
          <h2 id="import-crm-title" className="text-lg font-semibold text-ink-primary">
            Import from CRM
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            People who already sign in to your organization (for example in Leadspoint CRM). Selected users
            become employees and get DigiHRMS access.
          </p>
        </div>
      </ModalHeader>

      <ModalBody>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="relative sm:col-span-1">
            <Iconify
              icon="search"
              width={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-disabled"
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              inputSize="small"
              className="pl-9"
              aria-label="Search users"
            />
          </div>
          <label className="text-xs text-ink-secondary">
            Date of joining
            <Input
              type="date"
              value={joiningDate}
              onChange={(e) => setJoiningDate(e.target.value)}
              inputSize="small"
              className="mt-1"
            />
          </label>
          <label className="text-xs text-ink-secondary">
            Department (optional)
            <Select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              selectSize="small"
              className="mt-1"
            >
              <option value="">No department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {isLoading && <p className="py-10 text-center text-sm text-ink-secondary">Loading users…</p>}

        {isError && (
          <div className="py-10 text-center">
            <p className="text-sm text-error-main">{errorText}</p>
            <Button variant="text" onClick={() => refetch()} className="mt-2">
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            <div className="mb-2 flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-ink-primary">
                <Checkbox
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={importable.length === 0}
                  aria-label="Select all users not yet in HRMS"
                />
                Select all not yet in HRMS ({importable.length})
              </label>
              {alreadyCount > 0 && (
                <span className="text-ink-secondary">{alreadyCount} already in HRMS</span>
              )}
            </div>

            <ul className="divide-y divide-divider rounded-lg border border-divider">
              {members.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-ink-secondary">No users found.</li>
              )}
              {members.map((m) => {
                const name = `${m.first_name} ${m.last_name}`.trim() || m.email;
                return (
                  <li key={m.user_id} className="flex items-center gap-3 px-4 py-3">
                    <Checkbox
                      checked={m.is_employee || selected.has(m.user_id)}
                      disabled={m.is_employee}
                      onChange={() => toggle(m.user_id)}
                      aria-label={`Select ${name}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-primary">{name}</p>
                      <p className="truncate text-xs text-ink-secondary">{m.email}</p>
                    </div>
                    <span className="hidden text-xs text-ink-secondary sm:inline">
                      {ROLE_LABEL[m.role] ?? m.role}
                    </span>
                    {m.is_employee ? (
                      <span className="rounded-full bg-success-lighter px-2 py-0.5 text-xs font-medium text-success-dark">
                        In HRMS
                      </span>
                    ) : (
                      <span className="rounded-full bg-grey-200 px-2 py-0.5 text-xs font-medium text-ink-secondary">
                        Not imported
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="outlined" color="inherit" onClick={handleClose} disabled={importMutation.isPending}>
          Close
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => importMutation.mutate()}
          disabled={selected.size === 0}
          loading={importMutation.isPending}
        >
          Import {selected.size > 0 ? `${selected.size} user${selected.size === 1 ? '' : 's'}` : ''}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
