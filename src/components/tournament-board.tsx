import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Trash2, Trophy, Plus, Check, Pencil, PencilLine, Mail, KeyRound, ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { buildPoolBracket, poolStandings, rankedPoolQualifiers } from "@/lib/bracket";
import {
  getTournamentBoard,
  startTournament,
  reportMatch,
  amIAdmin,
  adminAddTeam,
  adminRenameTeam,
  adminDeleteTeam,
  adminSendTournamentLink,
  adminSetTournamentCode,
  getTournamentCodeAdmin,
} from "@/lib/tournament.functions";

type Match = {
  id: string;
  stage: string;
  pool_index: number | null;
  round: number;
  position: number;
  team_a: string | null;
  team_b: string | null;
  score_a: number | null;
  score_b: number | null;
  winner: string | null;
  legs_a?: number | null;
  legs_b?: number | null;
};

const poolName = (i: number) => `Poule ${String.fromCharCode(65 + i)}`;

export function TournamentBoard({
  tournamentId,
  status,
  poolCount,
  maxParticipants,
  isTeam,
  consolationEnabled = false,
}: {
  tournamentId: string;
  status: string;
  poolCount: number;
  maxParticipants: number | null;
  isTeam: boolean;
  consolationEnabled?: boolean;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["board", tournamentId],
    queryFn: () => getTournamentBoard({ data: { id: tournamentId } }),
  });
  const [admin, setAdmin] = useState(false);
  const [newTeam, setNewTeam] = useState("");
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [showTeams, setShowTeams] = useState(false);
  const [poolView, setPoolView] = useState<"all" | number>("all");
  const [view, setView] = useState<"pools" | "final" | "consolation">("pools");
  const [busy, setBusy] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [codeDraft, setCodeDraft] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const isAdm = (await amIAdmin()).admin;
        setAdmin(isAdm);
        if (isAdm) {
          const r = await getTournamentCodeAdmin({ data: { tournamentId } });
          setAccessCode(r.code);
          setCodeDraft(r.code ?? "");
        }
      }
    });
  }, [tournamentId]);

  // Mise à jour en direct : dès qu'un match, une équipe ou le tournoi change, le tableau se recharge tout seul.
  useEffect(() => {
    const reload = () => {
      qc.invalidateQueries({ queryKey: ["board", tournamentId] });
      qc.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    };
    const channel = supabase
      .channel(`tournament-board-${tournamentId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches", filter: `tournament_id=eq.${tournamentId}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_teams", filter: `tournament_id=eq.${tournamentId}` }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments", filter: `id=eq.${tournamentId}` }, reload)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, tournamentId]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["board", tournamentId] });
    qc.invalidateQueries({ queryKey: ["tournament", tournamentId] });
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return null;
  const teams = data.teams;
  const matches = data.matches as Match[];
  const name = (id: string | null) => (id ? (teams.find((t) => t.id === id)?.name ?? "?") : "—");
  const full = maxParticipants ? teams.length >= maxParticipants : teams.length >= 2;
  const label = isTeam ? "Équipes" : "Participants";
  const poolMatches = matches.filter((m) => m.stage === "pool");
  const bracket = matches.filter((m) => m.stage === "bracket");
  const rounds = [...new Set(bracket.map((m) => m.round))].sort((a, b) => a - b);
  const finalMatch = bracket.find((m) => m.round === rounds[rounds.length - 1]);
  const consolation = matches.filter((m) => m.stage === "consolation");
  const consolationRounds = [...new Set(consolation.map((m) => m.round))].sort((a, b) => a - b);
  const consolationFinal = consolation.find((m) => m.round === consolationRounds[consolationRounds.length - 1]);
  const smallFinal = matches.find((m) => m.stage === "small_final");
  const poolsDone = poolMatches.length > 0 && poolMatches.every((m) => m.winner);

  const poolData = Array.from({ length: poolCount }, (_, i) => {
    const ms = poolMatches.filter((m) => m.pool_index === i);
    const ids = [...new Set(ms.flatMap((m) => [m.team_a!, m.team_b!]))];
    return { i, ms, rows: poolStandings(ids, ms) };
  });
  // Aperçu du tableau final avant la fin des poules : "1er Poule A" etc., avec le leader actuel.
  const preview =
    poolCount > 0 && poolMatches.length > 0 && bracket.length === 0
      ? buildPoolBracket(poolData.map((p) => [0, 1].map((rank) => `${rank}:${p.i}`)),
          rankedPoolQualifiers(poolData.map((p) => p.rows.map((row, rank) => ({ ...row, team: `${rank}:${p.i}` })))))
      : [];
  const previewRounds = [...new Set(preview.map((m) => m.round))].sort((a, b) => a - b);
  const seedLabel = (key: string | null) => {
    if (!key) return { label: "Vainqueur précédent", team: null as string | null, current: null as string | null };
    const [rank, pool] = key.split(":").map(Number) as [number, number];
    const done = poolData[pool]?.ms.every((m) => m.winner);
    const team = poolData[pool]?.rows[rank]?.team ?? null;
    return { label: `${rank === 0 ? "1er" : `${rank + 1}e`} ${poolName(pool)}`, team: done ? team : null, current: team };
  };
  const previewName = (r: number) => {
    const left = previewRounds.length - r;
    return left === 0 ? "Finale" : left === 1 ? "Demi-finales" : left === 2 ? "Quarts de finale" : `Tour ${r}`;
  };

  const roundName = (r: number) => {
    const left = rounds.length - r;
    return left === 0 ? "Finale" : left === 1 ? "Demi-finales" : left === 2 ? "Quarts de finale" : `Tour ${r}`;
  };

  const showPools = poolCount > 0 && poolMatches.length > 0;
  const hasFinal = bracket.length > 0 || preview.length > 0;
  const consolationSeeds = poolData.map((p) => p.rows.slice(2).map((_, rank) => `${rank + 2}:${p.i}`));
  const consolationPreview = consolationEnabled && consolation.length === 0 && consolationSeeds.flat().length >= 2
    ? buildPoolBracket(consolationSeeds) : [];
  const hasConsolation = consolation.length > 0 || consolationPreview.length > 0;
  const several = [showPools, hasFinal, hasConsolation].filter(Boolean).length > 1;
  const showPoolsView = showPools && (!several || view === "pools");
  const showFinalView = hasFinal && (!several || view === "final");
  const showConsolationView = hasConsolation && (!several || view === "consolation");

  const consolationRoundName = (r: number) => {
    const left = consolationRounds.length - r;
    return left === 0 ? "Finale" : left === 1 ? "Demi-finales" : left === 2 ? "Quarts de finale" : `Tour ${r}`;
  };

  const finalSection =
    bracket.length > 0 ? (
      <div>
        <h2 className="text-2xl">Tableau final</h2>
        <p className="mt-1 text-sm text-muted-foreground">2 manches gagnantes</p>
        {finalMatch?.winner && (
          <p className="mt-2 flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" /> Vainqueur :{" "}
            <span className="text-gradient-ember font-semibold">{name(finalMatch.winner)}</span>
          </p>
        )}
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:gap-4">
          {rounds.map((r) => (
            <div key={r} className="min-w-0 flex-1 space-y-3">
              <h3 className="text-sm font-semibold text-primary">{roundName(r)}</h3>
              <div className="flex flex-col gap-3">
                {bracket
                  .filter((m) => m.round === r)
                  .map((m) => (
                    <MatchRow
                      key={m.id}
                      m={m}
                      name={name}
                      admin={admin}
                      boxed
                      onSave={(a, b, legsA, legsB) =>
                        run(() => reportMatch({ data: { matchId: m.id, scoreA: a, scoreB: b, ...(legsA !== undefined && legsB !== undefined ? { legsA, legsB } : {}) } }), "Résultat enregistré.")
                      }
                    />
                ))}
              </div>
            </div>
          ))}
        </div>
        {smallFinal && (
          <div className="mt-6 max-w-md">
            <h3 className="text-sm font-semibold text-primary">Petite finale — 3e place</h3>
            <div className="mt-2">
              <MatchRow
                m={smallFinal}
                name={name}
                admin={admin}
                boxed
                onSave={(a, b, legsA, legsB) => run(() => reportMatch({ data: { matchId: smallFinal.id, scoreA: a, scoreB: b, legsA, legsB } }), "Résultat enregistré.")}
              />
            </div>
            {smallFinal.winner && (
              <p className="mt-2 text-sm">
                3e du tournoi : <span className="font-semibold text-primary">{name(smallFinal.winner)}</span>
              </p>
            )}
          </div>
        )}
      </div>
    ) : preview.length > 0 ? (
      <div>
        <h2 className="text-2xl">Tableau final (aperçu)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Les 2 premiers de chaque poule se qualifient. Les noms se confirment quand la poule est terminée ; en attendant, le
          leader actuel est indiqué en gris.
        </p>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:gap-4">
          {previewRounds.map((r) => (
            <div key={r} className="min-w-0 flex-1 space-y-3">
              <h3 className="text-sm font-semibold text-primary">{previewName(r)}</h3>
              <div className="flex flex-col gap-3">
                {preview
                  .filter((m) => m.round === r)
                  .map((m) => (
                    <div key={m.position} className="rounded-lg border border-dashed border-border bg-card p-3 text-sm">
                      {[m.team_a, m.team_b].map((k, j) => {
                        const s = seedLabel(k);
                        return (
                          <div key={j} className={j ? "mt-1.5 border-t border-border pt-1.5" : ""}>
                            {s.team ? (
                              <span className="font-semibold">{name(s.team)}</span>
                            ) : (
                              <span className="text-muted-foreground">{s.label}</span>
                            )}
                            {!s.team && s.current && r === 1 && (
                              <span className="ml-1 text-xs text-muted-foreground/70">({name(s.current)})</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : null;

  const consolationSection =
    consolation.length > 0 ? (
      <div>
        <h2 className="text-2xl">Consolante</h2>
        <p className="mt-1 text-sm text-muted-foreground">Tableau des équipes non qualifiées pour le tableau final.</p>
        {consolationFinal?.winner && (
          <p className="mt-2 flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" /> Vainqueur de la consolante :{" "}
            <span className="text-gradient-ember font-semibold">{name(consolationFinal.winner)}</span>
          </p>
        )}
        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:gap-4">
          {consolationRounds.map((r) => (
            <div key={r} className="min-w-0 flex-1 space-y-3">
              <h3 className="text-sm font-semibold text-primary">{consolationRoundName(r)}</h3>
              <div className="flex flex-col gap-3">
                {consolation
                  .filter((m) => m.round === r)
                  .map((m) => (
                    <MatchRow
                      key={m.id}
                      m={m}
                      name={name}
                      admin={admin}
                      boxed
                      onSave={(a, b, legsA, legsB) => run(() => reportMatch({ data: { matchId: m.id, scoreA: a, scoreB: b, legsA, legsB } }), "Résultat enregistré.")}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : consolationPreview.length > 0 ? (
      <div>
        <h2 className="text-2xl">Consolante (aperçu)</h2>
        <div className="mt-4 flex flex-col gap-4 lg:flex-row">
          {[...new Set(consolationPreview.map((m) => m.round))].map((r) => (
            <div key={r} className="min-w-0 flex-1 space-y-3">
              <h3 className="text-sm font-semibold text-primary">{r === Math.max(...consolationPreview.map((m) => m.round)) ? "Finale" : `Tour ${r}`}</h3>
              {consolationPreview.filter((m) => m.round === r).map((m) => (
                <div key={m.position} className="rounded-lg border border-dashed border-border bg-card p-3 text-sm">
                  {[m.team_a, m.team_b].map((key, j) => {
                    const seed = seedLabel(key);
                    return <div key={j} className={j ? "mt-1.5 border-t border-border pt-1.5" : ""}>{seed.team ? name(seed.team) : seed.label}</div>;
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <section className="mt-10 space-y-8">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">
            {label} <span className="text-muted-foreground">({teams.length}{maxParticipants ? ` / ${maxParticipants}` : ""})</span>
          </h2>
          <button
            type="button"
            aria-expanded={showTeams}
            onClick={() => setShowTeams((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
          >
            {showTeams ? "Masquer la liste" : "Afficher la liste"}
            <ChevronDown className={`h-4 w-4 transition-transform ${showTeams ? "rotate-180" : ""}`} />
          </button>
        </div>
        {showTeams && (
          <div className="mt-3 flex flex-wrap gap-2">
            {teams.map((t) =>
              renaming?.id === t.id ? (
                <span key={t.id} className="inline-flex items-center gap-2 rounded-md border border-primary/60 bg-card px-3 py-1.5 text-sm">
                  <input
                    value={renaming.name}
                    autoFocus
                    aria-label="Nouveau nom de l'équipe"
                    onChange={(e) => setRenaming({ id: t.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void run(() => adminRenameTeam({ data: { id: t.id, name: renaming.name } }), "Nom modifié.").then(() => setRenaming(null));
                      }
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    className="w-40 bg-transparent outline-none"
                  />
                  <button
                    aria-label="Valider le nouveau nom"
                    onClick={() =>
                      void run(() => adminRenameTeam({ data: { id: t.id, name: renaming.name } }), "Nom modifié.").then(() => setRenaming(null))
                    }
                  >
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </button>
                  <button aria-label="Annuler" onClick={() => setRenaming(null)}>
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </span>
              ) : (
                <span key={t.id} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm">
                  {t.name}
                  {admin && status === "open" && (
                    <>
                      <button
                        aria-label="Renommer"
                        onClick={() => setRenaming({ id: t.id, name: t.name })}
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                      <button aria-label="Retirer" onClick={() => run(() => adminDeleteTeam({ data: { id: t.id } }), "Retiré.")}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </>
                  )}
                </span>
              )
            )}
            {teams.length === 0 && <p className="text-sm text-muted-foreground">Aucun inscrit pour le moment.</p>}
          </div>
        )}
        {admin && status === "open" && (
          <div className="mt-4 flex flex-wrap gap-2">
            {!full || !maxParticipants ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  run(() => adminAddTeam({ data: { tournamentId, name: newTeam } }), "Ajouté.").then(() => setNewTeam(""));
                }}
              >
                <input
                  value={newTeam}
                  onChange={(e) => setNewTeam(e.target.value)}
                  placeholder={isTeam ? "Nom de l'équipe" : "Nom du joueur"}
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <button type="submit" className="btn-ember px-3 py-2 text-sm">
                  <Plus className="h-4 w-4" /> Ajouter
                </button>
              </form>
            ) : null}
            <button
              disabled={!full || busy}
              onClick={() => {
                // Code déjà défini : le lancement l'utilise sans le redemander.
                const existing = accessCode?.trim();
                if (existing && existing.length >= 4) {
                  void run(async () => {
                    await startTournament({ data: { id: tournamentId, accessCode: existing } });
                    const r = await getTournamentCodeAdmin({ data: { tournamentId } });
                    setAccessCode(r.code);
                    setCodeDraft(r.code ?? "");
                  }, "Tournoi lancé !");
                  return;
                }
                const c = window.prompt("Code d'accès des participants (au moins 4 caractères, modifiable ensuite) :", accessCode ?? "");
                if (c === null) return;
                if (c.trim().length < 4) {
                  toast.error("Le code d'accès doit contenir au moins 4 caractères.");
                  return;
                }
                void run(async () => {
                  await startTournament({ data: { id: tournamentId, accessCode: c } });
                  const r = await getTournamentCodeAdmin({ data: { tournamentId } });
                  setAccessCode(r.code);
                  setCodeDraft(r.code ?? "");
                }, "Tournoi lancé !");
              }}
              className="btn-ember px-4 py-2 text-sm"
              title={full ? "" : "Le tournoi doit être complet"}
            >
              <Play className="h-4 w-4" /> Commencer le tournoi
            </button>
          </div>
        )}
      </div>

      {admin && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4 text-primary" /> Code d'accès du tournoi
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {accessCode
              ? `Code actuel : ${accessCode}. Communiquez-le aux participants pour qu'ils saisissent leurs scores.`
              : "Le code d'accès sera demandé au lancement du tournoi. Vous pouvez aussi le définir dès maintenant."}
          </p>
          <form
            className="mt-3 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const r = await adminSetTournamentCode({ data: { tournamentId, code: codeDraft } });
                setAccessCode(r.code);
                setCodeDraft(r.code);
              }, "Code d'accès enregistré.");
            }}
          >
            <input
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
              maxLength={20}
              placeholder="Ex. FOXES26"
              aria-label="Code d'accès du tournoi"
              className="rounded-md border border-input bg-background px-3 py-2 font-mono text-sm tracking-widest"
            />
            <button type="submit" disabled={busy || codeDraft.trim().length < 4} className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted">
              <Check className="mr-1 inline h-4 w-4" /> {accessCode ? "Modifier le code" : "Enregistrer le code"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const res = await adminSendTournamentLink({ data: { tournamentId } });
                  if (res.failed > 0) toast.info(`${res.sent} envoyé(s), ${res.failed} en échec.`);
                }, "Lien du tournoi envoyé aux participants.")
              }
              className="btn-ember px-3 py-2 text-sm"
            >
              <Mail className="h-4 w-4" /> Envoyer le lien aux participants
            </button>
          </form>
          {accessCode && typeof window !== "undefined" && (
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="rounded-lg bg-foreground p-3">
                <QRCodeSVG
                  value={`${window.location.origin}/tournois/${tournamentId}/jouer?code=${encodeURIComponent(accessCode)}`}
                  size={160}
                  aria-label="QR code d'accès au tournoi"
                />
              </div>
              <p className="max-w-xs text-xs text-muted-foreground">
                QR code d'accès (visible uniquement par les admins). Le scanner ouvre le tournoi sans saisir le code ;
                il devra être scanné à nouveau seulement si vous modifiez le code.
              </p>
            </div>
          )}
        </div>
      )}

      {several && (
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ...(showPools ? [["pools", "Poules"] as const] : []),
              ...(hasFinal ? [["final", "Tableau final"] as const] : []),
              ...(hasConsolation ? [["consolation", "Consolante"] as const] : []),
            ]
          ).map(([v, lbl]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-full border px-3 py-1 text-sm transition ${view === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}

      {showPoolsView && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl">Poules</h2>
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...poolData.map((p) => p.i)] as const).map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setPoolView(v)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${poolView === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  {v === "all" ? "Toutes" : poolName(v)}
                </button>
              ))}
            </div>
          </div>
          <div className={`mt-4 grid gap-4 ${poolView === "all" ? "md:grid-cols-2" : ""}`}>
            {poolData.filter((p) => poolView === "all" || p.i === poolView).map(({ i, ms, rows }) => {
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <h3 className="text-lg text-primary">{poolName(i)}</h3>
                  <table className="mt-2 w-full text-sm">
                    <thead className="text-xs text-muted-foreground">
                      <tr>
                        <th className="text-left">#</th>
                        <th className="text-left">{isTeam ? "Équipe" : "Joueur"}</th>
                        <th>J</th>
                        <th>V</th>
                        <th>D</th>
                        <th title="Points restants cumulés sur les matchs perdus — le moins possible">Pts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, k) => (
                        <tr key={r.team} className={k < 2 ? "font-semibold" : "text-muted-foreground"}>
                          <td>{k + 1}</td>
                          <td>{name(r.team)}</td>
                          <td className="text-center">{r.played}</td>
                          <td className="text-center">{r.wins}</td>
                          <td className="text-center">{r.losses}</td>
                          <td className="text-center">{r.diff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 space-y-1.5">
                    {ms.map((m) => (
                      <MatchRow key={m.id} m={m} name={name} admin={admin} onSave={(a, b) => run(() => reportMatch({ data: { matchId: m.id, scoreA: a, scoreB: b } }), "Résultat enregistré.")} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showFinalView && finalSection}

      {showConsolationView && consolationSection}
    </section>
  );
}

function MatchRow({
  m,
  name,
  admin,
  boxed,
  onSave,
}: {
  m: Match;
  name: (id: string | null) => string;
  admin: boolean;
  boxed?: boolean;
  onSave: (a: number, b: number, legsA?: number, legsB?: number) => void;
}) {
  const editable = admin && !!m.team_a && !!m.team_b;
  const [picked, setPicked] = useState<string | null>(m.winner);
  const loserScore = picked === m.team_a ? m.score_b : m.score_a;
  const [remaining, setRemaining] = useState(loserScore && loserScore > 0 ? loserScore.toString() : "");
  const final = m.stage !== "pool";
  const bye = !!m.winner && (!m.team_a || !m.team_b);
  const [loserLegs, setLoserLegs] = useState((m.winner === m.team_a ? m.legs_b : m.legs_a) === 1 ? 1 : 0);

  const side = (id: string | null, score: number | null) => {
    const isWinner = !!id && (m.winner ? m.winner === id : picked === id);
    const content = (
      <>
        {editable && (
          <span
            aria-hidden
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
              picked === id ? "border-primary bg-primary" : "border-muted-foreground group-hover:border-primary/70"
            }`}
          >
            {picked === id && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
          </span>
        )}
        <span className="truncate">{name(id)}</span>
      </>
    );
    return (
      <div className={`flex items-center justify-between gap-2 rounded-md px-1.5 py-1 ${isWinner ? "text-primary" : ""}`}>
        {editable ? (
          <button
            type="button"
            onClick={() => setPicked(id)}
            title="Cliquer pour désigner le gagnant"
            className={`group flex min-w-0 items-center gap-2 text-left transition-colors ${
              picked === id ? "font-semibold" : "hover:text-primary"
            }`}
          >
            {content}
          </button>
        ) : (
          <span className="flex min-w-0 items-center gap-2">{content}</span>
        )}
        <span className={`shrink-0 text-sm tabular-nums ${isWinner ? "font-semibold" : "text-muted-foreground"}`}>
          {bye ? "" : final ? (m.winner ? ((id === m.team_a ? m.legs_a : m.legs_b) ?? "—") : picked ? (picked === id ? 2 : loserLegs) : "") : m.winner ? (m.winner === id ? "0" : (score ?? "")) : editable && picked === id ? "0" : ""}
        </span>
      </div>
    );
  };

  const save = () => {
    if (!picked) {
      toast.error("Cliquez sur le nom du gagnant.");
      return;
    }
    const rest = parseInt(remaining, 10);
    if (isNaN(rest) || rest < 1) {
      toast.error("Indiquez les points restants du perdant (au moins 1).");
      return;
    }
    onSave(picked === m.team_a ? 0 : rest, picked === m.team_b ? 0 : rest,
      final ? (picked === m.team_a ? 2 : loserLegs) : undefined,
      final ? (picked === m.team_b ? 2 : loserLegs) : undefined);
  };

  return (
    <div className={`text-sm ${boxed ? "rounded-lg border border-border bg-card p-3" : "border-t border-border pt-1.5"}`}>
      {side(m.team_a, m.score_a)}
      {side(m.team_b, m.score_b)}
      {bye && <p className="mt-1 text-xs text-muted-foreground">Exempt — qualifié au tour suivant</p>}
      {final && m.winner && !bye && <p className="mt-1 text-xs text-muted-foreground">Reste au perdant : {m.winner === m.team_a ? m.score_b : m.score_a}</p>}
      {editable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border-t border-border/60 px-1.5 pt-2 pb-0.5"
        >
          {final && <div className="flex items-center gap-2 text-xs">
            <span>Manches du perdant</span>
            {[0, 1].map(n => <Button key={n} type="button" size="sm" variant={loserLegs === n ? "default" : "outline"} aria-pressed={loserLegs === n} onClick={() => setLoserLegs(n)}>{n}</Button>)}
          </div>}
          <label className="flex items-center gap-2 text-xs text-foreground/70">
            <span className="leading-none">Reste au perdant</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={remaining}
              onChange={(e) => setRemaining(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="—"
              className={`w-16 rounded-md border bg-background px-2 py-1.5 text-center text-sm tabular-nums outline-none transition-colors placeholder:text-muted-foreground focus:border-primary ${
                picked && !remaining ? "border-primary/60" : "border-input"
              }`}
              aria-label="Points restants du perdant"
            />
          </label>
          <Button type="submit" disabled={!picked || !remaining} className="btn-ember px-3 py-1.5 text-xs">
            {m.winner ? <PencilLine className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {m.winner ? "Corriger" : "Valider"}
          </Button>
        </form>
      )}
    </div>
  );
}
