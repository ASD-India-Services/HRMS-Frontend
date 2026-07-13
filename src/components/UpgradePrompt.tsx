import { useNavigate } from 'react-router-dom';

interface UpgradePromptProps {
  /** Name of the module that requires an upgrade */
  moduleName: string;
}

/**
 * Displayed when a user navigates directly to a module
 * that is disabled by their organization's feature flags.
 */
export function UpgradePrompt({ moduleName }: UpgradePromptProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="max-w-md text-center">
        {/* Lock icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-gray-900">
          {moduleName} is not available
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Your organization's current plan does not include the <strong>{moduleName}</strong> module.
          Contact your administrator to upgrade your subscription and unlock this feature.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Dashboard
          </button>
          <a
            href="mailto:support@digihrms.com?subject=Upgrade%20Request"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  );
}
