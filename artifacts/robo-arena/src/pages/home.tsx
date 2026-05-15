import { Link } from "wouter";
import { useEffect } from "react";

export default function Home() {
  // Ensure background effects class is on body when visiting this page
  useEffect(() => {
    document.body.classList.add('cyber-landing');
    return () => {
      document.body.classList.remove('cyber-landing');
    };
  }, []);

  return (
    <div id="view-landing" className="view active" style={{ minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
      {/* Cyberpunk Grid Background */}
      <div className="cyber-grid"></div>

      {/* Decorative Tech Elements */}
      <div className="cyber-deco deco-top-left">SYS.VER://3.04.9X</div>
      <div className="cyber-deco deco-bottom-right">STATUS://[ONLINE]</div>
      <div className="cyber-lines"></div>

      <div className="hero-container flex-grow flex flex-col justify-center items-center">
        <h1 className="hero-title">
          <span className="text-white">ROBO</span><span className="text-red">WARS</span>
        </h1>
        <p className="hero-subtitle">
          <span className="text-white">FORGE. FIGHT. </span>
          <span className="text-red">DESTROY.</span>
        </p>

        <Link href="/portal">
          <button className="hero-btn cyber-btn">
            ENTER ARENA
            <span className="btn-glitch"></span>
          </button>
        </Link>

        <div className="terminal-text mt-8">
          &gt; Awaiting Challengers<span className="blinking-cursor">_</span>
        </div>
      </div>
    </div>
  );
}
