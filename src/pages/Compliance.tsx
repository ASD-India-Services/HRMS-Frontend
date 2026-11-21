import { Button } from '@/components/ui/Button';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Iconify } from '@/components/Iconify';

/**
 * Compliance — Statutory compliance configuration cards.
 *
 * Shows PF, ESI, and Professional Tax configuration status
 * with "Configure" buttons (static for now, no API calls yet).
 */

const COMPLIANCE_CONFIGS = [
  {
    title: 'PF Configuration',
    description: 'Configure Provident Fund contribution rates, employer/employee split, and registration details.',
    icon: <Iconify icon="payroll" width={32} className="text-primary-main" />,
    status: 'Not Configured',
    statusColor: 'text-warning-dark bg-warning-lighter',
  },
  {
    title: 'ESI Configuration',
    description: 'Configure Employee State Insurance contribution rates, wage ceiling, and branch details.',
    icon: <Iconify icon="healthInsurance" width={32} className="text-success-main" />,
    status: 'Not Configured',
    statusColor: 'text-warning-dark bg-warning-lighter',
  },
  {
    title: 'Professional Tax Slabs',
    description: 'Configure state-wise professional tax slab rates and deduction rules.',
    icon: <Iconify icon="expenseTaxes" width={32} className="text-secondary-main" />,
    status: 'Not Configured',
    statusColor: 'text-warning-dark bg-warning-lighter',
  },
];

export default function Compliance() {
  return (
    <PageContainer>
      <PageHeader title="Compliance" subtitle="Statutory compliance configuration — PF, ESI, Professional Tax" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {COMPLIANCE_CONFIGS.map((config) => (
          <Card
            key={config.title}
            className="p-6"
          >
            <div className="flex items-start justify-between">
              {config.icon}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.statusColor}`}>
                {config.status}
              </span>
            </div>

            <h3 className="mt-4 text-base font-semibold text-ink-primary">{config.title}</h3>
            <p className="mt-1 text-sm text-ink-secondary">{config.description}</p>

            <Button variant="outlined" color="inherit"
              type="button"
              className="mt-5"
            >
              Configure
            </Button>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
