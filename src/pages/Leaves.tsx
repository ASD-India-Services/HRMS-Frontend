/**
 * Leave Management module — renders the leave applications list.
 * Sub-routes (approvals, apply) are handled directly by the router.
 * Requirements: 27.2, 27.7
 */

import MyLeaves from './leaves/MyLeaves';

export default function Leaves() {
  return <MyLeaves />;
}
