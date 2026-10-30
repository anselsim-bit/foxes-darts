import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { handlePreloadError } from "./lib/preload-recovery";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};

// After an update, an open tab may request files that no longer exist; reload once to fetch the new version.
if (typeof window !== "undefined") {
  const key = "foxes:stale-reload";
  const recover = (msg: string) => {
    if (!/dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(msg)) return false;
    try {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, "1");
      window.location.reload();
      return true;
    } catch {
      return false;
    }
  };
  window.addEventListener("vite:preloadError", (e) => handlePreloadError(e, () => recover("dynamically imported module")));
  window.addEventListener("unhandledrejection", (e) => recover(String((e.reason as Error)?.message ?? e.reason)));
  window.addEventListener("error", (e) => recover(String(e.message)));
  window.setTimeout(() => { try { sessionStorage.removeItem(key); } catch { /* Storage may be disabled. */ } }, 10000);
}
