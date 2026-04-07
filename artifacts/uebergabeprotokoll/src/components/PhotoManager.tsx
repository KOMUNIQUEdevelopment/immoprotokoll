import React, { useRef, useCallback, useState } from "react";
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
import { Camera, ImagePlus, Trash2, GripVertical, Loader2 } from "lucide-react";
import { RoomPhoto } from "../types";
import { Button } from "@/components/ui/button";
import exifr from "exifr";
import { type SupportedLanguage, getTranslations } from "../i18n";
import { type Translations } from "../i18n/de-CH";
import i18n from "../i18n";

interface SortablePhotoProps {
  photo: RoomPhoto;
  onDelete: (id: string) => void;
  roomName?: string;
  floorLabel?: string;
  tr: Translations["editor"];
  locale: string;
}

function SortablePhoto({ photo, onDelete, roomName, floorLabel, tr, locale }: SortablePhotoProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const ts = new Date(photo.timestamp).toLocaleString(locale, {
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
        src={photo.dataUrl || `/api/photos/${photo.id}`}
        alt={`${tr.roomPhotos} ${ts}`}
        className="w-full aspect-[4/3] object-cover bg-neutral-100"
      />
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <button
          {...listeners}
          {...attributes}
          className="p-1.5 bg-white/20 rounded-md cursor-grab active:cursor-grabbing text-white hover:bg-white/30"
          title={tr.photoMove}
        >
          <GripVertical size={16} />
        </button>
      </div>
      <button
        onClick={() => onDelete(photo.id)}
        className="absolute top-1.5 right-1.5 p-1 bg-foreground/80 rounded-md text-background hover:bg-foreground active:bg-foreground shadow"
        title={tr.photoDelete}
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
  language?: SupportedLanguage;
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
    return raw.toISOString();
  }
  if (typeof raw === "string" && raw.trim()) {
    const normalized = raw.trim().replace(
      /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}:\d{2}:\d{2})$/,
      "$1-$2-$3T$4"
    );
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

async function getPhotoTimestamp(file: File): Promise<string> {
  try {
    const tags = await exifr.parse(file, {
      tiff: true,
      xmp: true,
      iptc: false,
      icc: false,
      jfif: false,
      translateValues: false,
      reviveValues: true,
    }) as Record<string, unknown> | null | undefined;

    if (tags) {
      const candidates = [
        tags["DateTimeOriginal"],
        tags["dateTimeOriginal"],
        tags["CreateDate"],
        tags["createDate"],
        tags["DateCreated"],
        tags["dateCreated"],
        tags["MetadataDate"],
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

  if (file.lastModified) {
    const fromFile = new Date(file.lastModified);
    if (!isNaN(fromFile.getTime()) && Date.now() - fromFile.getTime() > 60_000) {
      return fromFile.toISOString();
    }
  }

  return new Date().toISOString();
}

function langToLocale(lang: string): string {
  if (lang === "de-CH") return "de-CH";
  if (lang === "de-DE") return "de-DE";
  return "en-GB";
}

export default function PhotoManager({ photos, onChange, roomName, floorLabel, language }: PhotoManagerProps) {
  const effectiveLang = language ?? (i18n.language as SupportedLanguage) ?? "de-CH";
  const tr = (getTranslations(effectiveLang) as Translations).editor;
  const locale = langToLocale(effectiveLang);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [uploadingCount, setUploadingCount] = useState(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const validFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
      if (validFiles.length === 0) return;

      setUploadingCount((n) => n + validFiles.length);

      Promise.all(
        validFiles.map(async (file) => {
          const [dataUrl, timestamp] = await Promise.all([
            compressImage(file),
            getPhotoTimestamp(file),
          ]);
          const id = crypto.randomUUID();

          // Upload to server immediately — photos stored by ID, retrieved via URL
          const res = await fetch("/api/photos", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photos: [{ id, dataUrl }] }),
          });
          if (!res.ok) throw new Error(`Upload failed: HTTP ${res.status}`);

          // No dataUrl in state — photo is on the server, displayed via /api/photos/:id
          return { id, dataUrl: "", timestamp } satisfies RoomPhoto;
        })
      ).then((newPhotos) => {
        onChange([...photos, ...newPhotos]);
      }).catch((err) => {
        console.error("Photo upload failed:", err);
        alert(effectiveLang.startsWith("en")
          ? "Photo upload failed. Please check your connection and try again."
          : "Foto-Upload fehlgeschlagen. Bitte Verbindung prüfen und nochmal versuchen.");
      }).finally(() => {
        setUploadingCount((n) => Math.max(0, n - validFiles.length));
      });
    },
    [photos, onChange, effectiveLang]
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
      <div className="flex gap-2 flex-wrap items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={uploadingCount > 0}
          onClick={() => cameraInputRef.current?.click()}
        >
          <Camera size={15} />
          {tr.photoCamera}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          disabled={uploadingCount > 0}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus size={15} />
          {tr.photoGallery}
        </Button>
        {uploadingCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 size={13} className="animate-spin" />
            {uploadingCount === 1
              ? (effectiveLang.startsWith("en") ? "Uploading photo…" : "Foto wird hochgeladen…")
              : (effectiveLang.startsWith("en") ? `Uploading ${uploadingCount} photos…` : `${uploadingCount} Fotos werden hochgeladen…`)}
          </span>
        )}
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
                <SortablePhoto
                  key={photo.id}
                  photo={photo}
                  onDelete={deletePhoto}
                  roomName={roomName}
                  floorLabel={floorLabel}
                  tr={tr}
                  locale={locale}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {photos.length === 0 && (
        <p className="text-xs text-muted-foreground italic">{tr.photoNoPhotos}</p>
      )}
    </div>
  );
}
