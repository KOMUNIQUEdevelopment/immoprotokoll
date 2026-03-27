import React, { useState } from "react";
import { ProtocolData } from "../types";
import { Plus, Pencil, Trash2, ClipboardList, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProtocolListPageProps {
  protocols: Record<string, ProtocolData>;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

interface DeleteDialogProps {
  protocol: ProtocolData;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteDialog({ protocol, onConfirm, onCancel }: DeleteDialogProps) {
  const [input, setInput] = useState("");
  const confirmed = input.trim().toLowerCase() === "löschen";
  const label = [protocol.mietobjekt, protocol.adresse].filter(Boolean).join(", ") || "Dieses Protokoll";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-destructive/10 shrink-0">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div>
            <h2 className="font-semibold text-base">Protokoll löschen?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground">{label}</span> wird dauerhaft gelöscht.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors shrink-0 ml-auto"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Gib <span className="text-destructive font-bold">löschen</span> ein um zu bestätigen
          </label>
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="löschen"
            autoFocus
            onKeyDown={e => e.key === "Enter" && confirmed && onConfirm()}
            className={`${confirmed ? "border-destructive ring-1 ring-destructive" : ""}`}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!confirmed}
            onClick={onConfirm}
          >
            <Trash2 size={14} className="mr-1.5" />
            Endgültig löschen
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProtocolListPage({
  protocols,
  onOpen,
  onCreate,
  onDelete,
}: ProtocolListPageProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const sorted = Object.values(protocols).sort((a, b) => {
    const ta = a.lastSaved ? new Date(a.lastSaved).getTime() : 0;
    const tb = b.lastSaved ? new Date(b.lastSaved).getTime() : 0;
    return tb - ta;
  });

  const handleDelete = (id: string) => {
    onDelete(id);
    setDeleteTarget(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-primary shrink-0" />
              <div>
                <h1 className="font-bold text-sm leading-tight">Protokolle</h1>
                <p className="text-xs text-muted-foreground">
                  {sorted.length === 0
                    ? "Noch keine Protokolle"
                    : `${sorted.length} Protokoll${sorted.length === 1 ? "" : "e"}`}
                </p>
              </div>
            </div>
            <Button size="sm" onClick={onCreate} className="gap-1.5">
              <Plus size={15} />
              Neu
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-3">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="p-5 rounded-full bg-muted">
              <ClipboardList size={36} className="text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-base">Noch kein Protokoll vorhanden</p>
              <p className="text-sm text-muted-foreground mt-1">
                Erstelle dein erstes Übergabeprotokoll.
              </p>
            </div>
            <Button onClick={onCreate} className="gap-1.5 mt-2">
              <Plus size={15} />
              Erstes Protokoll anlegen
            </Button>
          </div>
        ) : (
          sorted.map(p => {
            const title = p.mietobjekt || "Unbenanntes Protokoll";
            const subtitle = [p.adresse, p.datum].filter(Boolean).join(" · ");
            return (
              <div
                key={p.id}
                className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="p-2 rounded-lg bg-primary/10 shrink-0 mt-0.5">
                  <ClipboardList size={16} className="text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-snug truncate">{title}</p>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Zuletzt gespeichert: {formatDate(p.lastSaved)}
                  </p>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpen(p.id)}
                    className="gap-1"
                  >
                    <Pencil size={13} />
                    <span className="hidden sm:inline">Bearbeiten</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteTarget(p.id)}
                    className="gap-1 text-destructive hover:text-destructive hover:border-destructive/50"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Delete confirmation dialog */}
      {deleteTarget && protocols[deleteTarget] && (
        <DeleteDialog
          protocol={protocols[deleteTarget]}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
