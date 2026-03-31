const DB_NAME = "uebergabe_photos";
const STORE_NAME = "photos";
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = (e.target as IDBOpenDBRequest).result;
      if (!d.objectStoreNames.contains(STORE_NAME)) {
        d.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function savePhotosToDb(
  entries: { id: string; dataUrl: string }[]
): Promise<void> {
  if (entries.length === 0) return;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    for (const entry of entries) {
      if (entry.dataUrl) store.put(entry);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadAllPhotosFromDb(): Promise<Record<string, string>> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const map: Record<string, string> = {};
        for (const item of req.result as { id: string; dataUrl: string }[]) {
          if (item.dataUrl) map[item.id] = item.dataUrl;
        }
        resolve(map);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB not available, falling back to empty photo map", err);
    return {};
  }
}

export async function deletePhotosFromDb(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      for (const id of ids) store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to delete photos from IndexedDB", err);
  }
}

// ─── Server-Sync (cross-device) ───────────────────────────────────────────────

function getApiBase(): string {
  // Use a root-relative path so the request goes through the same Vite / Replit
  // proxy as all other API calls in the app.  An absolute URL would bypass the
  // dev-server proxy and could hit the wrong host in proxied environments.
  return "/api";
}

const UPLOAD_BATCH = 3; // photos per HTTP request

export async function uploadPhotosToServer(
  entries: { id: string; dataUrl: string }[]
): Promise<void> {
  const valid = entries.filter((e) => e.id && e.dataUrl);
  if (valid.length === 0) return;
  for (let i = 0; i < valid.length; i += UPLOAD_BATCH) {
    const batch = valid.slice(i, i + UPLOAD_BATCH);
    try {
      await fetch(`${getApiBase()}/photos`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: batch }),
      });
    } catch (e) {
      console.warn("Photo server upload failed (offline?)", e);
    }
  }
}

export async function fetchMissingPhotosFromServer(
  ids: string[]
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};
  try {
    const url = `${getApiBase()}/photos?ids=${ids.join(",")}`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return {};
    const data = await res.json() as { photos?: Record<string, string> };
    return data.photos ?? {};
  } catch {
    return {};
  }
}

export function collectPhotoEntries(
  protocols: Record<string, import("./types").ProtocolData>
): { id: string; dataUrl: string }[] {
  const entries: { id: string; dataUrl: string }[] = [];
  for (const p of Object.values(protocols)) {
    for (const ph of p.meterPhotos ?? []) {
      if (ph.dataUrl) entries.push({ id: ph.id, dataUrl: ph.dataUrl });
    }
    for (const ph of p.kitchenPhotos ?? []) {
      if (ph.id && ph.dataUrl) entries.push({ id: ph.id, dataUrl: ph.dataUrl });
    }
    for (const r of p.rooms) {
      for (const ph of r.photos) {
        if (ph.id && ph.dataUrl) entries.push({ id: ph.id, dataUrl: ph.dataUrl });
      }
    }
    for (const ps of p.personSignatures ?? []) {
      if (ps.personId && ps.signatureDataUrl)
        entries.push({ id: `sig_${ps.personId}`, dataUrl: ps.signatureDataUrl });
    }
  }
  return entries;
}
