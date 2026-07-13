import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, Pagination, useFilterSync } from '@/components/DataTable';
import type { ColumnDef, FilterConfig } from '@/types/datatable';

const RULES_ENDPOINT = '/api/v1/gratuity/rules/';
const rulesCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'gratuity-rules',
  endpoints: { list: RULES_ENDPOINT, create: RULES_ENDPOINT, detail: (id) => `${RULES_ENDPOINT}${id}/`, update: (id) => `${RULES_ENDPOINT}${id}/`, delete: (id) => `${RULES_ENDPOINT}${id}/` },
});

const rulesColumns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'name', header: 'Rule Name', sortable: true },
  { key: 'min_years', header: 'Min Years', sortable: true },
  { key: 'formula', header: 'Formula', sortable: false },
  { key: 'is_active', header: 'Active', sortable: true, render: (v: unknown) => (v ? 'Yes' : 'No') },
];

const filters: FilterConfig[] = [];

export default function Gratuity() {
  const [employee, setEmployee] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const { filterValues, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => ({ page, page_size: pageSize }), [page, pageSize]);
  const rulesQuery = rulesCrud.useList(params);

  const handleCalculate = () => {
    if (!employee.trim()) return;
    setCalculating(true);
    // Simulate calculation — in production, this would call an API
    setTimeout(() => {
      setResult(`Gratuity calculation for "${employee}" submitted. Check results in the employee profile.`);
      setCalculating(false);
    }, 1000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Gratuity</h1>
        <p className="mt-1 text-sm text-gray-600">Gratuity rules and calculation</p>
      </div>

      {/* Calculate Section */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Calculate Gratuity</h2>
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="gratuity-employee" className="mb-1 block text-sm font-medium text-gray-700">Employee</label>
            <input
              id="gratuity-employee"
              type="text"
              value={employee}
              onChange={(e) => setEmployee(e.target.value)}
              placeholder="Enter employee name or ID"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <button
            onClick={handleCalculate}
            disabled={calculating || !employee.trim()}
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
          >
            {calculating ? 'Calculating...' : 'Calculate'}
          </button>
        </div>
        {result && (
          <div className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{result}</div>
        )}
      </div>

      {/* Gratuity Rules */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Gratuity Rules</h2>
        <DataTable queryResult={rulesQuery} columns={rulesColumns} />
        {rulesQuery.data && rulesQuery.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={rulesQuery.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}
      </div>
    </div>
  );
}
