import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/platform-ui";
import { organizerFields, signupMetadata, signupDestination, type SignupKind } from "@/lib/signup-data";

export function AccountForm({ kind, redirectTo }: { kind?: SignupKind; redirectTo?: string }) {
  const [mode] = useState<"login" | "signup">(kind ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [contact, setContact] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const navigate = useNavigate();
  const goBack = () => navigate({ to: signupDestination(kind ?? "player", redirectTo) });

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
            data: signupMetadata(kind ?? "player", displayName, contact),
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(signupDestination(kind ?? "player", redirectTo))}`,
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
          activer votre compte {kind === "organizer" ? "organisateur" : "joueur"}.
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
        {mode === "login" ? "Connexion" : kind === "organizer" ? "Inscription organisateur" : "Inscription joueur"}
      </h1>
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
        {mode === "signup" && kind === "organizer" && (
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-semibold">Organisation et coordonnées</legend>
            {organizerFields.map(([key, label]) => <Field key={key} label={label} name={key} required maxLength={200} type={key === "phone" ? "tel" : "text"} value={contact[key] ?? ""} onChange={e => setContact({ ...contact, [key]: e.target.value })} />)}
          </fieldset>
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
        <Button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </Button>
      </form>

      {mode === "signup" && <Button variant="link" asChild><Link to="/auth" search={redirectTo ? { redirect: redirectTo } : {}}>Déjà un compte ? Connectez-vous</Link></Button>}
      {mode === "login" && <div className="mt-6 flex flex-wrap justify-center gap-3"><Button variant="outline" asChild><Link to="/inscription/joueur" search={redirectTo ? { redirect: redirectTo } : {}}>Inscription joueur</Link></Button><Button variant="outline" asChild><Link to="/inscription/organisateur">Inscription organisateur</Link></Button></div>}
    </div>
  );
}
