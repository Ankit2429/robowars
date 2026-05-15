import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { customFetch } from "@workspace/api-client-react";

// Shared Mock DB logic to replicate app.js behavior
export function useMockDB() {
  const STORAGE_KEY = 'robo_wars_data';
  const loadDB = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { players: [], codes: ['BATTLE24', 'ROBOCODE'], bracket: [], matchmakingActive: false };
  };
  const saveDB = (db: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  };
  return { loadDB, saveDB };
}

export default function Portal() {
  const [, setLocation] = useLocation();
  const { loadDB, saveDB } = useMockDB();
  const [name, setName] = useState("");
  const [usn, setUsn] = useState("");
  const [branch, setBranch] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    document.body.classList.add('cyber-landing');
    return () => {
      document.body.classList.remove('cyber-landing');
    };
  }, []);

  const handleRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await customFetch<any>("/api/players/register", {
        method: "POST",
        body: JSON.stringify({ name, usn, branch, code }),
      });
      
      console.log("[Portal] Registration successful:", response);
      setMessage({ text: "Registration Successful! System Access Granted.", type: "success" });
      setTimeout(() => {
        setLocation("/play");
      }, 1500);
    } catch (err: any) {
      console.error("[Portal] Registration failed:", err);
      setMessage({ 
        text: err.data?.error || "Registration failed. Please check your connection or access code.", 
        type: "error" 
      });
    }
  };

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
          <h2>Player Registration</h2>
          <form onSubmit={handleRegistration}>
            <div className="input-group">
              <label>Player Name</label>
              <input className="robowars-input" type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Enter your full name" />
            </div>
            <div className="input-group">
              <label>USN (University Seat Number)</label>
              <input className="robowars-input" type="text" value={usn} onChange={e => setUsn(e.target.value)} required placeholder="e.g. 2BA24ME001" />
            </div>
            <div className="input-group">
              <label>Branch</label>
              <select className="robowars-select" value={branch} onChange={e => setBranch(e.target.value)} required>
                <option value="">Select Branch</option>
                <option value="CSE">Computer Science</option>
                <option value="ECE">Electronics</option>
                <option value="ME">Mechanical</option>
                <option value="EEE">Electrical</option>
                <option value="ISE">Information Science</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="input-group">
              <label>Access Code</label>
              <input className="robowars-input" type="text" value={code} onChange={e => setCode(e.target.value)} required placeholder="Enter admin provided code" />
            </div>
            <button type="submit" className="btn primary-btn">REGISTER FOR BATTLE</button>
          </form>
          {message.text && (
            <div className={`message ${message.type}`}>{message.text}</div>
          )}
          <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--primary-dim)', paddingTop: '1rem' }}>
            <Link href="/admin" className="nav-btn" style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)' }}>Admin Panel <i className="fa-solid fa-lock"></i></Link>
          </div>
        </div>
    </div>
  );
}
