import React, { useState } from "react";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ForgotPasswordPageProps {
  onBack: () => void;
}

export default function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? "Something went wrong. Please try again.");
      } else {
        setSent(true);
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
            <h1 className="text-2xl font-semibold tracking-tight text-black">Reset password</h1>
            <p className="text-sm text-neutral-500">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
                <Mail size={20} className="text-neutral-600" />
              </div>
              <p className="text-sm text-neutral-700 text-center">
                If <span className="font-medium text-black">{email}</span> is registered, you'll receive a reset link within a few minutes. Check your spam folder if you don't see it.
              </p>
            </div>
            <Button
              type="button"
              onClick={onBack}
              className="w-full bg-black text-white hover:bg-neutral-800 rounded-lg"
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="name@example.com"
                autoComplete="email"
                autoFocus
                required
                className="border-neutral-300 focus-visible:ring-0 focus-visible:border-black"
              />
            </div>

            {error && <p className="text-xs text-neutral-700 font-medium">{error}</p>}

            <Button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-black text-white hover:bg-neutral-800 rounded-lg"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : "Send reset link"}
            </Button>

            <button
              type="button"
              onClick={onBack}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-neutral-500 hover:text-black transition-colors"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
