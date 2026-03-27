import { useState, useEffect, useCallback, useRef } from "react";
import { ProtocolData, createDefaultProtocol } from "./types";

const STORAGE_KEY = "uebergabeprotokoll_data";

export function useProtocolStore() {
  const [protocol, setProtocol] = useState<ProtocolData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load saved data", e);
    }
    return createDefaultProtocol();
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      autoSaveTimer.current = setTimeout(() => save(next), 1500);
      return next;
    });
  }, [save]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.lastSaved) {
          setLastSaved(new Date(parsed.lastSaved));
        }
      } catch {}
    }
  }, []);

  return { protocol, updateProtocol, manualSave, isSaving, lastSaved };
}
