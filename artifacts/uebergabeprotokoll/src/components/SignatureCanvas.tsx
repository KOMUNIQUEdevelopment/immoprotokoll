import React, { useRef, useLayoutEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Check } from "lucide-react";

interface SignatureCanvasProps {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}

export default function SignatureCanvasComponent({
  value,
  onChange,
  label,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [isEmpty, setIsEmpty] = React.useState(!value);

  // ── Canvas setup ────────────────────────────────────────────────────────────

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  /**
   * Resize the canvas buffer to match the container's CSS size multiplied by
   * the device pixel ratio.  Must be called once on mount (and after any
   * layout shift) so that strokes are drawn at the right coordinates on
   * high-DPR screens (Android / iOS retina).
   */
  const initCanvas = useCallback((restoreDataUrl?: string | null) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    // CSS size stays at the physical pixel size so the element fills the container
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = getCtx();
    if (!ctx) return;

    // Scale the context so every drawing command uses CSS-pixel coordinates
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Restore previous drawing if supplied
    if (restoreDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = restoreDataUrl;
    }
  }, []);

  useLayoutEffect(() => {
    // Try to init immediately; if the container has zero size (e.g. inside a
    // collapsed section), fall back to a ResizeObserver that fires once the
    // element becomes visible and has layout.
    const container = containerRef.current;
    if (!container) return;

    const { width } = container.getBoundingClientRect();
    if (width > 0) {
      initCanvas(value);
      if (value) setIsEmpty(false);
      return;
    }

    // Container not laid out yet – wait for first non-zero size
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          observer.disconnect();
          initCanvas(value);
          if (value) setIsEmpty(false);
          return;
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []); // run once after first render

  // ── Pointer helpers ─────────────────────────────────────────────────────────

  const getPos = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e || "changedTouches" in e) {
      const te = e as React.TouchEvent<HTMLCanvasElement>;
      const touch = te.touches[0] ?? te.changedTouches[0];
      if (!touch) return null;
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }

    const me = e as React.MouseEvent<HTMLCanvasElement>;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  };

  // ── Draw handlers ───────────────────────────────────────────────────────────

  const onStart = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    drawing.current = true;
    const pos = getPos(e);
    if (!pos) return;
    last.current = pos;
    const ctx = getCtx();
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const onMove = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!drawing.current) return;
    const pos = getPos(e);
    if (!pos) return;
    const ctx = getCtx();
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(last.current?.x ?? pos.x, last.current?.y ?? pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    last.current = pos;
  };

  const onEnd = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // toDataURL always captures the full canvas buffer at its native resolution
    const dataUrl = canvas.toDataURL("image/png");
    setIsEmpty(false);
    onChange(dataUrl);
  };

  const onClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) {
      // clearRect must cover the CSS-pixel area (context is scaled by DPR)
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    setIsEmpty(true);
    onChange(null);
  };

  return (
    <div className="space-y-2">
      {label && (
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
      )}
      <div
        ref={containerRef}
        className="border-2 border-dashed border-border rounded-lg overflow-hidden bg-white relative"
        style={{ height: 140 }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            touchAction: "none",
            cursor: "crosshair",
          }}
          onMouseDown={onStart}
          onMouseMove={onMove}
          onMouseUp={onEnd}
          onMouseLeave={onEnd}
          onTouchStart={onStart}
          onTouchMove={onMove}
          onTouchEnd={onEnd}
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground text-sm">Hier unterschreiben</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          className="gap-1"
        >
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
