import React, { useState, useRef, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DraggableAttributes,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FloorDef, ProtocolData, RoomData } from "../types";
import { getFloorLabel } from "../pdfExport";
import RoomSection from "./RoomSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  GripVertical, Plus, X, Check, Pencil, Trash2, ChevronDown, ChevronUp, AlertTriangle
} from "lucide-react";

interface FloorEditorProps {
  protocol: ProtocolData;
  updateProtocol: (fn: (p: ProtocolData) => ProtocolData) => void;
}

// ── Drag handle ───────────────────────────────────────────────────────────────

function DragHandle({ listeners, attributes }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  listeners?: Record<string, any>;
  attributes?: DraggableAttributes;
}) {
  return (
    <button
      type="button"
      {...listeners}
      {...attributes}
      className="p-1 rounded cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 transition-colors touch-none shrink-0"
      tabIndex={-1}
    >
      <GripVertical size={16} />
    </button>
  );
}

// ── Sortable room row ─────────────────────────────────────────────────────────

interface SortableRoomProps {
  room: RoomData;
  floorName: string;
  onUpdate: (updated: RoomData) => void;
  onDelete: () => void;
}

function SortableRoom({ room, floorName, onUpdate, onDelete }: SortableRoomProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `room:${room.id}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1">
      <DragHandle listeners={listeners} attributes={attributes} />
      <div className="flex-1 min-w-0">
        <RoomSection
          room={room}
          onChange={onUpdate}
          floorLabel={getFloorLabel(floorName)}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

// ── Sortable floor section ────────────────────────────────────────────────────

interface SortableFloorProps {
  floor: FloorDef;
  rooms: RoomData[];
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddRoom: (name: string) => void;
  onUpdateRoom: (roomId: string, updated: RoomData) => void;
  onDeleteRoom: (roomId: string) => void;
}

function SortableFloor({
  floor,
  rooms,
  onRename,
  onDelete,
  onAddRoom,
  onUpdateRoom,
  onDeleteRoom,
}: SortableFloorProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `floor:${floor.id}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(floor.name);
  const [addingRoom, setAddingRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && editRef.current) editRef.current.focus(); }, [editing]);
  useEffect(() => { if (addingRoom && addRef.current) addRef.current.focus(); }, [addingRoom]);

  const commitRename = () => {
    const n = editName.trim();
    if (n && n !== floor.name) onRename(n);
    else setEditName(floor.name);
    setEditing(false);
  };

  const commitAddRoom = () => {
    const n = newRoomName.trim();
    if (n) { onAddRoom(n); setNewRoomName(""); }
    setAddingRoom(false);
  };

  const roomIds = rooms.map(r => `room:${r.id}`);

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      {/* Floor header */}
      <div className="flex items-center gap-1 bg-black text-white rounded-xl px-3 py-2.5">
        <DragHandle listeners={listeners} attributes={attributes} />

        {editing ? (
          <input
            ref={editRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") { setEditName(floor.name); setEditing(false); }
            }}
            onBlur={commitRename}
            className="flex-1 bg-white/10 text-white text-sm font-semibold rounded px-2 py-0.5 outline-none border border-white/30 min-w-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex-1 text-left font-semibold text-sm min-w-0 truncate"
          >
            {floor.name}
          </button>
        )}

        <div className="flex items-center gap-0.5 shrink-0 ml-1">
          {!editing && (
            <button
              type="button"
              onClick={() => { setEditName(floor.name); setEditing(true); }}
              className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Umbenennen"
            >
              <Pencil size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            title="Etage löschen"
          >
            <Trash2 size={13} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="p-1 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Floor body */}
      {open && (
        <div className="mt-2 space-y-2 pl-1">
          <SortableContext items={roomIds} strategy={verticalListSortingStrategy}>
            {rooms.map(room => (
              <SortableRoom
                key={room.id}
                room={room}
                floorName={floor.name}
                onUpdate={updated => onUpdateRoom(room.id, updated)}
                onDelete={() => onDeleteRoom(room.id)}
              />
            ))}
          </SortableContext>

          {rooms.length === 0 && !addingRoom && (
            <p className="text-xs text-neutral-400 px-2 py-1 italic">Noch keine Räume in dieser Etage.</p>
          )}

          {addingRoom ? (
            <div className="flex items-center gap-2">
              <Input
                ref={addRef}
                value={newRoomName}
                onChange={e => setNewRoomName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") commitAddRoom();
                  if (e.key === "Escape") { setNewRoomName(""); setAddingRoom(false); }
                }}
                placeholder="Raumbezeichnung…"
                className="h-8 text-sm flex-1"
              />
              <Button
                size="sm"
                disabled={!newRoomName.trim()}
                onClick={commitAddRoom}
                className="gap-1 h-8 px-3 text-xs bg-black text-white hover:bg-neutral-800"
              >
                <Check size={13} />
                Hinzufügen
              </Button>
              <button
                type="button"
                onClick={() => { setNewRoomName(""); setAddingRoom(false); }}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAddingRoom(true)}
              className="w-full flex items-center gap-1.5 text-xs text-neutral-500 hover:text-black hover:bg-neutral-50 rounded-lg px-3 py-2.5 border border-dashed border-neutral-200 transition-colors mt-1"
            >
              <Plus size={13} />
              Raum hinzufügen
            </button>
          )}
        </div>
      )}

      {/* Delete floor confirm */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-neutral-700" />
              </div>
              <div>
                <h2 className="font-semibold text-black text-sm">Etage löschen?</h2>
                <p className="text-xs text-neutral-500 mt-1">
                  <span className="font-medium text-black">{floor.name}</span> und alle zugehörigen Räume werden gelöscht.
                  {rooms.length > 0 && ` (${rooms.length} Raum${rooms.length !== 1 ? "räume" : ""})`}
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)} className="border-neutral-200">
                Abbrechen
              </Button>
              <Button size="sm" onClick={() => { onDelete(); setShowDeleteConfirm(false); }}
                className="bg-black text-white hover:bg-neutral-800">
                Löschen
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main FloorEditor ──────────────────────────────────────────────────────────

export default function FloorEditor({ protocol, updateProtocol }: FloorEditorProps) {
  const [addingFloor, setAddingFloor] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const addFloorRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (addingFloor && addFloorRef.current) addFloorRef.current.focus(); }, [addingFloor]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const floors = protocol.floors;
  const floorIds = floors.map(f => `floor:${f.id}`);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const roomsForFloor = (floorId: string) =>
    protocol.rooms.filter(r => r.floor === floorId);

  const addFloor = () => {
    const name = newFloorName.trim();
    if (!name) return;
    const newFloor: FloorDef = { id: crypto.randomUUID(), name };
    updateProtocol(p => ({ ...p, floors: [...p.floors, newFloor] }));
    setNewFloorName("");
    setAddingFloor(false);
  };

  const renameFloor = (floorId: string, name: string) => {
    updateProtocol(p => ({
      ...p,
      floors: p.floors.map(f => f.id === floorId ? { ...f, name } : f),
    }));
  };

  const deleteFloor = (floorId: string) => {
    updateProtocol(p => ({
      ...p,
      floors: p.floors.filter(f => f.id !== floorId),
      rooms: p.rooms.filter(r => r.floor !== floorId),
      deletedRoomIds: [
        ...p.deletedRoomIds,
        ...p.rooms.filter(r => r.floor === floorId).map(r => r.id),
      ],
    }));
  };

  const addRoomToFloor = (floorId: string, name: string) => {
    const newRoom: RoomData = {
      id: crypto.randomUUID(),
      name,
      floor: floorId,
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
  };

  const updateRoom = (roomId: string, updated: RoomData) => {
    updateProtocol(p => ({
      ...p,
      rooms: p.rooms.map(r => r.id === roomId ? updated : r),
    }));
  };

  const deleteRoom = (roomId: string) => {
    updateProtocol(p => ({
      ...p,
      rooms: p.rooms.filter(r => r.id !== roomId),
      deletedRoomIds: [...p.deletedRoomIds, roomId],
    }));
  };

  // ── DnD handlers ─────────────────────────────────────────────────────────────

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("floor:") && overId.startsWith("floor:")) {
      const activeFloorId = activeId.replace("floor:", "");
      const overFloorId = overId.replace("floor:", "");
      updateProtocol(p => {
        const oldIdx = p.floors.findIndex(f => f.id === activeFloorId);
        const newIdx = p.floors.findIndex(f => f.id === overFloorId);
        if (oldIdx === -1 || newIdx === -1) return p;
        return { ...p, floors: arrayMove(p.floors, oldIdx, newIdx) };
      });
      return;
    }

    if (activeId.startsWith("room:") && overId.startsWith("room:")) {
      const activeRoomId = activeId.replace("room:", "");
      const overRoomId = overId.replace("room:", "");
      updateProtocol(p => {
        const oldIdx = p.rooms.findIndex(r => r.id === activeRoomId);
        const newIdx = p.rooms.findIndex(r => r.id === overRoomId);
        if (oldIdx === -1 || newIdx === -1) return p;
        return { ...p, rooms: arrayMove(p.rooms, oldIdx, newIdx) };
      });
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={floorIds} strategy={verticalListSortingStrategy}>
        {floors.map(floor => (
          <SortableFloor
            key={floor.id}
            floor={floor}
            rooms={roomsForFloor(floor.id)}
            onRename={name => renameFloor(floor.id, name)}
            onDelete={() => deleteFloor(floor.id)}
            onAddRoom={name => addRoomToFloor(floor.id, name)}
            onUpdateRoom={updateRoom}
            onDeleteRoom={deleteRoom}
          />
        ))}
      </SortableContext>

      {floors.length === 0 && !addingFloor && (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-neutral-200 rounded-xl">
          <p className="text-sm font-medium text-black mb-1">Noch keine Etagen</p>
          <p className="text-xs text-neutral-500 max-w-xs">
            Fügen Sie Etagen hinzu, um Räume strukturiert zu erfassen.
          </p>
        </div>
      )}

      {addingFloor ? (
        <div className="flex items-center gap-2 mt-2">
          <Input
            ref={addFloorRef}
            value={newFloorName}
            onChange={e => setNewFloorName(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") addFloor();
              if (e.key === "Escape") { setNewFloorName(""); setAddingFloor(false); }
            }}
            placeholder="Name der Etage…"
            className="h-9 text-sm flex-1"
          />
          <Button
            size="sm"
            disabled={!newFloorName.trim()}
            onClick={addFloor}
            className="gap-1 h-9 px-3 text-xs bg-black text-white hover:bg-neutral-800"
          >
            <Check size={13} />
            Erstellen
          </Button>
          <button
            type="button"
            onClick={() => { setNewFloorName(""); setAddingFloor(false); }}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAddingFloor(true)}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-black bg-neutral-100 hover:bg-neutral-200 rounded-xl px-4 py-3 transition-colors mt-2"
        >
          <Plus size={15} />
          Etage hinzufügen
        </button>
      )}
    </DndContext>
  );
}
