import { useEffect, useMemo, useState } from 'react';
import { conditionFromCode } from './weather';

const LABELS = {
  clear: 'CLEAR SKY',
  cloudy: 'CLOUDY',
  overcast: 'OVERCAST',
  fog: 'FOGGY',
  drizzle: 'DRIZZLE',
  rain: 'RAINING',
  snow: 'SNOWING',
  thunder: 'THUNDERSTORM',
};

function Brackets() {
  return (
    <>
      <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-primary" />
      <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-primary" />
      <span className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-primary" />
      <span className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-primary" />
    </>
  );
}

// ─── Scene primitives ─────────────────────────────────

function Cloud({ left, top, scale, opacity, duration, delay, color }) {
  return (
    <svg
      viewBox="0 0 100 50"
      style={{
        position: 'absolute',
        left: `${left}%`,
        top: `${top}%`,
        width: `${90 * scale}px`,
        height: `${45 * scale}px`,
        opacity,
        animation: `wp-cloud ${duration}s linear ${delay}s infinite`,
        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))',
      }}
    >
      <ellipse cx="22" cy="32" rx="18" ry="12" fill={color} />
      <ellipse cx="48" cy="22" rx="24" ry="16" fill={color} />
      <ellipse cx="72" cy="32" rx="20" ry="13" fill={color} />
      <ellipse cx="40" cy="38" rx="24" ry="9" fill={color} />
    </svg>
  );
}

function CloudLayer({ count = 4, color = '#ffffff', heavy = false }) {
  const clouds = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: -20 + (i * 130) / count + Math.random() * 15,
        top: 5 + Math.random() * (heavy ? 30 : 40),
        scale: 0.7 + Math.random() * 0.6,
        opacity: heavy ? 0.85 + Math.random() * 0.15 : 0.55 + Math.random() * 0.35,
        duration: 50 + Math.random() * 40,
        delay: -Math.random() * 40,
      })),
    [count, heavy]
  );
  return clouds.map((c, i) => <Cloud key={i} {...c} color={color} />);
}

function Rain({ density = 60, heavy = false }) {
  const drops = useMemo(
    () =>
      Array.from({ length: density }, () => ({
        left: Math.random() * 100,
        delay: -Math.random() * 1.2,
        duration: 0.45 + Math.random() * 0.35,
        opacity: 0.4 + Math.random() * 0.5,
      })),
    [density]
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drops.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${d.left}%`,
            top: 0,
            width: '1.5px',
            height: heavy ? '14px' : '10px',
            background: 'linear-gradient(to bottom, transparent, rgba(165,231,255,0.85))',
            animation: `wp-rain ${d.duration}s linear ${d.delay}s infinite`,
            opacity: d.opacity,
          }}
        />
      ))}
    </div>
  );
}

function Snow({ density = 40 }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: density }, () => ({
        left: Math.random() * 100,
        delay: -Math.random() * 6,
        duration: 5 + Math.random() * 5,
        size: 2 + Math.random() * 4,
        sway: 8 + Math.random() * 22,
      })),
    [density]
  );
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {flakes.map((f, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${f.left}%`,
            top: 0,
            width: `${f.size}px`,
            height: `${f.size}px`,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.95)',
            boxShadow: '0 0 6px rgba(255,255,255,0.6)',
            animation: `wp-snow ${f.duration}s linear ${f.delay}s infinite`,
            ['--wp-sway']: `${f.sway}px`,
          }}
        />
      ))}
    </div>
  );
}

function Sun() {
  return (
    <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)' }}>
      <div style={{ position: 'relative', width: 100, height: 100 }}>
        <div className="animate-spin-slow" style={{ position: 'absolute', inset: 0 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: '3px',
                height: '80px',
                background: 'linear-gradient(to bottom, transparent, rgba(255,213,100,0.85), transparent)',
                transform: `translate(-50%, -50%) rotate(${i * 30}deg)`,
              }}
            />
          ))}
        </div>
        <div
          style={{
            position: 'absolute',
            inset: '20%',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fff5d0 0%, #ffd56a 50%, #ff9b30 100%)',
            boxShadow: '0 0 50px rgba(255,200,80,0.9), 0 0 90px rgba(255,200,80,0.5)',
            animation: 'pulse-slow 3s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}

function Moon() {
  return (
    <div style={{ position: 'absolute', top: '18%', left: '55%' }}>
      <div
        style={{
          width: 70,
          height: 70,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 35%, #f5f5e8, #c8c8b8 70%, #888 100%)',
          boxShadow: '0 0 40px rgba(220,220,200,0.55)',
        }}
      />
    </div>
  );
}

function Stars({ count = 35 }) {
  const stars = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        left: Math.random() * 100,
        top: Math.random() * 60,
        size: 1 + Math.random() * 1.5,
        delay: Math.random() * 3,
      })),
    [count]
  );
  return stars.map((s, i) => (
    <div
      key={i}
      style={{
        position: 'absolute',
        left: `${s.left}%`,
        top: `${s.top}%`,
        width: `${s.size}px`,
        height: `${s.size}px`,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 0 4px white',
        animation: `wp-twinkle 2s ease-in-out ${s.delay}s infinite`,
      }}
    />
  ));
}

function Lightning() {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    let t;
    const fire = () => {
      setFlash(true);
      setTimeout(() => setFlash(false), 80);
      setTimeout(() => setFlash(true), 170);
      setTimeout(() => setFlash(false), 260);
      t = setTimeout(fire, 3500 + Math.random() * 4000);
    };
    t = setTimeout(fire, 1500);
    return () => clearTimeout(t);
  }, []);
  if (!flash) return null;
  return (
    <>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.55)', mixBlendMode: 'screen' }}
      />
      <svg
        style={{ position: 'absolute', left: '38%', top: '15%', width: 60, height: 110 }}
        viewBox="0 0 60 110"
      >
        <path
          d="M30 0 L14 50 L28 50 L18 110 L46 48 L30 48 L42 0 Z"
          fill="#fff8a0"
          stroke="white"
          strokeWidth="1"
          style={{ filter: 'drop-shadow(0 0 8px #fff8a0)' }}
        />
      </svg>
    </>
  );
}

function Fog() {
  return [0, 1, 2].map((i) => (
    <div
      key={i}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: `${20 + i * 25}%`,
        height: '60px',
        background:
          'linear-gradient(to right, transparent, rgba(200,210,220,0.45), rgba(220,225,230,0.55), rgba(200,210,220,0.45), transparent)',
        filter: 'blur(8px)',
        animation: `wp-fog ${30 + i * 10}s linear ${-i * 5}s infinite`,
      }}
    />
  ));
}

// ─── Scene composer ───────────────────────────────────

function Scene({ condition, isDay }) {
  const bg = (() => {
    if (condition === 'thunder') return 'linear-gradient(to bottom, #1a1f3a, #2d2640)';
    if (condition === 'rain' || condition === 'drizzle')
      return 'linear-gradient(to bottom, #3a4a5e, #5a6b7e)';
    if (condition === 'snow') return 'linear-gradient(to bottom, #6a7888, #aab5c0)';
    if (condition === 'fog') return 'linear-gradient(to bottom, #7a7e85, #9aa0a8)';
    if (condition === 'overcast') return 'linear-gradient(to bottom, #5a6770, #8a939c)';
    if (condition === 'cloudy')
      return isDay
        ? 'linear-gradient(to bottom, #5b8bb8, #a8c8e0)'
        : 'linear-gradient(to bottom, #1a2b4a, #3a4a6a)';
    return isDay
      ? 'linear-gradient(to bottom, #4a90d8, #a0d0f0)'
      : 'linear-gradient(to bottom, #0a1428, #1a2848)';
  })();

  return (
    <div className="relative w-full h-44 overflow-hidden" style={{ background: bg }}>
      {!isDay && (condition === 'clear' || condition === 'cloudy') && <Stars />}
      {condition === 'clear' && (isDay ? <Sun /> : <Moon />)}

      {condition === 'cloudy' && <CloudLayer count={4} color={isDay ? '#ffffff' : '#aab5c0'} />}
      {condition === 'overcast' && <CloudLayer count={6} heavy color="#9aa3ad" />}
      {(condition === 'rain' || condition === 'drizzle') && (
        <CloudLayer count={5} heavy color="#6a7480" />
      )}
      {condition === 'snow' && <CloudLayer count={5} heavy color="#a0a8b0" />}
      {condition === 'thunder' && <CloudLayer count={6} heavy color="#3a3a4a" />}
      {condition === 'fog' && <CloudLayer count={3} color="#aab0b8" />}

      {condition === 'drizzle' && <Rain density={30} />}
      {condition === 'rain' && <Rain density={70} heavy />}
      {condition === 'thunder' && (
        <>
          <Rain density={80} heavy />
          <Lightning />
        </>
      )}
      {condition === 'snow' && <Snow density={45} />}
      {condition === 'fog' && <Fog />}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────

export default function WeatherPanel({ weather, onClose }) {
  if (!weather) return null;
  const condition = conditionFromCode(weather.code);

  return (
    <>
      <style>{`
        @keyframes wp-rain {
          0% { transform: translateY(-20px) rotate(8deg); }
          100% { transform: translateY(190px) rotate(8deg); }
        }
        @keyframes wp-snow {
          0% { transform: translateY(-10px) translateX(0); opacity: 0; }
          10% { opacity: 0.95; }
          90% { opacity: 0.95; }
          100% { transform: translateY(190px) translateX(var(--wp-sway, 15px)); opacity: 0; }
        }
        @keyframes wp-cloud {
          from { transform: translateX(-60%); }
          to { transform: translateX(160%); }
        }
        @keyframes wp-fog {
          0% { transform: translateX(-25%); }
          100% { transform: translateX(25%); }
        }
        @keyframes wp-twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>

      <div className="fixed top-24 left-72 w-[440px] z-50 glass border-2 border-primary/50 shadow-[0_0_50px_rgba(165,231,255,0.4)] animate-fade-in">
        <Brackets />

        <div className="flex items-center justify-between px-3 py-2 border-b border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-base animate-pulse">cloud</span>
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-primary tracking-widest">WEATHER_FEED</div>
              <div className="font-mono text-[9px] text-on-surface-dim/60 truncate">◉ {weather.location}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-on-surface-dim hover:text-error transition-colors">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="relative">
          <Scene condition={condition} isDay={weather.isDay} />
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 pointer-events-none">
            <div
              className="font-display text-5xl font-bold text-white"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}
            >
              {weather.temp}°
            </div>
            <div
              className="font-mono text-[10px] text-white/95 tracking-[0.3em] mt-0.5"
              style={{ textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}
            >
              {LABELS[condition]}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1 p-3 border-t border-primary/20">
          {[
            ['FEELS', `${weather.feelsLike}°`],
            ['WIND', `${weather.wind}`, 'km/h'],
            ['HUMIDITY', `${weather.humidity}%`],
            ['PRECIP', `${weather.precipitation}`, 'mm'],
          ].map(([label, value, unit], i) => (
            <div key={i} className="text-center">
              <div className="font-mono text-[8px] text-on-surface-dim/50 tracking-widest">{label}</div>
              <div className="font-display text-base text-primary mt-0.5">
                {value}
                {unit && <span className="text-[9px] ml-0.5">{unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}