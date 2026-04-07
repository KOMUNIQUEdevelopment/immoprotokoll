const UPLOAD_BATCH = 3;

function getApiBase(): string {
  return "/api";
}

export async function uploadPhotosToServer(
  entries: { id: string; dataUrl: string }[]
): Promise<void> {
  const valid = entries.filter((e) => e.id && e.dataUrl);
  if (valid.length === 0) return;
  for (let i = 0; i < valid.length; i += UPLOAD_BATCH) {
    const batch = valid.slice(i, i + UPLOAD_BATCH);
    try {
      const res = await fetch(`${getApiBase()}/photos`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: batch }),
      });
      if (!res.ok) {
        console.warn(`Photo upload failed: HTTP ${res.status}`);
      }
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
    const data = (await res.json()) as { photos?: Record<string, string> };
    return data.photos ?? {};
  } catch {
    return {};
  }
}
