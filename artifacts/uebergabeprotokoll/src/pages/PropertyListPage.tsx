import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Property, ProtocolData, UNASSIGNED_PROPERTY } from "../types";
import { Plus, Building2, Pencil, Trash2, MapPin, LogOut, X, Check, AlertTriangle, ClipboardList, Archive, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstallButton } from "../components/InstallButton";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";

const API_BASE = "/api";

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || res.statusText);
  }
  return res.json();
}

interface PropertyListPageProps {
  onSelectProperty: (property: Property) => void;
  onLogout?: () => void;
  protocols?: Record<string, ProtocolData>;
  onDeleteProperty?: (propertyId: string) => void;
  onShowBilling?: () => void;
  onShowPricing?: () => void;
  currentPlan?: string;
  userLang?: string;
  onChangeLang?: (lang: SupportedLanguage) => void;
}

interface DeleteConfirmProps {
  property: Property;
  protocolCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ property, protocolCount, onConfirm, onCancel }: DeleteConfirmProps) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-neutral-700" />
          </div>
          <div>
            <h2 className="font-semibold text-black text-sm">{t("properties.deleteProperty")}</h2>
            <p className="text-xs text-neutral-500 mt-1">
              {protocolCount > 0 ? (
                <>
                  <span className="font-medium text-black">{property.name}</span>
                  {" "}{t("properties.deletePropertyConfirm", {
                    name: "",
                    count: protocolCount,
                    plural: protocolCount !== 1 ? "e" : "",
                  }).replace("{{name}} ", "")}
                </>
              ) : (
                <>
                  <span className="font-medium text-black">{property.name}</span>
                  {" "}{t("properties.deletePropertyConfirmNone", { name: "" }).replace("{{name}} ", "")}
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} className="border-neutral-200">
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={onConfirm} className="bg-black text-white hover:bg-neutral-800">
            {t("common.delete")}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PropertyFormModalProps {
  initial?: Property;
  onSave: (name: string, adresse: string, language: string) => Promise<void>;
  onClose: () => void;
}

function PropertyFormModal({ initial, onSave, onClose }: PropertyFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [adresse, setAdresse] = useState(initial?.adresse ?? "");
  const [language, setLanguage] = useState<SupportedLanguage>((initial?.language as SupportedLanguage) ?? "de-CH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t("properties.nameRequired")); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(name.trim(), adresse.trim(), language);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("properties.savingError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-black text-sm">
            {initial ? t("properties.editProperty") : t("properties.newProperty")}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-neutral-500 hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">{t("common.name")} *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t("properties.namePlaceholder")}
              autoFocus
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">{t("common.address")}</label>
            <Input
              value={adresse}
              onChange={e => setAdresse(e.target.value)}
              placeholder={t("properties.addressPlaceholder")}
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">{t("properties.languageLabel")}</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value as SupportedLanguage)}
              className="w-full text-sm border border-neutral-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:border-black"
            >
              {SUPPORTED_LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
              ))}
            </select>
            <p className="text-xs text-neutral-500 mt-1">{t("properties.languageHint")}</p>
          </div>
          {error && <p className="text-xs text-neutral-700 bg-neutral-100 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="border-neutral-200">
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-black text-white hover:bg-neutral-800 gap-1.5">
              {saving ? (
                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={13} />
              )}
              {initial ? t("common.save") : t("common.create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LanguageDropdown({
  currentLang,
  onChangeLang,
}: {
  currentLang: string;
  onChangeLang: (lang: SupportedLanguage) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title={LANGUAGE_LABELS[currentLang as SupportedLanguage] ?? currentLang}
        className="flex items-center gap-1 p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
      >
        <Globe size={16} />
        <span className="text-xs font-medium hidden sm:inline">
          {currentLang === "de-CH" ? "DE-CH" : currentLang === "de-DE" ? "DE-DE" : "EN"}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl min-w-[180px] py-1 overflow-hidden">
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => { onChangeLang(lang); setOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-neutral-50 ${
                  currentLang === lang ? "font-semibold text-black" : "text-neutral-700"
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PropertyListPage({
  onSelectProperty,
  onLogout,
  protocols = {},
  onDeleteProperty,
  onShowBilling,
  onShowPricing,
  currentPlan = "free",
  userLang = "de-CH",
  onChangeLang,
}: PropertyListPageProps) {
  const { t } = useTranslation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Property | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Property | null>(null);

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/properties");
      setProperties(Array.isArray(data) ? data : (data?.properties ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("properties.loadingError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { loadProperties(); }, [loadProperties]);

  const handleCreate = async (name: string, adresse: string, language: string) => {
    const p = await apiFetch("/properties", {
      method: "POST",
      body: JSON.stringify({ name, adresse, language }),
    });
    setProperties(prev => [...prev, p]);
  };

  const handleEdit = async (name: string, adresse: string, language: string) => {
    if (!editTarget) return;
    const p = await apiFetch(`/properties/${editTarget.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, adresse, language }),
    });
    setProperties(prev => prev.map(x => x.id === p.id ? p : x));
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await apiFetch(`/properties/${deleteTarget.id}`, { method: "DELETE" });
    onDeleteProperty?.(deleteTarget.id);
    setProperties(prev => prev.filter(x => x.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src="/immoprotokoll-logo.png" alt="ImmoProtokoll" className="h-7" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            <span className="font-semibold text-sm text-black hidden sm:inline">{t("properties.properties")}</span>
          </div>
          <div className="flex items-center gap-2">
            <InstallButton />
            {(onShowBilling || onShowPricing) && (
              <button
                type="button"
                onClick={onShowBilling ?? onShowPricing}
                title={t("properties.billingSubscription")}
                className="flex items-center gap-1 px-2 py-1 rounded-md border border-neutral-200 text-xs font-medium text-neutral-500 hover:bg-neutral-50 hover:text-black transition-colors"
              >
                {currentPlan === "free" ? "Free" : currentPlan === "privat" ? "Privat" : currentPlan === "agentur" ? "Agentur" : "Custom"}
              </button>
            )}
            {onChangeLang && (
              <LanguageDropdown currentLang={userLang} onChangeLang={onChangeLang} />
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
                title={t("auth.logout")}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-black">{t("properties.properties")}</h1>
            <p className="text-xs text-neutral-500 mt-0.5">{t("properties.selectPropertyHint")}</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-black text-white hover:bg-neutral-800 gap-1.5 shrink-0"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">{t("properties.newProperty")}</span>
            <span className="sm:hidden">{t("properties.newPropertyShort")}</span>
          </Button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 text-sm text-neutral-700">
            {error}
            <button type="button" onClick={loadProperties} className="ml-3 underline text-black">{t("common.retry")}</button>
          </div>
        )}

        {!loading && !error && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Building2 size={24} className="text-neutral-400" />
            </div>
            <p className="font-semibold text-black text-sm">{t("properties.noProperties")}</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              {t("properties.noPropertiesHint")}
            </p>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="mt-4 bg-black text-white hover:bg-neutral-800 gap-1.5"
            >
              <Plus size={14} />
              {t("properties.createFirst")}
            </Button>
          </div>
        )}

        {!loading && !error && properties.length > 0 && (
          <ul className="space-y-2">
            {properties.map(property => (
              <li key={property.id}>
                <div className="group flex items-center gap-3 rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 transition-colors cursor-pointer">
                  <button
                    type="button"
                    className="flex-1 flex items-center gap-3 p-4 text-left min-w-0"
                    onClick={() => onSelectProperty(property)}
                  >
                    <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                      <Building2 size={17} className="text-neutral-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-black truncate">{property.name}</p>
                      {property.adresse && (
                        <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1 truncate">
                          <MapPin size={11} />
                          {property.adresse}
                        </p>
                      )}
                    </div>
                    {(() => {
                      const count = Object.values(protocols).filter(p => p.propertyId === property.id).length;
                      return (
                        <span className="inline-flex items-center gap-1 text-xs text-neutral-500 bg-neutral-100 rounded-md px-2 py-0.5 shrink-0">
                          <ClipboardList size={11} />
                          {count}
                        </span>
                      );
                    })()}
                  </button>
                  <div className="flex items-center gap-1 pr-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setEditTarget(property); }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
                      title={t("properties.editTitle")}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(property); }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
                      title={t("properties.deleteTitle")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {(() => {
          const unassignedCount = Object.values(protocols).filter(p => !p.propertyId).length;
          if (unassignedCount === 0) return null;
          return (
            <div className="mt-6">
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-2">{t("properties.unassigned")}</p>
              <button
                type="button"
                className="w-full flex items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-white transition-colors p-4 text-left"
                onClick={() => onSelectProperty(UNASSIGNED_PROPERTY)}
              >
                <div className="w-9 h-9 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                  <Archive size={17} className="text-neutral-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm text-black">{t("properties.unassignedProtocols")}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{t("properties.unassignedHint")}</p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs text-neutral-500 bg-neutral-100 rounded-md px-2 py-0.5 shrink-0">
                  <ClipboardList size={11} />
                  {unassignedCount}
                </span>
              </button>
            </div>
          );
        })()}
      </main>

      {showForm && (
        <PropertyFormModal
          onSave={handleCreate}
          onClose={() => setShowForm(false)}
        />
      )}

      {editTarget && (
        <PropertyFormModal
          initial={editTarget}
          onSave={handleEdit}
          onClose={() => setEditTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          property={deleteTarget}
          protocolCount={Object.values(protocols).filter(p => p.propertyId === deleteTarget.id).length}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
