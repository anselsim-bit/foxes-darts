import { createFileRoute } from "@tanstack/react-router";
import { syncHelloAsso } from "@/lib/helloasso.server";

// Appelé toutes les heures. Idempotent (upsert), ne renvoie aucune donnée personnelle.
export const Route = createFileRoute("/api/public/hooks/helloasso-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        try {
          const r = await syncHelloAsso();
          return Response.json({ ok: true, imported: r.imported, failures: r.failures.length });
        } catch {
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
