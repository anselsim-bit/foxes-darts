/** Human-readable rules for reminder emails, derived only from the phases and formats checked on the tournament. */
export type RulesInput = {
  format: string; pool_count: number; consolation: boolean;
  start_score: number; double_out: boolean; pool_double_limit: boolean;
  final_start_score: number | null; final_double_out: boolean | null;
  consolation_start_score: number | null; consolation_double_out: boolean | null; consolation_double_limit: boolean | null;
};
const out = (d: boolean, limit: boolean) =>
  d ? `sortie double (la dernière fléchette doit tomber dans un double ou dans le centre 50)${limit ? " ; à partir de 50 points restants, chaque équipe a 5 tours d’essais de double, ensuite la sortie simple est autorisée" : ""}` : "sortie simple (n’importe quelle case pour finir à 0)";
export function tournamentRulesText(t: RulesInput): string[] {
  const rules = [`Format : ${t.format === "equipe" ? "doublette (2 joueurs par équipe)" : "solo"}`];
  const pools = t.pool_count > 0;
  if (pools) rules.push(`Phase de poules (${t.pool_count} poules, 1 manche par match) : ${t.start_score}, ${out(t.double_out, t.pool_double_limit)}. Classement : victoires, puis le moins de points restants.`);
  rules.push(`Phase finale et petite finale (2 manches gagnantes) : ${t.final_start_score ?? t.start_score}, ${out(t.final_double_out ?? t.double_out, false)}.`);
  if (pools && t.consolation) rules.push(`Consolante pour les non-qualifiés (2 manches gagnantes) : ${t.consolation_start_score ?? t.start_score}, ${out(t.consolation_double_out ?? t.double_out, t.consolation_double_limit ?? t.pool_double_limit)}.`);
  return rules;
}
