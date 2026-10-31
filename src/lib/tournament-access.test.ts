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
    mocks.publicRows.push({ id: "match", tournament_id: "test", stage: "consolation", team_a: "a", team_b: "b", winner: null }, { status: "started" });
    mocks.adminRows.push({ code: "NEWCODE" });
    await expect(updateTournamentLiveLegs({ data: { matchId: "match", code: "OLD", legsA: 1, legsB: 0 } })).rejects.toThrow("Code d'accès invalide");
    expect(mocks.adminFrom.mock.calls.map(([table]) => table)).toEqual(["tournament_settings_codes"]);
  });
  it("writes provisional legs without declaring a winner or advancing teams", async () => {
    mocks.publicRows.push({ id: "match", tournament_id: "test", stage: "bracket", team_a: "a", team_b: "b", winner: null }, { status: "started" });
    mocks.adminRows.push({ code: "FOX123" });
    const update = vi.fn(() => ({ eq: () => ({ is: async () => ({ error: null }) }) }));
    mocks.adminFrom.mockImplementation((table: string) => table === "tournament_matches" ? { update } : query(mocks.adminRows));
    await updateTournamentLiveLegs({ data: { matchId: "match", code: "FOX123", legsA: 1, legsB: 1 } });
    expect(update).toHaveBeenCalledWith({ live_legs_a: 1, live_legs_b: 1 });
    expect(mocks.adminFrom.mock.calls.map(([table]) => table)).toEqual(["tournament_settings_codes", "tournament_matches"]);
  });
  it("does not write or advance a final with only one winning leg", async () => {
    mocks.publicRows.push({ id: "match", tournament_id: "test", stage: "bracket", team_a: "a", team_b: "b" }, { status: "started" });
    mocks.adminRows.push({ code: "FOX123" });
    await expect(reportTournamentMatch({ data: { matchId: "match", scoreA: 0, scoreB: 42, legsA: 1, legsB: 0, code: "FOX123" } })).rejects.toThrow("deux manches gagnantes");
    expect(mocks.adminFrom.mock.calls.map(([table]) => table)).toEqual(["tournament_settings_codes"]);
  });
  it("accepts the current tournament code without a member session", async () => {
    mocks.publicRows.push({ status: "started" });
    mocks.adminRows.push({ code: "FOX123" });
    await expect(validateTournamentCode({ data: { tournamentId: "test", code: " fox123 " } })).resolves.toMatchObject({ valid: true });
  });

  it("rejects an incorrect code without granting match access", async () => {
    mocks.publicRows.push({ status: "started" });
    mocks.adminRows.push({ code: "FOX123" });
    await expect(listPlayableMatches({ data: { tournamentId: "test", code: "WRONG" } })).rejects.toThrow("Code d'accès invalide");
  });

  it("rejects access when the tournament is not started", async () => {
    mocks.publicRows.push({ status: "finished" });
    await expect(validateTournamentCode({ data: { tournamentId: "test", code: "FOX123" } })).resolves.toMatchObject({ valid: false });
    expect(mocks.adminFrom).not.toHaveBeenCalled();
  });

  it("rechecks the current code before an anonymous result write", async () => {
    mocks.publicRows.push({ id: "match", tournament_id: "test", team_a: "a", team_b: "b" }, { status: "started" });
    mocks.adminRows.push({ code: "NEWCODE" });
    await expect(reportTournamentMatch({ data: { matchId: "match", scoreA: 0, scoreB: 42, code: "FOX123" } })).rejects.toThrow("Code d'accès invalide");
    expect(mocks.adminFrom.mock.calls.map(([table]) => table)).toEqual(["tournament_settings_codes"]);
  });
});