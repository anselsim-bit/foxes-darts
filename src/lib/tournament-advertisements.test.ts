import { describe, expect, it } from "vitest";
import { validateAdvertisements, visibleAdvertisements } from "./tournament-advertisements";
const org = "11111111-1111-4111-8111-111111111111";
const ad = { name: "Partenaire", logo_path: `organizations/${org}/22222222-2222-4222-8222-222222222222.png` };
describe("tournament advertisements", () => {
  it("keeps multiple logos in their chosen order", () => {
    expect(validateAdvertisements([ad, { ...ad, name: "Second partenaire" }], org).map(i => i.name)).toEqual(["Partenaire", "Second partenaire"]);
  });
  it("hides disabled advertisements without deleting them", () => {
    expect(visibleAdvertisements(false, [ad])).toEqual([]);
    expect(visibleAdvertisements(true, [ad])).toEqual([ad]);
  });
  it("rejects another organization's logo", () => {
    expect(() => validateAdvertisements([ad], "33333333-3333-4333-8333-333333333333")).toThrow("logo");
  });
  it("rejects remote logos and path traversal", () => {
    for (const path of ["https://example.com/logo.png", `organizations/${org}/../logo.png`]) expect(() => validateAdvertisements([{ ...ad, logo_path: path }], org)).toThrow("logo");
  });
});