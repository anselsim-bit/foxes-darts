export function signupAgeMetadata(ageBand: string, parentalAgreement: boolean) {
  if (ageBand !== "13-14" && ageBand !== "15plus") throw new Error("L’inscription est réservée aux personnes de 13 ans et plus.");
  if (ageBand === "13-14" && !parentalAgreement) throw new Error("Avant 15 ans, l’accord d’un parent ou représentant légal est nécessaire.");
  return { age_band: ageBand, parental_agreement: ageBand === "13-14" && parentalAgreement, age_policy_version: 1 };
}