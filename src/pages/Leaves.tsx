/**
 * Leave Management module — renders the leave applications list.
 * Sub-routes (approvals, apply) are handled directly by the router.
 * Requirements: 27.2, 27.7
 */

import { LeaveList } from './leaves/LeaveList';

export default function Leaves() {
  return <LeaveList />;
}
