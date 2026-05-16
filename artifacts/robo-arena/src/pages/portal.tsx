import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { customFetch } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { Sword, User, Shield, GraduationCap, Code, ArrowLeft } from "lucide-react";

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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden">
      <div className="scanlines opacity-40" />
      <div className="crt-flicker" />
      
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] rounded-full bg-primary/10 blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-lg px-8 py-10 border border-primary/20 bg-black/60 backdrop-blur-xl rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-full bg-primary/20 border border-primary/40 mb-4">
            <Sword className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-display text-3xl font-black text-white uppercase tracking-widest">
            PLAYER <span className="text-primary">REGISTRATION</span>
          </h2>
          <p className="font-mono text-[10px] text-muted-foreground mt-2 tracking-widest opacity-60">
            ENROLLMENT PROTOCOL v3.0
          </p>
        </div>

        <form onSubmit={handleRegistration} className="space-y-5">
          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-primary block mb-1.5 font-bold flex items-center gap-2">
                <User className="h-3 w-3" /> Player Name
              </label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                placeholder="Enter your full name" 
                className="w-full bg-black/50 border border-white/10 focus:border-primary outline-none px-4 py-3 font-mono text-white text-sm transition-all rounded"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-primary block mb-1.5 font-bold flex items-center gap-2">
                <Shield className="h-3 w-3" /> USN (University Seat Number)
              </label>
              <input 
                type="text" 
                value={usn} 
                onChange={e => setUsn(e.target.value)} 
                required 
                placeholder="e.g. 2BA24ME001" 
                className="w-full bg-black/50 border border-white/10 focus:border-primary outline-none px-4 py-3 font-mono text-white text-sm transition-all rounded uppercase"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-primary block mb-1.5 font-bold flex items-center gap-2">
                <GraduationCap className="h-3 w-3" /> Branch
              </label>
              <select 
                value={branch} 
                onChange={e => setBranch(e.target.value)} 
                required
                className="w-full bg-black/50 border border-white/10 focus:border-primary outline-none px-4 py-3 font-mono text-white text-sm transition-all rounded appearance-none"
              >
                <option value="">Select Branch</option>
                <option value="CSE">Computer Science</option>
                <option value="ECE">Electronics</option>
                <option value="ME">Mechanical</option>
                <option value="EEE">Electrical</option>
                <option value="ISE">Information Science</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[10px] uppercase tracking-widest text-primary block mb-1.5 font-bold flex items-center gap-2">
                <Code className="h-3 w-3" /> Access Code
              </label>
              <input 
                type="text" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
                required 
                placeholder="Enter bot123" 
                className="w-full bg-black/50 border border-white/10 focus:border-primary outline-none px-4 py-3 font-mono text-white text-sm transition-all rounded"
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="w-full py-4 font-display font-black text-lg uppercase tracking-widest border-2 border-primary text-primary bg-primary/5 hover:bg-primary hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(255,69,0,0.1)] hover:shadow-[0_0_30px_rgba(255,69,0,0.4)] mt-4"
          >
            REGISTER FOR BATTLE
          </button>
        </form>

        {message.text && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`mt-6 p-4 border rounded font-mono text-[10px] text-center uppercase tracking-widest ${message.type === 'success' ? 'border-green-500/30 bg-green-500/10 text-green-500' : 'border-red-500/30 bg-red-500/10 text-red-500'}`}
          >
            {message.text}
          </motion.div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center">
          <Link href="/" className="font-mono text-[9px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-[0.2em] flex items-center gap-2 group">
            <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" /> Back
          </Link>
          <Link href="/admin" className="font-mono text-[9px] text-muted-foreground hover:text-primary transition-colors uppercase tracking-[0.2em] flex items-center gap-2 group">
            Admin Access <Shield className="h-3 w-3 opacity-50" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
