import { describe, expect, it } from "vitest";
import { signupDestination, signupMetadata } from "./signup-data";

const contact = { organization_name: "Club test", responsible_name: "Camille", phone: "0600000000", address: "1 rue Test", postal_code: "62200", city: "Saint-Léonard" };
describe("Inscriptions joueur et organisateur", () => {
  it("conserve un nom de joueur pour les organisateurs qui jouent aussi", () => {
    expect(signupMetadata("organizer", "Camille Darts", contact).display_name).toBe("Camille Darts");
  });
  it("enregistre les coordonnées complètes sans attribuer de droits", () => {
    const result = signupMetadata("organizer", "Camille", contact);
    expect(result.organizer_contact).toEqual(contact);
    expect(result).not.toHaveProperty("role");
  });
  it("exige les coordonnées complètes à l’inscription organisateur", () => {
    expect(() => signupMetadata("organizer", "Camille", { ...contact, phone: "" })).toThrow();
  });
  it("n’impose pas de coordonnées d’organisation au joueur", () => {
    expect(signupMetadata("player", "Renard", {})).toEqual({ display_name: "Renard", signup_kind: "player" });
  });
  it("oriente chaque inscription vers son espace", () => {
    expect(signupDestination("organizer")).toBe("/create-organization");
    expect(signupDestination("player")).toBe("/dashboard");
  });
  it("préserve le retour demandé après connexion", () => {
    expect(signupDestination("player", "/tournois")).toBe("/tournois");
  });
});