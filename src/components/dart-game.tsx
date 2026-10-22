import { useMemo, useState } from "react";
import { Undo2, Trophy, RotateCcw, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { suggestNextDarts } from "@/lib/checkout";
import { saveGameResult } from "@/lib/darts.functions";
import { reportMatch } from "@/lib/tournament.functions";

export type Player = { name: string; userId: string | null; token?: string | undefined };
export type PlayableMatch = {
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

export function Game({
  players,
  start,
  doubleOut,
  canSave,
  tournamentId,
  match,
  accessCode,
  onExit,
  onRestart,
}: {
  match: { id: string; teamA: string; teamB: string } | null;
  accessCode: string | null;
  players: Player[];
  start: number;
  doubleOut: boolean;
  canSave: boolean;
  tournamentId: string | null;
  onExit: () => void;
  onRestart: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [current, setCurrent] = useState<Dart[]>([]);
  const [mult, setMult] = useState<1 | 2 | 3>(1);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reported, setReported] = useState(false);
  const report = async () => {
    if (winner === null || !match) return;
    const aWon = players[winner]!.name === match.teamA;
    const loserRemaining = scores[winner === 0 ? 1 : 0] ?? 0;
    try {
      await reportMatch({ data: { matchId: match.id, scoreA: aWon ? 0 : loserRemaining, scoreB: aWon ? loserRemaining : 0, code: accessCode ?? undefined } });
      setReported(true);
      toast.success("Résultat envoyé au tableau du tournoi.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    }
  };

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
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {match && canSave && accessCode && (
              <button onClick={report} disabled={reported} className={btn}>
                {reported ? "Tableau mis à jour ✓" : "Envoyer le résultat au tableau du tournoi"}
              </button>
            )}
            <button onClick={onRestart} className={btn}>
              <RotateCcw className="mr-1 inline h-4 w-4" /> Recommencer la partie
            </button>
            <button onClick={undo} className={btn}>
              <Undo2 className="mr-1 inline h-4 w-4" /> Annuler la dernière fléchette
            </button>
          </div>
          {players.length > 1 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Au nouveau départ, l'ordre des joueurs est inversé : {players[1]!.name} commence.
            </p>
          )}
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
