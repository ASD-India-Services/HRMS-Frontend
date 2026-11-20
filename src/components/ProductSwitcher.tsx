import { useState, useRef, useEffect } from 'react';
import { usePermissions } from '@platform/auth-sdk';

const CRM_URL = import.meta.env.VITE_CRM_FRONTEND_URL || 'https://app.leadspoint.in';

/**
 * ProductSwitcher — shows only when the organization subscribes to BOTH CRM and HRMS.
 * Allows seamless navigation between products with shared SSO session.
 */
export function ProductSwitcher() {
  const { isSubscribedTo } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hasCrm = isSubscribedTo('crm');
  const hasHrms = isSubscribedTo('hrms');

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Only show if org has both products enabled
  if (!hasCrm || !hasHrms) {
    return null;
  }

  const products = [
    {
      name: 'CRM',
      description: 'Leads & Sales',
      color: 'bg-info-main',
      url: CRM_URL,
      active: false,
    },
    {
      name: 'HRMS',
      description: 'HR & Payroll',
      color: 'bg-secondary-main',
      url: null, // current app
      active: true,
    },
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2 text-ink-secondary hover:text-ink-secondary rounded-lg hover:bg-grey-500/10 transition-colors"
        title="Switch Product"
        aria-label="Product Switcher"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-60 rounded-card bg-surface-paper shadow-dropdown ring-1 ring-divider p-3 z-50"
          role="menu"
          aria-label="Product Switcher Menu"
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-disabled mb-2 px-2">
            Switch Product
          </h3>
          <div className="space-y-1">
            {products.map((product) => (
              <a
                key={product.name}
                href={product.url || '#'}
                onClick={(e) => {
                  if (!product.url) {
                    e.preventDefault();
                    setIsOpen(false);
                  }
                }}
                className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                  product.active
                    ? 'bg-grey-500/10 ring-1 ring-primary-main/20'
                    : 'hover:bg-surface-neutral'
                }`}
                role="menuitem"
              >
                <div
                  className={`w-9 h-9 ${product.color} rounded-lg flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-xs font-bold text-primary-contrast">{product.name[0]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink-primary">{product.name}</span>
                    {product.active && (
                      <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-primary-lighter text-primary-dark">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-secondary">{product.description}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
