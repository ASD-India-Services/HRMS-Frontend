/**
 * TypeScript interfaces for Workflow Engine
 *
 * Defines the workflow state machine configuration, status definitions,
 * transitions, and timeline entries used by the generic WorkflowEngine component.
 *
 * Requirements: 1.1, 1.2
 */

import type { FieldSchema } from './form';

/** Defines a workflow's state machine */
export interface WorkflowConfig {
  /** Unique workflow identifier */
  id: string;
  /** All possible statuses in this workflow */
  statuses: WorkflowStatusDef[];
  /** Valid transitions between statuses */
  transitions: WorkflowTransition[];
  /** Optional messages to display for terminal/locked states (keyed by status) */
  terminalMessage?: Record<string, string>;
}

export interface WorkflowStatusDef {
  key: string;
  label: string;
  color: 'gray' | 'yellow' | 'blue' | 'green' | 'red';
  /** Terminal state — no outgoing transitions */
  terminal?: boolean;
}

export interface WorkflowTransition {
  from: string;
  to: string;
  action: string; // Button label (e.g., "Approve", "Reject")
  /** API endpoint to call for this transition */
  endpoint: (id: string) => string;
  /** HTTP method (default: POST) */
  method?: 'POST' | 'PATCH' | 'DELETE';
  /** Roles that can perform this transition (legacy — prefer requiredPermission) */
  allowedRoles: string[];
  /** Permission required to perform this transition (dynamic, works with any role) */
  requiredPermission?: string;
  /** Whether a reason/comment field is required */
  requiresReason?: boolean;
  /** Additional form fields required for this transition */
  formFields?: FieldSchema[];
  /** Confirmation dialog before executing */
  confirm?: { title: string; message: string };
  /** Variant for button styling */
  variant?: 'primary' | 'destructive' | 'secondary';
}

export interface WorkflowRecord {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowTimelineEntry {
  id: string;
  from_status: string;
  to_status: string;
  action: string;
  actor: { id: string; name: string };
  reason?: string;
  timestamp: string;
}
