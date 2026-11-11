import type { CSSProperties } from "react";

const HEX = /^#[0-9a-f]{6}$/i;

/** Colors an organization can customize, with the default Foxes values shown in the settings form. */
export const themeColorFields = [
  ["background", "Fond de page", "#1a1a1a"],
  ["card", "Fond des encadrés", "#262626"],
  ["foreground", "Texte principal", "#eeeeee"],
  ["muted_foreground", "Texte secondaire", "#9a948f"],
  ["border", "Bordures", "#3a3a3a"],
  ["accent", "Survol et mise en avant", "#3a2e2a"],
] as const;
export type ThemeColorKey = (typeof themeColorFields)[number][0];

function readableOn(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!) > 0.4 ? "#1a1a1a" : "#fafafa";
}

type ThemeInput = { primary_color?: string | null; secondary_color?: string | null; theme_colors?: unknown } | string | null | undefined;

/** Returns CSS variable overrides so the organization's page, tournaments and scoreboards use its chosen colors. */
export function organizationThemeStyle(input: ThemeInput): CSSProperties | undefined {
  const settings = typeof input === "string" ? { primary_color: input } : input ?? {};
  const vars: Record<string, string> = {};
  const set = (names: string[], value: unknown) => {
    if (typeof value === "string" && HEX.test(value)) for (const n of names) vars[n] = value;
  };
  const primary = settings.primary_color;
  set(["--primary", "--ring", "--ember"], primary);
  if (typeof primary === "string" && HEX.test(primary)) vars["--primary-foreground"] = readableOn(primary);
  const secondary = settings.secondary_color;
  set(["--secondary"], secondary);
  if (typeof secondary === "string" && HEX.test(secondary)) vars["--secondary-foreground"] = readableOn(secondary);
  const t = (settings.theme_colors && typeof settings.theme_colors === "object" ? settings.theme_colors : {}) as Record<string, unknown>;
  set(["--background"], t["background"]);
  set(["--card", "--popover", "--muted"], t["card"]);
  set(["--foreground", "--card-foreground", "--popover-foreground", "--accent-foreground"], t["foreground"]);
  set(["--muted-foreground"], t["muted_foreground"]);
  set(["--border", "--input"], t["border"]);
  set(["--accent"], t["accent"]);
  if (vars["--background"]) vars["backgroundColor"] = vars["--background"];
  if (vars["--foreground"]) vars["color"] = vars["--foreground"];
  if (!Object.keys(vars).length) return undefined;
  const { backgroundColor, color, ...css } = vars;
  return { ...css, ...(backgroundColor ? { backgroundColor } : {}), ...(color ? { color } : {}) } as CSSProperties;
}

/** Collects theme_* form fields into a clean color object. */
export function themeColorsFromForm(settings: Record<string, string>) {
  return Object.fromEntries(themeColorFields.map(([k]) => [k, settings[`theme_${k}`] ?? ""]).filter(([, v]) => HEX.test(v!)));
}
