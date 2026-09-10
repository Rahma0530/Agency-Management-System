import { UserRecord, UserRole } from '../types/database';

// contract_value is financial/commercial data: full visibility stays with the roles who own the
// client relationship end-to-end (leadership + AM), everyone else never sees it — except sales,
// who entered the figure themselves at registration and may see it only for their own clients
// (sales_owner_id === them), never anyone else's. isOwnClient is the caller's job to compute
// (e.g. client.sales_owner_id === currentUser.id) since this function has no client in scope.
const CONTRACT_VALUE_ROLES: UserRole[] = ['executive', 'head_of_technical', 'am_team_lead', 'am_agent'];

export const canSeeContractValue = (role: UserRole, isOwnClient: boolean): boolean => {
  if (CONTRACT_VALUE_ROLES.includes(role)) return true;
  if (role === 'sales' && isOwnClient) return true;
  return false;
};

// An employee created via the "Add Employee" admin flow (single form or bulk upload) starts with
// auth_id null — a real Supabase Auth account hasn't been provisioned for them yet (that only
// happens out-of-band via scripts/provisionAuthUsers.ts, since it needs the service-role key).
// Until then they can't log in at all, so every picker/list that lets someone assign real work to
// an employee (task assignee, AM assignment, brief routing, campaign ownership, the demo-login
// list, etc.) or that aggregates an employee's performance/capacity must exclude them — otherwise
// work silently piles up on someone who can never see or act on it. Lookups that just resolve an
// existing reference's display name (e.g. "who submitted this brief") are unaffected; a pending
// employee can never actually be set as one of those references in the first place, since every
// picker feeding them is filtered here too.
export const isPendingEmployee = (user: Pick<UserRecord, 'auth_id'>): boolean => !user.auth_id;
