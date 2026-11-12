import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

// Appelé à 7h et 8h UTC ; n'envoie qu'à 9h heure de Paris (été comme hiver). Idempotent par joueur et tournoi.
export const Route = createFileRoute("/api/public/hooks/tournament-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const unauthorized = await authenticateCronRequest(request);
        if (unauthorized) return unauthorized;
        try {
          const { sendTournamentReminders } = await import("@/lib/tournament-reminders.server");
          const r = await sendTournamentReminders();
          return Response.json({ ok: true, ...r });
        } catch {
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
