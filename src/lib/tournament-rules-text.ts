import { phaseRules } from "./dart-rules";
import { roundLabels, validateRoundSettings } from "./round-settings";
/** Human-readable rules for reminder emails, derived only from the phases and formats checked on the tournament. */
export type RulesInput = {
  format: string; pool_count: number; consolation: boolean;
  game_settings?: unknown;
  start_score: number; double_out: boolean; pool_double_limit: boolean;
  final_start_score: number | null; final_double_out: boolean | null;
  consolation_start_score: number | null; consolation_double_out: boolean | null; consolation_double_limit: boolean | null;
};
const out = (d: boolean, limit: boolean) =>
  d ? `sortie double (la dernière fléchette doit tomber dans un double ou dans le centre 50)${limit ? " ; à partir de 50 points restants, chaque équipe a 5 tours d’essais de double, ensuite la sortie simple est autorisée" : ""}` : "sortie simple (n’importe quelle case pour finir à 0)";
export function tournamentRulesText(t: RulesInput): string[] {
  const rules = [`Format : ${t.format === "equipe" ? "doublette (2 joueurs par équipe)" : "solo"}`];
  const pools = t.pool_count > 0;
  const describe = (stage: string, distance?: number) => { const r = phaseRules(t, stage, distance); return `${r.legsToWin} manche${r.legsToWin > 1 ? "s" : ""} gagnante${r.legsToWin > 1 ? "s" : ""} : ${r.start}, ${out(r.doubleOut, r.poolDoubleLimit)}`; };
  if (pools) rules.push(`Phase de poules (${t.pool_count} poules), ${describe("pool")}. Classement : victoires, puis le moins de points restants.`);
  rules.push(`Phase finale et petite finale : ${describe("bracket")}.`);
  if (pools && t.consolation) rules.push(`Consolante pour les non-qualifiés : ${describe("consolation")}.`);
  for (const key of Object.keys(validateRoundSettings(t.game_settings)?.rounds ?? {})) {
    const [stage, distance] = key.split(":");
    if (!stage || (stage === "consolation" && (!pools || !t.consolation))) continue;
    rules.push(`${stage === "small_final" ? "Petite finale" : `${stage === "consolation" ? "Consolante" : "Phase finale"} — ${roundLabels[Number(distance)]}`} : ${describe(stage, Number(distance))}.`);
  }
  return rules;
}
