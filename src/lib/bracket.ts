// Logique pure de génération de tableau (poules + élimination directe).

export type MatchDraft = {
  stage: "pool" | "bracket" | "consolation" | "small_final";
  pool_index: number | null;
  round: number;
  position: number;
  team_a: string | null;
  team_b: string | null;
  winner: string | null;
};

export type MatchResult = {
  stage: string;
  pool_index: number | null;
  team_a: string | null;
  team_b: string | null;
  score_a: number | null;
  score_b: number | null;
  winner: string | null;
};

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Répartit les équipes dans `count` poules (en serpentin). */
export function distributePools(teams: string[], count: number): string[][] {
  const pools: string[][] = Array.from({ length: count }, () => []);
  teams.forEach((t, i) => {
    const row = Math.floor(i / count);
    const idx = row % 2 === 0 ? i % count : count - 1 - (i % count);
    pools[idx]!.push(t);
  });
  return pools;
}

/** Toutes les rencontres d'une poule (chacun contre chacun, méthode du cercle). */
export function roundRobin(teams: string[], poolIndex: number): MatchDraft[] {
  const list: (string | null)[] = [...teams];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const out: MatchDraft[] = [];
  let pos = 0;
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i]!;
      const b = list[n - 1 - i]!;
      if (a && b) out.push({ stage: "pool", pool_index: poolIndex, round: r + 1, position: pos++, team_a: a, team_b: b, winner: null });
    }
    list.splice(1, 0, list.pop()!);
  }
  return out;
}

export function nextPow2(n: number) {
  let s = 1;
  while (s < n) s *= 2;
  return s;
}

/** Tableau à élimination directe ; les exempts passent automatiquement. `seeds` est classé du meilleur au moins bon. */
export function buildBracket(seeds: string[]): MatchDraft[] {
  const size = Math.max(2, nextPow2(seeds.length));
  const slots: (string | null)[] = [...seeds, ...Array(size - seeds.length).fill(null)];
  const rounds = Math.log2(size);
  const matches: MatchDraft[] = [];
  for (let i = 0; i < size / 2; i++) {
    const a = slots[i] ?? null;
    const b = slots[size - 1 - i] ?? null;
    matches.push({ stage: "bracket", pool_index: null, round: 1, position: i, team_a: a, team_b: b, winner: a && !b ? a : !a && b ? b : null });
  }
  for (let r = 2; r <= rounds; r++) {
    for (let p = 0; p < size / 2 ** r; p++) {
      matches.push({ stage: "bracket", pool_index: null, round: r, position: p, team_a: null, team_b: null, winner: null });
    }
  }
  // Propage les exempts du 1er tour.
  for (const m of matches.filter((x) => x.round === 1 && x.winner)) {
    const next = matches.find((x) => x.round === 2 && x.position === Math.floor(m.position / 2));
    if (next) next[m.position % 2 === 0 ? "team_a" : "team_b"] = m.winner;
  }
  return matches;
}

/** Emplacement du vainqueur au tour suivant. */
export function nextSlot(round: number, position: number) {
  return { round: round + 1, position: Math.floor(position / 2), side: position % 2 === 0 ? ("team_a" as const) : ("team_b" as const) };
}

export type PoolRow = { team: string; played: number; wins: number; losses: number; diff: number };

export function poolStandings(teams: string[], matches: MatchResult[]): PoolRow[] {
  const rows = new Map<string, PoolRow>(teams.map((t) => [t, { team: t, played: 0, wins: 0, losses: 0, diff: 0 }]));
  for (const m of matches) {
    if (!m.winner || !m.team_a || !m.team_b) continue;
    const a = rows.get(m.team_a);
    const b = rows.get(m.team_b);
    if (!a || !b) continue;
    a.played++; b.played++;
    // Seul le perdant marque des points : ses points restants. Le gagnant n'en prend aucun.
    // Moins on a de points, plus on est haut au classement.
    if (m.winner === m.team_a) { a.wins++; b.losses++; b.diff += m.score_b ?? 0; }
    else { b.wins++; a.losses++; a.diff += m.score_a ?? 0; }
  }
  return [...rows.values()].sort((x, y) => y.wins - x.wins || x.diff - y.diff);
}

/** Qualifiés des poules : tous les 1ers, puis tous les 2es… */
export function qualifiersFromPools(standings: PoolRow[][], perPool: number): string[] {
  const out: string[] = [];
  for (let rank = 0; rank < perPool; rank++) for (const s of standings) if (s[rank]) out.push(s[rank]!.team);
  return out;
}

/** Non qualifiés des poules (consolante) : tous les 3es, puis tous les 4es… */
export function consolationFromPools(standings: PoolRow[][], qualifiedPerPool: number): string[] {
  const max = Math.max(0, ...standings.map((s) => s.length));
  const out: string[] = [];
  for (let rank = qualifiedPerPool; rank < max; rank++) for (const s of standings) if (s[rank]) out.push(s[rank]!.team);
  return out;
}
