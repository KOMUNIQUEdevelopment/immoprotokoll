import { useState, useCallback, useRef } from "react";
import { ProtocolData, createDefaultProtocol, migrateProtocol } from "./types";

const PROTOCOLS_KEY = "uebergabeprotokoll_protocols";
const LEGACY_KEY = "uebergabeprotokoll_data";

function loadAllProtocols(): Record<string, ProtocolData> {
  // New multi-protocol format
  try {
    const saved = localStorage.getItem(PROTOCOLS_KEY);
    if (saved) {
      const raw = JSON.parse(saved) as Record<string, Record<string, unknown>>;
      return Object.fromEntries(
        Object.entries(raw).map(([id, p]) => [id, migrateProtocol(p)])
      );
    }
  } catch (e) {
    console.warn("Failed to load protocols", e);
  }

  // Migrate legacy single-protocol format
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
  const [protocols, setProtocols] = useState<Record<string, ProtocolData>>(loadAllProtocols);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsSendRef = useRef<((data: ProtocolData) => void) | null>(null);

  const currentProtocol = currentId ? (protocols[currentId] ?? null) : null;

  const saveAll = useCallback((all: Record<string, ProtocolData>) => {
    const ok = persistAll(all);
    if (ok) setLastSaved(new Date());
    return ok;
  }, []);

  const createNew = useCallback(() => {
    const p = createDefaultProtocol();
    setProtocols(prev => {
      const next = { ...prev, [p.id]: p };
      persistAll(next);
      return next;
    });
    setCurrentId(p.id);
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
  }, []);

  const manualSave = useCallback(() => {
    if (!currentId) return;
    setIsSaving(true);
    setProtocols(prev => {
      if (!prev[currentId]) return prev;
      const updated = { ...prev[currentId], lastSaved: new Date().toISOString() };
      const next = { ...prev, [currentId]: updated };
      persistAll(next);
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
          wsSendRef.current?.(updated);
        }, 1500);
        return next;
      });
    },
    [currentId, saveAll]
  );

  const receiveRemote = useCallback(
    (remote: ProtocolData) => {
      if (!currentId) return;
      setProtocols(prev => {
        if (!prev[currentId]) return prev;
        const current = prev[currentId];
        const rooms = current.rooms.map(prevRoom => {
          const remoteRoom = remote.rooms?.find(r => r.id === prevRoom.id);
          return remoteRoom ? { ...remoteRoom, photos: prevRoom.photos } : prevRoom;
        });
        const merged = { ...remote, rooms };
        const next = { ...prev, [currentId]: merged };
        saveAll(next);
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
    receiveRemote,
    manualSave,
    isSaving,
    lastSaved,
    wsSendRef,
  };
}
