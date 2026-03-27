import { useEffect, useRef, useCallback, useState } from "react";
import { ProtocolData } from "../types";

export type SyncStatus = "disconnected" | "connected" | "connecting";

interface UseSyncOptions {
  onReceive: (data: ProtocolData) => void;
  sendRef: React.MutableRefObject<((data: ProtocolData) => void) | null>;
}

export function useSync({ onReceive, sendRef }: UseSyncOptions) {
  const [status, setStatus] = useState<SyncStatus>("connecting");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReceiveRef = useRef(onReceive);
  onReceiveRef.current = onReceive;

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
        const remote = JSON.parse(event.data) as ProtocolData;
        onReceiveRef.current(remote);
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
    sendRef.current = (data: ProtocolData) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      try {
        wsRef.current.send(JSON.stringify(data));
      } catch {}
    };
  }, [sendRef]);

  return { status };
}
