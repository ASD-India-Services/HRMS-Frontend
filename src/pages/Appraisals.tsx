/**
 * Appraisal Management module — renders the appraisal cycles list.
 * Sub-routes (detail) are handled directly by the router.
 * Requirements: 20.1, 20.2, 20.3
 */

import { AppraisalCycles } from './appraisals/AppraisalCycles';

export default function Appraisals() {
  return <AppraisalCycles />;
}
