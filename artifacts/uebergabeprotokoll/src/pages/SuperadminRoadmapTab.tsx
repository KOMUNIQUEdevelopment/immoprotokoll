import React, { useState, useEffect, useCallback } from "react";
import {
  Plus, RefreshCw, X, Check, Trash2, Eye, EyeOff,
  ChevronDown, Map, Lightbulb, CheckCircle2, Clock, XCircle,
  Pencil,
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

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: "pending" | "planned" | "in_progress" | "done" | "rejected";
  source: "manual" | "feature_request";
  isPublished: boolean;
  category: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Ausstehend",
  planned: "Geplant",
  in_progress: "In Entwicklung",
  done: "Fertig",
  rejected: "Abgelehnt",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-[hsl(0,0%,90%)] text-[hsl(0,0%,35%)]",
  planned: "bg-[hsl(0,0%,15%)] text-white",
  in_progress: "bg-[hsl(0,0%,8%)] text-white",
  done: "bg-[hsl(0,0%,50%)] text-white",
  rejected: "bg-[hsl(0,0%,80%)] text-[hsl(0,0%,40%)]",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending: <Clock size={13} />,
  planned: <Map size={13} />,
  in_progress: <RefreshCw size={13} />,
  done: <CheckCircle2 size={13} />,
  rejected: <XCircle size={13} />,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[status] ?? STATUS_STYLE.pending}`}>
      {STATUS_ICON[status]}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

interface ItemFormProps {
  initial?: Partial<RoadmapItem>;
  onSave: (data: Partial<RoadmapItem>) => Promise<void>;
  onCancel: () => void;
  title: string;
}

function ItemForm({ initial, onSave, onCancel, title }: ItemFormProps) {
  const [itemTitle, setItemTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState(initial?.status ?? "planned");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [category, setCategory] = useState(initial?.category ?? "");
  const [sortOrder, setSortOrder] = useState(String(initial?.sortOrder ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!itemTitle.trim()) { setError("Titel ist erforderlich"); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: itemTitle.trim(),
        description: description.trim(),
        status: status as RoadmapItem["status"],
        isPublished,
        category: category.trim() || undefined,
        sortOrder: parseInt(sortOrder, 10) || 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-[hsl(0,0%,88%)]">
        <div className="flex items-center justify-between p-5 border-b border-[hsl(0,0%,90%)]">
          <h2 className="text-sm font-semibold text-[hsl(0,0%,8%)]">{title}</h2>
          <button onClick={onCancel} className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)]"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Titel *</label>
            <Input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="Feature-Titel…" className="text-sm" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Beschreibung</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Was soll das Feature leisten?"
              className="w-full rounded-md border border-[hsl(0,0%,80%)] text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(0,0%,40%)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Status</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-md border border-[hsl(0,0%,80%)] text-sm px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-[hsl(0,0%,40%)]"
                >
                  {Object.entries(STATUS_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(0,0%,50%)] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Kategorie</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="z.B. Export, UI…" className="text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">Reihenfolge</label>
              <Input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="text-sm" />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setIsPublished((v) => !v)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${isPublished ? "bg-[hsl(0,0%,8%)]" : "bg-[hsl(0,0%,80%)]"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPublished ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-xs font-medium text-[hsl(0,0%,40%)]">{isPublished ? "Live" : "Draft"}</span>
              </label>
            </div>
          </div>

          {error && <p className="text-xs text-[hsl(0,0%,30%)] bg-[hsl(0,0%,93%)] rounded px-3 py-2">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-[hsl(0,0%,90%)]">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Abbrechen</Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
            Speichern
          </Button>
        </div>
      </div>
    </div>
  );
}

interface ItemDetailProps {
  item: RoadmapItem;
  onClose: () => void;
  onUpdated: (item: RoadmapItem) => void;
  onDeleted: (id: string) => void;
}

function ItemDetail({ item, onClose, onUpdated, onDeleted }: ItemDetailProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleTogglePublish = async () => {
    setToggling(true);
    try {
      const r = await apiFetch(`/superadmin/roadmap/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      const d = await r.json() as { item: RoadmapItem };
      if (r.ok) onUpdated(d.item);
    } finally { setToggling(false); }
  };

  const handleAccept = async () => {
    const r = await apiFetch(`/superadmin/roadmap/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "planned" }),
    });
    const d = await r.json() as { item: RoadmapItem };
    if (r.ok) onUpdated(d.item);
  };

  const handleReject = async () => {
    const r = await apiFetch(`/superadmin/roadmap/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "rejected" }),
    });
    const d = await r.json() as { item: RoadmapItem };
    if (r.ok) onUpdated(d.item);
  };

  const handleDelete = async () => {
    if (!confirm("Eintrag wirklich löschen?")) return;
    setDeleting(true);
    try {
      await apiFetch(`/superadmin/roadmap/${item.id}`, { method: "DELETE" });
      onDeleted(item.id);
      onClose();
    } finally { setDeleting(false); }
  };

  const handleSaveEdit = async (data: Partial<RoadmapItem>) => {
    const r = await apiFetch(`/superadmin/roadmap/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const d = await r.json() as { item: RoadmapItem };
    if (!r.ok) throw new Error((d as unknown as { error: string }).error ?? "Failed");
    onUpdated(d.item);
    setEditing(false);
  };

  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden bg-white border-l border-[hsl(0,0%,88%)]">
        <div className="flex items-start justify-between p-5 border-b border-[hsl(0,0%,90%)]">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={item.status} />
              {item.source === "feature_request" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[hsl(0,0%,95%)] text-[hsl(0,0%,40%)] border border-[hsl(0,0%,88%)]">
                  <Lightbulb size={11} /> Feature Request
                </span>
              )}
              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded ${item.isPublished ? "bg-[hsl(0,0%,8%)] text-white" : "bg-[hsl(0,0%,90%)] text-[hsl(0,0%,40%)]"}`}>
                {item.isPublished ? "Live" : "Draft"}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-[hsl(0,0%,8%)]">{item.title}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)] flex-shrink-0"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {item.description && (
            <div>
              <p className="text-xs font-semibold text-[hsl(0,0%,35%)] uppercase tracking-wide mb-2">Beschreibung</p>
              <p className="text-sm text-[hsl(0,0%,15%)] leading-relaxed whitespace-pre-wrap">{item.description}</p>
            </div>
          )}

          {item.source === "feature_request" && (item.requesterName || item.requesterEmail) && (
            <div className="bg-[hsl(0,0%,97%)] rounded-lg p-3 border border-[hsl(0,0%,90%)]">
              <p className="text-xs font-semibold text-[hsl(0,0%,35%)] uppercase tracking-wide mb-2">Eingereicht von</p>
              {item.requesterName && <p className="text-sm font-medium text-[hsl(0,0%,10%)]">{item.requesterName}</p>}
              {item.requesterEmail && (
                <a href={`mailto:${item.requesterEmail}`} className="text-xs text-[hsl(0,0%,45%)] hover:underline">{item.requesterEmail}</a>
              )}
            </div>
          )}

          {item.category && (
            <div>
              <p className="text-xs font-semibold text-[hsl(0,0%,35%)] uppercase tracking-wide mb-1">Kategorie</p>
              <span className="text-xs bg-[hsl(0,0%,93%)] px-2 py-1 rounded">{item.category}</span>
            </div>
          )}

          <p className="text-xs text-[hsl(0,0%,55%)]">
            Eingereicht: {new Date(item.createdAt).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
        </div>

        <div className="p-4 border-t border-[hsl(0,0%,90%)] space-y-2">
          {item.status === "pending" && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button
                size="sm"
                onClick={handleAccept}
                className="gap-1.5 bg-[hsl(0,0%,8%)] text-white hover:bg-[hsl(0,0%,20%)]"
              >
                <Check size={13} /> Annehmen
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReject}
                className="gap-1.5"
              >
                <XCircle size={13} /> Ablehnen
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="flex-1 gap-1.5"
            >
              <Pencil size={13} /> Bearbeiten
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTogglePublish}
              disabled={toggling}
              className="flex-1 gap-1.5"
            >
              {toggling
                ? <RefreshCw size={13} className="animate-spin" />
                : item.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
              {item.isPublished ? "Auf Draft" : "Live schalten"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDelete}
              disabled={deleting}
              className="p-2 text-[hsl(0,0%,50%)] hover:text-[hsl(0,0%,20%)]"
            >
              {deleting ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </Button>
          </div>
        </div>
      </div>

      {editing && (
        <ItemForm
          initial={item}
          title="Eintrag bearbeiten"
          onSave={handleSaveEdit}
          onCancel={() => setEditing(false)}
        />
      )}
    </>
  );
}

export default function SuperadminRoadmapTab() {
  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<RoadmapItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const limit = 30;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      const r = await apiFetch(`/superadmin/roadmap?${params}`);
      if (r.ok) {
        const d = await r.json() as { items: RoadmapItem[]; total: number };
        setItems(d.items);
        setTotal(d.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, statusFilter, sourceFilter]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  const handleCreate = async (data: Partial<RoadmapItem>) => {
    const r = await apiFetch("/superadmin/roadmap", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const d = await r.json() as { item: RoadmapItem; error?: string };
    if (!r.ok) throw new Error(d.error ?? "Failed");
    setItems((prev) => [d.item, ...prev]);
    setShowAdd(false);
  };

  const handleUpdated = (updated: RoadmapItem) => {
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    setSelectedItem(updated);
  };

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    setSelectedItem(null);
  };

  const allPendingCount = statusFilter === "" ? items.filter((i) => i.status === "pending").length : 0;

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className={`flex flex-col ${selectedItem ? "w-1/2 border-r border-[hsl(0,0%,88%)]" : "w-full"}`}>
        <div className="p-4 border-b border-[hsl(0,0%,90%)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1.5">
              {["", "pending", "planned", "in_progress", "done", "rejected"].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); setSelectedItem(null); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                    statusFilter === s
                      ? "bg-[hsl(0,0%,8%)] text-white border-[hsl(0,0%,8%)]"
                      : "bg-white text-[hsl(0,0%,40%)] border-[hsl(0,0%,80%)] hover:border-[hsl(0,0%,50%)]"
                  }`}
                >
                  {s === "" ? "Alle" : STATUS_LABEL[s]}
                  {s === "pending" && allPendingCount > 0 && (
                    <span className="ml-1 bg-[hsl(0,0%,30%)] text-white text-[10px] rounded-full px-1.5 py-0.5">{allPendingCount}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-2">
              <div className="relative">
                <select
                  value={sourceFilter}
                  onChange={(e) => { setSourceFilter(e.target.value); setPage(1); setSelectedItem(null); }}
                  className="text-xs border border-[hsl(0,0%,80%)] rounded-md px-2 py-1 pr-6 appearance-none bg-white focus:outline-none"
                >
                  <option value="">Alle Quellen</option>
                  <option value="manual">Manuell</option>
                  <option value="feature_request">Feature Request</option>
                </select>
                <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[hsl(0,0%,50%)] pointer-events-none" />
              </div>
              <Button
                size="sm"
                onClick={() => setShowAdd(true)}
                className="gap-1.5 h-7 px-2.5 text-xs"
              >
                <Plus size={13} /> Hinzufügen
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[hsl(0,0%,50%)] text-sm gap-2">
              <RefreshCw size={14} className="animate-spin" /> Wird geladen…
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[hsl(0,0%,55%)]">
              <Map size={32} className="mb-3 opacity-30" />
              <p className="text-sm">Keine Roadmap-Einträge</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(0,0%,90%)] bg-[hsl(0,0%,97%)]">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Titel</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Quelle</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Sichtbar</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Datum</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedItem(item.id === selectedItem?.id ? null : item)}
                    className={`border-b border-[hsl(0,0%,92%)] cursor-pointer transition-colors ${
                      item.id === selectedItem?.id
                        ? "bg-[hsl(0,0%,92%)]"
                        : "hover:bg-[hsl(0,0%,95%)]"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[hsl(0,0%,10%)] truncate max-w-[220px]">{item.title}</p>
                      {item.category && (
                        <span className="text-xs text-[hsl(0,0%,50%)]">{item.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${
                        item.source === "feature_request"
                          ? "bg-[hsl(0,0%,93%)] text-[hsl(0,0%,35%)]"
                          : "bg-[hsl(0,0%,97%)] text-[hsl(0,0%,50%)] border border-[hsl(0,0%,88%)]"
                      }`}>
                        {item.source === "feature_request" ? <Lightbulb size={10} /> : <Pencil size={10} />}
                        {item.source === "feature_request" ? "Request" : "Manuell"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${item.isPublished ? "text-[hsl(0,0%,15%)]" : "text-[hsl(0,0%,60%)]"}`}>
                        {item.isPublished ? "Live" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[hsl(0,0%,50%)]">
                      {new Date(item.createdAt).toLocaleDateString("de-CH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(0,0%,90%)] bg-white text-xs text-[hsl(0,0%,50%)]">
            <span>Seite {page} von {totalPages} · {total} Einträge</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-2 text-xs">Zurück</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 px-2 text-xs">Weiter</Button>
            </div>
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="w-1/2 flex flex-col overflow-hidden">
          <ItemDetail
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
          />
        </div>
      )}

      {showAdd && (
        <ItemForm
          title="Neuer Roadmap-Eintrag"
          onSave={handleCreate}
          onCancel={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
