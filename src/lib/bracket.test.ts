import { describe, it, expect } from "vitest";
import { distributePools, roundRobin, buildBracket, poolStandings, qualifiersFromPools } from "./bracket";

const teams = Array.from({ length: 16 }, (_, i) => `T${i + 1}`);

describe("bracket", () => {
  it("16 équipes en 4 poules donne 4 équipes par poule", () => {
    expect(distributePools(teams, 4).map((p) => p.length)).toEqual([4, 4, 4, 4]);
  });
  it("une poule de 4 joue 6 matchs", () => {
    expect(roundRobin(["a", "b", "c", "d"], 0)).toHaveLength(6);
  });
  it("8 qualifiés donnent 7 matchs (quarts, demies, finale)", () => {
    expect(buildBracket(teams.slice(0, 8))).toHaveLength(7);
  });
  it("les exempts passent directement au tour suivant", () => {
    const b = buildBracket(["a", "b", "c"]);
    const final = b.find((m) => m.round === 2)!;
    expect(final.team_a).toBe("a");
  });
  it("le 1er de chaque poule passe avant les 2es", () => {
    const s = poolStandings(["a", "b"], [{ stage: "pool", pool_index: 0, team_a: "a", team_b: "b", score_a: 1, score_b: 3, winner: "b" }]);
    expect(s[0]!.team).toBe("b");
    expect(qualifiersFromPools([s, [{ team: "c", played: 0, wins: 0, losses: 0, diff: 0 }, { team: "d", played: 0, wins: 0, losses: 0, diff: 0 }]], 2)).toEqual(["b", "c", "a", "d"]);
  });
});
