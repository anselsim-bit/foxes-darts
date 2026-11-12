import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { registerGuestForTournament } from "@/lib/player.functions";

const input = "rounded-md border border-input bg-background px-3 py-2.5 text-sm";

/** Sign-up form for visitors without an account. */
export function GuestRegistrationForm({ tournamentId }: { tournamentId: string }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (done) return <p className="font-medium text-primary">{done}</p>;
  return (
    <form
      className="grid w-full gap-2 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const r = await registerGuestForTournament({ data: { tournamentId, firstName: String(f.get("firstName")), lastName: String(f.get("lastName")), email: String(f.get("email")), phone: String(f.get("phone")) } });
          if (r.ok) { setDone(r.message); toast.success(r.message); void qc.invalidateQueries({ queryKey: ["tournament", tournamentId] }); void qc.invalidateQueries({ queryKey: ["board", tournamentId] }); }
          else toast.info(r.message);
        } catch (err) { toast.error(err instanceof Error ? err.message : "Inscription impossible."); }
        finally { setBusy(false); }
      }}
    >
      <p className="text-sm text-muted-foreground sm:col-span-2">Inscription sans compte : seuls vos prénom et nom apparaîtront sur le tournoi. L’organisateur est le seul à voir votre e-mail et votre téléphone.</p>
      <input name="firstName" required maxLength={60} placeholder="Prénom" autoComplete="given-name" className={input} />
      <input name="lastName" required maxLength={60} placeholder="Nom" autoComplete="family-name" className={input} />
      <input name="email" type="email" required maxLength={255} placeholder="E-mail" autoComplete="email" className={input} />
      <input name="phone" type="tel" required maxLength={30} placeholder="Téléphone" autoComplete="tel" className={input} />
      <button type="submit" disabled={busy} className="rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground hover:bg-primary/90 sm:col-span-2">{busy ? "..." : "Je m’inscris sans compte"}</button>
    </form>
  );
}

/** Organizer-only list of guest contact details (database policy restricts reads to tournament managers). */
export function GuestRegistrationsList({ tournamentId }: { tournamentId: string }) {
  const { data } = useQuery({
    queryKey: ["guest-registrations", tournamentId],
    queryFn: async () => (await supabase.from("tournament_guest_registrations").select("id, first_name, last_name, email, phone, created_at").eq("tournament_id", tournamentId).order("created_at")).data ?? [],
  });
  if (!data?.length) return null;
  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-3 text-sm">
      <p className="mb-2 font-semibold">Inscrits sans compte (visible uniquement par l’organisation)</p>
      {data.map((g) => (
        <p key={g.id} className="flex flex-wrap gap-x-3 border-t border-border py-1.5 first:border-t-0">
          <span className="font-medium">{g.first_name} {g.last_name}</span>
          <a className="text-primary" href={`mailto:${g.email}`}>{g.email}</a>
          <a className="text-primary" href={`tel:${g.phone}`}>{g.phone}</a>
        </p>
      ))}
    </div>
  );
}
