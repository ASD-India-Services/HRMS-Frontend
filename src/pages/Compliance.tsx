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
    icon: (
      <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    status: 'Not Configured',
    statusColor: 'text-amber-700 bg-amber-50',
  },
  {
    title: 'ESI Configuration',
    description: 'Configure Employee State Insurance contribution rates, wage ceiling, and branch details.',
    icon: (
      <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    status: 'Not Configured',
    statusColor: 'text-amber-700 bg-amber-50',
  },
  {
    title: 'Professional Tax Slabs',
    description: 'Configure state-wise professional tax slab rates and deduction rules.',
    icon: (
      <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
      </svg>
    ),
    status: 'Not Configured',
    statusColor: 'text-amber-700 bg-amber-50',
  },
];

export default function Compliance() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Compliance</h1>
        <p className="mt-1 text-sm text-gray-600">Statutory compliance configuration — PF, ESI, Professional Tax</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {COMPLIANCE_CONFIGS.map((config) => (
          <div
            key={config.title}
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-start justify-between">
              {config.icon}
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${config.statusColor}`}>
                {config.status}
              </span>
            </div>

            <h3 className="mt-4 text-base font-semibold text-gray-900">{config.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{config.description}</p>

            <button
              type="button"
              className="mt-5 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Configure
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
