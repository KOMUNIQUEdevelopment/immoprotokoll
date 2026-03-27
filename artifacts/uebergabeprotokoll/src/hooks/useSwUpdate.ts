import { useEffect, useState, useRef } from "react";

export function useSwUpdate() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const swReg = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const checkUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return;
        swReg.current = reg;

        if (reg.waiting) {
          setNeedsUpdate(true);
          return;
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              swReg.current = reg;
              setNeedsUpdate(true);
            }
          });
        });

        await reg.update();
      } catch {}
    };

    checkUpdate();
    const interval = setInterval(checkUpdate, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const applyUpdate = () => {
    const reg = swReg.current;
    if (!reg?.waiting) {
      window.location.reload();
      return;
    }
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    }, { once: true });
    reg.waiting.postMessage({ type: "SKIP_WAITING" });
  };

  const dismiss = () => setNeedsUpdate(false);

  return { needsUpdate, applyUpdate, dismiss };
}
