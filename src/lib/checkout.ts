// Suggests the next darts to throw in an X01 game (checkout advice).
type Throw = { label: string; value: number; isDouble: boolean };

const THROWS: Throw[] = (() => {
  const t: Throw[] = [];
  for (let n = 20; n >= 1; n--) t.push({ label: `T${n}`, value: n * 3, isDouble: false });
  t.push({ label: "Bull", value: 50, isDouble: true });
  for (let n = 20; n >= 1; n--) t.push({ label: `D${n}`, value: n * 2, isDouble: true });
  t.push({ label: "25", value: 25, isDouble: false });
  for (let n = 20; n >= 1; n--) t.push({ label: `S${n}`, value: n, isDouble: false });
  return t;
})();

// Preferred finishing doubles (most common pro outs first).
const DOUBLE_PREF = [20, 16, 8, 18, 12, 10, 4, 2, 6, 14, 9, 19, 11, 13, 15, 17, 7, 5, 3, 1];
const doubleRank = (t: Throw) =>
  t.label === "Bull" ? 25 : DOUBLE_PREF.indexOf(Number(t.label.slice(1)));
const setupRank = (t: Throw) => (t.label.startsWith("S") ? 0 : t.label.startsWith("T") ? 1 : 2);

function findFinish(score: number, darts: number, doubleOut: boolean): Throw[] | null {
  for (let n = 1; n <= darts; n++) {
    let best: Throw[] | null = null;
    const search = (left: number, path: Throw[]) => {
      if (path.length === n - 1) {
        const finals = THROWS.filter((t) => t.value === left && (!doubleOut || t.isDouble));
        finals.sort((a, b) => (doubleOut ? doubleRank(a) - doubleRank(b) : setupRank(b) - setupRank(a)));
        const f = finals[0];
        if (f) {
          const cand = [...path, f];
          if (!best || score_(cand) < score_(best)) best = cand;
        }
        return;
      }
      for (const t of THROWS) if (t.value < left) search(left - t.value, [...path, t]);
    };
    search(score, []);
    if (best) return best;
  }
  return null;
}

// Lower is better: prefer singles/trebles on the big numbers for set-up darts, then a good double.
function score_(path: Throw[]) {
  return path.reduce((s, t, i) => {
    if (i === path.length - 1) return s + (t.isDouble ? doubleRank(t) * 8 : 0);
    const n = t.label === "25" ? 25 : Number(t.label.slice(1));
    return s + (20 - Math.min(n, 20)) * 2 + (t.label.startsWith("D") ? 30 : 0) + (t.label === "25" ? 10 : 0);
  }, 0);
}

export function suggestNextDarts(score: number, dartsLeft: number, doubleOut: boolean): { darts: string[]; note: string } {
  if (score <= 0) return { darts: [], note: "" };
  if (doubleOut && score === 1) return { darts: [], note: "Impossible de finir : le tour sera perdu." };
  const finish = findFinish(score, dartsLeft, doubleOut);
  if (finish) return { darts: finish.map((t) => t.label), note: "Sortie possible !" };
  if (score > 60 * dartsLeft + 50) return { darts: ["T20"], note: "Marquez un maximum de points." };
  // Not finishable this visit: leave a comfortable double (40 = D20, 32 = D16) for next time.
  for (const target of doubleOut ? [40, 32, 36, 24, 16] : [60, 50, 40]) {
    const need = score - target;
    const t =
      THROWS.find((x) => x.value === need && (x.label.startsWith("S") || x.label === "25")) ??
      THROWS.find((x) => x.value === need && x.label.startsWith("T"));
    if (t) return { darts: [t.label], note: `Laissez ${target} pour la prochaine volée.` };
  }
  return { darts: ["T20"], note: "Marquez un maximum de points." };
}
