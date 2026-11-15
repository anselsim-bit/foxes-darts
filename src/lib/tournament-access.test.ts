import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  publicRows: [] as unknown[],
  adminRows: [] as unknown[],
  adminFrom: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (fn: (input: unknown) => unknown) => fn,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

function query(rows: unknown[]) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [{ round: 1 }], error: null }).then(resolve),
    single: async () => ({ data: rows.shift(), error: null }),
    maybeSingle: async () => ({ data: rows.shift(), error: null }),
  };
  return chain;
}

vi.mock("@/lib/public.functions", () => ({ publicClient: () => ({ from: () => query(mocks.publicRows) }) }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: { from: mocks.adminFrom },
}));

import { listPlayableMatches, reportTournamentMatch, validateTournamentCode, updateTournamentLiveLegs } from "./tournament.functions";

beforeEach(() => {
  mocks.publicRows.length = 0;
  mocks.adminRows.length = 0;
  mocks.adminFrom.mockReset().mockImplementation(() => query(mocks.adminRows));
});

describe("Tournament guest access", () => {
  it("refuses provisional leg writes with an obsolete code", async () => {
    mocks.publicRows.push({ id: "match", tournament_id: "test", stage: "consolation", team_a: "a", team_b: "b", winner: null }, { status: "started", organizations: { status: "active" } });
    mocks.adminRows.push({ code: "NEWCODE" });
    await expect(updateTournamentLiveLegs({ data: { matchId: "match", code: "OLD", legsA: 1, legsB: 0 } })).rejects.toThrow("Code d'accès invalide");
    expect(mocks.adminFrom.mock.calls.map(([table]) => table)).toEqual(["tournament_settings_codes"]);
  });
  it("writes provisional legs without declaring a winner or advancing teams", async () => {
    mocks.publicRows.push({ id: "match", tournament_id: "test", stage: "bracket", team_a: "a", team_b: "b", winner: null }, { status: "started", organizations: { status: "active" } });
    mocks.adminRows.push({ code: "FOX123" });
    mocks.publicRows.push({ start_score: 501, double_out: true });
    const update = vi.fn(() => ({ eq: () => ({ is: async () => ({ error: null }) }) }));
    mocks.adminFrom.mockImplementation((table: string) => table === "tournament_matches" ? { update } : query(mocks.adminRows));
    await updateTournamentLiveLegs({ data: { matchId: "match", code: "FOX123", legsA: 1, legsB: 1 } });
    expect(update).toHaveBeenCalledWith({ live_legs_a: 1, live_legs_b: 1, live_leg_winners: null, live_leg_rests: null });
    expect(mocks.adminFrom.mock.calls.map(([table]) => table)).toEqual(["tournament_settings_codes", "tournament_matches"]);
  });
  it("does not write or advance a final with only one winning leg", async () => {
    mocks.publicRows.push({ id: "match", tournament_id: "test", stage: "bracket", team_a: "a", team_b: "b" }, { status: "started", organizations: { status: "active" } });
    mocks.adminRows.push({ code: "FOX123" });
    mocks.publicRows.push({ start_score: 501, double_out: true });
    await expect(reportTournamentMatch({ data: { matchId: "match", scoreA: 0, scoreB: 42, legsA: 1, legsB: 0, code: "FOX123" } })).rejects.toThrow("2 manches gagnantes");
    expect(mocks.adminFrom.mock.calls.map(([table]) => table)).toEqual(["tournament_settings_codes"]);
  });
  it("refuses two wins when the final requires three", async () => {
    mocks.publicRows.push({ id: "match", tournament_id: "test", stage: "bracket", round: 1, team_a: "a", team_b: "b" }, { status: "started", organizations: { status: "active" } }, { start_score: 501, double_out: false, game_settings: { version: 1, phases: {}, rounds: { "bracket:0": { start: 301, doubleOut: false, legsToWin: 3 } } } });
    mocks.adminRows.push({ code: "FOX123" });
    await expect(reportTournamentMatch({ data: { matchId: "match", scoreA: 0, scoreB: 42, legsA: 2, legsB: 0, code: "FOX123" } })).rejects.toThrow("3 manches gagnantes");
    expect(mocks.adminFrom.mock.calls.map(([table]) => table)).toEqual(["tournament_settings_codes"]);
  });
  it("rejects a valid code for a suspended organization", async () => {
    mocks.publicRows.push({ status: "started", organizations: { status: "suspended" } });
    await expect(validateTournamentCode({ data: { tournamentId: "test", code: "FOX123" } })).resolves.toMatchObject({ valid: false });
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
  it("rejects guest correction of a completed match before checking its code", async () => {
    mocks.publicRows.push({ id: "match", tournament_id: "test", team_a: "a", team_b: "b", winner: "a" });
    await expect(reportTournamentMatch({ data: { matchId: "match", scoreA: 42, scoreB: 0, code: "FOX123" } })).rejects.toThrow("corriger");
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });
  it("accepts the current tournament code without a member session", async () => {
    mocks.publicRows.push({ status: "started", organizations: { status: "active" } });
    mocks.adminRows.push({ code: "FOX123" });
    await expect(validateTournamentCode({ data: { tournamentId: "test", code: " fox123 " } })).resolves.toMatchObject({ valid: true });
  });

  it("rejects an incorrect code without granting match access", async () => {
    mocks.publicRows.push({ status: "started", organizations: { status: "active" } });
    mocks.adminRows.push({ code: "FOX123" });
    await expect(listPlayableMatches({ data: { tournamentId: "test", code: "WRONG" } })).rejects.toThrow("Code d'accès invalide");
  });

  it("rejects access when the tournament is not started", async () => {
    mocks.publicRows.push({ status: "finished" });
    await expect(validateTournamentCode({ data: { tournamentId: "test", code: "FOX123" } })).resolves.toMatchObject({ valid: false });
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("rechecks the current code before an anonymous result write", async () => {
    mocks.publicRows.push({ id: "match", tournament_id: "test", team_a: "a", team_b: "b" }, { status: "started", organizations: { status: "active" } });
    mocks.adminRows.push({ code: "NEWCODE" });
    await expect(reportTournamentMatch({ data: { matchId: "match", scoreA: 0, scoreB: 42, code: "FOX123" } })).rejects.toThrow("Code d'accès invalide");
    expect(mocks.adminFrom.mock.calls.map(([table]) => table)).toEqual(["tournament_settings_codes"]);
  });
});