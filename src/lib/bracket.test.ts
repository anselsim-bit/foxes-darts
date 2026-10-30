import { describe, it, expect } from "vitest";
import { distributePools, roundRobin, buildBracket, buildPoolBracket, buildPoolFinals, poolStandings, qualifiersFromPools, consolationFromPools } from "./bracket";

const teams = Array.from({ length: 16 }, (_, i) => `T${i + 1}`);

describe("bracket", () => {
  it("réserve les deux exemptions aux meilleurs premiers et non à l'ordre des poules", () => {
    const standings = [
      [{ team: "Aymeric", wins: 2, diff: 30 }, { team: "Lucas", wins: 2, diff: 34 }],
      [{ team: "Lucien", wins: 3, diff: 0 }, { team: "Justine", wins: 2, diff: 68 }],
      [{ team: "Gautier", wins: 3, diff: 0 }, { team: "Théo", wins: 2, diff: 16 }],
    ].map((p) => p.map((row) => ({ ...row, played: 3, losses: 3 - row.wins })));
    const bracket = buildPoolFinals(standings, false);
    expect(bracket.filter((m) => m.round === 1 && m.winner).map((m) => m.winner)).toEqual(["Lucien", "Gautier"]);
    expect(bracket.find((m) => m.round === 2 && m.position === 0)).toMatchObject({ team_a: "Lucien", team_b: "Gautier" });
    for (const m of bracket.filter((m) => m.round === 1 && m.team_a && m.team_b)) {
      expect(standings.findIndex((p) => p.some((r) => r.team === m.team_a))).not.toBe(standings.findIndex((p) => p.some((r) => r.team === m.team_b)));
    }
  });
  it("départage les premiers à victoires égales avec le moins de points restants", () => {
    const standings = [50, 10, 30].map((diff, i) => [
      { team: `first${i}`, wins: 3, diff, played: 4, losses: 1 },
      { team: `second${i}`, wins: 4, diff: 0, played: 4, losses: 0 },
    ]);
    expect(buildPoolFinals(standings, false).filter((m) => m.round === 1 && m.winner).map((m) => m.winner)).toEqual(["first1", "first2"]);
  });
  it.each([2, 3, 4, 5, 6, 7, 8])("croise les %i poules sans revanche au premier tour", (count) => {
    const pools = Array.from({ length: count }, (_, i) => [`${i}:1`, `${i}:2`]);
    const first = buildPoolBracket(pools).filter((m) => m.round === 1);
    expect(first.flatMap((m) => [m.team_a, m.team_b]).filter(Boolean).sort()).toEqual(pools.flat().sort());
    for (const m of first) if (m.team_a && m.team_b) expect(m.team_a.split(":")[0]).not.toBe(m.team_b.split(":")[0]);
    expect(first.filter((m) => m.winner)).toHaveLength(2 ** Math.ceil(Math.log2(count * 2)) - count * 2);
  });
  it("génère la consolante activée et croise les trois poules", () => {
    const standings = Array.from({ length: 3 }, (_, i) => Array.from({ length: 4 }, (_, r) => ({ team: `${i}:${r}`, played: 3, wins: 3 - r, losses: r, diff: r })));
    const matches = buildPoolFinals(standings, true);
    const consolation = matches.filter((m) => m.stage === "consolation");
    expect(consolation).toHaveLength(7);
    expect(matches.filter((m) => m.stage === "small_final")).toHaveLength(1);
    for (const m of consolation.filter((m) => m.round === 1 && m.team_a && m.team_b)) expect(m.team_a?.split(":")[0]).not.toBe(m.team_b?.split(":")[0]);
  });
  it("ne génère aucune consolante désactivée", () => {
    const standings = ["a", "b"].map((p) => [1, 2, 3, 4].map((r) => ({ team: `${p}${r}`, played: 3, wins: 4 - r, losses: r - 1, diff: r })));
    expect(buildPoolFinals(standings, false).filter((m) => m.stage === "consolation")).toHaveLength(0);
  });
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
  it("le gagnant ne prend aucun point, le perdant additionne ses points restants", () => {
    const s = poolStandings(["a", "b"], [
      { stage: "pool", pool_index: 0, team_a: "a", team_b: "b", score_a: 0, score_b: 120, winner: "a" },
      { stage: "pool", pool_index: 0, team_a: "b", team_b: "a", score_a: 45, score_b: 0, winner: "a" },
    ]);
    expect(s.find((r) => r.team === "a")!.diff).toBe(0);
    expect(s.find((r) => r.team === "b")!.diff).toBe(165);
  });
  it("à victoires égales, le moins de points restants est devant", () => {
    const s = poolStandings(["a", "b", "c"], [
      { stage: "pool", pool_index: 0, team_a: "a", team_b: "b", score_a: 0, score_b: 30, winner: "a" },
      { stage: "pool", pool_index: 0, team_a: "c", team_b: "a", score_a: 0, score_b: 10, winner: "c" },
      { stage: "pool", pool_index: 0, team_a: "b", team_b: "c", score_a: 0, score_b: 200, winner: "b" },
    ]);
    // a, b et c ont chacun 1 victoire ; a (10 pts) devance b (30 pts) devance c (200 pts).
    expect(s.map((r) => r.team)).toEqual(["a", "b", "c"]);
  });
  it("la consolante regroupe les non qualifiés, des 3es aux derniers", () => {
    const standings = [
      [
        { team: "a", played: 0, wins: 0, losses: 0, diff: 0 },
        { team: "b", played: 0, wins: 0, losses: 0, diff: 0 },
        { team: "c", played: 0, wins: 0, losses: 0, diff: 0 },
      ],
      [
        { team: "d", played: 0, wins: 0, losses: 0, diff: 0 },
        { team: "e", played: 0, wins: 0, losses: 0, diff: 0 },
        { team: "f", played: 0, wins: 0, losses: 0, diff: 0 },
      ],
    ];
    expect(consolationFromPools(standings, 2)).toEqual(["c", "f"]);
  });
});
