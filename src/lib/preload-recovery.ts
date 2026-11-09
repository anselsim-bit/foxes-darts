/** Only suppress a failed import when navigation is actually being replaced by a reload. */
export function handlePreloadError(event: Event, recover: () => boolean) {
  if (recover()) event.preventDefault();
}

export function isModuleLoadError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(message);
}

/** Error boundaries catch route imports before global rejection handlers can see them. */
export function recoverStaleModule(error: unknown) {
  if (!isModuleLoadError(error) || typeof window === "undefined") return false;
  try {
    const key = "foxes:stale-reload";
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}