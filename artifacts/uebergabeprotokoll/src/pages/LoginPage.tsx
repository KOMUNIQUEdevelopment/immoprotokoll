import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, LogIn, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<{
    error?: string;
    mfaRequired?: boolean;
    mfaPendingToken?: string;
  }>;
  onVerifyMfa: (mfaPendingToken: string, code: string) => Promise<{ error?: string }>;
  onGoToRegister: () => void;
  onGoToForgotPassword?: () => void;
}

export default function LoginPage({ onLogin, onVerifyMfa, onGoToRegister, onGoToForgotPassword }: LoginPageProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // MFA step state
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaPendingToken, setMfaPendingToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaLoading, setMfaLoading] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mfaStep) {
      setTimeout(() => codeInputRef.current?.focus(), 100);
    }
  }, [mfaStep]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await onLogin(email.trim(), password);
    setLoading(false);
    if (result.mfaRequired && result.mfaPendingToken) {
      setMfaPendingToken(result.mfaPendingToken);
      setMfaStep(true);
      return;
    }
    if (result.error) {
      setError(result.error);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError("");
    const trimmedCode = mfaCode.replace(/\s/g, "");
    if (trimmedCode.length !== 6) {
      setMfaError("Bitte geben Sie den 6-stelligen Code ein");
      return;
    }
    setMfaLoading(true);
    const result = await onVerifyMfa(mfaPendingToken, trimmedCode);
    setMfaLoading(false);
    if (result.error) {
      setMfaError(result.error);
      setMfaCode("");
      codeInputRef.current?.focus();
    }
  };

  const handleMfaCodeChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 6);
    setMfaCode(digits);
    setMfaError("");
  };

  if (mfaStep) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center mx-auto">
              <ShieldCheck size={22} className="text-black" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-black">Zwei-Faktor-Verifizierung</h1>
              <p className="text-sm text-neutral-500">
                Wir haben einen Code an <strong>{email}</strong> gesendet.
              </p>
            </div>
          </div>

          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Bestätigungscode
              </label>
              <Input
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={mfaCode}
                onChange={(e) => handleMfaCodeChange(e.target.value)}
                placeholder="000000"
                autoComplete="one-time-code"
                maxLength={6}
                className={`text-center text-2xl tracking-[0.5em] font-mono border-neutral-300 focus-visible:ring-0 focus-visible:border-black ${mfaError ? "border-neutral-900" : ""}`}
              />
            </div>

            {mfaError && (
              <p className="text-xs text-foreground font-medium">{mfaError}</p>
            )}

            <Button
              type="submit"
              className="w-full gap-2 bg-black text-white hover:bg-neutral-800 border-0 rounded-lg"
              disabled={mfaLoading || mfaCode.length < 6}
            >
              {mfaLoading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <ShieldCheck size={15} />
              )}
              {mfaLoading ? "Prüfen…" : "Code bestätigen"}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setMfaStep(false);
                setMfaCode("");
                setMfaError("");
              }}
              className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-black transition-colors"
            >
              <ArrowLeft size={14} />
              Zurück zum Login
            </button>
          </div>

          <p className="text-xs text-center text-neutral-400">
            Kein Code erhalten? Warten Sie kurz und{" "}
            <button
              type="button"
              onClick={() => {
                setMfaStep(false);
                setMfaCode("");
              }}
              className="text-neutral-600 underline hover:text-black transition-colors"
            >
              erneut einloggen
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <img
            src={`${import.meta.env.BASE_URL}immoprotokoll-logo-black.png`}
            alt="ImmoProtokoll"
            className="h-10 mx-auto"
          />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-black">{t("auth.login")}</h1>
            <p className="text-sm text-neutral-500">{t("auth.welcomeBack")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
              {t("auth.email")}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="name@beispiel.de"
              autoComplete="email"
              autoFocus
              required
              className={`border-neutral-300 focus-visible:ring-0 focus-visible:border-black ${error ? "border-neutral-900" : ""}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
              {t("auth.password")}
            </label>
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className={`pr-10 border-neutral-300 focus-visible:ring-0 focus-visible:border-black ${error ? "border-neutral-900" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-0.5"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {onGoToForgotPassword && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onGoToForgotPassword}
                className="text-xs text-neutral-500 hover:text-black transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-foreground font-medium">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full gap-2 bg-black text-white hover:bg-neutral-800 border-0 rounded-lg"
            disabled={loading}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn size={15} />
            )}
            {loading ? t("auth.checking") : t("auth.loginAction")}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-neutral-500">
            {t("auth.noAccount")}{" "}
            <button
              type="button"
              onClick={onGoToRegister}
              className="text-black font-medium hover:underline"
            >
              {t("auth.register")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
