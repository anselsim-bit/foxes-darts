import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { Game, type PlayableMatch, type Player } from "@/components/dart-game";
import { getMyTournamentCode, listPlayableMatches, validateTournamentCode, rememberTournamentCode } from "@/lib/tournament.functions";
import { Button } from "@/components/ui/button";
import { deviceCodeKey, deviceDraftKey, draftMatches, readDeviceCode, readTournamentDraft, writeDeviceValue, type GameProgress, type TournamentDraft } from "@/lib/tournament-device";

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

export function TournamentPlay({ tournamentId, signedIn, qrCode }: { tournamentId: string; signedIn: boolean; qrCode?: string | undefined }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState<string | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeMsg, setCodeMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<PlayableMatch[]>([]);
  const [match, setMatch] = useState<PlayableMatch | null>(null);
  const [starter, setStarter] = useState<number | null>(null);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [draft, setDraft] = useState<TournamentDraft | null>(null);
  const [restoring, setRestoring] = useState(true);
  const restored = useRef(false);
  const storageWarning = useRef(false);

  const persistProgress = useCallback((progress: GameProgress) => {
    if (!draft) return;
    const ok = writeDeviceValue(deviceDraftKey(tournamentId), JSON.stringify({ ...draft, progress }));
    if (!ok && !storageWarning.current) {
      storageWarning.current = true;
      toast.error("Cet appareil ne permet pas de sauvegarder la partie. Ne fermez pas cette page.");
    }
  }, [draft, tournamentId]);

  const clearDraft = useCallback(() => {
    writeDeviceValue(deviceDraftKey(tournamentId), null);
  }, [tournamentId]);

  const loadMatches = () =>
    code && listPlayableMatches({ data: { tournamentId, code } }).then(setMatches).catch(() => {
      setCode(null);
      setMatches([]);
      setCodeMsg("Code d'accès invalide ou tournoi inactif.");
    });

  useEffect(() => {
    let active = true;
    if (restored.current) return;
    const restore = async () => {
      try {
        const fromQr = qrCode?.trim().toUpperCase().replace(/\s+/g, "").slice(0, 20) || null;
        if (fromQr) window.history.replaceState(window.history.state, "", window.location.pathname);
        const remembered = fromQr ?? readDeviceCode(tournamentId) ?? (signedIn ? (await getMyTournamentCode({ data: { tournamentId } })).code : null);
        if (!remembered || !active) return;
        const res = await validateTournamentCode({ data: { tournamentId, code: remembered } });
        if (!active) return;
        if (!res.valid || !res.active) {
          writeDeviceValue(deviceCodeKey(tournamentId), null);
          setCodeMsg("Le code d'accès a changé ou le tournoi est inactif. Saisissez le code actuel.");
          return;
        }
        await openTournament(remembered, () => active);
      } catch {
        if (active) setCodeMsg("Vérification impossible pour le moment. Réessayez avec votre code.");
      } finally {
        if (active) setRestoring(false);
      }
    };
    void restore();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signedIn, tournamentId]);

  const openTournament = async (validCode: string, isActive = () => true) => {
    const available = await listPlayableMatches({ data: { tournamentId, code: validCode } });
    if (!isActive()) return;
    restored.current = true;
    setCode(validCode);
    writeDeviceValue(deviceCodeKey(tournamentId), validCode);
    setMatches(available);
    const savedDraft = readTournamentDraft(tournamentId);
    if (!savedDraft) return;
    const savedMatch = available.find(m => draftMatches(savedDraft, m));
    if (!savedMatch) {
      clearDraft();
      toast.info("Le match sauvegardé n'est plus disponible ou ses réglages ont changé.");
      return;
    }
    setDraft(savedDraft);
    setMatch(savedMatch);
    setPlayers(savedDraft.players);
  };

  const checkCode = async () => {
    setBusy(true);
    setCodeMsg(null);
    try {
      const validate = signedIn ? rememberTournamentCode : validateTournamentCode;
      const res = await validate({ data: { tournamentId, code: codeInput } });
      if (!res.valid) setCodeMsg("Ce code n'existe pas pour ce tournoi.");
      else if (!res.active) setCodeMsg("Les codes ne sont pas encore activés par l'organisateur.");
      else {
        await openTournament(codeInput.trim().toUpperCase().replace(/\s+/g, "").slice(0, 20));
        toast.success(res.participantName ? `Code validé, bon tournoi ${res.participantName} !` : "Code validé !");
      }
    } catch {
      setCodeMsg("Vérification impossible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  const exitGame = () => {
    if (readTournamentDraft(tournamentId) && !window.confirm("Quitter ce match et effacer sa sauvegarde ?")) return;
    clearDraft();
    setDraft(null);
    setPlayers(null);
    setMatch(null);
    loadMatches();
    queryClient.invalidateQueries({ queryKey: ["board", tournamentId] });
  };

  if (players && match && code) {
    return (
      <div className="mt-8 rounded-xl border border-primary/40">
        <Game
          players={players}
          start={match.start}
          doubleOut={match.doubleOut}
          poolDoubleLimit={match.poolDoubleLimit}
          legsToWin={match.legsToWin ?? 1}
          canSave
          tournamentId={tournamentId}
          match={match}
          accessCode={code}
          onExit={exitGame}
          initialProgress={draft?.progress}
          onProgress={persistProgress}
          onReported={clearDraft}
        />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="text-xl">Participer au tournoi</h2>
      {restoring ? <p role="status" className="text-sm text-muted-foreground">Vérification de l'accès…</p> : !code ? (
        <div>
          <p className="mb-2 text-sm text-muted-foreground">Saisissez le code d'accès communiqué par l'organisateur.</p>
          <div className="flex gap-2">
            <input
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Code d'accès"
              maxLength={20}
              aria-label="Code d'accès du tournoi"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm uppercase tracking-widest"
            />
            <Button
              onClick={checkCode}
              disabled={busy || codeInput.trim().length < 1}
              className="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {busy ? "..." : "Valider"}
            </Button>
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
              <p className="text-sm font-medium">{match.start} · {match.doubleOut ? "Sortie double" : "Sortie simple"} · {(match.legsToWin ?? 1) === 2 ? "2 manches gagnantes" : "1 manche"}</p>
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
                  const ordered = idx === 1 ? list.reverse() : list;
                  const nextDraft: TournamentDraft = {
                    version: 1, matchId: match.id, teamAId: match.teamAId, teamBId: match.teamBId,
                    start: match.start, doubleOut: match.doubleOut, poolDoubleLimit: match.poolDoubleLimit,
                    legsToWin: match.legsToWin ?? 1,
                    players: ordered.map(p => ({ name: p.name, userId: null })),
                    progress: { turns: [], current: [], pendingBust: null, mult: 1 },
                  };
                  setDraft(nextDraft);
                  writeDeviceValue(deviceDraftKey(tournamentId), JSON.stringify(nextDraft));
                  setPlayers(ordered);
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
