import React, { useState, useEffect } from "react";
import { Download, X, Share2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "../hooks/usePwaInstall";

const DISMISSED_KEY = "immo-pwa-install-dismissed-until";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

interface PwaInstallBannerProps {
  suppressWhenUpdatePending?: boolean;
}

export function PwaInstallBanner({ suppressWhenUpdatePending = false }: PwaInstallBannerProps) {
  const { canInstall, hasNativePrompt, install, isIos, isAndroid } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (!canInstall) return;
    const until = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (Date.now() < until) return;
    const t = setTimeout(() => setVisible(true), 4000);
    return () => clearTimeout(t);
  }, [canInstall]);

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + DISMISS_MS));
  };

  const handleInstall = async () => {
    if (hasNativePrompt) {
      // Android Chrome native install dialog
      await install();
      setVisible(false);
    } else {
      // Fallback: show manual instructions (iOS Safari or Android without prompt)
      setShowGuide(v => !v);
    }
  };

  if (!canInstall || !visible || suppressWhenUpdatePending) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 sm:left-auto sm:translate-x-0 sm:right-4 px-4 sm:px-0">
      <div className="bg-white border border-neutral-200 rounded-2xl shadow-xl w-[min(320px,calc(100vw-2rem))] overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3">
          <img
            src={`${import.meta.env.BASE_URL}immoprotokoll-logo-black.png`}
            alt="ImmoProtokoll"
            className="h-8 w-8 rounded-lg shrink-0 mt-0.5"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-black leading-tight">App installieren</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isIos
                ? "Zum Home-Bildschirm hinzufügen"
                : "ImmoProtokoll als App speichern"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <Button
              size="sm"
              onClick={handleInstall}
              className="bg-black text-white hover:bg-neutral-800 gap-1.5 font-semibold text-xs h-7 px-2.5"
            >
              {isIos ? <Share2 size={12} /> : <Download size={12} />}
              {isIos
                ? "Anleitung"
                : hasNativePrompt
                  ? "Installieren"
                  : "Anleitung"}
            </Button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors shrink-0"
              title="Später"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {showGuide && (
          <div className="border-t border-neutral-100 px-4 py-3 space-y-2">
            {isIos ? (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-neutral-400 w-4 shrink-0">1.</span>
                  <p className="text-xs text-neutral-600">
                    Tippe auf <strong className="text-black">↑ Teilen</strong> unten in Safari
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-neutral-400 w-4 shrink-0">2.</span>
                  <p className="text-xs text-neutral-600">
                    Wähle <strong className="text-black">„Zum Home-Bildschirm"</strong>
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-neutral-400 w-4 shrink-0">3.</span>
                  <p className="text-xs text-neutral-600">
                    Tippe <strong className="text-black">Hinzufügen</strong>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-neutral-400 w-4 shrink-0">1.</span>
                  <p className="text-xs text-neutral-600">
                    Tippe auf <strong className="text-black">⋮ Drei Punkte</strong> oben rechts in Chrome
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-neutral-400 w-4 shrink-0">2.</span>
                  <p className="text-xs text-neutral-600">
                    Wähle <strong className="text-black">„App installieren"</strong> oder{" "}
                    <strong className="text-black">„Zum Startbildschirm"</strong>
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-semibold text-neutral-400 w-4 shrink-0">3.</span>
                  <p className="text-xs text-neutral-600">
                    Tippe <strong className="text-black">Installieren</strong> zur Bestätigung
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
