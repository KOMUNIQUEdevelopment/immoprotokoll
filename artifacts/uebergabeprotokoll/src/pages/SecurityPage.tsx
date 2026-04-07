import React, { useState } from "react";
import { ArrowLeft, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface SecurityPageProps {
  mfaEnabled: boolean;
  onBack: () => void;
  onMfaChange: (enabled: boolean) => void;
}

export default function SecurityPage({ mfaEnabled, onBack, onMfaChange }: SecurityPageProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const toggleMfa = async () => {
    setLoading(true);
    try {
      const endpoint = mfaEnabled ? "/api/auth/mfa/disable" : "/api/auth/mfa/enable";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast({
          title: "Fehler",
          description: err.error ?? "Unbekannter Fehler",
          variant: "destructive",
        });
        return;
      }
      const newEnabled = !mfaEnabled;
      onMfaChange(newEnabled);
      toast({
        title: newEnabled ? "2FA aktiviert" : "2FA deaktiviert",
        description: newEnabled
          ? "Bei jedem Login erhalten Sie einen Code per E-Mail."
          : "Zwei-Faktor-Authentifizierung wurde deaktiviert.",
      });
    } catch {
      toast({
        title: "Verbindungsfehler",
        description: "Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="font-semibold text-sm text-black">Sicherheit</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`mt-0.5 shrink-0 p-2 rounded-lg ${mfaEnabled ? "bg-black" : "bg-neutral-100"}`}>
                {mfaEnabled
                  ? <ShieldCheck size={18} className="text-white" />
                  : <ShieldOff size={18} className="text-neutral-400" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-black">Zwei-Faktor-Authentifizierung</p>
                <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">
                  {mfaEnabled
                    ? "Aktiviert — bei jedem Login wird ein Code an Ihre E-Mail-Adresse gesendet."
                    : "Deaktiviert — Ihr Konto ist nur durch Ihr Passwort geschützt."
                  }
                </p>
              </div>
            </div>

            <Button
              variant={mfaEnabled ? "outline" : "default"}
              size="sm"
              onClick={() => { void toggleMfa(); }}
              disabled={loading}
              className={`shrink-0 ${mfaEnabled
                ? "border-neutral-200 hover:bg-neutral-50"
                : "bg-black text-white hover:bg-neutral-800"
              }`}
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : mfaEnabled ? "Deaktivieren" : "Aktivieren"}
            </Button>
          </div>

          {mfaEnabled && (
            <div className="px-5 py-3 bg-neutral-50 border-t border-neutral-100">
              <p className="text-xs text-neutral-500">
                Beim nächsten Login erhalten Sie einen 6-stelligen Code von <span className="font-medium text-neutral-700">noreply@immoprotokoll.com</span>. Der Code ist 10 Minuten gültig.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
