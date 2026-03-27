import React from "react";
import { Trash2 } from "lucide-react";
import { ProtocolData, Person, PersonSignature, getPersonRole } from "../types";
import SignatureCanvasComponent from "../components/SignatureCanvas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SignaturePageProps {
  protocol: ProtocolData;
  updateProtocol: (fn: (p: ProtocolData) => ProtocolData) => void;
}

function getSignatureFor(signatures: PersonSignature[], personId: string): string | null {
  return signatures.find(s => s.personId === personId)?.signatureDataUrl ?? null;
}

function upsertSignature(signatures: PersonSignature[], personId: string, dataUrl: string | null): PersonSignature[] {
  const existing = signatures.find(s => s.personId === personId);
  if (existing) {
    return signatures.map(s => s.personId === personId ? { ...s, signatureDataUrl: dataUrl } : s);
  }
  return [...signatures, { personId, signatureDataUrl: dataUrl }];
}

interface PersonSignatureBlockProps {
  person: Person;
  side: "uebergeber" | "uebernehmer";
  signatureDataUrl: string | null;
  onSignatureChange: (dataUrl: string | null) => void;
  onNameChange: (name: string) => void;
  onRemove?: () => void;
}

function PersonSignatureBlock({ person, side, signatureDataUrl, onSignatureChange, onNameChange, onRemove }: PersonSignatureBlockProps) {
  const role = getPersonRole(person, side);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            value={person.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Vorname Nachname"
            className="text-sm"
          />
        </div>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md font-medium shrink-0">{role}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>

      {person.name && (
        <p className="text-xs text-muted-foreground">
          Unterschrift: <strong>{person.name}, {role}</strong>
        </p>
      )}

      <SignatureCanvasComponent
        value={signatureDataUrl}
        onChange={onSignatureChange}
        label="Hier unterschreiben"
      />
    </div>
  );
}

export default function SignaturePage({ protocol, updateProtocol }: SignaturePageProps) {
  const updatePersonName = (side: "uebergeber" | "uebernehmer", id: string, name: string) => {
    updateProtocol(p => ({
      ...p,
      [side]: (p[side] as Person[]).map(person => person.id === id ? { ...person, name } : person),
    }));
  };

  const removePerson = (side: "uebergeber" | "uebernehmer", id: string) => {
    updateProtocol(p => ({
      ...p,
      [side]: (p[side] as Person[]).filter(person => person.id !== id),
      personSignatures: p.personSignatures.filter(s => s.personId !== id),
    }));
  };

  const updateSignature = (personId: string, dataUrl: string | null) => {
    updateProtocol(p => ({
      ...p,
      personSignatures: upsertSignature(p.personSignatures, personId, dataUrl),
    }));
  };

  const allVermieterSigned = protocol.uebergeber.every(p => getSignatureFor(protocol.personSignatures, p.id) !== null);
  const allMieterSigned = protocol.uebernehmer.every(p => getSignatureFor(protocol.personSignatures, p.id) !== null);

  return (
    <div className="space-y-6">
      {/* Location & Date */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-sm">Ort und Datum</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
              Ort
            </label>
            <Input
              value={protocol.signaturOrt}
              onChange={(e) => updateProtocol(p => ({ ...p, signaturOrt: e.target.value }))}
              placeholder="Stadt / Ort"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
              Datum
            </label>
            <Input
              value={protocol.signaturDatum}
              onChange={(e) => updateProtocol(p => ({ ...p, signaturDatum: e.target.value }))}
              placeholder="TT.MM.JJJJ"
            />
          </div>
        </div>
      </div>

      {/* Vermieter Signatures */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          Übergeber (Vermieter)
          {allVermieterSigned && protocol.uebergeber.length > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Alle unterschrieben</span>
          )}
        </h3>

        {protocol.uebergeber.map((person) => (
          <PersonSignatureBlock
            key={person.id}
            person={person}
            side="uebergeber"
            signatureDataUrl={getSignatureFor(protocol.personSignatures, person.id)}
            onSignatureChange={(dataUrl) => updateSignature(person.id, dataUrl)}
            onNameChange={(name) => updatePersonName("uebergeber", person.id, name)}
            onRemove={protocol.uebergeber.length > 1 ? () => removePerson("uebergeber", person.id) : undefined}
          />
        ))}
      </div>

      {/* Mieter Signatures */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          Übernehmer (Mieter)
          {allMieterSigned && protocol.uebernehmer.length > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Alle unterschrieben</span>
          )}
        </h3>

        {protocol.uebernehmer.map((person) => (
          <PersonSignatureBlock
            key={person.id}
            person={person}
            side="uebernehmer"
            signatureDataUrl={getSignatureFor(protocol.personSignatures, person.id)}
            onSignatureChange={(dataUrl) => updateSignature(person.id, dataUrl)}
            onNameChange={(name) => updatePersonName("uebernehmer", person.id, name)}
            onRemove={protocol.uebernehmer.length > 1 ? () => removePerson("uebernehmer", person.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
