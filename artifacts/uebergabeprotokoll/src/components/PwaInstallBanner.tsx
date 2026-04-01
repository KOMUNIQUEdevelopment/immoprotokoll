import React, { useState, useEffect } from "react";
import { Download, X, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "../hooks/usePwaInstall";

const DISMISSED_KEY = "immo-pwa-install-dismissed-until";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

interface PwaInstallBannerProps {
  suppressWhenUpdatePending?: boolean;
}

export function PwaInstallBanner({ suppressWhenUpdatePending = false }: PwaInstallBannerProps) {
  const { canInstall, hasNativePrompt, install, isIos } = usePwaInstall();
  const [visible, setVisible] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

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
      await install();
      setVisible(false);
    } else if (isIos) {
      setShowIosGuide(v => !v);
    }
  };

  if (!canInstall || !visible || suppressWhenUpdatePending) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 sm:left-auto sm:translate-x-0 sm:right-4 px-4 sm:px-0">
      <div className="flex items-start gap-3 bg-white border border-neutral-200 rounded-2xl shadow-xl px-4 py-3 w-[min(320px,calc(100vw-2rem))]">
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
          {showIosGuide && (
            <div className="mt-2 text-xs text-neutral-600 space-y-1 border-t border-neutral-100 pt-2">
              <p>1. Tippe auf <strong>↑ Teilen</strong> unten in Safari</p>
              <p>2. Wähle <strong>„Zum Home-Bildschirm"</strong></p>
              <p>3. Tippe <strong>Hinzufügen</strong></p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <Button
            size="sm"
            onClick={handleInstall}
            className="bg-black text-white hover:bg-neutral-800 gap-1.5 font-semibold text-xs h-7 px-2.5"
          >
            {isIos ? <Share2 size={12} /> : <Download size={12} />}
            {isIos ? "Anleitung" : "Installieren"}
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
    </div>
  );
}
