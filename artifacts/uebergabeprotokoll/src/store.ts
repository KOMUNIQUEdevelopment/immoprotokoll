import { useState, useCallback, useRef } from "react";
import { ProtocolData, createDefaultProtocol, migrateProtocol } from "./types";
import { SyncMessage } from "./hooks/useSync";

const PROTOCOLS_KEY = "uebergabeprotokoll_protocols";
const LEGACY_KEY = "uebergabeprotokoll_data";

function loadLocalProtocols(): Record<string, ProtocolData> {
  try {
    const saved = localStorage.getItem(PROTOCOLS_KEY);
    if (saved) {
      const raw = JSON.parse(saved) as Record<string, Record<string, unknown>>;
      return Object.fromEntries(
        Object.entries(raw).map(([id, p]) => [id, migrateProtocol(p)])
      );
    }
  } catch (e) {
    console.warn("Failed to load protocols from localStorage", e);
  }

  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy);
      const protocol = migrateProtocol(parsed);
      const protocols: Record<string, ProtocolData> = { [protocol.id]: protocol };
      localStorage.setItem(PROTOCOLS_KEY, JSON.stringify(protocols));
      return protocols;
    }
  } catch {}

  return {};
}

function persistAll(protocols: Record<string, ProtocolData>): boolean {
  try {
    localStorage.setItem(PROTOCOLS_KEY, JSON.stringify(protocols));
    return true;
  } catch (e) {
    console.error("Save failed", e);
    return false;
  }
}

export function useProtocolsStore() {
  const [protocols, setProtocols] = useState<Record<string, ProtocolData>>(loadLocalProtocols);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsSendRef = useRef<((msg: SyncMessage) => void) | null>(null);

  const currentProtocol = currentId ? (protocols[currentId] ?? null) : null;

  const saveAll = useCallback((all: Record<string, ProtocolData>) => {
    const ok = persistAll(all);
    if (ok) setLastSaved(new Date());
    return ok;
  }, []);

  const receiveInit = useCallback((remoteProtocols: Record<string, ProtocolData>) => {
    setProtocols(prev => {
      const migrated = Object.fromEntries(
        Object.entries(remoteProtocols).map(([id, p]) => [id, migrateProtocol(p as Record<string, unknown>)])
      );

      const serverIsEmpty = Object.keys(migrated).length === 0;

      if (serverIsEmpty && Object.keys(prev).length > 0) {
        setTimeout(() => {
          Object.values(prev).forEach(p => {
            wsSendRef.current?.({ type: "update", protocol: p });
          });
        }, 100);
        return prev;
      }

      if (serverIsEmpty) {
        return prev;
      }

      const merged: Record<string, ProtocolData> = { ...migrated };

      Object.entries(prev).forEach(([id, localP]) => {
        if (!merged[id]) {
          merged[id] = localP;
          setTimeout(() => {
            wsSendRef.current?.({ type: "update", protocol: localP });
          }, 100);
        } else {
          const remoteP = merged[id];
          const rooms = remoteP.rooms.map(remoteRoom => {
            const prevRoom = localP.rooms.find(r => r.id === remoteRoom.id);
            const photos = remoteRoom.photos?.length
              ? remoteRoom.photos
              : (prevRoom?.photos ?? []);
            return { ...remoteRoom, photos };
          });
          const kitchenPhotos = remoteP.kitchenPhotos?.length
            ? remoteP.kitchenPhotos
            : (localP.kitchenPhotos ?? []);
          merged[id] = { ...remoteP, rooms, kitchenPhotos };
        }
      });

      persistAll(merged);
      return merged;
    });
  }, []);

  const receiveRemote = useCallback((remote: ProtocolData) => {
    setProtocols(prev => {
      const existing = prev[remote.id];
      const rooms = remote.rooms.map(remoteRoom => {
        const prevRoom = existing?.rooms.find(r => r.id === remoteRoom.id);
        const photos = remoteRoom.photos?.length ? remoteRoom.photos : (prevRoom?.photos ?? []);
        return { ...remoteRoom, photos };
      });
      const kitchenPhotos = remote.kitchenPhotos?.length
        ? remote.kitchenPhotos
        : (existing?.kitchenPhotos ?? []);
      const merged = { ...remote, rooms, kitchenPhotos };
      const next = { ...prev, [remote.id]: merged };
      persistAll(next);
      return next;
    });
  }, []);

  const receiveDelete = useCallback((id: string) => {
    setProtocols(prev => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      persistAll(next);
      return next;
    });
    setCurrentId(prev => (prev === id ? null : prev));
  }, []);

  const createNew = useCallback(() => {
    const p = createDefaultProtocol();
    setProtocols(prev => {
      const next = { ...prev, [p.id]: p };
      persistAll(next);
      return next;
    });
    setCurrentId(p.id);
    setTimeout(() => {
      wsSendRef.current?.({ type: "update", protocol: p });
    }, 0);
    return p.id;
  }, []);

  const switchTo = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  const backToList = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }
    setCurrentId(null);
  }, []);

  const deleteProtocol = useCallback((id: string) => {
    setProtocols(prev => {
      const next = { ...prev };
      delete next[id];
      persistAll(next);
      return next;
    });
    setCurrentId(prev => (prev === id ? null : prev));
    wsSendRef.current?.({ type: "delete", id });
  }, []);

  const manualSave = useCallback(() => {
    if (!currentId) return;
    setIsSaving(true);
    setProtocols(prev => {
      if (!prev[currentId]) return prev;
      const updated = { ...prev[currentId], lastSaved: new Date().toISOString() };
      const next = { ...prev, [currentId]: updated };
      persistAll(next);
      wsSendRef.current?.({ type: "update", protocol: updated });
      return next;
    });
    setLastSaved(new Date());
    setTimeout(() => setIsSaving(false), 800);
  }, [currentId]);

  const updateProtocol = useCallback(
    (updater: (prev: ProtocolData) => ProtocolData) => {
      if (!currentId) return;
      setProtocols(prev => {
        if (!prev[currentId]) return prev;
        const updated = updater(prev[currentId]);
        const next = { ...prev, [currentId]: updated };
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(() => {
          saveAll(next);
          wsSendRef.current?.({ type: "update", protocol: updated });
        }, 1500);
        return next;
      });
    },
    [currentId, saveAll]
  );

  return {
    protocols,
    currentProtocol,
    currentId,
    isEditing: currentId !== null,
    createNew,
    switchTo,
    backToList,
    deleteProtocol,
    updateProtocol,
    receiveInit,
    receiveRemote,
    receiveDelete,
    manualSave,
    isSaving,
    lastSaved,
    wsSendRef,
  };
}
