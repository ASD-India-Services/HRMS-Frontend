import { useMemo, useState } from 'react';
import { createCrudHooks } from '@/hooks/useCrud';
import { DataTable, Pagination, useFilterSync } from '@/components/DataTable';
import type { ColumnDef, FilterConfig } from '@/types/datatable';

const TABS = ['Tax Declarations', 'Tax Proof Submissions', 'Benefit Applications'] as const;
type Tab = (typeof TABS)[number];

// Tax Declarations
const declarationsEndpoint = '/api/v1/tax-benefits/tax-declarations/';
const declarationsCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'tax-declarations',
  endpoints: { list: declarationsEndpoint, create: declarationsEndpoint, detail: (id) => `${declarationsEndpoint}${id}/`, update: (id) => `${declarationsEndpoint}${id}/`, delete: (id) => `${declarationsEndpoint}${id}/` },
});

const declarationColumns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee', header: 'Employee', sortable: true },
  { key: 'fiscal_year', header: 'Fiscal Year', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
  { key: 'total_declared', header: 'Total Declared', sortable: true },
];

// Tax Proof Submissions
const proofsEndpoint = '/api/v1/tax-benefits/tax-proof-submissions/';
const proofsCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'tax-proof-submissions',
  endpoints: { list: proofsEndpoint, create: proofsEndpoint, detail: (id) => `${proofsEndpoint}${id}/`, update: (id) => `${proofsEndpoint}${id}/`, delete: (id) => `${proofsEndpoint}${id}/` },
});

const proofColumns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee', header: 'Employee', sortable: true },
  { key: 'fiscal_year', header: 'Fiscal Year', sortable: true },
  { key: 'submission_date', header: 'Submission Date', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

// Benefit Applications
const benefitsEndpoint = '/api/v1/tax-benefits/benefit-applications/';
const benefitsCrud = createCrudHooks<Record<string, unknown>>({
  queryKey: 'benefit-applications',
  endpoints: { list: benefitsEndpoint, create: benefitsEndpoint, detail: (id) => `${benefitsEndpoint}${id}/`, update: (id) => `${benefitsEndpoint}${id}/`, delete: (id) => `${benefitsEndpoint}${id}/` },
});

const benefitColumns: ColumnDef<Record<string, unknown>>[] = [
  { key: 'employee', header: 'Employee', sortable: true },
  { key: 'benefit_type', header: 'Benefit Type', sortable: true },
  { key: 'amount', header: 'Amount', sortable: true },
  { key: 'status', header: 'Status', sortable: true },
];

const filters: FilterConfig[] = [
  { key: 'search', label: 'Search...', type: 'search', debounceMs: 300 },
];

export default function TaxBenefits() {
  const [activeTab, setActiveTab] = useState<Tab>('Tax Declarations');
  const { filterValues, page, pageSize, setPage, setPageSize } = useFilterSync({ filters });
  const params = useMemo(() => { const p: Record<string, string | number> = { page, page_size: pageSize }; Object.entries(filterValues).forEach(([k, v]) => { if (v) p[k] = v; }); return p; }, [filterValues, page, pageSize]);

  const declarationsQuery = declarationsCrud.useList(params);
  const proofsQuery = proofsCrud.useList(params);
  const benefitsQuery = benefitsCrud.useList(params);

  const getActiveContent = () => {
    switch (activeTab) {
      case 'Tax Declarations':
        return (
          <>
            <DataTable queryResult={declarationsQuery} columns={declarationColumns} />
            {declarationsQuery.data && declarationsQuery.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={declarationsQuery.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          </>
        );
      case 'Tax Proof Submissions':
        return (
          <>
            <DataTable queryResult={proofsQuery} columns={proofColumns} />
            {proofsQuery.data && proofsQuery.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={proofsQuery.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          </>
        );
      case 'Benefit Applications':
        return (
          <>
            <DataTable queryResult={benefitsQuery} columns={benefitColumns} />
            {benefitsQuery.data && benefitsQuery.data.count > 0 && <Pagination page={page} pageSize={pageSize} totalCount={benefitsQuery.data.count} onPageChange={setPage} onPageSizeChange={setPageSize} />}
          </>
        );
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tax & Benefits</h1>
        <p className="mt-1 text-sm text-gray-600">Tax declarations, proof submissions, and employee benefits</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {getActiveContent()}
    </div>
  );
}
