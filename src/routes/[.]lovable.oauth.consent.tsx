import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { oauth, authorizationRedirect } from '@/lib/oauth-consent';
export const Route = createFileRoute('/.lovable/oauth/consent')({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ authorization_id: typeof s['authorization_id'] === 'string' ? s['authorization_id'] : '' }),
  head: () => ({ meta: [
    { title: 'Connecter un agent — Foxes Darts' },
    { name: 'description', content: 'Autorisez un agent à lire vos informations Foxes Darts.' },
    { property: 'og:title', content: 'Connecter un agent — Foxes Darts' },
    { property: 'og:description', content: 'Autorisez un agent à lire vos informations Foxes Darts.' },
    { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' },
  ] }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error('Cette demande de connexion est incomplète. Relancez la connexion depuis votre agent.');
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error('Votre session est indisponible. Veuillez réessayer.');
    if (!data.session) throw redirect({ to: '/auth', search: { redirect: location.pathname + location.searchStr + location.hash } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.searchStr).get('authorization_id');
    if (!id) throw new Error('Demande de connexion manquante.');
    const { data, error } = await oauth.getAuthorizationDetails(id);
    if (error || !data) throw new Error('Cette demande a expiré ou est indisponible. Relancez la connexion depuis votre agent.');
    const immediate = authorizationRedirect(data);
    if (immediate && !('client' in data)) throw redirect({ href: immediate });
    const { data: session } = await supabase.auth.getSession();
    return { details: data, account: session.session?.user.email ?? '' };
  },
  errorComponent: ({ error }) => <main className="mx-auto max-w-lg px-4 py-16"><h1 className="text-2xl">Connexion non disponible</h1><p role="alert" className="mt-4 text-muted-foreground">{error instanceof Error ? error.message : 'La demande est indisponible. Relancez la connexion depuis votre agent.'}</p></main>,
  component: Consent,
});
function Consent() {
  const { details, account } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const client = 'client' in details ? details.client : undefined;
  const name = client?.name ?? 'votre agent';
  const scope = 'scope' in details && typeof details.scope === 'string' ? details.scope : '';
  async function decide(approve: boolean) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = approve ? await oauth.approveAuthorization(authorization_id) : await oauth.denyAuthorization(authorization_id);
      if (result.error) throw new Error('La décision n’a pas été enregistrée. Réessayez.');
      const target = authorizationRedirect(result.data);
      if (!target) throw new Error('La connexion n’a pas pu se terminer. Relancez-la depuis votre agent.');
      window.location.assign(target);
    } catch (e) { setError(e instanceof Error ? e.message : 'Réessayez la connexion.'); setBusy(false); }
  }
  return <main className="mx-auto max-w-lg px-4 py-16">
    <h1 className="text-2xl">Connecter {name} à Foxes Darts</h1>
    <p className="mt-4 text-muted-foreground">Compte : {account}</p>
    <p className="mt-4">{name} pourra utiliser les outils autorisés de cette application en votre nom.</p>
    {'redirect_uri' in details && <p className="mt-3 break-all text-sm text-muted-foreground">Destination : {details.redirect_uri}</p>}
    <ul className="my-6 space-y-2"><li>Votre nom de joueur et vos statistiques globales</li><li>Vos organisations et votre rôle</li><li>Vos inscriptions aux tournois</li>{scope.split(' ').filter(Boolean).map(s => <li key={s}>{s === 'email' ? 'Votre adresse e-mail' : s === 'profile' ? 'Votre profil de compte' : s === 'openid' ? 'Votre identité de connexion' : `Permission supplémentaire : ${s}`}</li>)}</ul>
    <p className="text-sm text-muted-foreground">Cet accès ne contourne pas vos droits ni les protections entre organisations. Aucun résultat ou droit ne peut être modifié.</p>
    {error && <p role="alert" className="mt-4 text-destructive">{error}</p>}
    <div className="mt-8 flex flex-wrap gap-3"><Button disabled={busy} onClick={() => decide(true)}>Autoriser la connexion</Button><Button variant="outline" disabled={busy} onClick={() => decide(false)}>Refuser la connexion</Button></div>
  </main>;
}
