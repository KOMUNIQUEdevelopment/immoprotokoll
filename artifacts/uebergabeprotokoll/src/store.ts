import { useState, useCallback, useRef, useEffect } from "react";
import { ProtocolData, createDefaultProtocol, migrateProtocol } from "./types";
import { SyncMessage } from "./hooks/useSync";
import {
  savePhotosToDb,
  loadAllPhotosFromDb,
  deletePhotosFromDb,
  collectPhotoEntries,
} from "./photoDb";

const PROTOCOLS_KEY = "uebergabeprotokoll_protocols";
const LEGACY_KEY = "uebergabeprotokoll_data";

// Strip photo dataUrls from a single protocol (used for WS sync)
function stripSingleProtocol(p: ProtocolData): ProtocolData {
  return {
    ...p,
    kitchenPhotos: (p.kitchenPhotos ?? []).map((ph) => ({ ...ph, dataUrl: "" })),
    rooms: p.rooms.map((r) => ({
      ...r,
      photos: r.photos.map((ph) => ({ ...ph, dataUrl: "" })),
    })),
    personSignatures: (p.personSignatures ?? []).map((s) => ({
      ...s,
      signatureDataUrl: "",
    })),
  };
}

// Strip photo dataUrls so localStorage only holds tiny metadata
function stripPhotoDataUrls(
  protocols: Record<string, ProtocolData>
): Record<string, ProtocolData> {
  return Object.fromEntries(
    Object.entries(protocols).map(([id, p]) => [id, stripSingleProtocol(p)])
  );
}

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
  // 1. Save photo blobs to IndexedDB (fire-and-forget, large data)
  const photoEntries = collectPhotoEntries(protocols);
  if (photoEntries.length > 0) {
    savePhotosToDb(photoEntries).catch((e) =>
      console.error("IndexedDB photo save failed", e)
    );
  }

  // 2. Save stripped metadata to localStorage (small, sync)
  try {
    localStorage.setItem(PROTOCOLS_KEY, JSON.stringify(stripPhotoDataUrls(protocols)));
    return true;
  } catch (e) {
    console.error("localStorage save failed (quota exceeded?)", e);
    return false;
  }
}

// Re-hydrate stripped protocols with photo dataUrls from IndexedDB
function hydratePhotos(
  protocols: Record<string, ProtocolData>,
  photoMap: Record<string, string>
): Record<string, ProtocolData> {
  if (Object.keys(photoMap).length === 0) return protocols;
  return Object.fromEntries(
    Object.entries(protocols).map(([id, p]) => [
      id,
      {
        ...p,
        kitchenPhotos: (p.kitchenPhotos ?? []).map((ph) => ({
          ...ph,
          dataUrl: photoMap[ph.id] ?? ph.dataUrl,
        })),
        rooms: p.rooms.map((r) => ({
          ...r,
          photos: r.photos.map((ph) => ({
            ...ph,
            dataUrl: photoMap[ph.id] ?? ph.dataUrl,
          })),
        })),
        personSignatures: (p.personSignatures ?? []).map((s) => ({
          ...s,
          signatureDataUrl:
            photoMap[`sig_${s.personId}`] ?? s.signatureDataUrl,
        })),
      },
    ])
  );
}

export function useProtocolsStore() {
  const [protocols, setProtocols] = useState<Record<string, ProtocolData>>(loadLocalProtocols);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsSendRef = useRef<((msg: SyncMessage) => void) | null>(null);

  const currentProtocol = currentId ? (protocols[currentId] ?? null) : null;

  // On mount: load photos from IndexedDB and hydrate the protocols.
  // This also handles migration: if existing localStorage data still has
  // photos (dataUrl non-empty), they get persisted to IndexedDB on the
  // next save so localStorage shrinks below quota limits.
  useEffect(() => {
    loadAllPhotosFromDb().then((photoMap) => {
      setProtocols((prev) => {
        const hydrated = hydratePhotos(prev, photoMap);
        // If existing localStorage data had embedded photos (pre-migration),
        // immediately persist them to IndexedDB and strip from localStorage.
        const hasEmbedded = Object.values(prev).some(
          (p) =>
            (p.kitchenPhotos ?? []).some((ph) => ph.dataUrl) ||
            p.rooms.some((r) => r.photos.some((ph) => ph.dataUrl)) ||
            (p.personSignatures ?? []).some((s) => s.signatureDataUrl)
        );
        if (hasEmbedded) {
          // Fire-and-forget: migrate embedded photos to IndexedDB
          persistAll(prev);
        }
        return hydrated;
      });
    }).catch((err) => {
      console.warn("Photo hydration from IndexedDB failed:", err);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveAll = useCallback((all: Record<string, ProtocolData>) => {
    const ok = persistAll(all);
    if (ok) setLastSaved(new Date());
    return ok;
  }, []);

  const receiveInit = useCallback((remoteProtocols: Record<string, ProtocolData>) => {
    setProtocols(prev => {
      const synced = Object.fromEntries(
        Object.entries(remoteProtocols).map(([id, p]) => [
          id,
          { ...migrateProtocol(p as Record<string, unknown>), syncEnabled: true },
        ])
      );

      if (Object.keys(synced).length === 0) {
        const localSynced = Object.values(prev).filter(p => p.syncEnabled);
        if (localSynced.length > 0) {
          setTimeout(() => {
            // Always strip photos before sending over WS
            localSynced.forEach(p => {
              wsSendRef.current?.({ type: "update", protocol: stripSingleProtocol(p) });
            });
          }, 200);
        }
        return prev;
      }

      const merged: Record<string, ProtocolData> = { ...prev };

      Object.entries(synced).forEach(([id, remoteP]) => {
        const localP = prev[id];
        if (!localP) {
          merged[id] = remoteP;
        } else {
          // Photos are local-only (IndexedDB) — always keep local copy
          const rooms = remoteP.rooms.map(remoteRoom => {
            const prevRoom = localP.rooms.find(r => r.id === remoteRoom.id);
            const photos = prevRoom?.photos?.length ? prevRoom.photos : (remoteRoom.photos ?? []);
            return { ...remoteRoom, photos };
          });
          const kitchenPhotos = localP.kitchenPhotos?.length
            ? localP.kitchenPhotos
            : (remoteP.kitchenPhotos ?? []);
          merged[id] = { ...remoteP, rooms, kitchenPhotos, syncEnabled: true };
        }
      });

      persistAll(merged);
      return merged;
    });
  }, []);

  const receiveRemote = useCallback((remote: ProtocolData) => {
    setProtocols(prev => {
      const existing = prev[remote.id];
      // Photos are local-only — always keep local copy, never trust remote
      const rooms = remote.rooms.map(remoteRoom => {
        const prevRoom = existing?.rooms.find(r => r.id === remoteRoom.id);
        const photos = prevRoom?.photos?.length ? prevRoom.photos : (remoteRoom.photos ?? []);
        return { ...remoteRoom, photos };
      });
      const kitchenPhotos = existing?.kitchenPhotos?.length
        ? existing.kitchenPhotos
        : (remote.kitchenPhotos ?? []);
      const merged = { ...remote, rooms, kitchenPhotos, syncEnabled: true };
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

  const toggleSync = useCallback((id: string) => {
    setProtocols(prev => {
      if (!prev[id]) return prev;
      const current = prev[id];
      const enabling = !current.syncEnabled;
      const updated = { ...current, syncEnabled: enabling };
      const next = { ...prev, [id]: updated };
      persistAll(next);
      if (enabling) {
        setTimeout(() => wsSendRef.current?.({ type: "update", protocol: stripSingleProtocol(updated) }), 0);
      } else {
        setTimeout(() => wsSendRef.current?.({ type: "delete", id }), 0);
      }
      return next;
    });
  }, []);

  const renameProtocol = useCallback((id: string, name: string) => {
    setProtocols(prev => {
      if (!prev[id]) return prev;
      const trimmed = name.trim();
      if (!trimmed) return prev;
      const updated = { ...prev[id], mietobjekt: trimmed, lastSaved: new Date().toISOString() };
      const next = { ...prev, [id]: updated };
      persistAll(next);
      if (updated.syncEnabled) {
        wsSendRef.current?.({ type: "update", protocol: stripSingleProtocol(updated) });
      }
      return next;
    });
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

  const duplicateProtocol = useCallback((id: string) => {
    setProtocols(prev => {
      const source = prev[id];
      if (!source) return prev;
      const newId = crypto.randomUUID();
      const copy: ProtocolData = {
        ...JSON.parse(JSON.stringify(source)),
        id: newId,
        mietobjekt: (source.mietobjekt ? source.mietobjekt + " (Kopie)" : "Kopie"),
        syncEnabled: false,
        lastSaved: new Date().toISOString(),
        personSignatures: [],
        rooms: source.rooms.map(r => ({
          ...r,
          id: crypto.randomUUID(),
          photos: r.photos.map(ph => ({ ...ph, id: crypto.randomUUID() })),
        })),
        kitchenPhotos: (source.kitchenPhotos ?? []).map(ph => ({
          ...ph,
          id: crypto.randomUUID(),
        })),
        uebergeber: source.uebergeber.map(p => ({ ...p, id: crypto.randomUUID() })),
        uebernehmer: source.uebernehmer.map(p => ({ ...p, id: crypto.randomUUID() })),
        zusatzvereinbarungen: (source.zusatzvereinbarungen ?? []).map(z => ({
          ...z,
          id: crypto.randomUUID(),
        })),
      };
      const next = { ...prev, [newId]: copy };
      persistAll(next);
      return next;
    });
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
      const target = prev[id];
      const wasSync = target?.syncEnabled;
      const next = { ...prev };
      delete next[id];
      persistAll(next);
      if (wasSync) {
        setTimeout(() => wsSendRef.current?.({ type: "delete", id }), 0);
      }
      // Clean up this protocol's photos from IndexedDB
      if (target) {
        const photoIds: string[] = [
          ...(target.kitchenPhotos ?? []).map((ph) => ph.id),
          ...target.rooms.flatMap((r) => r.photos.map((ph) => ph.id)),
          ...(target.personSignatures ?? []).map((s) => `sig_${s.personId}`),
        ];
        if (photoIds.length > 0) {
          deletePhotosFromDb(photoIds).catch((e) =>
            console.warn("Failed to delete photos from IndexedDB", e)
          );
        }
      }
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
      if (updated.syncEnabled) {
        wsSendRef.current?.({ type: "update", protocol: stripSingleProtocol(updated) });
      }
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
          if (updated.syncEnabled) {
            wsSendRef.current?.({ type: "update", protocol: stripSingleProtocol(updated) });
          }
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
    duplicateProtocol,
    switchTo,
    backToList,
    deleteProtocol,
    renameProtocol,
    updateProtocol,
    toggleSync,
    receiveInit,
    receiveRemote,
    receiveDelete,
    manualSave,
    isSaving,
    lastSaved,
    wsSendRef,
  };
}
