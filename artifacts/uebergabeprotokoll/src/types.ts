export type Condition = "sehr gut" | "gut" | "Mängel" | "";

export interface RoomPhoto {
  id: string;
  dataUrl: string;
  timestamp: string;
  caption?: string;
}

export interface RoomData {
  id: string;
  name: string;
  floor: string;
  bodenZustand: Condition;
  waendeDecken: string;
  fensterTueren: string;
  elektrik: string;
  heizung: string;
  maengelSchaeden: string;
  notizen: string;
  photos: RoomPhoto[];
  waschmaschineVorhanden?: boolean;
  waschmaschinenZustand?: Condition;
  waschmaschinenNotizen?: string;
}

export interface ApplianceEntry {
  name: string;
  zustand: string;
  notizen: string;
}

export interface MeterReading {
  type: string;
  stand: string;
  einheit: string;
}

export type Gender = "m" | "f";

export interface Person {
  id: string;
  name: string;
  gender: Gender;
}

export function getPersonRole(_person: Person, side: "uebergeber" | "uebernehmer"): string {
  return side === "uebergeber" ? "Vermieter" : "Mieter";
}

export interface PersonSignature {
  personId: string;
  signatureDataUrl: string | null;
}

export interface ProtocolData {
  id: string;
  mietobjekt: string;
  adresse: string;
  datum: string;
  uebergeber: Person[];
  uebernehmer: Person[];
  gesamtZustand: string;
  schluessel: string;
  schluesselDetails: string;
  meterReadings: MeterReading[];
  appliances: ApplianceEntry[];
  allgemeinerZustandKueche: string;
  kitchenPhotos: RoomPhoto[];
  rooms: RoomData[];
  signaturOrt: string;
  signaturDatum: string;
  personSignatures: PersonSignature[];
  lastSaved: string | null;
}

export const DEFAULT_ROOMS: Omit<RoomData, "photos">[] = [
  // EG
  { id: "eg-bibliothek", name: "Bibliothek", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "eg-salon", name: "Salon", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "eg-wohnkueche", name: "Wohnküche", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "eg-speisekammer", name: "Speisekammer", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "eg-flur", name: "Flur / Halle", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "eg-wc", name: "WC", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  // OG
  { id: "og-schlafzimmer", name: "Schlafzimmer", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "og-kinderzimmer", name: "Kinderzimmer", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "og-wohnzimmer", name: "Wohnzimmer", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "og-bad", name: "Bad", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "og-wc", name: "WC", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "og-balkon", name: "Balkon", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  // DG
  { id: "dg-zimmer1", name: "Zimmer 1", floor: "DG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "dg-zimmer2", name: "Zimmer 2", floor: "DG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "dg-kueche", name: "Küche", floor: "DG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "dg-bad", name: "Bad", floor: "DG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "dg-wc", name: "WC", floor: "DG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  // UG / Keller
  { id: "keller-technik", name: "Keller / Technik", floor: "UG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  {
    id: "ug-kohlekeller-aufzug",
    name: "Kohlekeller / Aufzug",
    floor: "UG",
    bodenZustand: "",
    waendeDecken: "",
    fensterTueren: "",
    elektrik: "OK",
    heizung: "OK",
    maengelSchaeden: "",
    notizen: "Der Betrieb und die Nutzung des Warenaufzugs erfolgt auf eigene Gefahr. Der Vermieter übernimmt keine Haftung für Schäden, die durch die Nutzung des Aufzugs entstehen. Es besteht kein Anspruch auf Reparatur oder Instandhaltung des Aufzugs.",
  },
  {
    id: "ug-waschraum",
    name: "Waschraum",
    floor: "UG",
    bodenZustand: "",
    waendeDecken: "",
    fensterTueren: "",
    elektrik: "OK",
    heizung: "OK",
    maengelSchaeden: "",
    notizen: "",
    waschmaschineVorhanden: undefined,
    waschmaschinenZustand: "",
    waschmaschinenNotizen: "",
  },
  { id: "ug-hobbyraum", name: "Hobbyraum", floor: "UG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  // Außen
  { id: "aussen-garage", name: "Garage", floor: "Außen", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "aussen-terrasse-eg", name: "Terrasse EG", floor: "Außen", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "aussen-freisitz", name: "Freisitz / Garten", floor: "Außen", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "aussen-gartenhaus", name: "Gartenhaus", floor: "Außen", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "aussen-terrasse-garage", name: "Dachterrasse", floor: "Außen", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
];

export const DEFAULT_APPLIANCES: ApplianceEntry[] = [
  { name: "Herd", zustand: "OK", notizen: "" },
  { name: "Backofen", zustand: "OK", notizen: "" },
  { name: "Kühlschrank", zustand: "OK", notizen: "" },
  { name: "Geschirrspüler", zustand: "OK", notizen: "" },
  { name: "Dunstabzug", zustand: "OK", notizen: "" },
];

export const DEFAULT_METER_READINGS: MeterReading[] = [
  { type: "Strom", stand: "", einheit: "kWh" },
  { type: "Wasser", stand: "", einheit: "m³" },
  { type: "Gas", stand: "", einheit: "m³" },
];

export function createDefaultProtocol(): ProtocolData {
  return {
    id: crypto.randomUUID(),
    mietobjekt: "EFH, Altbau, Villa",
    adresse: "Bitzer Steige 75, 79597 Albstadt",
    datum: "28.03.2026",
    uebergeber: [{ id: crypto.randomUUID(), name: "", gender: "m" }],
    uebernehmer: [{ id: crypto.randomUUID(), name: "", gender: "f" }],
    gesamtZustand: "",
    schluessel: "",
    schluesselDetails: "",
    meterReadings: DEFAULT_METER_READINGS,
    appliances: DEFAULT_APPLIANCES,
    allgemeinerZustandKueche: "",
    kitchenPhotos: [],
    rooms: DEFAULT_ROOMS.map(r => ({ ...r, photos: [] })),
    signaturOrt: "",
    signaturDatum: "28.03.2026",
    personSignatures: [],
    lastSaved: null,
  };
}

const ROOM_RENAMES: Record<string, string> = {
  "og-bad": "Bad",
  "og-terrasse": "Balkon",
  "og-balkon": "Balkon",
  "aussen-terrasse-garage": "Dachterrasse",
};

const RENAMED_ID_MAP: Record<string, string> = {
  "og-terrasse": "og-balkon",
};

export function migrateProtocol(data: Record<string, unknown>): ProtocolData {
  const def = createDefaultProtocol();
  if (typeof data.uebergeber === "string") {
    const name = data.uebergeber as string;
    data.uebergeber = [{ id: crypto.randomUUID(), name, gender: "m" }];
  }
  if (typeof data.uebernehmer === "string") {
    const name = data.uebernehmer as string;
    data.uebernehmer = [{ id: crypto.randomUUID(), name, gender: "m" }];
  }
  if (!data.mietobjekt) data.mietobjekt = def.mietobjekt;
  if (!data.personSignatures) {
    const sigs = (data.signatures as Array<{ id: string; signatureDataUrl: string | null }> | undefined) || [];
    data.personSignatures = sigs.map(s => ({ personId: s.id, signatureDataUrl: s.signatureDataUrl }));
  }
  if (!data.kitchenPhotos) data.kitchenPhotos = [];

  const REMOVED_ROOM_IDS = new Set(["garage-stellplatz", "terrasse-garten"]);
  let rooms = ((data.rooms as RoomData[]) || []).filter(r => !REMOVED_ROOM_IDS.has(r.id));

  rooms = rooms.map(r => {
    const newId = RENAMED_ID_MAP[r.id] ?? r.id;
    const newName = ROOM_RENAMES[r.id] ?? r.name;
    return { ...r, id: newId, name: newName };
  });

  const existingRoomIds = new Set(rooms.map(r => r.id));
  const missingRooms = DEFAULT_ROOMS.filter(r => !existingRoomIds.has(r.id)).map(r => ({ ...r, photos: [] }));
  if (missingRooms.length > 0) {
    rooms.push(...missingRooms);
  }

  const defaultOrder = DEFAULT_ROOMS.map(r => r.id);
  rooms.sort((a, b) => {
    const ai = defaultOrder.indexOf(a.id);
    const bi = defaultOrder.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  data.rooms = rooms;
  return { ...def, ...(data as Partial<ProtocolData>) } as ProtocolData;
}
