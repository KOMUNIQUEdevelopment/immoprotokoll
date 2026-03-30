import React, { useState, useEffect, useRef, useCallback } from "react";
import { ProtocolData, RoomData, getPersonRole } from "../types";
import SignatureCanvasComponent from "../components/SignatureCanvas";
import { exportToPDF, exportPhotosAsZip } from "../pdfExport";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  MapPin,
  Calendar,
  Key,
  Zap,
  Droplets,
  Flame,
  CheckCircle2,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2,
  PenLine,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileDown,
  ImageDown,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const FLOOR_LABELS: Record<string, string> = {
  EG: "Erdgeschoss (EG)",
  OG: "Obergeschoss (OG)",
  DG: "Dachgeschoss (DG)",
  UG: "Untergeschoss / Keller",
  Außen: "Außenbereiche",
};

const CONDITION_STYLE: Record<string, string> = {
  "sehr gut": "bg-green-500 text-white border-green-500",
  gut: "bg-yellow-500 text-white border-yellow-500",
  Mängel: "bg-red-500 text-white border-red-500",
};

// ── Shared UI components ─────────────────────────────────────────────────────

function SectionHeader({
  title,
  open,
  onToggle,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
    >
      {title}
      {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
    </button>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <SectionHeader title={title} open={open} onToggle={() => setOpen((o) => !o)} />
      {open && <div className="mt-3 space-y-3">{children}</div>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
      {children}
    </label>
  );
}

function ReadField({
  label,
  value,
  fullWidth = false,
}: {
  label: string;
  value: string | undefined | null;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "col-span-full" : ""}>
      <FieldLabel>{label}</FieldLabel>
      <div className="min-h-[36px] px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm text-foreground">
        {value?.trim() ? value : <span className="text-muted-foreground/50 italic">—</span>}
      </div>
    </div>
  );
}

// ── Read-only room card ───────────────────────────────────────────────────────

function RoomCard({ room }: { room: RoomData }) {
  const [open, setOpen] = useState(false);

  const condition = room.bodenZustand;
  const hasPhotos = room.photos.length > 0;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/40 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-sm truncate">{room.name}</span>
          {condition && (
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${
                CONDITION_STYLE[condition] ?? "bg-muted text-muted-foreground border-border"
              }`}
            >
              {condition}
            </span>
          )}
          {hasPhotos && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              📷 {room.photos.length}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp size={15} className="text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown size={15} className="text-muted-foreground shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border">
          <div className="grid grid-cols-2 gap-3">
            <ReadField label="Gesamtzustand / Boden" value={room.bodenZustand} />
            <ReadField label="Wände / Decken" value={room.waendeDecken} />
            <ReadField label="Fenster / Türen" value={room.fensterTueren} />
            <ReadField label="Elektrik" value={room.elektrik} />
            <ReadField label="Heizung" value={room.heizung} />
          </div>

          {room.maengelSchaeden?.trim() ? (
            <div>
              <FieldLabel>Mängel / Schäden</FieldLabel>
              <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 whitespace-pre-wrap">
                {room.maengelSchaeden}
              </div>
            </div>
          ) : (
            <ReadField label="Mängel / Schäden" value="" />
          )}

          <ReadField label="Notizen" value={room.notizen} fullWidth />

          {hasPhotos ? (
            <div>
              <FieldLabel>Fotos ({room.photos.length})</FieldLabel>
              <div className="grid grid-cols-3 gap-2">
                {room.photos.map((ph) => (
                  <img
                    key={ph.id}
                    src={ph.dataUrl}
                    alt={ph.caption || room.name}
                    className="w-full aspect-square object-cover rounded-lg border border-border"
                  />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <FieldLabel>Fotos</FieldLabel>
              <p className="text-sm text-muted-foreground/50 italic px-1">Keine Fotos vorhanden</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface TenantViewPageProps {
  protocolId: string;
}

type LoadState = "loading" | "loaded" | "not-found" | "error";

// ── Main component ────────────────────────────────────────────────────────────

export default function TenantViewPage({ protocolId }: TenantViewPageProps) {
  const { toast } = useToast();
  const [protocol, setProtocol] = useState<ProtocolData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">(
    "connecting"
  );

  const [pendingSig, setPendingSig] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [justSigned, setJustSigned] = useState<Record<string, boolean>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track photo IDs already fetched to avoid re-fetching on every WS update
  const fetchedPhotoIds = useRef<Set<string>>(new Set());

  // ── Helpers: collect photo IDs with missing dataUrl ────────────────────────

  const collectMissingIds = useCallback((p: ProtocolData): string[] => {
    const ids: string[] = [];
    for (const ph of p.meterPhotos ?? []) if (ph.id && !ph.dataUrl) ids.push(ph.id);
    for (const ph of p.kitchenPhotos ?? []) if (ph.id && !ph.dataUrl) ids.push(ph.id);
    for (const r of p.rooms) for (const ph of r.photos) if (ph.id && !ph.dataUrl) ids.push(ph.id);
    // Also fetch signatures that are missing (stored under sig_${personId} on server)
    for (const sig of p.personSignatures ?? [])
      if (sig.personId && !sig.signatureDataUrl) ids.push(`sig_${sig.personId}`);
    return ids.filter((id) => !fetchedPhotoIds.current.has(id));
  }, []);

  const applyPhotoMap = useCallback(
    (p: ProtocolData, map: Record<string, string>): ProtocolData => ({
      ...p,
      meterPhotos: (p.meterPhotos ?? []).map((ph) => ({
        ...ph,
        dataUrl: map[ph.id] ?? ph.dataUrl,
      })),
      kitchenPhotos: (p.kitchenPhotos ?? []).map((ph) => ({
        ...ph,
        dataUrl: map[ph.id] ?? ph.dataUrl,
      })),
      rooms: p.rooms.map((r) => ({
        ...r,
        photos: r.photos.map((ph) => ({ ...ph, dataUrl: map[ph.id] ?? ph.dataUrl })),
      })),
    }),
    []
  );

  /** Fetches missing photos from the server and sets protocol state. */
  const hydrateAndSet = useCallback(
    async (incoming: ProtocolData) => {
      const missingIds = collectMissingIds(incoming);
      let serverMap: Record<string, string> = {};

      if (missingIds.length > 0) {
        try {
          const url = `/api/photos?ids=${missingIds.join(",")}`;
          const res = await fetch(url);
          if (res.ok) {
            const data = (await res.json()) as { photos?: Record<string, string> };
            serverMap = data.photos ?? {};
            for (const id of missingIds) fetchedPhotoIds.current.add(id);
          }
        } catch {
          // silently ignore – photos will just be blank
        }
      }

      setProtocol((prev) => {
        // Build final photo map: server fetch results + already-loaded local photos
        const localPhotoMap: Record<string, string> = {};
        if (prev) {
          for (const ph of prev.meterPhotos ?? []) if (ph.dataUrl) localPhotoMap[ph.id] = ph.dataUrl;
          for (const ph of prev.kitchenPhotos ?? []) if (ph.dataUrl) localPhotoMap[ph.id] = ph.dataUrl;
          for (const r of prev.rooms) for (const ph of r.photos) if (ph.dataUrl) localPhotoMap[ph.id] = ph.dataUrl;
        }
        const combinedMap = { ...localPhotoMap, ...serverMap };
        const withPhotos = applyPhotoMap(incoming, combinedMap);

        // Merge signatures: priority order:
        // 1. remote has it (incoming protocol from server had the full sig)
        // 2. server photo store had it (fetched via sig_${personId} key)
        // 3. local state already has it (not overwritten by stripped WS update)
        const mergedSigs = (withPhotos.personSignatures ?? []).map((sig) => {
          if (sig.signatureDataUrl) return sig;
          const fromMap = combinedMap[`sig_${sig.personId}`];
          if (fromMap) return { ...sig, signatureDataUrl: fromMap };
          const local = prev?.personSignatures.find((s) => s.personId === sig.personId);
          return local?.signatureDataUrl ? { ...sig, signatureDataUrl: local.signatureDataUrl } : sig;
        });
        return { ...withPhotos, personSignatures: mergedSigs };
      });
      setLoadState("loaded");
    },
    [collectMissingIds, applyPhotoMap]
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/api/sync`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    setWsStatus("connecting");

    ws.onopen = () => setWsStatus("connected");

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === "init" && msg.protocols?.[protocolId]) {
          void hydrateAndSet(msg.protocols[protocolId] as ProtocolData);
        } else if (msg.type === "update" && msg.protocol?.id === protocolId) {
          void hydrateAndSet(msg.protocol as ProtocolData);
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [protocolId, hydrateAndSet]);

  useEffect(() => {
    fetch(`/api/protocol/${protocolId}`)
      .then((res) => {
        if (res.status === 404) throw Object.assign(new Error(), { code: "not-found" });
        if (!res.ok) throw new Error("error");
        return res.json();
      })
      .then((data) => void hydrateAndSet(data.protocol as ProtocolData))
      .catch((err: Error & { code?: string }) => {
        setLoadState(err.code === "not-found" ? "not-found" : "error");
      });
  }, [protocolId, hydrateAndSet]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const handleSign = async (personId: string, dataUrl: string) => {
    setSubmitting((s) => ({ ...s, [personId]: true }));
    // Optimistic: show pending sig immediately so canvas enters confirmed mode
    setPendingSig((s) => ({ ...s, [personId]: dataUrl }));
    try {
      const res = await fetch(`/api/protocol/${protocolId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, signatureDataUrl: dataUrl }),
      });
      if (!res.ok) throw new Error("Fehler");
      setProtocol((prev) => {
        if (!prev) return prev;
        const sigs = [...prev.personSignatures];
        const idx = sigs.findIndex((s) => s.personId === personId);
        if (idx >= 0) sigs[idx] = { ...sigs[idx], signatureDataUrl: dataUrl };
        else sigs.push({ personId, signatureDataUrl: dataUrl });
        return { ...prev, personSignatures: sigs };
      });
      setJustSigned((s) => ({ ...s, [personId]: true }));
      setPendingSig((s) => ({ ...s, [personId]: null }));
    } catch {
      // Rollback optimistic state so user can retry
      setPendingSig((s) => ({ ...s, [personId]: null }));
      alert("Fehler beim Speichern. Bitte erneut versuchen.");
    } finally {
      setSubmitting((s) => ({ ...s, [personId]: false }));
    }
  };

  const getSignature = (personId: string) => {
    const val = protocol?.personSignatures.find((s) => s.personId === personId)?.signatureDataUrl;
    return val || null; // treat empty string same as null
  };

  const handleExportPdf = async () => {
    if (!protocol) return;
    setIsExporting(true);
    try {
      await exportToPDF(protocol);
      toast({ title: "PDF erstellt", description: "Das Protokoll wurde erfolgreich exportiert." });
    } catch {
      toast({ title: "Export fehlgeschlagen", description: "Bitte erneut versuchen.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportZip = async () => {
    if (!protocol) return;
    const totalPhotos =
      (protocol.meterPhotos?.length ?? 0) +
      (protocol.kitchenPhotos?.length ?? 0) +
      protocol.rooms.reduce((s, r) => s + r.photos.length, 0);
    if (totalPhotos === 0) {
      toast({ title: "Keine Fotos", description: "Es sind noch keine Fotos vorhanden." });
      return;
    }
    setIsZipping(true);
    try {
      await exportPhotosAsZip(protocol);
      toast({ title: "ZIP erstellt", description: `${totalPhotos} Foto${totalPhotos !== 1 ? "s" : ""} exportiert.` });
    } catch {
      toast({ title: "Export fehlgeschlagen", description: "Bitte erneut versuchen.", variant: "destructive" });
    } finally {
      setIsZipping(false);
    }
  };

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 size={30} className="animate-spin" />
          <p className="text-sm">Protokoll wird geladen…</p>
        </div>
      </div>
    );
  }

  if (loadState === "not-found") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 space-y-4 text-center shadow-md">
          <div className="p-3 rounded-full bg-amber-50 border border-amber-200 inline-flex">
            <AlertTriangle size={24} className="text-amber-600" />
          </div>
          <h1 className="font-bold text-base">Protokoll nicht verfügbar</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Dieses Protokoll wurde noch nicht für die Freigabe aktiviert. Bitte den{" "}
            <strong>Vermieter bitten, Sync zu aktivieren</strong>, damit die Mieter-Ansicht
            zugänglich wird.
          </p>
        </div>
      </div>
    );
  }

  if (loadState === "error" || !protocol) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 space-y-4 text-center shadow-md">
          <AlertTriangle size={24} className="text-destructive" />
          <p className="text-sm text-muted-foreground">Verbindungsfehler. Bitte Seite neu laden.</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
            size="sm"
            className="gap-1.5"
          >
            <RefreshCw size={13} />
            Neu laden
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const floors = ["EG", "OG", "DG", "UG", "Außen"];
  const landlords = protocol.uebergeber.filter((p) => p.name);
  const tenants = protocol.uebernehmer.filter((p) => p.name);
  const allTenantsSigned =
    tenants.length > 0 && tenants.every((p) => !!getSignature(p.id));
  const allLandlordsSigned =
    landlords.length > 0 && landlords.every((p) => !!getSignature(p.id));

  const meterIcons: Record<string, React.ReactNode> = {
    Strom: <Zap size={13} />,
    Wasser: <Droplets size={13} />,
    Gas: <Flame size={13} />,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-40 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} />
                <h1 className="font-bold text-sm leading-tight truncate">
                  {protocol.mietobjekt || "Protokoll"}
                </h1>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                {protocol.adresse && (
                  <span className="text-xs text-primary-foreground/80 flex items-center gap-1">
                    <MapPin size={10} />
                    {protocol.adresse}
                  </span>
                )}
                {protocol.datum && (
                  <span className="text-xs text-primary-foreground/80 flex items-center gap-1">
                    <Calendar size={10} />
                    Übergabe: {protocol.datum}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {wsStatus === "connected" ? (
                <span className="flex items-center gap-1 text-xs text-primary-foreground/80">
                  <Wifi size={12} />
                  Live
                </span>
              ) : wsStatus === "connecting" ? (
                <Loader2 size={12} className="animate-spin text-primary-foreground/60" />
              ) : (
                <WifiOff size={12} className="text-primary-foreground/60" />
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Notice bar ──────────────────────────────────────────────────────── */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-start gap-2">
          <PenLine size={14} className="text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-snug">
            <strong>Mieter-Ansicht</strong> – Dieses Protokoll ist schreibgeschützt. Es wird
            automatisch aktualisiert wenn der Vermieter Änderungen vornimmt. Am Ende können
            Sie Ihre Unterschrift leisten.
          </p>
        </div>
      </div>

      {/* ── Export toolbar ───────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card/60">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-muted-foreground mr-1 shrink-0">Exportieren:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPdf}
            disabled={isExporting}
            className="gap-1.5 h-8 text-xs"
          >
            {isExporting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <FileDown size={13} />
            )}
            PDF herunterladen
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportZip}
            disabled={isZipping}
            className="gap-1.5 h-8 text-xs"
          >
            {isZipping ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ImageDown size={13} />
            )}
            Fotos als ZIP
          </Button>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        <div className="space-y-2">

          {/* 1 ── Allgemeine Informationen ─────────────────────────────────── */}
          <CollapsibleSection title="Allgemeine Informationen" defaultOpen={true}>
            <div className="px-1 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <ReadField label="Mietobjekt" value={protocol.mietobjekt} />
                <ReadField label="Datum der Übergabe" value={protocol.datum} />
              </div>
              <ReadField label="Adresse" value={protocol.adresse} fullWidth />

              {/* Vermieter */}
              <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Übergeber (Vermieter)
                </p>
                {protocol.uebergeber.filter((p) => p.name).length > 0 ? (
                  protocol.uebergeber.filter((p) => p.name).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {getPersonRole(p, "uebergeber")}
                        </span>
                        {p.name}
                      </span>
                      {!!getSignature(p.id) && (
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">Noch nicht eingetragen</p>
                )}
              </div>

              {/* Mieter */}
              <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Übernehmer (Mieter)
                </p>
                {protocol.uebernehmer.filter((p) => p.name).length > 0 ? (
                  protocol.uebernehmer.filter((p) => p.name).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                          {getPersonRole(p, "uebernehmer")}
                        </span>
                        {p.name}
                      </span>
                      {!!getSignature(p.id) && (
                        <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic">Noch nicht eingetragen</p>
                )}
              </div>

              <ReadField label="Schlüsselübergabe" value={protocol.schluessel} />
              <ReadField label="Details / Besonderheiten" value={protocol.schluesselDetails} />
            </div>
          </CollapsibleSection>

          {/* 2 ── Zählerstände ─────────────────────────────────────────────── */}
          <CollapsibleSection title="Zählerstände">
            <div className="px-1 space-y-2">
              {protocol.meterReadings.map((meter, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-20 shrink-0 flex items-center gap-1.5">
                    {meterIcons[meter.type] ?? null}
                    {meter.type}
                  </span>
                  <div className="flex-1 min-h-[36px] px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm tabular-nums">
                    {meter.stand?.trim() ? (
                      `${meter.stand} ${meter.einheit}`
                    ) : (
                      <span className="text-muted-foreground/50 italic">—</span>
                    )}
                  </div>
                </div>
              ))}

              {/* Meter photos */}
              {(protocol.meterPhotos?.length ?? 0) > 0 && (
                <div className="pt-1">
                  <FieldLabel>Fotos Zählerstände</FieldLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {protocol.meterPhotos!.map((ph) => (
                      <img
                        key={ph.id}
                        src={ph.dataUrl}
                        alt={ph.caption || "Zählerstand"}
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CollapsibleSection>

          {/* 3 ── Küche ────────────────────────────────────────────────────── */}
          <CollapsibleSection title="Küche – Geräte & Zustand">
            <div className="px-1 space-y-3">
              {/* Appliances */}
              {protocol.appliances?.length > 0 && (
                <div className="space-y-2">
                  {protocol.appliances.map((app, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 items-center">
                      <span className="text-sm font-medium">{app.name}</span>
                      <div className="min-h-[36px] px-3 py-2 bg-muted/40 border border-border rounded-lg text-sm">
                        {app.zustand?.trim() || (
                          <span className="text-muted-foreground/50 italic">—</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <ReadField label="Allgemeiner Zustand Küche" value={protocol.allgemeinerZustandKueche} />

              {/* Kitchen photos */}
              <div>
                <FieldLabel>Fotos Küche</FieldLabel>
                {protocol.kitchenPhotos?.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {protocol.kitchenPhotos.map((ph) => (
                      <img
                        key={ph.id}
                        src={ph.dataUrl}
                        alt={ph.caption || "Küche"}
                        className="w-full aspect-square object-cover rounded-lg border border-border"
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground/50 italic px-1">
                    Keine Fotos vorhanden
                  </p>
                )}
              </div>
            </div>
          </CollapsibleSection>

          {/* 4 ── Räume je Stockwerk ───────────────────────────────────────── */}
          {floors.map((floor) => {
            const rooms = protocol.rooms.filter((r) => r.floor === floor);
            if (rooms.length === 0) return null;
            return (
              <CollapsibleSection key={floor} title={FLOOR_LABELS[floor] ?? floor}>
                <div className="px-1 space-y-2">
                  {rooms.map((room) => (
                    <RoomCard key={room.id} room={room} />
                  ))}
                </div>
              </CollapsibleSection>
            );
          })}

          {/* 5 ── Zusatzvereinbarungen ─────────────────────────────────────── */}
          <CollapsibleSection
            title={
              protocol.zusatzvereinbarungTitle ||
              "Zusatzvereinbarung – Altbauhinweise & besondere Regelungen"
            }
          >
            <div className="px-1 space-y-4">
              {(protocol.zusatzvereinbarungen ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground/50 italic">
                  Keine Einträge vorhanden
                </p>
              ) : (
                protocol.zusatzvereinbarungen.map((z, idx) => (
                  <div
                    key={z.id}
                    className="border border-border rounded-xl bg-card overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                      <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="text-sm font-semibold">{z.title}</span>
                    </div>
                    <div className="px-3 py-2">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {z.content?.trim() || (
                          <span className="italic text-muted-foreground/50">Kein Inhalt</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleSection>

          {/* 6 ── Unterschriften ───────────────────────────────────────────── */}
          <div className="mb-4 border-2 border-primary/20 rounded-xl overflow-hidden">
            <div className="bg-primary/5 px-4 py-3 border-b border-primary/20">
              <div className="flex items-center gap-2">
                <PenLine size={16} className="text-primary" />
                <h2 className="font-bold text-sm text-primary">Unterschriften</h2>
                {allTenantsSigned && allLandlordsSigned && (
                  <CheckCircle2 size={15} className="text-green-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Durch Ihre Unterschrift bestätigen Sie die Kenntnisnahme des Protokolls
                einschließlich aller Zusatzvereinbarungen.
              </p>
            </div>

            <div className="px-4 py-4 space-y-6">

              {/* ── Vermieter (read-only) ──────────────────────────────────── */}
              {landlords.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    Übergeber (Vermieter)
                    {allLandlordsSigned && (
                      <CheckCircle2 size={12} className="text-green-500" />
                    )}
                  </p>
                  {landlords.map((person) => {
                    const sig = getSignature(person.id);
                    return (
                      <div key={person.id} className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                            {getPersonRole(person, "uebergeber")}
                          </span>
                          <span className="font-semibold text-sm">{person.name}</span>
                          {sig && (
                            <CheckCircle2 size={14} className="text-green-500 ml-auto shrink-0" />
                          )}
                        </div>
                        {sig ? (
                          <div className="border border-green-200 rounded-lg p-3 bg-green-50 space-y-1.5">
                            <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              Unterschrieben
                            </p>
                            <img
                              src={sig}
                              alt={`Unterschrift ${person.name}`}
                              className="max-h-20 border border-green-200 rounded bg-white"
                            />
                          </div>
                        ) : (
                          <div className="border border-border rounded-lg px-3 py-2.5 bg-muted/30 text-xs text-muted-foreground italic">
                            Noch nicht unterschrieben
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Divider between landlord and tenant sections */}
              {landlords.length > 0 && tenants.length > 0 && (
                <div className="border-t border-border" />
              )}

              {/* ── Mieter (interaktiv) ────────────────────────────────────── */}
              <div className="space-y-3">
                {tenants.length > 0 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                    Übernehmer (Mieter)
                    {allTenantsSigned && (
                      <CheckCircle2 size={12} className="text-green-500" />
                    )}
                  </p>
                )}

                {tenants.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    Keine Mieter im Protokoll eingetragen.
                  </p>
                ) : (
                  tenants.map((person) => {
                    const existingSig = getSignature(person.id);
                    const pending = pendingSig[person.id];
                    const isSubmitting = submitting[person.id] ?? false;
                    const hasJustSigned = justSigned[person.id] ?? false;

                    return (
                      <div key={person.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                            {getPersonRole(person, "uebernehmer")}
                          </span>
                          <span className="font-semibold text-sm">{person.name}</span>
                          {existingSig && (
                            <CheckCircle2 size={14} className="text-green-500 ml-auto" />
                          )}
                        </div>

                        {existingSig ? (
                          <div className="border border-green-200 rounded-lg p-3 bg-green-50 space-y-2">
                            <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                              <CheckCircle2 size={12} />
                              {hasJustSigned
                                ? "Unterschrift erfolgreich gespeichert!"
                                : "Bereits unterschrieben"}
                            </p>
                            <img
                              src={existingSig}
                              alt="Unterschrift"
                              className="max-h-20 border border-green-200 rounded bg-white"
                            />
                          </div>
                        ) : isSubmitting ? (
                          <div className="border border-border rounded-xl p-6 flex flex-col items-center gap-2 bg-muted/40">
                            <Loader2 size={20} className="animate-spin text-primary" />
                            <p className="text-xs text-muted-foreground">Wird synchronisiert…</p>
                          </div>
                        ) : (
                          <SignatureCanvasComponent
                            value={pending ?? null}
                            onChange={(dataUrl) => {
                              if (dataUrl) void handleSign(person.id, dataUrl);
                            }}
                          />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* All-signed banner */}
              {allTenantsSigned && allLandlordsSigned && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <CheckCircle2 size={20} className="text-green-500 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-green-700">
                    Alle Beteiligten haben unterschrieben
                  </p>
                  <p className="text-xs text-green-600 mt-0.5">
                    Das Protokoll ist vollständig unterzeichnet.
                  </p>
                </div>
              )}
              {allTenantsSigned && !allLandlordsSigned && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <CheckCircle2 size={20} className="text-blue-500 mx-auto mb-1" />
                  <p className="text-sm font-semibold text-blue-700">
                    Ihre Unterschrift wurde gespeichert
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    Die Unterschriften wurden automatisch synchronisiert.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
