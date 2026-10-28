// Import des inscrits HelloAsso (API v5) vers helloasso_registrations.
const API = "https://api.helloasso.com";
export const HELLOASSO_ORG = "association-cardiogoal-saint-leonard";

const FORM_TYPES: Record<string, string> = {
  evenements: "Event",
  adhesions: "Membership",
  boutiques: "Shop",
  formulaires: "Checkout",
  collectes: "CrowdFunding",
  "paiements": "PaymentForm",
};

/** Extrait {org, formType, formSlug} d'une URL de billetterie HelloAsso. */
export function parseHelloAssoUrl(url: string) {
  const m = url.match(/helloasso\.com\/associations\/([^/?#]+)\/([^/?#]+)\/([^/?#]+)/i);
  if (!m) return null;
  const formType = FORM_TYPES[m[2]!.toLowerCase()];
  if (!formType) return null;
  return { org: m[1]!, formType, formSlug: m[3]! };
}

async function getToken() {
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env["HELLOASSO_CLIENT_ID"] ?? "",
      client_secret: process.env["HELLOASSO_CLIENT_SECRET"] ?? "",
    }),
  });
  if (!res.ok) throw new Error(`Connexion HelloAsso refusée (${res.status})`);
  return ((await res.json()) as { access_token: string }).access_token;
}

type CustomField = { id?: number; name?: string; type?: string; answer?: string };

type Item = {
  id: number;
  amount?: number;
  name?: string;
  state?: string;
  user?: { firstName?: string; lastName?: string };
  payer?: { firstName?: string; lastName?: string; email?: string };
  order?: { date?: string };
  customFields?: CustomField[];
};

const PARTNER_HINTS = ["partenaire", "coequipier", "equipier", "binome", "colocataire", "binettes"];

const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Retrouve le coéquipier déclaré dans les questions personnalisées du formulaire
 * HelloAsso (« Nom partenaire », « Prénom partenaire », … ).
 */
export function extractPartner(fields?: CustomField[]) {
  if (!fields?.length) return null;
  let firstName: string | null = null;
  let lastName: string | null = null;
  for (const f of fields) {
    const answer = (f.answer ?? "").trim();
    const label = stripAccents(f.name ?? "").toLowerCase();
    if (!answer || !PARTNER_HINTS.some((h) => label.includes(h))) continue;
    const clean = label.replace(/[^a-z]/g, "");
    if (clean.includes("prenom")) firstName = answer;
    else if (clean.includes("nom")) lastName = answer;
  }
  return firstName || lastName ? { firstName, lastName } : null;
}

/** Prénom seul, ou prénom + initiale du nom quand un homonyme existe (ex. « Patrice A. »). */
export function shortName(first: string | null, last: string | null, dup: Set<string> = new Set()) {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (!f) return l || "";
  if (!dup.has(f.toLowerCase())) return f;
  return l ? `${f} ${l[0]!.toUpperCase()}.` : f;
}

/** Nom d'équipe : les prénoms des deux joueurs, avec initiale du nom en cas d'homonyme. */
export function teamNameOf(r: {
  first_name: string | null;
  last_name: string | null;
  partner_first_name?: string | null;
  partner_last_name?: string | null;
  item_id: number;
}, dup: Set<string> = new Set()) {
  const holder = shortName(r.first_name, r.last_name, dup);
  const partner = shortName(r.partner_first_name ?? null, r.partner_last_name ?? null, dup);
  if (holder && partner) return `${holder} & ${partner}`;
  return holder || `Participant HelloAsso #${r.item_id}`;
}

export async function syncHelloAsso() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tournaments, error } = await supabaseAdmin
    .from("tournaments")
    .select("id, helloasso_url, status, max_participants")
    .not("helloasso_url", "is", null);
  if (error) throw new Error(error.message);
  const token = await getToken();
  let imported = 0;
  const failures: string[] = [];

  for (const t of tournaments ?? []) {
    const parsed = parseHelloAssoUrl(t.helloasso_url ?? "");
    if (!parsed) continue;
    try {
      let continuation: string | undefined;
      for (let page = 0; page < 50; page++) {
        const qs = new URLSearchParams({ pageSize: "100", withDetails: "true" });
        if (continuation) qs.set("continuationToken", continuation);
        const res = await fetch(
          `${API}/v5/organizations/${parsed.org}/forms/${parsed.formType}/${parsed.formSlug}/items?${qs}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as {
          data?: Item[];
          pagination?: { continuationToken?: string };
        };
        const items = body.data ?? [];
        if (items.length === 0) break;
        const rows = items.map((i) => {
          const partner = extractPartner(i.customFields);
          return {
            tournament_id: t.id,
            item_id: i.id,
            first_name: i.user?.firstName ?? i.payer?.firstName ?? null,
            last_name: i.user?.lastName ?? i.payer?.lastName ?? null,
            email: i.payer?.email ?? null,
            amount_cents: i.amount ?? 0,
            tier_name: i.name ?? null,
            state: i.state ?? null,
            paid_at: i.order?.date ?? null,
            partner_first_name: partner?.firstName ?? null,
            partner_last_name: partner?.lastName ?? null,
            custom_fields: i.customFields ?? null,
            synced_at: new Date().toISOString(),
          };
        });
        const { error: upErr } = await supabaseAdmin
          .from("helloasso_registrations")
          .upsert(rows, { onConflict: "item_id" });
        if (upErr) throw new Error(upErr.message);
        imported += rows.length;
        // Each valid HelloAsso ticket becomes a tournament participant (counts toward capacity).
        const ids = rows.filter((r) => !r.state || ["Processed", "Registered"].includes(r.state)).map((r) => r.item_id);
        if (ids.length) {
          const { data: existing } = await supabaseAdmin
            .from("tournament_teams")
            .select("id, name, name_locked, helloasso_item_id")
            .in("helloasso_item_id", ids);
          const known = new Map((existing ?? []).map((e) => [e.helloasso_item_id, e]));
          // Tournoi complet ou déjà lancé : aucune nouvelle équipe n'est importée
          // (la complétion du nom du coéquipier reste possible sur les équipes existantes).
          const { count } = await supabaseAdmin
            .from("tournament_teams")
            .select("id", { count: "exact", head: true })
            .eq("tournament_id", t.id);
          const canAdd = t.status === "open" && (t.max_participants == null || (count ?? 0) < t.max_participants);
          for (const r of rows) {
            if (!ids.includes(r.item_id)) continue;
            const name = teamNameOf(r);
            const team = known.get(r.item_id);
            if (!team) {
              if (!canAdd) continue;
              // Filet de sécurité : le trigger refuse aussi les insertions hors capacité.
              await supabaseAdmin.from("tournament_teams").insert({
                tournament_id: t.id, name, captain_id: null, helloasso_item_id: r.item_id,
              });
            } else if (!team.name_locked && team.name !== name) {
              // Le coéquipier vient d'être découvert : on complète le nom de l'équipe.
              await supabaseAdmin.from("tournament_teams").update({ name }).eq("id", team.id);
            }
          }
        }
        continuation = body.pagination?.continuationToken;
        if (!continuation || items.length < 100) break;
      }
    } catch (e) {
      failures.push(`${parsed.formSlug}: ${(e as Error).message}`);
    }
  }
  return { imported, failures };
}
