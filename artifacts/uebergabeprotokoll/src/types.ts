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

export type SignerRole = "Mieter" | "Mieterin" | "Vermieter" | "Vermieterin";

export interface SignatureField {
  id: string;
  name: string;
  role: SignerRole;
  signatureDataUrl: string | null;
}

export interface ProtocolData {
  id: string;
  adresse: string;
  datum: string;
  uebergeber: string;
  uebernehmer: string;
  gesamtZustand: string;
  schluessel: string;
  schluesselDetails: string;
  meterReadings: MeterReading[];
  appliances: ApplianceEntry[];
  allgemeinerZustandKueche: string;
  rooms: RoomData[];
  signaturOrt: string;
  signaturDatum: string;
  signatures: SignatureField[];
  lastSaved: string | null;
}

export const DEFAULT_ROOMS: Omit<RoomData, "photos">[] = [
  { id: "eg-bibliothek", name: "Bibliothek", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "eg-salon", name: "Salon", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "eg-wohnkueche", name: "Wohnküche", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "eg-speisekammer", name: "Speisekammer", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "eg-flur", name: "Flur / Halle", floor: "EG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "og-schlafzimmer", name: "Schlafzimmer", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "og-kinderzimmer", name: "Kinderzimmer", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "og-wohnzimmer", name: "Wohnzimmer", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "og-bad", name: "Bad / WC", floor: "OG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "dg-zimmer1", name: "Zimmer 1", floor: "DG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "dg-zimmer2", name: "Zimmer 2", floor: "DG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "dg-kueche", name: "Küche", floor: "DG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "dg-bad", name: "Bad", floor: "DG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "ug-hobbyraum", name: "Hobbyraum", floor: "UG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "keller-technik", name: "Keller / Technik", floor: "UG", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "garage-stellplatz", name: "Garage / Stellplatz", floor: "Außen", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
  { id: "terrasse-garten", name: "Terrasse / Garten", floor: "Außen", bodenZustand: "", waendeDecken: "", fensterTueren: "", elektrik: "OK", heizung: "OK", maengelSchaeden: "", notizen: "" },
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
    adresse: "Villa Albstadt Ebingen",
    datum: new Date().toLocaleDateString("de-DE"),
    uebergeber: "",
    uebernehmer: "",
    gesamtZustand: "",
    schluessel: "",
    schluesselDetails: "",
    meterReadings: DEFAULT_METER_READINGS,
    appliances: DEFAULT_APPLIANCES,
    allgemeinerZustandKueche: "",
    rooms: DEFAULT_ROOMS.map(r => ({ ...r, photos: [] })),
    signaturOrt: "",
    signaturDatum: new Date().toLocaleDateString("de-DE"),
    signatures: [],
    lastSaved: null,
  };
}
