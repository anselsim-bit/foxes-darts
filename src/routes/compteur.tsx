import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Undo2, Trophy, RotateCcw, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { suggestNextDarts } from "@/lib/checkout";
import {
  findMemberForGame,
  saveGameResult,
  confirmMemberIdentity,
  listTournamentsForGame,
} from "@/lib/darts.functions";
import { listPlayableMatches, reportMatch, setTeamNameWithCode, validateTournamentCode } from "@/lib/tournament.functions";

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
type PlayableMatch = {
  id: string;
  label: string;
  teamA: string;
  teamB: string;
  teamAId: string;
  teamBId: string;
  canNameA: boolean;
  canNameB: boolean;
};

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
  const [gameKey, setGameKey] = useState(0);
  const [starter, setStarter] = useState<number | null>(null);
  const [matches, setMatches] = useState<PlayableMatch[]>([]);
  const [match, setMatch] = useState<PlayableMatch | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  useEffect(() => {
    setMatches([]);
    setMatch(null);
    setCodeInput("");
    setAccessCode(null);
    setCodeMsg(null);
    if (!tournamentId) return;
    listPlayableMatches({ data: { tournamentId } }).then(setMatches).catch(() => setMatches([]));
  }, [tournamentId, playing]);

  const checkCode = async () => {
    if (!tournamentId || !codeInput.trim()) return;
    setCheckingCode(true);
    setCodeMsg(null);
    try {
      const res = await validateTournamentCode({ data: { tournamentId, code: codeInput } });
      if (!res.valid) {
        setAccessCode(null);
        setCodeMsg("Ce code n'existe pas pour ce tournoi.");
      } else if (!res.active) {
        setAccessCode(null);
        setCodeMsg("Les codes ne sont pas encore activés par l'organisateur.");
      } else {
        setAccessCode(codeInput.trim().toUpperCase());
        setCodeMsg(null);
        toast.success(res.participantName ? `Code validé, bon match ${res.participantName} !` : "Code validé !");
      }
    } catch {
      setCodeMsg("Vérification impossible pour le moment.");
    } finally {
      setCheckingCode(false);
    }
  };

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
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", id)
          .single();
        const name = profile?.display_name ?? "Moi";
        setPlayers((prev) => (prev.some((p) => p.userId === id) ? prev : [{ name, userId: id }, ...prev]));
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
    const q = memberQuery.trim();
    if (!q) return;
    if (q.toLowerCase() === "moi") {
      if (!userId) return;
      if (players.some((p) => p.userId === userId)) {
        toast.error("Vous êtes déjà dans la partie");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .single();
      setPlayers([...players, { name: profile?.display_name ?? "Moi", userId }]);
      resetMember();
      return;
    }
    setConfirming(true);
    try {
      const m = await findMemberForGame({ data: { query: q } });
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
        key={gameKey}
        players={players}
        start={start}
        doubleOut={doubleOut}
        canSave={!!userId}
        tournamentId={tournamentId || null}
        match={match}
        accessCode={accessCode}
        onExit={() => setPlaying(false)}
        onRestart={() => {
          setPlayers((prev) => [...prev].reverse());
          setGameKey((k) => k + 1);
        }}
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
                <button onClick={() => { setPlayers(players.filter((_, j) => j !== i)); setStarter(null); }} aria-label="Retirer">
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
              <Link to="/auth" search={{ redirect: "/compteur" }} className="text-primary underline">Connectez-vous</Link> pour ajouter des membres,
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
            {matches.length > 0 && (
              <select
                value={match?.id ?? ""}
                onChange={(e) => {
                  const m = matches.find((x) => x.id === e.target.value) ?? null;
                  setMatch(m);
                  if (m) {
                    setPlayers([{ name: m.teamA, userId: null }, { name: m.teamB, userId: null }]);
                    setStarter(null);
                  }
                }}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                aria-label="Match du tournoi"
              >
                <option value="">Mode tournoi : choisir un match (facultatif)</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            )}
            {match && (
              <div className="mt-2">
                {accessCode ? (
                  <>
                    <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">
                      Code d'accès validé ✓ — vous pourrez envoyer le résultat au tableau.
                    </p>
                    {(match.canNameA || match.canNameB) && (
                      <div className="mt-3 space-y-2 rounded-md border border-border p-3">
                        <p className="text-sm font-medium">Choisissez le nom de votre équipe</p>
                        <p className="text-xs text-muted-foreground">
                          Ce nom sera définitif pour toute la suite du tournoi.
                        </p>
                        {(["A", "B"] as const).map((side) =>
                          (side === "A" ? match.canNameA : match.canNameB) ? (
                            <TeamNamer
                              key={side}
                              teamId={side === "A" ? match.teamAId : match.teamBId}
                              current={side === "A" ? match.teamA : match.teamB}
                              code={accessCode}
                              onDone={(name) => {
                                const old = side === "A" ? match.teamA : match.teamB;
                                const nm = side === "A"
                                  ? { ...match, teamA: name, canNameA: false }
                                  : { ...match, teamB: name, canNameB: false };
                                setMatch(nm);
                                setMatches((ms) => ms.map((x) => (x.id === nm.id ? { ...x, ...nm } : x)));
                                setPlayers((ps) => ps.map((p) => (p.name === old && !p.userId ? { ...p, name } : p)));
                              }}
                            />
                          ) : null,
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      placeholder="Code d'accès reçu par email"
                      maxLength={6}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase tracking-widest"
                      aria-label="Code d'accès du tournoi"
                    />
                    <button
                      onClick={checkCode}
                      disabled={checkingCode || codeInput.trim().length < 6}
                      className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                    >
                      {checkingCode ? "..." : "Valider"}
                    </button>
                  </div>
                )}
                {codeMsg && <p className="mt-1 text-sm text-destructive">{codeMsg}</p>}
              </div>
            )}
          </div>
        )}

        {players.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium">Qui commence ?</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setStarter(null)}
                className={
                  starter === null
                    ? "rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                    : "rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
                }
              >
                Aléatoire
              </button>
              {players.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setStarter(i)}
                  className={
                    starter === i
                      ? "rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                      : "rounded-md border border-border px-3 py-2 text-sm text-muted-foreground"
                  }
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          disabled={players.length === 0}
          onClick={() => {
            if (players.length === 0) return;
            const idx = starter === null ? Math.floor(Math.random() * players.length) : starter;
            setPlayers([...players.slice(idx), ...players.slice(0, idx)]);
            setPlaying(true);
          }}
          className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          Commencer la partie
        </button>
      </section>
    </div>
  );
}
