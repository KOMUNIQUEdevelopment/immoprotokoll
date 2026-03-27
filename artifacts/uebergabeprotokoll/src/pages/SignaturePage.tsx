import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { ProtocolData, SignatureField, SignerRole } from "../types";
import SignatureCanvasComponent from "../components/SignatureCanvas";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SignaturePageProps {
  protocol: ProtocolData;
  updateProtocol: (fn: (p: ProtocolData) => ProtocolData) => void;
}

const ROLES: SignerRole[] = ["Mieter", "Mieterin", "Vermieter", "Vermieterin"];

export default function SignaturePage({ protocol, updateProtocol }: SignaturePageProps) {
  const addSignature = () => {
    const newSig: SignatureField = {
      id: crypto.randomUUID(),
      name: "",
      role: "Mieter",
      signatureDataUrl: null,
    };
    updateProtocol(p => ({ ...p, signatures: [...p.signatures, newSig] }));
  };

  const updateSig = (id: string, updates: Partial<SignatureField>) => {
    updateProtocol(p => ({
      ...p,
      signatures: p.signatures.map(s => s.id === id ? { ...s, ...updates } : s),
    }));
  };

  const removeSig = (id: string) => {
    updateProtocol(p => ({ ...p, signatures: p.signatures.filter(s => s.id !== id) }));
  };

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

      {/* Signature Fields */}
      <div className="space-y-4">
        {protocol.signatures.map((sig) => (
          <div key={sig.id} className="bg-card border border-border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                    Name
                  </label>
                  <Input
                    value={sig.name}
                    onChange={(e) => updateSig(sig.id, { name: e.target.value })}
                    placeholder="Vorname Nachname"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">
                    Rolle
                  </label>
                  <div className="flex gap-1 flex-wrap">
                    {ROLES.map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => updateSig(sig.id, { role })}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-medium transition-all ${
                          sig.role === role
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border text-foreground hover:bg-accent"
                        }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeSig(sig.id)}
                className="ml-3 p-1.5 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {sig.name && (
              <p className="text-sm text-muted-foreground">
                Unterschrift: <strong>{sig.name}, {sig.role}</strong>
              </p>
            )}

            <SignatureCanvasComponent
              value={sig.signatureDataUrl}
              onChange={(dataUrl) => updateSig(sig.id, { signatureDataUrl: dataUrl })}
              label="Unterschrift (hier auf dem Bildschirm unterschreiben)"
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={addSignature}
        className="w-full gap-2 border-dashed"
      >
        <Plus size={16} />
        Unterschriftenfeld hinzufügen
      </Button>

      {protocol.signatures.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          Klicken Sie oben, um Unterschriftenfelder hinzuzufügen.
        </p>
      )}
    </div>
  );
}
