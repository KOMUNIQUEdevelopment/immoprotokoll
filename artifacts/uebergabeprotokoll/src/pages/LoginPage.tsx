import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<{ error?: string }>;
  onGoToRegister: () => void;
  onGoToForgotPassword?: () => void;
}

export default function LoginPage({ onLogin, onGoToRegister, onGoToForgotPassword }: LoginPageProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await onLogin(email.trim(), password);
    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

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
