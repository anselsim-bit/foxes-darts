import { useState } from "react";
import { Checkbox } from "./ui/checkbox";
import { roundLabels, validateRoundSettings, type RoundSettings, type GameRule } from "@/lib/round-settings";

export function RoundSettingsEditor({ initial, defaults, pools, consolation, onChange }: { initial?: unknown; defaults: Record<"pool" | "bracket" | "consolation", GameRule>; pools: boolean; consolation: boolean; onChange?: (v: RoundSettings) => void }) {
  const [value, setValue] = useState<RoundSettings>(() => validateRoundSettings(initial) ?? { version: 1, phases: defaults, rounds: {} });
  const update = (v: RoundSettings) => { setValue(v); onChange?.(v); };
  const controls = (label: string, r: GameRule, change: (r: GameRule) => void) => <div className="grid min-w-0 gap-3 sm:grid-cols-3">
    <label className="grid gap-1">Manches gagnantes<input aria-label={`${label} — manches gagnantes`} type="number" min={1} max={20} value={r.legsToWin} onChange={e => change({ ...r, legsToWin: Number(e.target.value) })} className="w-full rounded-md border border-input bg-background px-3 py-2" /></label>
    <label className="grid gap-1">Score de départ<select aria-label={`${label} — score de départ`} value={r.start} onChange={e => change({ ...r, start: Number(e.target.value) })} className="w-full rounded-md border border-input bg-background px-3 py-2"><option value={301}>301</option><option value={501}>501</option></select></label>
    <label className="grid gap-1">Sortie<select aria-label={`${label} — sortie`} value={r.doubleOut ? "double" : "simple"} onChange={e => change({ ...r, doubleOut: e.target.value === "double" })} className="w-full rounded-md border border-input bg-background px-3 py-2"><option value="simple">Simple</option><option value="double">Double</option></select></label>
  </div>;
  return <div className="space-y-5 text-sm sm:col-span-2"><input type="hidden" name="game_settings" value={JSON.stringify(value)} />
    {(["pool", "bracket", "consolation"] as const).filter(p => p === "bracket" || (pools && (p !== "consolation" || consolation))).map(phase => {
      const label = phase === "pool" ? "Poules" : phase === "bracket" ? "Phase finale" : "Consolante";
      const base = value.phases[phase] ?? defaults[phase];
      return <section key={phase} className="space-y-3 border-t border-border pt-4"><h3 className="text-lg">{label}</h3>{controls(label, base, r => update({ ...value, phases: { ...value.phases, [phase]: r } }))}
        {phase !== "pool" && <details><summary className="cursor-pointer py-2 font-semibold text-primary">Réglages par étape</summary><div className="space-y-4">
          {[...roundLabels.map((name, i) => ({ name, key: `${phase}:${i}` })), ...(phase === "bracket" ? [{ name: "Petite finale", key: "small_final" }] : [])].map(({ name, key }) => {
            const r = value.rounds[key]; const title = `${label} — ${name}`;
            return <div key={key} className="space-y-2 border-t border-border pt-3"><label className="flex items-center gap-2"><Checkbox checked={!!r} onCheckedChange={checked => { const rounds = { ...value.rounds }; if (checked) rounds[key] = { ...base }; else delete rounds[key]; update({ ...value, rounds }); }} />{name}</label>{r && controls(title, r, next => update({ ...value, rounds: { ...value.rounds, [key]: next } }))}</div>;
          })}</div></details>}
      </section>;
    })}
  </div>;
}