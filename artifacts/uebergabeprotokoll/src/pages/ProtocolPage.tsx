import React, { useState } from "react";
import { ProtocolData, RoomData } from "../types";
import RoomSection from "../components/RoomSection";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

function fieldClass(label: string, children: React.ReactNode) {
  return (
    <div>
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ProtocolPage({ protocol, updateProtocol }: ProtocolPageProps) {
  const set = (field: keyof ProtocolData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    updateProtocol(p => ({ ...p, [field]: e.target.value }));
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
          {fieldClass("Adresse", <Input value={protocol.adresse} onChange={set("adresse")} placeholder="Straße, PLZ Ort" />)}
          {fieldClass("Datum der Übergabe", <Input value={protocol.datum} onChange={set("datum")} placeholder="TT.MM.JJJJ" />)}
          {fieldClass("Übergeber (Vermieter)", <Input value={protocol.uebergeber} onChange={set("uebergeber")} placeholder="Name des Übergebers" />)}
          {fieldClass("Übernehmer (Mieter)", <Input value={protocol.uebernehmer} onChange={set("uebernehmer")} placeholder="Name des Übernehmers" />)}
        </div>
        <div className="px-1 space-y-3">
          {fieldClass("Schlüsselübergabe", <Input value={protocol.schluessel} onChange={set("schluessel")} placeholder="Anzahl und Art der Schlüssel" />)}
          {fieldClass("Details / Besonderheiten", <Textarea value={protocol.schluesselDetails} onChange={set("schluesselDetails")} placeholder="z.B. 3× Haustürschlüssel, 2× Briefkastenschlüssel..." className="min-h-[60px] resize-none text-sm" />)}
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
                  updateProtocol(p => ({ ...p, meterReadings: updated }));
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
                  updateProtocol(p => ({ ...p, appliances: updated }));
                }}
                placeholder="Zustand"
                className="text-sm"
              />
            </div>
          ))}
          {fieldClass("Allgemeiner Zustand Küche",
            <Textarea
              value={protocol.allgemeinerZustandKueche}
              onChange={set("allgemeinerZustandKueche")}
              placeholder="Allgemeinen Zustand der Küche beschreiben..."
              className="min-h-[70px] resize-none text-sm"
            />
          )}
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
