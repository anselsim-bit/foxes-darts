export type TournamentAdvertisement = { name: string; logo_path: string };

export function validateAdvertisements(value: unknown, organizationId: string): TournamentAdvertisement[] {
  if (!Array.isArray(value) || value.length > 30) throw new Error("Liste de publicités invalide (30 maximum).");
  return value.map(item => {
    if (!item || typeof item !== "object") throw new Error("Publicité invalide.");
    const { name, logo_path } = item as Record<string, unknown>;
    if (typeof name !== "string" || name.length > 120 || typeof logo_path !== "string" ||
      !logo_path.startsWith(`organizations/${organizationId}/`) ||
      !/^organizations\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.png$/.test(logo_path)) throw new Error("Nom ou logo de publicité invalide.");
    return { name: name.trim(), logo_path };
  });
}

export function visibleAdvertisements(enabled: boolean, advertisements: TournamentAdvertisement[]) {
  return enabled ? advertisements : [];
}