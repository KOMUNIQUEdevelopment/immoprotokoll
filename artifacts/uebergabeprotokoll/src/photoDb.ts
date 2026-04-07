/**
 * photoDb.ts — Reliable photo storage with localStorage backup and server sync.
 *
 * Strategy:
 * 1. When a photo is added, save it to localStorage immediately as a "pending" backup.
 * 2. Upload to server. On success, mark as "uploaded" in localStorage (keep the data as cache).
 * 3. When loading photos, check localStorage cache first, then fall back to server fetch.
 * 4. On startup, retry any photos that never made it to the server.
 */

const UPLOAD_BATCH = 2;
const PENDING_PREFIX = "immo_photo_";
const API_BASE = "/api";

// ── localStorage helpers ──────────────────────────────────────────────────────

interface CachedPhoto {
  dataUrl: string;
  uploaded: boolean; // true = confirmed on server, false = pending
}

function getPhotoFromCache(id: string): CachedPhoto | null {
  try {
    const raw = localStorage.getItem(`${PENDING_PREFIX}${id}`);
    if (!raw) return null;
    return JSON.parse(raw) as CachedPhoto;
  } catch {
    return null;
  }
}

function savePhotoToCache(id: string, dataUrl: string, uploaded: boolean): void {
  try {
    const item: CachedPhoto = { dataUrl, uploaded };
    localStorage.setItem(`${PENDING_PREFIX}${id}`, JSON.stringify(item));
  } catch {
    // localStorage quota exceeded — skip caching, upload only
  }
}

function markPhotoUploaded(id: string): void {
  try {
    const existing = getPhotoFromCache(id);
    if (existing) {
      localStorage.setItem(
        `${PENDING_PREFIX}${id}`,
        JSON.stringify({ ...existing, uploaded: true })
      );
    }
  } catch {
    // ignore
  }
}

function getPendingPhotoIds(): string[] {
  const ids: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PENDING_PREFIX)) {
        const id = key.slice(PENDING_PREFIX.length);
        const cached = getPhotoFromCache(id);
        if (cached && !cached.uploaded) {
          ids.push(id);
        }
      }
    }
  } catch {
    // ignore
  }
  return ids;
}

// ── Upload helpers ────────────────────────────────────────────────────────────

async function uploadBatch(entries: { id: string; dataUrl: string }[]): Promise<string[]> {
  const uploaded: string[] = [];
  try {
    const res = await fetch(`${API_BASE}/photos`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photos: entries }),
    });
    if (!res.ok) {
      console.warn(`[photoDb] upload batch failed: HTTP ${res.status}`);
      return uploaded;
    }
    const data = (await res.json()) as { ok?: boolean; stored?: number };
    if (data.ok) {
      for (const e of entries) {
        uploaded.push(e.id);
      }
    }
  } catch (e) {
    console.warn("[photoDb] upload batch error (offline?):", e);
  }
  return uploaded;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save new photos to localStorage immediately, then upload to server.
 * Photos are safe even if the upload fails — they'll be retried on next start.
 */
export async function saveAndUploadPhotos(
  entries: { id: string; dataUrl: string }[]
): Promise<void> {
  const valid = entries.filter((e) => e.id && e.dataUrl);
  if (valid.length === 0) return;

  // 1. Cache all photos locally first (before upload attempt)
  for (const e of valid) {
    savePhotoToCache(e.id, e.dataUrl, false);
  }

  // 2. Upload in batches
  for (let i = 0; i < valid.length; i += UPLOAD_BATCH) {
    const batch = valid.slice(i, i + UPLOAD_BATCH);
    const succeededIds = await uploadBatch(batch);
    for (const id of succeededIds) {
      markPhotoUploaded(id);
    }
  }
}

/**
 * On app startup: retry uploading any photos that previously failed.
 * Call this once after the user is authenticated.
 */
export async function retryPendingPhotoUploads(): Promise<void> {
  const pendingIds = getPendingPhotoIds();
  if (pendingIds.length === 0) return;

  console.info(`[photoDb] retrying ${pendingIds.length} pending photo uploads`);

  const entries: { id: string; dataUrl: string }[] = [];
  for (const id of pendingIds) {
    const cached = getPhotoFromCache(id);
    if (cached?.dataUrl) {
      entries.push({ id, dataUrl: cached.dataUrl });
    }
  }

  for (let i = 0; i < entries.length; i += UPLOAD_BATCH) {
    const batch = entries.slice(i, i + UPLOAD_BATCH);
    const succeededIds = await uploadBatch(batch);
    for (const id of succeededIds) {
      markPhotoUploaded(id);
    }
  }
}

/**
 * Fetch photos by ID.
 * Checks localStorage cache first, then falls back to server.
 */
export async function fetchMissingPhotosFromServer(
  ids: string[]
): Promise<Record<string, string>> {
  if (ids.length === 0) return {};

  const result: Record<string, string> = {};
  const needsServerFetch: string[] = [];

  // 1. Check localStorage cache first
  for (const id of ids) {
    const cached = getPhotoFromCache(id);
    if (cached?.dataUrl) {
      result[id] = cached.dataUrl;
    } else {
      needsServerFetch.push(id);
    }
  }

  // 2. Fetch remaining from server
  if (needsServerFetch.length > 0) {
    try {
      const url = `${API_BASE}/photos?ids=${needsServerFetch.join(",")}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = (await res.json()) as { photos?: Record<string, string> };
        const serverPhotos = data.photos ?? {};
        for (const [id, dataUrl] of Object.entries(serverPhotos)) {
          result[id] = dataUrl;
          // Cache server-fetched photos locally for faster future loads
          savePhotoToCache(id, dataUrl, true);
        }
      }
    } catch (e) {
      console.warn("[photoDb] server fetch error:", e);
    }
  }

  return result;
}

// Keep backward-compat export for any remaining callers
export const uploadPhotosToServer = saveAndUploadPhotos;
