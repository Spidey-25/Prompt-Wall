import { io, type Socket } from "socket.io-client";
import type {
  AuditEvent,
  FinalResponse,
  SecurityDecision,
  WorkflowStage,
} from "@/types";

/**
 * Socket.IO client for live pipeline events.
 *
 * Per the gateway rules:
 *  - Connect to the SAME origin (relative path "/"), never to a direct port.
 *  - If the backend socket.io service is on a non-default port, append
 *    ?XTransformPort=<port> to the path so Caddy forwards correctly.
 *  - Set NEXT_PUBLIC_SOCKET_PORT to enable forwarding; otherwise the client
 *    falls back to a null socket so the UI runs in mock mode.
 */
const SOCKET_PORT = process.env.NEXT_PUBLIC_SOCKET_PORT ?? "";

let socket: Socket | null = null;

export type PipelineEventListener = (event: {
  runId: string;
  stage?: WorkflowStage;
  decision?: SecurityDecision;
  audit?: AuditEvent;
  finalResponse?: FinalResponse;
}) => void;

export function getSocket(): Socket | null {
  if (socket) return socket;
  if (!SOCKET_PORT) {
    // No backend configured — return null so the UI can run in mock mode.
    return null;
  }
  // Relative path "/" + XTransformPort query — Caddy forwards to the port.
  const path = `/?XTransformPort=${SOCKET_PORT}`;
  socket = io(path, {
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1500,
  });

  socket.on("connect", () => {
    console.info("[socket] connected:", socket?.id);
  });
  socket.on("disconnect", (reason: string) => {
    console.warn("[socket] disconnected:", reason);
  });
  socket.on("connect_error", (err: Error) => {
    console.warn("[socket] connect_error:", err.message);
  });

  return socket;
}

export function subscribeToPipeline(cb: PipelineEventListener): () => void {
  const s = getSocket();
  if (!s) return () => {};
  const handler = (payload: Parameters<PipelineEventListener>[0]) => cb(payload);
  s.on("pipeline:event", handler);
  return () => {
    s.off("pipeline:event", handler);
  };
}
