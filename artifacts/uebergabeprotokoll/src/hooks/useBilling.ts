import { useState, useCallback } from "react";
import i18n from "../i18n";

export interface BillingCheckoutOptions {
  plan: "privat" | "agentur";
  interval: "monthly" | "annual";
  currency: string;
}

export function useBilling() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async (opts: BillingCheckoutOptions): Promise<{ error?: string }> => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(opts),
      });
      if (res.ok) {
        const data = await res.json() as { url: string };
        if (data.url) {
          window.location.href = data.url;
          return {};
        } else {
          const msg = i18n.t("billing.noCheckoutUrl");
          setError(msg);
          return { error: msg };
        }
      } else {
        const err = await res.json() as { error: string };
        const msg = err.error ?? i18n.t("billing.checkoutFailed");
        setError(msg);
        return { error: msg };
      }
    } catch {
      const msg = i18n.t("billing.checkoutError");
      setError(msg);
      return { error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const openPortal = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json() as { url: string };
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(i18n.t("billing.noPortalUrl"));
        }
      } else {
        const err = await res.json() as { error: string };
        setError(err.error ?? i18n.t("billing.portalFailed"));
      }
    } catch {
      setError(i18n.t("billing.portalError"));
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, startCheckout, openPortal };
}
