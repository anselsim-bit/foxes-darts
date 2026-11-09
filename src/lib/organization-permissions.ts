export type OrganizationRole = "ORGANIZATION_OWNER" | "ORGANIZATION_ADMIN" | "TOURNAMENT_MANAGER";
export type OrganizationAction = "manage_organization" | "transfer_ownership" | "manage_tournament";

/** Shared permission matrix; callers must obtain roles and assignments server-side. */
export function allowsOrganizationAction(input: {
  action: OrganizationAction;
  role?: OrganizationRole;
  superAdmin?: boolean;
  assignedTournament?: boolean;
  suspended?: boolean;
}) {
  if (input.suspended) return false;
  if (input.superAdmin) return true;
  if (input.role === "ORGANIZATION_OWNER") return true;
  if (input.role === "ORGANIZATION_ADMIN") return input.action !== "transfer_ownership";
  return input.role === "TOURNAMENT_MANAGER" && input.action === "manage_tournament" && input.assignedTournament === true;
}