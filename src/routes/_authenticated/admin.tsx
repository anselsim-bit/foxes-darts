import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listTournaments, listPhotos, listStandings, listHighlights } from "@/lib/public.functions";
import {
  getMyRoles,
  adminUpsertTournament,
  adminDeleteTournament,
  adminAddPhoto,
  adminDeletePhoto,
  adminUpsertStanding,
  adminDeleteStanding,
  adminUpsertHighlight,
  adminDeleteHighlight,
  adminListRegistrations,
  adminDeleteRegistration,
  adminListPlayerStats,
  adminListPlayers,
  adminUpsertPlayerStats,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Foxes Darts" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const TABS = [
  { key: "tournois", label: "Tournois" },
  { key: "photos", label: "Photos" },
  { key: "classements", label: "Classements" },
  { key: "actions", label: "Grandes actions" },
  { key: "inscriptions", label: "Inscriptions" },
  { key: "stats", label: "Stats joueurs" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const DEFAULT_VENUE = {
  venue: "Salle des sports Huchin",
  street: "5 Place Charles de Gaulle",
  postal_code: "62360",
  city: "Saint-Léonard",
};

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";
const btnPrimary =
  "inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60";
const btnDanger =
  "inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:border-destructive hover:text-destructive";

function AdminPage() {
  const { data: roles, isLoading } = useQuery({
    queryKey: ["my-roles"],
    queryFn: () => getMyRoles(),
  });
  const [tab, setTab] = useState<TabKey>("tournois");

  if (isLoading) {
    return <div className="mx-auto max-w-6xl px-4 py-12 text-muted-foreground">Chargement…</div>;
  }
  if (!roles?.includes("admin")) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl">Accès refusé</h1>
        <p className="mt-3 text-muted-foreground">
          Cet espace est réservé aux administrateurs du club.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-4xl">
        <span className="text-gradient-ember">Administration</span>
      </h1>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                : "rounded-md border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "tournois" && <TournamentsTab />}
        {tab === "photos" && <PhotosTab />}
        {tab === "classements" && <StandingsTab />}
        {tab === "actions" && <HighlightsTab />}
        {tab === "inscriptions" && <RegistrationsTab />}
        {tab === "stats" && <PlayerStatsTab />}
      </div>
    </div>
  );
}

// ---------- Tournois ----------

function TournamentsTab() {
  const queryClient = useQueryClient();
  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments"],
    queryFn: () => listTournaments(),
  });
  const emptyForm = {
    title: "",
    event_date: "",
    start_time: "",
    end_time: "",
    format: "solo" as "solo" | "equipe",
    max_participants: "",
    venue: DEFAULT_VENUE.venue,
    street: DEFAULT_VENUE.street,
    postal_code: DEFAULT_VENUE.postal_code,
    city: DEFAULT_VENUE.city,
    description: "",
    helloasso_url: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [imagePath, setImagePath] = useState("");
  const [busy, setBusy] = useState(false);

  const uploadImage = async (file: File) => {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `tournaments/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("tournament-photos")
      .upload(path, file, file.type ? { contentType: file.type } : {});
    if (error) {
      toast.error(`Échec de l'envoi de l'image : ${error.message}`);
      return;
    }
    setImagePath(path);
    toast.success("Image envoyée.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const cityLine = [form.postal_code, form.city].map((v) => v.trim()).filter(Boolean).join(" ");
      const location = [form.venue, form.street, cityLine].map((v) => v.trim()).filter(Boolean).join(", ");
      await adminUpsertTournament({
        data: {
          title: form.title,
          event_date: form.event_date,
          start_time: form.start_time || undefined,
          end_time: form.end_time || undefined,
          format: form.format,
          max_participants: form.max_participants ? Math.max(1, parseInt(form.max_participants, 10)) : undefined,
          location: location || undefined,
          description: form.description,
          helloasso_url: form.helloasso_url,
          image_url: imagePath || undefined,
        },
      });
      toast.success("Tournoi enregistré.");
      setForm(emptyForm);
      setImagePath("");
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await adminDeleteTournament({ data: { id } });
    toast.success("Tournoi supprimé.");
    queryClient.invalidateQueries({ queryKey: ["tournaments"] });
    queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl">
          <Plus className="h-5 w-5 text-primary" /> Nouveau tournoi
        </h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Nom du tournoi</label>
          <input
            className={inputCls}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Date</label>
            <input
              type="date"
              className={inputCls}
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Heure de début</label>
            <input
              type="time"
              className={inputCls}
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Heure de fin</label>
            <input
              type="time"
              className={inputCls}
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Format</label>
            <select
              className={inputCls}
              value={form.format}
              onChange={(e) => setForm({ ...form, format: e.target.value as "solo" | "equipe" })}
            >
              <option value="solo">Solo</option>
              <option value="equipe">En équipe</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              {form.format === "equipe" ? "Nombre max d'équipes" : "Nombre max de participants"}
            </label>
            <input
              type="number"
              min={1}
              className={inputCls}
              placeholder="Illimité"
              value={form.max_participants}
              onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Nom du lieu</label>
            <input
              type="text"
              className={inputCls}
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Rue</label>
            <input
              type="text"
              className={inputCls}
              value={form.street}
              onChange={(e) => setForm({ ...form, street: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Code postal</label>
            <input
              type="text"
              className={inputCls}
              value={form.postal_code}
              onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Ville</label>
            <input
              type="text"
              className={inputCls}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            className={inputCls}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Lien billetterie HelloAsso</label>
          <input
            type="url"
            className={inputCls}
            placeholder="https://www.helloasso.com/…"
            value={form.helloasso_url}
            onChange={(e) => setForm({ ...form, helloasso_url: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Image du tournoi</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm text-muted-foreground hover:border-primary">
            <Upload className="h-4 w-4" />
            {imagePath ? "Image sélectionnée ✓" : "Choisir une image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
            />
          </label>
        </div>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "..." : "Publier le tournoi"}
        </button>
      </form>

      <div>
        <h2 className="text-xl">Tournois existants</h2>
        <ul className="mt-4 space-y-2">
          {tournaments.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-muted-foreground">
                  {t.event_date}
                  {t.start_time ? ` · ${t.start_time.slice(0, 5)}` : ""}
                  {t.end_time ? `–${t.end_time.slice(0, 5)}` : ""}
                </p>
              </div>
              <button onClick={() => remove(t.id)} className={btnDanger}>
                <Trash2 className="h-3.5 w-3.5" /> Supprimer
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- Photos ----------

function PhotosTab() {
  const queryClient = useQueryClient();
  const { data: photos = [] } = useQuery({ queryKey: ["photos"], queryFn: () => listPhotos() });
  const { data: tournaments = [] } = useQuery({
    queryKey: ["tournaments"],
    queryFn: () => listTournaments(),
  });
  const [caption, setCaption] = useState("");
  const [tournamentId, setTournamentId] = useState("");
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    try {
      const path = `photos/${crypto.randomUUID()}.${(file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
      const { error } = await supabase.storage.from("tournament-photos").upload(path, file);
      if (error) throw error;
      await adminAddPhoto({
        data: { image_url: path, caption: caption || undefined, tournament_id: tournamentId || undefined },
      });
      toast.success("Photo publiée.");
      setCaption("");
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["home"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await adminDeletePhoto({ data: { id } });
    toast.success("Photo supprimée.");
    queryClient.invalidateQueries({ queryKey: ["photos"] });
    queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-6">
        <div className="min-w-52 flex-1">
          <label className="mb-1 block text-sm font-medium">Légende</label>
          <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} />
        </div>
        <div className="min-w-52">
          <label className="mb-1 block text-sm font-medium">Tournoi (optionnel)</label>
          <select
            className={inputCls}
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
          >
            <option value="">—</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <label className={btnPrimary + " cursor-pointer"}>
          <Upload className="h-4 w-4" /> {busy ? "Envoi…" : "Ajouter une photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
        </label>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {photos.map((p) => (
          <figure key={p.id} className="overflow-hidden rounded-xl border border-border bg-card">
            {p.image_url && (
              <img src={p.image_url} alt={p.caption ?? ""} className="aspect-square w-full object-cover" />
            )}
            <figcaption className="flex items-center justify-between gap-2 p-2">
              <span className="truncate text-xs text-muted-foreground">{p.caption}</span>
              <button onClick={() => remove(p.id)} className={btnDanger}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

// ---------- Classements ----------

function StandingsTab() {
  const queryClient = useQueryClient();
  const { data: standings = [] } = useQuery({
    queryKey: ["standings"],
    queryFn: () => listStandings(),
  });
  const [form, setForm] = useState({
    season: String(new Date().getFullYear()),
    rank: 1,
    player_name: "",
    played: 0,
    wins: 0,
    losses: 0,
    points: 0,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminUpsertStanding({ data: form });
    toast.success("Classement enregistré.");
    setForm({ ...form, player_name: "", rank: form.rank + 1, played: 0, wins: 0, losses: 0, points: 0 });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
    queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  const remove = async (id: string) => {
    await adminDeleteStanding({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["standings"] });
    queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl">
          <Plus className="h-5 w-5 text-primary" /> Ajouter un joueur au classement
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Saison</label>
            <input
              className={inputCls}
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Rang</label>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={form.rank}
              onChange={(e) => setForm({ ...form, rank: Number(e.target.value) })}
              required
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Nom du joueur</label>
          <input
            className={inputCls}
            value={form.player_name}
            onChange={(e) => setForm({ ...form, player_name: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {(
            [
              ["played", "Joués"],
              ["wins", "Victoires"],
              ["losses", "Défaites"],
              ["points", "Points"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium">{label}</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>
        <button type="submit" className={btnPrimary}>
          Enregistrer
        </button>
      </form>

      <div>
        <h2 className="text-xl">Classement actuel</h2>
        <ul className="mt-4 space-y-2">
          {standings.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <p className="text-sm">
                <span className="font-semibold text-primary">#{s.rank}</span> {s.player_name}{" "}
                <span className="text-muted-foreground">
                  — {s.points} pts ({s.season})
                </span>
              </p>
              <button onClick={() => remove(s.id)} className={btnDanger}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- Grandes actions ----------

function HighlightsTab() {
  const queryClient = useQueryClient();
  const { data: highlights = [] } = useQuery({
    queryKey: ["highlights"],
    queryFn: () => listHighlights(),
  });
  const [form, setForm] = useState({ title: "", description: "", event_date: "" });
  const [mediaPath, setMediaPath] = useState("");

  const uploadMedia = async (file: File) => {
    const path = `highlights/${crypto.randomUUID()}.${(file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const { error } = await supabase.storage.from("tournament-photos").upload(path, file);
    if (error) {
      toast.error("Échec de l'envoi.");
      return;
    }
    setMediaPath(path);
    toast.success("Image envoyée.");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await adminUpsertHighlight({
      data: { ...form, event_date: form.event_date || undefined, media_url: mediaPath || undefined },
    });
    toast.success("Action publiée.");
    setForm({ title: "", description: "", event_date: "" });
    setMediaPath("");
    queryClient.invalidateQueries({ queryKey: ["highlights"] });
    queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  const remove = async (id: string) => {
    await adminDeleteHighlight({ data: { id } });
    queryClient.invalidateQueries({ queryKey: ["highlights"] });
    queryClient.invalidateQueries({ queryKey: ["home"] });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl">
          <Plus className="h-5 w-5 text-primary" /> Nouvelle grande action
        </h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Titre</label>
          <input
            className={inputCls}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            placeholder="Ex : 180 décisif en finale !"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Date</label>
          <input
            type="date"
            className={inputCls}
            value={form.event_date}
            onChange={(e) => setForm({ ...form, event_date: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea
            className={inputCls}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Image (optionnel)</label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm text-muted-foreground hover:border-primary">
            <Upload className="h-4 w-4" />
            {mediaPath ? "Image sélectionnée ✓" : "Choisir une image"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadMedia(e.target.files[0])}
            />
          </label>
        </div>
        <button type="submit" className={btnPrimary}>
          Publier
        </button>
      </form>

      <div>
        <h2 className="text-xl">Actions publiées</h2>
        <ul className="mt-4 space-y-2">
          {highlights.map((h) => (
            <li
              key={h.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium">{h.title}</p>
                {h.event_date && <p className="text-xs text-muted-foreground">{h.event_date}</p>}
              </div>
              <button onClick={() => remove(h.id)} className={btnDanger}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- Inscriptions ----------

function RegistrationsTab() {
  const queryClient = useQueryClient();
  const { data: registrations = [] } = useQuery({
    queryKey: ["admin-registrations"],
    queryFn: () => adminListRegistrations(),
  });

  const remove = async (id: string) => {
    await adminDeleteRegistration({ data: { id } });
    toast.success("Inscription supprimée.");
    queryClient.invalidateQueries({ queryKey: ["admin-registrations"] });
  };

  return (
    <div>
      <h2 className="text-xl">Inscriptions aux tournois</h2>
      {registrations.length === 0 ? (
        <p className="mt-4 text-muted-foreground">Aucune inscription pour le moment.</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">Joueur</th>
                <th className="px-4 py-3 font-medium">Tournoi</th>
                <th className="px-4 py-3 font-medium">Date d'inscription</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.player_name}</td>
                  <td className="px-4 py-3">{r.tournament_title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(r.id)} className={btnDanger}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- Stats joueurs ----------

function PlayerStatsTab() {
  const queryClient = useQueryClient();
  const { data: stats = [] } = useQuery({
    queryKey: ["admin-player-stats"],
    queryFn: () => adminListPlayerStats(),
  });
  const { data: players = [] } = useQuery({
    queryKey: ["admin-players"],
    queryFn: () => adminListPlayers(),
  });
  const [form, setForm] = useState({
    user_id: "",
    matches_played: 0,
    wins: 0,
    losses: 0,
    best_score: 0,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id) {
      toast.error("Choisissez un joueur.");
      return;
    }
    await adminUpsertPlayerStats({ data: form });
    toast.success("Statistiques enregistrées.");
    queryClient.invalidateQueries({ queryKey: ["admin-player-stats"] });
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-xl">
          <Plus className="h-5 w-5 text-primary" /> Mettre à jour les stats d'un joueur
        </h2>
        <div>
          <label className="mb-1 block text-sm font-medium">Joueur</label>
          <select
            className={inputCls}
            value={form.user_id}
            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
            required
          >
            <option value="">Choisir…</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name ?? p.id}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["matches_played", "Matchs joués"],
              ["wins", "Victoires"],
              ["losses", "Défaites"],
              ["best_score", "Meilleur score"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-sm font-medium">{label}</label>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: Number(e.target.value) })}
              />
            </div>
          ))}
        </div>
        <button type="submit" className={btnPrimary}>
          Enregistrer
        </button>
      </form>

      <div>
        <h2 className="text-xl">Stats enregistrées</h2>
        <ul className="mt-4 space-y-2">
          {stats.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm"
            >
              <span className="font-medium">{s.player_name}</span>{" "}
              <span className="text-muted-foreground">
                — {s.matches_played} matchs, {s.wins}V / {s.losses}D, meilleur score {s.best_score}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
