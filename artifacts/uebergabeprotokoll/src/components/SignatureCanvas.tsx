import React, { useRef, useLayoutEffect, useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Check } from "lucide-react";

interface SignatureCanvasProps {
  /** The confirmed, saved signature dataUrl (null = not yet signed). */
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

/**
 * Two-state signature widget:
 *
 * DRAWING STATE (value === null):
 *   Canvas is visible. User draws. A "Unterschrift bestätigen" button appears
 *   once something has been drawn.  Only when confirmed is onChange(dataUrl)
 *   called – so no partial / blank signatures ever propagate upwards.
 *
 * CONFIRMED STATE (value !== null):
 *   Canvas is hidden. The confirmed signature is shown as a static <img>.
 *   A trash icon lets the user delete → onChange(null) → back to drawing.
 */
export default function SignatureCanvasComponent({ value, onChange }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  // dataUrl of what the user has drawn but not yet confirmed
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = getCtx();
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Init canvas when switching into drawing mode (value is null).
  // Also handles the initial mount when value is null.
  useLayoutEffect(() => {
    if (value) return; // confirmed state – canvas not rendered

    const container = containerRef.current;
    if (!container) return;

    const { width } = container.getBoundingClientRect();
    if (width > 0) {
      initCanvas();
      return;
    }

    // Container has no layout yet (collapsed section etc.) – wait for resize.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          observer.disconnect();
          initCanvas();
          return;
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [value, initCanvas]);

  // When switching back to drawing mode (value cleared externally via WS sync
  // or delete), discard any previously pending drawing so the canvas is fresh.
  useEffect(() => {
    if (!value) setPendingUrl(null);
  }, [value]);

  // ── Pointer helpers ──────────────────────────────────────────────────────────

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
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    const me = e as React.MouseEvent<HTMLCanvasElement>;
    return { x: me.clientX - rect.left, y: me.clientY - rect.top };
  };

  const onStart = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    drawingRef.current = true;
    const pos = getPos(e);
    if (!pos) return;
    lastPos.current = pos;
    const ctx = getCtx();
    if (ctx) { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
  };

  const onMove = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!drawingRef.current) return;
    const pos = getPos(e);
    if (!pos) return;
    const ctx = getCtx();
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(lastPos.current?.x ?? pos.x, lastPos.current?.y ?? pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const onEnd = (
    e: React.TouchEvent<HTMLCanvasElement> | React.MouseEvent<HTMLCanvasElement>
  ) => {
    e.preventDefault();
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPos.current = null;

    const canvas = canvasRef.current;
    if (!canvas) return;
    // Capture current drawing as pending – NOT yet saved upstream.
    setPendingUrl(canvas.toDataURL("image/png"));
  };

  // ── Actions ──────────────────────────────────────────────────────────────────

  const onConfirm = () => {
    if (!pendingUrl) return;
    onChange(pendingUrl); // propagate confirmed signature to parent
    setPendingUrl(null);
  };

  const onDiscardDrawing = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    setPendingUrl(null);
  };

  const onDelete = () => {
    setPendingUrl(null);
    onChange(null); // triggers re-render → drawing mode, useLayoutEffect inits canvas
  };

  // ── CONFIRMED STATE ──────────────────────────────────────────────────────────

  if (value) {
    return (
      <div className="space-y-2">
        <div className="border border-border rounded-xl overflow-hidden bg-white">
          <img
            src={value}
            alt="Unterschrift"
            className="w-full object-contain"
            style={{ height: 120, padding: "8px 16px" }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-foreground font-medium">
            <Check size={13} />
            Unterschrift bestätigt
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 size={13} />
            Löschen
          </Button>
        </div>
      </div>
    );
  }

  // ── DRAWING STATE ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="border-2 border-dashed border-primary/30 rounded-xl overflow-hidden bg-white relative"
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
        {!pendingUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1">
            <p className="text-muted-foreground/60 text-sm">Hier unterschreiben</p>
            <p className="text-muted-foreground/40 text-xs">mit Finger oder Stift zeichnen</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {pendingUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDiscardDrawing}
            className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={13} />
            Verwerfen
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={!pendingUrl}
          onClick={onConfirm}
          className="gap-1.5 ml-auto"
        >
          <Check size={13} />
          Unterschrift bestätigen
        </Button>
      </div>
    </div>
  );
}
