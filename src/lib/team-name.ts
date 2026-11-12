const initial = (last: string) => { const c = last.trim().charAt(0).toUpperCase(); return c ? ` ${c}.` : ""; };
/** Default doublette name: "Prénom N. & Prénom N." (N. = first letter of the last name). */
export function doubletteName(first1: string, last1: string, first2: string, last2: string) {
  return `${first1.trim()}${initial(last1)} & ${first2.trim()}${initial(last2)}`;
}
