import React, { useState, useRef, useEffect } from "react";
import { Download, X, Smartphone, Monitor, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "../hooks/usePwaInstall";

export function InstallButton({ className }: { className?: string }) {
  const { canInstall, hasNativePrompt, install, isIos } = usePwaInstall();
  const [showGuide, setShowGuide] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showGuide) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShowGuide(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showGuide]);

  if (!canInstall) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      await install();
    } else {
      setShowGuide(v => !v);
    }
  };

  return (
    <div className={`relative ${className ?? ""}`} ref={ref}>
      <Button variant="outline" size="sm" onClick={handleClick} className="gap-1.5">
        <Download size={14} />
        <span>App installieren</span>
      </Button>

      {showGuide && (
        <div className="absolute right-0 top-full mt-2 z-50 w-72 bg-card border border-border rounded-xl shadow-xl p-4 space-y-3 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">App installieren</p>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="p-1 rounded-md text-muted-foreground hover:bg-muted"
            >
              <X size={14} />
            </button>
          </div>

          {isIos ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-muted shrink-0">
                  <Share size={14} className="text-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium">Safari öffnen</p>
                  <p className="text-xs text-muted-foreground">
                    Tippe auf das Teilen-Symbol <strong>↑</strong> unten in der Leiste
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-muted shrink-0">
                  <Smartphone size={14} className="text-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium">Zum Home-Bildschirm</p>
                  <p className="text-xs text-muted-foreground">
                    Wähle <strong>„Zum Home-Bildschirm"</strong> und tippe <strong>Hinzufügen</strong>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <Monitor size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium">Chrome / Edge (Desktop)</p>
                  <p className="text-xs text-muted-foreground">
                    Klicke auf das <strong>⊕</strong>-Symbol in der Adressleiste oder öffne das
                    Browser-Menü → <strong>„App installieren"</strong>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 rounded-lg bg-primary/10 shrink-0">
                  <Smartphone size={14} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium">Android (Chrome)</p>
                  <p className="text-xs text-muted-foreground">
                    Tippe auf das Dreipunkt-Menü <strong>⋮</strong> →{" "}
                    <strong>„App installieren"</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground border-t border-border pt-2">
            Die App ist dann offline nutzbar und funktioniert wie eine native App.
          </p>
        </div>
      )}
    </div>
  );
}
