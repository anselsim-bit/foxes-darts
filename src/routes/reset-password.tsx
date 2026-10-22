import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Foxes Darts" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour votre compte Foxes Darts." },
      { property: "og:title", content: "Nouveau mot de passe — Foxes Darts" },
      { property: "og:description", content: "Choisissez un nouveau mot de passe pour votre compte Foxes Darts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== password2) return toast.error("Les deux mots de passe ne sont pas identiques.");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Mot de passe modifié !");
      navigate({ to: "/mon-espace" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const cls = "w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary";
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
        <KeyRound className="h-7 w-7 text-primary-foreground" />
      </span>
      <h1 className="mt-6 text-3xl">Nouveau mot de passe</h1>
      {!ready ? (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Ouvrez cette page depuis le lien reçu par e-mail. Si le lien a expiré, demandez-en un nouveau à un administrateur.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 w-full space-y-4">
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" aria-label="Nouveau mot de passe" autoComplete="new-password" className={cls} />
          <input type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="Confirmer le mot de passe" aria-label="Confirmer le mot de passe" autoComplete="new-password" className={cls} />
          {password2.length > 0 && password2 !== password && <p className="text-xs text-destructive">Les mots de passe ne correspondent pas.</p>}
          <button type="submit" disabled={busy} className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {busy ? "..." : "Enregistrer"}
          </button>
        </form>
      )}
    </div>
  );
}
