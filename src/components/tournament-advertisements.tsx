import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getAdminOrganization } from "@/lib/admin.functions";
import { saveTournamentAdvertisements } from "@/lib/tournament-advertisements.functions";
import { visibleAdvertisements, type TournamentAdvertisement } from "@/lib/tournament-advertisements";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { fieldClass } from "./platform-ui";

export function AdvertisementEditor({ organizationId, enabled = false, advertisements = [] }: { organizationId?: string; enabled?: boolean; advertisements?: unknown }) {
  const [active, setActive] = useState(enabled);
  const [items, setItems] = useState<TournamentAdvertisement[]>(Array.isArray(advertisements) ? advertisements : []);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const uploadInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let cancelled = false;
    const paths = items.map(i => i.logo_path).filter(Boolean);
    if (paths.length) void supabase.storage.from("tournament-advertisements").createSignedUrls(paths, 3600).then(({ data }) => {
      if (!cancelled) setPreviews(Object.fromEntries((data ?? []).flatMap(i => i.path && i.signedUrl ? [[i.path, i.signedUrl]] : [])));
    });
    return () => { cancelled = true; };
  }, [items]);
  return <fieldset className="space-y-4 border-y border-border py-5 sm:col-span-2">
    <legend className="text-lg font-semibold">Publicités et partenaires</legend>
    <label className="flex items-center gap-3 text-sm"><Checkbox checked={active} onCheckedChange={v => setActive(v === true)} />Afficher les publicités en plein écran</label>
    <input type="hidden" name="advertisements_enabled" value={String(active)} />
    <input type="hidden" name="advertisements" value={JSON.stringify(items)} />
    <input type="hidden" name="advertisements_uploading" value={String(uploading)} />
    {items.map((item, index) => <div key={item.logo_path || index} className="flex min-w-0 items-center gap-3 border-b border-border pb-3">
      {previews[item.logo_path] && <img src={previews[item.logo_path]} alt={item.name || "Logo du partenaire"} className="h-16 w-24 shrink-0 rounded object-contain bg-muted" />}
      <label className="min-w-0 flex-1 text-sm">Nom du partenaire<input aria-label={`Nom du partenaire ${index + 1}`} maxLength={120} className={fieldClass} value={item.name} onChange={e => setItems(current => current.map((i, n) => n === index ? { ...i, name: e.target.value } : i))} /></label>
      <Button type="button" size="icon" variant="ghost" title="Supprimer la publicité" aria-label={`Supprimer la publicité ${index + 1}`} onClick={() => setItems(current => current.filter((_, n) => n !== index))}><Trash2 className="h-4 w-4" /></Button>
    </div>)}
    <input ref={uploadInput} type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" aria-label="Logos des publicités" onChange={async e => {
      const files = Array.from(e.target.files ?? []); e.target.value = "";
      if (!files.length) return;
      setUploading(true);
      try {
        if (items.length + files.length > 30) throw new Error("30 publicités maximum.");
        const id = organizationId ?? (await getAdminOrganization()).id;
        const added: TournamentAdvertisement[] = [];
        for (const file of files) {
          if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) throw new Error("Choisissez un logo JPG, PNG ou WebP de 3 Mo maximum.");
          const bitmap = await createImageBitmap(file);
          const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
          const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
          const ctx = canvas.getContext("2d"); if (!ctx) { bitmap.close(); throw new Error("Lecture du logo impossible."); }
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
          const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Lecture du logo impossible.")), "image/png"));
          const path = `organizations/${id}/${crypto.randomUUID()}.png`;
          const { error } = await supabase.storage.from("tournament-advertisements").upload(path, blob, { contentType: "image/png" });
          if (error) throw new Error("Envoi du logo impossible.");
          added.push({ name: file.name.replace(/\.[^.]+$/, ""), logo_path: path });
          setItems(current => [...current, added[added.length - 1] as TournamentAdvertisement]);
        }
      } catch (error) { toast.error(error instanceof Error ? error.message : "Envoi impossible."); }
      finally { setUploading(false); }
    }} />
    <Button type="button" variant="outline" disabled={uploading || items.length >= 30} onClick={() => uploadInput.current?.click()}><Upload className="h-4 w-4" /><Plus className="h-4 w-4" />{uploading ? "Envoi en cours…" : "Ajouter des logos"}</Button>
  </fieldset>;
}

export function AdvertisementSettings({ tournament, onSaved }: { tournament: { id: string; organization_id: string | null; advertisements_enabled: boolean; advertisements: unknown }; onSaved: () => Promise<unknown> }) {
  const save = useServerFn(saveTournamentAdvertisements);
  const [busy, setBusy] = useState(false);
  return <form className="mt-8 space-y-4" onSubmit={async e => {
    e.preventDefault(); const form = new FormData(e.currentTarget);
    if (form.get("advertisements_uploading") === "true") { toast.error("Attendez la fin de l’envoi des logos."); return; }
    setBusy(true);
    try { await save({ data: { id: tournament.id, enabled: form.get("advertisements_enabled") === "true", advertisements: JSON.parse(String(form.get("advertisements"))) } }); await onSaved(); toast.success("Publicités enregistrées."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Enregistrement impossible."); } finally { setBusy(false); }
  }}><AdvertisementEditor key={tournament.id} organizationId={tournament.organization_id ?? undefined} enabled={tournament.advertisements_enabled} advertisements={tournament.advertisements} /><Button type="submit" disabled={busy}>Enregistrer les publicités</Button></form>;
}

export function AdvertisementStrip({ enabled, advertisements }: { enabled: boolean; advertisements: (TournamentAdvertisement & { logo_url: string | null })[] }) {
  const items = visibleAdvertisements(enabled, advertisements) as typeof advertisements;
  if (!items.length) return null;
  return <footer aria-label="Publicités du tournoi" className="mt-3 flex shrink-0 items-center justify-evenly gap-4 overflow-x-auto border-t border-border pt-3">
    {items.map((item, index) => <div key={item.logo_path + index} className="flex w-36 min-w-28 shrink-0 flex-col items-center gap-1">
      {item.logo_url && <img src={item.logo_url} alt={item.name || "Partenaire"} className="h-12 w-full object-contain sm:h-16" />}
      {item.name && <span className="line-clamp-2 text-center text-xs text-muted-foreground">{item.name}</span>}
    </div>)}
  </footer>;
}