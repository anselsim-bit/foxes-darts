import { describe, expect, it } from "vitest";
import { validateManualPlayers } from "./manual-player-data";

const player = { tournamentId: "t1", firstName: "Simon", lastName: "Ansel", email: "Simon@example.test", phone: "06 12 34 56 78" };
describe("ajout manuel organisateur", () => {
  it("accepte un seul joueur et un contact en solo", () => {
    expect(validateManualPlayers({ ...player, teamName: "Ignoré" }, false)).toEqual({ firstName: "Simon", lastName: "Ansel", email: "simon@example.test", phone: "0612345678", partnerFirstName: "", partnerLastName: "", teamName: "" });
  });
  it("accepte une doublette sans identité du second joueur", () => {
    expect(validateManualPlayers(player, true).partnerFirstName).toBe("");
    expect(validateManualPlayers({ ...player, partnerFirstName: "Patrice" }, true).partnerLastName).toBe("");
  });
  it("accepte une doublette sans nom d’équipe et un seul contact", () => {
    expect(validateManualPlayers({ ...player, partnerFirstName: "Patrice", partnerLastName: "Durand" }, true).teamName).toBe("");
  });
  it("conserve le nom d’équipe choisi", () => {
    expect(validateManualPlayers({ ...player, partnerFirstName: "Patrice", partnerLastName: "Durand", teamName: "Les Renards" }, true).teamName).toBe("Les Renards");
  });
  it("accepte sans adresse mail", () => expect(validateManualPlayers({ ...player, email: "" }, false).email).toBe(""));
  it("accepte sans téléphone", () => expect(validateManualPlayers({ ...player, phone: "" }, false).phone).toBe(""));
  it.each([false, true])("accepte tous les champs vides (doublette : %s)", doublette => {
    expect(validateManualPlayers({ tournamentId: "t1", firstName: "", lastName: "", email: "", phone: "" }, doublette)).toEqual({ firstName: "", lastName: "", email: "", phone: "", partnerFirstName: "", partnerLastName: "", teamName: "" });
  });
  it("accepte des noms de test avec chiffres", () => expect(validateManualPlayers({ ...player, firstName: "Test 123", lastName: "" }, false).firstName).toBe("Test 123"));
  it("refuse une adresse renseignée invalide", () => expect(() => validateManualPlayers({ ...player, email: "invalide" }, false)).toThrow("e-mail"));
  it("refuse un téléphone renseigné invalide", () => expect(() => validateManualPlayers({ ...player, phone: "abc" }, false)).toThrow("téléphone"));
});