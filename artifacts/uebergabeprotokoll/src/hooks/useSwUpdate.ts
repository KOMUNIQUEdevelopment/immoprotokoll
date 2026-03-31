import { useEffect, useRef } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * Wraps vite-plugin-pwa's official useRegisterSW hook with:
 * - Immediate update check on mount
 * - 30-second polling interval
 * - Update check on window focus and visibility change
 *
 * Exposes the same interface as before so App.tsx needs no changes:
 *   { needsUpdate, applyUpdate, dismiss }
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

      // Immediate check for an already-waiting SW
      reg.update().catch(() => {});

      // Poll every 30 s so long-lived tabs pick up updates
      const id = setInterval(() => reg.update().catch(() => {}), 30_000);

      // Check when the user returns to the tab / app window
      const check = () => reg.update().catch(() => {});
      window.addEventListener("focus", check);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });

      // Clean up on unmount (best-effort — normally the hook lives forever)
      return () => {
        clearInterval(id);
        window.removeEventListener("focus", check);
      };
    },
    onRegisterError(err) {
      console.warn("[SW] Registration error:", err);
    },
  });

  const applyUpdate = () => {
    // updateServiceWorker(true) → tells the waiting SW to skip waiting, then reloads
    updateServiceWorker(true).catch(() => window.location.reload());
  };

  const dismiss = () => setNeedsUpdate(false);

  return { needsUpdate, applyUpdate, dismiss };
}
