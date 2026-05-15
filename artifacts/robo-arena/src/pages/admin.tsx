import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useMockDB } from "./portal";

export default function Admin() {
  const { loadDB, saveDB } = useMockDB();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authKey, setAuthKey] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  
  const [activeTab, setActiveTab] = useState<"roster" | "bracket" | "codes">("roster");
  
  const [db, setDb] = useState(loadDB());
  const [newCode, setNewCode] = useState("");

  useEffect(() => {
    document.body.classList.add('cyber-landing');
    return () => {
      document.body.classList.remove('cyber-landing');
    };
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authKey === "admin123") {
      setIsAuthenticated(true);
      setAuthMsg("");
    } else {
      setAuthMsg("Incorrect Security Key.");
    }
  };

  const syncDB = (newDb: any) => {
    saveDB(newDb);
    setDb(newDb);
  };

  const handleAddCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCode && !db.codes.includes(newCode)) {
      const updated = { ...db, codes: [...db.codes, newCode] };
      syncDB(updated);
      setNewCode("");
    }
  };

  const handleDeleteCode = (codeToRemove: string) => {
    const updated = { ...db, codes: db.codes.filter((c: string) => c !== codeToRemove) };
    syncDB(updated);
  };

  const toggleMatchmaking = () => {
    const updated = { ...db, matchmakingActive: !db.matchmakingActive };
    syncDB(updated);
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
            <li className={activeTab === "codes" ? "active" : ""} onClick={() => setActiveTab("codes")}>Access Codes</li>
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
              <h2>Registered Players</h2>
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
                    {db.players.map((p: any) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td>{p.usn}</td>
                        <td>{p.branch}</td>
                        <td><span style={{ background: 'var(--primary-dim)', color: 'var(--primary-color)', padding: '4px 8px', borderRadius: '4px' }}>{p.status}</span></td>
                      </tr>
                    ))}
                    {db.players.length === 0 && (
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
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button 
                    className={`btn ${db.matchmakingActive ? '' : 'primary-btn'}`} 
                    style={db.matchmakingActive ? { backgroundColor: '#e74c3c', color: 'white' } : {}}
                    onClick={toggleMatchmaking}
                  >
                    {db.matchmakingActive ? 'STOP MATCHMAKING' : 'START MATCHMAKING'}
                  </button>
                </div>
              </div>
              <div className="bracket-container">
                <p style={{ color: '#666', marginTop: '2rem' }}>[Bracket generation logic placeholder - players manage matches here]</p>
              </div>
            </div>
          )}

          {activeTab === "codes" && (
            <div>
              <h2>Manage Access Codes</h2>
              <p style={{ marginBottom: '1rem' }}>Create codes that players must use to register.</p>
              <form onSubmit={handleAddCode} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <input className="robowars-input" type="text" value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="New Access Code" required style={{ flex: 1 }} />
                <button type="submit" className="btn primary-btn" style={{ width: 'auto' }}>Add Code</button>
              </form>
              <div className="codes-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {db.codes.map((c: string) => (
                  <div key={c} className="code-item" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--primary-dim)', padding: '1rem', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ background: 'var(--primary-color)', color: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>{c}</span>
                    <button onClick={() => handleDeleteCode(c)} style={{ background: 'transparent', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '4px', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>Remove</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
