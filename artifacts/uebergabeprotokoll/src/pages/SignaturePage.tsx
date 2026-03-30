import React from "react";
import { Trash2 } from "lucide-react";
import { ProtocolData, Person, PersonSignature, getPersonRole } from "../types";
import SignatureCanvasComponent from "../components/SignatureCanvas";
import { Input } from "@/components/ui/input";
import { getTranslations, type SupportedLanguage } from "../i18n";
import type { Translations } from "../i18n/de-CH";

interface SignaturePageProps {
  protocol: ProtocolData;
  updateProtocol: (fn: (p: ProtocolData) => ProtocolData) => void;
  language?: SupportedLanguage;
}

function getSignatureFor(signatures: PersonSignature[], personId: string): string | null {
  const val = signatures.find(s => s.personId === personId)?.signatureDataUrl;
  return val || null;
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
  tr: Translations;
}

function PersonSignatureBlock({ person, side, signatureDataUrl, onSignatureChange, onNameChange, onRemove, tr }: PersonSignatureBlockProps) {
  const role = getPersonRole(person, side);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Input
            value={person.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={tr.person.namePlaceholder}
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
          {tr.signature.sign}: <strong>{person.name}, {role}</strong>
        </p>
      )}

      <SignatureCanvasComponent
        value={signatureDataUrl}
        onChange={onSignatureChange}
      />
    </div>
  );
}

export default function SignaturePage({ protocol, updateProtocol, language = "de-CH" }: SignaturePageProps) {
  const tr = getTranslations(language) as Translations;

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

    if (dataUrl && protocol.syncEnabled && protocol.id) {
      fetch(`/api/protocol/${protocol.id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId, signatureDataUrl: dataUrl }),
      }).catch((e) => console.warn("Signature sync to server failed:", e));
    }
  };

  const allVermieterSigned = protocol.uebergeber.every(p => !!getSignatureFor(protocol.personSignatures, p.id));
  const allMieterSigned = protocol.uebernehmer.every(p => !!getSignatureFor(protocol.personSignatures, p.id));

  return (
    <div className="space-y-6">
      <div className="bg-muted/60 border border-border rounded-xl px-4 py-3 flex items-start gap-2">
        <span className="text-muted-foreground mt-0.5 shrink-0 text-base">ℹ</span>
        <p className="text-sm text-muted-foreground">
          {tr.signature.hint}
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-sm">{tr.pdf.date} &amp; Ort</h3>
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
              {tr.pdf.date}
            </label>
            <Input
              value={protocol.signaturDatum}
              onChange={(e) => updateProtocol(p => ({ ...p, signaturDatum: e.target.value }))}
              placeholder={tr.editor.datePlaceholder}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {tr.editor.landlord}
          {allVermieterSigned && protocol.uebergeber.length > 0 && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tr.signature.allSigned}</span>
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
            tr={tr}
          />
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          {tr.editor.tenant}
          {allMieterSigned && protocol.uebernehmer.length > 0 && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tr.signature.allSigned}</span>
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
            tr={tr}
          />
        ))}
      </div>
    </div>
  );
}
