import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireTournamentManager } from "./organization-access";
import { validateAdvertisements } from "./tournament-advertisements";

export const saveTournamentAdvertisements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; enabled: boolean; advertisements: unknown }) => input)
  .handler(async ({ data, context }) => {
    await requireTournamentManager(context, data.id);
    const { data: tournament, error } = await context.supabase.from("tournaments").select("organization_id").eq("id", data.id).single();
    if (error || !tournament?.organization_id) throw new Error("Tournoi introuvable.");
    const advertisements = validateAdvertisements(data.advertisements, tournament.organization_id);
    const result = await context.supabase.from("tournaments").update({ advertisements_enabled: data.enabled === true, advertisements }).eq("id", data.id);
    if (result.error) throw new Error("Enregistrement des publicités impossible.");
    return { ok: true };
  });