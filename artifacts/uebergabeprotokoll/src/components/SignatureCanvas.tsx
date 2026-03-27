import React, { useRef, useEffect } from "react";
import ReactSignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Trash2, Check } from "lucide-react";

interface SignatureCanvasProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}

export default function SignatureCanvasComponent({ value, onChange, label }: SignatureCanvasProps) {
  const sigRef = useRef<ReactSignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = React.useState(!value);

  useEffect(() => {
    if (value && sigRef.current) {
      sigRef.current.fromDataURL(value);
      setIsEmpty(false);
    }
  }, []);

  const handleEnd = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.toDataURL("image/png");
      onChange(dataUrl);
      setIsEmpty(false);
    }
  };

  const handleClear = () => {
    sigRef.current?.clear();
    onChange(null);
    setIsEmpty(true);
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      )}
      <div className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white relative">
        <ReactSignatureCanvas
          ref={sigRef}
          penColor="#1a1a2e"
          canvasProps={{
            className: "w-full touch-none",
            style: { height: 140, display: "block" },
          }}
          onEnd={handleEnd}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">Hier unterschreiben</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleClear} className="gap-1">
          <Trash2 size={13} />
          Löschen
        </Button>
        {!isEmpty && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check size={13} /> Unterschrift gespeichert
          </span>
        )}
      </div>
    </div>
  );
}
