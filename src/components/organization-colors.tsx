import { useState } from "react";
import { themeColorFields, organizationThemeStyle } from "@/lib/organization-theme";

type Colors = { primary: string; secondary: string; theme: Record<string, string> };
const base = Object.fromEntries(themeColorFields.map(([k, , d]) => [k, d])) as Record<string, string>;
const PRESETS: { name: string; c: Colors }[] = [
  { name: "Braise (Foxes)", c: { primary: "#e85d3a", secondary: "#1a1a1a", theme: base } },
  { name: "Océan", c: { primary: "#2f8fd8", secondary: "#13202c", theme: { background: "#0f1a24", card: "#172634", foreground: "#e8f1f8", muted_foreground: "#8ea4b6", border: "#27394a", accent: "#1d3346" } } },
  { name: "Forêt", c: { primary: "#3fae6a", secondary: "#14211a", theme: { background: "#111a15", card: "#1a261f", foreground: "#e9f3ec", muted_foreground: "#93a89a", border: "#2a3b31", accent: "#203a2b" } } },
  { name: "Royal", c: { primary: "#d4a72c", secondary: "#1c1530", theme: { background: "#151026", card: "#211936", foreground: "#f1ecfa", muted_foreground: "#a49bb8", border: "#352b4f", accent: "#2d2348" } } },
  { name: "Clair", c: { primary: "#d94a2b", secondary: "#e9e5e0", theme: { background: "#f7f5f2", card: "#ffffff", foreground: "#1f1f1f", muted_foreground: "#6b6560", border: "#ddd7d0", accent: "#f1e4de" } } },
];

/** Palette picker: ready-made themes, live preview, and optional fine-tuning; submits the same form fields as before. */
export function OrganizationColors({ initial }: { initial: { primary?: string | null | undefined; secondary?: string | null | undefined; theme?: Record<string, string> | undefined } }) {
  const [c, setC] = useState<Colors>({ primary: initial.primary ?? "#e85d3a", secondary: initial.secondary ?? "#1a1a1a", theme: { ...base, ...(initial.theme ?? {}) } });
  const same = (p: Colors) => p.primary === c.primary && p.secondary === c.secondary && themeColorFields.every(([k]) => p.theme[k] === c.theme[k]);
  const swatch = (label: string, value: string, onChange: (v: string) => void, name: string) => (
    <label key={name} className="flex items-center gap-3 text-sm">
      <input type="color" name={name} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent" />
      {label}
    </label>
  );
  return (
    <div className="space-y-4 sm:col-span-2">
      <div>
        <h3 className="text-lg">Couleurs de votre page</h3>
        <p className="text-sm text-muted-foreground">Choisissez un style tout prêt. L’aperçu montre le résultat.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {PRESETS.map((p) => (
          <button type="button" key={p.name} onClick={() => setC({ ...p.c, theme: { ...p.c.theme } })} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${same(p.c) ? "border-primary ring-2 ring-primary" : "border-border"}`}>
            <span className="flex overflow-hidden rounded-sm border border-border">
              {[p.c.theme["background"], p.c.theme["card"], p.c.primary].map((x, i) => <span key={i} className="h-5 w-4" style={{ background: x }} />)}
            </span>
            {p.name}
          </button>
        ))}
      </div>
      <div style={organizationThemeStyle({ primary_color: c.primary, secondary_color: c.secondary, theme_colors: c.theme })} className="rounded-lg border border-border bg-background p-4 text-foreground">
        <div className="rounded-md border border-border bg-card p-4">
          <p className="font-display text-lg">Aperçu · Tournoi du samedi</p>
          <p className="text-sm text-muted-foreground">12 équipes inscrites · Salle des fêtes</p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">Bouton principal</span>
            <span className="rounded-md bg-secondary px-3 py-1.5 text-sm text-secondary-foreground">Bouton secondaire</span>
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {swatch("Couleur principale (boutons, liens)", c.primary, (v) => setC({ ...c, primary: v }), "primary_color")}
        {swatch("Boutons secondaires", c.secondary, (v) => setC({ ...c, secondary: v }), "secondary_color")}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Réglages avancés (fond, texte, bordures…)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {themeColorFields.map(([k, label]) => swatch(label, c.theme[k] ?? base[k]!, (v) => setC({ ...c, theme: { ...c.theme, [k]: v } }), `theme_${k}`))}
        </div>
      </details>
    </div>
  );
}

/** Pool / consolation choices as checkboxes; each phase's game format is shown only when that phase is enabled. */
export function PoolOptions({ poolCount, consolation, tournament }: { poolCount?: number | null | undefined; consolation?: boolean | null | undefined; tournament?: Record<string, unknown> | undefined }) {
  const [pools, setPools] = useState((poolCount ?? 4) > 0);
  const [conso, setConso] = useState(consolation ?? true);
  const val = (prefix: string, k: string) => tournament?.[`${prefix}${k}`] ?? tournament?.[k];
  const format = (prefix: string, label: string, shown: boolean) => shown ? (
    <fieldset key={prefix} className="space-y-2 rounded-md border border-border p-3">
      <legend className="px-1">Format {label}</legend>
      <select name={`${prefix}start_score`} defaultValue={String(val(prefix, "start_score") ?? 501)} className="w-full rounded-md border border-input bg-background px-2 py-1.5"><option>501</option><option>301</option></select>
      <label className="block"><input type="checkbox" name={`${prefix}double_out`} defaultChecked={Boolean(val(prefix, "double_out"))} /> Sortie double</label>
    </fieldset>
  ) : <input key={prefix} type="hidden" name={`${prefix}start_score`} value={String(val(prefix, "start_score") ?? 501)} />;
  return (
    <div className="space-y-3 text-sm sm:col-span-2">
      <label className="block"><input type="checkbox" checked={pools} onChange={(e) => setPools(e.target.checked)} /> Phase de poules</label>
      {pools ? (
        <div className="space-y-2 pl-6">
          <label className="block">Nombre de poules<input name="pools" type="number" min={1} defaultValue={(poolCount ?? 0) > 0 ? poolCount! : 4} className="ml-2 w-20 rounded-md border border-input bg-background px-2 py-1" /></label>
          {format("", "des poules", true)}
          <label className="block"><input type="checkbox" name="pool_double_limit" defaultChecked={(tournament?.["pool_double_limit"] as boolean | undefined) ?? true} /> Limite de cinq tours de double en poules</label>
        </div>
      ) : <><input type="hidden" name="pools" value="0" />{format("", "", false)}</>}
      {format("final_", "de la phase finale", true)}
      <label className="block"><input type="checkbox" name="consolation" checked={conso} onChange={(e) => setConso(e.target.checked)} /> Phase de consolante</label>
      {conso ? <div className="pl-6">{format("consolation_", "de la consolante", true)}<label className="mt-2 block"><input type="checkbox" name="consolation_double_limit" defaultChecked={(tournament?.["consolation_double_limit"] as boolean | undefined) ?? true} /> Limite de cinq tours de double en consolante</label></div> : format("consolation_", "", false)}
    </div>
  );
}
