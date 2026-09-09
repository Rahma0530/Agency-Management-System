import { UserRole } from '../types/database';

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
