import { describe, expect, it } from "vitest";
import { mediaBelongsToOrganization } from "./organization-media";
const org = "11111111-1111-1111-1111-111111111111";
const other = "22222222-2222-2222-2222-222222222222";
describe("logos et couvertures d'organisation", () => {
  it("accepte le logo de sa propre organisation", () => expect(mediaBelongsToOrganization(`organizations/${org}/logos/a.png`, org, other)).toBe(true));
  it("refuse la couverture d'une autre organisation", () => expect(mediaBelongsToOrganization(`organizations/${other}/covers/a.png`, org, other)).toBe(false));
});
