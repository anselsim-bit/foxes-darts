import { describe, expect, it } from "vitest";
import { extractPartner, teamNameOf } from "./helloasso.server";

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
  it("affiche les deux joueurs de la doublette", () => {
    expect(
      teamNameOf({
        first_name: "Simon",
        last_name: "Ansel",
        partner_first_name: "Patrice",
        partner_last_name: "Ansel",
        item_id: 211600264,
      }),
    ).toBe("Simon Ansel & Patrice Ansel");
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
    ).toBe("Simon Ansel");
  });

  it("repli sur le numéro de billet si aucun nom n'est connu", () => {
    expect(teamNameOf({ first_name: null, last_name: null, item_id: 42 })).toBe("Participant HelloAsso #42");
  });
});
