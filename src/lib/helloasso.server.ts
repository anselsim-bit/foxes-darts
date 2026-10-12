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

type Item = {
  id: number;
  amount?: number;
  name?: string;
  state?: string;
  user?: { firstName?: string; lastName?: string };
  payer?: { firstName?: string; lastName?: string; email?: string };
  order?: { date?: string };
};

export async function syncHelloAsso() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tournaments, error } = await supabaseAdmin
    .from("tournaments")
    .select("id, helloasso_url")
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
        const rows = items.map((i) => ({
          tournament_id: t.id,
          item_id: i.id,
          first_name: i.user?.firstName ?? i.payer?.firstName ?? null,
          last_name: i.user?.lastName ?? i.payer?.lastName ?? null,
          email: i.payer?.email ?? null,
          amount_cents: i.amount ?? 0,
          tier_name: i.name ?? null,
          state: i.state ?? null,
          paid_at: i.order?.date ?? null,
          synced_at: new Date().toISOString(),
        }));
        const { error: upErr } = await supabaseAdmin
          .from("helloasso_registrations")
          .upsert(rows, { onConflict: "item_id" });
        if (upErr) throw new Error(upErr.message);
        imported += rows.length;
        continuation = body.pagination?.continuationToken;
        if (!continuation || items.length < 100) break;
      }
    } catch (e) {
      failures.push(`${parsed.formSlug}: ${(e as Error).message}`);
    }
  }
  return { imported, failures };
}
