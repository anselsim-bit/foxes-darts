import { describe, expect, it, vi } from "vitest";
import { handlePreloadError, isModuleLoadError } from "./preload-recovery";

describe("stale page recovery", () => {
  it("recognizes route import failures caught by the router boundary", () => {
    expect(isModuleLoadError(new Error("error loading dynamically imported module: /src/routes/auth.tsx?tsr-split=component"))).toBe(true);
    expect(isModuleLoadError(new Error("Importing a module script failed"))).toBe(true);
  });
  it("does not reload for ordinary application errors", () => {
    expect(isModuleLoadError(new Error("Invalid password"))).toBe(false);
  });
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