import React, { useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { RoomData, Condition } from "../types";
import PhotoManager from "./PhotoManager";
import AutoGrowTextarea from "./AutoGrowTextarea";
import { Input } from "@/components/ui/input";

interface RoomSectionProps {
  room: RoomData;
  onChange: (updated: RoomData) => void;
  floorLabel?: string;
  onDelete?: () => void;
}

const CONDITIONS: Condition[] = ["sehr gut", "gut", "Mängel"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
      {children}
    </label>
  );
}

function ConditionButtons({ value, onChange }: { value: Condition; onChange: (c: Condition) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {CONDITIONS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(value === c ? "" : c)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
            value === c
              ? "bg-foreground text-background border-foreground"
              : "bg-background border-border text-foreground hover:bg-accent"
          }`}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

export default function RoomSection({ room, onChange, floorLabel, onDelete }: RoomSectionProps) {
  const [open, setOpen] = useState(false);

  const update = (field: keyof RoomData, value: unknown) => {
    onChange({ ...room, [field]: value });
  };

  const hasContent = room.bodenZustand || room.maengelSchaeden || room.notizen || room.photos.length > 0;
  const isWaschraum = room.id === "ug-waschraum";

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Header: expand area + optional delete button */}
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center justify-between px-4 py-3 text-left hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-semibold text-sm truncate">{room.name}</span>
            {hasContent && (
              <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" title="Ausgefüllt" />
            )}
            {room.bodenZustand && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-muted text-muted-foreground">
                {room.bodenZustand}
              </span>
            )}
            {room.photos.length > 0 && (
              <span className="text-xs text-muted-foreground shrink-0">{room.photos.length} Foto{room.photos.length > 1 ? "s" : ""}</span>
            )}
          </div>
          {open ? <ChevronUp size={18} className="text-muted-foreground shrink-0 ml-2" /> : <ChevronDown size={18} className="text-muted-foreground shrink-0 ml-2" />}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            title="Raum löschen"
            className="px-3 border-l border-border text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-4">
          {/* Boden Zustand */}
          <div>
            <FieldLabel>Boden Zustand</FieldLabel>
            <ConditionButtons value={room.bodenZustand} onChange={(c) => update("bodenZustand", c)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel>Wände / Decken</FieldLabel>
              <AutoGrowTextarea
                value={room.waendeDecken}
                onChange={(e) => update("waendeDecken", e.target.value)}
                placeholder="Zustand beschreiben..."
              />
            </div>
            <div>
              <FieldLabel>Fenster / Türen</FieldLabel>
              <AutoGrowTextarea
                value={room.fensterTueren}
                onChange={(e) => update("fensterTueren", e.target.value)}
                placeholder="Zustand beschreiben..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel>Elektrik</FieldLabel>
              <Input
                value={room.elektrik}
                onChange={(e) => update("elektrik", e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <FieldLabel>Heizung</FieldLabel>
              <Input
                value={room.heizung}
                onChange={(e) => update("heizung", e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <FieldLabel>Mängel / Schäden</FieldLabel>
            <AutoGrowTextarea
              value={room.maengelSchaeden}
              onChange={(e) => update("maengelSchaeden", e.target.value)}
              placeholder="Mängel und Schäden beschreiben..."
            />
          </div>

          <div>
            <FieldLabel>Notizen</FieldLabel>
            <AutoGrowTextarea
              value={room.notizen}
              onChange={(e) => update("notizen", e.target.value)}
              placeholder="Weitere Notizen..."
            />
          </div>

          {/* Waschraum special section */}
          {isWaschraum && (
            <div className="border border-border rounded-lg p-3 space-y-3 bg-muted/30">
              <div>
                <FieldLabel>Waschmaschine vorhanden?</FieldLabel>
                <div className="flex gap-2">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => update("waschmaschineVorhanden", val)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        room.waschmaschineVorhanden === val
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-foreground hover:bg-accent"
                      }`}
                    >
                      {val ? "Ja" : "Nein"}
                    </button>
                  ))}
                </div>
              </div>

              {room.waschmaschineVorhanden === true && (
                <>
                  <div>
                    <FieldLabel>Zustand der Waschmaschine</FieldLabel>
                    <ConditionButtons
                      value={room.waschmaschinenZustand ?? ""}
                      onChange={(c) => update("waschmaschinenZustand", c)}
                    />
                  </div>
                  <div>
                    <FieldLabel>Notizen zur Waschmaschine</FieldLabel>
                    <AutoGrowTextarea
                      value={room.waschmaschinenNotizen ?? ""}
                      onChange={(e) => update("waschmaschinenNotizen", e.target.value)}
                      placeholder="z.B. Marke, Modell, Besonderheiten..."
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Photos */}
          <div>
            <FieldLabel>Fotos</FieldLabel>
            <PhotoManager
              photos={room.photos}
              onChange={(photos) => update("photos", photos)}
              roomName={room.name}
              floorLabel={floorLabel}
            />
          </div>
        </div>
      )}
    </div>
  );
}
