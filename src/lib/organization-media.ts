const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type MediaKind = "tournaments" | "photos" | "highlights";

export function organizationMediaPath(organizationId: string, kind: MediaKind, fileName: string, fileId: string) {
  if (!UUID.test(organizationId) || !UUID.test(fileId)) throw new Error("Organisation ou fichier invalide.");
  const extension = (fileName.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  return `organizations/${organizationId}/${kind}/${fileId}.${extension}`;
}

/** Historical unprefixed assets belong exclusively to the central club. */
export function mediaBelongsToOrganization(path: string, organizationId: string, centralId: string) {
  if (path.includes("..") || path.includes("\\") || path.startsWith("/")) return false;
  if (path.startsWith(`organizations/${organizationId}/`)) return /^organizations\/[0-9a-f-]{36}\/(tournaments|photos|highlights)\/[^/]+$/i.test(path);
  return organizationId === centralId && /^(tournaments|photos|highlights)\/[^/]+$/.test(path);
}