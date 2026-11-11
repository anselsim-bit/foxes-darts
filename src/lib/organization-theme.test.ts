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
describe("organization custom colors", () => {
  it("applies each chosen element color", () => {
    const s = organizationThemeStyle({ primary_color: "#2255ff", theme_colors: { background: "#ffffff", foreground: "#111111", card: "#eeeeee" } }) as Record<string, string>;
    expect(s["--background"]).toBe("#ffffff");
    expect(s["--foreground"]).toBe("#111111");
    expect(s["--card"]).toBe("#eeeeee");
  });
  it("ignores invalid values", () => {
    expect(organizationThemeStyle({ theme_colors: { background: "url(x)" } })).toBeUndefined();
  });
});
