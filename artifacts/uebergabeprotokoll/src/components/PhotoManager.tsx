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

interface SortablePhotoProps {
  photo: RoomPhoto;
  onDelete: (id: string) => void;
}

function SortablePhoto({ photo, onDelete }: SortablePhotoProps) {
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
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          {...listeners}
          {...attributes}
          className="p-1.5 bg-white/20 rounded-md cursor-grab active:cursor-grabbing text-white hover:bg-white/30"
          title="Verschieben"
        >
          <GripVertical size={16} />
        </button>
        <button
          onClick={() => onDelete(photo.id)}
          className="p-1.5 bg-red-500/80 rounded-md text-white hover:bg-red-600"
          title="Löschen"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="px-2 py-1 text-xs text-muted-foreground truncate">{ts}</div>
    </div>
  );
}

interface PhotoManagerProps {
  photos: RoomPhoto[];
  onChange: (photos: RoomPhoto[]) => void;
}

export default function PhotoManager({ photos, onChange }: PhotoManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const newPhotos: RoomPhoto[] = [];
      const readers: Promise<void>[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const reader = new FileReader();
        const p = new Promise<void>((resolve) => {
          reader.onload = (e) => {
            if (e.target?.result) {
              newPhotos.push({
                id: crypto.randomUUID(),
                dataUrl: e.target.result as string,
                timestamp: new Date().toISOString(),
              });
            }
            resolve();
          };
        });
        reader.readAsDataURL(file);
        readers.push(p);
      }

      Promise.all(readers).then(() => {
        onChange([...photos, ...newPhotos]);
      });
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
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
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
                <SortablePhoto key={photo.id} photo={photo} onDelete={deletePhoto} />
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
