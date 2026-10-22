import { describe, expect, it } from "vitest";
import { isBust, replayTurns, requiresDouble, tournamentRules, validateFinalLegs, type ScoredTurn } from "./dart-rules";

const misses = (player: number): ScoredTurn => ({ player, darts: Array.from({ length: 3 }, () => ({ value: 0, isDouble: false })), bust: false, total: 0 });

describe("tournament rules", () => {
  it("requires two winning legs in all knockout rounds but only one in pools", () => {
    expect(tournamentRules(501, true, "bracket").legsToWin).toBe(2);
    expect(tournamentRules(301, false, "pool").legsToWin).toBe(1);
  });
  it("accepts only 2–0 or 2–1 final results in either direction", () => {
    for (const [a, b] of [[2, 0], [2, 1], [0, 2], [1, 2]]) expect(validateFinalLegs(a, b)).toEqual({ legsA: a, legsB: b });
    for (const [a, b] of [[1, 0], [1, 1], [2, 2], [3, 0], [2, -1]]) expect(() => validateFinalLegs(a, b)).toThrow();
    expect(() => validateFinalLegs(undefined, undefined)).toThrow();
  });
  it("accepts the admin's 301 or 501 and rejects other starting scores", () => {
    expect(tournamentRules(301, false, "pool").start).toBe(301);
    expect(tournamentRules(501, true, "pool").start).toBe(501);
    expect(() => tournamentRules(701, true, "pool")).toThrow();
  });
  it("keeps double-out for five visits and switches on the sixth", () => {
    expect(requiresDouble(true, true, 4)).toBe(true);
    expect(requiresDouble(true, true, 5)).toBe(false);
  });
  it("counts each team independently, only at 50 or fewer", () => {
    const turns = Array.from({ length: 5 }, () => misses(0));
    expect(replayTurns(50, 2, turns).doubleAttempts).toEqual([5, 0]);
    expect(replayTurns(51, 2, turns).doubleAttempts).toEqual([0, 0]);
  });
  it("counts a visit reaching 50 mid-visit when a subsequent dart is thrown", () => {
    const turn = { player: 0, darts: [{ value: 10, isDouble: false }, { value: 0, isDouble: false }], bust: false, total: 10 };
    expect(replayTurns(60, 1, [turn]).doubleAttempts).toEqual([1]);
    expect(replayTurns(60, 1, [{ ...turn, darts: [{ value: 10, isDouble: false }] }]).doubleAttempts).toEqual([0]);
  });
  it("counts bust visits and undo restores the previous attempt count", () => {
    const bust = { player: 0, darts: [{ value: 60, isDouble: false }], bust: true, total: 60 };
    const turns = [...Array.from({ length: 4 }, () => misses(0)), bust];
    expect(replayTurns(40, 1, turns)).toEqual({ scores: [40], doubleAttempts: [5] });
    expect(replayTurns(40, 1, turns.slice(0, -1)).doubleAttempts).toEqual([4]);
  });
  it("keeps double-out without a limit in the final bracket", () => {
    const rules = tournamentRules(501, true, "bracket");
    expect(requiresDouble(rules.doubleOut, rules.poolDoubleLimit, 20)).toBe(true);
  });
  it("allows a single checkout and one remaining after the pool switch, but never negative scores", () => {
    const simple = requiresDouble(true, true, 5);
    expect(isBust(0, { value: 20, isDouble: false }, simple)).toBe(false);
    expect(isBust(1, { value: 19, isDouble: false }, simple)).toBe(false);
    expect(isBust(-1, { value: 21, isDouble: false }, simple)).toBe(true);
    expect(isBust(0, { value: 20, isDouble: false }, true)).toBe(true);
  });
  it("simple-out tournaments never require doubles", () => {
    expect(requiresDouble(false, true, 0)).toBe(false);
    expect(tournamentRules(301, false, "pool").poolDoubleLimit).toBe(false);
  });
  it("keeps the 5-attempt limit only when the admin enabled it", () => {
    expect(tournamentRules(501, true, "pool").poolDoubleLimit).toBe(true);
    expect(tournamentRules(501, true, "pool", false).poolDoubleLimit).toBe(false);
    expect(tournamentRules(501, true, "bracket", false).poolDoubleLimit).toBe(false);
  });
});