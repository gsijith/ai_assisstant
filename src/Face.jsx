import { useState, useEffect } from 'react';

const MOODS = ['LISTENING', 'ANALYZING', 'IDLE', 'RESPONDING'];

export default function Face() {
  const [blink, setBlink] = useState(false);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [waveform, setWaveform] = useState(Array(24).fill(0.3));
  const [mood, setMood] = useState(MOODS[0]);

  // Blink at random intervals
  useEffect(() => {
    let timeout;
    const scheduleBlink = () => {
      timeout = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        scheduleBlink();
      }, 2500 + Math.random() * 3000);
    };
    scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Eye darting
  useEffect(() => {
    const id = setInterval(() => {
      setLook({
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 6,
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  // Mouth waveform pulse
  useEffect(() => {
    const id = setInterval(() => {
      setWaveform(
        Array.from({ length: 24 }, (_, i) => {
          // Bias center bars taller for natural mouth shape
          const dist = Math.abs(i - 11.5) / 11.5;
          return (0.2 + Math.random() * 0.8) * (1 - dist * 0.4);
        })
      );
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Cycle moods
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % MOODS.length;
      setMood(MOODS[i]);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  return (
    <svg
      viewBox="0 0 400 500"
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#ffd9a8" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#ff8a1a" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ff6611" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="ambient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff8a1a" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#ff6611" stopOpacity="0" />
        </radialGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Ambient face glow */}
      <circle cx="200" cy="260" r="180" fill="url(#ambient)" />

      {/* Outer head silhouette - geometric octagonal */}
      <path
        d="M200 60 L300 110 L340 200 L335 310 L280 410 L200 450 L120 410 L65 310 L60 200 L100 110 Z"
        fill="none"
        stroke="#ff8a1a"
        strokeWidth="1.5"
        opacity="0.7"
        filter="url(#softGlow)"
      />

      {/* Inner head outline */}
      <path
        d="M200 80 L285 125 L320 205 L315 305 L270 395 L200 430 L130 395 L85 305 L80 205 L115 125 Z"
        fill="none"
        stroke="#ff8a1a"
        strokeWidth="0.8"
        opacity="0.35"
      />

      {/* Forehead crown detail */}
      <g opacity="0.8">
        <line x1="200" y1="50" x2="200" y2="95" stroke="#ffaa44" strokeWidth="1.5" />
        <circle cx="200" cy="50" r="3" fill="#ffd9a8" filter="url(#glow)" />
        <path
          d="M150 105 L180 95 L200 100 L220 95 L250 105"
          fill="none"
          stroke="#ffaa44"
          strokeWidth="1.5"
          filter="url(#softGlow)"
        />
        <path
          d="M165 115 L235 115"
          stroke="#ff8a1a"
          strokeWidth="0.5"
          opacity="0.5"
        />
      </g>

      {/* Cheekbones */}
      <path
        d="M75 240 L120 255 M325 240 L280 255"
        stroke="#ff8a1a"
        strokeWidth="0.8"
        opacity="0.4"
      />

      {/* Side sensors */}
      <g filter="url(#softGlow)">
        <line x1="55" y1="260" x2="78" y2="258" stroke="#ff8a1a" strokeWidth="1" />
        <circle cx="55" cy="260" r="3" fill="#ffaa44" />
        <line x1="345" y1="260" x2="322" y2="258" stroke="#ff8a1a" strokeWidth="1" />
        <circle cx="345" cy="260" r="3" fill="#ffaa44" />
      </g>

      {/* LEFT EYE */}
      <g transform={`translate(${145 + look.x}, ${230 + look.y})`}>
        <circle r="42" fill="none" stroke="#ff8a1a" strokeWidth="0.8" opacity="0.4" />
        <circle r="34" fill="none" stroke="#ff8a1a" strokeWidth="0.5" opacity="0.6" />
        <g
          style={{
            transformOrigin: 'center',
            transform: blink ? 'scaleY(0.05)' : 'scaleY(1)',
            transition: 'transform 0.12s ease-out',
          }}
        >
          <circle r="28" fill="url(#eyeGlow)" filter="url(#glow)" />
          <circle r="10" fill="#fff" opacity={blink ? 0 : 0.95} />
          <circle r="4" fill="#ffd9a8" opacity={blink ? 0 : 1} />
        </g>
        {/* Eye tick markers */}
        {[0, 90, 180, 270].map((deg) => (
          <line
            key={deg}
            x1="38"
            y1="0"
            x2="44"
            y2="0"
            stroke="#ffaa44"
            strokeWidth="1"
            transform={`rotate(${deg})`}
          />
        ))}
      </g>

      {/* RIGHT EYE */}
      <g transform={`translate(${255 + look.x}, ${230 + look.y})`}>
        <circle r="42" fill="none" stroke="#ff8a1a" strokeWidth="0.8" opacity="0.4" />
        <circle r="34" fill="none" stroke="#ff8a1a" strokeWidth="0.5" opacity="0.6" />
        <g
          style={{
            transformOrigin: 'center',
            transform: blink ? 'scaleY(0.05)' : 'scaleY(1)',
            transition: 'transform 0.12s ease-out',
          }}
        >
          <circle r="28" fill="url(#eyeGlow)" filter="url(#glow)" />
          <circle r="10" fill="#fff" opacity={blink ? 0 : 0.95} />
          <circle r="4" fill="#ffd9a8" opacity={blink ? 0 : 1} />
        </g>
        {[0, 90, 180, 270].map((deg) => (
          <line
            key={deg}
            x1="38"
            y1="0"
            x2="44"
            y2="0"
            stroke="#ffaa44"
            strokeWidth="1"
            transform={`rotate(${deg})`}
          />
        ))}
      </g>

      {/* Nose bridge */}
      <g opacity="0.5">
        <line x1="200" y1="275" x2="200" y2="325" stroke="#ff8a1a" strokeWidth="0.8" />
        <path
          d="M192 325 L200 335 L208 325"
          fill="none"
          stroke="#ff8a1a"
          strokeWidth="0.8"
        />
      </g>

      {/* MOUTH WAVEFORM */}
      <g transform="translate(200, 380)" filter="url(#softGlow)">
        <line x1="-75" y1="0" x2="75" y2="0" stroke="#ff8a1a" strokeWidth="0.4" opacity="0.3" />
        {waveform.map((v, i) => {
          const x = -69 + i * 6;
          const h = v * 30;
          return (
            <line
              key={i}
              x1={x}
              y1={-h / 2}
              x2={x}
              y2={h / 2}
              stroke="#ffaa44"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        {/* Mouth corner brackets */}
        <path d="M-85 -8 L-78 -8 L-78 -2" stroke="#ff8a1a" strokeWidth="1" fill="none" />
        <path d="M-85 8 L-78 8 L-78 2" stroke="#ff8a1a" strokeWidth="1" fill="none" />
        <path d="M85 -8 L78 -8 L78 -2" stroke="#ff8a1a" strokeWidth="1" fill="none" />
        <path d="M85 8 L78 8 L78 2" stroke="#ff8a1a" strokeWidth="1" fill="none" />
      </g>

      {/* Chin detail */}
      <line x1="180" y1="425" x2="220" y2="425" stroke="#ff8a1a" strokeWidth="0.8" opacity="0.5" />

      {/* Mood indicator at top */}
      <text
        x="200"
        y="35"
        textAnchor="middle"
        fill="#ffd9a8"
        fontSize="11"
        fontFamily="Share Tech Mono, monospace"
        letterSpacing="4"
        filter="url(#softGlow)"
      >
        {mood}
      </text>
      <line x1="160" y1="42" x2="240" y2="42" stroke="#ff8a1a" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}