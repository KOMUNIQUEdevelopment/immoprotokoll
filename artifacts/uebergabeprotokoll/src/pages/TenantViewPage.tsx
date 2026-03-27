import React, { useState, useEffect, useRef, useCallback } from "react";
import { ProtocolData, getPersonRole } from "../types";
import SignatureCanvasComponent from "../components/SignatureCanvas";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";

const FLOOR_LABEL: Record<string, string> = {
  EG: "Erdgeschoss (EG)",
  OG: "Obergeschoss (OG)",
  DG: "Dachgeschoss (DG)",
  UG: "Untergeschoss (UG)",
  Außen: "Außenbereiche",
};

const CONDITION_STYLE: Record<string, string> = {
  "sehr gut": "bg-green-100 text-green-700 border-green-200",
  gut: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Mängel: "bg-red-100 text-red-700 border-red-200",
};

interface TenantViewPageProps {
  protocolId: string;
}

type LoadState = "loading" | "loaded" | "not-found" | "error";

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card text-left hover:bg-muted/50 transition-colors"
      >
        <span className="font-semibold text-sm">{title}</span>
        {open ? (
          <ChevronUp size={15} className="text-muted-foreground" />
        ) : (
          <ChevronDown size={15} className="text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-4 py-4 space-y-3 bg-background">{children}</div>}
    </div>
  );
}

export default function TenantViewPage({ protocolId }: TenantViewPageProps) {
  const [protocol, setProtocol] = useState<ProtocolData | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  const [pendingSig, setPendingSig] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState<Record<string, boolean>>({});
  const [justSigned, setJustSigned] = useState<Record<string, boolean>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateProtocol = useCallback((updated: ProtocolData) => {
    setProtocol(updated);
    setLoadState("loaded");
  }, []);

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
          updateProtocol(msg.protocols[protocolId] as ProtocolData);
        } else if (msg.type === "update" && msg.protocol?.id === protocolId) {
          updateProtocol(msg.protocol as ProtocolData);
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => ws.close();
  }, [protocolId, updateProtocol]);

  useEffect(() => {
    fetch(`/api/protocol/${protocolId}`)
      .then((res) => {
        if (res.status === 404) throw Object.assign(new Error(), { code: "not-found" });
        if (!res.ok) throw new Error("error");
        return res.json();
      })
      .then((data) => {
        setProtocol(data.protocol as ProtocolData);
        setLoadState("loaded");
      })
      .catch((err: Error & { code?: string }) => {
        setLoadState(err.code === "not-found" ? "not-found" : "error");
      });
  }, [protocolId]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const handleSign = async (personId: string) => {
    const sig = pendingSig[personId];
    if (!sig) return;
    setSubmitting((s) => ({ ...s, [personId]: true }));
    try {
      const res = await fetch(`/api/protocol/${protocolId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, signatureDataUrl: sig }),
      });
      if (!res.ok) throw new Error("Fehler");
      setProtocol((prev) => {
        if (!prev) return prev;
        const sigs = [...prev.personSignatures];
        const idx = sigs.findIndex((s) => s.personId === personId);
        if (idx >= 0) sigs[idx] = { ...sigs[idx], signatureDataUrl: sig };
        else sigs.push({ personId, signatureDataUrl: sig });
        return { ...prev, personSignatures: sigs };
      });
      setJustSigned((s) => ({ ...s, [personId]: true }));
      setPendingSig((s) => ({ ...s, [personId]: null }));
    } catch {
      alert("Fehler beim Speichern. Bitte erneut versuchen.");
    } finally {
      setSubmitting((s) => ({ ...s, [personId]: false }));
    }
  };

  const getSignature = (personId: string) =>
    protocol?.personSignatures.find((s) => s.personId === personId)?.signatureDataUrl ?? null;

  const meterIcon: Record<string, React.ReactNode> = {
    Strom: <Zap size={13} />,
    Wasser: <Droplets size={13} />,
    Gas: <Flame size={13} />,
  };

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
          <p className="text-sm text-muted-foreground">
            Verbindungsfehler. Bitte Seite neu laden.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" size="sm" className="gap-1.5">
            <RefreshCw size={13} />
            Neu laden
          </Button>
        </div>
      </div>
    );
  }

  const floors = ["EG", "OG", "DG", "UG", "Außen"];
  const tenants = protocol.uebernehmer.filter((p) => p.name);
  const allTenantsSigned = tenants.length > 0 && tenants.every((p) => !!getSignature(p.id));

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-40 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <ClipboardList size={16} />
                <h1 className="font-bold text-sm leading-tight truncate">
                  {protocol.mietobjekt || "Übergabeprotokoll"}
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

      {/* Mieter-Hinweis */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-start gap-2">
          <div className="text-blue-600 shrink-0 mt-0.5">
            <PenLine size={14} />
          </div>
          <p className="text-xs text-blue-700 leading-snug">
            <strong>Mieter-Ansicht</strong> – Dieses Protokoll ist schreibgeschützt. Sie können
            am Ende Ihre Unterschrift leisten, die automatisch synchronisiert wird.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-4">
        {/* Allgemeine Informationen */}
        <CollapsibleSection title="Allgemeine Informationen">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {protocol.mietobjekt && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Mietobjekt</p>
                <p className="font-medium">{protocol.mietobjekt}</p>
              </div>
            )}
            {protocol.adresse && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Adresse</p>
                <p className="font-medium">{protocol.adresse}</p>
              </div>
            )}
            {protocol.datum && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Datum</p>
                <p className="font-medium">{protocol.datum}</p>
              </div>
            )}
            {protocol.schluessel && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Key size={10} /> Schlüssel
                </p>
                <p className="font-medium">{protocol.schluessel}</p>
              </div>
            )}
          </div>

          {/* Persons */}
          <div className="mt-3 space-y-1.5">
            {[...protocol.uebergeber, ...protocol.uebernehmer]
              .filter((p) => p.name)
              .map((p) => {
                const side = protocol.uebergeber.some((u) => u.id === p.id)
                  ? "uebergeber"
                  : "uebernehmer";
                const signed = !!getSignature(p.id);
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          side === "uebergeber"
                            ? "bg-primary/10 text-primary"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {getPersonRole(p, side)}
                      </span>
                      {p.name}
                    </span>
                    {signed && (
                      <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                    )}
                  </div>
                );
              })}
          </div>
        </CollapsibleSection>

        {/* Zählerstände */}
        {protocol.meterReadings.some((m) => m.stand) && (
          <CollapsibleSection title="Zählerstände">
            <div className="space-y-2">
              {protocol.meterReadings.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {meterIcon[m.type] ?? null}
                    {m.type}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {m.stand} {m.einheit}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Küche */}
        {(protocol.allgemeinerZustandKueche || protocol.kitchenPhotos?.length > 0) && (
          <CollapsibleSection title="Küche">
            {protocol.allgemeinerZustandKueche && (
              <p className="text-sm text-muted-foreground">{protocol.allgemeinerZustandKueche}</p>
            )}
            {protocol.kitchenPhotos?.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {protocol.kitchenPhotos.map((ph) => (
                  <img
                    key={ph.id}
                    src={ph.dataUrl}
                    alt={ph.caption || "Foto"}
                    className="w-full aspect-square object-cover rounded-lg border border-border"
                  />
                ))}
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* Räume je Stockwerk */}
        {floors.map((floor) => {
          const rooms = protocol.rooms.filter((r) => r.floor === floor);
          if (rooms.length === 0) return null;
          const hasContent = rooms.some(
            (r) =>
              r.bodenZustand ||
              r.maengelSchaeden ||
              r.notizen ||
              r.waendeDecken ||
              r.photos.length > 0
          );
          if (!hasContent) return null;
          return (
            <CollapsibleSection key={floor} title={FLOOR_LABEL[floor] ?? floor} defaultOpen={false}>
              <div className="space-y-4">
                {rooms.map((room) => {
                  const hasRoomContent =
                    room.bodenZustand ||
                    room.maengelSchaeden ||
                    room.notizen ||
                    room.waendeDecken ||
                    room.photos.length > 0;
                  if (!hasRoomContent) return null;
                  return (
                    <div key={room.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{room.name}</p>
                        {room.bodenZustand && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              CONDITION_STYLE[room.bodenZustand] ?? "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {room.bodenZustand}
                          </span>
                        )}
                      </div>
                      {room.waendeDecken && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Wände/Decken:</span> {room.waendeDecken}
                        </p>
                      )}
                      {room.fensterTueren && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Fenster/Türen:</span> {room.fensterTueren}
                        </p>
                      )}
                      {room.maengelSchaeden && (
                        <p className="text-xs text-red-700 bg-red-50 rounded p-2 border border-red-200">
                          <span className="font-medium">Mängel/Schäden:</span> {room.maengelSchaeden}
                        </p>
                      )}
                      {room.notizen && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium">Notizen:</span> {room.notizen}
                        </p>
                      )}
                      {room.photos.length > 0 && (
                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                          {room.photos.map((ph) => (
                            <img
                              key={ph.id}
                              src={ph.dataUrl}
                              alt={ph.caption || room.name}
                              className="w-full aspect-square object-cover rounded-md border border-border"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          );
        })}

        {/* Zusatzvereinbarungen */}
        {protocol.zusatzvereinbarungen?.length > 0 && (
          <CollapsibleSection
            title={protocol.zusatzvereinbarungTitle || "Zusatzvereinbarungen"}
            defaultOpen={false}
          >
            <div className="space-y-3">
              {protocol.zusatzvereinbarungen.map((z, i) => (
                <div key={z.id} className="text-sm">
                  <p className="font-semibold text-sm mb-1">
                    {i + 1}. {z.title}
                  </p>
                  {z.content && (
                    <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                      {z.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* ── Unterschriften ──────────────────────────────────────────── */}
        <div className="border-2 border-primary/20 rounded-xl overflow-hidden">
          <div className="bg-primary/5 px-4 py-3 border-b border-primary/20">
            <div className="flex items-center gap-2">
              <PenLine size={16} className="text-primary" />
              <h2 className="font-bold text-sm text-primary">Ihre Unterschrift</h2>
              {allTenantsSigned && (
                <CheckCircle2 size={15} className="text-green-500 ml-auto" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Durch Ihre Unterschrift bestätigen Sie die Kenntnisnahme des Protokolls
              einschließlich aller Zusatzvereinbarungen.
            </p>
          </div>

          <div className="px-4 py-4 space-y-5">
            {tenants.length === 0 && (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                Keine Mieter im Protokoll eingetragen.
              </p>
            )}

            {tenants.map((person) => {
              const existingSig = getSignature(person.id);
              const pending = pendingSig[person.id];
              const isSubmitting = submitting[person.id] ?? false;
              const hasJustSigned = justSigned[person.id] ?? false;

              return (
                <div key={person.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                      Mieter
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
                        {hasJustSigned ? "Unterschrift erfolgreich gespeichert!" : "Bereits unterschrieben"}
                      </p>
                      <img
                        src={existingSig}
                        alt="Unterschrift"
                        className="max-h-20 border border-green-200 rounded bg-white"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <SignatureCanvasComponent
                        value={pending ?? null}
                        onChange={(dataUrl) =>
                          setPendingSig((s) => ({ ...s, [person.id]: dataUrl }))
                        }
                        label="Hier unterschreiben"
                      />
                      <Button
                        onClick={() => handleSign(person.id)}
                        disabled={!pending || isSubmitting}
                        className="w-full gap-2"
                        size="sm"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Wird gespeichert…
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} />
                            Unterschrift bestätigen & synchronisieren
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {allTenantsSigned && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <CheckCircle2 size={20} className="text-green-500 mx-auto mb-1" />
                <p className="text-sm font-semibold text-green-700">
                  Alle Mieter haben unterschrieben
                </p>
                <p className="text-xs text-green-600 mt-0.5">
                  Die Unterschriften wurden automatisch synchronisiert.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="h-6" />
      </main>
    </div>
  );
}
