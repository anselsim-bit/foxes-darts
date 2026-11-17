export type SpecialVisit = { side: "a" | "b"; darts: string[] };
export type SpecialCounts = Record<"a" | "b", Record<"180" | "26", number>>;

export function countSpecialVisits(raw: unknown): SpecialCounts {
  const counts: SpecialCounts = { a: { "180": 0, "26": 0 }, b: { "180": 0, "26": 0 } };
  if (!Array.isArray(raw) || raw.length > 10000) throw new Error("Volées invalides.");
  for (const visit of raw) {
    if (!visit || (visit.side !== "a" && visit.side !== "b") || !Array.isArray(visit.darts) || visit.darts.length > 3 || visit.darts.some((d: unknown) => typeof d !== "string" || !/^(Raté|Bull|25|[SDT](?:[1-9]|1[0-9]|20))$/.test(d))) throw new Error("Volées invalides.");
    const side: "a" | "b" = visit.side;
    if (visit.darts.length !== 3) continue;
    if (visit.darts.every((d: string) => d === "T20")) counts[side]["180"]++;
    if ([...visit.darts].sort().join(",") === ["S20", "S5", "S1"].sort().join(",")) counts[side]["26"]++;
  }
  return counts;
}

export function specialLeaders(teams: { id: string; name: string }[], matches: { team_a: string | null; team_b: string | null; special_visits?: unknown }[], category: "180" | "26") {
  const totals = new Map(teams.map(t => [t.id, 0]));
  for (const match of matches) {
    const counts = match.special_visits as SpecialCounts | undefined;
    for (const side of ["a", "b"] as const) {
      const id = side === "a" ? match.team_a : match.team_b;
      const n = counts?.[side]?.[category];
      if (id && typeof n === "number" && Number.isInteger(n) && n > 0) totals.set(id, (totals.get(id) ?? 0) + n);
    }
  }
  const total = Math.max(0, ...totals.values());
  return { total, names: total ? teams.filter(t => totals.get(t.id) === total).map(t => t.name) : [] };
}