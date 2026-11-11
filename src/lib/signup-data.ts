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
export function signupMetadata(kind: SignupKind, displayName: string, contact: Record<string, string>) {
  if (!displayName.trim()) throw new Error("Indiquez votre nom de joueur.");
  if (kind === "organizer" && organizerFields.some(([key]) => !contact[key]?.trim())) {
    throw new Error("Renseignez toutes les coordonnées de l’organisateur.");
  }
  return {
    display_name: displayName.trim(),
    signup_kind: kind,
    ...(kind === "organizer" ? { organizer_contact: Object.fromEntries(organizerFields.map(([key]) => [key, contact[key]?.trim() ?? ""])) } : {}),
  };
}

export function signupDestination(kind: SignupKind, redirect?: string) {
  return redirect ?? (kind === "organizer" ? "/create-organization" : "/dashboard");
}