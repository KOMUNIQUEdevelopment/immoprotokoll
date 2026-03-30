import jsPDF from "jspdf";
import JSZip from "jszip";
import { ProtocolData, RoomPhoto, FloorDef } from "./types";
import { getTranslations, type SupportedLanguage } from "./i18n";
import type { Translations } from "./i18n/de-CH";

// ─── helpers ──────────────────────────────────────────────────────────────────

function safeText(s: string): string {
  return (s || "").replace(/\u2013/g, "-").replace(/\u2014/g, "--");
}

const FLOOR_LABEL: Record<string, string> = {
  EG: "EG",
  OG: "OG",
  DG: "DG",
  UG: "UG",
  "Außen": "Aussen",
  "Aussen": "Aussen",
};

const FLOOR_SAFE: Record<string, string> = {
  EG: "EG",
  OG: "OG",
  DG: "DG",
  UG: "UG",
  "Außen": "Aussen",
  "Aussen": "Aussen",
};

export function getFloorLabel(floor: string): string {
  return FLOOR_LABEL[floor] ?? floor;
}

export function getFloorSafe(floor: string): string {
  return FLOOR_SAFE[floor] ?? floor.replace(/\s+/g, "_");
}

/**
 * Build a map of floorId → FloorDef from protocol.floors (new-style protocols).
 * For new protocols, room.floor is a FloorDef UUID; for legacy protocols it is
 * a legacy key like "EG", "OG", etc. This helper lets the export pipeline resolve
 * either style gracefully.
 */
function buildFloorMap(floors: FloorDef[]): Record<string, FloorDef> {
  const map: Record<string, FloorDef> = {};
  for (const f of floors ?? []) map[f.id] = f;
  return map;
}

/**
 * Resolve a room.floor value to a human-readable label.
 * Priority: 1) floorMap (UUID floors from FloorEditor), 2) trFloors translation (legacy keys).
 */
function resolveFloorLabel(floorId: string, floorMap: Record<string, FloorDef>, trFloors: Record<string, string>): string {
  if (floorMap[floorId]) return floorMap[floorId].name;
  // Handle legacy "Außen" → "Aussen" key alias
  const key = floorId === "Außen" ? "Aussen" : floorId;
  return trFloors[key] ?? FLOOR_LABEL[floorId] ?? floorId;
}

/**
 * Resolve a room.floor value to a filesystem-safe string.
 * Priority: 1) floorMap (UUID floors), 2) trFloorsSafe translation (legacy keys).
 */
function resolveFloorSafe(floorId: string, floorMap: Record<string, FloorDef>, trFloorsSafe: Record<string, string>): string {
  if (floorMap[floorId]) return floorMap[floorId].name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-äöüÄÖÜ]/g, "");
  const key = floorId === "Außen" ? "Aussen" : floorId;
  return trFloorsSafe[key] ?? FLOOR_SAFE[floorId] ?? floorId.replace(/\s+/g, "_");
}

// ─── PDF export ───────────────────────────────────────────────────────────────

export interface ExportOptions {
  /** If true, adds ImmoProtokoll branding watermark to each page (Free plan) */
  watermark?: boolean;
  /** Language for PDF labels (de-CH, de-DE, en). Defaults to de-CH. */
  language?: SupportedLanguage;
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/immoprotokoll-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addWatermark(doc: jsPDF, pageCount: number, logoDataUrl: string | null, watermarkText: string) {
  const pageW = 210;
  const pageH = 297;
  const barH = 12;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Footer watermark bar
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageH - barH, pageW, barH, "F");
    // Logo on the left
    if (logoDataUrl) {
      try {
        const logoH = 6;
        const logoW = 6;
        doc.addImage(logoDataUrl, "PNG", 10, pageH - barH + 3, logoW, logoH);
      } catch { /* skip if logo embed fails */ }
    }
    // Text branding on the right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      watermarkText,
      pageW / 2 + 3,
      pageH - barH + 7.5,
      { align: "center" }
    );
  }
}

export async function exportToPDF(protocol: ProtocolData, options?: ExportOptions): Promise<void> {
  const language = options?.language ?? "de-CH";
  const tr = getTranslations(language) as Translations;
  const pdf = tr.pdf;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  const usableH = pageH - margin - 20; // 20mm footer reserved
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkPage = (needed: number) => {
    if (y + needed > usableH) addPage();
  };

  const h1 = (text: string) => {
    checkPage(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(26, 26, 46);
    doc.text(safeText(text), margin, y);
    y += 6;
    doc.setDrawColor(26, 26, 46);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + contentW, y);
    y += 6;
  };

  const h2 = (text: string) => {
    checkPage(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 100);
    doc.text(safeText(text), margin, y);
    y += 7;
  };

  const labelW = 52;
  const field = (label: string, value: string) => {
    const lines = doc.splitTextToSize(safeText(value || "-"), contentW - labelW);
    const needed = Math.max(7, lines.length * 5.5) + 1;
    checkPage(needed);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(safeText(label) + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(lines, margin + labelW, y);
    y += needed;
  };

  // ── Title banner ─────────────────────────────────────────────────────────
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, pageW, 52, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(safeText(pdf.title), margin, 22);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const bannerSub = [protocol.mietobjekt, protocol.adresse].filter(Boolean).join(" - ");
  doc.text(safeText(bannerSub), margin, 33);
  doc.setFontSize(10);
  doc.text(safeText(`${pdf.handoverDate} ${protocol.datum}`), margin, 43);
  y = 62;

  // ── General Info ─────────────────────────────────────────────────────────
  h1(pdf.generalInfo);
  field(pdf.property, protocol.mietobjekt);
  field(pdf.address, protocol.adresse);
  field(pdf.date, protocol.datum);

  const vermieterNames =
    protocol.uebergeber
      .filter(p => p.name.trim())
      .map(p => `${p.name} (${pdf.landlordRole})`)
      .join(", ") || "-";
  const mieterNames =
    protocol.uebernehmer
      .filter(p => p.name.trim())
      .map(p => `${p.name} (${pdf.tenantRole})`)
      .join(", ") || "-";
  field(pdf.handingOver, vermieterNames);
  field(pdf.takingOver, mieterNames);

  if (protocol.schluessel) field(pdf.keys, protocol.schluessel);
  if (protocol.schluesselDetails) field(pdf.keyDetails, protocol.schluesselDetails);
  y += 4;

  // ── Meter Readings ────────────────────────────────────────────────────────
  h1(pdf.meters);
  for (const meter of protocol.meterReadings) {
    field(meter.type, meter.stand ? `${meter.stand} ${meter.einheit}` : "-");
  }
  y += 4;

  // Meter photos
  if (protocol.meterPhotos?.length) {
    await addPhotosBlock(doc, protocol.meterPhotos, pdf.meters, "", margin, contentW, usableH, () => y, (v) => { y = v; }, pdf.locale);
  }

  // ── Kitchen ───────────────────────────────────────────────────────────────
  h1(pdf.kitchen);
  for (const app of protocol.appliances) {
    field(app.name, app.zustand || "-");
  }
  if (protocol.allgemeinerZustandKueche) {
    field(pdf.generalCondition, protocol.allgemeinerZustandKueche);
  }
  y += 4;

  // Kitchen photos
  if (protocol.kitchenPhotos?.length) {
    await addPhotosBlock(doc, protocol.kitchenPhotos, pdf.kitchen, "", margin, contentW, usableH, () => y, (v) => { y = v; }, pdf.locale);
  }

  // ── Rooms by floor ────────────────────────────────────────────────────────
  // Build a map from floor UUIDs (new-style FloorEditor protocols) to their names.
  // For legacy protocols, protocol.floors is empty, so floorMap is also empty —
  // resolveFloorLabel then falls back to the FLOOR_LABEL static map.
  const floorMap = buildFloorMap(protocol.floors ?? []);

  // Legacy ordered floors (used when protocol.floors is empty)
  const legacyFloorOrder = ["EG", "OG", "DG", "UG", "Aussen"];

  // Ordered floor IDs to iterate over: prefer protocol.floors order (new), then legacy order
  const orderedFloorIds: string[] = protocol.floors && protocol.floors.length > 0
    ? protocol.floors.map(f => f.id)
    : [
        ...legacyFloorOrder,
        // catch any extra legacy floor keys not in the known set
        ...[...new Set(protocol.rooms.map(r => r.floor))].filter(
          f => !legacyFloorOrder.includes(f) && f !== "Außen"
        ),
      ];

  for (const floorId of orderedFloorIds) {
    const rooms = protocol.rooms.filter(r =>
      r.floor === floorId || (floorId === "Aussen" && r.floor === "Außen")
    );
    if (rooms.length === 0) continue;

    addPage();
    h1(`${pdf.roomProtocol} - ${safeText(resolveFloorLabel(floorId, floorMap, tr.floors as Record<string, string>))}`);

    for (const room of rooms) {
      checkPage(35);
      h2(safeText(room.name));

      const condMap = tr.editor.condition as Record<string, string>;
      const xlCond = (v: string) => condMap[v] ?? v;
      field(pdf.floor, room.bodenZustand ? xlCond(room.bodenZustand) : "-");
      field(pdf.walls, room.waendeDecken || "-");
      field(pdf.windows, room.fensterTueren || "-");
      field(pdf.electric, room.elektrik || pdf.ok);
      field(pdf.heating, room.heizung || pdf.ok);
      if (room.maengelSchaeden) field(pdf.defects, room.maengelSchaeden);
      if (room.notizen) field(pdf.notes, room.notizen);

      if (room.id === "ug-waschraum" && room.waschmaschineVorhanden !== undefined) {
        field(pdf.washingMachine, room.waschmaschineVorhanden ? pdf.present : pdf.notPresent);
        if (room.waschmaschineVorhanden && room.waschmaschinenZustand) {
          field(pdf.washingMachineCondition, xlCond(room.waschmaschinenZustand));
        }
        if (room.waschmaschineVorhanden && room.waschmaschinenNotizen) {
          field(pdf.washingMachineNotes, room.waschmaschinenNotizen);
        }
      }

      if (room.photos.length > 0) {
        const roomFloorLabel = resolveFloorLabel(room.floor, floorMap, tr.floors as Record<string, string>);
        await addPhotosBlock(doc, room.photos, room.name, roomFloorLabel, margin, contentW, usableH, () => y, (v) => { y = v; }, pdf.locale);
      }

      y += 3;
      checkPage(3);
      doc.setDrawColor(210, 210, 225);
      doc.setLineWidth(0.2);
      doc.line(margin, y, margin + contentW, y);
      y += 5;
    }
  }

  // ── Zusatzvereinbarung ────────────────────────────────────────────────────
  const zvEntries = protocol.zusatzvereinbarungen ?? [];
  if (zvEntries.length > 0) {
    addPage();
    const zvTitle = protocol.zusatzvereinbarungTitle || pdf.additionalClauses;
    h1(safeText(zvTitle));

    const renderMultiLine = (text: string) => {
      const paras = text.split("\n");
      const lineH = 5;
      for (const para of paras) {
        if (para.trim() === "") {
          y += lineH * 0.6;
        } else {
          const lines = doc.splitTextToSize(safeText(para), contentW);
          checkPage(lines.length * lineH + 2);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(30, 30, 30);
          doc.text(lines, margin, y);
          y += lines.length * lineH;
        }
      }
    };

    for (let i = 0; i < zvEntries.length; i++) {
      const entry = zvEntries[i];
      checkPage(30);
      // Entry title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 100);
      doc.text(`${i + 1}. ${safeText(entry.title)}`, margin, y);
      y += 7;
      // Entry content
      renderMultiLine(entry.content);
      y += 5;
      // Thin divider between entries (except last)
      if (i < zvEntries.length - 1) {
        checkPage(4);
        doc.setDrawColor(210, 210, 225);
        doc.setLineWidth(0.2);
        doc.line(margin, y - 2, margin + contentW, y - 2);
        y += 2;
      }
    }

    y += 6;
  }

  // ── Signatures page ───────────────────────────────────────────────────────
  addPage();
  h1(pdf.signatures);

  // Note
  checkPage(14);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    safeText(pdf.signaturesNote),
    margin,
    y,
    { maxWidth: contentW }
  );
  y += 10;

  field(pdf.signatureLocation, protocol.signaturOrt || "-");
  field(pdf.date, protocol.signaturDatum || "-");
  y += 10;

  const allPersons = [
    ...protocol.uebergeber.map(p => ({ person: p, side: "uebergeber" as const })),
    ...protocol.uebernehmer.map(p => ({ person: p, side: "uebernehmer" as const })),
  ];

  for (const { person, side } of allPersons) {
    checkPage(65);
    const role = side === "uebergeber" ? pdf.landlordRole : pdf.tenantRole;
    const label = person.name ? `${person.name}, ${role}` : role;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(26, 26, 46);
    doc.text(safeText(label), margin, y);
    y += 6;

    const sigData = protocol.personSignatures.find(s => s.personId === person.id);
    if (sigData?.signatureDataUrl) {
      try {
        doc.addImage(sigData.signatureDataUrl, "PNG", margin, y, 90, 35);
      } catch {}
      y += 38;
    } else {
      doc.setDrawColor(160, 160, 190);
      doc.setLineWidth(0.4);
      doc.line(margin, y + 25, margin + 90, y + 25);
      y += 30;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(safeText(label), margin, y);
    y += 14;
  }

  // ── Page footers ──────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    const title = safeText([protocol.mietobjekt, protocol.adresse].filter(Boolean).join(" - "));
    doc.text(`${pdf.title} - ${title} - ${protocol.datum}`, margin, pageH - 8);
    doc.text(`${pdf.page} ${i} / ${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  const safeAddr = (protocol.adresse || pdf.object).replace(/[\s,\/\\]/g, "_").replace(/__+/g, "_");
  const safeDatum = protocol.datum.replace(/\./g, "-");
  const fileName = `${pdf.title}_${safeAddr}_${safeDatum}.pdf`;

  // Add watermark to all pages for Free plan accounts
  if (options?.watermark) {
    const logoDataUrl = await loadLogoDataUrl();
    addWatermark(doc, doc.getNumberOfPages(), logoDataUrl, pdf.watermarkText);
  }

  doc.save(fileName);
}

// ─── photo rotation helper ────────────────────────────────────────────────────

/**
 * If the photo is portrait (height > width), rotate it 90° clockwise so it
 * becomes landscape. This prevents squishing in the fixed landscape PDF cells.
 * Returns the original dataUrl unchanged for landscape/square images.
 */
function ensureLandscape(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth >= img.naturalHeight) {
        // Already landscape or square — no change needed
        resolve(dataUrl);
        return;
      }
      // Portrait → rotate 90° CW to landscape
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalHeight;   // new width = old height
      canvas.height = img.naturalWidth;   // new height = old width
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(dataUrl); return; }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// ─── photo block helper ───────────────────────────────────────────────────────

async function addPhotosBlock(
  doc: jsPDF,
  photos: RoomPhoto[],
  roomName: string,
  floorLabel: string,
  margin: number,
  contentW: number,
  usableH: number,
  getY: () => number,
  setY: (v: number) => void,
  locale: string,
) {
  let y = getY();

  const photoW = contentW;
  const photoH = Math.round(photoW * 0.65);
  const captionH = 8;
  const rowH = photoH + captionH + 10;

  for (let i = 0; i < photos.length; i++) {
    if (y + rowH > usableH) {
      doc.addPage();
      y = margin;
    }

    const photo = photos[i];
    try {
      // Rotate portrait photos to landscape so they fill the cell correctly
      const landDataUrl = await ensureLandscape(photo.dataUrl);
      const fmt = landDataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(landDataUrl, fmt, margin, y, photoW, photoH);
    } catch {
      // skip broken images
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const ts = new Date(photo.timestamp).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const caption = floorLabel
      ? `${safeText(floorLabel)} – ${safeText(roomName)} · ${ts}`
      : `${safeText(roomName)} · ${ts}`;
    doc.text(caption, margin, y + photoH + 5);

    y += rowH;
  }

  setY(y + 4);
}

// ─── ZIP export (all photos) ──────────────────────────────────────────────────

export async function exportPhotosAsZip(protocol: ProtocolData, options?: ExportOptions): Promise<void> {
  const language = options?.language ?? "de-CH";
  const tr = getTranslations(language) as Translations;
  const pdf = tr.pdf;

  const zip = new JSZip();
  const folder = zip.folder(pdf.photosFolder);
  if (!folder) return;

  // Free plan branding: add a README.txt at the root of the ZIP
  if (options?.watermark) {
    zip.file("README.txt", pdf.zipReadme);
  }

  const usedNames = new Map<string, number>();

  const toSafeSegment = (s: string) =>
    s.replace(/[\/\\:\*\?"<>\|]/g, "").replace(/\s+/g, "_");

  const addPhotos = (photos: RoomPhoto[], floorSafe: string, roomName: string) => {
    const safeRoom = toSafeSegment(roomName);
    const prefix = floorSafe ? `${floorSafe}_${safeRoom}` : safeRoom;

    photos.forEach((photo) => {
      const d = new Date(photo.timestamp);
      const ts = [
        String(d.getFullYear()),
        String(d.getMonth() + 1).padStart(2, "0"),
        String(d.getDate()).padStart(2, "0"),
      ].join("-") + "_" + [
        String(d.getHours()).padStart(2, "0"),
        String(d.getMinutes()).padStart(2, "0"),
        String(d.getSeconds()).padStart(2, "0"),
      ].join("-");

      const ext = photo.dataUrl.startsWith("data:image/png") ? "png" : "jpg";
      const baseName = `${prefix}_${ts}`;
      const count = usedNames.get(baseName) ?? 0;
      usedNames.set(baseName, count + 1);
      const filename = count === 0 ? `${baseName}.${ext}` : `${baseName}_${count + 1}.${ext}`;

      const base64 = photo.dataUrl.split(",")[1];
      if (base64) folder.file(filename, base64, { base64: true });
    });
  };

  if (protocol.meterPhotos?.length) {
    addPhotos(protocol.meterPhotos, "", pdf.photosMeters);
  }

  if (protocol.kitchenPhotos?.length) {
    addPhotos(protocol.kitchenPhotos, "", pdf.photosKitchen);
  }

  const zipFloorMap = buildFloorMap(protocol.floors ?? []);
  for (const room of protocol.rooms) {
    if (room.photos.length > 0) {
      addPhotos(room.photos, resolveFloorSafe(room.floor, zipFloorMap, tr.floorsSafe as Record<string, string>), room.name);
    }
  }

  const safeAddr = (protocol.adresse || pdf.object).replace(/[\s,\/\\]/g, "_").replace(/__+/g, "_");
  const safeDatum = protocol.datum.replace(/\./g, "-");
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pdf.photosFolder}_${safeAddr}_${safeDatum}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
