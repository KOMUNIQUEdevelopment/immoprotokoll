// photoDb.ts — Photo server helpers
// Photos are uploaded immediately when taken/selected (in PhotoManager).
// They are stored in the server DB and served via GET /api/photos/:id.
// No localStorage, no complex sync — just a simple upload function used by PhotoManager.

export async function uploadPhotosToServer(
  entries: { id: string; dataUrl: string }[]
): Promise<void> {
  const valid = entries.filter((e) => e.id && e.dataUrl);
  if (valid.length === 0) return;
  const res = await fetch("/api/photos", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos: valid }),
  });
  if (!res.ok) {
    throw new Error(`Photo upload failed: HTTP ${res.status}`);
  }
}
