import { describe, expect, it, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({ authorize: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn }; return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./organization-access", () => ({ requireTournamentManager: mocks.authorize }));
import { saveTournamentAdvertisements } from "./tournament-advertisements.functions";
beforeEach(() => { mocks.authorize.mockReset(); });
describe("advertising settings access and lifecycle", () => {
  for (const status of ["open", "started", "finished"]) it(`allows an organizer to activate advertisements when ${status}`, async () => {
    const update = vi.fn(() => ({ eq: async () => ({ error: null }) }));
    const row = { organization_id: "11111111-1111-4111-8111-111111111111", status };
    const chain = { select: () => chain, eq: () => chain, single: async () => ({ data: row, error: null }), update };
    await saveTournamentAdvertisements({ data: { id: "tournament", enabled: true, advertisements: [] }, context: { supabase: { from: () => chain } } } as never);
    expect(mocks.authorize).toHaveBeenCalledWith(expect.anything(), "tournament");
    expect(update).toHaveBeenCalledWith({ advertisements_enabled: true, advertisements: [] });
  });
  it("prevents unauthorized organizers from editing", async () => {
    mocks.authorize.mockRejectedValue(new Error("Forbidden")); const from = vi.fn();
    await expect(saveTournamentAdvertisements({ data: { id: "other", enabled: true, advertisements: [] }, context: { supabase: { from } } } as never)).rejects.toThrow("Forbidden");
    expect(from).not.toHaveBeenCalled();
  });
});