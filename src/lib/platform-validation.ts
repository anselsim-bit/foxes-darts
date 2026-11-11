export const INVITATION_DAYS = 7;
export const RESERVED_SLUGS = ["admin","api","auth","compteur","classements","create-organization","dashboard","galerie","inscription","invitation","mcp","mon-espace","o","reset-password","tournois","lovable"];
export function organizationSlug(value: string) {
  const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
  return RESERVED_SLUGS.includes(slug) ? `${slug}-club` : slug;
}
export function safeColor(value: string) {
  if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error("Couleur invalide.");
  return value;
}
export function invitationIsUsable(status: string, expiresAt: string, now = Date.now()) {
  return status === "pending" && Date.parse(expiresAt) > now;
}