import { describe, expect, it } from "vitest";
import { organizationThemeStyle } from "./organization-theme";
describe("organizationThemeStyle", () => {
  it("uses the organization main color", () => {
    expect(organizationThemeStyle("#2255ff")).toMatchObject({ "--primary": "#2255ff", "--primary-foreground": "#fafafa" });
  });
  it("uses dark text on a light color", () => {
    expect(organizationThemeStyle("#ffee00")).toMatchObject({ "--primary-foreground": "#1a1a1a" });
  });
  it("keeps the default theme without a valid color", () => {
    expect(organizationThemeStyle(null)).toBeUndefined();
    expect(organizationThemeStyle("red;x")).toBeUndefined();
  });
});
