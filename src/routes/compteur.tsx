import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { findMemberForGame, confirmMemberIdentity } from "@/lib/darts.functions";
import { Game, type Player } from "@/components/dart-game";

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
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [starter, setStarter] = useState<number | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
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
        players={players}
        start={start}
        doubleOut={doubleOut}
        canSave={!!userId}
        tournamentId={null}
        match={null}
        accessCode={null}
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
              <Link to="/auth" search={{ redirect: "/compteur" }} className="text-primary underline">Connectez-vous</Link> pour ajouter des membres et enregistrer les statistiques.
            </p>
          )}
        </div>

        {userId && (
          <p className="-mt-2 text-xs text-muted-foreground">
            Chaque membre choisi (autre que vous) confirme son identité avec son mot de passe. Vous pouvez aussi jouer seul.
          </p>
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
