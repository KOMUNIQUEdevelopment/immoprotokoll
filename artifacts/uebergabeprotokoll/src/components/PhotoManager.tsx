import React, { useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Camera, ImagePlus, Trash2, GripVertical } from "lucide-react";
import { RoomPhoto } from "../types";
import { Button } from "@/components/ui/button";
import exifr from "exifr";

interface SortablePhotoProps {
  photo: RoomPhoto;
  onDelete: (id: string) => void;
  roomName?: string;
  floorLabel?: string;
}

function SortablePhoto({ photo, onDelete, roomName, floorLabel }: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const ts = new Date(photo.timestamp).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group rounded-lg overflow-hidden border border-border bg-card shadow-sm"
    >
      <img
        src={photo.dataUrl}
        alt={`Foto ${ts}`}
        className="w-full aspect-[4/3] object-cover"
      />
      {/* Drag handle + overlay controls – visible on hover (desktop) */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          {...listeners}
          {...attributes}
          className="p-1.5 bg-white/20 rounded-md cursor-grab active:cursor-grabbing text-white hover:bg-white/30"
          title="Verschieben"
        >
          <GripVertical size={16} />
        </button>
      </div>
      {/* Delete button – always visible so it works on touch/mobile */}
      <button
        onClick={() => onDelete(photo.id)}
        className="absolute top-1.5 right-1.5 p-1 bg-foreground/80 rounded-md text-background hover:bg-foreground active:bg-foreground shadow"
        title="Löschen"
      >
        <Trash2 size={14} />
      </button>
      <div className="px-2 py-1 text-xs text-muted-foreground truncate leading-tight">
        {floorLabel && <span className="text-foreground/50">{floorLabel} · </span>}
        {roomName && <span className="font-medium text-foreground/70">{roomName} · </span>}
        {ts}
      </div>
    </div>
  );
}

interface PhotoManagerProps {
  photos: RoomPhoto[];
  onChange: (photos: RoomPhoto[]) => void;
  roomName?: string;
  floorLabel?: string;
}

const MAX_DIM = 1280;
const JPEG_QUALITY = 0.78;

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width >= height) {
          height = Math.round((height * MAX_DIM) / width);
          width = MAX_DIM;
        } else {
          width = Math.round((width * MAX_DIM) / height);
          height = MAX_DIM;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Parse a raw EXIF date value (Date object or EXIF string "YYYY:MM:DD HH:MM:SS").
// EXIF timestamps have NO timezone info → treat them as local device time by
// constructing an explicit local-time string (no trailing "Z").
function parseExifDate(raw: unknown): string | null {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    // exifr already built a Date – use it directly (it applied local-time rules)
    return raw.toISOString();
  }
  if (typeof raw === "string" && raw.trim()) {
    // "YYYY:MM:DD HH:MM:SS" → "YYYY-MM-DDTHH:MM:SS" (no Z = local time in JS)
    const normalized = raw.trim().replace(
      /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}:\d{2}:\d{2})$/,
      "$1-$2-$3T$4"
    );
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

// Determine the best timestamp for a photo file.
// Priority:
//   1. EXIF DateTimeOriginal  – actual camera shutter moment
//   2. EXIF CreateDate        – digitisation / creation date (also in XMP)
//   3. Any other recognisable EXIF/XMP date field
//   4. file.lastModified      – file-system date (only useful for freshly taken photos)
//   5. current time           – absolute last resort (upload moment)
async function getPhotoTimestamp(file: File): Promise<string> {
  try {
    // Parse broadly: all EXIF segments + XMP (used by Google Photos / Drive)
    // translateValues:false keeps raw strings so we can normalise ourselves
    const tags = await exifr.parse(file, {
      tiff: true,
      xmp: true,
      iptc: false,
      icc: false,
      jfif: false,
      translateValues: false,
      reviveValues: true, // still convert date strings to Date objects where possible
    }) as Record<string, unknown> | null | undefined;

    if (tags) {
      // Ordered list of fields to try, from most to least authoritative
      const candidates = [
        tags["DateTimeOriginal"],
        tags["dateTimeOriginal"],
        tags["CreateDate"],
        tags["createDate"],
        tags["DateCreated"],     // IPTC / XMP
        tags["dateCreated"],
        tags["MetadataDate"],    // XMP
        tags["ModifyDate"],
      ];
      for (const raw of candidates) {
        const ts = parseExifDate(raw);
        if (ts) return ts;
      }
    }
  } catch {
    // EXIF parsing failed – proceed to fallbacks
  }

  // file.lastModified is reliable ONLY if it predates "now" by a meaningful margin
  // (i.e. the file existed before the upload session started, not a just-downloaded copy).
  if (file.lastModified) {
    const fromFile = new Date(file.lastModified);
    // Accept if the file was last modified more than 60 seconds before upload began
    if (!isNaN(fromFile.getTime()) && Date.now() - fromFile.getTime() > 60_000) {
      return fromFile.toISOString();
    }
  }

  // Last resort: moment of upload
  return new Date().toISOString();
}

export default function PhotoManager({ photos, onChange, roomName, floorLabel }: PhotoManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const validFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
      if (validFiles.length === 0) return;

      Promise.all(
        validFiles.map(async (file) => {
          const [dataUrl, timestamp] = await Promise.all([
            compressImage(file),
            getPhotoTimestamp(file),
          ]);
          return { id: crypto.randomUUID(), dataUrl, timestamp } satisfies RoomPhoto;
        })
      ).then((newPhotos) => {
        onChange([...photos, ...newPhotos]);
      }).catch(console.error);
    },
    [photos, onChange]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex((p) => p.id === active.id);
      const newIndex = photos.findIndex((p) => p.id === over.id);
      onChange(arrayMove(photos, oldIndex, newIndex));
    }
  };

  const deletePhoto = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera size={15} />
          Kamera
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus size={15} />
          Aus Galerie
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {photos.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {photos.map((photo) => (
                <SortablePhoto key={photo.id} photo={photo} onDelete={deletePhoto} roomName={roomName} floorLabel={floorLabel} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {photos.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Noch keine Fotos hinzugefügt</p>
      )}
    </div>
  );
}
