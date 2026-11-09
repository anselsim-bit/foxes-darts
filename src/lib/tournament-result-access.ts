/** Guest codes and captain identity authorize first reports, never corrections. */
export function assertResultWritable(winner: string | null | undefined, manager: boolean) {
  if (winner && !manager) throw new Error("Seul un administrateur de ce tournoi peut corriger un résultat déjà enregistré.");
}