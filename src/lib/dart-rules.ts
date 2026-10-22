export type ScoredDart = { value: number; isDouble: boolean };
export type ScoredTurn = { player: number; darts: ScoredDart[]; bust: boolean; total: number };

export function tournamentRules(startScore: number, doubleOut: boolean, stage: string, limitDoubles = true) {
  if (startScore !== 301 && startScore !== 501) throw new Error("Choisissez une partie en 301 ou 501.");
  if (typeof doubleOut !== "boolean") throw new Error("Choisissez le type de sortie.");
  return { start: startScore, doubleOut, poolDoubleLimit: stage === "pool" && doubleOut && limitDoubles };
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