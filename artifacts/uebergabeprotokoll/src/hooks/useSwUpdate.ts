import { useEffect, useState, useRef, useCallback } from "react";

/**
 * Detects when a new Service Worker version is waiting to activate and
 * exposes helpers to apply it or dismiss the notification.
 *
 * Improvements over the previous version:
 * - Uses `navigator.serviceWorker.ready` (guaranteed registration) instead
 *   of `getRegistration()` which may return undefined during startup.
 * - Attaches the `updatefound` listener exactly ONCE (guarded by a ref) so
 *   repeated polling never creates duplicate handlers.
 * - Also polls `reg.waiting` directly in the interval as a fallback for
 *   browsers that don't fire `updatefound` reliably.
 * - Listens for `visibilitychange` and `window focus` events so the desktop
 *   PWA checks for updates whenever the user returns to the window.
 * - Interval reduced to 30 s (was 60 s) for faster detection.
 */
export function useSwUpdate() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const regRef = useRef<ServiceWorkerRegistration | null>(null);
  const listenerAttached = useRef(false);

  // Stable: only show the banner when a NEW worker is waiting and an old
  // one is actually controlling the page (so a reload really upgrades it).
  const checkWaiting = useCallback((reg: ServiceWorkerRegistration) => {
    if (reg.waiting && navigator.serviceWorker.controller) {
      setNeedsUpdate(true);
    }
  }, []);

  // Stable: attach the updatefound / statechange chain exactly once.
  const attachListener = useCallback(
    (reg: ServiceWorkerRegistration) => {
      if (listenerAttached.current) return;
      listenerAttached.current = true;

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            setNeedsUpdate(true);
          }
        });
      });
    },
    []
  );

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let intervalId: ReturnType<typeof setInterval>;

    const init = async () => {
      try {
        // `ready` resolves once a SW controls the page – always returns a reg.
        const reg = await navigator.serviceWorker.ready;
        regRef.current = reg;

        // Already waiting? (e.g. browser checked in the background before we
        // mounted, or the app was already open when the new SW downloaded.)
        checkWaiting(reg);

        // Attach the event-driven listener once.
        attachListener(reg);

        // Force an immediate network check.
        reg.update().catch(() => {});

        // Periodic network check every 30 s + direct waiting check as
        // fallback for browsers that skip updatefound.
        intervalId = setInterval(() => {
          reg.update().catch(() => {});
          checkWaiting(reg);
        }, 30_000);
      } catch {
        // SW not supported / blocked by browser – silently ignore.
      }
    };

    init();

    // Desktop PWA: user switches back to the app window.
    const onFocus = () => {
      const reg = regRef.current;
      if (!reg) return;
      reg.update().catch(() => {});
      checkWaiting(reg);
    };

    // Tab / app becomes visible again (covers mobile backgrounding too).
    const onVisibility = () => {
      if (document.visibilityState === "visible") onFocus();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [checkWaiting, attachListener]);

  const applyUpdate = useCallback(() => {
    const reg = regRef.current;
    if (reg?.waiting) {
      // Tell the waiting SW to skip waiting, then reload once it controls.
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => window.location.reload(),
        { once: true }
      );
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      // Fallback: simple reload (browser will pick up the new SW on next nav).
      window.location.reload();
    }
  }, []);

  const dismiss = useCallback(() => setNeedsUpdate(false), []);

  return { needsUpdate, applyUpdate, dismiss };
}
