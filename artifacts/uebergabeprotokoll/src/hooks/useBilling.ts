import { useState, useCallback } from "react";

export interface BillingCheckoutOptions {
  plan: "privat" | "agentur";
  interval: "monthly" | "annual";
  currency: string;
}

export function useBilling() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async (opts: BillingCheckoutOptions) => {
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
        } else {
          setError("Keine Checkout-URL erhalten.");
        }
      } else {
        const err = await res.json() as { error: string };
        setError(err.error ?? "Checkout fehlgeschlagen.");
      }
    } catch {
      setError("Verbindungsfehler beim Erstellen der Zahlungssitzung.");
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
          setError("Keine Portal-URL erhalten.");
        }
      } else {
        const err = await res.json() as { error: string };
        setError(err.error ?? "Portal konnte nicht geöffnet werden.");
      }
    } catch {
      setError("Verbindungsfehler beim Öffnen des Portals.");
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, startCheckout, openPortal };
}
