import { it, expect } from "vitest";
import { doubletteName } from "./team-name";
it("names a doublette from first names and last-name initials", () => expect(doubletteName("Patrice", "durand", "Julie", "Martin")).toBe("Patrice D. & Julie M."));
