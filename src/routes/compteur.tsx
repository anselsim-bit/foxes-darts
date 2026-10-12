import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Undo2, Trophy, RotateCcw, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { suggestNextDarts } from "@/lib/checkout";
import {
  listMembersForGame,
  saveGameResult,
  confirmMemberIdentity,
  listTournamentsForGame,
} from "@/lib/darts.functions";

export const Route = createFileRoute("/compteur")({
  head: () => ({
    meta: [
      { title: "Compteur de fléchettes — Foxes Darts" },
      {
        name: "description",
        content: "Compteur de points 301 / 501 / 701 avec simples, doubles et triples, pour invités et membres Foxes Darts.",
      },
      { property: "og:title", content: "Compteur de fléchettes — Foxes Darts" },
      { property: "og:description", content: "Comptez vos parties et enregistrez vos statistiques de membre." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CompteurPage,
});

type Player = { name: string; userId: string | null; token?: string | undefined };
type Dart = { label: string; value: number; isDouble: boolean };
type Turn = { player: number; darts: Dart[]; bust: boolean; total: number };

const btn =
  "rounded-md border border-border bg-card px-3 py-3 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-40";

function CompteurPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [guestName, setGuestName] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [found, setFound] = useState<{ id: string; name: string } | null>(null);
  const [start, setStart] = useState(501);
  const [doubleOut, setDoubleOut] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [tournaments, setTournaments] = useState<{ id: string; title: string; event_date: string }[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
        try {
          setTournaments(await listTournamentsForGame());
        } catch {
          /* liste indisponible */
        }
      }
    });
  }, []);

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    setPlayers([...players, { name, userId: null }]);
    setGuestName("");
  };
  const resetMember = () => {
    setMemberQuery("");
    setFound(null);
    setPassword("");
  };
  const lookupMember = async () => {
    if (!memberQuery.trim()) return;
    setConfirming(true);
    try {
      const m = await findMemberForGame({ data: { query: memberQuery } });
      if (players.some((p) => p.userId === m.id)) {
        toast.error(`${m.name} est déjà dans la partie`);
        return;
      }
      if (m.id === userId) {
        setPlayers([...players, { name: m.name, userId: m.id }]);
        resetMember();
        return;
      }
      setFound(m);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ce joueur n'existe pas");
    } finally {
      setConfirming(false);
    }
  };
  const addMember = async () => {
    const m = found;
    if (!m || !password) return;
    setConfirming(true);
    try {
      const { token } = await confirmMemberIdentity({ data: { memberId: m.id, password } });
      setPlayers([...players, { name: m.name, userId: m.id, token }]);
      resetMember();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mot de passe incorrect");
    } finally {
      setConfirming(false);
    }
  };

  if (playing) {
    return (
      <Game
        players={players}
        start={start}
        doubleOut={doubleOut}
        canSave={!!userId}
        tournamentId={tournamentId || null}
        onExit={() => setPlaying(false)}
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl">
        Compteur <span className="text-gradient-ember">de fléchettes</span>
      </h1>
      <p className="mt-2 text-muted-foreground">
        Choisissez la partie, ajoutez les joueurs, et c'est parti.
      </p>

      <section className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6">
        <div>
          <p className="mb-2 text-sm font-medium">Type de partie</p>
          <div className="flex gap-2">
            {[301, 501, 701].map((v) => (
              <button
                key={v}
                onClick={() => setStart(v)}
                className={
                  start === v
                    ? "rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                    : "rounded-md border border-border px-4 py-2 text-sm text-muted-foreground"
                }
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={doubleOut}
            onChange={(e) => setDoubleOut(e.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          Finir sur un double
        </label>

        <div>
          <p className="mb-2 text-sm font-medium">Joueurs</p>
          <ul className="space-y-2">
            {players.map((p, i) => (
              <li key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>
                  {p.name}{" "}
                  <span className="text-xs text-muted-foreground">{p.userId ? "· membre" : "· invité"}</span>
                </span>
                <button onClick={() => setPlayers(players.filter((_, j) => j !== i))} aria-label="Retirer">
                  <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addGuest()}
              placeholder="Nom de l'invité"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button onClick={addGuest} className="inline-flex items-center gap-1 rounded-md border border-border px-3 text-sm">
              <Plus className="h-4 w-4" /> Invité
            </button>
          </div>
          {userId ? (
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <input
                  value={memberQuery}
                  onChange={(e) => {
                    setMemberQuery(e.target.value);
                    setFound(null);
                    setPassword("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (found ? addMember() : lookupMember())}
                  placeholder="Nom de joueur ou email du membre"
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {!found && (
                  <button
                    onClick={lookupMember}
                    disabled={confirming || !memberQuery.trim()}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 text-sm disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" /> {confirming ? "..." : "Membre"}
                  </button>
                )}
              </div>
              {found && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/40 p-2">
                  <span className="text-sm">
                    <strong>{found.name}</strong> trouvé — entrez son mot de passe :
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addMember()}
                    placeholder="Mot de passe du membre"
                    autoComplete="off"
                    autoFocus
                    className="w-48 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={addMember}
                    disabled={confirming || !password}
                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {confirming ? "..." : "Confirmer"}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              <Link to="/auth" className="text-primary underline">Connectez-vous</Link> pour ajouter des membres,
              associer la partie à un tournoi et enregistrer les statistiques.
            </p>
          )}
        </div>

        {userId && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Chaque membre choisi (autre que vous) confirme son identité avec son mot de passe. Vous pouvez aussi jouer seul.
          </p>
        )}
        {userId && tournaments.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Associer à un tournoi (facultatif)</p>
            <select
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Partie libre</option>
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} — {t.event_date}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          disabled={players.length === 0}
          onClick={() => setPlaying(true)}
          className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Commencer la partie
        </button>
      </section>
    </div>
  );
}

function Game({
  players,
  start,
  doubleOut,
  canSave,
  tournamentId,
  onExit,
}: {
  players: Player[];
  start: number;
  doubleOut: boolean;
  canSave: boolean;
  tournamentId: string | null;
  onExit: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [current, setCurrent] = useState<Dart[]>([]);
  const [mult, setMult] = useState<1 | 2 | 3>(1);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const scores = useMemo(() => {
    const s = players.map(() => start);
    for (const t of turns) if (!t.bust) s[t.player]! -= t.total;
    return s;
  }, [turns, players, start]);

  const winner = useMemo(() => {
    const last = turns[turns.length - 1];
    return last && !last.bust && scores[last.player] === 0 ? last.player : null;
  }, [turns, scores]);

  const playerIdx = turns.length % players.length;
  const remaining = scores[playerIdx]! - current.reduce((a, d) => a + d.value, 0);

  const bestVisit = (i: number) =>
    turns.filter((t) => t.player === i && !t.bust).reduce((m, t) => Math.max(m, t.total), 0);

  const endTurn = (darts: Dart[], bust: boolean) => {
    const total = darts.reduce((a, d) => a + d.value, 0);
    setTurns([...turns, { player: playerIdx, darts, bust, total }]);
    setCurrent([]);
    setMult(1);
  };

  const throwDart = (base: number) => {
    if (winner !== null) return;
    const m = base === 25 && mult === 3 ? 2 : base === 0 ? 1 : mult;
    const value = base * m;
    const label = base === 0 ? "Raté" : base === 25 ? (m === 2 ? "Bull" : "25") : `${["", "S", "D", "T"][m]}${base}`;
    const dart: Dart = { label, value, isDouble: m === 2 && base !== 0 };
    const darts = [...current, dart];
    const left = scores[playerIdx]! - darts.reduce((a, d) => a + d.value, 0);
    const bust = left < 0 || (doubleOut && left === 1) || (left === 0 && doubleOut && !dart.isDouble);
    if (bust) return endTurn(darts, true);
    if (left === 0 || darts.length === 3) return endTurn(darts, false);
    setCurrent(darts);
    setMult(1);
  };

  const undo = () => {
    if (current.length > 0) return setCurrent(current.slice(0, -1));
    const last = turns[turns.length - 1];
    if (!last) return;
    setTurns(turns.slice(0, -1));
    setCurrent(last.darts.slice(0, -1));
    setSaved(false);
  };

  const save = async () => {
    if (winner === null) return;
    setSaving(true);
    try {
      await saveGameResult({
        data: {
          tournamentId,
          startScore: start,
          doubleOut,
          players: players.map((p, i) => ({
            name: p.name,
            userId: p.userId,
            token: p.token ?? null,
            won: i === winner,
            bestVisit: bestVisit(i),
          })),
        },
      });
      setSaved(true);
      toast.success("Statistiques enregistrées !");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">
          Partie <span className="text-gradient-ember">{start}</span>
          {doubleOut && <span className="ml-2 text-sm text-muted-foreground">· sortie double</span>}
        </h1>
        <button onClick={onExit} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <RotateCcw className="h-4 w-4" /> Nouvelle partie
        </button>
      </div>

      <div className="mt-6 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(players.length, 4)}, minmax(0, 1fr))` }}>
        {players.map((p, i) => {
          const active = winner === null && i === playerIdx;
          const darts = turns.filter((t) => t.player === i).length;
          const scored = start - scores[i]!;
          return (
            <div
              key={i}
              className={`rounded-xl border p-4 text-center ${active ? "border-primary bg-primary/10" : "border-border bg-card"}`}
            >
              <p className="truncate text-sm font-medium">
                {winner === i && <Trophy className="mr-1 inline h-4 w-4 text-primary" />}
                {p.name}
              </p>
              <p className="font-display text-4xl text-primary">{active ? remaining : scores[i]}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Moy. {darts ? (scored / darts).toFixed(1) : "0"} · Meilleure volée {bestVisit(i)}
              </p>
            </div>
          );
        })}
      </div>

      {winner !== null ? (
        <div className="mt-8 rounded-xl border border-primary bg-card p-6 text-center">
          <p className="font-display text-3xl">
            <span className="text-gradient-ember">{players[winner]!.name}</span>{" "}
            {players.length === 1 ? "a terminé !" : "gagne !"}
          </p>
          {players.some((p) => p.userId) &&
            (canSave ? (
              <button
                onClick={save}
                disabled={saved || saving}
                className="mt-4 rounded-md bg-primary px-5 py-2 font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saved ? "Statistiques enregistrées ✓" : saving ? "..." : "Enregistrer les statistiques des membres"}
              </button>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                Pour enregistrer les statistiques, un membre doit être connecté sur cet appareil.
              </p>
            ))}
          <div className="mt-4 flex justify-center gap-2">
            <button onClick={undo} className={btn}>
              <Undo2 className="mr-1 inline h-4 w-4" /> Annuler la dernière fléchette
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3 text-sm">
            <span>
              Au tour de <strong>{players[playerIdx]!.name}</strong> — fléchette {current.length + 1}/3
            </span>
            <div className="flex gap-2">
              {[0, 1, 2].map((i) => {
                const d = current[i];
                return (
                  <div
                    key={i}
                    className={`flex h-14 w-16 flex-col items-center justify-center rounded-md border ${
                      d ? "border-primary bg-primary/10" : "border-border bg-card"
                    }`}
                  >
                    {d ? (
                      <>
                        <span className="font-display text-lg leading-none">{d.label}</span>
                        <span className="mt-1 text-[10px] text-muted-foreground">{d.value} pts</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {(() => {
            const tip = suggestNextDarts(remaining, 3 - current.length, doubleOut);
            if (!tip.note) return null;
            return (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="font-semibold">Conseil :</span>
                {tip.darts.map((d, i) => (
                  <span key={i} className="rounded bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {d}
                  </span>
                ))}
                <span className="text-muted-foreground">{tip.note}</span>
              </div>
            );
          })()}
          <div className="mb-3 grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMult(m)}
                className={
                  mult === m
                    ? "rounded-md bg-primary py-3 font-semibold text-primary-foreground"
                    : "rounded-md border border-border bg-card py-3 font-semibold text-muted-foreground"
                }
              >
                {["", "Simple", "Double", "Triple"][m]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => throwDart(n)} className={btn}>
                {n}
              </button>
            ))}
            <button onClick={() => throwDart(25)} className={btn}>
              {mult === 1 ? "25" : "Bull"}
            </button>
            <button onClick={() => throwDart(0)} className={btn}>
              Raté
            </button>
            <button onClick={undo} className={btn} aria-label="Annuler">
              <Undo2 className="mx-auto h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
