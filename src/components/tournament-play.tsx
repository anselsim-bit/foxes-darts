import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { Game, type PlayableMatch, type Player } from "@/components/dart-game";
import { getMyTournamentCode, listPlayableMatches, validateTournamentCode } from "@/lib/tournament.functions";

const choice = (on: boolean) =>
  on
    ? "rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
    : "rounded-md border border-border px-3 py-2 text-sm text-muted-foreground";

export function TournamentPlayButton({ tournamentId }: { tournamentId: string }) {
  return (
    <div className="mt-8">
      <Link
        to="/tournois/$id/jouer"
        params={{ id: tournamentId }}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Target className="h-4 w-4" /> Participer au tournoi
      </Link>
    </div>
  );
}

export function TournamentPlay({ tournamentId, signedIn }: { tournamentId: string; signedIn: boolean }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<PlayableMatch[]>([]);
  const [match, setMatch] = useState<PlayableMatch | null>(null);
  const [start, setStart] = useState(501);
  const [doubleOut, setDoubleOut] = useState(true);
  const [starter, setStarter] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const loadMatches = () =>
    listPlayableMatches({ data: { tournamentId } }).then(setMatches).catch(() => setMatches([]));

  useEffect(() => {
    if (!signedIn) return;
    getMyTournamentCode({ data: { tournamentId } })
      .then((r) => r.code && setCode(r.code))
      .catch(() => {});
  }, [signedIn, tournamentId]);

  useEffect(() => {
    if (code) loadMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const checkCode = async () => {
    setBusy(true);
    setCodeMsg(null);
    try {
      const res = await validateTournamentCode({ data: { tournamentId, code: codeInput } });
      if (!res.valid) setCodeMsg("Ce code n'existe pas pour ce tournoi.");
      else if (!res.active) setCodeMsg("Les codes ne sont pas encore activés par l'organisateur.");
      else {
        setCode(codeInput.trim().toUpperCase());
        toast.success(res.participantName ? `Code validé, bon tournoi ${res.participantName} !` : "Code validé !");
      }
    } catch {
      setCodeMsg("Vérification impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  const exitGame = () => {
    setPlayers(null);
    setMatch(null);
    loadMatches();
    queryClient.invalidateQueries({ queryKey: ["board", tournamentId] });
  };

  if (players && match && code) {
    return (
      <div className="mt-8 rounded-xl border border-primary/40">
        <Game
          key={gameKey}
          players={players}
          start={start}
          doubleOut={doubleOut}
          canSave
          tournamentId={tournamentId}
          match={match}
          accessCode={code}
          onExit={exitGame}
          onRestart={() => {
            setPlayers((p) => (p ? [...p].reverse() : p));
            setGameKey((k) => k + 1);
          }}
        />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="mt-8 rounded-xl border border-border bg-card p-5 text-sm">
        Connectez-vous pour participer au tournoi.{" "}
        <Link to="/auth" search={{ redirect: `/tournois/${tournamentId}/jouer` }} className="font-semibold text-primary">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl">Participer au tournoi</h2>
      {!code ? (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Saisissez le code d'accès communiqué par l'organisateur.</p>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Code d'accès"
              maxLength={6}
              aria-label="Code d'accès du tournoi"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase tracking-widest"
            />
            <button
              onClick={checkCode}
              disabled={busy || codeInput.trim().length < 1}
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "..." : "Valider"}
            </button>
          </div>
          {codeMsg && <p className="mt-1 text-sm text-destructive">{codeMsg}</p>}
        </div>
      ) : (
        <>
          <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-sm">Code d'accès validé ✓</p>
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun match à jouer pour le moment.</p>
          ) : (
            <select
              value={match?.id ?? ""}
              onChange={(e) => {
                setMatch(matches.find((x) => x.id === e.target.value) ?? null);
                setStarter(null);
              }}
              aria-label="Match du tournoi"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Choisir le match</option>
              {matches.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          )}
          {match && (
            <>
              <div className="flex flex-wrap gap-2">
                {[301, 501, 701].map((s) => (
                  <button key={s} onClick={() => setStart(s)} className={choice(start === s)}>
                    {s}
                  </button>
                ))}
                <label className="ml-2 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={doubleOut} onChange={(e) => setDoubleOut(e.target.checked)} /> Sortie double
                </label>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Qui commence ?</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setStarter(null)} className={choice(starter === null)}>
                    Aléatoire
                  </button>
                  {[match.teamA, match.teamB].map((n, i) => (
                    <button key={i} onClick={() => setStarter(i)} className={choice(starter === i)}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  const list: Player[] = [
                    { name: match.teamA, userId: null },
                    { name: match.teamB, userId: null },
                  ];
                  const idx = starter === null ? Math.floor(Math.random() * 2) : starter;
                  setPlayers(idx === 1 ? list.reverse() : list);
                }}
                className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Commencer le match
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
