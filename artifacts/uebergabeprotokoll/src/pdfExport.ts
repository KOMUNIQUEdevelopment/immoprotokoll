import jsPDF from "jspdf";
import { ProtocolData } from "./types";

export async function exportToPDF(protocol: ProtocolData): Promise<void> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 20;

  const addPage = () => {
    doc.addPage();
    y = 20;
  };

  const checkPage = (needed: number = 10) => {
    if (y + needed > 280) addPage();
  };

  const h1 = (text: string) => {
    checkPage(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(30, 30, 60);
    doc.text(text, margin, y);
    y += 8;
    doc.setDrawColor(30, 30, 60);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentW, y);
    y += 5;
  };

  const h2 = (text: string) => {
    checkPage(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(50, 50, 100);
    doc.text(text, margin, y);
    y += 7;
  };

  const field = (label: string, value: string) => {
    checkPage(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(label + ":", margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    const lines = doc.splitTextToSize(value || "—", contentW - 40);
    doc.text(lines, margin + 45, y);
    y += Math.max(6, lines.length * 5);
  };

  const row = (label: string, value: string, x: number, width: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(label + ":", x, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(value || "—", x + width * 0.5, y);
  };

  // Title page
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, pageW, 50, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("Übergabeprotokoll", margin, 25);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Altbau Villa Albstadt Ebingen", margin, 36);
  y = 60;

  // General Info
  h1("Allgemeine Informationen");
  field("Adresse", protocol.adresse);
  field("Datum", protocol.datum);
  field("Übergeber", protocol.uebergeber);
  field("Übernehmer", protocol.uebernehmer);
  if (protocol.schluessel) field("Schlüssel", protocol.schluessel);
  if (protocol.schluesselDetails) field("Schlüssel Details", protocol.schluesselDetails);
  y += 4;

  // Meter Readings
  h1("Zählerstände");
  for (const meter of protocol.meterReadings) {
    if (meter.stand) field(meter.type, `${meter.stand} ${meter.einheit}`);
    else field(meter.type, "—");
  }
  y += 4;

  // Kitchen Appliances
  h1("Küche – Geräte & Zustand");
  for (const app of protocol.appliances) {
    field(app.name, `${app.zustand}${app.notizen ? " – " + app.notizen : ""}`);
  }
  if (protocol.allgemeinerZustandKueche) {
    field("Allgemeiner Zustand", protocol.allgemeinerZustandKueche);
  }
  y += 4;

  // Group rooms by floor
  const floors = ["EG", "OG", "DG", "UG", "Außen"];
  const floorNames: Record<string, string> = {
    EG: "Erdgeschoss",
    OG: "Obergeschoss",
    DG: "Dachgeschoss",
    UG: "Untergeschoss / Keller",
    Außen: "Außenbereiche",
  };

  for (const floor of floors) {
    const rooms = protocol.rooms.filter(r => r.floor === floor);
    if (rooms.length === 0) continue;

    addPage();
    h1(`Raumprotokoll – ${floorNames[floor] || floor}`);

    for (const room of rooms) {
      checkPage(40);
      h2(`${floor} ${room.name}`);

      field("Boden Zustand", room.bodenZustand || "—");
      field("Wände / Decken", room.waendeDecken || "—");
      field("Fenster / Türen", room.fensterTueren || "—");
      field("Elektrik", room.elektrik || "OK");
      field("Heizung", room.heizung || "OK");
      if (room.maengelSchaeden) field("Mängel / Schäden", room.maengelSchaeden);
      if (room.notizen) field("Notizen", room.notizen);

      // Photos
      if (room.photos.length > 0) {
        checkPage(10);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Fotos (${room.photos.length}):`, margin, y);
        y += 5;

        const photoW = (contentW - 6) / 3;
        const photoH = photoW * 0.75;
        let photoX = margin;

        for (let i = 0; i < room.photos.length; i++) {
          const photo = room.photos[i];
          if (i > 0 && i % 3 === 0) {
            y += photoH + 3;
            photoX = margin;
            checkPage(photoH + 10);
          }
          if (i % 3 !== 0) photoX = margin + (i % 3) * (photoW + 3);

          try {
            doc.addImage(photo.dataUrl, "JPEG", photoX, y, photoW, photoH);
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            doc.setFont("helvetica", "normal");
            const ts = new Date(photo.timestamp).toLocaleString("de-DE");
            doc.text(ts, photoX, y + photoH + 3, { maxWidth: photoW });
          } catch {}
        }

        const rows = Math.ceil(room.photos.length / 3);
        y += rows * (photoH + 6) + 4;
      }

      y += 4;
      doc.setDrawColor(200, 200, 220);
      doc.setLineWidth(0.2);
      checkPage(4);
      doc.line(margin, y - 2, margin + contentW, y - 2);
    }
  }

  // Signatures page
  addPage();
  h1("Unterschriften");
  field("Ort", protocol.signaturOrt || "—");
  field("Datum", protocol.signaturDatum || "—");
  y += 8;

  for (const sig of protocol.signatures) {
    checkPage(55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 60);
    doc.text(`${sig.name}${sig.name ? ", " : ""}${sig.role}`, margin, y);
    y += 5;

    if (sig.signatureDataUrl) {
      try {
        doc.addImage(sig.signatureDataUrl, "PNG", margin, y, 80, 30);
      } catch {}
      y += 32;
    } else {
      doc.setDrawColor(150, 150, 180);
      doc.setLineWidth(0.3);
      doc.line(margin, y + 20, margin + 80, y + 20);
      y += 24;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`${sig.name}${sig.name ? ", " : ""}${sig.role}`, margin, y);
    y += 10;
  }

  // Footer
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Übergabeprotokoll – ${protocol.adresse} – ${protocol.datum}`, margin, 292);
    doc.text(`Seite ${i} / ${totalPages}`, pageW - margin, 292, { align: "right" });
  }

  const fileName = `Uebergabeprotokoll_${protocol.adresse.replace(/\s+/g, "_")}_${protocol.datum.replace(/\./g, "-")}.pdf`;
  doc.save(fileName);
}
