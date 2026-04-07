import React, { useState, useEffect, useCallback } from "react";
import {
  MessageSquare, Map, Tag, Building2, LogOut, Shield,
  ChevronLeft, ChevronRight, Search, Settings, Eye,
  RefreshCw, X, Check, CreditCard, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SuperadminSupportTab from "./SuperadminSupportTab";
import SuperadminRoadmapTab from "./SuperadminRoadmapTab";
import SuperadminCouponsTab from "./SuperadminCouponsTab";

const API = "/api";
async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
}

type AdminSection = "support" | "roadmap" | "coupons" | "accounts";

interface AccountRow {
  id: string;
  name: string;
  plan: "free" | "privat" | "agentur" | "custom";
  subscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  customMaxProperties: number | null;
  customMaxProtocols: number | null;
  customMaxUsers: number | null;
  customPricingNotes: string | null;
  createdAt: string;
  userCount: number;
  protocolCount: number;
  propertyCount: number;
}

interface AccountDetail extends AccountRow {
  users: Array<{ id: string; email: string; firstName: string; lastName: string; role: string; createdAt: string }>;
}

interface Stats {
  accountCount: number;
  userCount: number;
  protocolCount: number;
  planBreakdown: Record<string, number>;
}

interface StripeStatus {
  mode: "live" | "test";
  live: { keyConfigured: boolean };
  test: { keyConfigured: boolean; publishableKeyConfigured: boolean; webhookSecretConfigured: boolean; pricesConfigured: number; pricesExpected: number };
}

const PLAN_BADGE: Record<string, string> = {
  free: "bg-neutral-100 text-neutral-500",
  privat: "bg-neutral-800 text-white",
  agentur: "bg-black text-white",
  custom: "bg-black text-white ring-1 ring-black",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${PLAN_BADGE[plan] ?? "bg-neutral-100 text-neutral-500"}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  );
}

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle2 size={12} className="text-neutral-500 shrink-0" /> : <X size={12} className="text-neutral-400 shrink-0" />}
      <span className="text-xs font-mono text-neutral-500">{label}</span>
    </div>
  );
}

// ── Accounts Section ─────────────────────────────────────────────────────────

function AccountDetailModal({ accountId, onClose, onImpersonate, onPlanSaved }: {
  accountId: string; onClose: () => void;
  onImpersonate: (id: string) => void;
  onPlanSaved: () => void;
}) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editPlan, setEditPlan] = useState(false);
  const [plan, setPlan] = useState<AccountRow["plan"]>("free");
  const [maxProps, setMaxProps] = useState("");
  const [maxProtos, setMaxProtos] = useState("");
  const [maxUsers, setMaxUsers] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/superadmin/accounts/${accountId}`)
      .then((r) => r.json())
      .then((d: { account: AccountDetail; users: AccountDetail["users"]; protocolCount: number; propertyCount: number }) => {
        const acc = { ...d.account, users: d.users, protocolCount: d.protocolCount, propertyCount: d.propertyCount };
        setDetail(acc);
        setPlan(acc.plan);
        setMaxProps(acc.customMaxProperties?.toString() ?? "");
        setMaxProtos(acc.customMaxProtocols?.toString() ?? "");
        setMaxUsers(acc.customMaxUsers?.toString() ?? "");
        setNotes(acc.customPricingNotes ?? "");
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  const handleSavePlan = async () => {
    if (!detail) return;
    setSaving(true); setSaveError(null);
    try {
      const r = await apiFetch(`/superadmin/accounts/${accountId}`, {
        method: "PATCH",
        body: JSON.stringify({
          plan,
          customMaxProperties: maxProps ? parseInt(maxProps, 10) : null,
          customMaxProtocols: maxProtos ? parseInt(maxProtos, 10) : null,
          customMaxUsers: maxUsers ? parseInt(maxUsers, 10) : null,
          customPricingNotes: notes || null,
        }),
      });
      if (!r.ok) { const d = await r.json() as { error: string }; throw new Error(d.error); }
      onPlanSaved();
      setEditPlan(false);
    } catch (e) { setSaveError(e instanceof Error ? e.message : "Fehler"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-neutral-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-semibold text-neutral-800">{loading ? "…" : detail?.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-neutral-400 text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" /> Wird geladen…
          </div>
        ) : detail ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="grid grid-cols-3 gap-3">
              {[["Liegenschaften", detail.propertyCount], ["Protokolle", detail.protocolCount], ["Benutzer", detail.userCount]].map(([l, v]) => (
                <div key={String(l)} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-neutral-400 mb-1">{l}</p>
                  <p className="text-xl font-bold text-neutral-900">{v}</p>
                </div>
              ))}
            </div>

            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Plan</span>
                <div className="flex items-center gap-2">
                  <PlanBadge plan={detail.plan} />
                  <button onClick={() => setEditPlan((v) => !v)} className="text-xs text-neutral-400 hover:text-neutral-700 underline">
                    {editPlan ? "Abbrechen" : "Ändern"}
                  </button>
                </div>
              </div>
              {detail.subscriptionStatus && (
                <p className="text-xs text-neutral-500">Status: {detail.subscriptionStatus}</p>
              )}
              {detail.currentPeriodEnd && (
                <p className="text-xs text-neutral-400">Periode bis: {new Date(detail.currentPeriodEnd).toLocaleDateString("de-CH")}</p>
              )}
            </div>

            {editPlan && (
              <div className="border border-neutral-200 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {(["free", "privat", "agentur", "custom"] as const).map((p) => (
                    <button key={p} onClick={() => setPlan(p)}
                      className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${plan === p ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-500 hover:border-neutral-400"}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
                {plan === "custom" && (
                  <div className="grid grid-cols-3 gap-3">
                    {(
                      [
                        { label: "Liegenschaften", val: maxProps, setter: setMaxProps },
                        { label: "Protokolle",      val: maxProtos, setter: setMaxProtos },
                        { label: "Benutzer",        val: maxUsers,  setter: setMaxUsers  },
                      ] as { label: string; val: string; setter: (v: string) => void }[]
                    ).map(({ label, val, setter }) => (
                      <div key={label}>
                        <label className="block text-xs text-neutral-400 mb-1">{label}</label>
                        <Input type="number" min="0" value={val} onChange={(e) => setter(e.target.value)} placeholder="∞" className="h-8 text-sm" />
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Notizen (intern)</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                    placeholder="z.B. CHF 299/Jahr, Vertrag bis 2026-12-31"
                    className="w-full rounded-lg border border-neutral-200 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-neutral-400" />
                </div>
                {saveError && <p className="text-xs text-red-500">{saveError}</p>}
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSavePlan} disabled={saving} className="gap-1.5">
                    {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                    Speichern
                  </Button>
                </div>
              </div>
            )}

            {detail.users.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Benutzer</p>
                <div className="space-y-1.5">
                  {detail.users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-neutral-800">
                          {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : u.email}
                        </p>
                        <p className="text-xs text-neutral-400">{u.email}</p>
                      </div>
                      <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">{u.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {detail && (
          <div className="px-6 py-4 border-t border-neutral-100 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => onImpersonate(accountId)}>
              <Eye size={14} /> Als dieses Konto
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function AccountsSection() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [switchingStripeMode, setSwitchingStripeMode] = useState(false);
  const [settingUpStripe, setSettingUpStripe] = useState(false);
  const [stripeMsg, setStripeMsg] = useState<string | null>(null);

  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      const [statsRes, accountsRes, stripeRes] = await Promise.all([
        apiFetch("/superadmin/stats"),
        apiFetch(`/superadmin/accounts?${params}`),
        apiFetch("/superadmin/stripe"),
      ]);
      if (statsRes.ok) setStats(await statsRes.json() as Stats);
      if (accountsRes.ok) {
        const d = await accountsRes.json() as { accounts: AccountRow[]; total: number };
        setAccounts(d.accounts); setTotal(d.total);
      }
      if (stripeRes.ok) setStripeStatus(await stripeRes.json() as StripeStatus);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const switchStripeMode = async (mode: "live" | "test") => {
    setSwitchingStripeMode(true);
    try {
      await apiFetch("/superadmin/stripe/mode", { method: "POST", body: JSON.stringify({ mode }) });
      await loadAll();
    } finally { setSwitchingStripeMode(false); }
  };

  const setupTestStripe = async () => {
    setSettingUpStripe(true); setStripeMsg(null);
    try {
      const r = await apiFetch("/superadmin/stripe/setup-test", { method: "POST" });
      const d = await r.json() as { ok?: boolean; count?: number; error?: string };
      setStripeMsg(r.ok ? `${d.count} Preise angelegt.` : `Fehler: ${d.error}`);
      await loadAll();
    } finally { setSettingUpStripe(false); }
  };

  const handleImpersonate = async (accountId: string) => {
    const r = await apiFetch(`/superadmin/impersonate/${accountId}`, { method: "POST" });
    if (r.ok) { window.location.href = "/"; }
    else { const d = await r.json() as { error: string }; alert(d.error ?? "Fehler"); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            ["Konten", stats.accountCount],
            ["Benutzer", stats.userCount],
            ["Protokolle", stats.protocolCount],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-white border border-neutral-200 rounded-xl p-4">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
              <p className="text-2xl font-bold text-neutral-900">{value}</p>
            </div>
          ))}
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Pläne</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(stats.planBreakdown).map(([plan, cnt]) => (
                <span key={plan} className="text-xs text-neutral-600"><span className="font-bold">{cnt}</span> {plan}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {stripeStatus && (
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard size={14} className="text-neutral-400" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Stripe</span>
            <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded ${stripeStatus.mode === "test" ? "bg-neutral-100 text-neutral-500" : "bg-black text-white"}`}>
              {stripeStatus.mode === "test" ? "TEST" : "LIVE"}
            </span>
          </div>
          <div className="flex gap-2 mb-3">
            {(["live", "test"] as const).map((m) => (
              <button key={m} onClick={() => switchStripeMode(m)} disabled={switchingStripeMode || stripeStatus.mode === m}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${stripeStatus.mode === m ? "bg-black text-white border-black" : "border-neutral-200 text-neutral-400 hover:border-neutral-400"}`}>
                {m === "live" ? "Live" : "Sandbox (Test)"}
              </button>
            ))}
          </div>
          {stripeStatus.mode === "test" && (
            <div className="space-y-1.5 mb-3">
              <StatusRow label="STRIPE_SECRET_KEY_TEST" ok={stripeStatus.test.keyConfigured} />
              <StatusRow label="STRIPE_PUBLISHABLE_KEY_TEST" ok={stripeStatus.test.publishableKeyConfigured} />
              <StatusRow label="STRIPE_WEBHOOK_SECRET_TEST" ok={stripeStatus.test.webhookSecretConfigured} />
              <StatusRow label={`Testpreise (${stripeStatus.test.pricesConfigured}/${stripeStatus.test.pricesExpected})`} ok={stripeStatus.test.pricesConfigured >= stripeStatus.test.pricesExpected} />
            </div>
          )}
          {stripeStatus.mode === "test" && stripeStatus.test.keyConfigured && (
            <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1.5" onClick={setupTestStripe} disabled={settingUpStripe}>
              {settingUpStripe ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
              Testpreise {stripeStatus.test.pricesConfigured > 0 ? "aktualisieren" : "anlegen"}
            </Button>
          )}
          {stripeMsg && <p className="mt-2 text-xs text-neutral-400">{stripeMsg}</p>}
          {stripeStatus.mode === "test" && !stripeStatus.test.keyConfigured && (
            <div className="flex items-start gap-1.5 bg-neutral-50 rounded-lg p-2 mt-2">
              <AlertTriangle size={12} className="text-neutral-400 shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-500">Bitte <strong>STRIPE_SECRET_KEY_TEST</strong> in den Replit-Secrets eintragen.</p>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex gap-2">
          <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Konto suchen…" className="flex-1 text-sm h-9"
            onKeyDown={(e) => e.key === "Enter" && (setSearch(searchInput), setPage(1))} />
          <Button size="sm" onClick={() => { setSearch(searchInput); setPage(1); }} className="h-9 gap-1.5">
            <Search size={14} /> Suchen
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-neutral-400 text-sm gap-2">
            <RefreshCw size={14} className="animate-spin" /> Wird geladen…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-100">
                {["Konto", "Plan", "Status", "Lieg.", "Protos", "Benutzer", "Seit"].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-neutral-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} onClick={() => setSelectedAccountId(a.id)}
                  className="border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-neutral-800">{a.name}</td>
                  <td className="px-4 py-3"><PlanBadge plan={a.plan} /></td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{a.subscriptionStatus ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-600">{a.propertyCount}</td>
                  <td className="px-4 py-3 text-neutral-600">{a.protocolCount}</td>
                  <td className="px-4 py-3 text-neutral-600">{a.userCount}</td>
                  <td className="px-4 py-3 text-xs text-neutral-400">
                    {new Date(a.createdAt).toLocaleDateString("de-CH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 text-xs text-neutral-400">
            <span>Seite {page} / {totalPages} · {total} Konten</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0"><ChevronLeft size={14} /></Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0"><ChevronRight size={14} /></Button>
            </div>
          </div>
        )}
      </div>

      {selectedAccountId && (
        <AccountDetailModal
          accountId={selectedAccountId}
          onClose={() => setSelectedAccountId(null)}
          onImpersonate={handleImpersonate}
          onPlanSaved={() => { setSelectedAccountId(null); void loadAll(); }}
        />
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  isImpersonating: boolean;
  onEndImpersonation: () => Promise<void>;
}

const NAV: { id: AdminSection; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: "support",  label: "Support",     Icon: MessageSquare },
  { id: "roadmap",  label: "Roadmap",     Icon: Map           },
  { id: "coupons",  label: "Rabattcodes", Icon: Tag           },
  { id: "accounts", label: "Konten",      Icon: Building2     },
];

export default function SuperadminPage({ onBack, isImpersonating, onEndImpersonation }: Props) {
  const [section, setSection] = useState<AdminSection>("support");
  const [endingImpersonation, setEndingImpersonation] = useState(false);

  const handleEndImpersonation = async () => {
    setEndingImpersonation(true);
    try { await onEndImpersonation(); } finally { setEndingImpersonation(false); }
  };

  const activeNav = NAV.find((n) => n.id === section);

  return (
    <div className="h-screen flex overflow-hidden bg-neutral-50">

      {/* ── Sidebar ── */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-neutral-200 flex flex-col">
        <div className="h-14 flex items-center gap-2 px-4 border-b border-neutral-100">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-neutral-800">Admin</span>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                section === id
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
              }`}
            >
              <Icon size={16} className={section === id ? "text-neutral-800" : "text-neutral-400"} />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-neutral-100 space-y-1">
          {isImpersonating && (
            <button
              onClick={handleEndImpersonation}
              disabled={endingImpersonation}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-black text-white hover:bg-neutral-800 transition-colors"
            >
              {endingImpersonation ? <RefreshCw size={13} className="animate-spin" /> : <Eye size={13} />}
              Impersonation beenden
            </button>
          )}
          <button
            onClick={onBack}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <LogOut size={13} />
            Zurück zur App
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="h-14 bg-white border-b border-neutral-200 flex items-center justify-between px-6 flex-shrink-0">
          <h1 className="text-sm font-semibold text-neutral-800 flex items-center gap-2">
            {activeNav && <activeNav.Icon size={15} className="text-neutral-500" />}
            {activeNav?.label}
          </h1>
          {isImpersonating && (
            <span className="text-xs bg-neutral-900 text-white px-2.5 py-1 rounded-full font-medium">
              Impersonation aktiv
            </span>
          )}
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {section === "support"  && <SuperadminSupportTab />}
          {section === "roadmap"  && <SuperadminRoadmapTab />}
          {section === "coupons"  && <SuperadminCouponsTab />}
          {section === "accounts" && <AccountsSection />}
        </div>
      </div>
    </div>
  );
}
