/**
 * RBAC Utilities — barrel export
 *
 * The hardcoded ROLE_ACCESS map and checkAccess utility have been removed.
 * Permission checks are now performed via the HrmsPermissionsContext which
 * fetches dynamic permissions from GET /api/v1/me/permissions/.
 *
 * This file is kept for backward compatibility but exports nothing.
 * It can be removed once all remaining imports are cleaned up.
 */
