import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RoomData, Condition } from "../types";
import PhotoManager from "./PhotoManager";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface RoomSectionProps {
  room: RoomData;
  onChange: (updated: RoomData) => void;
}

const CONDITIONS: Condition[] = ["sehr gut", "gut", "Mängel"];

export default function RoomSection({ room, onChange }: RoomSectionProps) {
  const [open, setOpen] = useState(false);

  const update = (field: keyof RoomData, value: unknown) => {
    onChange({ ...room, [field]: value });
  };

  const hasContent = room.bodenZustand || room.maengelSchaeden || room.notizen || room.photos.length > 0;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div>
            <span className="font-semibold text-sm">{room.name}</span>
            {hasContent && (
              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-primary" title="Ausgefüllt" />
            )}
          </div>
          {room.bodenZustand && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              room.bodenZustand === "sehr gut"
                ? "bg-green-100 text-green-700"
                : room.bodenZustand === "gut"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}>
              {room.bodenZustand}
            </span>
          )}
          {room.photos.length > 0 && (
            <span className="text-xs text-muted-foreground">{room.photos.length} Foto{room.photos.length > 1 ? "s" : ""}</span>
          )}
        </div>
        {open ? <ChevronUp size={18} className="text-muted-foreground shrink-0" /> : <ChevronDown size={18} className="text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border space-y-4">
          {/* Boden Zustand */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Boden Zustand
            </label>
            <div className="flex gap-2 flex-wrap">
              {CONDITIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => update("bodenZustand", room.bodenZustand === c ? "" : c)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    room.bodenZustand === c
                      ? c === "sehr gut"
                        ? "bg-green-500 text-white border-green-500"
                        : c === "gut"
                        ? "bg-yellow-500 text-white border-yellow-500"
                        : "bg-red-500 text-white border-red-500"
                      : "bg-background border-border text-foreground hover:bg-accent"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Text fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Wände / Decken
              </label>
              <Textarea
                value={room.waendeDecken}
                onChange={(e) => update("waendeDecken", e.target.value)}
                placeholder="Zustand beschreiben..."
                className="text-sm min-h-[70px] resize-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Fenster / Türen
              </label>
              <Textarea
                value={room.fensterTueren}
                onChange={(e) => update("fensterTueren", e.target.value)}
                placeholder="Zustand beschreiben..."
                className="text-sm min-h-[70px] resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Elektrik
              </label>
              <Input
                value={room.elektrik}
                onChange={(e) => update("elektrik", e.target.value)}
                className="text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                Heizung
              </label>
              <Input
                value={room.heizung}
                onChange={(e) => update("heizung", e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
              Mängel / Schäden
            </label>
            <Textarea
              value={room.maengelSchaeden}
              onChange={(e) => update("maengelSchaeden", e.target.value)}
              placeholder="Mängel und Schäden beschreiben..."
              className="text-sm min-h-[70px] resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
              Notizen
            </label>
            <Textarea
              value={room.notizen}
              onChange={(e) => update("notizen", e.target.value)}
              placeholder="Weitere Notizen..."
              className="text-sm min-h-[60px] resize-none"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
              Fotos
            </label>
            <PhotoManager
              photos={room.photos}
              onChange={(photos) => update("photos", photos)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
