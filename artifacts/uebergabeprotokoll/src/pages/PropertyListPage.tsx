import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Property, ProtocolData, UNASSIGNED_PROPERTY } from "../types";
import {
  Plus, Building2, Pencil, Trash2, MapPin, LogOut, X, Check,
  AlertTriangle, ClipboardList, Archive, ShieldCheck, Search, Camera, ArrowUpRight,
  HelpCircle, Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../i18n";
import SupportModal from "../components/SupportModal";

const API_BASE = "/api";

class ApiError extends Error {
  code: string;
  constructor(message: string, code = "") {
    super(message);
    this.code = code;
  }
}

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = res.statusText;
    let code = "";
    const text = await res.text().catch(() => "");
    try {
      const body = JSON.parse(text);
      message = body.error || message;
      code = body.code || "";
    } catch {
      message = text || message;
    }
    throw new ApiError(message, code);
  }
  return res.json();
}

function resizeImageToBase64(file: File, maxSize = 240): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.80));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface PropertyListPageProps {
  onSelectProperty: (property: Property) => void;
  onLogout?: () => void;
  protocols?: Record<string, ProtocolData>;
  onDeleteProperty?: (propertyId: string) => void;
  onShowBilling?: () => void;
  onShowPricing?: () => void;
  onShowSuperadmin?: () => void;
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
  onGoToBilling?: () => void;
}

function PropertyFormModal({ initial, onSave, onClose, onGoToBilling }: PropertyFormModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name ?? "");
  const [adresse, setAdresse] = useState(initial?.adresse ?? "");
  const [language, setLanguage] = useState<SupportedLanguage>((initial?.language as SupportedLanguage) ?? "de-CH");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t("properties.nameRequired")); return; }
    setSaving(true);
    setError("");
    setErrorCode("");
    try {
      await onSave(name.trim(), adresse.trim(), language);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        const raw = err instanceof Error ? err.message : t("properties.savingError");
        // Last-resort: if the message is a JSON string (e.g. from a stale cached
        // build that couldn't parse the response), extract the fields manually.
        try {
          const parsed = JSON.parse(raw);
          setError(parsed.error || raw);
          setErrorCode(parsed.code || "");
        } catch {
          setError(raw);
        }
      }
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
          {error && errorCode === "PROPERTY_LIMIT_EXCEEDED" ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={15} className="text-neutral-500 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-black">{t("properties.planLimitReached")}</p>
                  <p className="text-xs text-neutral-600">{t("properties.planLimitUpgradeHint")}</p>
                </div>
              </div>
              {onGoToBilling && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => { onClose(); onGoToBilling(); }}
                  className="w-full bg-black text-white hover:bg-neutral-800 gap-1.5 rounded-lg"
                >
                  {t("properties.upgradeNow")}
                  <ArrowUpRight size={13} />
                </Button>
              )}
            </div>
          ) : error ? (
            <p className="text-xs text-neutral-700 bg-neutral-100 rounded-lg px-3 py-2">{error}</p>
          ) : null}
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

type SortKey = "name-asc" | "name-desc" | "newest" | "oldest";

function sortProperties(list: Property[], sortKey: SortKey): Property[] {
  return [...list].sort((a, b) => {
    if (sortKey === "name-asc") return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    if (sortKey === "name-desc") return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
    if (sortKey === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortKey === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return 0;
  });
}

export default function PropertyListPage({
  onSelectProperty,
  onLogout,
  protocols = {},
  onDeleteProperty,
  onShowBilling,
  onShowPricing,
  onShowSuperadmin,
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

  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [showSupport, setShowSupport] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [uploadingPhotoId, setUploadingPhotoId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoTargetRef = useRef<string | null>(null);

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

  const handlePhotoClick = (propertyId: string) => {
    photoTargetRef.current = propertyId;
    photoInputRef.current?.click();
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = photoTargetRef.current;
    if (!file || !id) return;
    e.target.value = "";
    setUploadingPhotoId(id);
    try {
      const dataUrl = await resizeImageToBase64(file, 240);
      const updated = await apiFetch(`/properties/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ photoDataUrl: dataUrl }),
      });
      setProperties(prev => prev.map(x => x.id === updated.id ? updated : x));
    } catch {
      // silently ignore upload error
    } finally {
      setUploadingPhotoId(null);
      photoTargetRef.current = null;
    }
  };

  const displayedProperties = sortProperties(
    properties.filter(p =>
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.adresse.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    sortKey
  );

  const showSearchSort = properties.length > 0;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}immoprotokoll-logo-black.png`} alt="ImmoProtokoll" className="h-7 w-7 rounded-sm" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            <span className="font-semibold text-sm text-black">ImmoProtokoll</span>
          </div>
          <div className="flex items-center gap-2">
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
            {onShowSuperadmin && (
              <button
                type="button"
                onClick={onShowSuperadmin}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
                title="Superadmin Dashboard"
              >
                <ShieldCheck size={16} />
              </button>
            )}
            {onChangeLang && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowLangMenu(v => !v)}
                  className="flex items-center gap-1 p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
                  title={LANGUAGE_LABELS[userLang as SupportedLanguage] ?? userLang}
                >
                  <Globe size={15} />
                  <span className="text-xs font-medium hidden sm:inline">
                    {userLang === "de-CH" ? "DE-CH" : userLang === "de-DE" ? "DE-DE" : "EN"}
                  </span>
                </button>
                {showLangMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                    <div className="absolute right-0 top-9 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl min-w-[160px] py-1 overflow-hidden">
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => { onChangeLang(lang); setShowLangMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                            lang === userLang
                              ? "font-semibold text-black bg-neutral-50"
                              : "text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          {LANGUAGE_LABELS[lang]}
                          {lang === userLang && <Check size={13} className="text-black" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setShowSupport(true)}
              className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
              title={t("support.openSupport")}
            >
              <HelpCircle size={16} />
            </button>
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
        <div className="flex items-center justify-between mb-5">
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

        {showSearchSort && (
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
              <option value="name-asc">{t("common.sortAZ")}</option>
              <option value="name-desc">{t("common.sortZA")}</option>
              <option value="newest">{t("common.sortNewest")}</option>
              <option value="oldest">{t("common.sortOldest")}</option>
            </select>
          </div>
        )}

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

        {!loading && !error && properties.length > 0 && displayedProperties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search size={24} className="text-neutral-300 mb-3" />
            <p className="text-sm text-neutral-500">{t("common.noResults")}</p>
          </div>
        )}

        {!loading && !error && displayedProperties.length > 0 && (
          <ul className="space-y-2">
            {displayedProperties.map(property => (
              <li key={property.id}>
                <div className="group flex items-center rounded-xl border border-neutral-200 bg-white hover:border-neutral-400 transition-colors cursor-pointer">
                  <button
                    type="button"
                    className="flex-1 flex items-center gap-3 p-3 text-left min-w-0"
                    onClick={() => onSelectProperty(property)}
                  >
                    <div
                      className="relative w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 overflow-hidden cursor-pointer group/photo"
                      onClick={e => { e.stopPropagation(); handlePhotoClick(property.id); }}
                      title={t("properties.uploadPhoto")}
                    >
                      {uploadingPhotoId === property.id ? (
                        <div className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
                      ) : property.photoDataUrl ? (
                        <>
                          <img
                            src={property.photoDataUrl}
                            alt={property.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/photo:bg-black/25 transition-colors flex items-center justify-center">
                            <Camera size={14} className="text-white opacity-0 group-hover/photo:opacity-100 transition-opacity" />
                          </div>
                        </>
                      ) : (
                        <>
                          <Building2 size={18} className="text-neutral-400 group-hover/photo:opacity-0 transition-opacity" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                            <Camera size={14} className="text-neutral-500" />
                          </div>
                        </>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-black truncate">
                        {property.id === UNASSIGNED_PROPERTY.id ? t("properties.unassigned") : property.name}
                      </p>
                      {property.adresse && (
                        <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-1 truncate">
                          <MapPin size={11} />
                          {property.id === UNASSIGNED_PROPERTY.id ? t("properties.unassignedHint") : property.adresse}
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
                className="w-full flex items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-white transition-colors p-3 text-left"
                onClick={() => onSelectProperty(UNASSIGNED_PROPERTY)}
              >
                <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
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

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoFileChange}
      />

      {showForm && (
        <PropertyFormModal
          onSave={handleCreate}
          onClose={() => setShowForm(false)}
          onGoToBilling={onShowBilling}
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

      {showSupport && (
        <SupportModal onClose={() => setShowSupport(false)} />
      )}
    </div>
  );
}
