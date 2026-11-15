export type GameRule = { start: number; doubleOut: boolean; legsToWin: number };
export type RoundSettings = { version: 1; phases: Partial<Record<"pool" | "bracket" | "consolation", GameRule>>; rounds: Record<string, GameRule> };
export const roundLabels = ["Finale", "Demi-finales", "Quarts de finale", "Huitièmes de finale", "Seizièmes de finale", "Trente-deuxièmes de finale", "Soixante-quatrièmes de finale"];
export function roundKey(stage: string, distance = 0) { return stage === "pool" || stage === "small_final" ? stage : `${stage}:${distance}`; }
export function validateRoundSettings(raw: unknown): RoundSettings | null {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) throw new Error("Réglages de jeu invalides.");
  const r = raw as Record<string, unknown>;
  if (r["version"] !== 1 || !r["phases"] || !r["rounds"] || typeof r["phases"] !== "object" || typeof r["rounds"] !== "object" || Array.isArray(r["phases"]) || Array.isArray(r["rounds"])) throw new Error("Réglages de jeu invalides.");
  const rule = (v: unknown): GameRule => {
    if (!v || typeof v !== "object") throw new Error("Réglages de jeu invalides.");
    const x = v as GameRule;
    if (![301, 501].includes(x.start) || typeof x.doubleOut !== "boolean" || !Number.isInteger(x.legsToWin) || x.legsToWin < 1 || x.legsToWin > 20) throw new Error("Choisissez 301 ou 501 et de 1 à 20 manches gagnantes.");
    return { start: x.start, doubleOut: x.doubleOut, legsToWin: x.legsToWin };
  };
  const phases: RoundSettings["phases"] = {};
  for (const [k,v] of Object.entries(r["phases"])) {
    if (k !== "pool" && k !== "bracket" && k !== "consolation") throw new Error("Phase invalide.");
    phases[k] = rule(v);
  }
  const rounds: RoundSettings["rounds"] = {};
  for (const [k,v] of Object.entries(r["rounds"])) {
    if (!/^(small_final|(bracket|consolation):[0-6])$/.test(k)) throw new Error("Étape invalide.");
    rounds[k] = rule(v);
  }
  return { version: 1, phases, rounds };
}