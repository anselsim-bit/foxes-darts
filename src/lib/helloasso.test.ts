import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractPartner, teamNameOf, syncHelloAsso } from "./helloasso.server";

const mocks = vi.hoisted(() => {
  type Op = { table: string; op: string; payload?: unknown };
  const ops: Op[] = [];
  const state = { tournaments: [] as unknown[], existingTeams: [] as unknown[], teamNames: [] as { name: string }[], teamCount: 0 };
  const thenable = (result: unknown) => ({
    then: (res: (v: unknown) => void, rej?: (e: unknown) => void) => Promise.resolve(result).then(res, rej),
  });
  const from = (table: string) => {
    type Chain = {
      select: (...args: unknown[]) => Chain;
      not: () => Chain;
      in: () => Chain;
      eq: () => Chain;
      upsert: (payload: unknown) => unknown;
      insert: (payload: unknown) => unknown;
      update: (payload: unknown) => Chain;
      then: (res: (v: unknown) => void, rej?: (e: unknown) => void) => Promise<unknown>;
    };
    let selectArgs: unknown[] = [];
    const chain: Chain = {
      select: (...args: unknown[]) => { selectArgs = args; return chain; },
      not: () => chain,
      in: () => chain,
      eq: () => chain,
      upsert: (payload: unknown) => { ops.push({ table, op: "upsert", payload }); return thenable({ data: null, error: null }); },
      insert: (payload: unknown) => { ops.push({ table, op: "insert", payload }); return thenable({ data: null, error: null }); },
      update: (payload: unknown) => { ops.push({ table, op: "update", payload }); return chain; },
      then: (res: (v: unknown) => void, rej?: (e: unknown) => void) => {
        let result: unknown = { data: null, error: null };
        if (table === "tournaments") result = { data: state.tournaments, error: null };
        else if (table === "tournament_teams") {
          result = selectArgs[0] === "name"
            ? { data: state.teamNames, error: null, count: state.teamCount }
            : { data: state.existingTeams, error: null };
        }
        return Promise.resolve(result).then(res, rej);
      },
    };
    return chain;
  };
  return { ops, state, from };
});

vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));

const json = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const itemsBody = (items: unknown[]) => ({
  data: items,
  pagination: {},
});
const ticket = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  amount: 1000,
  name: "Doublette",
  state: "Processed",
  user: { firstName: id === 1 ? "Alice" : "Bob", lastName: id === 1 ? "Un" : "Deux" },
  payer: { email: `joueur${id}@x.fr` },
  order: { date: "2026-10-27T10:00:00Z" },
  customFields: [],
  ...extra,
});
const tournamentRow = {
  id: "t1",
  helloasso_url: "https://www.helloasso.com/associations/asso/evenements/tournoi",
  status: "open",
  max_participants: 16,
};
const partnerFields = [
  { name: "Nom partenaire", answer: "Partenaire" },
  { name: "Prénom partenaire", answer: "Coéquipier" },
];

describe("extractPartner", () => {
  it("retrouve le coéquipier des questions « Nom / Prénom partenaire »", () => {
    const partner = extractPartner([
      { id: 8749841, name: "Nom partenaire", type: "TextInput", answer: "Ansel" },
      { id: 8749852, name: "Prénom partenaire", type: "TextInput", answer: "Patrice" },
    ]);
    expect(partner).toEqual({ firstName: "Patrice", lastName: "Ansel" });
  });

  it("accepte d'autres libellés de coéquipier", () => {
    const partner = extractPartner([
      { name: "Nom du coéquipier", answer: "Deseille" },
      { name: "Prénom du coéquipier", answer: "Gautier" },
    ]);
    expect(partner).toEqual({ firstName: "Gautier", lastName: "Deseille" });
  });

  it("retourne null quand aucune question ne concerne le coéquipier", () => {
    expect(extractPartner([{ name: "Régime alimentaire", answer: "Sans gluten" }])).toBeNull();
    expect(extractPartner([])).toBeNull();
    expect(extractPartner(undefined)).toBeNull();
  });
});

describe("teamNameOf", () => {
  it("affiche seulement les prénoms des deux joueurs", () => {
    expect(
      teamNameOf({
        first_name: "Simon",
        last_name: "Ansel",
        partner_first_name: "Patrice",
        partner_last_name: "Ansel",
        item_id: 211600264,
      }),
    ).toBe("Simon & Patrice");
  });

  it("ajoute l'initiale du nom en cas d'homonyme", () => {
    expect(
      teamNameOf({
        first_name: "Patrice",
        last_name: "Ansel",
        partner_first_name: "Gautier",
        partner_last_name: "Deseille",
        item_id: 211600264,
      }, new Set(["patrice"])),
    ).toBe("Patrice A. & Gautier");
  });

  it("garde le titulaire seul quand aucun coéquipier n'est déclaré", () => {
    expect(
      teamNameOf({
        first_name: "Simon",
        last_name: "Ansel",
        partner_first_name: null,
        partner_last_name: null,
        item_id: 211600264,
      }),
    ).toBe("Simon");
  });

  it("repli sur le numéro de billet si aucun nom n'est connu", () => {
    expect(teamNameOf({ first_name: null, last_name: null, item_id: 42 })).toBe("Participant HelloAsso #42");
  });
});

describe("syncHelloAsso capacity", () => {
  beforeEach(() => {
    mocks.ops.length = 0;
    mocks.state.tournaments = [tournamentRow];
    mocks.state.existingTeams = [];
    mocks.state.teamNames = [];
    mocks.state.teamCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("oauth2/token")) return json({ access_token: "tok" });
      return json(itemsBody([ticket(1, { customFields: partnerFields }), ticket(2)]));
    }));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("laisse un tournoi complet totalement tranquille", async () => {
    mocks.state.teamCount = 16;
    mocks.state.existingTeams = [{ id: "team-1", name: "Alice", name_locked: false, helloasso_item_id: 1 }];
    await syncHelloAsso();
    // Aucune inscription rapatriée, aucune équipe créée, aucun nom recomplété.
    expect(mocks.ops).toEqual([]);
  });

  it("le bouton d'import manuel rafraîchit quand même un tournoi complet", async () => {
    mocks.state.teamCount = 16;
    mocks.state.existingTeams = [{ id: "team-1", name: "Alice", name_locked: false, helloasso_item_id: 1 }];
    await syncHelloAsso({ force: true });
    expect(mocks.ops.filter((o) => o.op === "upsert")).toHaveLength(1);
    expect(mocks.ops.filter((o) => o.op === "insert")).toEqual([]);
    expect(mocks.ops.filter((o) => o.op === "update")).toEqual([{ table: "tournament_teams", op: "update", payload: { name: "Alice & Coéquipier" } }]);
  });

  it("crée l'équipe d'un nouveau billet quand il reste de la place", async () => {
    mocks.state.teamCount = 15;
    await syncHelloAsso();
    expect(mocks.ops.filter((o) => o.op === "insert")).toEqual([
      { table: "tournament_teams", op: "insert", payload: { tournament_id: "t1", name: "Alice & Coéquipier", captain_id: null, helloasso_item_id: 1 } },
      { table: "tournament_teams", op: "insert", payload: { tournament_id: "t1", name: "Bob", captain_id: null, helloasso_item_id: 2 } },
    ]);
  });

  it("sync un tournoi sans limite de participants", async () => {
    mocks.state.tournaments = [{ ...tournamentRow, max_participants: null }];
    await syncHelloAsso();
    expect(mocks.ops.filter((o) => o.op === "insert")).toHaveLength(2);
  });

  it("distingue les homonymes avec l'initiale du nom", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string | URL | Request) => {
      const u = String(url);
      if (u.includes("oauth2/token")) return json({ access_token: "tok" });
      return json(itemsBody([
        ticket(1, { user: { firstName: "Patrice", lastName: "Ansel" } }),
        ticket(2, { user: { firstName: "Patrice", lastName: "Double" } }),
      ]));
    }));
    await syncHelloAsso();
    expect(mocks.ops.filter((o) => o.op === "insert").map((o) => (o.payload as { name: string }).name)).toEqual([
      "Patrice A.",
      "Patrice D.",
    ]);
  });

  it("n'importe rien dans un tournoi déjà lancé", async () => {
    mocks.state.tournaments = [{ ...tournamentRow, status: "started" }];
    mocks.state.teamCount = 4;
    await syncHelloAsso();
    expect(mocks.ops.filter((o) => o.op === "insert")).toEqual([]);
  });
});
