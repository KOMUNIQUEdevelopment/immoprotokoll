import { useEffect, useRef, useCallback, useState } from "react";
import { ProtocolData } from "../types";

export type SyncStatus = "disconnected" | "connected" | "connecting";

export type SyncMessage =
  | { type: "update"; protocol: ProtocolData }
  | { type: "delete"; id: string };

export interface SyncError {
  code: string;
  message: string;
}

interface UseSyncOptions {
  onInit: (protocols: Record<string, ProtocolData>) => void;
  onUpdate: (protocol: ProtocolData) => void;
  onDelete: (id: string) => void;
  onError?: (err: SyncError) => void;
  sendRef: React.MutableRefObject<((msg: SyncMessage) => void) | null>;
}

export function useSync({ onInit, onUpdate, onDelete, onError, sendRef }: UseSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onInitRef = useRef(onInit);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const onErrorRef = useRef(onError);
  onInitRef.current = onInit;
  onUpdateRef.current = onUpdate;
  onDeleteRef.current = onDelete;
  onErrorRef.current = onError;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/api/sync`;

    setStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "init" && msg.protocols) {
          onInitRef.current(msg.protocols as Record<string, ProtocolData>);
        } else if (msg.type === "update" && msg.protocol) {
          onUpdateRef.current(msg.protocol as ProtocolData);
        } else if (msg.type === "delete" && msg.id) {
          onDeleteRef.current(msg.id as string);
        } else if (msg.type === "error" && msg.code) {
          onErrorRef.current?.({ code: msg.code as string, message: msg.message as string ?? msg.code });
        }
      } catch {}
    };

    ws.onclose = () => {
      setStatus("disconnected");
      wsRef.current = null;
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      sendRef.current = null;
    };
  }, [connect, sendRef]);

  useEffect(() => {
    sendRef.current = (msg: SyncMessage) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      try {
        wsRef.current.send(JSON.stringify(msg));
      } catch {}
    };
  }, [sendRef]);

  return { status };
}
