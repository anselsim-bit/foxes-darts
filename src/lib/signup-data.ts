export type SignupKind = "player" | "organizer";
export const organizerFields = [
  ["organization_name", "Nom de l’organisation"],
  ["responsible_name", "Nom du responsable"],
  ["phone", "Téléphone"],
  ["address", "Adresse"],
  ["postal_code", "Code postal"],
  ["city", "Ville"],
] as const;

// Signup preferences are not roles: permissions remain in organization_members.
export function signupMetadata(kind: SignupKind, displayName: string, contact: Record<string, string>, names: { firstName?: string; lastName?: string } = {}) {
  if (!displayName.trim()) throw new Error("Indiquez votre nom de joueur.");
  const firstName = names.firstName?.trim() ?? "";
  const lastName = names.lastName?.trim() ?? "";
  if (kind === "player" && (!firstName || !lastName)) throw new Error("Indiquez votre prénom et votre nom.");
  if (kind === "organizer" && organizerFields.some(([key]) => !contact[key]?.trim())) {
    throw new Error("Renseignez toutes les coordonnées de l’organisateur.");
  }
  return {
    display_name: displayName.trim(),
    signup_kind: kind,
    ...(firstName ? { first_name: firstName.slice(0, 60) } : {}),
    ...(lastName ? { last_name: lastName.slice(0, 60) } : {}),
    ...(kind === "organizer" ? { organizer_contact: Object.fromEntries(organizerFields.map(([key]) => [key, contact[key]?.trim() ?? ""])) } : {}),
  };
}

export function signupDestination(kind: SignupKind, redirect?: string) {
  return redirect ?? (kind === "organizer" ? "/create-organization" : "/dashboard");
}