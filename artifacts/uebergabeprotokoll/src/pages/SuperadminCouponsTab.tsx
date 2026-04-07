import React, { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X, RefreshCw, Copy, Check, Tag, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = "/api";
async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
}

interface PromoCode {
  id: string;
  code: string;
  active: boolean;
  customer_email: string | null;
  first_time_transaction: boolean;
  times_redeemed: number;
  max_redemptions: number | null;
  expires_at: number | null;
}

interface CouponEntry {
  coupon: {
    id: string;
    name: string | null;
    percent_off: number | null;
    max_redemptions: number | null;
    times_redeemed: number;
    valid: boolean;
    created: number;
  };
  promoCodes: PromoCode[];
}

type RestrictionType = "none" | "email" | "first_time";
type Duration = "once" | "repeating" | "forever";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copy} className="p-1 rounded hover:bg-[hsl(0,0%,90%)] transition-colors" title="Kopieren">
      {copied ? <Check size={12} className="text-[hsl(0,0%,30%)]" /> : <Copy size={12} className="text-[hsl(0,0%,50%)]" />}
    </button>
  );
}

interface CreateFormProps {
  mode: "live" | "test";
  onCreated: () => void;
  onCancel: () => void;
}

function CreateForm({ mode, onCreated, onCancel }: CreateFormProps) {
  const [name, setName] = useState("");
  const [percentOff, setPercentOff] = useState("");
  const [code, setCode] = useState("");
  const [duration, setDuration] = useState<Duration>("once");
  const [restriction, setRestriction] = useState<RestrictionType>("none");
  const [restrictEmail, setRestrictEmail] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pct = parseFloat(percentOff);
    if (!pct || pct <= 0 || pct > 100) {
      setError("Rabatt muss zwischen 1 und 100 % liegen.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        percent_off: pct,
        duration,
        ...(name ? { name } : {}),
        ...(code ? { code: code.toUpperCase() } : {}),
        ...(maxRedemptions ? { max_redemptions: parseInt(maxRedemptions, 10) } : {}),
        ...(expiresAt ? { expires_at: expiresAt } : {}),
        ...(restriction === "email" && restrictEmail ? { restrict_to_email: restrictEmail } : {}),
        ...(restriction === "first_time" ? { first_time_only: true } : {}),
      };
      const r = await apiFetch("/superadmin/coupons", { method: "POST", body: JSON.stringify(body) });
      if (r.ok) {
        onCreated();
      } else {
        let msg = "Fehler beim Erstellen";
        try {
          const d = await r.json() as { error?: string };
          msg = d.error ?? msg;
        } catch { /* ignore json parse error */ }
        setError(`${r.status}: ${msg}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Netzwerkfehler — bitte nochmals versuchen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-[hsl(0,0%,88%)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-[hsl(0,0%,90%)]">
          <div>
            <h2 className="text-base font-semibold text-[hsl(0,0%,8%)]">Neuer Rabattcode</h2>
            <p className="text-xs text-[hsl(0,0%,50%)] mt-0.5">
              Stripe {mode === "live" ? "LIVE" : "TEST"}
            </p>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)]"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-neutral-100 border border-neutral-200 px-3 py-2.5 text-xs text-neutral-700 font-medium">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Rabatt (%)*</label>
              <Input
                type="number"
                min="1"
                max="100"
                step="0.01"
                value={percentOff}
                onChange={(e) => setPercentOff(e.target.value)}
                placeholder="20"
                required
                className="text-sm h-8"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Code (leer = automatisch)</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="IMMO20"
                className="text-sm h-8 font-mono"
                maxLength={20}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Bezeichnung (intern)</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Partnerrabatt Q1 2026"
              className="text-sm h-8"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Gültig für</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["once", "Einmalig"],
                ["repeating", "Wiederkehrend"],
                ["forever", "Dauerhaft"],
              ] as [Duration, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDuration(val)}
                  className={`py-1.5 px-2 rounded-md border text-xs font-medium transition-colors ${
                    duration === val
                      ? "bg-[hsl(0,0%,8%)] text-white border-[hsl(0,0%,8%)]"
                      : "bg-white text-[hsl(0,0%,30%)] border-[hsl(0,0%,80%)] hover:border-[hsl(0,0%,60%)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Einschränkung</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {([
                ["none", "Keine"],
                ["email", "E-Mail"],
                ["first_time", "Erstkauf"],
              ] as [RestrictionType, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setRestriction(val)}
                  className={`py-1.5 px-2 rounded-md border text-xs font-medium transition-colors ${
                    restriction === val
                      ? "bg-[hsl(0,0%,8%)] text-white border-[hsl(0,0%,8%)]"
                      : "bg-white text-[hsl(0,0%,30%)] border-[hsl(0,0%,80%)] hover:border-[hsl(0,0%,60%)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {restriction === "email" && (
              <Input
                type="email"
                value={restrictEmail}
                onChange={(e) => setRestrictEmail(e.target.value)}
                placeholder="kunde@beispiel.com"
                className="text-sm h-8"
              />
            )}
            {restriction === "first_time" && (
              <p className="text-xs text-[hsl(0,0%,50%)] bg-[hsl(0,0%,96%)] rounded p-2">
                Nur für Kunden, die noch nie bei ImmoProtokoll bezahlt haben.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Max. Einlösungen</label>
              <Input
                type="number"
                min="1"
                value={maxRedemptions}
                onChange={(e) => setMaxRedemptions(e.target.value)}
                placeholder="∞"
                className="text-sm h-8"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Ablaufdatum</label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="text-sm h-8"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>Abbrechen</Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-1.5">
              {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
              Erstellen
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SuperadminCouponsTab() {
  const [entries, setEntries] = useState<CouponEntry[]>([]);
  const [mode, setMode] = useState<"live" | "test">("live");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState<string | null>(null);
  const [deactivatingCode, setDeactivatingCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch("/superadmin/coupons");
      if (r.ok) {
        const d = await r.json() as { coupons: CouponEntry[]; mode: "live" | "test" };
        setEntries(d.coupons);
        setMode(d.mode);
      } else {
        const d = await r.json() as { error?: string };
        setError(d.error ?? "Fehler beim Laden");
      }
    } catch {
      setError("Verbindungsfehler");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteCoupon = async (id: string) => {
    if (!confirm("Coupon wirklich löschen? Alle zugehörigen Codes werden ebenfalls gelöscht.")) return;
    setDeletingCoupon(id);
    try {
      await apiFetch(`/superadmin/coupons/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeletingCoupon(null);
    }
  };

  const deactivateCode = async (id: string) => {
    setDeactivatingCode(id);
    try {
      await apiFetch(`/superadmin/promo-codes/${id}/deactivate`, { method: "PATCH" });
      await load();
    } finally {
      setDeactivatingCode(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[hsl(0,0%,98%)]">
      <div className="p-5 border-b border-[hsl(0,0%,90%)] bg-white flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-[hsl(0,0%,8%)]">Rabattcodes</h2>
          <p className="text-xs text-[hsl(0,0%,50%)] mt-0.5">
            Stripe {mode === "live" ? <strong className="text-[hsl(0,0%,10%)]">LIVE</strong> : <strong className="text-[hsl(0,0%,40%)]">TEST</strong>}
            {" · "}Coupons werden direkt in Stripe gespeichert
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)]" title="Aktualisieren">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <Button
            size="sm"
            className="gap-1.5 bg-[hsl(0,0%,8%)] text-white hover:bg-[hsl(0,0%,20%)] h-7 text-xs"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={13} /> Neuer Code
          </Button>
        </div>
      </div>

      {error && (
        <div className="m-4 p-3 bg-[hsl(0,0%,93%)] rounded-lg text-xs text-[hsl(0,0%,30%)]">{error}</div>
      )}

      {loading && !error && (
        <div className="flex items-center justify-center py-16 text-[hsl(0,0%,60%)] text-sm gap-2">
          <RefreshCw size={16} className="animate-spin" /> Wird geladen…
        </div>
      )}

      {!loading && entries.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-[hsl(0,0%,50%)]">
          <Tag size={28} className="mb-3 text-[hsl(0,0%,70%)]" />
          <p className="text-sm font-medium">Noch keine Rabattcodes</p>
          <p className="text-xs mt-1">Erstelle deinen ersten Code mit dem Button oben.</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div className="p-4 space-y-4">
          {entries.map(({ coupon, promoCodes }) => (
            <div key={coupon.id} className="bg-white border border-[hsl(0,0%,88%)] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[hsl(0,0%,92%)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-bold text-[hsl(0,0%,8%)]">{coupon.percent_off}%</span>
                    <span className="text-xs text-[hsl(0,0%,50%)]">Rabatt</span>
                  </div>
                  {coupon.name && (
                    <span className="text-sm text-[hsl(0,0%,30%)] font-medium">{coupon.name}</span>
                  )}
                  {!coupon.valid && (
                    <span className="text-xs px-2 py-0.5 bg-[hsl(0,0%,90%)] text-[hsl(0,0%,50%)] rounded-full">Abgelaufen</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[hsl(0,0%,60%)]">
                    {coupon.times_redeemed}× eingelöst
                    {coupon.max_redemptions ? ` / ${coupon.max_redemptions}` : ""}
                  </span>
                  <button
                    onClick={() => deleteCoupon(coupon.id)}
                    disabled={deletingCoupon === coupon.id}
                    className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)] text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,20%)]"
                    title="Coupon löschen"
                  >
                    {deletingCoupon === coupon.id
                      ? <RefreshCw size={13} className="animate-spin" />
                      : <Trash2 size={13} />
                    }
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[hsl(0,0%,94%)]">
                {promoCodes.length === 0 && (
                  <p className="px-4 py-3 text-xs text-[hsl(0,0%,60%)] italic">Keine Promotion Codes verknüpft.</p>
                )}
                {promoCodes.map((pc) => (
                  <div key={pc.id} className={`px-4 py-3 flex items-center justify-between gap-3 ${!pc.active ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm font-semibold text-[hsl(0,0%,8%)]">{pc.code}</span>
                        <CopyButton text={pc.code} />
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!pc.active && (
                          <span className="text-xs px-1.5 py-0.5 bg-[hsl(0,0%,90%)] text-[hsl(0,0%,50%)] rounded">Deaktiviert</span>
                        )}
                        {pc.customer_email && (
                          <span className="text-xs px-1.5 py-0.5 bg-[hsl(0,0%,93%)] text-[hsl(0,0%,30%)] rounded">
                            Nur: {pc.customer_email}
                          </span>
                        )}
                        {pc.first_time_transaction && (
                          <span className="text-xs px-1.5 py-0.5 bg-[hsl(0,0%,93%)] text-[hsl(0,0%,30%)] rounded">Erstkauf</span>
                        )}
                        {pc.expires_at && (
                          <span className="text-xs text-[hsl(0,0%,55%)]">
                            bis {new Date(pc.expires_at * 1000).toLocaleDateString("de-CH")}
                          </span>
                        )}
                        <span className="text-xs text-[hsl(0,0%,60%)]">
                          {pc.times_redeemed}×{pc.max_redemptions ? ` / ${pc.max_redemptions}` : ""}
                        </span>
                      </div>
                    </div>
                    {pc.active && (
                      <button
                        onClick={() => deactivateCode(pc.id)}
                        disabled={deactivatingCode === pc.id}
                        className="flex-shrink-0 p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)] text-[hsl(0,0%,60%)] hover:text-[hsl(0,0%,20%)]"
                        title="Code deaktivieren"
                      >
                        {deactivatingCode === pc.id
                          ? <RefreshCw size={13} className="animate-spin" />
                          : <ShieldOff size={13} />
                        }
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateForm
          mode={mode}
          onCreated={async () => { setShowCreate(false); await load(); }}
          onCancel={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
