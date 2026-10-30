/** Only suppress a failed import when navigation is actually being replaced by a reload. */
export function handlePreloadError(event: Event, recover: () => boolean) {
  if (recover()) event.preventDefault();
}