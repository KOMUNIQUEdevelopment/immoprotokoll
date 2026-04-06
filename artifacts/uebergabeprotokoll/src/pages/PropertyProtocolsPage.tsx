import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { ProtocolData, Property, UNASSIGNED_PROPERTY } from "../types";
import { TrashedEntry } from "../store";
import {
  ArrowLeft, Plus, ClipboardList, MapPin, Calendar,
  Pencil, Trash2, Copy, Link, Check, X, AlertTriangle, RotateCcw, ChevronDown, ChevronUp, Search, Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SortKey = "name-asc" | "name-desc" | "newest" | "oldest";

interface PlanLimits {
  plan: string;
  properties: number | null;
  protocolsPerProperty: number | null;
}

interface PropertyProtocolsPageProps {
  property: Property;
  protocols: Record<string, ProtocolData>;
  trashedProtocols: Record<string, TrashedEntry>;
  onBack: () => void;
  onCreate: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
  onEmptyTrash: () => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

function langToLocale(lang: string): string {
  if (lang === "de-CH") return "de-CH";
  if (lang === "de-DE") return "de-DE";
  return "en-GB";
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(langToLocale(i18n.language), {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

interface DeleteConfirmProps {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ label, onConfirm, onCancel }: DeleteConfirmProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-neutral-700" />
          </div>
          <div>
            <h2 className="font-semibold text-black text-sm">{t("protocols.deleteProtocol")}</h2>
            <p className="text-xs text-neutral-500 mt-1">
              <span className="font-medium text-black">{label}</span>{" "}
              {t("protocols.deleteProtocolHint", { name: "" }).replace("{{name}} ", "")}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} className="border-neutral-200">{t("common.cancel")}</Button>
          <Button size="sm" onClick={onConfirm} className="bg-black text-white hover:bg-neutral-800">{t("common.delete")}</Button>
        </div>
      </div>
    </div>
  );
}

interface RenameModalProps {
  current: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

function RenameModal({ current, onSave, onClose }: RenameModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(current);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-black text-sm">{t("protocols.rename")}</h2>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-neutral-500 hover:bg-neutral-100"><X size={16} /></button>
        </div>
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          className="text-sm mb-3"
          placeholder={t("protocols.renamePlaceholder")}
          onKeyDown={e => { if (e.key === "Enter" && name.trim()) { onSave(name.trim()); onClose(); } }}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} className="border-neutral-200">{t("common.cancel")}</Button>
          <Button size="sm" disabled={!name.trim()} onClick={() => { onSave(name.trim()); onClose(); }}
            className="bg-black text-white hover:bg-neutral-800 gap-1.5">
            <Check size={13} />{t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Send Tenant Invite Modal ─────────────────────────────────────────────────

interface SendInviteModalProps {
  protocolId: string;
  onClose: () => void;
}

function SendTenantInviteModal({ protocolId, onClose }: SendInviteModalProps) {
  const { t } = useTranslation();
  const [emailsInput, setEmailsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSend = async () => {
    const emails = emailsInput
      .split(/[\s,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emails.length === 0) {
      setError(t("protocols.sendInviteInvalidEmail"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/protocol/${protocolId}/send-tenant-invite`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? t("protocols.sendInviteError"));
      } else {
        setSent(true);
      }
    } catch {
      setError(t("protocols.sendInviteError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
              <Mail size={15} className="text-neutral-700" />
            </div>
            <h2 className="font-semibold text-black text-sm">{t("protocols.sendInviteTitle")}</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-neutral-500 hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                <Check size={18} className="text-neutral-700" />
              </div>
              <p className="text-sm font-medium text-black">{t("protocols.sendInviteSuccess")}</p>
              <p className="text-xs text-neutral-500">{t("protocols.sendInviteSuccessHint")}</p>
            </div>
            <Button onClick={onClose} className="w-full bg-black text-white hover:bg-neutral-800 rounded-lg">
              {t("common.close")}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-neutral-500">{t("protocols.sendInviteHint")}</p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-600 uppercase tracking-wider">
                {t("protocols.sendInviteEmailsLabel")}
              </label>
              <textarea
                value={emailsInput}
                onChange={e => { setEmailsInput(e.target.value); setError(""); }}
                placeholder={t("protocols.sendInviteEmailsPlaceholder")}
                rows={3}
                autoFocus
                className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-black transition-colors resize-none"
              />
              <p className="text-xs text-neutral-400">{t("protocols.sendInviteEmailsHint")}</p>
            </div>
            {error && <p className="text-xs font-medium text-neutral-700">{error}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={onClose} className="border-neutral-200">
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={loading || !emailsInput.trim()}
                className="bg-black text-white hover:bg-neutral-800 gap-1.5"
              >
                {loading ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Mail size={13} />
                )}
                {t("protocols.sendInviteBtn")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function syncShareLink(id: string): string {
  return `${window.location.origin}${window.location.pathname}#/view/${id}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

export default function PropertyProtocolsPage({
  property,
  protocols,
  trashedProtocols,
  onBack,
  onCreate,
  onOpen,
  onDelete,
  onRestore,
  onPermanentlyDelete,
  onEmptyTrash,
  onDuplicate,
  onRename,
}: PropertyProtocolsPageProps) {
  const { t } = useTranslation();
  const [deleteTarget, setDeleteTarget] = useState<ProtocolData | null>(null);
  const [renameTarget, setRenameTarget] = useState<ProtocolData | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sendInviteId, setSendInviteId] = useState<string | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  useEffect(() => {
    fetch("/api/properties/plan-limits", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPlanLimits(data); })
      .catch(() => {});
  }, []);

  const isUnassignedView = property.id === UNASSIGNED_PROPERTY.id;

  const allPropertyProtocols = Object.values(protocols)
    .filter(p => isUnassignedView ? !p.propertyId : p.propertyId === property.id);

  const propertyProtocols = allPropertyProtocols
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const name = (p.mietobjekt || "").toLowerCase();
      const parties = [...(p.uebergeber ?? []), ...(p.uebernehmer ?? [])]
        .map(x => (x.name || "").toLowerCase()).join(" ");
      return name.includes(q) || parties.includes(q);
    })
    .sort((a, b) => {
      if (sortKey === "name-asc") return (a.mietobjekt || "").localeCompare(b.mietobjekt || "", undefined, { sensitivity: "base" });
      if (sortKey === "name-desc") return (b.mietobjekt || "").localeCompare(a.mietobjekt || "", undefined, { sensitivity: "base" });
      if (sortKey === "oldest") {
        const aTime = a.lastSaved ? new Date(a.lastSaved).getTime() : 0;
        const bTime = b.lastSaved ? new Date(b.lastSaved).getTime() : 0;
        return aTime - bTime;
      }
      // newest (default)
      const aTime = a.lastSaved ? new Date(a.lastSaved).getTime() : 0;
      const bTime = b.lastSaved ? new Date(b.lastSaved).getTime() : 0;
      return bTime - aTime;
    });

  const propertyTrashed = Object.entries(trashedProtocols)
    .filter(([, e]) => isUnassignedView ? !e.protocol.propertyId : e.protocol.propertyId === property.id);

  const handleCreate = () => {
    if (planLimits && planLimits.protocolsPerProperty !== null) {
      const activeCount = Object.values(protocols).filter(
        p => p.propertyId === property.id
      ).length;
      if (activeCount >= planLimits.protocolsPerProperty) {
        setLimitError(t("protocols.protocolLimitHint"));
        return;
      }
    }
    setLimitError(null);
    onCreate();
  };

  const handleCopyLink = (id: string) => {
    copyToClipboard(syncShareLink(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors shrink-0"
            title={t("common.back")}
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-semibold text-sm leading-tight truncate text-black">
              {isUnassignedView ? t("properties.unassigned") : property.name}
            </h1>
            {property.adresse && (
              <p className="text-xs text-neutral-500 flex items-center gap-1 truncate">
                <MapPin size={10} />{isUnassignedView ? t("properties.unassignedHint") : property.adresse}
              </p>
            )}
          </div>
          {!isUnassignedView && (
            <Button
              size="sm"
              onClick={handleCreate}
              className="bg-black text-white hover:bg-neutral-800 gap-1.5 shrink-0"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">{t("protocols.newProtocol")}</span>
              <span className="sm:hidden">{t("common.create")}</span>
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {limitError && (
          <div className="flex items-start gap-2 mb-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-neutral-500" />
            <span className="flex-1">{limitError}</span>
            <button type="button" onClick={() => setLimitError(null)} className="text-neutral-400 hover:text-black transition-colors">
              <X size={14} />
            </button>
          </div>
        )}

        {allPropertyProtocols.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("common.search")}
                className="w-full pl-8 pr-3 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:border-black transition-colors"
              />
            </div>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value as SortKey)}
              className="text-sm border border-neutral-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-black text-neutral-700 shrink-0"
            >
              <option value="newest">{t("common.sortNewest")}</option>
              <option value="oldest">{t("common.sortOldest")}</option>
              <option value="name-asc">{t("common.sortAZ")}</option>
              <option value="name-desc">{t("common.sortZA")}</option>
            </select>
          </div>
        )}

        {allPropertyProtocols.length === 0 && propertyTrashed.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <ClipboardList size={24} className="text-neutral-400" />
            </div>
            <p className="font-semibold text-black text-sm">{t("protocols.noProtocols")}</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              {t("protocols.noProtocolsHint")}
            </p>
            {!isUnassignedView && (
              <Button
                size="sm"
                onClick={handleCreate}
                className="mt-4 bg-black text-white hover:bg-neutral-800 gap-1.5"
              >
                <Plus size={14} />
                {t("protocols.createFirst")}
              </Button>
            )}
          </div>
        )}

        {allPropertyProtocols.length > 0 && propertyProtocols.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={24} className="text-neutral-300 mb-3" />
            <p className="text-sm text-neutral-500">{t("common.noResults")}</p>
          </div>
        )}

        {propertyProtocols.length > 0 && (
          <ul className="space-y-2 mb-6">
            {propertyProtocols.map(protocol => {
              const allParties = [...(protocol.uebergeber ?? []), ...(protocol.uebernehmer ?? [])];
              const signedCount = allParties.filter(p =>
                protocol.personSignatures?.some(s => s.personId === p.id && s.signatureDataUrl)
              ).length;
              const fullySignedOrNone = allParties.length > 0 && signedCount === allParties.length;

              return (
                <li key={protocol.id}>
                  <div className="group rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 transition-colors">
                    <button
                      type="button"
                      className="w-full flex items-start gap-3 p-4 text-left"
                      onClick={() => onOpen(protocol.id)}
                    >
                      <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                        {fullySignedOrNone ? (
                          <Check size={16} className="text-neutral-700" />
                        ) : (
                          <ClipboardList size={16} className="text-neutral-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-black truncate">
                          {protocol.mietobjekt || t("common.unnamed")}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                          {protocol.datum && (
                            <span className="text-xs text-neutral-500 flex items-center gap-1">
                              <Calendar size={10} />{protocol.datum}
                            </span>
                          )}
                          {protocol.lastSaved && (
                            <span className="text-xs text-neutral-400">
                              {formatDate(protocol.lastSaved)}
                            </span>
                          )}
                        </div>
                        {allParties.length > 0 && (
                          <p className="text-xs text-neutral-500 mt-0.5 truncate">
                            {allParties.map((p, i) => (
                              <span key={p.id}>{i > 0 ? ", " : ""}{p.name || "—"}</span>
                            ))}
                          </p>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 px-4 pb-3">
                      <button
                        type="button"
                        onClick={() => setRenameTarget(protocol)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors text-xs flex items-center gap-1"
                        title={t("protocols.rename")}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDuplicate(protocol.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors text-xs flex items-center gap-1"
                        title={t("protocols.duplicate")}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyLink(protocol.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors text-xs flex items-center gap-1"
                        title={t("protocols.copyLink")}
                      >
                        {copiedId === protocol.id ? <Check size={13} /> : <Link size={13} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSendInviteId(protocol.id)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors text-xs flex items-center gap-1"
                        title={t("protocols.sendInvite")}
                      >
                        <Mail size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(protocol)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
                        title={t("common.delete")}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {propertyTrashed.length > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowTrash(v => !v)}
              className="flex items-center gap-2 text-xs font-medium text-neutral-500 hover:text-black transition-colors mb-3"
            >
              <Trash2 size={13} />
              {t("protocols.trash")} ({propertyTrashed.length})
              {showTrash ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {showTrash && (
              <>
                <ul className="space-y-2 mb-3">
                  {propertyTrashed.map(([id, entry]) => (
                    <li key={id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-600 truncate">
                          {entry.protocol.mietobjekt || t("protocols.unnamed")}
                        </p>
                        <p className="text-xs text-neutral-400 mt-0.5">
                          {t("protocols.deletedOn")} {formatDate(entry.deletedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => onRestore(id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-black transition-colors"
                          title={t("protocols.restoreProtocol")}
                        >
                          <RotateCcw size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPermanentlyDelete(id)}
                          className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-200 hover:text-black transition-colors"
                          title={t("protocols.permanentlyDelete")}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {propertyTrashed.length > 1 && (
                  <button
                    type="button"
                    onClick={onEmptyTrash}
                    className="text-xs text-neutral-500 hover:text-black transition-colors underline"
                  >
                    {t("protocols.emptyTrash")}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {deleteTarget && (
        <DeleteConfirm
          label={deleteTarget.mietobjekt || t("protocols.unnamed")}
          onConfirm={() => { onDelete(deleteTarget.id); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {renameTarget && (
        <RenameModal
          current={renameTarget.mietobjekt || ""}
          onSave={name => onRename(renameTarget.id, name)}
          onClose={() => setRenameTarget(null)}
        />
      )}
      {sendInviteId && (
        <SendTenantInviteModal
          protocolId={sendInviteId}
          onClose={() => setSendInviteId(null)}
        />
      )}
    </div>
  );
}
