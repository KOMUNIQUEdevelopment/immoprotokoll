import React, { useState } from "react";
import { Check, X, ArrowLeft, Zap, Building2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PricingPageProps {
  onBack: () => void;
  onSelectPlan?: (plan: "privat" | "agentur", interval: "monthly" | "annual", currency: string) => void;
  currentPlan?: string;
  isLoggedIn?: boolean;
}

type Currency = "CHF" | "EUR" | "USD";
type Interval = "monthly" | "annual";

const PRICES = {
  privat:  { monthly: 9,  annual: 86.40 },
  agentur: { monthly: 49, annual: 470.40 },
} as const;

const CURRENCY_SYMBOL: Record<Currency, string> = { CHF: "CHF", EUR: "€", USD: "$" };

function fmt(amount: number, currency: Currency) {
  return `${CURRENCY_SYMBOL[currency]} ${amount % 1 === 0 ? amount : amount.toFixed(2)}`;
}

const FEATURES = {
  free: [
    "1 Liegenschaft",
    "1 Protokoll pro Liegenschaft",
    "PDF & ZIP Export",
    "Digitale Unterschriften",
    "Mieterlink",
    "Mit ImmoProtokoll-Wasserzeichen",
  ],
  privat: [
    "1 Liegenschaft",
    "30 Protokolle pro Liegenschaft",
    "PDF & ZIP Export",
    "Digitale Unterschriften",
    "Mieterlink",
    "Ohne Wasserzeichen",
    "Prioritäts-Support",
  ],
  agentur: [
    "Bis zu 50 Liegenschaften",
    "30 Protokolle pro Liegenschaft",
    "PDF & ZIP Export",
    "Digitale Unterschriften",
    "Mieterlink",
    "Ohne Wasserzeichen",
    "Teamzugang (Owner/Admin/PM)",
    "Prioritäts-Support",
  ],
  custom: [
    "Unbegrenzte Liegenschaften",
    "Unbegrenzte Protokolle",
    "Alle Agentur-Features",
    "Individuelle Integration",
    "SLA & dedizierten Support",
    "On-Premise oder Cloud",
  ],
} as const;

export default function PricingPage({
  onBack,
  onSelectPlan,
  currentPlan,
  isLoggedIn,
}: PricingPageProps) {
  const [currency, setCurrency] = useState<Currency>("CHF");
  const [interval, setInterval] = useState<Interval>("monthly");

  const monthlyEquivalent = (plan: "privat" | "agentur") => {
    if (interval === "monthly") return PRICES[plan].monthly;
    return PRICES[plan].annual / 12;
  };

  const annualTotal = (plan: "privat" | "agentur") => PRICES[plan].annual;

  const handleSelect = (plan: "privat" | "agentur") => {
    onSelectPlan?.(plan, interval, currency.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200 sticky top-0 z-40 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <img src="/immoprotokoll-logo.png" alt="ImmoProtokoll" className="h-7" />
          </div>
          <div className="flex items-center gap-2">
            {/* Currency switcher */}
            <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden text-xs font-medium">
              {(["CHF", "EUR", "USD"] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  className={`px-3 py-1.5 transition-colors ${
                    currency === c ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            {/* Interval toggle */}
            <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden text-xs font-medium">
              <button
                type="button"
                onClick={() => setInterval("monthly")}
                className={`px-3 py-1.5 transition-colors ${
                  interval === "monthly" ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                Monatlich
              </button>
              <button
                type="button"
                onClick={() => setInterval("annual")}
                className={`px-3 py-1.5 transition-colors ${
                  interval === "annual" ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                Jährlich
                <span className="ml-1 text-neutral-400 font-normal">–20%</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-black mb-3">Einfache, transparente Preise</h1>
          <p className="text-neutral-500 text-base max-w-lg mx-auto">
            Wählen Sie den Plan, der zu Ihnen passt. Jederzeit upgraden, downgraden oder kündigen.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Free */}
          <div className="rounded-2xl border border-neutral-200 p-6 flex flex-col">
            <div className="mb-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Free</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-black">0</span>
                <span className="text-sm text-neutral-500">{CURRENCY_SYMBOL[currency]}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">Immer kostenlos</p>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FEATURES.free.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-neutral-600">
                  <Check size={13} className="text-black shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-neutral-200"
              disabled={currentPlan === "free" || !isLoggedIn}
              onClick={onBack}
            >
              {currentPlan === "free" ? "Ihr aktueller Plan" : "Kostenlos starten"}
            </Button>
          </div>

          {/* Privat */}
          <div className="rounded-2xl border-2 border-black p-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">Beliebt</span>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Privat</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-black">
                  {fmt(monthlyEquivalent("privat"), currency)}
                </span>
                <span className="text-sm text-neutral-500">/ Mt.</span>
              </div>
              {interval === "annual" && (
                <p className="text-xs text-neutral-400 mt-1">
                  {fmt(annualTotal("privat"), currency)} / Jahr
                </p>
              )}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FEATURES.privat.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-neutral-600">
                  <Check size={13} className="text-black shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              className="w-full bg-black text-white hover:bg-neutral-800"
              disabled={currentPlan === "privat"}
              onClick={() => handleSelect("privat")}
            >
              {currentPlan === "privat" ? "Ihr aktueller Plan" : isLoggedIn ? "Jetzt upgraden" : "Loslegen"}
            </Button>
          </div>

          {/* Agentur */}
          <div className="rounded-2xl border border-neutral-200 p-6 flex flex-col">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Agentur</p>
                <Building2 size={13} className="text-neutral-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-black">
                  {fmt(monthlyEquivalent("agentur"), currency)}
                </span>
                <span className="text-sm text-neutral-500">/ Mt.</span>
              </div>
              {interval === "annual" && (
                <p className="text-xs text-neutral-400 mt-1">
                  {fmt(annualTotal("agentur"), currency)} / Jahr
                </p>
              )}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FEATURES.agentur.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-neutral-600">
                  <Check size={13} className="text-black shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              className="w-full bg-black text-white hover:bg-neutral-800"
              disabled={currentPlan === "agentur"}
              onClick={() => handleSelect("agentur")}
            >
              {currentPlan === "agentur" ? "Ihr aktueller Plan" : isLoggedIn ? "Jetzt upgraden" : "Loslegen"}
            </Button>
          </div>

          {/* Custom */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 flex flex-col">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Custom</p>
                <Zap size={13} className="text-neutral-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-black">Individuell</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">Auf Anfrage</p>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FEATURES.custom.map((f) => (
                <li key={f} className="flex items-start gap-2 text-xs text-neutral-600">
                  <Check size={13} className="text-black shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-neutral-200 gap-1.5"
              asChild
            >
              <a href="mailto:hello@immoprotokoll.com">
                <Mail size={13} />
                Kontakt aufnehmen
              </a>
            </Button>
          </div>
        </div>

        {/* Feature comparison note */}
        <div className="mt-12 rounded-xl border border-neutral-200 p-6">
          <h2 className="text-sm font-semibold text-black mb-4">Alle Pläne beinhalten</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              "DSGVO-konformer Datenspeicher",
              "Automatische Datensicherung",
              "Offline-Unterstützung (PWA)",
              "Keine versteckten Kosten",
            ].map((f) => (
              <div key={f} className="flex items-start gap-2 text-xs text-neutral-600">
                <Check size={13} className="text-black shrink-0 mt-0.5" />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* FAQ / footer note */}
        <p className="text-center text-xs text-neutral-400 mt-8">
          Alle Preise verstehen sich zzgl. MwSt. · Jederzeit kündbar · Keine Kreditkarte für Free-Plan erforderlich
        </p>
      </main>
    </div>
  );
}
