import React, { useState } from "react";
import { ClipboardList, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);

    await new Promise((r) => setTimeout(r, 300));

    const okEmail = email.trim().toLowerCase();
    const okPass = password;

    if (
      okEmail === "philipp@komunique.com" &&
      okPass === "TEMAHsDF$357yAjz"
    ) {
      localStorage.setItem("uebergabe_auth", "1");
      onLogin();
    } else {
      setError(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-1">
            <ClipboardList size={26} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold">Übergabeprotokoll</h1>
          <p className="text-sm text-muted-foreground">Villa Albstadt · Anmelden</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              E-Mail
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(false); }}
              placeholder="name@beispiel.de"
              autoComplete="email"
              autoFocus
              required
              className={error ? "border-destructive" : ""}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Passwort
            </label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(false); }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className={`pr-10 ${error ? "border-destructive" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium">
              E-Mail oder Passwort falsch. Bitte erneut versuchen.
            </p>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <LogIn size={15} />
            )}
            {loading ? "Wird geprüft…" : "Anmelden"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground/60">
          Nur für autorisierte Nutzer
        </p>
      </div>
    </div>
  );
}
