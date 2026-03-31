import React, { useState } from "react";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ResetPasswordPageProps {
  token: string;
  onSuccess: () => void;
}

export default function ResetPasswordPage({ token, onSuccess }: ResetPasswordPageProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
      } else {
        setDone(true);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-semibold tracking-tight text-black">Choose a new password</h1>
            <p className="text-sm text-neutral-500">Must be at least 8 characters.</p>
          </div>
        </div>

        {done ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                <CheckCircle2 size={20} className="text-neutral-700" />
              </div>
              <p className="text-sm text-neutral-700 text-center">
                Your password has been reset. You can now sign in with your new password.
              </p>
            </div>
            <Button
              type="button"
              onClick={onSuccess}
              className="w-full bg-black text-white hover:bg-neutral-800 rounded-lg"
            >
              Sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                New password
              </label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  autoFocus
                  required
                  className="pr-10 border-neutral-300 focus-visible:ring-0 focus-visible:border-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Confirm password
              </label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(""); }}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                  className={`pr-10 border-neutral-300 focus-visible:ring-0 focus-visible:border-black ${mismatch ? "border-neutral-900" : ""}`}
                />
                {confirm.length > 0 && (
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {mismatch ? (
                      <XCircle size={15} className="text-neutral-500" />
                    ) : (
                      <CheckCircle2 size={15} className="text-neutral-700" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-neutral-700 font-medium">{error}</p>}

            <Button
              type="submit"
              disabled={loading || !password || !confirm || mismatch}
              className="w-full bg-black text-white hover:bg-neutral-800 rounded-lg"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Reset password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
