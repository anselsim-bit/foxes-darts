export type ScoredDart = { value: number; isDouble: boolean };
export type ScoredTurn = { player: number; darts: ScoredDart[]; bust: boolean; total: number };

export function tournamentRules(startScore: number, doubleOut: boolean, stage: string, limitDoubles = true) {
  if (startScore !== 301 && startScore !== 501) throw new Error("Choisissez une partie en 301 ou 501.");
  if (typeof doubleOut !== "boolean") throw new Error("Choisissez le type de sortie.");
  return { start: startScore, doubleOut, poolDoubleLimit: stage === "pool" && doubleOut && limitDoubles, legsToWin: stage === "pool" ? 1 : 2 };
}

export function validateFinalLegs(a: number | undefined, b: number | undefined) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || !((a === 2 && (b === 0 || b === 1)) || (b === 2 && (a === 0 || a === 1)))) {
    throw new Error("La phase finale se joue en deux manches gagnantes : 2–0 ou 2–1.");
  }
  return { legsA: a as number, legsB: b as number };
}

/** A visit counts once if a dart is thrown with 50 or fewer remaining, including bust visits. */
export function replayTurns(start: number, playerCount: number, turns: ScoredTurn[]) {
  const scores = Array.from({ length: playerCount }, () => start);
  const doubleAttempts = Array.from({ length: playerCount }, () => 0);
  for (const turn of turns) {
    const score = scores[turn.player];
    if (score === undefined) continue;
    let left = score;
    let attempted = false;
    for (const dart of turn.darts) {
      if (left > 0 && left <= 50) attempted = true;
      left -= dart.value;
    }
    if (attempted) doubleAttempts[turn.player] = (doubleAttempts[turn.player] ?? 0) + 1;
    if (!turn.bust) scores[turn.player] = score - turn.total;
  }
  return { scores, doubleAttempts };
}

export function requiresDouble(doubleOut: boolean, poolDoubleLimit: boolean, attempts: number) {
  return doubleOut && (!poolDoubleLimit || attempts < 5);
}

export function isBust(left: number, dart: ScoredDart, doubleOut: boolean) {
  return left < 0 || (doubleOut && left === 1) || (left === 0 && doubleOut && !dart.isDouble);
}
export type PhaseSettings = { start_score: number; double_out: boolean; pool_double_limit?: boolean | null | undefined; final_start_score?: number | null | undefined; final_double_out?: boolean | null | undefined; consolation_start_score?: number | null | undefined; consolation_double_out?: boolean | null | undefined };
export function phaseRules(settings: PhaseSettings, stage: string) {
  const consolation = stage === "consolation";
  const final = stage !== "pool";
  return tournamentRules(
    (final ? (consolation ? settings.consolation_start_score : settings.final_start_score) : null) ?? settings.start_score,
    (final ? (consolation ? settings.consolation_double_out : settings.final_double_out) : null) ?? settings.double_out,
    stage, settings.pool_double_limit ?? true,
  );
}
export function visitStats(turns: ScoredTurn[], player: number) {
  const visits = turns.filter(t => t.player === player);
  const totals = visits.map(t => t.bust ? 0 : t.total);
  return { average: totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : 0, best: Math.max(0, ...totals) };
}
export function validateLiveLegs(a: number, b: number) {
  if (![a, b].every(n => Number.isInteger(n) && n >= 0 && n <= 2) || (a === 2 && b === 2)) throw new Error("Manches invalides.");
  return { live_legs_a: a, live_legs_b: b };
}
