import React from 'react';

// Utility Components
const HexBolt = ({ cx, cy, r=2 }: { cx: number, cy: number, r?: number }) => (
  <polygon points={`${cx},${cy-r} ${cx+r*0.866},${cy-r/2} ${cx+r*0.866},${cy+r/2} ${cx},${cy+r} ${cx-r*0.866},${cy+r/2} ${cx-r*0.866},${cy-r/2}`} fill="#111" />
);

const ScanlineRect = ({ x, y, w, h }: { x: number|string, y: number|string, w: number|string, h: number|string }) => (
  <rect x={x} y={y} width={w} height={h} fill="url(#scanlinePattern)" />
);

// CHASSIS
const Titan = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full relative">
    <rect x="15" y="10" width="70" height="80" fill="#2a2a2a" rx="4" />
    {/* Corner plates */}
    <rect x="10" y="5" width="25" height="25" fill="#1a1a1a" rx="2" />
    <rect x="65" y="5" width="25" height="25" fill="#1a1a1a" rx="2" />
    <rect x="10" y="70" width="25" height="25" fill="#1a1a1a" rx="2" />
    <rect x="65" y="70" width="25" height="25" fill="#1a1a1a" rx="2" />
    {/* Hex bolts */}
    <HexBolt cx={15} cy={10} /><HexBolt cx={30} cy={10} />
    <HexBolt cx={70} cy={10} /><HexBolt cx={85} cy={10} />
    <HexBolt cx={15} cy={85} /><HexBolt cx={30} cy={85} />
    <HexBolt cx={70} cy={85} /><HexBolt cx={85} cy={85} />
    {/* Scratch lines */}
    <path d="M25 20 L45 40 M60 30 L80 50 M20 60 L50 90" stroke="#444" strokeWidth="1" />
    {/* Rust patches */}
    <polygon points="30,50 35,55 28,60" fill="#8B4513" opacity="0.6" />
    {/* Exhaust vents */}
    <rect x="40" y="85" width="20" height="3" fill="#000" className="animate-smoke" />
    <rect x="40" y="90" width="20" height="3" fill="#000" className="animate-smoke" />
    <ScanlineRect x="15" y="10" w="70" h="80" />
    {/* Glint line */}
    <line x1="15" y1="10" x2="85" y2="90" stroke="#fff" strokeWidth="2" strokeDasharray="100 100" className="animate-glint" />
  </svg>
);

const Wasp = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full animate-bob">
    <polygon points="50,5 85,90 15,90" fill="#1a1a1a" />
    <polygon points="50,10 75,85 25,85" fill="url(#carbonPattern)" />
    <polygon points="45,15 55,15 65,85 35,85" fill="#ffd700" />
    <line x1="50" y1="5" x2="85" y2="90" stroke="#fff" strokeWidth="1" strokeDasharray="100 100" className="animate-glint" />
  </svg>
);

const Goliath = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <rect x="20" y="15" width="60" height="70" fill="#222" rx="6" />
    <rect x="20" y="45" width="60" height="10" fill="#ff4500" />
    <rect x="10" y="25" width="10" height="50" fill="#888" className="animate-piston" />
    <circle cx="15" cy="25" r="5" fill="#ddd" />
    <rect x="80" y="25" width="10" height="50" fill="#888" className="animate-piston" />
    <circle cx="85" cy="25" r="5" fill="#ddd" />
    <ScanlineRect x="20" y="15" w="60" h="70" />
  </svg>
);

const Phantom = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full animate-bob" style={{ animationDuration: '4s' }}>
    <polygon points="50,10 80,40 60,90 40,90 20,40" fill="#0f0f0f" />
    <path d="M50 10 L80 40 L60 90" stroke="#00d4ff" strokeWidth="2" fill="none" className="animate-glow-cyan" opacity="0.6" />
    <path d="M50 10 L20 40 L40 90" stroke="#00d4ff" strokeWidth="2" fill="none" className="animate-glow-cyan" opacity="0.6" />
  </svg>
);

const Fortress = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <rect x="15" y="15" width="70" height="70" fill="#333" />
    <rect x="10" y="20" width="80" height="15" fill="#444" transform="rotate(2 50 27)" />
    <rect x="10" y="40" width="80" height="15" fill="#555" transform="rotate(-2 50 47)" />
    <rect x="10" y="60" width="80" height="15" fill="#444" transform="rotate(1 50 67)" />
    <rect x="25" y="30" width="50" height="5" fill="#ff2244" />
    <rect x="25" y="70" width="50" height="5" fill="#ff2244" />
    <rect x="40" y="85" width="20" height="5" fill="#111" className="animate-smoke" />
  </svg>
);

const Viper = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full animate-bob" style={{ animationDuration: '1.5s' }}>
    <polygon points="50,5 65,40 60,95 40,95 35,40" fill="#222" />
    <polygon points="50,5 65,40 60,95 40,95 35,40" fill="url(#snakePattern)" opacity="0.5" />
    <polyline points="50,5 65,40 60,95" stroke="#39ff14" strokeWidth="2" fill="none" className="animate-glow-cyan" style={{ filter: 'drop-shadow(0 0 4px #39ff14)' }} />
    <polyline points="50,5 35,40 40,95" stroke="#39ff14" strokeWidth="2" fill="none" className="animate-glow-cyan" style={{ filter: 'drop-shadow(0 0 4px #39ff14)' }} />
  </svg>
);

const Colossus = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <rect x="5" y="25" width="90" height="50" fill="#333" />
    <rect x="0" y="35" width="15" height="30" fill="#555" className="animate-piston" />
    <rect x="85" y="35" width="15" height="30" fill="#555" className="animate-piston" />
    <path d="M15 30 L85 70 M15 70 L85 30" stroke="#222" strokeWidth="1" />
    <circle cx="50" cy="50" r="15" fill="#111" />
    <circle cx="50" cy="50" r="10" fill="#ff4500" className="animate-smoke" />
  </svg>
);

const Wraith = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full animate-bob">
    <rect x="20" y="10" width="60" height="80" fill="none" stroke="#444" strokeWidth="4" />
    <rect x="30" y="20" width="40" height="60" fill="none" stroke="#555" strokeWidth="2" />
    <circle cx="50" cy="50" r="15" fill="none" stroke="#666" strokeWidth="2" className="animate-spin-slow" />
    <circle cx="50" cy="50" r="10" fill="#0088ff" className="animate-glow-cyan" />
    <path d="M50 20 L50 40 M50 60 L50 80 M30 50 L40 50 M60 50 L70 50" stroke="#0088ff" strokeWidth="2" className="animate-glow-cyan" />
  </svg>
);

const Bulwark = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <path d="M10 50 A 40 40 0 0 1 90 50 L90 90 L10 90 Z" fill="#444" />
    <path d="M20 50 A 30 30 0 0 1 80 50" stroke="#666" strokeWidth="4" fill="none" />
    <path d="M30 50 A 20 20 0 0 1 70 50" stroke="#888" strokeWidth="4" fill="none" />
    <rect x="10" y="60" width="80" height="10" fill="#ff2244" />
    <rect x="20" y="60" width="10" height="10" fill="#000" />
    <rect x="40" y="60" width="10" height="10" fill="#000" />
    <rect x="60" y="60" width="10" height="10" fill="#000" />
    <path d="M10 50 A 40 40 0 0 1 90 50 L90 90 L10 90 Z" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="50 200" className="animate-glint" />
  </svg>
);

const Lynx = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full animate-bob">
    <path d="M30 10 C 50 -10, 70 10, 80 40 C 90 70, 70 90, 50 95 C 30 90, 10 70, 20 40 Z" fill="#C8A050" />
    <circle cx="40" cy="30" r="3" fill="#111" />
    <circle cx="45" cy="35" r="2" fill="#111" />
    <circle cx="60" cy="40" r="4" fill="#111" />
    <circle cx="55" cy="48" r="2.5" fill="#111" />
    <circle cx="40" cy="60" r="3.5" fill="#111" />
    <path d="M30 10 C 50 -10, 70 10, 80 40" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="30 150" className="animate-glint animate-spin-fast" />
  </svg>
);

const Rhino = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <polygon points="30,30 70,30 85,90 15,90" fill="#444" />
    <polygon points="30,30 50,5 70,30" fill="#666" />
    <polygon points="45,5 50,0 55,5" fill="#eee" className="animate-glint" />
    <rect x="15" y="40" width="10" height="40" fill="#333" />
    <rect x="75" y="40" width="10" height="40" fill="#333" />
    <rect x="35" y="80" width="30" height="10" fill="#111" className="animate-smoke" />
  </svg>
);

const Shadow = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full animate-bob">
    <rect x="25" y="10" width="50" height="80" fill="#1a1a2e" opacity="0.25" stroke="#fff" strokeWidth="1" strokeDasharray="5 5" />
    <circle cx="50" cy="25" r="5" fill="#ff0000" className="animate-glow-orange" />
  </svg>
);

// WEAPONS (PRIMARY)
const TitanDisc = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <g className="animate-spin-fast hover:animate-spin">
      <circle cx="50" cy="50" r="40" fill="#333" />
      {Array.from({ length: 8 }).map((_, i) => (
        <polygon key={i} points="45,10 55,10 50,0" fill="#555" transform={`rotate(${i * 45} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="15" fill="#aaa" />
      <circle cx="50" cy="50" r="40" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="20 200" className="animate-glint" />
    </g>
  </svg>
);

const Hammerhead = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full animate-hammer">
    <rect x="45" y="40" width="10" height="60" fill="#444" />
    <rect x="38" y="50" width="4" height="40" fill="#888" className="animate-piston" />
    <rect x="58" y="50" width="4" height="40" fill="#888" className="animate-piston" />
    <rect x="20" y="20" width="60" height="20" fill="#333" />
    <line x1="25" y1="20" x2="35" y2="40" stroke="#111" strokeWidth="2" />
    <ellipse cx="40" cy="60" rx="3" ry="5" fill="#3e2723" />
    <ellipse cx="60" cy="70" rx="2" ry="4" fill="#3e2723" />
  </svg>
);

// WEAPONS (SECONDARY)
const Flamethrower = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full">
    <rect x="35" y="40" width="10" height="50" fill="#333" />
    <rect x="55" y="40" width="10" height="50" fill="#333" />
    <rect x="25" y="50" width="10" height="30" fill="#555" rx="5" className="animate-piston" />
    <rect x="65" y="50" width="10" height="30" fill="#555" rx="5" className="animate-piston" />
    <path d="M30 40 Q 40 0 50 40" fill="#ff4500" opacity="0.8" className="animate-flame" />
    <path d="M50 40 Q 60 0 70 40" fill="#ff4500" opacity="0.8" className="animate-flame" style={{ animationDelay: '0.2s' }} />
  </svg>
);

// DEFENSE
const TitaniumShell = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full animate-shield">
    <path d="M10 20 Q 50 0 90 20 L90 80 Q 50 100 10 80 Z" fill="#aaa" />
    <path d="M10 20 Q 50 0 90 20 L90 80 Q 50 100 10 80 Z" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="50 200" className="animate-glint" />
  </svg>
);

// MAPPING OBJECT
export const SVGS: Record<string, React.FC> = {
  // Chassis
  "body-titan": Titan,
  "body-wasp": Wasp,
  "body-goliath": Goliath,
  "body-phantom": Phantom,
  "body-fortress": Fortress,
  "body-viper": Viper,
  "body-colossus": Colossus,
  "body-wraith": Wraith,
  "body-bulwark": Bulwark,
  "body-lynx": Lynx,
  "body-rhino": Rhino,
  "body-shadow": Shadow,
  
  // Attack (Primary)
  "attack-titan-disc": TitanDisc,
  "attack-hammerhead": Hammerhead,
  "attack-vertical-spinner": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-fast"><circle cx="50" cy="50" r="40" fill="#222"/><line x1="50" y1="10" x2="50" y2="0" stroke="#ff4500" strokeWidth="4" className="animate-glow-orange" /></svg>,
  "attack-lifter-fork": () => <svg viewBox="0 0 100 100" className="w-full h-full"><rect x="30" y="20" width="10" height="70" fill="#999"/><rect x="60" y="20" width="10" height="70" fill="#999"/></svg>,
  "attack-flail-chain": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-chain"><rect x="40" y="0" width="20" height="20" fill="#444"/><circle cx="50" cy="80" r="15" fill="#333"/></svg>,
  "attack-crusher-claw": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-piston"><path d="M20 20 Q 50 0 80 20" fill="none" stroke="#dc143c" strokeWidth="10"/></svg>,
  "attack-horizontal-spinner": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-fast"><rect x="10" y="45" width="80" height="10" fill="#555"/></svg>,
  "attack-spike-ramrod": () => <svg viewBox="0 0 100 100" className="w-full h-full"><polygon points="40,90 60,90 50,10" fill="#666"/></svg>,
  "attack-pneumatic-lance": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-piston"><rect x="40" y="40" width="20" height="50" fill="#444"/><polygon points="45,40 55,40 50,0" fill="#87ceeb"/></svg>,
  "attack-drum-spinner": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-fast"><rect x="20" y="30" width="60" height="40" fill="#808080"/></svg>,
  "attack-wedge-slicer": () => <svg viewBox="0 0 100 100" className="w-full h-full"><polygon points="20,90 80,90 50,10" fill="#e8e8e8"/></svg>,
  "attack-plasma-torch": () => <svg viewBox="0 0 100 100" className="w-full h-full"><rect x="40" y="50" width="20" height="50" fill="#222"/><path d="M45 50 Q 50 0 55 50" fill="#00ced1" className="animate-flame"/></svg>,

  // Defense
  "defense-titanium-shell": TitaniumShell,
  "defense-reactive-panels": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-shield"><rect x="20" y="20" width="60" height="60" fill="#8b0000"/><circle cx="50" cy="50" r="5" fill="#f00" className="animate-glow-orange"/></svg>,
  "defense-carbon-weave": () => <svg viewBox="0 0 100 100" className="w-full h-full"><rect x="10" y="10" width="80" height="80" fill="#2f4f4f"/></svg>,
  "defense-ceramic-composite": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-shield"><rect x="10" y="10" width="80" height="80" fill="#f5f5dc"/><path d="M10 50 L90 50" stroke="#ff8800" strokeWidth="2" className="animate-glow-orange"/></svg>,
  "defense-steel-fortress-wrap": () => <svg viewBox="0 0 100 100" className="w-full h-full"><rect x="10" y="10" width="80" height="80" fill="#696969" stroke="#333" strokeWidth="4"/></svg>,
  "defense-ablative-foam": () => <svg viewBox="0 0 100 100" className="w-full h-full"><circle cx="50" cy="50" r="40" fill="#a9a9a9"/></svg>,
  "defense-polycarbonate-shield": () => <svg viewBox="0 0 100 100" className="w-full h-full"><rect x="10" y="10" width="80" height="80" fill="#87ceeb" opacity="0.3" stroke="#fff" strokeWidth="4"/></svg>,
  "defense-self-healing-polymer": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-shield"><rect x="10" y="10" width="80" height="80" fill="#00fa9a" opacity="0.8"/></svg>,
  "defense-chain-mail-skirt": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-chain"><rect x="10" y="10" width="80" height="80" fill="#9e9e9e" strokeDasharray="4 4" stroke="#555" strokeWidth="4"/></svg>,
  "defense-deflector-wedge": () => <svg viewBox="0 0 100 100" className="w-full h-full"><polygon points="10,90 90,90 50,10" fill="#e8e8e8"/></svg>,
  "defense-nano-ceramic": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-shield"><rect x="10" y="10" width="80" height="80" fill="#7b68ee"/></svg>,
  "defense-iron-fortress": () => <svg viewBox="0 0 100 100" className="w-full h-full"><rect x="20" y="20" width="60" height="60" fill="#4a4a4a" stroke="#111" strokeWidth="8"/></svg>,

  // Secondary
  "secondary-flamethrower": Flamethrower,
  "secondary-emp-pulse": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-arc"><circle cx="50" cy="50" r="40" fill="none" stroke="#00d4ff" strokeWidth="4" className="animate-glow-cyan"/></svg>,
  "secondary-smoke-screen": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-smoke"><circle cx="50" cy="50" r="30" fill="#555" opacity="0.8"/></svg>,
  "secondary-self-righting-arm": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-piston"><rect x="40" y="20" width="20" height="80" fill="#aaa"/></svg>,
  "secondary-sawblade-side": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-fast"><circle cx="50" cy="50" r="40" fill="#888" stroke="#333" strokeDasharray="10 10" strokeWidth="10"/></svg>,
  "secondary-net-launcher": () => <svg viewBox="0 0 100 100" className="w-full h-full"><rect x="30" y="30" width="40" height="40" fill="#444"/><line x1="30" y1="30" x2="70" y2="70" stroke="#fff" strokeWidth="2"/></svg>,
  "secondary-spike-mine": () => <svg viewBox="0 0 100 100" className="w-full h-full"><circle cx="50" cy="50" r="20" fill="#222"/><polygon points="50,10 55,30 45,30" fill="#fff"/></svg>,
  "secondary-wedge-ram": () => <svg viewBox="0 0 100 100" className="w-full h-full"><polygon points="30,90 70,90 50,40" fill="#ddd"/></svg>,
  "secondary-taser-prongs": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-arc"><rect x="30" y="40" width="10" height="60" fill="#00ffff"/><rect x="60" y="40" width="10" height="60" fill="#00ffff"/></svg>,
  "secondary-drill": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-drill"><polygon points="30,90 70,90 50,10" fill="#777"/></svg>,
  "secondary-grinder": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-fast"><circle cx="50" cy="50" r="35" fill="#666"/></svg>,
  "secondary-concussion-cannon": () => <svg viewBox="0 0 100 100" className="w-full h-full animate-piston"><rect x="30" y="20" width="40" height="80" fill="#333"/></svg>,
};

// Main Export Component
export function ComponentSvg({ id }: { id?: string }) {
  if (!id || !SVGS[id]) {
    return <svg viewBox="0 0 100 100" className="w-full h-full"><rect width="100" height="100" fill="#222" /><text x="50" y="50" fill="#555" textAnchor="middle" dominantBaseline="middle" fontFamily="Share Tech Mono">NO DATA</text></svg>;
  }
  const SvgObj = SVGS[id];
  return (
    <>
      <svg width="0" height="0" className="absolute">
        <defs>
          <pattern id="scanlinePattern" width="10" height="4" patternUnits="userSpaceOnUse">
            <rect width="10" height="2" fill="rgba(0,0,0,0.15)" />
          </pattern>
          <pattern id="carbonPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M0 10 L10 0 M-2 2 L2 -2 M8 12 L12 8" stroke="#111" strokeWidth="2" />
          </pattern>
          <pattern id="snakePattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <ellipse cx="5" cy="5" rx="5" ry="3" fill="none" stroke="#111" strokeWidth="1" />
          </pattern>
        </defs>
      </svg>
      <SvgObj />
    </>
  );
}
