import { describe, it, expect } from "vitest";
import { signupAgeMetadata } from "./signup-age";
describe("restriction d’âge", () => {
  it("refuse avant 13 ans", () => { expect(() => signupAgeMetadata("under13", true)).toThrow(); });
  it("refuse une déclaration absente ou inconnue", () => { expect(() => signupAgeMetadata("", true)).toThrow(); expect(() => signupAgeMetadata("adult", true)).toThrow(); });
  it("exige l’accord parental à 13 et 14 ans", () => { expect(() => signupAgeMetadata("13-14", false)).toThrow(); });
  it("accepte 13 et 14 ans avec accord déclaré", () => { expect(signupAgeMetadata("13-14", true)).toEqual({ age_band: "13-14", parental_agreement: true, age_policy_version: 1 }); });
  it("accepte dès 15 ans sans accord parental", () => { expect(signupAgeMetadata("15plus", false).age_band).toBe("15plus"); });
});