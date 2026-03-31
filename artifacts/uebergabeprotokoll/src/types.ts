export type Condition = "sehr gut" | "gut" | "Mängel" | "";

/** A user-defined floor within a protocol (free-form name, ordered list). */
export interface FloorDef {
  id: string;
  name: string;
}

/** A property managed by an account. */
export interface Property {
  id: string;
  accountId: string;
  name: string;
  adresse: string;
  language: string;
  photoDataUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sentinel property used to surface legacy (pre-property) protocols that have
 * no propertyId. The UI shows this as a read-only "Nicht zugeordnet" entry.
 * Creating new protocols in this view is disabled — users must use a real property.
 */
export const UNASSIGNED_PROPERTY: Property = {
  id: "__unassigned__",
  accountId: "",
  name: "__unassigned__",
  adresse: "",
  language: "de-CH",
  createdAt: "",
  updatedAt: "",
};

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

export interface ZusatzvereinbarungEntry {
  id: string;
  title: string;
  content: string;
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

export function getPersonRole(_person: Person, side: "uebergeber" | "uebernehmer"): "uebergeber" | "uebernehmer" {
  return side;
}

export interface PersonSignature {
  personId: string;
  signatureDataUrl: string | null;
}

export interface ProtocolData {
  id: string;
  /** Property this protocol belongs to (null for legacy/migrated protocols). */
  propertyId: string | null;
  mietobjekt: string;
  adresse: string;
  datum: string;
  uebergeber: Person[];
  uebernehmer: Person[];
  gesamtZustand: string;
  schluessel: string;
  schluesselDetails: string;
  meterReadings: MeterReading[];
  meterPhotos: RoomPhoto[];
  appliances: ApplianceEntry[];
  allgemeinerZustandKueche: string;
  kitchenPhotos: RoomPhoto[];
  /**
   * Ordered list of user-defined floors.
   * New protocols use UUIDs as floor IDs so rooms can be safely renamed.
   * Legacy protocols (pre-migration) may have empty floors[] with room.floor as a plain name string.
   */
  floors: FloorDef[];
  rooms: RoomData[];
  /** IDs of rooms explicitly deleted by the user — never re-added by migration or server sync. */
  deletedRoomIds: string[];
  zusatzvereinbarungTitle: string;
  zusatzvereinbarungen: ZusatzvereinbarungEntry[];
  signaturOrt: string;
  signaturDatum: string;
  personSignatures: PersonSignature[];
  lastSaved: string | null;
  syncEnabled: boolean;
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

export const DEFAULT_ZUSATZVEREINBARUNGEN: ZusatzvereinbarungEntry[] = [
  {
    id: "zv-altbau",
    title: "Altbautypische Eigenschaften",
    content:
      "Dem Mieter ist bekannt, dass es sich bei dem Objekt um eine Altbau-Villa handelt. Daraus können sich typische Eigenschaften ergeben, insbesondere:\n- Unebenheiten bei Böden und Wänden\n- Teilweise hellhörige Räume\n- Ältere Fenster mit möglicher leichter Zugluft\n- Temperaturunterschiede innerhalb des Hauses\n- Altersbedingte Gebrauchsspuren an Bauteilen\n\nDiese Eigenschaften stellen keinen Mangel dar, soweit sie den üblichen Zustand eines Altbaus widerspiegeln.",
  },
  {
    id: "zv-zustand",
    title: "Zustand bei Übergabe",
    content:
      "Das Objekt wird in dem im Übergabeprotokoll dokumentierten Zustand übergeben. Der Mieter bestätigt, dass ihm der Zustand bekannt ist und keine darüber hinausgehenden Ansprüche bestehen, sofern keine verdeckten Mängel vorliegen.",
  },
  {
    id: "zv-arbeiten",
    title: "Offene Arbeiten durch Vermieter",
    content:
      "Folgende Arbeiten werden nach der Übergabe noch durch den Vermieter ausgeführt:\n- Austausch von Fenstergriffen (aufgrund von leichter Schwergängigkeit)\n- Räumung Zaun in Garage\n\nDie Arbeiten erfolgen nach vorheriger Information der Mieterin.",
  },
  {
    id: "zv-schluessel",
    title: "Schlüsselregelung (Übergangsphase)",
    content:
      "Die Vermieter behalten vorübergehend einen Schlüssel zum Objekt, um notwendige kleinere Arbeiten durchzuführen.\n\nDabei gilt:\n- Der Mieter wird vor jedem Zutritt informiert\n- Zutritt erfolgt nur nach vorheriger Information\n- Die Nutzung beschränkt sich ausschliesslich auf die genannten Arbeiten\n\nNach Abschluss der Arbeiten wird der Schlüssel übergeben.",
  },
  {
    id: "zv-fotos",
    title: "Fotos & Dokumentation",
    content:
      "Die bei der Übergabe erstellten Fotos sind Bestandteil des Übergabeprotokolls. Sie dienen der Dokumentation des Zustands bei Übergabe.",
  },
  {
    id: "zv-schluss",
    title: "Schlussbestätigung",
    content:
      "Beide Parteien bestätigen mit ihrer Unterschrift, dass:\n- das Objekt gemeinsam besichtigt wurde\n- alle wesentlichen Punkte besprochen wurden\n- das Übergabeprotokoll vollständig und korrekt ist",
  },
];

/**
 * Create a fresh protocol, optionally linked to a property.
 * New protocols start with no floors/rooms — users build them freely.
 */
export interface ProtocolSeeds {
  applianceNames?: string[];
  meterTypes?: string[];
  zusatzvereinbarungTitle?: string;
}

export function createDefaultProtocol(propertyId: string | null = null, seeds?: ProtocolSeeds): ProtocolData {
  const today = new Date();
  const datum = today.toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    propertyId,
    mietobjekt: "",
    adresse: "",
    datum,
    uebergeber: [{ id: crypto.randomUUID(), name: "", gender: "m" }],
    uebernehmer: [{ id: crypto.randomUUID(), name: "", gender: "f" }],
    gesamtZustand: "",
    schluessel: "",
    schluesselDetails: "",
    meterReadings: seeds?.meterTypes
      ? seeds.meterTypes.map((type, i) => ({ type, stand: "", einheit: DEFAULT_METER_READINGS[i]?.einheit ?? "kWh" }))
      : DEFAULT_METER_READINGS.map(r => ({ ...r })),
    meterPhotos: [],
    appliances: seeds?.applianceNames
      ? seeds.applianceNames.map(name => ({ name, zustand: "OK", notizen: "" }))
      : DEFAULT_APPLIANCES.map(a => ({ ...a })),
    allgemeinerZustandKueche: "",
    kitchenPhotos: [],
    floors: [],
    rooms: [],
    deletedRoomIds: [],
    zusatzvereinbarungTitle: seeds?.zusatzvereinbarungTitle ?? "",
    zusatzvereinbarungen: [],
    signaturOrt: "",
    signaturDatum: datum,
    personSignatures: [],
    lastSaved: null,
    syncEnabled: false,
  };
}

/**
 * Derive legacy floors array from the room.floor strings (EG/OG/DG/UG/Außen).
 * Used when migrating old protocols that have no floors[] field.
 */
function deriveLegacyFloors(rooms: RoomData[]): FloorDef[] {
  const seen = new Map<string, string>();
  for (const room of rooms) {
    if (room.floor && !seen.has(room.floor)) {
      seen.set(room.floor, room.floor);
    }
  }
  // Canonical order for legacy floors
  const FLOOR_ORDER = ["EG", "OG", "DG", "UG", "Außen"];
  const orderedKeys = [
    ...FLOOR_ORDER.filter(k => seen.has(k)),
    ...[...seen.keys()].filter(k => !FLOOR_ORDER.includes(k)),
  ];
  return orderedKeys.map(name => ({ id: name, name }));
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
  if (!data.meterPhotos) data.meterPhotos = [];
  if (!data.kitchenPhotos) data.kitchenPhotos = [];
  if (!data.zusatzvereinbarungTitle) data.zusatzvereinbarungTitle = "Zusatzvereinbarung – Altbauhinweise & besondere Regelungen";
  if (!data.zusatzvereinbarungen) data.zusatzvereinbarungen = DEFAULT_ZUSATZVEREINBARUNGEN.map(e => ({ ...e }));

  const REMOVED_ROOM_IDS = new Set(["garage-stellplatz", "terrasse-garten"]);
  let rooms = ((data.rooms as RoomData[]) || []).filter(r => !REMOVED_ROOM_IDS.has(r.id));

  rooms = rooms.map(r => {
    const newId = RENAMED_ID_MAP[r.id] ?? r.id;
    const newName = ROOM_RENAMES[r.id] ?? r.name;
    return { ...r, id: newId, name: newName };
  });

  // Rooms explicitly deleted by the user — never re-add them.
  const deletedRoomIds: string[] = Array.isArray(data.deletedRoomIds)
    ? (data.deletedRoomIds as string[])
    : [];
  const deletedSet = new Set(deletedRoomIds);

  // Remove any rooms that were explicitly deleted.
  rooms = rooms.filter(r => !deletedSet.has(r.id));

  // De-duplicate: if multiple rooms share the same name AND floor, keep the
  // one with the most data (photos + non-empty fields). Rooms with the same
  // name on different floors (e.g. "WC" in EG, OG, DG) are kept separately.
  const byNameFloor = new Map<string, RoomData>();
  for (const room of rooms) {
    const key = `${room.name.trim().toLowerCase()}|${(room.floor ?? "").toLowerCase()}`;
    const existing = byNameFloor.get(key);
    if (!existing) {
      byNameFloor.set(key, room);
    } else {
      const existingScore =
        (existing.photos?.length ?? 0) +
        (existing.maengelSchaeden ? 1 : 0) +
        (existing.notizen ? 1 : 0);
      const newScore =
        (room.photos?.length ?? 0) +
        (room.maengelSchaeden ? 1 : 0) +
        (room.notizen ? 1 : 0);
      if (newScore > existingScore) {
        byNameFloor.set(key, room);
      }
    }
  }
  rooms = Array.from(byNameFloor.values());

  data.deletedRoomIds = deletedRoomIds;

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

  // Ensure propertyId is present (null for legacy protocols)
  if (!("propertyId" in data)) data.propertyId = null;

  // Derive floors from existing rooms if not set (legacy protocol migration)
  if (!Array.isArray(data.floors) || (data.floors as unknown[]).length === 0) {
    data.floors = deriveLegacyFloors(rooms);
  }

  return { ...def, ...(data as Partial<ProtocolData>) } as ProtocolData;
}
