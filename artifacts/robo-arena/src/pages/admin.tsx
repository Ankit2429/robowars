import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { io, Socket } from "socket.io-client";
import { getApiUrl } from "@/lib/api-url";

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authKey, setAuthKey] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  
  const [activeTab, setActiveTab] = useState<"roster" | "bracket" | "codes">("roster");
  
  const [players, setPlayers] = useState<any[]>([]);
  const [matchmakingActive, setMatchmakingActive] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [codes, setCodes] = useState<string[]>([]);
  const [newCode, setNewCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    document.body.classList.add('cyber-landing');
    if (isAuthenticated) {
      refreshData();
      
      const socket = io(getApiUrl(), {
        path: "/socket.io",
        transports: ["polling", "websocket"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        forceNew: true,
      });
      socketRef.current = socket;
      
      socket.on("queueUpdate", ({ count }) => {
        setQueueCount(count);
      });
    }
    return () => {
      document.body.classList.remove('cyber-landing');
      socketRef.current?.disconnect();
    };
  }, [isAuthenticated]);

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, playersRes] = await Promise.all([
        customFetch<any>("/api/settings"),
        customFetch<any[]>("/api/players")
      ]);
      setMatchmakingActive(settingsRes.matchmakingActive);
      setCodes(settingsRes.codes);
      setPlayers(playersRes);
    } catch (err) {
      console.error("[Admin] Failed to refresh data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authKey === "admin123") {
      setIsAuthenticated(true);
      setAuthMsg("");
    } else {
      setAuthMsg("Incorrect Security Key.");
    }
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCode && !codes.includes(newCode)) {
      try {
        await customFetch("/api/settings/codes", {
          method: "POST",
          body: JSON.stringify({ code: newCode, action: "add" })
        });
        setCodes([...codes, newCode]);
        setNewCode("");
      } catch (err) {
        console.error("[Admin] Failed to add code:", err);
      }
    }
  };

  const handleDeleteCode = async (codeToRemove: string) => {
    try {
      await customFetch("/api/settings/codes", {
        method: "POST",
        body: JSON.stringify({ code: codeToRemove, action: "remove" })
      });
      setCodes(codes.filter((c: string) => c !== codeToRemove));
    } catch (err) {
      console.error("[Admin] Failed to remove code:", err);
    }
  };

  const toggleMatchmaking = async () => {
    const newState = !matchmakingActive;
    try {
      await customFetch("/api/settings/matchmaking", {
        method: "POST",
        body: JSON.stringify({ active: newState })
      });
      setMatchmakingActive(newState);
    } catch (err) {
      console.error("[Admin] Failed to toggle matchmaking:", err);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="view active" style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
        {/* Cyberpunk Grid Background */}
        <div className="cyber-grid"></div>

        {/* Decorative Tech Elements */}
        <div className="cyber-deco deco-top-left">SYS.VER://3.04.9X</div>
        <div className="cyber-deco deco-bottom-right">STATUS://[ONLINE]</div>
        <div className="cyber-lines"></div>

        <div className="glass-panel form-container relative z-10">
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid var(--primary-dim)', paddingBottom: '1rem' }}>
            <Link href="/" className="nav-btn"><i className="fa-solid fa-home"></i> Home</Link>
          </div>
          <h2>Admin Authentication</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Security Key</label>
              <input className="robowars-input" type="password" value={authKey} onChange={e => setAuthKey(e.target.value)} required placeholder="Enter admin password (admin123)" />
            </div>
            <button type="submit" className="btn primary-btn">ACCESS PANEL</button>
          </form>
          {authMsg && <div className="message error">{authMsg}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="view active" style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
      {/* Cyberpunk Grid Background */}
      <div className="cyber-grid"></div>

      {/* Decorative Tech Elements */}
      <div className="cyber-deco deco-top-left">SYS.VER://3.04.9X</div>
      <div className="cyber-deco deco-bottom-right">STATUS://[ONLINE]</div>
      <div className="cyber-lines"></div>

      <div className="admin-layout relative z-10">
        <aside className="admin-sidebar glass-panel">
          <h3>Dashboard</h3>
          <ul className="admin-nav">
            <li className={activeTab === "roster" ? "active" : ""} onClick={() => setActiveTab("roster")}>Roster</li>
            <li className={activeTab === "bracket" ? "active" : ""} onClick={() => setActiveTab("bracket")}>Tournament Bracket</li>

          </ul>
          <div style={{ marginTop: '2rem', borderTop: '1px solid var(--primary-dim)', paddingTop: '1rem' }}>
            <Link href="/" className="nav-btn" style={{ width: '100%', textAlign: 'left', display: 'block' }}>
              <i className="fa-solid fa-home"></i> Home
            </Link>
          </div>
        </aside>
        
        <div className="admin-content glass-panel">
          {activeTab === "roster" && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Registered Players</h2>
                <button onClick={refreshData} className="btn" style={{ width: 'auto', fontSize: '0.8rem' }}>
                  {isLoading ? 'SYNCING...' : 'REFRESH LIST'}
                </button>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>USN</th>
                      <th>Branch</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p: any) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.usn}</td>
                        <td>{p.branch}</td>
                        <td><span style={{ background: 'var(--primary-dim)', color: 'var(--primary-color)', padding: '4px 8px', borderRadius: '4px' }}>{p.status}</span></td>
                      </tr>
                    ))}
                    {players.length === 0 && (
                      <tr><td colSpan={4} style={{ textAlign: 'center', color: '#666' }}>No players registered yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "bracket" && (
            <div>
              <div className="bracket-header">
                <h2>Tournament & Matchmaking</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="glass-panel" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--primary-dim)' }}>
                    <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>{queueCount}</span>
                    <span style={{ fontSize: '0.7rem', color: '#666', textTransform: 'uppercase' }}>Players Queued</span>
                  </div>
                  <button 
                    className={`btn ${matchmakingActive ? '' : 'primary-btn'}`} 
                    style={matchmakingActive ? { backgroundColor: '#e74c3c', color: 'white' } : {}}
                    onClick={toggleMatchmaking}
                  >
                    {matchmakingActive ? 'STOP MATCHMAKING' : 'START MATCHMAKING'}
                  </button>
                </div>
              </div>
              <div className="bracket-container">
                <p style={{ color: '#666', marginTop: '2rem' }}>[Bracket generation logic placeholder - players manage matches here]</p>
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
