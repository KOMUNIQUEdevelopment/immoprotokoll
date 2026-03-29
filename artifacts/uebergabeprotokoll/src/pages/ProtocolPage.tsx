import React, { useState, useRef, useEffect } from "react";
import { ProtocolData, RoomData, ZusatzvereinbarungEntry } from "../types";
import { getFloorLabel } from "../pdfExport";
import RoomSection from "../components/RoomSection";
import PersonList from "../components/PersonList";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import PhotoManager from "../components/PhotoManager";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus, X, Pencil, Trash2, Check } from "lucide-react";

interface ProtocolPageProps {
  protocol: ProtocolData;
  updateProtocol: (fn: (p: ProtocolData) => ProtocolData) => void;
}

function CollapsibleSection({ title, children, defaultOpen = false }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
      >
        {title}
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
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

export default function ProtocolPage({ protocol, updateProtocol }: ProtocolPageProps) {
  const setField = (field: keyof ProtocolData, value: unknown) => {
    updateProtocol(p => ({ ...p, [field]: value }));
  };

  const floors = ["EG", "OG", "DG", "UG", "Außen"];
  const floorLabels: Record<string, string> = {
    EG: "Erdgeschoss (EG)",
    OG: "Obergeschoss (OG)",
    DG: "Dachgeschoss (DG)",
    UG: "Untergeschoss / Keller",
    Außen: "Außenbereiche",
  };

  const updateRoom = (roomId: string, updated: RoomData) => {
    updateProtocol(p => ({
      ...p,
      rooms: p.rooms.map(r => r.id === roomId ? updated : r),
    }));
  };

  // ── Room management ─────────────────────────────────────────────────────────

  const [addingFloor, setAddingFloor] = useState<string | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<{ id: string; name: string } | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addingFloor && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [addingFloor]);

  const startAddRoom = (floor: string) => {
    setAddingFloor(floor);
    setNewRoomName("");
  };

  const confirmAddRoom = () => {
    const name = newRoomName.trim();
    if (!name || !addingFloor) return;
    const newRoom: RoomData = {
      id: crypto.randomUUID(),
      name,
      floor: addingFloor,
      bodenZustand: "",
      waendeDecken: "",
      fensterTueren: "",
      elektrik: "",
      heizung: "",
      maengelSchaeden: "",
      notizen: "",
      photos: [],
    };
    updateProtocol(p => ({ ...p, rooms: [...p.rooms, newRoom] }));
    setAddingFloor(null);
    setNewRoomName("");
  };

  const confirmDeleteRoom = () => {
    if (!deleteRoomTarget) return;
    updateProtocol(p => ({ ...p, rooms: p.rooms.filter(r => r.id !== deleteRoomTarget.id) }));
    setDeleteRoomTarget(null);
  };

  return (
    <div className="space-y-2">
      {/* General Info */}
      <CollapsibleSection title="Allgemeine Informationen" defaultOpen={true}>
        <div className="px-1 space-y-3">
          {/* Mietobjekt + Adresse */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Mietobjekt</FieldLabel>
              <Input
                value={protocol.mietobjekt}
                onChange={(e) => setField("mietobjekt", e.target.value)}
                placeholder="Art des Mietobjekts"
              />
            </div>
            <div>
              <FieldLabel>Datum der Übergabe</FieldLabel>
              <Input
                value={protocol.datum}
                onChange={(e) => setField("datum", e.target.value)}
                placeholder="TT.MM.JJJJ"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Adresse</FieldLabel>
            <Input
              value={protocol.adresse}
              onChange={(e) => setField("adresse", e.target.value)}
              placeholder="Straße, PLZ Ort"
            />
          </div>

          {/* Übergeber */}
          <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
            <PersonList
              label="Übergeber (Vermieter)"
              persons={protocol.uebergeber}
              onChange={(persons) => setField("uebergeber", persons)}
            />
          </div>

          {/* Übernehmer */}
          <div className="border border-border rounded-xl p-3 space-y-2 bg-card">
            <PersonList
              label="Übernehmer (Mieter)"
              persons={protocol.uebernehmer}
              onChange={(persons) => setField("uebernehmer", persons)}
            />
          </div>

          {/* Keys */}
          <div>
            <FieldLabel>Schlüsselübergabe</FieldLabel>
            <Input
              value={protocol.schluessel}
              onChange={(e) => setField("schluessel", e.target.value)}
              placeholder="Anzahl und Art der Schlüssel"
            />
          </div>
          <div>
            <FieldLabel>Details / Besonderheiten</FieldLabel>
            <AutoGrowTextarea
              value={protocol.schluesselDetails}
              onChange={(e) => setField("schluesselDetails", e.target.value)}
              placeholder="z.B. 3× Haustürschlüssel, 2× Briefkastenschlüssel..."
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Meter Readings */}
      <CollapsibleSection title="Zählerstände">
        <div className="px-1 space-y-4">
          <div className="space-y-3">
            {protocol.meterReadings.map((meter, i) => (
              <div key={i} className="flex items-center gap-2">
                <label className="text-sm font-medium w-20 shrink-0">{meter.type}</label>
                <Input
                  value={meter.stand}
                  onChange={(e) => {
                    const updated = [...protocol.meterReadings];
                    updated[i] = { ...meter, stand: e.target.value };
                    setField("meterReadings", updated);
                  }}
                  placeholder={`Stand in ${meter.einheit}`}
                  className="text-sm"
                />
                <span className="text-sm text-muted-foreground shrink-0">{meter.einheit}</span>
              </div>
            ))}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Fotos Zählerstände</p>
            <PhotoManager
              photos={protocol.meterPhotos ?? []}
              onChange={(photos) => setField("meterPhotos", photos)}
              roomName="Zählerstände"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Kitchen Appliances */}
      <CollapsibleSection title="Küche – Geräte & Zustand">
        <div className="px-1 space-y-3">
          {protocol.appliances.map((app, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 items-center">
              <label className="text-sm font-medium">{app.name}</label>
              <Input
                value={app.zustand}
                onChange={(e) => {
                  const updated = [...protocol.appliances];
                  updated[i] = { ...app, zustand: e.target.value };
                  setField("appliances", updated);
                }}
                placeholder="Zustand"
                className="text-sm"
              />
            </div>
          ))}
          <div>
            <FieldLabel>Allgemeiner Zustand Küche</FieldLabel>
            <AutoGrowTextarea
              value={protocol.allgemeinerZustandKueche}
              onChange={(e) => setField("allgemeinerZustandKueche", e.target.value)}
              placeholder="Allgemeinen Zustand der Küche beschreiben..."
            />
          </div>
          <div>
            <FieldLabel>Fotos Küche</FieldLabel>
            <PhotoManager
              photos={protocol.kitchenPhotos ?? []}
              onChange={(photos) => setField("kitchenPhotos", photos)}
              roomName="Küche"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Rooms by floor */}
      {floors.map(floor => {
        const rooms = protocol.rooms.filter(r => r.floor === floor);
        return (
          <CollapsibleSection key={floor} title={floorLabels[floor] || floor}>
            <div className="px-1 space-y-2">
              {rooms.map(room => (
                <RoomSection
                  key={room.id}
                  room={room}
                  onChange={(updated) => updateRoom(room.id, updated)}
                  floorLabel={getFloorLabel(floor)}
                  onDelete={() => setDeleteRoomTarget({ id: room.id, name: room.name })}
                />
              ))}

              {/* Add room inline form or button */}
              {addingFloor === floor ? (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    ref={addInputRef}
                    value={newRoomName}
                    onChange={e => setNewRoomName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") confirmAddRoom();
                      if (e.key === "Escape") setAddingFloor(null);
                    }}
                    placeholder="Raumbezeichnung…"
                    className="h-8 text-sm flex-1"
                  />
                  <Button
                    size="sm"
                    disabled={!newRoomName.trim()}
                    onClick={confirmAddRoom}
                    className="gap-1 h-8 px-3 text-xs"
                  >
                    <Check size={13} />
                    Hinzufügen
                  </Button>
                  <button
                    type="button"
                    onClick={() => setAddingFloor(null)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startAddRoom(floor)}
                  className="w-full flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-2.5 border border-dashed border-border/70 transition-colors mt-1"
                >
                  <Plus size={13} />
                  Raum hinzufügen
                </button>
              )}
            </div>
          </CollapsibleSection>
        );
      })}

      {/* Delete room confirmation dialog */}
      {deleteRoomTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteRoomTarget(null)}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in fade-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-muted shrink-0">
                <Trash2 size={18} className="text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="font-semibold text-base">Raum löschen?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">„{deleteRoomTarget.name}"</span>
                  {" "}und alle zugehörigen Daten (inkl. Fotos) werden aus diesem Protokoll entfernt.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteRoomTarget(null)}>
                Abbrechen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={confirmDeleteRoom}
                autoFocus
                className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 size={14} />
                Löschen
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Zusatzvereinbarung */}
      <ZusatzvereinbarungSection
        sectionTitle={protocol.zusatzvereinbarungTitle ?? "Zusatzvereinbarung – Altbauhinweise & besondere Regelungen"}
        entries={protocol.zusatzvereinbarungen ?? []}
        onTitleChange={val => updateProtocol(p => ({ ...p, zusatzvereinbarungTitle: val }))}
        onEntriesChange={entries => updateProtocol(p => ({ ...p, zusatzvereinbarungen: entries }))}
      />
    </div>
  );
}

interface ZusatzvereinbarungSectionProps {
  sectionTitle: string;
  entries: ZusatzvereinbarungEntry[];
  onTitleChange: (val: string) => void;
  onEntriesChange: (entries: ZusatzvereinbarungEntry[]) => void;
}

function ZusatzvereinbarungSection({ sectionTitle, entries, onTitleChange, onEntriesChange }: ZusatzvereinbarungSectionProps) {
  const [open, setOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(sectionTitle);

  const addEntry = () => {
    const newEntry: ZusatzvereinbarungEntry = {
      id: crypto.randomUUID(),
      title: "Neuer Abschnitt",
      content: "",
    };
    onEntriesChange([...entries, newEntry]);
  };

  const removeEntry = (id: string, title: string) => {
    const label = title.trim() || "diesen Abschnitt";
    if (!window.confirm(`„${label}" wirklich löschen?`)) return;
    onEntriesChange(entries.filter(e => e.id !== id));
  };

  const updateEntry = (id: string, patch: Partial<ZusatzvereinbarungEntry>) => {
    onEntriesChange(entries.map(e => e.id === id ? { ...e, ...patch } : e));
  };

  const commitTitle = () => {
    if (titleDraft.trim()) onTitleChange(titleDraft.trim());
    setEditingTitle(false);
  };

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTitleDraft(sectionTitle);
    setEditingTitle(true);
  };

  return (
    <div className="mb-4">
      {/* Section header – styled like CollapsibleSection */}
      <button
        type="button"
        onClick={() => !editingTitle && setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm"
      >
        {editingTitle ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onClick={e => e.stopPropagation()}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setTitleDraft(sectionTitle); setEditingTitle(false); }
            }}
            className="flex-1 bg-transparent border-b border-primary-foreground/50 outline-none text-sm font-semibold text-left"
          />
        ) : (
          <span className="flex-1 text-left truncate">{sectionTitle}</span>
        )}
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {!editingTitle && (
            <span
              role="button"
              onClick={startEdit}
              className="p-1 rounded hover:bg-primary-foreground/10 transition-colors"
              title="Titel bearbeiten"
            >
              <Pencil size={13} className="opacity-70" />
            </span>
          )}
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Entries – only visible when open */}
      {open && (
        <div className="mt-3 space-y-4 px-1">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="border border-border rounded-xl bg-card overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">{idx + 1}.</span>
                <Input
                  value={entry.title}
                  onChange={e => updateEntry(entry.id, { title: e.target.value })}
                  className="flex-1 h-7 text-sm font-semibold border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
                  placeholder="Titel"
                />
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id, entry.title)}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  title="Abschnitt löschen"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="px-3 py-2">
                <AutoGrowTextarea
                  value={entry.content}
                  onChange={e => updateEntry(entry.id, { content: e.target.value })}
                  placeholder="Inhalt des Abschnitts..."
                  className="text-sm leading-relaxed"
                />
              </div>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            onClick={addEntry}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus size={15} />
            Abschnitt hinzufügen
          </button>
        </div>
      )}
    </div>
  );
}
