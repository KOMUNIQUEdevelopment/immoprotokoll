import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Two-layer PWA update detection:
 *
 * Layer 1 – Service Worker update check (reg.update())
 *   Works when the browser can re-fetch sw.js from the network.
 *   May be blocked by CDN/HTTP caching on Replit's static hosting.
 *
 * Layer 2 – Version file polling (_version.json?t=<timestamp>)
 *   Fetched with a unique query param + cache:'no-store' on every poll so
 *   it bypasses both the HTTP cache AND the Service Worker's precache.
 *   The SW is configured with a NetworkOnly rule for _version.json so it
 *   never intercepts these requests.
 *   If the buildId changes from what was seen at load → show update banner.
 *
 * Either layer triggering needsUpdate is sufficient to show the banner.
 */
export function useSwUpdate() {
  const regRef = useRef<ServiceWorkerRegistration | undefined>(undefined);

  const {
    needRefresh: [needsUpdate, setNeedsUpdate],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(reg) {
      if (!reg) return;
      regRef.current = reg;

      // Layer 1: immediate + periodic SW update check
      reg.update().catch(() => {});
      const swPoll = setInterval(() => reg.update().catch(() => {}), 30_000);

      const check = () => reg.update().catch(() => {});
      window.addEventListener("focus", check);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });

      return () => {
        clearInterval(swPoll);
        window.removeEventListener("focus", check);
      };
    },
    onRegisterError(err) {
      console.warn("[SW] Registration error:", err);
    },
  });

  // Layer 2: version file polling — fully independent of the SW mechanism
  useEffect(() => {
    const base = import.meta.env.BASE_URL ?? "/";
    const versionUrl = `${base}_version.json`;

    let loadedBuildId: string | null = null;
    let destroyed = false;

    const fetchBuildId = async (): Promise<string | null> => {
      try {
        // Unique query param busts HTTP cache; cache:'no-store' bypasses it too.
        // SW is configured NetworkOnly for _version.json so it never caches this.
        const res = await fetch(`${versionUrl}?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!res.ok) return null;
        const data = await res.json();
        return typeof data.buildId === "string" ? data.buildId : null;
      } catch {
        return null;
      }
    };

    const init = async () => {
      loadedBuildId = await fetchBuildId();
    };

    const poll = async () => {
      if (destroyed) return;
      const currentBuildId = await fetchBuildId();
      if (
        currentBuildId !== null &&
        loadedBuildId !== null &&
        currentBuildId !== loadedBuildId
      ) {
        setNeedsUpdate(true);
      }
    };

    init();

    // Poll every 60 s + check on focus / visibility
    const versionPoll = setInterval(poll, 60_000);
    const onFocus = () => poll();
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      destroyed = true;
      clearInterval(versionPoll);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [setNeedsUpdate]);

  const applyUpdate = () => {
    // Tell the waiting SW to skip waiting and reload.
    // Always schedule a hard reload as fallback in case updateServiceWorker
    // resolves without actually reloading (e.g. no SW waiting state).
    updateServiceWorker(true).catch(() => {});
    setTimeout(() => window.location.reload(), 1500);
  };

  const dismiss = () => setNeedsUpdate(false);

  return { needsUpdate, applyUpdate, dismiss };
}
