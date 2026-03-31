import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

declare const __APP_BUILD_ID__: string;

/**
 * Two-layer PWA update detection:
 *
 * Layer 1 – Service Worker update check (reg.update())
 *   Works when the browser can re-fetch sw.js from the network.
 *   May be blocked by CDN/HTTP caching on Replit's static hosting.
 *
 * Layer 2 – Version file polling (_version.json?t=<timestamp>)
 *   The app's own build ID is embedded at compile time via __APP_BUILD_ID__.
 *   On every poll the network-fetched buildId is compared against the
 *   bundle-embedded ID. If they differ the new deploy is detected — even
 *   when the old JS is still being served from a stale SW / HTTP cache.
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

  // Layer 2: version file polling — fully independent of the SW mechanism.
  // Uses the compile-time build ID (__APP_BUILD_ID__) so the check works even
  // when the old bundle is loaded from a stale SW cache. No network init needed.
  useEffect(() => {
    const base = import.meta.env.BASE_URL ?? "/";
    const versionUrl = `${base}_version.json`;

    // The bundle's own build ID, embedded at compile time by Vite define.
    const myBuildId: string =
      typeof __APP_BUILD_ID__ !== "undefined" ? __APP_BUILD_ID__ : "";

    let destroyed = false;

    const fetchBuildId = async (): Promise<string | null> => {
      try {
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

    const poll = async () => {
      if (destroyed || !myBuildId) return;
      const serverBuildId = await fetchBuildId();
      if (serverBuildId !== null && serverBuildId !== myBuildId) {
        setNeedsUpdate(true);
      }
    };

    // Run immediately on mount, then every 60 s + on focus / visibility
    poll();
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
