import { describe, expect, it } from "vitest";
import { allowsOrganizationAction } from "./organization-permissions";

describe("organization permission matrix", () => {
  it("allows the owner to transfer ownership", () => {
    expect(allowsOrganizationAction({ action: "transfer_ownership", role: "ORGANIZATION_OWNER" })).toBe(true);
  });
  it("does not allow a local admin to transfer ownership", () => {
    expect(allowsOrganizationAction({ action: "transfer_ownership", role: "ORGANIZATION_ADMIN" })).toBe(false);
  });
  it("allows local admins to manage their organization", () => {
    expect(allowsOrganizationAction({ action: "manage_organization", role: "ORGANIZATION_ADMIN" })).toBe(true);
  });
  it("limits managers to assigned tournaments", () => {
    expect(allowsOrganizationAction({ action: "manage_tournament", role: "TOURNAMENT_MANAGER", assignedTournament: true })).toBe(true);
    expect(allowsOrganizationAction({ action: "manage_tournament", role: "TOURNAMENT_MANAGER", assignedTournament: false })).toBe(false);
  });
  it("does not give managers organization administration", () => {
    expect(allowsOrganizationAction({ action: "manage_organization", role: "TOURNAMENT_MANAGER", assignedTournament: true })).toBe(false);
  });
  it("does not give a player management permissions", () => {
    expect(allowsOrganizationAction({ action: "manage_tournament" })).toBe(false);
  });
  it("recognizes a verified platform administrator", () => {
    expect(allowsOrganizationAction({ action: "manage_organization", superAdmin: true })).toBe(true);
  });
  it("blocks management of a suspended organization", () => {
    expect(allowsOrganizationAction({ action: "manage_tournament", role: "ORGANIZATION_OWNER", suspended: true })).toBe(false);
    expect(allowsOrganizationAction({ action: "manage_organization", superAdmin: true, suspended: true })).toBe(false);
  });
});