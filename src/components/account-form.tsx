import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/platform-ui";
import { organizerFields, signupMetadata, signupDestination, type SignupKind } from "@/lib/signup-data";

export function AccountForm({ kind, redirectTo }: { kind?: SignupKind; redirectTo?: string | undefined }) {
  const mode = kind ? "signup" : "login";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const goBack = () => navigate({ to: signupDestination(kind ?? "player", redirectTo) });
  useEffect(() => {
    if (kind || !redirectTo) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && data.user) void navigate({ to: redirectTo });
    });
    return () => { active = false; };
  }, [kind, redirectTo, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    if (forgotPassword) {
      setBusy(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
      } catch {
        setErrorMessage("Le lien n’a pas pu être envoyé. Réessayez dans quelques instants.");
      } finally { setBusy(false); }
      return;
    }
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
            data: signupMetadata(kind ?? "player", displayName, contact, { firstName, lastName }),
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
      const invalid = err instanceof Error && /invalid login credentials|invalid_credentials/i.test(err.message);
      setErrorMessage(mode === "signup" ? err instanceof Error ? err.message : "L’inscription n’a pas abouti." : invalid ? "L’adresse e-mail ou le mot de passe est incorrect." : err instanceof Error && /email not confirmed/i.test(err.message) ? "Confirmez votre adresse e-mail avant de vous connecter." : "La connexion n’a pas abouti. Réessayez dans quelques instants.");
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
        {forgotPassword ? "Mot de passe oublié" : mode === "login" ? "Connexion" : kind === "organizer" ? "Inscription organisateur" : "Inscription joueur"}
      </h1>
      {forgotPassword && <p className="mt-3 text-center text-muted-foreground">{resetSent ? "Si un compte correspond à cette adresse, un lien de réinitialisation vous a été envoyé. Vérifiez aussi vos courriers indésirables." : "Indiquez l’adresse e-mail associée à votre compte pour recevoir un lien de réinitialisation."}</p>}
      {resetSent ? <Button type="button" variant="link" className="mt-4" onClick={() => { setForgotPassword(false); setResetSent(false); setErrorMessage(""); }}>Retour à la connexion</Button> : <>
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
        {mode === "signup" && kind === "player" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" name="firstName" required maxLength={60} autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} />
            <Field label="Nom" name="lastName" required maxLength={60} autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} />
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
        {!forgotPassword && <div>
          <label className="mb-1 block text-sm font-medium" htmlFor="password">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={mode === "signup" ? 6 : undefined}
            className="w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="6 caractères minimum"
          />
        </div>}
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
        {errorMessage && <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
        <Button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "..." : forgotPassword ? "Envoyer le lien de réinitialisation" : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </Button>
      </form>
      {mode === "login" && <Button type="button" variant="link" className="mt-2" onClick={() => { setForgotPassword(v => !v); setErrorMessage(""); }}>{forgotPassword ? "Retour à la connexion" : "Mot de passe oublié ?"}</Button>}

      {mode === "signup" && <Button variant="link" asChild><Link to="/auth" search={redirectTo ? { redirect: redirectTo } : {}}>Déjà un compte ? Connectez-vous</Link></Button>}
      {mode === "login" && !forgotPassword && <div className="mt-6 flex flex-wrap justify-center gap-3"><Button variant="outline" asChild><Link to="/inscription/joueur" search={redirectTo ? { redirect: redirectTo } : {}}>Inscription joueur</Link></Button><Button variant="outline" asChild><Link to="/inscription/organisateur">Inscription organisateur</Link></Button></div>}
      </>}
    </div>
  );
}
