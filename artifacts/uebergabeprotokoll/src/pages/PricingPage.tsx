import React, { useState } from "react";
import { Check, Zap, Building2, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

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

export default function PricingPage({
  onBack,
  onSelectPlan,
  currentPlan,
  isLoggedIn,
}: PricingPageProps) {
  const { t } = useTranslation();
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

  const FREE_FEATURES = [
    t("pricing.feature1Property"),
    t("pricing.feature1Protocol"),
    t("pricing.featurePdfExport"),
    t("pricing.featureDigitalSignatures"),
    t("pricing.featureTenantLink"),
    t("pricing.featureWatermark"),
  ];

  const PRIVAT_FEATURES = [
    t("pricing.feature1Property"),
    t("pricing.feature30Protocols"),
    t("pricing.featurePdfExport"),
    t("pricing.featureDigitalSignatures"),
    t("pricing.featureTenantLink"),
    t("pricing.featureNoWatermark"),
    t("pricing.featurePrioritySupport"),
  ];

  const AGENTUR_FEATURES = [
    t("pricing.featureUpTo50Properties"),
    t("pricing.feature30Protocols"),
    t("pricing.featurePdfExport"),
    t("pricing.featureDigitalSignatures"),
    t("pricing.featureTenantLink"),
    t("pricing.featureNoWatermark"),
    t("pricing.featureTeamAccess"),
    t("pricing.featurePrioritySupport"),
  ];

  const CUSTOM_FEATURES = [
    t("pricing.featureUnlimitedProperties"),
    t("pricing.featureUnlimitedProtocols"),
    t("pricing.featureAllAgency"),
    t("pricing.featureCustomIntegration"),
    t("pricing.featureSla"),
    t("pricing.featureOnPremise"),
  ];

  const ALL_PLANS_FEATURES = [
    t("pricing.featureGdpr"),
    t("pricing.featureBackup"),
    t("pricing.featureOffline"),
    t("pricing.featureNoHiddenCosts"),
  ];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-neutral-200 sticky top-0 z-40 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <img src="/immoprotokoll-logo.png" alt="ImmoProtokoll" className="h-7" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-3">{t("pricing.title")}</h1>
          <p className="text-neutral-500 text-base max-w-lg mx-auto">
            {t("pricing.subtitle")}
          </p>
        </div>

        {/* Currency + interval selectors — prominently above the table */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <div className="flex items-center rounded-xl border border-neutral-200 overflow-hidden text-sm font-medium shadow-sm">
            {(["CHF", "EUR", "USD"] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={`px-5 py-2.5 transition-colors ${
                  currency === c ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center rounded-xl border border-neutral-200 overflow-hidden text-sm font-medium shadow-sm">
            <button
              type="button"
              onClick={() => setInterval("monthly")}
              className={`px-5 py-2.5 transition-colors ${
                interval === "monthly" ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {t("pricing.intervalMonthly")}
            </button>
            <button
              type="button"
              onClick={() => setInterval("annual")}
              className={`px-5 py-2.5 transition-colors flex items-center gap-2 ${
                interval === "annual" ? "bg-black text-white" : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {t("pricing.intervalAnnual")}
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                interval === "annual" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
              }`}>
                {t("pricing.annualDiscount")}
              </span>
            </button>
          </div>
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
              <p className="text-xs text-neutral-400 mt-1">{t("pricing.alwaysFree")}</p>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FREE_FEATURES.map((f) => (
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
              {currentPlan === "free" ? t("pricing.currentPlan") : t("pricing.startFree")}
            </Button>
          </div>

          {/* Privat */}
          <div className="rounded-2xl border-2 border-black p-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-black text-white text-xs font-semibold px-3 py-1 rounded-full">{t("pricing.popular")}</span>
            </div>
            <div className="mb-4">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">Privat</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-black">
                  {fmt(monthlyEquivalent("privat"), currency)}
                </span>
                <span className="text-sm text-neutral-500">{t("pricing.perMonth")}</span>
              </div>
              {interval === "annual" && (
                <p className="text-xs text-neutral-400 mt-1">
                  {fmt(annualTotal("privat"), currency)} {t("pricing.perYear")}
                </p>
              )}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {PRIVAT_FEATURES.map((f) => (
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
              {currentPlan === "privat" ? t("pricing.currentPlan") : isLoggedIn ? t("pricing.upgradeNow") : t("pricing.getStarted")}
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
                <span className="text-sm text-neutral-500">{t("pricing.perMonth")}</span>
              </div>
              {interval === "annual" && (
                <p className="text-xs text-neutral-400 mt-1">
                  {fmt(annualTotal("agentur"), currency)} {t("pricing.perYear")}
                </p>
              )}
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {AGENTUR_FEATURES.map((f) => (
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
              {currentPlan === "agentur" ? t("pricing.currentPlan") : isLoggedIn ? t("pricing.upgradeNow") : t("pricing.getStarted")}
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
                <span className="text-2xl font-bold text-black">{t("pricing.individual")}</span>
              </div>
              <p className="text-xs text-neutral-400 mt-1">{t("pricing.onRequest")}</p>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {CUSTOM_FEATURES.map((f) => (
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
                {t("pricing.contact")}
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-neutral-200 p-6">
          <h2 className="text-sm font-semibold text-black mb-4">{t("pricing.allPlansInclude")}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ALL_PLANS_FEATURES.map((f) => (
              <div key={f} className="flex items-start gap-2 text-xs text-neutral-600">
                <Check size={13} className="text-black shrink-0 mt-0.5" />
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-8">
          {t("pricing.footerNote")}
        </p>
      </main>
    </div>
  );
}
