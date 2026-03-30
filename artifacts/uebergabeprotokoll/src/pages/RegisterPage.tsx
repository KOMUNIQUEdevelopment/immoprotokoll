import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RegisterPageProps {
  onRegister: (opts: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    accountName: string;
  }) => Promise<{ error?: string }>;
  onGoToLogin: () => void;
}

export default function RegisterPage({ onRegister, onGoToLogin }: RegisterPageProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    accountName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    setError("");
    setLoading(true);
    const result = await onRegister(form);
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
            src="/immoprotokoll-logo.png"
            alt="ImmoProtokoll"
            className="h-10 mx-auto"
          />
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-black">{t("auth.createAccount")}</h1>
            <p className="text-sm text-neutral-500">{t("auth.startFree")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {t("auth.firstName")}
              </label>
              <Input
                type="text"
                value={form.firstName}
                onChange={set("firstName")}
                placeholder="Max"
                autoComplete="given-name"
                autoFocus
                required
                className="border-neutral-300 focus-visible:ring-0 focus-visible:border-black"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {t("auth.lastName")}
              </label>
              <Input
                type="text"
                value={form.lastName}
                onChange={set("lastName")}
                placeholder="Muster"
                autoComplete="family-name"
                required
                className="border-neutral-300 focus-visible:ring-0 focus-visible:border-black"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
              {t("auth.accountName")}
            </label>
            <Input
              type="text"
              value={form.accountName}
              onChange={set("accountName")}
              placeholder="Muster Immobilien AG"
              required
              className="border-neutral-300 focus-visible:ring-0 focus-visible:border-black"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
              {t("auth.email")}
            </label>
            <Input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="name@beispiel.de"
              autoComplete="email"
              required
              className={`border-neutral-300 focus-visible:ring-0 focus-visible:border-black ${error ? "border-neutral-900" : ""}`}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
              {t("auth.password")}
            </label>
            <Input
              type="password"
              value={form.password}
              onChange={set("password")}
              placeholder={t("auth.passwordMin")}
              autoComplete="new-password"
              required
              className={`border-neutral-300 focus-visible:ring-0 focus-visible:border-black ${error ? "border-neutral-900" : ""}`}
            />
          </div>

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
              <UserPlus size={15} />
            )}
            {loading ? t("auth.registering") : t("auth.registerAction")}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-neutral-500">
            {t("auth.alreadyAccount")}{" "}
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-black font-medium hover:underline"
            >
              {t("auth.loginAction")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
