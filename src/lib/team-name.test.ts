import { it, expect } from "vitest";
import { doubletteName } from "./team-name";
it("utilise les prénoms seuls sans homonyme", () => expect(doubletteName("Patrice", "durand", "Julie", "Martin")).toBe("Patrice & Julie"));
it("distingue deux prénoms identiques avec les initiales", () => expect(doubletteName("Patrice", "durand", "patrice", "Martin")).toBe("Patrice D. & patrice M."));
it("ajoute une initiale seulement au prénom présent ailleurs", () => expect(doubletteName("Patrice", "durand", "Julie", "Martin", new Set(["patrice"]))).toBe("Patrice D. & Julie"));
