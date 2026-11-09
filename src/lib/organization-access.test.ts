import { describe, expect, it, vi } from "vitest";
import { canManageTournament, requireTournamentManager, type OrganizationContext } from "./organization-access";

function context(result: boolean, error: unknown = null) {
  const rpc = vi.fn(async () => ({ data: result, error }));
  return { ctx: { userId: "local-admin", supabase: { rpc } } as unknown as OrganizationContext, rpc };
}

describe("server tournament permission boundary", () => {
  it("checks the requested tournament through the authenticated permission function", async () => {
    const { ctx, rpc } = context(true);
    expect(await canManageTournament(ctx, "assigned-tournament")).toBe(true);
    expect(rpc).toHaveBeenCalledWith("can_manage_tournament", { _tournament_id: "assigned-tournament" });
  });
  it("rejects management of another organization's tournament", async () => {
    const { ctx } = context(false);
    await expect(requireTournamentManager(ctx, "other-club-tournament")).rejects.toThrow("ce tournoi");
  });
  it("fails closed when permission validation fails", async () => {
    const { ctx } = context(true, { message: "unavailable" });
    expect(await canManageTournament(ctx, "assigned-tournament")).toBe(false);
  });
});