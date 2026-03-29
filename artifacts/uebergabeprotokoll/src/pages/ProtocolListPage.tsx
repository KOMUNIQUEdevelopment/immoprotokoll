import React, { useState, useRef, useEffect } from "react";
import { ProtocolData, getPersonRole } from "../types";
import { TrashedEntry } from "../store";
import { Plus, Pencil, Trash2, ClipboardList, X, AlertTriangle, Cloud, CloudOff, Check, Eye, MapPin, Calendar, Key, Zap, Droplets, Flame, Image, PenLine, CheckCircle2, ChevronRight, Link, Copy, ExternalLink, LogOut, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InstallButton } from "../components/InstallButton";

const FLOOR_LABEL: Record<string, string> = {
  EG: "Erdgeschoss (EG)",
  OG: "Obergeschoss (OG)",
  DG: "Dachgeschoss (DG)",
  UG: "Untergeschoss (UG)",
  "Außen": "Außenbereiche",
};

interface ProtocolListPageProps {
  protocols: Record<string, ProtocolData>;
  trashedProtocols: Record<string, TrashedEntry>;
  onOpen: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentlyDelete: (id: string) => void;
  onEmptyTrash: () => void;
  onDuplicate: (id: string) => void;
  onToggleSync: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onLogout?: () => void;
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

// ── Preview Modal ────────────────────────────────────────────────────────────

interface ProtocolPreviewModalProps {
  protocol: ProtocolData;
  onClose: () => void;
  onEdit: () => void;
}

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  );
}

function ProtocolPreviewModal({ protocol, onClose, onEdit }: ProtocolPreviewModalProps) {
  const floors = ["EG", "OG", "DG", "UG", "Außen"];
  const totalPhotos =
    (protocol.meterPhotos?.length ?? 0) +
    (protocol.kitchenPhotos?.length ?? 0) +
    protocol.rooms.reduce((s, r) => s + r.photos.length, 0);

  const allPersons = [...protocol.uebergeber, ...protocol.uebernehmer];
  const signedCount = allPersons.filter(p =>
    protocol.personSignatures.some(s => s.personId === p.id && s.signatureDataUrl)
  ).length;
  const allSigned = signedCount === allPersons.length && allPersons.length > 0;

  const meterIcon: Record<string, React.ReactNode> = {
    Strom: <Zap size={12} />,
    Wasser: <Droplets size={12} />,
    Gas: <Flame size={12} />,
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative mt-auto sm:m-auto w-full sm:max-w-lg max-h-[92dvh] sm:max-h-[88vh] bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header banner */}
        <div className="bg-primary text-primary-foreground px-5 py-4 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-bold text-base leading-tight truncate">
                {protocol.mietobjekt || "Übergabeprotokoll"}
              </h2>
              {protocol.adresse && (
                <p className="text-primary-foreground/80 text-xs mt-0.5 flex items-center gap-1 truncate">
                  <MapPin size={11} />
                  {protocol.adresse}
                </p>
              )}
              {protocol.datum && (
                <p className="text-primary-foreground/80 text-xs mt-0.5 flex items-center gap-1">
                  <Calendar size={11} />
                  Übergabe: {protocol.datum}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Persons */}
          <PreviewSection title="Beteiligte Personen">
            <div className="space-y-2">
              {protocol.uebergeber.filter(p => p.name).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
                    {getPersonRole(p, "uebergeber")}
                  </span>
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
              {protocol.uebernehmer.filter(p => p.name).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium shrink-0">
                    {getPersonRole(p, "uebernehmer")}
                  </span>
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
              {allPersons.filter(p => p.name).length === 0 && (
                <p className="text-sm text-muted-foreground italic">Keine Personen eingetragen</p>
              )}
            </div>
          </PreviewSection>

          {/* Key & meter readings side by side */}
          <div className="grid grid-cols-2 gap-4">
            {protocol.schluessel && (
              <PreviewSection title="Schlüssel">
                <div className="flex items-start gap-1.5 text-sm">
                  <Key size={13} className="text-muted-foreground mt-0.5 shrink-0" />
                  <span>{protocol.schluessel}</span>
                </div>
              </PreviewSection>
            )}
            <PreviewSection title="Zählerstände">
              <div className="space-y-1">
                {protocol.meterReadings.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm gap-2">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      {meterIcon[m.type] ?? null}
                      {m.type}
                    </span>
                    <span className="font-medium tabular-nums">
                      {m.stand ? `${m.stand} ${m.einheit}` : <span className="text-muted-foreground/50">—</span>}
                    </span>
                  </div>
                ))}
              </div>
            </PreviewSection>
          </div>

          {/* Rooms per floor */}
          <PreviewSection title="Raumzustand">
            <div className="space-y-3">
              {floors.map(floor => {
                const rooms = protocol.rooms.filter(r => r.floor === floor);
                if (rooms.length === 0) return null;
                return (
                  <div key={floor}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                      {FLOOR_LABEL[floor] ?? floor}
                    </p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {rooms.map(room => {
                        const hasPhotos = room.photos.length > 0;
                        const hasContent = room.bodenZustand || room.maengelSchaeden || room.notizen;
                        return (
                          <div
                            key={room.id}
                            className={`flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg text-xs border ${
                              hasContent || hasPhotos
                                ? "bg-card border-border"
                                : "bg-muted/30 border-border/50 text-muted-foreground"
                            }`}
                          >
                            <span className="truncate font-medium">{room.name}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {room.bodenZustand && (
                                <span className={`w-2 h-2 rounded-full ${
                                  room.bodenZustand === "sehr gut" ? "bg-green-500"
                                  : room.bodenZustand === "gut" ? "bg-yellow-500"
                                  : "bg-red-500"
                                }`} title={room.bodenZustand} />
                              )}
                              {hasPhotos && (
                                <span className="flex items-center gap-0.5 text-muted-foreground">
                                  <Image size={10} />
                                  {room.photos.length}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </PreviewSection>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-primary">{totalPhotos}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Fotos</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-primary">
                {protocol.rooms.filter(r => r.bodenZustand || r.maengelSchaeden).length}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Räume ausgefüllt</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${allSigned ? "bg-green-50 border border-green-200" : "bg-muted/50"}`}>
              <p className={`text-lg font-bold ${allSigned ? "text-green-600" : "text-primary"}`}>
                {signedCount}/{allPersons.length}
              </p>
              <p className={`text-[11px] mt-0.5 ${allSigned ? "text-green-600" : "text-muted-foreground"}`}>
                {allSigned ? "✓ Unterschriften" : "Unterschriften"}
              </p>
            </div>
          </div>

          {/* Zusatzvereinbarungen */}
          {(protocol.zusatzvereinbarungen?.length ?? 0) > 0 && (
            <PreviewSection title={protocol.zusatzvereinbarungTitle || "Zusatzvereinbarungen"}>
              <div className="space-y-1">
                {protocol.zusatzvereinbarungen.map((z, i) => (
                  <div key={z.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="text-xs font-bold w-4 shrink-0">{i + 1}.</span>
                    <span className="truncate">{z.title}</span>
                  </div>
                ))}
              </div>
            </PreviewSection>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-border px-5 py-3 flex gap-2 shrink-0 bg-card">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1 sm:flex-none">
            Schließen
          </Button>
          <Button size="sm" onClick={onEdit} className="flex-1 gap-1.5">
            <Pencil size={13} />
            Bearbeiten
            <ChevronRight size={13} className="-ml-0.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Share Link Modal ──────────────────────────────────────────────────────────

interface ShareLinkModalProps {
  protocol: ProtocolData;
  onClose: () => void;
}

function ShareLinkModal({ protocol, onClose }: ShareLinkModalProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}${window.location.pathname.split("#")[0]}#/view/${protocol.id}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.createElement("input");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 shrink-0">
            <Link size={18} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-base">Mieter-Link teilen</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {protocol.mietobjekt || "Protokoll"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted transition-colors shrink-0 ml-auto"
          >
            <X size={16} />
          </button>
        </div>

        {!protocol.syncEnabled && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 leading-snug">
              <strong>Sync ist nicht aktiviert.</strong> Aktiviere erst Sync für dieses
              Protokoll, damit der Link für die Mieterin funktioniert.
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Mieter-Link
          </p>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground truncate border border-border">
              {shareUrl}
            </div>
            <button
              type="button"
              onClick={copyLink}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors shrink-0 ${
                copied
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Kopiert!" : "Kopieren"}
            </button>
          </div>
        </div>

        <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-xs">Was die Mieterin sehen kann:</p>
          <ul className="space-y-1 list-none">
            <li className="flex items-center gap-1.5"><Check size={11} className="text-green-500" /> Alle Protokollinhalte (schreibgeschützt)</li>
            <li className="flex items-center gap-1.5"><Check size={11} className="text-green-500" /> Alle Fotos und Raumzustände</li>
            <li className="flex items-center gap-1.5"><Check size={11} className="text-green-500" /> Zusatzvereinbarungen</li>
            <li className="flex items-center gap-1.5"><Check size={11} className="text-green-500" /> Eigene Unterschrift leisten (wird synchronisiert)</li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onClose} className="flex-1">
            Schließen
          </Button>
          <Button
            size="sm"
            onClick={() => window.open(shareUrl, "_blank")}
            className="flex-1 gap-1.5"
          >
            <ExternalLink size={13} />
            Ansicht öffnen
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Move to Trash Dialog ──────────────────────────────────────────────────────

interface DeleteDialogProps {
  protocol: ProtocolData;
  onConfirm: () => void;
  onCancel: () => void;
}

function DeleteDialog({ protocol, onConfirm, onCancel }: DeleteDialogProps) {
  const label = [protocol.mietobjekt, protocol.adresse].filter(Boolean).join(", ") || "Dieses Protokoll";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-muted shrink-0">
            <Trash2 size={18} className="text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-base">In Papierkorb verschieben?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground truncate block">{label}</span>
              wird in den Papierkorb verschoben und kann dort wiederhergestellt werden.
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

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={onConfirm}
            autoFocus
          >
            <Trash2 size={14} />
            In Papierkorb
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Permanent Delete Dialog (from trash) ──────────────────────────────────────

interface PermanentDeleteDialogProps {
  label: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function PermanentDeleteDialog({ label, onConfirm, onCancel }: PermanentDeleteDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-destructive/10 shrink-0">
            <AlertTriangle size={18} className="text-destructive" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-base">Endgültig löschen?</h2>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-medium text-foreground truncate block">{label}</span>
              wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-1 rounded-md text-muted-foreground hover:bg-muted shrink-0 ml-auto">
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>Abbrechen</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} autoFocus className="gap-1.5">
            <Trash2 size={14} />
            Endgültig löschen
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProtocolListPage({
  protocols,
  trashedProtocols,
  onOpen,
  onCreate,
  onDelete,
  onRestore,
  onPermanentlyDelete,
  onEmptyTrash,
  onDuplicate,
  onToggleSync,
  onRename,
  onLogout,
}: ProtocolListPageProps) {
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [permDeleteTarget, setPermDeleteTarget] = useState<string | null>(null);
  const [emptyTrashConfirm, setEmptyTrashConfirm] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const trashEntries = Object.entries(trashedProtocols).sort(
    (a, b) => new Date(b[1].deletedAt).getTime() - new Date(a[1].deletedAt).getTime()
  );
  const trashCount = trashEntries.length;

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const startRename = (p: ProtocolData) => {
    setRenamingId(p.id);
    setRenameValue(p.mietobjekt || "");
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const cancelRename = () => setRenamingId(null);

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
            <div className="flex items-center gap-2">
              <InstallButton />
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Abmelden"
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <LogOut size={15} />
                </button>
              )}
              <Button size="sm" onClick={onCreate} className="gap-1.5">
                <Plus size={15} />
                Neu
              </Button>
            </div>
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
                  {renamingId === p.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        ref={renameInputRef}
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                        onBlur={commitRename}
                        className="h-7 text-sm font-semibold py-0 px-2"
                      />
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); commitRename(); }}
                        className="p-1 rounded text-emerald-600 hover:bg-emerald-50 shrink-0"
                        title="Speichern"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); cancelRename(); }}
                        className="p-1 rounded text-muted-foreground hover:bg-muted shrink-0"
                        title="Abbrechen"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 group/title">
                      <p className="font-semibold text-sm leading-snug truncate">{title}</p>
                      {p.syncEnabled && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5 shrink-0">
                          <Cloud size={9} />
                          Sync
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => startRename(p)}
                        className="p-0.5 rounded text-muted-foreground/40 hover:text-muted-foreground opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0"
                        title="Bezeichnung ändern"
                      >
                        <Pencil size={11} />
                      </button>
                    </div>
                  )}
                  {subtitle && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Zuletzt gespeichert: {formatDate(p.lastSaved)}
                  </p>
                </div>

                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onToggleSync(p.id)}
                    title={p.syncEnabled ? "Sync deaktivieren" : "Sync aktivieren – auf allen Geräten sichtbar"}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      p.syncEnabled
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {p.syncEnabled ? (
                      <>
                        <Cloud size={13} />
                        <span className="hidden sm:inline">Sync</span>
                      </>
                    ) : (
                      <>
                        <CloudOff size={13} />
                        <span className="hidden sm:inline">Sync</span>
                      </>
                    )}
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewId(p.id)}
                    className="gap-1"
                    title="Vorschau"
                  >
                    <Eye size={13} />
                    <span className="hidden sm:inline">Vorschau</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShareId(p.id)}
                    className="gap-1"
                    title="Mieter-Link erstellen"
                  >
                    <Link size={13} />
                    <span className="hidden sm:inline">Teilen</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDuplicate(p.id)}
                    className="gap-1"
                    title="Protokoll duplizieren"
                  >
                    <Copy size={13} />
                    <span className="hidden sm:inline">Duplizieren</span>
                  </Button>
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

      {/* ── Papierkorb section ────────────────────────────────────── */}
      {trashCount > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setTrashOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-muted/40 hover:bg-muted/70 transition-colors text-sm text-muted-foreground"
          >
            <span className="flex items-center gap-2 font-medium">
              <Trash2 size={14} />
              Papierkorb
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted-foreground/20 text-[11px] font-bold">
                {trashCount}
              </span>
            </span>
            {trashOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {trashOpen && (
            <div className="mt-2 space-y-2">
              {/* Empty trash button */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEmptyTrashConfirm(true)}
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs"
                >
                  <Trash2 size={12} />
                  Papierkorb leeren
                </Button>
              </div>

              {trashEntries.map(([id, entry]) => {
                const title = entry.protocol.mietobjekt || "Unbenanntes Protokoll";
                const subtitle = [entry.protocol.adresse, entry.protocol.datum].filter(Boolean).join(" · ");
                return (
                  <div
                    key={id}
                    className="bg-card border border-border/60 rounded-xl p-3 flex items-start gap-3 opacity-70 hover:opacity-100 transition-opacity"
                  >
                    <div className="p-1.5 rounded-lg bg-muted shrink-0 mt-0.5">
                      <Trash2 size={14} className="text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-snug truncate">{title}</p>
                      {subtitle && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-0.5">
                        Gelöscht: {formatDate(entry.deletedAt)}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRestore(id)}
                        className="gap-1 text-xs"
                        title="Wiederherstellen"
                      >
                        <RotateCcw size={12} />
                        <span className="hidden sm:inline">Wiederherstellen</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPermDeleteTarget(id)}
                        className="p-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Endgültig löschen"
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </main>

      {/* Share link modal */}
      {shareId && protocols[shareId] && (
        <ShareLinkModal
          protocol={protocols[shareId]}
          onClose={() => setShareId(null)}
        />
      )}

      {/* Preview modal */}
      {previewId && protocols[previewId] && (
        <ProtocolPreviewModal
          protocol={protocols[previewId]}
          onClose={() => setPreviewId(null)}
          onEdit={() => { onOpen(previewId); setPreviewId(null); }}
        />
      )}

      {/* Move to trash dialog */}
      {deleteTarget && protocols[deleteTarget] && (
        <DeleteDialog
          protocol={protocols[deleteTarget]}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Permanent delete dialog (single item from trash) */}
      {permDeleteTarget && trashedProtocols[permDeleteTarget] && (
        <PermanentDeleteDialog
          label={
            [
              trashedProtocols[permDeleteTarget].protocol.mietobjekt,
              trashedProtocols[permDeleteTarget].protocol.adresse,
            ]
              .filter(Boolean)
              .join(", ") || "Dieses Protokoll"
          }
          onConfirm={() => {
            onPermanentlyDelete(permDeleteTarget);
            setPermDeleteTarget(null);
          }}
          onCancel={() => setPermDeleteTarget(null)}
        />
      )}

      {/* Empty trash confirm dialog */}
      {emptyTrashConfirm && (
        <PermanentDeleteDialog
          label={`alle ${trashCount} Protokoll${trashCount !== 1 ? "e" : ""} im Papierkorb`}
          onConfirm={() => {
            onEmptyTrash();
            setEmptyTrashConfirm(false);
            setTrashOpen(false);
          }}
          onCancel={() => setEmptyTrashConfirm(false)}
        />
      )}
    </div>
  );
}
