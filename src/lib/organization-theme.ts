import type { CSSProperties } from "react";

const HEX = /^#[0-9a-f]{6}$/i;

/** Returns CSS variable overrides so a tournament and its scoreboard use the organization's main color. */
export function organizationThemeStyle(primary?: string | null): CSSProperties | undefined {
  if (!primary || !HEX.test(primary)) return undefined;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(primary.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r!) + 0.7152 * lin(g!) + 0.0722 * lin(b!);
  const foreground = luminance > 0.4 ? "#1a1a1a" : "#fafafa";
  return { ["--primary" as string]: primary, ["--ring" as string]: primary, ["--primary-foreground" as string]: foreground } as CSSProperties;
}
