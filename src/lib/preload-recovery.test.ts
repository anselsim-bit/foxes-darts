import { describe, expect, it, vi } from "vitest";
import { handlePreloadError } from "./preload-recovery";

describe("stale page recovery", () => {
  it("does not swallow the import failure when a reload has already been attempted", () => {
    const event = new Event("vite:preloadError", { cancelable: true });
    handlePreloadError(event, () => false);
    expect(event.defaultPrevented).toBe(false);
  });

  it("suppresses the import failure only when a reload is underway", () => {
    const event = new Event("vite:preloadError", { cancelable: true });
    const recover = vi.fn(() => true);
    handlePreloadError(event, recover);
    expect(recover).toHaveBeenCalledOnce();
    expect(event.defaultPrevented).toBe(true);
  });
});