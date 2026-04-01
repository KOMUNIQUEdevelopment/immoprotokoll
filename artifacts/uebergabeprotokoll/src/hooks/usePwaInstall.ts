import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already running as installed PWA
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Pick up the event captured globally in main.tsx before React mounted.
    // Chrome fires beforeinstallprompt very early — often before any useEffect
    // runs — so we store it on window and grab it here.
    const deferred = (window as any).__deferredInstallPrompt as BeforeInstallPromptEvent | undefined;
    if (deferred) {
      setPromptEvent(deferred);
      (window as any).__deferredInstallPrompt = undefined;
    }

    // Also listen for future events (e.g. if the user dismissed and Chrome
    // fires again later, or on first load when timing is different).
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const install = async (): Promise<"native" | "manual"> => {
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
        setPromptEvent(null);
      }
      return "native";
    }
    return "manual";
  };

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  // Android Chrome (or other browsers) that can install but have no native prompt yet
  const isAndroid = !isIos && /android/i.test(navigator.userAgent);

  return {
    canInstall: !isInstalled,
    hasNativePrompt: !!promptEvent,
    install,
    isInstalled,
    isIos,
    isAndroid,
  };
}
