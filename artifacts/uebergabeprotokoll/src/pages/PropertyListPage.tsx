import React, { useState, useEffect, useCallback } from "react";
import { Property, ProtocolData } from "../types";
import { Plus, Building2, Pencil, Trash2, MapPin, LogOut, X, Check, AlertTriangle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstallButton } from "../components/InstallButton";

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
}

interface DeleteConfirmProps {
  property: Property;
  protocolCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteConfirm({ property, protocolCount, onConfirm, onCancel }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-neutral-700" />
          </div>
          <div>
            <h2 className="font-semibold text-black text-sm">Liegenschaft löschen?</h2>
            <p className="text-xs text-neutral-500 mt-1">
              <span className="font-medium text-black">{property.name}</span> und alle zugehörigen{" "}
              {protocolCount > 0
                ? <><span className="font-medium text-black">{protocolCount} Protokoll{protocolCount !== 1 ? "e" : ""}</span> werden</>
                : "Protokolle werden"
              }{" "}
              unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel} className="border-neutral-200">
            Abbrechen
          </Button>
          <Button size="sm" onClick={onConfirm} className="bg-black text-white hover:bg-neutral-800">
            Löschen
          </Button>
        </div>
      </div>
    </div>
  );
}

interface PropertyFormModalProps {
  initial?: Property;
  onSave: (name: string, adresse: string) => Promise<void>;
  onClose: () => void;
}

function PropertyFormModal({ initial, onSave, onClose }: PropertyFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [adresse, setAdresse] = useState(initial?.adresse ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Name ist erforderlich."); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(name.trim(), adresse.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-black text-sm">
            {initial ? "Liegenschaft bearbeiten" : "Neue Liegenschaft"}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded-full text-neutral-500 hover:bg-neutral-100">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Name *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="z. B. Musterstrasse 12, Wohnung 3"
              autoFocus
              className="text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-600 block mb-1">Adresse</label>
            <Input
              value={adresse}
              onChange={e => setAdresse(e.target.value)}
              placeholder="z. B. Musterstrasse 12, 8001 Zürich"
              className="text-sm"
            />
          </div>
          {error && <p className="text-xs text-neutral-700 bg-neutral-100 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="border-neutral-200">
              Abbrechen
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="bg-black text-white hover:bg-neutral-800 gap-1.5">
              {saving ? (
                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Check size={13} />
              )}
              {initial ? "Speichern" : "Erstellen"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PropertyListPage({ onSelectProperty, onLogout, protocols = {}, onDeleteProperty }: PropertyListPageProps) {
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
      setError(err instanceof Error ? err.message : "Fehler beim Laden.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProperties(); }, [loadProperties]);

  const handleCreate = async (name: string, adresse: string) => {
    const p = await apiFetch("/properties", {
      method: "POST",
      body: JSON.stringify({ name, adresse }),
    });
    setProperties(prev => [...prev, p]);
  };

  const handleEdit = async (name: string, adresse: string) => {
    if (!editTarget) return;
    const p = await apiFetch(`/properties/${editTarget.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, adresse }),
    });
    setProperties(prev => prev.map(x => x.id === p.id ? p : x));
    setEditTarget(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await apiFetch(`/properties/${deleteTarget.id}`, { method: "DELETE" });
    // Cascade delete: remove associated protocols from local store too
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
            <span className="font-semibold text-sm text-black hidden sm:inline">Liegenschaften</span>
          </div>
          <div className="flex items-center gap-2">
            <InstallButton />
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
                title="Abmelden"
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
            <h1 className="text-lg font-bold text-black">Liegenschaften</h1>
            <p className="text-xs text-neutral-500 mt-0.5">Wählen Sie eine Liegenschaft, um Protokolle zu verwalten.</p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-black text-white hover:bg-neutral-800 gap-1.5 shrink-0"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Neue Liegenschaft</span>
            <span className="sm:hidden">Neu</span>
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
            <button type="button" onClick={loadProperties} className="ml-3 underline text-black">Erneut versuchen</button>
          </div>
        )}

        {!loading && !error && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
              <Building2 size={24} className="text-neutral-400" />
            </div>
            <p className="font-semibold text-black text-sm">Keine Liegenschaften</p>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs">
              Erstellen Sie Ihre erste Liegenschaft, um Protokolle strukturiert zu verwalten.
            </p>
            <Button
              size="sm"
              onClick={() => setShowForm(true)}
              className="mt-4 bg-black text-white hover:bg-neutral-800 gap-1.5"
            >
              <Plus size={14} />
              Erste Liegenschaft erstellen
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
                      title="Bearbeiten"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setDeleteTarget(property); }}
                      className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors"
                      title="Löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
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
