import { describe, expect, it } from "vitest";
import { validateManualPlayers } from "./manual-player-data";

const player = { tournamentId: "t1", firstName: "Simon", lastName: "Ansel", email: "Simon@example.test", phone: "06 12 34 56 78" };
describe("ajout manuel organisateur", () => {
  it("accepte un seul joueur et un contact en solo", () => {
    expect(validateManualPlayers({ ...player, teamName: "Ignoré" }, false)).toEqual({ firstName: "Simon", lastName: "Ansel", email: "simon@example.test", phone: "0612345678", partnerFirstName: "", partnerLastName: "", teamName: "" });
  });
  it("exige les deux identités en doublette", () => {
    expect(() => validateManualPlayers(player, true)).toThrow("second joueur");
    expect(() => validateManualPlayers({ ...player, partnerFirstName: "Patrice" }, true)).toThrow();
  });
  it("accepte une doublette sans nom d’équipe et un seul contact", () => {
    expect(validateManualPlayers({ ...player, partnerFirstName: "Patrice", partnerLastName: "Durand" }, true).teamName).toBe("");
  });
  it("conserve le nom d’équipe choisi", () => {
    expect(validateManualPlayers({ ...player, partnerFirstName: "Patrice", partnerLastName: "Durand", teamName: "Les Renards" }, true).teamName).toBe("Les Renards");
  });
  it("exige l’adresse mail du contact", () => expect(() => validateManualPlayers({ ...player, email: "" }, false)).toThrow());
  it("exige le téléphone du contact", () => expect(() => validateManualPlayers({ ...player, phone: "" }, false)).toThrow());
});