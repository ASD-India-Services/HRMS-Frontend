/**
 * Full-screen notice for a signed-in user whose organization admin has not
 * granted them DigiHRMS access (backend code HRMS_ACCESS_NOT_GRANTED).
 * Rendered outside the router, so it uses no router hooks.
 */
import { Button } from '@/components/ui/Button';

export function NoHrmsAccess() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      role="main"
      aria-labelledby="no-hrms-access-heading"
    >
      <img src="/brand/digihrms-mark.svg" alt="" className="mb-6 h-16 w-16" />
      <h1 id="no-hrms-access-heading" className="mb-3 text-2xl font-bold text-ink-primary">
        You don&apos;t have DigiHRMS access yet
      </h1>
      <p className="mb-8 max-w-md text-ink-secondary">
        Your account is set up, but your organization admin hasn&apos;t turned on DigiHRMS for you. Ask them to
        grant you DigiHRMS access, then try again.
      </p>
      <Button variant="contained" color="primary" onClick={() => window.location.reload()}>
        Try again
      </Button>
    </div>
  );
}
