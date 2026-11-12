import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { organizerAddPlayers } from "@/lib/tournament.functions";

export function ManualPlayerForm({ tournamentId, doublette }: { tournamentId: string; doublette: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const addPlayers = useServerFn(organizerAddPlayers);
  const qc = useQueryClient();
  if (!open) return <Button type="button" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Ajouter</Button>;
  return <form className="grid w-full gap-4 border-y border-border py-5 sm:grid-cols-2" onSubmit={async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      await addPlayers({ data: { tournamentId, firstName: String(form.get("firstName") ?? ""), lastName: String(form.get("lastName") ?? ""), email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? ""), ...(doublette ? { partnerFirstName: String(form.get("partnerFirstName") ?? ""), partnerLastName: String(form.get("partnerLastName") ?? ""), teamName: String(form.get("teamName") ?? "") } : {}) } });
      await Promise.all([["board", tournamentId], ["guest-registrations", tournamentId], ["tournament", tournamentId], ["organization-space"]].map(queryKey => qc.invalidateQueries({ queryKey })));
      toast.success(doublette ? "Doublette ajoutée." : "Joueur ajouté.");
      setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Ajout impossible."); }
    finally { setBusy(false); }
  }}>
    <h3 className="text-lg sm:col-span-2">{doublette ? "Ajouter une doublette" : "Ajouter un joueur"}</h3>
    <Field name="firstName" label={doublette ? "Prénom du premier joueur" : "Prénom"} />
    <Field name="lastName" label={doublette ? "Nom du premier joueur" : "Nom"} />
    {doublette && <><Field name="partnerFirstName" label="Prénom du second joueur" /><Field name="partnerLastName" label="Nom du second joueur" /><Field name="teamName" label="Nom d’équipe (facultatif)" required={false} /></>}
    <h4 className="text-sm font-semibold sm:col-span-2">{doublette ? "Contact de l’un des deux joueurs" : "Contact du joueur"}</h4>
    <Field name="email" label="Adresse mail" type="email" maxLength={255} />
    <Field name="phone" label="Téléphone" type="tel" maxLength={30} />
    <div className="flex flex-wrap gap-2 sm:col-span-2"><Button type="submit" disabled={busy}><Check className="h-4 w-4" />{busy ? "Ajout en cours…" : "Valider l’ajout"}</Button><Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}><X className="h-4 w-4" />Annuler</Button></div>
  </form>;
}

function Field({ name, label, type = "text", required = true, maxLength = 60 }: { name: string; label: string; type?: string; required?: boolean; maxLength?: number }) {
  return <label className="grid min-w-0 gap-1 text-sm">{label}<input name={name} type={type} required={required} maxLength={maxLength} className="w-full min-w-0 rounded-md border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>;
}