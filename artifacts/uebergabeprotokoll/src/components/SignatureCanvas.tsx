import React, { useRef, useLayoutEffect, useEffect, useCallback } from "react";
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

  // Whether the user has drawn on this canvas instance themselves.
  // External value changes (WS sync) are only applied when this is false.
  const drawnByUser = useRef(false);

  // Last value that was painted onto the canvas so we can detect real changes.
  const appliedValue = useRef<string | null>(null);

  // ── Canvas setup ─────────────────────────────────────────────────────────────

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  /**
   * (Re-)initialise the canvas: resize the buffer to container × DPR, reset
   * the context transform, configure stroke style, and optionally draw
   * `restoreDataUrl` into the fresh canvas.
   *
   * Setting canvas.width resets every context state, so calling this a second
   * time is safe – it starts with a clean slate.
   */
  const initCanvas = useCallback((restoreDataUrl?: string | null) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;

    // Setting width/height resets the canvas buffer AND the context transform.
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

    if (restoreDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, width, height);
      img.src = restoreDataUrl;
    }
  }, []);

  // ── Mount: size the canvas (handles lazy layout inside collapsed sections) ──

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const { width } = container.getBoundingClientRect();
    if (width > 0) {
      initCanvas(value);
      appliedValue.current = value ?? null;
      if (value) setIsEmpty(false);
      return;
    }

    // Container has no layout yet (e.g. inside a collapsed CollapsibleSection).
    // Wait until it becomes visible before initialising.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          observer.disconnect();
          initCanvas(value);
          appliedValue.current = value ?? null;
          if (value) setIsEmpty(false);
          return;
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only once on mount

  // ── Sync: update canvas when `value` prop changes after mount (WS sync) ─────

  useEffect(() => {
    // Ignore if the value hasn't actually changed since we last painted it.
    if (value === appliedValue.current) return;

    // Don't overwrite something the user drew themselves in this session.
    if (drawnByUser.current) return;

    appliedValue.current = value ?? null;

    if (!value) {
      // External clear (e.g. someone deleted the signature).
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (canvas && ctx) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      }
      setIsEmpty(true);
      return;
    }

    // Re-initialise with the new value so the canvas is sized correctly for
    // the current container dimensions and the image fills it properly.
    initCanvas(value);
    setIsEmpty(false);
  }, [value, initCanvas]);

  // ── Pointer helpers ───────────────────────────────────────────────────────────

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

  // ── Draw handlers ─────────────────────────────────────────────────────────────

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

    drawnByUser.current = true;
    const dataUrl = canvas.toDataURL("image/png");
    appliedValue.current = dataUrl;
    setIsEmpty(false);
    onChange(dataUrl);
  };

  const onClear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (canvas && ctx) {
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    drawnByUser.current = false; // allow external value changes again
    appliedValue.current = null;
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
