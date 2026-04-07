import { useState, useCallback, useRef, useEffect } from "react";
import { ProtocolData, ProtocolSeeds, createDefaultProtocol, migrateProtocol } from "./types";
import i18n from "./i18n";
import { uploadPhotosToServer, fetchMissingPhotosFromServer, retryPendingPhotoUploads } from "./photoDb";

export interface TrashedEntry {
  protocol: ProtocolData;
  deletedAt: string;
}

// Strip photo dataUrls before sending to server — photos live in sync_photos, not in protocol JSON
function stripSingleProtocol(p: ProtocolData): ProtocolData {
  return {
    ...p,
    meterPhotos: (p.meterPhotos ?? []).map((ph) => ({ ...ph, dataUrl: "" })),
    kitchenPhotos: (p.kitchenPhotos ?? []).map((ph) => ({ ...ph, dataUrl: "" })),
    rooms: p.rooms.map((r) => ({
      ...r,
      photos: r.photos.map((ph) => ({ ...ph, dataUrl: "" })),
    })),
    personSignatures: (p.personSignatures ?? []).map((s) => ({
      ...s,
      signatureDataUrl: s.signatureDataUrl ?? null,
    })),
  };
}

// Collect photo IDs that need to be fetched from the server
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
    for (const sig of p.personSignatures ?? []) {
      if (sig.personId && !sig.signatureDataUrl) {
        ids.push(`sig_${sig.personId}`);
      }
    }
  }
  return [...new Set(ids)];
}

// Hydrate protocol map with fetched photo dataUrls
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
          signatureDataUrl: photoMap[`sig_${s.personId}`] ?? s.signatureDataUrl,
        })),
      },
    ])
  );
}

// ── One-time migration: upload any localStorage protocols to the cloud ─────────
// Protocols with syncEnabled:false were only in localStorage (not on server).
// On first load with the new cloud-only architecture we upload them so no data is lost.
const MIGRATED_KEY = "immo_cloud_migrated_v1";

async function migrateLocalStorageToCloud(accountId: string): Promise<void> {
  const migratedKey = `${MIGRATED_KEY}_${accountId}`;
  if (localStorage.getItem(migratedKey)) return; // already done

  const keys = [
    `immo_protocols_${accountId}`,
    "uebergabeprotokoll_protocols",
  ];

  const allProtocols: Record<string, ProtocolData> = {};
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw) as Record<string, Record<string, unknown>>;
      for (const [id, p] of Object.entries(data)) {
        if (!allProtocols[id]) {
          allProtocols[id] = migrateProtocol(p);
        }
      }
    } catch {}
  }

  if (Object.keys(allProtocols).length === 0) {
    localStorage.setItem(migratedKey, "1");
    return;
  }

  // Upload each protocol to the cloud (skip ones without propertyId)
  const uploads = Object.values(allProtocols).filter((p) => p.propertyId);
  for (const p of uploads) {
    try {
      await fetch("/api/protocols", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol: stripSingleProtocol(p) }),
      });
      // Ignore errors (409 conflict = already on server from WS sync, that's fine)
    } catch {}
  }

  // Mark as migrated and clear legacy localStorage
  localStorage.setItem(migratedKey, "1");
  for (const key of [`immo_protocols_${accountId}`, `immo_trash_${accountId}`, "uebergabeprotokoll_protocols", "uebergabeprotokoll_trash", "uebergabeprotokoll_data"]) {
    try { localStorage.removeItem(key); } catch {}
  }
}

export function useProtocolsStore(accountId: string | null) {
  const [protocols, setProtocols] = useState<Record<string, ProtocolData>>({});
  const [trashedProtocols, setTrashedProtocols] = useState<Record<string, TrashedEntry>>({});
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Keep a ref to latest protocols so debounced timers always save fresh data
  const latestProtocols = useRef<Record<string, ProtocolData>>({});
  latestProtocols.current = protocols;

  // Per-protocol debounced save timers
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Retry pending photo uploads when tab becomes visible (handles mobile backgrounding) ──
  useEffect(() => {
    if (!accountId) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        retryPendingPhotoUploads().catch(console.warn);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [accountId]);

  // ── Load from server on mount / accountId change ───────────────────────────
  useEffect(() => {
    if (!accountId) {
      setIsLoading(false);
      setProtocols({});
      setTrashedProtocols({});
      return;
    }

    setIsLoading(true);
    setCurrentId(null);

    // One-time migration: upload any locally-stored (unsynced) protocols to cloud
    migrateLocalStorageToCloud(accountId).catch(console.warn);

    // Retry any photos that failed to upload in a previous session
    retryPendingPhotoUploads().catch(console.warn);

    Promise.all([
      fetch("/api/protocols", { credentials: "include" }).then((r) => r.json() as Promise<{ protocols: Record<string, Record<string, unknown>> }>),
      fetch("/api/protocols/trash", { credentials: "include" }).then((r) => r.json() as Promise<{ trash: Record<string, { protocol: Record<string, unknown>; deletedAt: string }> }>),
    ])
      .then(([protData, trashData]) => {
        const prots: Record<string, ProtocolData> = {};
        for (const [id, p] of Object.entries(protData.protocols ?? {})) {
          prots[id] = migrateProtocol(p);
        }

        const trash: Record<string, TrashedEntry> = {};
        for (const [id, entry] of Object.entries(trashData.trash ?? {})) {
          trash[id] = {
            protocol: migrateProtocol(entry.protocol),
            deletedAt: entry.deletedAt,
          };
        }

        setProtocols(prots);
        setTrashedProtocols(trash);

        // Fetch photos for all loaded protocols
        const missingIds = collectMissingPhotoIds(prots);
        if (missingIds.length > 0) {
          fetchMissingPhotosFromServer(missingIds)
            .then((photoMap) => {
              if (Object.keys(photoMap).length > 0) {
                setProtocols((prev) => hydratePhotos(prev, photoMap));
              }
            })
            .catch(console.warn);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // ── Internal: save a single protocol to server (debounced 1.5s) ───────────
  const scheduleSave = useCallback((id: string) => {
    if (autoSaveTimers.current[id]) clearTimeout(autoSaveTimers.current[id]);
    autoSaveTimers.current[id] = setTimeout(() => {
      const p = latestProtocols.current[id];
      if (!p) return;
      fetch(`/api/protocols/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ protocol: stripSingleProtocol(p) }),
      })
        .then(() => setLastSaved(new Date()))
        .catch(console.warn);
    }, 1500);
  }, []);

  // ── Internal: save immediately (flush pending debounce) ────────────────────
  const flushSave = useCallback((id: string) => {
    if (autoSaveTimers.current[id]) {
      clearTimeout(autoSaveTimers.current[id]);
      delete autoSaveTimers.current[id];
    }
    const p = latestProtocols.current[id];
    if (!p) return;
    fetch(`/api/protocols/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protocol: stripSingleProtocol(p) }),
    })
      .then(() => setLastSaved(new Date()))
      .catch(console.warn);
  }, []);

  const currentProtocol = currentId ? (protocols[currentId] ?? null) : null;

  // ── createNew ──────────────────────────────────────────────────────────────
  const createNew = useCallback((propertyId: string | null = null, seeds?: ProtocolSeeds) => {
    const p = createDefaultProtocol(propertyId, seeds);
    // Optimistic UI: add to local state immediately
    setProtocols((prev) => ({ ...prev, [p.id]: p }));
    setCurrentId(p.id);
    // Save to server
    fetch("/api/protocols", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protocol: stripSingleProtocol(p) }),
    }).catch(console.warn);
    return p.id;
  }, []);

  // ── duplicateProtocol ──────────────────────────────────────────────────────
  const duplicateProtocol = useCallback((id: string) => {
    const source = latestProtocols.current[id];
    if (!source) return;
    const newId = crypto.randomUUID();
    const copy: ProtocolData = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      mietobjekt: source.mietobjekt
        ? source.mietobjekt + " " + i18n.t("common.copy")
        : i18n.t("protocols.unnamed"),
      lastSaved: new Date().toISOString(),
      personSignatures: [],
      rooms: source.rooms.map((r) => ({
        ...r,
        id: crypto.randomUUID(),
        photos: r.photos.map((ph) => ({ ...ph, id: crypto.randomUUID() })),
      })),
      meterPhotos: (source.meterPhotos ?? []).map((ph) => ({
        ...ph,
        id: crypto.randomUUID(),
      })),
      kitchenPhotos: (source.kitchenPhotos ?? []).map((ph) => ({
        ...ph,
        id: crypto.randomUUID(),
      })),
      uebergeber: source.uebergeber.map((p) => ({ ...p, id: crypto.randomUUID() })),
      uebernehmer: source.uebernehmer.map((p) => ({ ...p, id: crypto.randomUUID() })),
      zusatzvereinbarungen: (source.zusatzvereinbarungen ?? []).map((z) => ({
        ...z,
        id: crypto.randomUUID(),
      })),
    };
    setProtocols((prev) => ({ ...prev, [newId]: copy }));
    // Upload photos that were on the source (re-use same photo IDs since we gave them new IDs)
    // Actually the photos have new IDs so they start as stubs (empty dataUrls) — user must re-add
    // Save to server (stripped)
    fetch("/api/protocols", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ protocol: stripSingleProtocol(copy) }),
    }).catch(console.warn);
  }, []);

  // ── renameProtocol ─────────────────────────────────────────────────────────
  const renameProtocol = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setProtocols((prev) => {
      if (!prev[id]) return prev;
      const updated = { ...prev[id], mietobjekt: trimmed, lastSaved: new Date().toISOString() };
      setTimeout(() => scheduleSave(id), 0);
      return { ...prev, [id]: updated };
    });
  }, [scheduleSave]);

  // ── switchTo ───────────────────────────────────────────────────────────────
  const switchTo = useCallback((id: string) => {
    setCurrentId(id);
    // Fetch photos for this protocol if any are missing
    const p = latestProtocols.current[id];
    if (p) {
      const missingIds = collectMissingPhotoIds({ [id]: p });
      if (missingIds.length > 0) {
        fetchMissingPhotosFromServer(missingIds)
          .then((photoMap) => {
            if (Object.keys(photoMap).length > 0) {
              setProtocols((prev) => hydratePhotos(prev, photoMap));
            }
          })
          .catch(console.warn);
      }
    }
  }, []);

  // ── backToList ─────────────────────────────────────────────────────────────
  const backToList = useCallback(() => {
    if (currentId) flushSave(currentId);
    setCurrentId(null);
  }, [currentId, flushSave]);

  // ── deleteProtocol (soft delete → trash) ──────────────────────────────────
  const deleteProtocol = useCallback((id: string) => {
    const target = latestProtocols.current[id];
    if (!target) return;
    // Optimistic UI
    setTrashedProtocols((prev) => ({
      ...prev,
      [id]: { protocol: target, deletedAt: new Date().toISOString() },
    }));
    setProtocols((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setCurrentId((prev) => (prev === id ? null : prev));
    // Server
    fetch(`/api/protocols/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(console.warn);
  }, []);

  // ── restoreFromTrash ───────────────────────────────────────────────────────
  const restoreFromTrash = useCallback((id: string) => {
    const entry = trashedProtocols[id];
    if (!entry) return;
    const restored = { ...entry.protocol };
    setProtocols((prev) => ({ ...prev, [id]: restored }));
    setTrashedProtocols((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    // Server
    fetch(`/api/protocols/${id}/restore`, {
      method: "POST",
      credentials: "include",
    }).catch(console.warn);
    // Re-fetch photos
    const missingIds = collectMissingPhotoIds({ [id]: restored });
    if (missingIds.length > 0) {
      fetchMissingPhotosFromServer(missingIds)
        .then((photoMap) => {
          if (Object.keys(photoMap).length > 0) {
            setProtocols((prev) => hydratePhotos(prev, photoMap));
          }
        })
        .catch(console.warn);
    }
  }, [trashedProtocols]);

  // ── permanentlyDelete ──────────────────────────────────────────────────────
  const permanentlyDelete = useCallback((id: string) => {
    setTrashedProtocols((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    fetch(`/api/protocols/trash/${id}`, {
      method: "DELETE",
      credentials: "include",
    }).catch(console.warn);
  }, []);

  // ── emptyTrash ─────────────────────────────────────────────────────────────
  const emptyTrash = useCallback(() => {
    setTrashedProtocols({});
    fetch("/api/protocols/trash", {
      method: "DELETE",
      credentials: "include",
    }).catch(console.warn);
  }, []);

  // ── manualSave ─────────────────────────────────────────────────────────────
  const manualSave = useCallback(() => {
    if (!currentId) return;
    setIsSaving(true);
    flushSave(currentId);
    setLastSaved(new Date());
    setTimeout(() => setIsSaving(false), 800);
  }, [currentId, flushSave]);

  // ── updateProtocol (debounced save) ───────────────────────────────────────
  const updateProtocol = useCallback(
    (updater: (prev: ProtocolData) => ProtocolData) => {
      if (!currentId) return;
      const id = currentId;
      const prev = latestProtocols.current[id];
      if (!prev) return;

      const updated = updater(prev);

      // Collect only NEW photo IDs (not present in the previous state) to upload
      const prevPhotoIds = new Set<string>();
      for (const ph of prev.meterPhotos ?? []) prevPhotoIds.add(ph.id);
      for (const ph of prev.kitchenPhotos ?? []) prevPhotoIds.add(ph.id);
      for (const r of prev.rooms) for (const ph of r.photos) prevPhotoIds.add(ph.id);
      for (const sig of prev.personSignatures ?? []) if (sig.personId) prevPhotoIds.add(`sig_${sig.personId}`);

      const photoEntries: { id: string; dataUrl: string }[] = [];
      for (const ph of updated.meterPhotos ?? []) {
        if (ph.dataUrl && !prevPhotoIds.has(ph.id)) photoEntries.push({ id: ph.id, dataUrl: ph.dataUrl });
      }
      for (const ph of updated.kitchenPhotos ?? []) {
        if (ph.dataUrl && !prevPhotoIds.has(ph.id)) photoEntries.push({ id: ph.id, dataUrl: ph.dataUrl });
      }
      for (const r of updated.rooms) {
        for (const ph of r.photos) {
          if (ph.dataUrl && !prevPhotoIds.has(ph.id)) photoEntries.push({ id: ph.id, dataUrl: ph.dataUrl });
        }
      }
      for (const sig of updated.personSignatures ?? []) {
        const sigId = `sig_${sig.personId}`;
        if (sig.personId && sig.signatureDataUrl && !prevPhotoIds.has(sigId)) {
          photoEntries.push({ id: sigId, dataUrl: sig.signatureDataUrl });
        }
      }

      if (photoEntries.length > 0) {
        uploadPhotosToServer(photoEntries).catch(console.warn);
      }

      // Apply updater inside setProtocols to always work on the latest state
      // (guards against concurrent updates from WebSocket sync etc.)
      setProtocols((p) => {
        if (!p[id]) return p;
        return { ...p, [id]: updater(p[id]) };
      });
      setTimeout(() => scheduleSave(id), 0);
    },
    [currentId, scheduleSave]
  );

  // ── addRoom ────────────────────────────────────────────────────────────────
  const addRoom = useCallback((room: ProtocolData["rooms"][number]) => {
    if (!currentId) return;
    const id = currentId;
    setProtocols((prev) => {
      if (!prev[id]) return prev;
      const updated = { ...prev[id], rooms: [...prev[id].rooms, room] };
      setTimeout(() => scheduleSave(id), 0);
      return { ...prev, [id]: updated };
    });
  }, [currentId, scheduleSave]);

  // ── deleteRoom ─────────────────────────────────────────────────────────────
  const deleteRoom = useCallback((roomId: string) => {
    if (!currentId) return;
    const id = currentId;
    setProtocols((prev) => {
      if (!prev[id]) return prev;
      const updated = {
        ...prev[id],
        rooms: prev[id].rooms.filter((r) => r.id !== roomId),
        deletedRoomIds: [...new Set([...(prev[id].deletedRoomIds ?? []), roomId])],
      };
      setTimeout(() => scheduleSave(id), 0);
      return { ...prev, [id]: updated };
    });
  }, [currentId, scheduleSave]);

  // ── deleteProtocolsForProperty ─────────────────────────────────────────────
  const deleteProtocolsForProperty = useCallback((propertyId: string) => {
    setProtocols((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [id, p] of Object.entries(next)) {
        if (p.propertyId === propertyId) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setTrashedProtocols((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const [id, e] of Object.entries(next)) {
        if (e.protocol.propertyId === propertyId) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  return {
    protocols,
    trashedProtocols,
    currentProtocol,
    currentId,
    isLoading,
    isEditing: currentId !== null,
    createNew,
    duplicateProtocol,
    switchTo,
    backToList,
    deleteProtocol,
    deleteProtocolsForProperty,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    renameProtocol,
    updateProtocol,
    addRoom,
    deleteRoom,
    manualSave,
    isSaving,
    lastSaved,
  };
}
