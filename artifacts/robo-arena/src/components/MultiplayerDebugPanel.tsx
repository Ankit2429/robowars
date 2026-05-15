import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api-url";

interface DebugState {
  timestamp: string;
  connectedSocketCount: number;
  connectedSockets: Array<{
    id: string;
    playerName: string | null;
    inQueue: boolean;
    roomId: string | null;
    transport: string;
    connected: boolean;
  }>;
  matchQueue: Array<{
    socketId: string;
    playerName: string;
    robotId?: number;
  }>;
  matchQueueLength: number;
  rooms: Array<{
    id: string;
    status: string;
    players: Array<{
      socketId: string;
      playerName: string;
      hp: number;
    }>;
  }>;
  roomCount: number;
}

export function MultiplayerDebugPanel({ socket }: { socket: Socket | null }) {
  const [debugState, setDebugState] = useState<DebugState | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [mySocketId, setMySocketId] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!socket) {
      setSocketStatus("disconnected");
      return;
    }

    const onConnect = () => {
      setSocketStatus("connected");
      setMySocketId(socket.id || null);
      setError(null);
    };
    const onDisconnect = (reason: string) => {
      setSocketStatus("disconnected");
      setError(`Disconnected: ${reason}`);
    };
    const onConnectError = (err: Error) => {
      setSocketStatus("disconnected");
      setError(`Connect error: ${err.message}`);
    };
    const onDebugState = (state: DebugState) => {
      setDebugState(state);
      setLastUpdate(new Date().toLocaleTimeString());
    };

    if (socket.connected) {
      setSocketStatus("connected");
      setMySocketId(socket.id || null);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("debugState", onDebugState);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("debugState", onDebugState);
    };
  }, [socket]);

  // Also poll the REST debug endpoint every 5s as a fallback
  useEffect(() => {
    const poll = async () => {
      try {
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/debug/multiplayer`);
        const data = await res.json();
        if (data && data.timestamp) {
          setDebugState(data);
          setLastUpdate(new Date().toLocaleTimeString() + " (REST)");
        }
      } catch { /* ignore poll errors */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusColor = socketStatus === "connected" ? "#00ff88" : socketStatus === "connecting" ? "#ffaa00" : "#ff4444";

  return (
    <>
      {/* Floating connection indicator — always visible */}
      <div style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 9999,
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(0,0,0,0.85)", border: `1px solid ${statusColor}`,
        borderRadius: 8, padding: "6px 14px", fontFamily: "monospace", fontSize: 11,
        color: statusColor, cursor: "pointer",
        backdropFilter: "blur(10px)",
      }} onClick={() => setIsOpen(!isOpen)}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, boxShadow: `0 0 6px ${statusColor}` }} />
        {socketStatus.toUpperCase()}
        {mySocketId && <span style={{ color: "#888", marginLeft: 4 }}>{mySocketId.slice(0, 8)}</span>}
        <span style={{ color: "#666", marginLeft: 4 }}>{isOpen ? "▼" : "▲"}</span>
      </div>

      {/* Full debug panel */}
      {isOpen && (
        <div style={{
          position: "fixed", bottom: 56, right: 16, zIndex: 9998,
          width: 420, maxHeight: "60vh", overflowY: "auto",
          background: "rgba(0, 0, 0, 0.92)", border: "1px solid #333",
          borderRadius: 10, padding: 16, fontFamily: "monospace", fontSize: 11,
          color: "#ccc", backdropFilter: "blur(12px)",
          boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <span style={{ color: "#ff6600", fontWeight: "bold", fontSize: 13 }}>🔧 MULTIPLAYER DEBUG</span>
            <span style={{ color: "#666" }}>Updated: {lastUpdate}</span>
          </div>

          {error && (
            <div style={{ background: "rgba(255,0,0,0.15)", border: "1px solid #f44", borderRadius: 6, padding: 8, marginBottom: 10, color: "#f88" }}>
              ⚠ {error}
            </div>
          )}

          {/* Connection Info */}
          <Section title="CONNECTION">
            <Row label="Status" value={socketStatus} color={statusColor} />
            <Row label="My Socket ID" value={mySocketId || "—"} />
            <Row label="API URL" value={getApiUrl()} />
            <Row label="VITE_API_URL (raw)" value={String(import.meta.env.VITE_API_URL || "(not set)")} />
          </Section>

          {debugState ? (
            <>
              <Section title={`CONNECTED SOCKETS (${debugState.connectedSocketCount})`}>
                {debugState.connectedSockets.length === 0 && <div style={{ color: "#666" }}>None</div>}
                {debugState.connectedSockets.map(s => (
                  <div key={s.id} style={{
                    background: s.id === mySocketId ? "rgba(0,255,100,0.1)" : "rgba(255,255,255,0.03)",
                    border: s.id === mySocketId ? "1px solid rgba(0,255,100,0.3)" : "1px solid #222",
                    borderRadius: 6, padding: "6px 8px", marginBottom: 4,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: s.id === mySocketId ? "#0f8" : "#fff" }}>
                        {s.playerName || "anonymous"} {s.id === mySocketId ? "(YOU)" : ""}
                      </span>
                      <span style={{ color: "#666" }}>{s.transport}</span>
                    </div>
                    <div style={{ color: "#666", fontSize: 10 }}>
                      ID: {s.id} | Queue: {s.inQueue ? "✅" : "❌"} | Room: {s.roomId || "—"}
                    </div>
                  </div>
                ))}
              </Section>

              <Section title={`MATCH QUEUE (${debugState.matchQueueLength})`}>
                {debugState.matchQueue.length === 0 && <div style={{ color: "#666" }}>Empty — no players searching</div>}
                {debugState.matchQueue.map((q, i) => (
                  <div key={q.socketId} style={{
                    background: "rgba(255,165,0,0.1)", border: "1px solid #444",
                    borderRadius: 6, padding: "6px 8px", marginBottom: 4,
                  }}>
                    #{i + 1} — <span style={{ color: "#ffa500" }}>{q.playerName}</span>
                    <span style={{ color: "#666", marginLeft: 8 }}>({q.socketId.slice(0, 8)})</span>
                  </div>
                ))}
              </Section>

              <Section title={`ACTIVE ROOMS (${debugState.roomCount})`}>
                {debugState.rooms.length === 0 && <div style={{ color: "#666" }}>No active rooms</div>}
                {debugState.rooms.map(r => (
                  <div key={r.id} style={{
                    background: "rgba(0,200,255,0.05)", border: "1px solid #334",
                    borderRadius: 6, padding: "6px 8px", marginBottom: 4,
                  }}>
                    <div style={{ color: "#0cf" }}>{r.id.slice(0, 25)}...</div>
                    <div style={{ color: "#666", fontSize: 10 }}>Status: {r.status} | Players: {r.players.map(p => p.playerName).join(" vs ")}</div>
                  </div>
                ))}
              </Section>
            </>
          ) : (
            <div style={{ color: "#666", textAlign: "center", padding: 20 }}>
              Waiting for debug state from server...
            </div>
          )}
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: "#888", fontSize: 10, fontWeight: "bold", letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
      <span style={{ color: "#888" }}>{label}</span>
      <span style={{ color: color || "#fff" }}>{value}</span>
    </div>
  );
}
