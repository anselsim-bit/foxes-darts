import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Settings2, Users, Trophy, KeyRound, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminSyncHelloAsso } from "@/lib/admin.functions";
import { getOrganizationSpace } from "@/lib/organizations.functions";
import { supabase } from "@/integrations/supabase/client";
import { TournamentSettingsForm } from "@/components/tournament-settings-form";
import { TournamentBoard } from "@/components/tournament-board";
import { Button } from "@/components/ui/button";

type Tab = "participants" | "settings" | "matches" | "access";
const tabs = [
  { key: "participants", label: "Inscrits et équipes", icon: Users },
  { key: "settings", label: "Paramètres", icon: Settings2 },
  { key: "matches", label: "Matchs et résultats", icon: Trophy },
  { key: "access", label: "Code et QR", icon: KeyRound },
] as const;
const spaceOptions = (slug: string) => queryOptions({
  queryKey: ["organization-space", slug],
  queryFn: () => getOrganizationSpace({ data: { slug } }),
});
const contactsOptions = (id: string) => queryOptions({
  queryKey: ["tournament-management-contacts", id],
  queryFn: async () => {
    const [members, helloasso] = await Promise.all([
      supabase.from("registrations").select("id,status,created_at,profiles(display_name)").eq("tournament_id", id).order("created_at"),
      supabase.from("helloasso_registrations").select("id,first_name,last_name,partner_first_name,partner_last_name,email,amount_cents,tier_name").eq("tournament_id", id).order("paid_at"),
    ]);
    if (members.error || helloasso.error) throw new Error("Impossible de charger les inscriptions.");
    return { members: members.data ?? [], helloasso: helloasso.data ?? [] };
  },
});

export const Route = createFileRoute("/_authenticated/dashboard_/organizations/$slug_/tournois/$id")({
  validateSearch: (search: Record<string, unknown>): { tab?: Tab } => ({
    tab: tabs.find((t) => t.key === search["tab"])?.key ?? "participants",
  }),
  loader: async ({ context, params }) => {
    const space = await context.queryClient.ensureQueryData(spaceOptions(params.slug));
    if (!space.tournaments.some((t) => t.id === params.id)) throw notFound();
    await context.queryClient.ensureQueryData(contactsOptions(params.id));
  },
  head: () => ({ meta: [
    { title: "Gestion du tournoi — Foxes Darts" },
    { name: "description", content: "Gérez les inscrits, les paramètres, les matchs et l’accès à votre tournoi." },
    { property: "og:title", content: "Gestion du tournoi — Foxes Darts" },
    { property: "og:description", content: "L’espace organisateur dédié à votre tournoi." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  errorComponent: () => {
    const router = useRouter();
    return <div role="alert" className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-2xl">Gestion indisponible</h1><p className="my-4 text-muted-foreground">Vérifiez votre accès à cette organisation.</p><Button onClick={() => router.invalidate()}>Réessayer</Button></div>;
  },
  notFoundComponent: () => <div className="mx-auto max-w-6xl px-4 py-10"><h1 className="text-2xl">Tournoi introuvable</h1><p className="my-4 text-muted-foreground">Ce tournoi n’est pas disponible dans votre espace organisateur.</p><Button asChild><Link to="/dashboard">Mon espace</Link></Button></div>,
  component: TournamentManagement,
});

function TournamentManagement() {
  const { slug, id } = Route.useParams();
  const { tab = "participants" } = Route.useSearch();
  const { data } = useSuspenseQuery(spaceOptions(slug));
  const { data: contacts } = useSuspenseQuery(contactsOptions(id));
  const router = useRouter();
  const queryClient = useQueryClient();
  const syncHelloAsso = useServerFn(adminSyncHelloAsso);
  const [syncing, setSyncing] = useState(false);
  const tournament = data.tournaments.find((t) => t.id === id);
  if (!tournament) return <p className="p-10">Tournoi indisponible.</p>;
  const editable = tournament.status !== "started" && tournament.status !== "finished";
  const status = tournament.status === "started" ? "En cours" : tournament.status === "finished" ? "Terminé" : "Inscriptions ouvertes";
  return <div className="mx-auto max-w-6xl px-4 py-8">
    <Button asChild variant="ghost" className="mb-5"><Link to="/dashboard/organizations/$slug" params={{ slug }}><ArrowLeft className="h-4 w-4" />{data.org.name}</Link></Button>
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
      <div className="min-w-0"><p className="mb-2 text-sm font-medium text-primary">Gestion du tournoi · {status}</p><h1 className="break-words text-3xl">{tournament.title}</h1><p className="mt-2 text-sm text-muted-foreground">{new Date(`${tournament.event_date}T12:00:00`).toLocaleDateString("fr-FR")} {tournament.start_time ? `· ${tournament.start_time.slice(0, 5)}` : ""} · {tournament.format === "equipe" ? "Doublette" : "Solo"}</p></div>
      <Button asChild variant="outline"><Link to="/tournois/$id" params={{ id }}><ExternalLink className="h-4 w-4" />Page du tournoi</Link></Button>
    </header>
    <nav aria-label="Gestion du tournoi" className="my-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">{tabs.map(({ key, label, icon: Icon }) => <Button key={key} asChild variant={tab === key ? "default" : "outline"} className="h-auto min-h-10 whitespace-normal"><Link to="/dashboard/organizations/$slug/tournois/$id" params={{ slug, id }} search={{ tab: key }} aria-current={tab === key ? "page" : undefined}><Icon className="h-4 w-4 shrink-0" />{label}</Link></Button>)}</nav>
    {tab === "settings" ? editable ? <TournamentSettingsForm data={data} tournament={tournament} onSaved={async () => { await router.invalidate({ sync: true }); }} /> : <section><h2 className="text-xl">Paramètres du tournoi</h2><p className="my-4 text-muted-foreground">Les paramètres ne sont plus modifiables après le lancement du tournoi.</p><dl className="grid gap-4 sm:grid-cols-2">{[["Lieu", tournament.location || "Non renseigné"], ["Horaires", `${tournament.start_time?.slice(0,5) || "—"} – ${tournament.end_time?.slice(0,5) || "—"}`], ["Tarif", tournament.price_cents ? `${tournament.price_cents / 100} €` : "Gratuit"], ["HelloAsso", tournament.helloasso_url || "Non utilisé"]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words">{value}</dd></div>)}</dl></section> : <>
      {tab === "participants" && tournament.helloasso_url && data.org.slug === "foxes-darts" && <div className="mb-6 flex flex-wrap justify-end gap-3">
        <Button variant="outline" disabled={syncing} onClick={async () => {
          setSyncing(true);
          try {
            const result = await syncHelloAsso({ data: { tournamentId: id } });
            await queryClient.invalidateQueries({ queryKey: ["tournament-management-contacts", id] });
            await queryClient.invalidateQueries({ queryKey: ["board", id] });
            await queryClient.invalidateQueries({ queryKey: ["organization-space", slug] });
            await router.invalidate({ sync: true });
            if (result.failures.length) toast.error("Synchronisation partielle : certaines inscriptions n’ont pas pu être récupérées.");
            else toast.success(`${result.imported} inscription(s) HelloAsso synchronisée(s).`);
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Synchronisation HelloAsso impossible.");
          } finally { setSyncing(false); }
        }}><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin motion-reduce:animate-none" : ""}`} />{syncing ? "Synchronisation en cours…" : "Synchroniser HelloAsso"}</Button>
      </div>}
      <TournamentBoard printTitle={`${tournament.title} — ${new Date(`${tournament.event_date}T12:00:00`).toLocaleDateString("fr-FR")}`} tournamentId={id} status={tournament.status} poolCount={tournament.pool_count} maxParticipants={tournament.max_participants} isTeam={tournament.format === "equipe"} consolationEnabled={tournament.consolation} section={tab} />
      {tab === "participants" && <div className="mt-8 space-y-8">
        <section><h2 className="mb-3 text-xl">Inscriptions des membres ({contacts.members.length})</h2>{contacts.members.length ? contacts.members.map((r) => <div key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-3"><span>{r.profiles?.display_name ?? "Joueur"}</span><span className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span></div>) : <p className="text-sm text-muted-foreground">Aucune inscription de membre.</p>}</section>
        {tournament.helloasso_url && <section><h2 className="mb-3 text-xl">Inscriptions HelloAsso ({contacts.helloasso.length})</h2>{contacts.helloasso.length ? contacts.helloasso.map((r) => <div key={r.id} className="grid min-w-0 gap-1 border-b border-border py-3 sm:grid-cols-2"><div><p>{r.first_name} {r.last_name}{r.partner_first_name ? ` & ${r.partner_first_name} ${r.partner_last_name ?? ""}` : ""}</p>{r.email && <a className="break-all text-sm text-primary" href={`mailto:${r.email}`}>{r.email}</a>}</div><p className="text-sm text-muted-foreground sm:text-right">{r.tier_name} · {(r.amount_cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}</p></div>) : <p className="text-sm text-muted-foreground">Aucune inscription HelloAsso importée.</p>}</section>}
      </div>}
    </>}
  </div>;
}