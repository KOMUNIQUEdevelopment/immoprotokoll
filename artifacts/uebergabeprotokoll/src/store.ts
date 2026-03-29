import { useState, useCallback, useRef, useEffect } from "react";
import { ProtocolData, RoomPhoto, createDefaultProtocol, migrateProtocol } from "./types";
import { SyncMessage } from "./hooks/useSync";
import {
  savePhotosToDb,
  loadAllPhotosFromDb,
  deletePhotosFromDb,
  collectPhotoEntries,
  uploadPhotosToServer,
  fetchMissingPhotosFromServer,
} from "./photoDb";

const PROTOCOLS_KEY = "uebergabeprotokoll_protocols";
const LEGACY_KEY = "uebergabeprotokoll_data";
const TRASH_KEY = "uebergabeprotokoll_trash";

export interface TrashedEntry {
  protocol: ProtocolData;
  deletedAt: string; // ISO timestamp
}

// Strip photo dataUrls from a single protocol (used for WS sync)
function stripSingleProtocol(p: ProtocolData): ProtocolData {
  return {
    ...p,
    meterPhotos: (p.meterPhotos ?? []).map((ph) => ({ ...ph, dataUrl: "" })),
    kitchenPhotos: (p.kitchenPhotos ?? []).map((ph) => ({ ...ph, dataUrl: "" })),
    rooms: p.rooms.map((r) => ({
      ...r,
      photos: r.photos.map((ph) => ({ ...ph, dataUrl: "" })),
    })),
    // Use null (not "") so the receiving side can distinguish "stripped but
    // actually signed" from "genuinely unsigned".  The actual dataUrl lives
    // in IndexedDB / the server photo store.
    personSignatures: (p.personSignatures ?? []).map((s) => ({
      ...s,
      signatureDataUrl: null,
    })),
  };
}

// Merge two personSignature arrays: prefer non-null values over null ones.
// "local" wins when remote is stripped/null; remote wins when it has the
// actual signature (e.g. from the sign endpoint broadcast).
function mergeSignatures(
  local: ProtocolData["personSignatures"],
  remote: ProtocolData["personSignatures"]
): ProtocolData["personSignatures"] {
  const result = (remote ?? []).map((rs) => {
    if (rs.signatureDataUrl) return rs; // remote has the real sig → use it
    const ls = (local ?? []).find((s) => s.personId === rs.personId);
    return ls?.signatureDataUrl ? { ...rs, signatureDataUrl: ls.signatureDataUrl } : rs;
  });
  // Carry over any local sigs for persons not listed in remote
  for (const ls of local ?? []) {
    if (ls.signatureDataUrl && !result.some((s) => s.personId === ls.personId)) {
      result.push(ls);
    }
  }
  return result;
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

function loadLocalTrash(): Record<string, TrashedEntry> {
  try {
    const saved = localStorage.getItem(TRASH_KEY);
    if (saved) return JSON.parse(saved) as Record<string, TrashedEntry>;
  } catch (e) {
    console.warn("Failed to load trash from localStorage", e);
  }
  return {};
}

function persistTrash(trash: Record<string, TrashedEntry>): void {
  try {
    localStorage.setItem(TRASH_KEY, JSON.stringify(trash));
  } catch (e) {
    console.error("localStorage trash save failed", e);
  }
}

function persistAll(protocols: Record<string, ProtocolData>): boolean {
  // 1a. Save photo blobs + signatures to IndexedDB (fire-and-forget, large data)
  const photoEntries = collectPhotoEntries(protocols);
  if (photoEntries.length > 0) {
    savePhotosToDb(photoEntries).catch((e) =>
      console.error("IndexedDB photo save failed", e)
    );
    // Also upload to server so other devices can fetch them
    uploadPhotosToServer(photoEntries).catch((e) =>
      console.warn("Server photo upload failed", e)
    );
  }

  // 1b. Delete stale signatures from IndexedDB for persons whose signature is
  //     currently null (explicitly cleared, or never signed).  Without this,
  //     a cleared signature would be restored from IndexedDB on the next load.
  const nullSigIds: string[] = [];
  for (const p of Object.values(protocols)) {
    for (const s of p.personSignatures ?? []) {
      if (s.personId && !s.signatureDataUrl) {
        nullSigIds.push(`sig_${s.personId}`);
      }
    }
  }
  if (nullSigIds.length > 0) {
    deletePhotosFromDb(nullSigIds).catch(() => {});
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

// Collect photo IDs that have no dataUrl (need to be fetched from somewhere).
// Also includes signature IDs (sig_<personId>) so that signatures uploaded by
// other devices via /api/photos are fetched and applied on this device too.
function collectMissingPhotoIds(protocols: Record<string, ProtocolData>): string[] {
  const ids: string[] = [];
  for (const p of Object.values(protocols)) {
    for (const ph of p.meterPhotos ?? []) {
      if (!ph.dataUrl) ids.push(ph.id);
    }
    for (const ph of p.kitchenPhotos ?? []) {
      if (!ph.dataUrl) ids.push(ph.id);
    }
    for (const r of p.rooms) {
      for (const ph of r.photos) {
        if (!ph.dataUrl) ids.push(ph.id);
      }
    }
    // Signatures are uploaded to the server photo store by every device that
    // holds them (via persistAll → uploadPhotosToServer).  Collect any that
    // are currently null so they get fetched from the server.
    for (const sig of p.personSignatures ?? []) {
      if (sig.personId && !sig.signatureDataUrl) {
        ids.push(`sig_${sig.personId}`);
      }
    }
  }
  return ids;
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
        meterPhotos: (p.meterPhotos ?? []).map((ph) => ({
          ...ph,
          dataUrl: photoMap[ph.id] ?? ph.dataUrl,
        })),
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
  const [trashedProtocols, setTrashedProtocols] = useState<Record<string, TrashedEntry>>(loadLocalTrash);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsSendRef = useRef<((msg: SyncMessage) => void) | null>(null);

  const currentProtocol = currentId ? (protocols[currentId] ?? null) : null;

  // Fetch photos that are missing locally from the server and apply them to state.
  // Called both on mount (after IndexedDB hydration) and after every WS sync event.
  const fetchAndApplyServerPhotos = useCallback(async (missingIds: string[]) => {
    if (missingIds.length === 0) return;
    try {
      const serverMap = await fetchMissingPhotosFromServer(missingIds);
      if (Object.keys(serverMap).length === 0) return;
      // Cache fetched photos in local IndexedDB for offline use
      savePhotosToDb(
        Object.entries(serverMap).map(([id, dataUrl]) => ({ id, dataUrl }))
      ).catch(console.warn);
      setProtocols((prev) => hydratePhotos(prev, serverMap));
    } catch (e) {
      console.warn("Server photo fetch failed", e);
    }
  }, []);

  // On mount: load photos from local IndexedDB and hydrate state.
  useEffect(() => {
    loadAllPhotosFromDb().then(async (photoMap) => {
      let missingIds: string[] = [];
      setProtocols((prev) => {
        const hydrated = hydratePhotos(prev, photoMap);
        // Migrate legacy embedded photos to IndexedDB if still present
        const hasEmbedded = Object.values(prev).some(
          (p) =>
            (p.kitchenPhotos ?? []).some((ph) => ph.dataUrl) ||
            p.rooms.some((r) => r.photos.some((ph) => ph.dataUrl)) ||
            (p.personSignatures ?? []).some((s) => s.signatureDataUrl)
        );
        if (hasEmbedded) persistAll(prev);
        // After IndexedDB hydration, still-missing IDs must come from server
        missingIds = collectMissingPhotoIds(hydrated);
        return hydrated;
      });
      // Fetch from server after state update (WS init may not have fired yet;
      // receiveInit will also call this when it does fire)
      await fetchAndApplyServerPhotos(missingIds);
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
    let missingIds: string[] = [];
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
          // New protocol on this device — use remote stubs (photo IDs, no dataUrls)
          merged[id] = remoteP;
        } else {
          // Prefer local photos (already hydrated from IndexedDB);
          // fall back to remote stubs so the IDs are preserved for server fetch
          const rooms = remoteP.rooms.map(remoteRoom => {
            const prevRoom = localP.rooms.find(r => r.id === remoteRoom.id);
            // Use local photos if they have data; otherwise keep remote stubs (IDs intact)
            const photos = (prevRoom?.photos ?? []).map(localPh => {
              if (localPh.dataUrl) return localPh;
              const remotePh = (remoteRoom.photos ?? []).find(rp => rp.id === localPh.id);
              return remotePh ?? localPh;
            });
            // If remote room has new photos not yet in local, add their stubs too
            const localIds = new Set((prevRoom?.photos ?? []).map(p => p.id));
            const newRemote = (remoteRoom.photos ?? []).filter(rp => !localIds.has(rp.id));
            return { ...remoteRoom, photos: [...photos, ...newRemote] };
          });
          const mergeFlatPhotos = (local: typeof localP.kitchenPhotos, remote: typeof remoteP.kitchenPhotos) => {
            const loc = local ?? [];
            const rem = remote ?? [];
            const merged2 = loc.map(localPh => {
              if (localPh.dataUrl) return localPh;
              return rem.find(rp => rp.id === localPh.id) ?? localPh;
            });
            const localIds = new Set(loc.map(p => p.id));
            return [...merged2, ...rem.filter(rp => !localIds.has(rp.id))];
          };
          const meterPhotos = mergeFlatPhotos(localP.meterPhotos, remoteP.meterPhotos);
          const kitchenPhotos = mergeFlatPhotos(localP.kitchenPhotos, remoteP.kitchenPhotos);
          // Merge signatures: preserve local non-null values that the remote
          // doesn't have (remote signatures are always stripped to null on WS).
          const personSignatures = mergeSignatures(localP.personSignatures, remoteP.personSignatures);
          merged[id] = { ...remoteP, rooms, meterPhotos, kitchenPhotos, personSignatures, syncEnabled: true };
        }
      });

      // Collect IDs still missing dataUrls → need to fetch from server
      missingIds = collectMissingPhotoIds(merged);
      persistAll(merged);
      return merged;
    });
    // Trigger server fetch AFTER state update (outside the updater to avoid side-effect issues)
    if (missingIds.length > 0) {
      setTimeout(() => fetchAndApplyServerPhotos(missingIds), 0);
    }
  }, [fetchAndApplyServerPhotos]);

  const receiveRemote = useCallback((remote: ProtocolData) => {
    let missingIds: string[] = [];
    setProtocols(prev => {
      const existing = prev[remote.id];
      // Prefer local photos (with dataUrls); keep remote stubs for IDs not yet local
      const rooms = remote.rooms.map(remoteRoom => {
        const prevRoom = existing?.rooms.find(r => r.id === remoteRoom.id);
        const photos = (prevRoom?.photos ?? []).map(localPh => {
          if (localPh.dataUrl) return localPh;
          return (remoteRoom.photos ?? []).find(rp => rp.id === localPh.id) ?? localPh;
        });
        const localIds = new Set((prevRoom?.photos ?? []).map(p => p.id));
        const newRemote = (remoteRoom.photos ?? []).filter(rp => !localIds.has(rp.id));
        return { ...remoteRoom, photos: [...photos, ...newRemote] };
      });
      const mergeFlatPhotos2 = (local: RoomPhoto[], remoteArr: RoomPhoto[]) => {
        const merged2 = local.map(localPh => {
          if (localPh.dataUrl) return localPh;
          return remoteArr.find(rp => rp.id === localPh.id) ?? localPh;
        });
        const localIds = new Set(local.map(p => p.id));
        return [...merged2, ...remoteArr.filter(rp => !localIds.has(rp.id))];
      };
      const meterPhotos = mergeFlatPhotos2(existing?.meterPhotos ?? [], remote.meterPhotos ?? []);
      const kitchenPhotos = mergeFlatPhotos2(existing?.kitchenPhotos ?? [], remote.kitchenPhotos ?? []);
      // Merge signatures: prefer local non-null over remote null/stripped
      const personSignatures = mergeSignatures(existing?.personSignatures, remote.personSignatures);
      const merged = { ...remote, rooms, meterPhotos, kitchenPhotos, personSignatures, syncEnabled: true };
      const next = { ...prev, [remote.id]: merged };
      missingIds = collectMissingPhotoIds({ [remote.id]: merged });
      persistAll(next);
      return next;
    });
    if (missingIds.length > 0) {
      setTimeout(() => fetchAndApplyServerPhotos(missingIds), 0);
    }
  }, [fetchAndApplyServerPhotos]);

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
        meterPhotos: (source.meterPhotos ?? []).map(ph => ({
          ...ph,
          id: crypto.randomUUID(),
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
    // Move to trash instead of permanent deletion.
    // Photos in IndexedDB are preserved so the protocol can be restored.
    setProtocols(prev => {
      const target = prev[id];
      if (!target) return prev;
      const wasSync = target.syncEnabled;
      // Add to trash
      setTrashedProtocols(t => {
        const next = { ...t, [id]: { protocol: target, deletedAt: new Date().toISOString() } };
        persistTrash(next);
        return next;
      });
      const next = { ...prev };
      delete next[id];
      persistAll(next);
      if (wasSync) {
        // Remove from server so other devices don't see it anymore
        setTimeout(() => wsSendRef.current?.({ type: "delete", id }), 0);
      }
      return next;
    });
    setCurrentId(prev => (prev === id ? null : prev));
  }, []);

  const restoreFromTrash = useCallback((id: string) => {
    setTrashedProtocols(prev => {
      const entry = prev[id];
      if (!entry) return prev;
      // Put the protocol back into active list (sync disabled to avoid surprises)
      const restored = { ...entry.protocol, syncEnabled: false };
      setProtocols(p => {
        const next = { ...p, [id]: restored };
        persistAll(next);
        return next;
      });
      const next = { ...prev };
      delete next[id];
      persistTrash(next);
      return next;
    });
  }, []);

  const permanentlyDelete = useCallback((id: string) => {
    setTrashedProtocols(prev => {
      const entry = prev[id];
      if (entry) {
        // Clean up photos from IndexedDB
        const photoIds: string[] = [
          ...(entry.protocol.meterPhotos ?? []).map((ph) => ph.id),
          ...(entry.protocol.kitchenPhotos ?? []).map((ph) => ph.id),
          ...entry.protocol.rooms.flatMap((r) => r.photos.map((ph) => ph.id)),
          ...(entry.protocol.personSignatures ?? []).map((s) => `sig_${s.personId}`),
        ];
        if (photoIds.length > 0) {
          deletePhotosFromDb(photoIds).catch((e) =>
            console.warn("Failed to delete photos from IndexedDB", e)
          );
        }
      }
      const next = { ...prev };
      delete next[id];
      persistTrash(next);
      return next;
    });
  }, []);

  const emptyTrash = useCallback(() => {
    setTrashedProtocols(prev => {
      // Clean up all photos from IndexedDB
      const allPhotoIds: string[] = [];
      for (const entry of Object.values(prev)) {
        allPhotoIds.push(
          ...(entry.protocol.meterPhotos ?? []).map((ph) => ph.id),
          ...(entry.protocol.kitchenPhotos ?? []).map((ph) => ph.id),
          ...entry.protocol.rooms.flatMap((r) => r.photos.map((ph) => ph.id)),
          ...(entry.protocol.personSignatures ?? []).map((s) => `sig_${s.personId}`)
        );
      }
      if (allPhotoIds.length > 0) {
        deletePhotosFromDb(allPhotoIds).catch((e) =>
          console.warn("Failed to delete photos from IndexedDB", e)
        );
      }
      persistTrash({});
      return {};
    });
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
    trashedProtocols,
    currentProtocol,
    currentId,
    isEditing: currentId !== null,
    createNew,
    duplicateProtocol,
    switchTo,
    backToList,
    deleteProtocol,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
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
