import jsPDF from "jspdf";
import { ProtocolData, getPersonRole } from "./types";

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
    doc.text(lines, margin + 50, y);
    y += Math.max(6, lines.length * 5);
  };

  // Title banner
  doc.setFillColor(26, 26, 46);
  doc.rect(0, 0, pageW, 50, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("Übergabeprotokoll", margin, 22);
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text([protocol.mietobjekt, protocol.adresse].filter(Boolean).join(" · "), margin, 33);
  doc.setFontSize(10);
  doc.text(`Übergabe am ${protocol.datum}`, margin, 42);
  y = 60;

  // General Info
  h1("Allgemeine Informationen");
  field("Mietobjekt", protocol.mietobjekt);
  field("Adresse", protocol.adresse);
  field("Datum", protocol.datum);

  const vermieterNames = protocol.uebergeber.map(p => `${p.name} (${getPersonRole(p, "uebergeber")})`).filter(n => n.trim() !== ` (Vermieter)`).join(", ") || "—";
  const mieterNames = protocol.uebernehmer.map(p => `${p.name} (${getPersonRole(p, "uebernehmer")})`).filter(n => n.trim() !== ` (Mieter)`).join(", ") || "—";
  field("Übergeber", vermieterNames);
  field("Übernehmer", mieterNames);

  if (protocol.schluessel) field("Schlüsselübergabe", protocol.schluessel);
  if (protocol.schluesselDetails) field("Details", protocol.schluesselDetails);
  y += 4;

  // Meter Readings
  h1("Zählerstände");
  for (const meter of protocol.meterReadings) {
    field(meter.type, meter.stand ? `${meter.stand} ${meter.einheit}` : "—");
  }
  y += 4;

  // Kitchen Appliances
  h1("Küche – Geräte & Zustand");
  for (const app of protocol.appliances) {
    field(app.name, app.zustand || "—");
  }
  if (protocol.allgemeinerZustandKueche) {
    field("Allgemeiner Zustand", protocol.allgemeinerZustandKueche);
  }
  y += 4;

  // Group rooms by floor
  const floors = ["EG", "OG", "DG", "UG", "Außen"];
  const floorNames: Record<string, string> = {
    EG: "Erdgeschoss (EG)",
    OG: "Obergeschoss (OG)",
    DG: "Dachgeschoss (DG)",
    UG: "Untergeschoss / Keller",
    Außen: "Außenbereiche",
  };

  for (const floor of floors) {
    const rooms = protocol.rooms.filter(r => r.floor === floor);
    if (rooms.length === 0) continue;

    addPage();
    h1(`Raumprotokoll – ${floorNames[floor] || floor}`);

    for (const room of rooms) {
      checkPage(45);
      h2(`${room.name}`);

      field("Boden Zustand", room.bodenZustand || "—");
      field("Wände / Decken", room.waendeDecken || "—");
      field("Fenster / Türen", room.fensterTueren || "—");
      field("Elektrik", room.elektrik || "OK");
      field("Heizung", room.heizung || "OK");
      if (room.maengelSchaeden) field("Mängel / Schäden", room.maengelSchaeden);
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

        for (let i = 0; i < room.photos.length; i++) {
          const col = i % 3;
          if (col === 0 && i > 0) {
            y += photoH + 8;
            checkPage(photoH + 10);
          }
          const photoX = margin + col * (photoW + 3);
          const photo = room.photos[i];
          try {
            doc.addImage(photo.dataUrl, "JPEG", photoX, y, photoW, photoH);
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 100, 100);
            const ts = new Date(photo.timestamp).toLocaleString("de-DE");
            doc.text(ts, photoX, y + photoH + 3, { maxWidth: photoW });
          } catch {}
        }

        const rows = Math.ceil(room.photos.length / 3);
        y += rows * (photoH + 8) + 4;
      }

      y += 4;
      doc.setDrawColor(210, 210, 225);
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

  const allPersons = [
    ...protocol.uebergeber.map(p => ({ person: p, side: "uebergeber" as const })),
    ...protocol.uebernehmer.map(p => ({ person: p, side: "uebernehmer" as const })),
  ];

  for (const { person, side } of allPersons) {
    checkPage(60);
    const role = getPersonRole(person, side);
    const label = person.name ? `${person.name}, ${role}` : role;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 60);
    doc.text(label, margin, y);
    y += 5;

    const sigData = protocol.personSignatures.find(s => s.personId === person.id);
    if (sigData?.signatureDataUrl) {
      try {
        doc.addImage(sigData.signatureDataUrl, "PNG", margin, y, 80, 30);
      } catch {}
      y += 33;
    } else {
      doc.setDrawColor(150, 150, 180);
      doc.setLineWidth(0.3);
      doc.line(margin, y + 22, margin + 80, y + 22);
      y += 26;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(label, margin, y);
    y += 12;
  }

  // Page footers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const title = [protocol.mietobjekt, protocol.adresse].filter(Boolean).join(" · ");
    doc.text(`Übergabeprotokoll – ${title} – ${protocol.datum}`, margin, 292);
    doc.text(`Seite ${i} / ${totalPages}`, pageW - margin, 292, { align: "right" });
  }

  const fileName = `Uebergabeprotokoll_${(protocol.adresse || "Objekt").replace(/[\s,]/g, "_")}_${protocol.datum.replace(/\./g, "-")}.pdf`;
  doc.save(fileName);
}
