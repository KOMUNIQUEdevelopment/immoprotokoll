import React, { useState, useEffect, useCallback } from "react";
import {
  Search, ChevronLeft, ChevronRight, Users, FileText, Building2,
  Settings, LogOut, Shield, ArrowLeft, Check, X, ExternalLink,
  RefreshCw, Eye,
} from "lucide-react";
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
  users: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: string;
  }>;
}

interface Stats {
  accountCount: number;
  userCount: number;
  protocolCount: number;
  planBreakdown: Record<string, number>;
}

const PLAN_BADGE: Record<string, string> = {
  free: "bg-[hsl(0,0%,88%)] text-[hsl(0,0%,30%)]",
  privat: "bg-[hsl(0,0%,20%)] text-[hsl(0,0%,95%)]",
  agentur: "bg-[hsl(0,0%,10%)] text-[hsl(0,0%,95%)]",
  custom: "bg-[hsl(0,0%,0%)] text-[hsl(0,0%,100%)]",
};

const STATUS_BADGE: Record<string, string> = {
  active: "text-[hsl(0,0%,20%)]",
  trialing: "text-[hsl(0,0%,40%)]",
  past_due: "text-[hsl(0,0%,20%)] font-semibold",
  canceled: "text-[hsl(0,0%,60%)]",
  unpaid: "text-[hsl(0,0%,20%)] font-semibold",
  incomplete: "text-[hsl(0,0%,60%)]",
};

function PlanBadge({ plan }: { plan: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PLAN_BADGE[plan] ?? "bg-[hsl(0,0%,88%)] text-[hsl(0,0%,30%)]"}`}>
      {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-[hsl(0,0%,97%)] border border-[hsl(0,0%,88%)] rounded-lg p-4">
      <p className="text-xs font-medium text-[hsl(0,0%,50%)] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-[hsl(0,0%,8%)] mt-1">{value}</p>
    </div>
  );
}

interface CustomPlanEditorProps {
  account: AccountRow;
  onSave: (updates: Partial<AccountRow>) => Promise<void>;
  onClose: () => void;
}

function CustomPlanEditor({ account, onSave, onClose }: CustomPlanEditorProps) {
  const [plan, setPlan] = useState(account.plan);
  const [maxProps, setMaxProps] = useState(account.customMaxProperties?.toString() ?? "");
  const [maxProtos, setMaxProtos] = useState(account.customMaxProtocols?.toString() ?? "");
  const [maxUsers, setMaxUsers] = useState(account.customMaxUsers?.toString() ?? "");
  const [notes, setNotes] = useState(account.customPricingNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        plan,
        customMaxProperties: maxProps ? parseInt(maxProps, 10) : null,
        customMaxProtocols: maxProtos ? parseInt(maxProtos, 10) : null,
        customMaxUsers: maxUsers ? parseInt(maxUsers, 10) : null,
        customPricingNotes: notes || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-[hsl(0,0%,88%)]">
        <div className="flex items-center justify-between p-5 border-b border-[hsl(0,0%,90%)]">
          <div>
            <h2 className="text-base font-semibold text-[hsl(0,0%,8%)]">Plan konfigurieren</h2>
            <p className="text-xs text-[hsl(0,0%,50%)] mt-0.5">{account.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)]"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Plan</label>
            <div className="grid grid-cols-4 gap-2">
              {(["free", "privat", "agentur", "custom"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  className={`py-1.5 px-2 rounded-md border text-xs font-medium transition-colors ${
                    plan === p
                      ? "bg-[hsl(0,0%,8%)] text-white border-[hsl(0,0%,8%)]"
                      : "bg-white text-[hsl(0,0%,30%)] border-[hsl(0,0%,80%)] hover:border-[hsl(0,0%,60%)]"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {plan === "custom" && (
            <div className="space-y-3 bg-[hsl(0,0%,97%)] rounded-lg p-4 border border-[hsl(0,0%,90%)]">
              <p className="text-xs font-semibold text-[hsl(0,0%,30%)] mb-2">Custom-Limits (leer = unbegrenzt)</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[hsl(0,0%,50%)] mb-1">Liegenschaften</label>
                  <Input
                    type="number"
                    min="0"
                    value={maxProps}
                    onChange={(e) => setMaxProps(e.target.value)}
                    placeholder="∞"
                    className="text-sm h-8"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[hsl(0,0%,50%)] mb-1">Protokolle</label>
                  <Input
                    type="number"
                    min="0"
                    value={maxProtos}
                    onChange={(e) => setMaxProtos(e.target.value)}
                    placeholder="∞"
                    className="text-sm h-8"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[hsl(0,0%,50%)] mb-1">Benutzer</label>
                  <Input
                    type="number"
                    min="0"
                    value={maxUsers}
                    onChange={(e) => setMaxUsers(e.target.value)}
                    placeholder="∞"
                    className="text-sm h-8"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Preisnotizen (intern)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="z.B. CHF 299/Jahr, Vertrag bis 2026-12-31"
              className="w-full rounded-md border border-[hsl(0,0%,80%)] text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(0,0%,40%)]"
            />
          </div>

          {error && <p className="text-xs text-[hsl(0,0%,30%)] bg-[hsl(0,0%,93%)] rounded px-3 py-2">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-[hsl(0,0%,90%)]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Abbrechen</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AccountDetailPanelProps {
  accountId: string;
  onClose: () => void;
  onImpersonate: (accountId: string) => Promise<void>;
  onEdit: (account: AccountRow) => void;
}

function AccountDetailPanel({ accountId, onClose, onImpersonate, onEdit }: AccountDetailPanelProps) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/superadmin/accounts/${accountId}`)
      .then((r) => r.json())
      .then((d: { account: AccountDetail; users: AccountDetail["users"]; protocolCount: number; propertyCount: number }) => {
        setDetail({ ...d.account, users: d.users, protocolCount: d.protocolCount, propertyCount: d.propertyCount });
      })
      .finally(() => setLoading(false));
  }, [accountId]);

  const handleImpersonate = async () => {
    setImpersonating(true);
    try {
      await onImpersonate(accountId);
    } finally {
      setImpersonating(false);
    }
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-[hsl(0,0%,60%)] text-sm">
      <RefreshCw size={16} className="animate-spin mr-2" /> Wird geladen…
    </div>
  );

  if (!detail) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-5 border-b border-[hsl(0,0%,90%)] flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[hsl(0,0%,8%)]">{detail.name}</h2>
          <p className="text-xs text-[hsl(0,0%,50%)] mt-0.5">
            Erstellt {new Date(detail.createdAt).toLocaleDateString("de-CH")}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)] flex-shrink-0"><X size={16} /></button>
      </div>

      <div className="p-5 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Liegenschaften" value={detail.propertyCount} />
          <StatCard label="Protokolle" value={detail.protocolCount} />
          <StatCard label="Benutzer" value={detail.userCount} />
        </div>

        <div className="bg-[hsl(0,0%,97%)] rounded-lg p-4 border border-[hsl(0,0%,90%)]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-[hsl(0,0%,30%)] uppercase tracking-wide">Plan</p>
            <PlanBadge plan={detail.plan} />
          </div>
          {detail.subscriptionStatus && (
            <p className={`text-xs mt-1 ${STATUS_BADGE[detail.subscriptionStatus] ?? ""}`}>
              Status: {detail.subscriptionStatus}
            </p>
          )}
          {detail.currentPeriodEnd && (
            <p className="text-xs text-[hsl(0,0%,50%)] mt-1">
              Periode bis: {new Date(detail.currentPeriodEnd).toLocaleDateString("de-CH")}
            </p>
          )}
          {detail.plan === "custom" && (
            <div className="mt-2 pt-2 border-t border-[hsl(0,0%,88%)] space-y-1">
              {detail.customMaxProperties != null && (
                <p className="text-xs text-[hsl(0,0%,40%)]">Max. Liegenschaften: <strong>{detail.customMaxProperties}</strong></p>
              )}
              {detail.customMaxProtocols != null && (
                <p className="text-xs text-[hsl(0,0%,40%)]">Max. Protokolle: <strong>{detail.customMaxProtocols}</strong></p>
              )}
              {detail.customMaxUsers != null && (
                <p className="text-xs text-[hsl(0,0%,40%)]">Max. Benutzer: <strong>{detail.customMaxUsers}</strong></p>
              )}
              {detail.customPricingNotes && (
                <p className="text-xs text-[hsl(0,0%,40%)] italic mt-1">{detail.customPricingNotes}</p>
              )}
            </div>
          )}
        </div>

        {detail.users.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-[hsl(0,0%,30%)] uppercase tracking-wide mb-2">Benutzer</p>
            <div className="space-y-1.5">
              {detail.users.map((u) => (
                <div key={u.id} className="flex items-center justify-between bg-[hsl(0,0%,98%)] border border-[hsl(0,0%,90%)] rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-[hsl(0,0%,10%)]">
                      {u.firstName || u.lastName ? `${u.firstName} ${u.lastName}`.trim() : u.email}
                    </p>
                    <p className="text-xs text-[hsl(0,0%,50%)]">{u.email}</p>
                  </div>
                  <span className="text-xs text-[hsl(0,0%,50%)] bg-[hsl(0,0%,93%)] px-2 py-0.5 rounded">{u.role}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 justify-start"
            onClick={() => onEdit(detail)}
          >
            <Settings size={14} /> Plan konfigurieren
          </Button>
          <Button
            size="sm"
            className="gap-1.5 justify-start bg-[hsl(0,0%,8%)] text-white hover:bg-[hsl(0,0%,15%)]"
            onClick={handleImpersonate}
            disabled={impersonating}
          >
            {impersonating ? <RefreshCw size={14} className="animate-spin" /> : <Eye size={14} />}
            Als dieses Konto anzeigen
          </Button>
        </div>
      </div>
    </div>
  );
}

interface Props {
  onBack: () => void;
  isImpersonating: boolean;
  onEndImpersonation: () => Promise<void>;
}

export default function SuperadminPage({ onBack, isImpersonating, onEndImpersonation }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<AccountRow | null>(null);
  const [endingImpersonation, setEndingImpersonation] = useState(false);

  const limit = 20;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadStats = useCallback(async () => {
    try {
      const r = await apiFetch("/superadmin/stats");
      if (r.ok) setStats(await r.json() as Stats);
    } catch { /* ignore */ }
  }, []);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      const r = await apiFetch(`/superadmin/accounts?${params}`);
      if (r.ok) {
        const d = await r.json() as { accounts: AccountRow[]; total: number };
        setAccounts(d.accounts);
        setTotal(d.total);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
    setSelectedAccountId(null);
  };

  const handleImpersonate = async (accountId: string) => {
    const r = await apiFetch(`/superadmin/impersonate/${accountId}`, { method: "POST" });
    if (r.ok) {
      window.location.href = "/";
    } else {
      const d = await r.json() as { error: string };
      alert(d.error ?? "Impersonation failed");
    }
  };

  const handleEndImpersonation = async () => {
    setEndingImpersonation(true);
    try {
      await onEndImpersonation();
    } finally {
      setEndingImpersonation(false);
    }
  };

  const handleSaveAccountPlan = async (updates: Partial<AccountRow>) => {
    if (!editingAccount) return;
    const r = await apiFetch(`/superadmin/accounts/${editingAccount.id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    if (!r.ok) {
      const d = await r.json() as { error: string };
      throw new Error(d.error ?? "Failed to save");
    }
    await loadAccounts();
    await loadStats();
  };

  return (
    <div className="min-h-screen bg-[hsl(0,0%,98%)] flex flex-col">
      {isImpersonating && (
        <div className="bg-[hsl(0,0%,8%)] text-white px-4 py-2 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Eye size={14} />
            <span>Superadmin-Modus: Ansicht als anderes Konto</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleEndImpersonation}
            disabled={endingImpersonation}
            className="border-white/30 text-white hover:bg-white/10 h-7 text-xs"
          >
            {endingImpersonation ? <RefreshCw size={12} className="animate-spin mr-1" /> : <LogOut size={12} className="mr-1" />}
            Impersonation beenden
          </Button>
        </div>
      )}

      <header className="bg-white border-b border-[hsl(0,0%,88%)] px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)]">
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-[hsl(0,0%,30%)]" />
          <h1 className="text-sm font-semibold text-[hsl(0,0%,10%)]">Superadmin Dashboard</h1>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <div className={`flex flex-col ${selectedAccountId ? "w-1/2 border-r border-[hsl(0,0%,88%)]" : "w-full"}`}>
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-[hsl(0,0%,90%)]">
              <StatCard label="Konten" value={stats.accountCount} />
              <StatCard label="Benutzer" value={stats.userCount} />
              <StatCard label="Protokolle" value={stats.protocolCount} />
              <div className="bg-[hsl(0,0%,97%)] border border-[hsl(0,0%,88%)] rounded-lg p-4">
                <p className="text-xs font-medium text-[hsl(0,0%,50%)] uppercase tracking-wide mb-1">Pläne</p>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(stats.planBreakdown).map(([plan, cnt]) => (
                    <span key={plan} className="text-xs text-[hsl(0,0%,30%)]">
                      <span className="font-medium">{cnt}</span> {plan}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="p-4 border-b border-[hsl(0,0%,90%)] flex gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Konto suchen…"
              className="flex-1 text-sm h-9"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button size="sm" onClick={handleSearch} className="gap-1.5 h-9">
              <Search size={14} /> Suchen
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-[hsl(0,0%,50%)] text-sm gap-2">
                <RefreshCw size={14} className="animate-spin" /> Wird geladen…
              </div>
            ) : accounts.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-[hsl(0,0%,50%)] text-sm">
                Keine Konten gefunden
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[hsl(0,0%,90%)] bg-[hsl(0,0%,97%)]">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Konto</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Plan</th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">
                      <Building2 size={12} className="inline mr-1" />Liegesch.
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">
                      <FileText size={12} className="inline mr-1" />Proto.
                    </th>
                    <th className="text-center px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">
                      <Users size={12} className="inline mr-1" />User
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((acc) => (
                    <tr
                      key={acc.id}
                      onClick={() => setSelectedAccountId(acc.id === selectedAccountId ? null : acc.id)}
                      className={`border-b border-[hsl(0,0%,92%)] cursor-pointer transition-colors ${
                        acc.id === selectedAccountId
                          ? "bg-[hsl(0,0%,92%)]"
                          : "hover:bg-[hsl(0,0%,95%)]"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-[hsl(0,0%,10%)]">{acc.name}</p>
                        <p className="text-xs text-[hsl(0,0%,55%)]">{new Date(acc.createdAt).toLocaleDateString("de-CH")}</p>
                      </td>
                      <td className="px-4 py-3"><PlanBadge plan={acc.plan} /></td>
                      <td className="px-4 py-3 text-center text-[hsl(0,0%,30%)] font-mono">{acc.propertyCount}</td>
                      <td className="px-4 py-3 text-center text-[hsl(0,0%,30%)] font-mono">{acc.protocolCount}</td>
                      <td className="px-4 py-3 text-center text-[hsl(0,0%,30%)] font-mono">{acc.userCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(0,0%,90%)] bg-white">
              <span className="text-xs text-[hsl(0,0%,50%)]">
                Seite {page} von {totalPages} · {total} Konten
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 w-7 p-0">
                  <ChevronLeft size={14} />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 w-7 p-0">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {selectedAccountId && (
          <div className="w-1/2 flex flex-col overflow-hidden bg-white">
            <AccountDetailPanel
              accountId={selectedAccountId}
              onClose={() => setSelectedAccountId(null)}
              onImpersonate={handleImpersonate}
              onEdit={(acc) => setEditingAccount(acc)}
            />
          </div>
        )}
      </main>

      {editingAccount && (
        <CustomPlanEditor
          account={editingAccount}
          onSave={handleSaveAccountPlan}
          onClose={() => setEditingAccount(null)}
        />
      )}
    </div>
  );
}
