/**
 * Payroll module — renders the payslip viewer.
 * Sub-routes (runs) are handled directly by the router.
 * Requirements: 27.4
 */

import { PayslipViewer } from './payroll/PayslipViewer';

export default function Payroll() {
  return <PayslipViewer />;
}
