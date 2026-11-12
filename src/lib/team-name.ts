const initial = (last: string) => { const c = last.trim().charAt(0).toUpperCase(); return c ? ` ${c}.` : ""; };
/** First names only; initials distinguish identical first names. */
export function doubletteName(first1: string, last1: string, first2: string, last2: string, duplicates: Set<string> = new Set()) {
  const a = first1.trim();
  const b = first2.trim();
  const same = a.toLocaleLowerCase("fr") === b.toLocaleLowerCase("fr");
  return `${a}${same || duplicates.has(a.toLowerCase()) ? initial(last1) : ""} & ${b}${same || duplicates.has(b.toLowerCase()) ? initial(last2) : ""}`;
}
