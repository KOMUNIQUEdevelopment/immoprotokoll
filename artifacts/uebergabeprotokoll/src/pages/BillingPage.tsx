import React, { useState, useEffect } from "react";
import { ArrowLeft, CreditCard, ExternalLink, Check, AlertTriangle, RefreshCw, Lock, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface BillingPageProps {
  onBack: () => void;
  onShowPricing: () => void;
  accountId: string;
  userRole?: "owner" | "administrator" | "property_manager";
}

interface UsageLimits {
  properties: number | null;
  protocols: number | null;
}

interface SubscriptionInfo {
  plan: "free" | "privat" | "agentur" | "custom";
  currency: string;
  billingInterval: "monthly" | "annual";
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  usage?: {
    properties: number;
    protocols: number;
    limits: UsageLimits;
  };
}

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  privat: "Privat",
  agentur: "Agentur",
  custom: "Custom",
};


export default function BillingPage({ onBack, onShowPricing, accountId: _accountId, userRole }: BillingPageProps) {
  const { t } = useTranslation();

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      active: t("billing.statusActive"),
      trialing: t("billing.statusTrialing"),
      past_due: t("billing.statusPastDue"),
      canceled: t("billing.statusCanceled"),
      unpaid: t("billing.statusUnpaid"),
      incomplete: t("billing.statusIncomplete"),
    };
    return map[status] ?? status;
  };

  const getIntervalLabel = (interval: string) => {
    const map: Record<string, string> = {
      monthly: t("billing.intervalMonthly"),
      annual: t("billing.intervalAnnual"),
    };
    return map[interval] ?? interval;
  };

  const [sub, setSub] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState("");

  const isOwner = !userRole || userRole === "owner";

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/billing/subscription", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as SubscriptionInfo;
        setSub(data);
      } else {
        setError(t("billing.loadError"));
      }
    } catch {
      setError(t("billing.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscription();
  }, []);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json() as { url: string };
        window.location.href = data.url;
      } else {
        const err = await res.json() as { error: string };
        setError(err.error ?? t("billing.portalFailed"));
      }
    } catch {
      setError(t("billing.connectionError"));
    } finally {
      setPortalLoading(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("de-CH", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const isPaid = sub && sub.plan !== "free";

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-neutral-200 sticky top-0 z-40 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="font-semibold text-sm text-black">{t("billing.subscription")}</h1>
          </div>
        </div>
      </header>

      {/* Non-owner: read-only view with info notice */}
      {!isOwner && (
        <div className="max-w-2xl mx-auto w-full px-4 pt-6">
          <div className="flex items-start gap-3 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <Lock size={16} className="text-neutral-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-black">{t("billing.ownerOnlyTitle")}</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {t("billing.ownerOnlyDesc")}
              </p>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-6">
            <AlertTriangle size={16} className="text-black shrink-0" />
            <p className="text-sm text-black">{error}</p>
            <button
              type="button"
              onClick={() => { setError(""); loadSubscription(); }}
              className="ml-auto text-xs text-neutral-500 hover:text-black gap-1 flex items-center"
            >
              <RefreshCw size={12} /> {t("billing.reload")}
            </button>
          </div>
        )}

        {sub && !loading && (
          <>
            {/* Current plan card */}
            <div className="rounded-2xl border border-neutral-200 p-6 mb-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-1">{t("billing.currentPlanLabel")}</p>
                  <p className="text-2xl font-bold text-black">{PLAN_LABELS[sub.plan]}</p>
                  {isPaid && sub.subscriptionStatus && (
                    <span className={`inline-flex items-center gap-1 text-xs mt-1 font-medium px-2 py-0.5 rounded-full ${
                      sub.subscriptionStatus === "active"
                        ? "bg-neutral-100 text-black"
                        : "bg-neutral-100 text-neutral-600"
                    }`}>
                      <Check size={10} />
                      {getStatusLabel(sub.subscriptionStatus)}
                    </span>
                  )}
                </div>
                <CreditCard size={20} className="text-neutral-400 shrink-0 mt-1" />
              </div>

              {isPaid && (
                <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-2 gap-4 text-xs text-neutral-600">
                  <div>
                    <p className="text-neutral-400 mb-0.5">{t("billing.billingInterval")}</p>
                    <p className="font-medium text-black">{getIntervalLabel(sub.billingInterval)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 mb-0.5">{t("billing.currency")}</p>
                    <p className="font-medium text-black">{sub.currency.toUpperCase()}</p>
                  </div>
                  {sub.currentPeriodEnd && (
                    <div>
                      <p className="text-neutral-400 mb-0.5">{t("billing.nextRenewal")}</p>
                      <p className="font-medium text-black">{formatDate(sub.currentPeriodEnd)}</p>
                    </div>
                  )}
                </div>
              )}

              {sub.plan === "free" && (
                <div className="mt-4 pt-4 border-t border-neutral-100">
                  <p className="text-xs text-neutral-500">
                    {t("billing.freePlanNotice")}
                  </p>
                </div>
              )}
            </div>

            {/* Usage summary */}
            {sub.usage && (
              <div className="rounded-2xl border border-neutral-200 p-6 mb-6">
                <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-4">{t("billing.usage")}</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 size={14} className="text-neutral-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-600">{t("billing.propertiesLabel")}</span>
                        <span className="text-xs font-medium text-black">
                          {sub.usage.properties}
                          {sub.usage.limits.properties !== null
                            ? ` / ${sub.usage.limits.properties}`
                            : " / ∞"}
                        </span>
                      </div>
                      {sub.usage.limits.properties !== null && (
                        <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-black rounded-full transition-all"
                            style={{ width: `${Math.min(100, (sub.usage.properties / sub.usage.limits.properties) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText size={14} className="text-neutral-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-neutral-600">{t("billing.protocolsTotal")}</span>
                        <span className="text-xs font-medium text-black">
                          {sub.usage.protocols}
                          {sub.usage.limits.protocols !== null
                            ? ` / ${sub.usage.limits.protocols}`
                            : " / ∞"}
                        </span>
                      </div>
                      {sub.usage.limits.protocols !== null && (
                        <div className="w-full h-1 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-black rounded-full transition-all"
                            style={{ width: `${Math.min(100, (sub.usage.protocols / sub.usage.limits.protocols) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions — only shown to owners */}
            <div className="space-y-3">
              {isOwner && !isPaid && (
                <Button
                  className="w-full bg-black text-white hover:bg-neutral-800 gap-2"
                  onClick={onShowPricing}
                >
                  {t("billing.upgradeNow")}
                </Button>
              )}

              {isOwner && isPaid && sub.stripeCustomerId && (
                <Button
                  variant="outline"
                  className="w-full border-neutral-200 gap-2"
                  onClick={openPortal}
                  disabled={portalLoading}
                >
                  <ExternalLink size={14} />
                  {portalLoading ? t("billing.portalOpening") : t("billing.manageSubscription")}
                </Button>
              )}

              {isPaid && (
                <p className="text-xs text-neutral-400 text-center">
                  {t("billing.stripeNote")}
                </p>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
