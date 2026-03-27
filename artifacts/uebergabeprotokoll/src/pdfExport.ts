import jsPDF from "jspdf";
import JSZip from "jszip";
import { ProtocolData, RoomPhoto, getPersonRole } from "./types";

// ─── helpers ──────────────────────────────────────────────────────────────────

function safeText(s: string): string {
  return (s || "").replace(/\u2013/g, "-").replace(/\u2014/g, "--");
}

const FLOOR_LABEL: Record<string, string> = {
  EG: "Erdgeschoss (EG)",
  OG: "Obergeschoss (OG)",
  DG: "Dachgeschoss (DG)",
  UG: "Untergeschoss (UG)",
  "Außen": "Außenbereiche",
};

const FLOOR_SAFE: Record<string, string> = {
  EG: "Erdgeschoss_(EG)",
  OG: "Obergeschoss_(OG)",
  DG: "Dachgeschoss_(DG)",
  UG: "Untergeschoss_(UG)",
  "Außen": "Aussenbereiche",
};

export function getFloorLabel(floor: string): string {
  return FLOOR_LABEL[floor] ?? floor;
}

export function getFloorSafe(floor: string): string {
  return FLOOR_SAFE[floor] ?? floor.replace(/\s+/g, "_");
}

// ─── PDF export ───────────────────────────────────────────────────────────────

export async function exportToPDF(protocol: ProtocolData): Promise<void> {
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
  doc.text("Uebergabeprotokoll", margin, 22);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const bannerSub = [protocol.mietobjekt, protocol.adresse].filter(Boolean).join(" - ");
  doc.text(safeText(bannerSub), margin, 33);
  doc.setFontSize(10);
  doc.text(safeText("Uebergabe am " + protocol.datum), margin, 43);
  y = 62;

  // ── General Info ─────────────────────────────────────────────────────────
  h1("Allgemeine Informationen");
  field("Mietobjekt", protocol.mietobjekt);
  field("Adresse", protocol.adresse);
  field("Datum", protocol.datum);

  const vermieterNames =
    protocol.uebergeber
      .filter(p => p.name.trim())
      .map(p => `${p.name} (${getPersonRole(p, "uebergeber")})`)
      .join(", ") || "-";
  const mieterNames =
    protocol.uebernehmer
      .filter(p => p.name.trim())
      .map(p => `${p.name} (${getPersonRole(p, "uebernehmer")})`)
      .join(", ") || "-";
  field("Uebergeber", vermieterNames);
  field("Uebernehmer", mieterNames);

  if (protocol.schluessel) field("Schluessel", protocol.schluessel);
  if (protocol.schluesselDetails) field("Details", protocol.schluesselDetails);
  y += 4;

  // ── Meter Readings ────────────────────────────────────────────────────────
  h1("Zaehlerstaende");
  for (const meter of protocol.meterReadings) {
    field(meter.type, meter.stand ? `${meter.stand} ${meter.einheit}` : "-");
  }
  y += 4;

  // ── Kitchen ───────────────────────────────────────────────────────────────
  h1("Kueche - Geraete & Zustand");
  for (const app of protocol.appliances) {
    field(app.name, app.zustand || "-");
  }
  if (protocol.allgemeinerZustandKueche) {
    field("Allg. Zustand", protocol.allgemeinerZustandKueche);
  }
  y += 4;

  // Kitchen photos
  if (protocol.kitchenPhotos?.length) {
    addPhotosBlock(doc, protocol.kitchenPhotos, "Küche", "", margin, contentW, usableH, () => y, (v) => { y = v; });
  }

  // ── Rooms by floor ────────────────────────────────────────────────────────
  const floors = ["EG", "OG", "DG", "UG", "Aussen"];
  const floorNames: Record<string, string> = {
    EG: "Erdgeschoss (EG)",
    OG: "Obergeschoss (OG)",
    DG: "Dachgeschoss (DG)",
    UG: "Untergeschoss / Keller",
    "Aussen": "Aussenbereiche",
  };

  const allFloors = [...new Set(protocol.rooms.map(r => r.floor))];

  for (const floor of [...floors, ...allFloors.filter(f => !floors.includes(f) && f !== "Außen")]) {
    const rooms = protocol.rooms.filter(r => r.floor === floor || (floor === "Aussen" && r.floor === "Außen"));
    if (rooms.length === 0) continue;

    addPage();
    h1(`Raumprotokoll - ${safeText(floorNames[floor] || floor)}`);

    for (const room of rooms) {
      checkPage(35);
      h2(safeText(room.name));

      field("Boden Zustand", room.bodenZustand || "-");
      field("Waende / Decken", room.waendeDecken || "-");
      field("Fenster / Tueren", room.fensterTueren || "-");
      field("Elektrik", room.elektrik || "OK");
      field("Heizung", room.heizung || "OK");
      if (room.maengelSchaeden) field("Maengel / Schaeden", room.maengelSchaeden);
      if (room.notizen) field("Notizen", room.notizen);

      if (room.id === "ug-waschraum" && room.waschmaschineVorhanden !== undefined) {
        field("Waschmaschine", room.waschmaschineVorhanden ? "Vorhanden" : "Nicht vorhanden");
        if (room.waschmaschineVorhanden && room.waschmaschinenZustand) {
          field("Zustand Waschmaschine", room.waschmaschinenZustand);
        }
        if (room.waschmaschineVorhanden && room.waschmaschinenNotizen) {
          field("Notizen Waschmaschine", room.waschmaschinenNotizen);
        }
      }

      if (room.photos.length > 0) {
        const roomFloorLabel = FLOOR_LABEL[room.floor] ?? FLOOR_LABEL["Außen"] ?? room.floor;
        addPhotosBlock(doc, room.photos, room.name, roomFloorLabel, margin, contentW, usableH, () => y, (v) => { y = v; });
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
    const zvTitle = protocol.zusatzvereinbarungTitle || "Zusatzvereinbarung";
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
  h1("Unterschriften");

  // Note
  checkPage(14);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    safeText("Hinweis: Unterschriften gelten fuer das gesamte Protokoll einschliesslich der Zusatzvereinbarungen."),
    margin,
    y,
    { maxWidth: contentW }
  );
  y += 10;

  field("Ort", protocol.signaturOrt || "-");
  field("Datum", protocol.signaturDatum || "-");
  y += 10;

  const allPersons = [
    ...protocol.uebergeber.map(p => ({ person: p, side: "uebergeber" as const })),
    ...protocol.uebernehmer.map(p => ({ person: p, side: "uebernehmer" as const })),
  ];

  for (const { person, side } of allPersons) {
    checkPage(65);
    const role = getPersonRole(person, side);
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
    doc.text(`Uebergabeprotokoll - ${title} - ${protocol.datum}`, margin, pageH - 8);
    doc.text(`Seite ${i} / ${totalPages}`, pageW - margin, pageH - 8, { align: "right" });
  }

  const safeAddr = (protocol.adresse || "Objekt").replace(/[\s,\/\\]/g, "_").replace(/__+/g, "_");
  const safeDatum = protocol.datum.replace(/\./g, "-");
  const fileName = `Uebergabeprotokoll_${safeAddr}_${safeDatum}.pdf`;
  doc.save(fileName);
}

// ─── photo block helper ───────────────────────────────────────────────────────

function addPhotosBlock(
  doc: jsPDF,
  photos: RoomPhoto[],
  roomName: string,
  floorLabel: string,
  margin: number,
  contentW: number,
  usableH: number,
  getY: () => number,
  setY: (v: number) => void,
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
      const fmt = photo.dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(photo.dataUrl, fmt, margin, y, photoW, photoH);
    } catch {
      // skip broken images
    }

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    const ts = new Date(photo.timestamp).toLocaleString("de-DE", {
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

export async function exportPhotosAsZip(protocol: ProtocolData): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder("Fotos");
  if (!folder) return;

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

  if (protocol.kitchenPhotos?.length) {
    addPhotos(protocol.kitchenPhotos, "", "Küche");
  }

  for (const room of protocol.rooms) {
    if (room.photos.length > 0) {
      addPhotos(room.photos, FLOOR_SAFE[room.floor] ?? toSafeSegment(room.floor), room.name);
    }
  }

  const safeAddr = (protocol.adresse || "Objekt").replace(/[\s,\/\\]/g, "_").replace(/__+/g, "_");
  const safeDatum = protocol.datum.replace(/\./g, "-");
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Fotos_${safeAddr}_${safeDatum}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}
