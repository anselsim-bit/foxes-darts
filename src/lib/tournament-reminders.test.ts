import { it, expect } from "vitest";
import { tournamentRulesText } from "./tournament-rules-text";
const base = { format: "equipe", pool_count: 4, consolation: true, start_score: 501, double_out: true, pool_double_limit: true, final_start_score: 501, final_double_out: false, consolation_start_score: 301, consolation_double_out: false, consolation_double_limit: false };
it("lists only checked phases", () => {
  const r = tournamentRulesText({ ...base, pool_count: 0 });
  expect(r.some((x) => x.includes("poules"))).toBe(false);
  expect(r.some((x) => x.includes("Consolante"))).toBe(false);
});
it("explains the double-out and the 5-visit limit in pools", () => expect(tournamentRulesText(base)[1]).toContain("5 tours d’essais"));
it("includes consolation when checked", () => expect(tournamentRulesText(base).some((x) => x.startsWith("Consolante"))).toBe(true));
