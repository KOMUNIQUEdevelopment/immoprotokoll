import React, { useState } from "react";
import { ProtocolData, RoomData } from "../types";
import RoomSection from "../components/RoomSection";
import PersonList from "../components/PersonList";
import AutoGrowTextarea from "../components/AutoGrowTextarea";
import PhotoManager from "../components/PhotoManager";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp } from "lucide-react";

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
        <div className="px-1 space-y-3">
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
        if (rooms.length === 0) return null;
        return (
          <CollapsibleSection key={floor} title={floorLabels[floor] || floor}>
            <div className="px-1 space-y-2">
              {rooms.map(room => (
                <RoomSection
                  key={room.id}
                  room={room}
                  onChange={(updated) => updateRoom(room.id, updated)}
                />
              ))}
            </div>
          </CollapsibleSection>
        );
      })}
    </div>
  );
}
