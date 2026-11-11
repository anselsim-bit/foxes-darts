import { useState } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { submitReport } from "@/lib/organizations.functions";
import { Button } from "./ui/button";

/** Bouton discret « Signaler » : connexion requise, motif libre, envoyé à l'administration centrale. */
export function ReportButton({ organizationId, tournamentId }: { organizationId?: string | null; tournamentId?: string | null }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const { data: signedIn } = useQuery({ queryKey: ["signed-in"], queryFn: async () => !!(await supabase.auth.getSession()).data.session });
  if (!open) return <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setOpen(true)}><Flag className="mr-1 h-4 w-4" />Signaler</Button>;
  if (!signedIn) return <p className="text-sm text-muted-foreground"><Link to="/auth" search={{ redirect: location.pathname }} className="text-primary underline">Connectez-vous</Link> pour signaler un problème.</p>;
  return (
    <form className="mt-2 flex max-w-xl flex-col gap-2" onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await submitReport({ data: { organizationId: organizationId ?? null, tournamentId: tournamentId ?? null, reason } }); toast.success("Merci, votre signalement a été transmis."); setOpen(false); setReason(""); } catch (err) { toast.error(err instanceof Error ? err.message : "Signalement impossible"); } finally { setBusy(false); } }}>
      <textarea value={reason} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} maxLength={1000} rows={3} placeholder="Décrivez le problème (contenu inapproprié, erreur, usurpation…)" className="rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <div className="flex gap-2"><Button type="submit" size="sm" disabled={busy}>Envoyer</Button><Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Annuler</Button></div>
    </form>
  );
}
