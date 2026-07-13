/**
 * Expense Management module — renders the expense claims list.
 * Sub-routes (new, approvals) are handled directly by the router.
 * Requirements: 27.6, 27.7
 */

import { ExpenseList } from './expenses/ExpenseList';

export default function Expenses() {
  return <ExpenseList />;
}
