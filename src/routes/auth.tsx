import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search["redirect"];
    return typeof r === "string" && r.startsWith("/") && !r.startsWith("//")
      ? { redirect: r }
      : {};
  },
  head: () => ({
    meta: [
      { title: "Connexion — Foxes Darts" },
      { name: "description", content: "Connectez-vous ou créez votre compte joueur Foxes Darts." },
      { property: "og:title", content: "Connexion — Foxes Darts" },
      { property: "og:description", content: "Connectez-vous ou créez votre compte joueur Foxes Darts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const navigate = useNavigate();
  const { redirect: redirectTo } = Route.useSearch();
  const goBack = () => navigate({ to: redirectTo ?? "/mon-espace" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && password !== password2) {
      toast.error("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
        goBack();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmEmail(true);
        } else {
          toast.success("Compte créé, bienvenue !");
          goBack();
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  if (confirmEmail) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
          <Target className="h-7 w-7 text-primary-foreground" />
        </span>
        <h1 className="mt-6 text-3xl">Vérifiez vos e-mails</h1>
        <p className="mt-3 text-muted-foreground">
          Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour
          activer votre compte joueur.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary">
        <Target className="h-7 w-7 text-primary-foreground" />
      </span>
      <h1 className="mt-6 text-3xl">
        {mode === "login" ? "Connexion" : "Créer un compte"}
      </h1>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        {mode === "login"
          ? "Accédez à vos inscriptions et statistiques."
          : "Inscrivez-vous aux tournois et suivez vos statistiques de jeu."}
      </p>

      <form onSubmit={submit} className="mt-8 w-full space-y-4">
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="displayName">
              Nom de joueur
            </label>
            <input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Ex : RenardVolant"
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="vous@exemple.fr"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="6 caractères minimum"
          />
        </div>
        {mode === "signup" && (
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password2">
              Confirmer le mot de passe
            </label>
            <input
              id="password2"
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              required
              minLength={6}
              aria-invalid={password2.length > 0 && password2 !== password}
              className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary aria-[invalid=true]:border-destructive"
              placeholder="Retapez le mot de passe"
            />
            {password2.length > 0 && password2 !== password && (
              <p className="mt-1 text-xs text-destructive">Les mots de passe ne correspondent pas.</p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="mt-6 text-sm text-primary hover:underline"
      >
        {mode === "login"
          ? "Pas encore de compte ? Inscrivez-vous"
          : "Déjà un compte ? Connectez-vous"}
      </button>
    </div>
  );
}
