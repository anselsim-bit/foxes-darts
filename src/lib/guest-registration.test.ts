import { describe, it, expect } from "vitest";
import { validateGuest } from "./player.functions";
const ok = { firstName: "Patrice", lastName: "Durand", email: "P@Ex.fr", phone: "06 12 34 56 78" };
describe("guest registration", () => {
  it("accepts name, email and phone, normalizing them", () => expect(validateGuest(ok)).toEqual({ firstName: "Patrice", lastName: "Durand", email: "p@ex.fr", phone: "0612345678", partnerFirstName: "", partnerLastName: "", teamName: "" }));
  it("requires a last name", () => expect(() => validateGuest({ ...ok, lastName: "" })).toThrow());
  it("requires a valid email", () => expect(() => validateGuest({ ...ok, email: "nope" })).toThrow());
  it("requires a phone number", () => expect(() => validateGuest({ ...ok, phone: "12" })).toThrow());
});
