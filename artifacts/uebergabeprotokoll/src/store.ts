import { useState, useCallback, useRef } from "react";
import { ProtocolData, createDefaultProtocol, migrateProtocol } from "./types";

const STORAGE_KEY = "uebergabeprotokoll_data";

function loadFromStorage(): ProtocolData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return migrateProtocol(parsed);
    }
  } catch (e) {
    console.warn("Failed to load saved data", e);
  }
  return createDefaultProtocol();
}

export function useProtocolStore() {
  const [protocol, setProtocol] = useState<ProtocolData>(loadFromStorage);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lastSaved) return new Date(parsed.lastSaved);
      }
    } catch {}
    return null;
  });
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsSendRef = useRef<((data: ProtocolData) => void) | null>(null);

  const save = useCallback((data: ProtocolData) => {
    const withTimestamp = { ...data, lastSaved: new Date().toISOString() };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));
      setLastSaved(new Date());
      return true;
    } catch (e) {
      console.error("Save failed", e);
      return false;
    }
  }, []);

  const manualSave = useCallback(() => {
    setIsSaving(true);
    save(protocol);
    setTimeout(() => setIsSaving(false), 800);
  }, [protocol, save]);

  const updateProtocol = useCallback((updater: (prev: ProtocolData) => ProtocolData) => {
    setProtocol(prev => {
      const next = updater(prev);
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        save(next);
        wsSendRef.current?.(next);
      }, 1500);
      return next;
    });
  }, [save]);

  const receiveRemote = useCallback((remote: ProtocolData) => {
    setProtocol(prev => {
      const rooms = prev.rooms.map(prevRoom => {
        const remoteRoom = remote.rooms?.find(r => r.id === prevRoom.id);
        return remoteRoom ? { ...remoteRoom, photos: prevRoom.photos } : prevRoom;
      });
      const merged = { ...remote, rooms };
      save(merged);
      return merged;
    });
  }, [save]);

  return { protocol, updateProtocol, receiveRemote, manualSave, isSaving, lastSaved, wsSendRef };
}
