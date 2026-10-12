import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Trash2, Trophy, Plus, Check, PencilLine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { buildBracket, poolStandings, qualifiersFromPools } from "@/lib/bracket";
import {
  getTournamentBoard,
  startTournament,
  generateFinals,
  reportMatch,
  amIAdmin,
  adminAddTeam,
  adminDeleteTeam,
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
};

const poolName = (i: number) => `Poule ${String.fromCharCode(65 + i)}`;

export function TournamentBoard({
  tournamentId,
  status,
  poolCount,
  maxParticipants,
  isTeam,
}: {
  tournamentId: string;
  status: string;
  poolCount: number;
  maxParticipants: number | null;
  isTeam: boolean;
}) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["board", tournamentId],
    queryFn: () => getTournamentBoard({ data: { id: tournamentId } }),
  });
  const [admin, setAdmin] = useState(false);
  const [newTeam, setNewTeam] = useState("");
  const [poolView, setPoolView] = useState<"all" | number>("all");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) setAdmin((await amIAdmin()).admin);
    });
  }, []);

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
  const poolsDone = poolMatches.length > 0 && poolMatches.every((m) => m.winner);

  const poolData = Array.from({ length: poolCount }, (_, i) => {
    const ms = poolMatches.filter((m) => m.pool_index === i);
    const ids = [...new Set(ms.flatMap((m) => [m.team_a!, m.team_b!]))];
    return { i, ms, rows: poolStandings(ids, ms) };
  });
  // Aperçu du tableau final avant la fin des poules : "1er Poule A" etc., avec le leader actuel.
  const preview =
    poolCount > 0 && poolMatches.length > 0 && bracket.length === 0
      ? buildBracket(
          qualifiersFromPools(
            poolData.map((p) => [0, 1].map((rank) => ({ team: `${rank}:${p.i}`, played: 0, wins: 0, losses: 0, diff: 0 }))),
            2,
          ),
        )
      : [];
  const previewRounds = [...new Set(preview.map((m) => m.round))].sort((a, b) => a - b);
  const seedLabel = (key: string | null) => {
    if (!key) return { label: "Vainqueur précédent", team: null as string | null, current: null as string | null };
    const [rank, pool] = key.split(":").map(Number) as [number, number];
    const done = poolData[pool]!.ms.every((m) => m.winner);
    const team = poolData[pool]!.rows[rank]?.team ?? null;
    return { label: `${rank === 0 ? "1er" : "2e"} ${poolName(pool)}`, team: done ? team : null, current: team };
  };
  const previewName = (r: number) => {
    const left = previewRounds.length - r;
    return left === 0 ? "Finale" : left === 1 ? "Demi-finales" : left === 2 ? "Quarts de finale" : `Tour ${r}`;
  };

  const roundName = (r: number) => {
    const left = rounds.length - r;
    return left === 0 ? "Finale" : left === 1 ? "Demi-finales" : left === 2 ? "Quarts de finale" : `Tour ${r}`;
  };

  return (
    <section className="mt-10 space-y-8">
      <div>
        <h2 className="text-2xl">
          {label} <span className="text-muted-foreground">({teams.length}{maxParticipants ? ` / ${maxParticipants}` : ""})</span>
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {teams.map((t) => (
            <span key={t.id} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm">
              {t.name}
              {admin && status === "open" && (
                <button aria-label="Retirer" onClick={() => run(() => adminDeleteTeam({ data: { id: t.id } }), "Retiré.")}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              )}
            </span>
          ))}
          {teams.length === 0 && <p className="text-sm text-muted-foreground">Aucun inscrit pour le moment.</p>}
        </div>
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
              onClick={() => run(() => startTournament({ data: { id: tournamentId } }), "Tournoi lancé !")}
              className="btn-ember px-4 py-2 text-sm"
              title={full ? "" : "Le tournoi doit être complet"}
            >
              <Play className="h-4 w-4" /> Commencer le tournoi
            </button>
          </div>
        )}
      </div>

      {poolCount > 0 && poolMatches.length > 0 && (
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
                        <th>+/-</th>
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
          {admin && poolsDone && bracket.length === 0 && (
            <button
              disabled={busy}
              onClick={() => run(() => generateFinals({ data: { id: tournamentId } }), "Phase finale générée.")}
              className="btn-ember mt-4 px-4 py-2 text-sm"
            >
              Générer la phase finale (2 premiers de chaque poule)
            </button>
          )}
        </div>
      )}

      {preview.length > 0 && (
        <div>
          <h2 className="text-2xl">Tableau final (aperçu)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Les 2 premiers de chaque poule se qualifient. Les noms se confirment quand la poule est terminée ; en attendant, le leader actuel est indiqué en gris.
          </p>
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {previewRounds.map((r) => (
              <div key={r} className="min-w-56 flex-1 space-y-3">
                <h3 className="text-sm font-semibold text-primary">{previewName(r)}</h3>
                <div className="flex h-full flex-col justify-around gap-3">
                  {preview.filter((m) => m.round === r).map((m) => (
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
      )}

      {bracket.length > 0 && (
        <div>
          <h2 className="text-2xl">Tableau final</h2>
          {finalMatch?.winner && (
            <p className="mt-2 flex items-center gap-2 text-lg">
              <Trophy className="h-5 w-5 text-primary" /> Vainqueur :{" "}
              <span className="text-gradient-ember font-semibold">{name(finalMatch.winner)}</span>
            </p>
          )}
          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {rounds.map((r) => (
              <div key={r} className="min-w-56 flex-1 space-y-3">
                <h3 className="text-sm font-semibold text-primary">{roundName(r)}</h3>
                <div className="flex h-full flex-col justify-around gap-3">
                  {bracket
                    .filter((m) => m.round === r)
                    .map((m) => (
                      <MatchRow key={m.id} m={m} name={name} admin={admin} boxed onSave={(a, b) => run(() => reportMatch({ data: { matchId: m.id, scoreA: a, scoreB: b } }), "Résultat enregistré.")} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
  onSave: (a: number, b: number) => void;
}) {
  const editable = admin && !!m.team_a && !!m.team_b;
  const [picked, setPicked] = useState<string | null>(m.winner);
  const loserScore = picked === m.team_a ? m.score_b : m.score_a;
  const [remaining, setRemaining] = useState(loserScore && loserScore > 0 ? loserScore.toString() : "");

  const side = (id: string | null, score: number | null) => {
    const isWinner = m.winner ? m.winner === id : picked === id;
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
          {m.winner ? (m.winner === id ? "0" : (score ?? "")) : editable && picked === id ? "0" : ""}
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
    onSave(picked === m.team_a ? 0 : rest, picked === m.team_b ? 0 : rest);
  };

  return (
    <div className={`text-sm ${boxed ? "rounded-lg border border-border bg-card p-3" : "border-t border-border pt-1.5"}`}>
      {side(m.team_a, m.score_a)}
      {side(m.team_b, m.score_b)}
      {editable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border-t border-border/60 px-1.5 pt-2 pb-0.5"
        >
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
          <button type="submit" disabled={!picked || !remaining} className="btn-ember px-3 py-1.5 text-xs">
            {m.winner ? <PencilLine className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
            {m.winner ? "Corriger" : "Valider"}
          </button>
        </form>
      )}
    </div>
  );
}
