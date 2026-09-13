import { useState, useCallback, useEffect, useRef } from 'react';
import { useAssistant } from './hooks';
import MediaPlayer from './MediaPlayer';
import { openYouTubeSearch } from './youtube';
// imports — add these two:
import WeatherPanel from './WeatherPanel';
import { getWeather } from './weather';
import MapPanel from './MapPanel';

// ─── State color mapping ────────────────────────────────────────────
const STATE_TONE = {
  IDLE: { color: '#6b7c83', label: 'STANDBY', glow: 'rgba(165,231,255,0.2)' },
  LISTENING: { color: '#a5e7ff', label: 'LISTENING', glow: 'rgba(165,231,255,0.6)' },
  THINKING: { color: '#ffd5b7', label: 'PROCESSING', glow: 'rgba(255,213,183,0.6)' },
  SPEAKING: { color: '#afc6ff', label: 'RESPONDING', glow: 'rgba(175,198,255,0.6)' },
};

// ─── Sidebar ────────────────────────────────────────────────────────
function Sidebar({ state, onToggle }) {
  const isActive = state !== 'IDLE';
  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-50 bg-surface-low/40 backdrop-blur-2xl border-r border-outline/30 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
      <div className="p-5">
        <h1 className="font-display text-2xl font-bold text-primary tracking-tight glow-text">
          J.A.R.V.I.S
        </h1>
        <p className="font-mono text-[10px] text-on-surface-dim/60 tracking-[0.2em] mt-1">
          STATUS: <span style={{ color: STATE_TONE[state].color }} className="glow-text">{STATE_TONE[state].label}</span>
        </p>
      </div>

      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {['DASHBOARD', 'CONVERSATION', 'MEMORY', 'SYSTEM_LOG', 'SETTINGS'].map((label, i) => (
          <button
            key={label}
            className={`flex items-center gap-3 px-3 py-2.5 transition-all text-left ${
              i === 0
                ? 'bg-primary/10 text-primary border-l-2 border-primary'
                : 'text-on-surface-dim/60 border-l-2 border-transparent hover:bg-surface/40 hover:text-primary/80 hover:translate-x-1'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {['grid_view', 'forum', 'database', 'terminal', 'settings'][i]}
            </span>
            <span className="font-mono text-[12px] tracking-[0.15em] font-bold">{label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4">
        <button
          onClick={onToggle}
          className={`w-full py-3 font-mono text-[11px] tracking-[0.2em] font-bold transition-all duration-300 active:scale-95 border ${
            isActive
              ? 'border-error text-error hover:bg-error hover:text-background'
              : 'border-primary text-primary hover:bg-primary hover:text-background'
          }`}
        >
          {isActive ? '▣ DISENGAGE' : '▶ ENGAGE'}
        </button>
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-outline/30">
          <div className="w-10 h-10 rounded-full border border-primary/40 bg-primary/5 flex items-center justify-center font-display text-primary text-sm tracking-wider">
            TS
          </div>
          <div>
            <p className="font-mono text-[9px] text-on-surface-dim/50 tracking-widest">OPERATOR</p>
            <p className="font-mono text-[12px] text-primary tracking-[0.15em] font-bold">T. STARK</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ─── Top bar ────────────────────────────────────────────────────────
function TopBar({ state, error, language }) {
  const tone = STATE_TONE[state];
  return (
    <header className="fixed top-0 left-64 right-0 z-40 flex items-center justify-between px-10 py-3 bg-background/40 backdrop-blur-md border-b border-outline/30">
      <div className="flex items-center gap-3">
        <div className="font-mono text-[11px] tracking-[0.2em] text-primary border border-primary/40 px-3 py-1">
          JARVIS_v4.0 // VOICE_LINK
        </div>
        <div className="flex items-center gap-2 px-3 py-1 border border-primary/40">
          <span className="font-mono text-[11px] tracking-wider text-primary">
            LANG: {language === 'ml' ? 'മലയാളം' : 'EN'}
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 border" style={{ borderColor: `${tone.color}66` }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: tone.color, boxShadow: `0 0 10px ${tone.color}` }} />
          <span className="font-mono text-[11px] tracking-wider" style={{ color: tone.color }}>
            {tone.label}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-5">
        {error ? (
          <div className="font-mono text-[10px] text-error tracking-widest">⚠ {error}</div>
        ) : (
          <div className="font-mono text-[10px] text-on-surface-dim/60 tracking-[0.2em]">
            UPLINK <span className="text-primary glow-text">STABLE</span>
          </div>
        )}
      </div>
    </header>
  );
}

// ─── Floating panels ────────────────────────────────────────────────
function Brackets() {
  return (
    <>
      <span className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary" />
      <span className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-primary" />
      <span className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-primary" />
      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-primary" />
    </>
  );
}

function StatePanel({ state }) {
  const tone = STATE_TONE[state];
  return (
    <div className="relative glass p-3 w-56">
      <Brackets />
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-[10px] text-primary tracking-[0.2em]">AI_STATE</span>
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: tone.color, boxShadow: `0 0 8px ${tone.color}` }}
        />
      </div>
      <div className="font-display text-2xl tracking-wider glow-text" style={{ color: tone.color }}>
        {tone.label}
      </div>
      <div className="font-mono text-[9px] text-on-surface-dim/40 mt-1 tracking-widest">
        {state === 'LISTENING' && 'Awaiting voice input...'}
        {state === 'THINKING' && 'Processing query...'}
        {state === 'SPEAKING' && 'Generating response...'}
        {state === 'IDLE' && 'Ready. Press ENGAGE.'}
      </div>
    </div>
  );
}

function AudioPanel({ level, isVoice, waveform }) {
  const bars = Array.from(waveform).map((v) => Math.abs(v - 128) / 128);
  return (
    <div className="relative glass p-3 w-56">
      <Brackets />
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-[10px] text-primary tracking-[0.2em]">AUDIO_IN</span>
        <span className="font-display text-sm text-primary tracking-wider">
          {Math.round(level * 100)}%
        </span>
      </div>
      <div className="h-10 flex items-center gap-0.5">
        {bars.map((v, i) => (
          <div
            key={i}
            className="flex-1 bg-primary transition-all duration-75"
            style={{
              height: `${Math.max(8, v * 100)}%`,
              opacity: 0.3 + v * 0.7,
              boxShadow: v > 0.4 ? '0 0 4px #a5e7ff' : 'none',
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] font-mono text-on-surface-dim/40 tracking-widest">
        <span>VAD: {isVoice ? <span className="text-primary">ACTIVE</span> : 'SILENT'}</span>
        <span className="text-primary/70">48kHz</span>
      </div>
    </div>
  );
}

function StatsPanel({ stats }) {
  return (
    <div className="relative glass p-3 w-56">
      <Brackets />
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-[10px] text-primary tracking-[0.2em]">SESSION</span>
        <span className="font-display text-sm text-primary">#{stats.turns}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div>
          <div className="text-on-surface-dim/40 tracking-widest">LATENCY</div>
          <div className="text-primary text-base font-display">{stats.latency}ms</div>
        </div>
        <div>
          <div className="text-on-surface-dim/40 tracking-widest">TOKENS</div>
          <div className="text-primary text-base font-display">{stats.tokens}</div>
        </div>
      </div>
    </div>
  );
}

function ModelPanel() {
  return (
    <div className="relative glass p-3 w-56">
      <Brackets />
      <div className="flex justify-between items-center mb-2">
        <span className="font-mono text-[10px] text-primary tracking-[0.2em]">MODEL_INFO</span>
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      </div>
      <div className="text-[11px] font-mono space-y-1">
        <div className="flex justify-between">
          <span className="text-on-surface-dim/60">LLM</span>
          <span className="text-primary">gpt-4o-mini</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-dim/60">STT</span>
          <span className="text-primary">webkit-sr</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-dim/60">TTS</span>
          <span className="text-primary">native</span>
        </div>
        <div className="flex justify-between">
          <span className="text-on-surface-dim/60">VAD</span>
          <span className="text-primary">RMS-04</span>
        </div>
      </div>
    </div>
  );
}

// ─── Arc Reactor (state-aware) ──────────────────────────────────────
function ArcReactor({ state, audioLevel }) {
  const tone = STATE_TONE[state];
  const pulseScale = state === 'LISTENING' ? 1 + audioLevel * 0.15 : 1;
  const ringSpeed = state === 'THINKING' ? 'animate-spin-medium' : 'animate-spin-slow';

  return (
    <div className="relative w-[440px] h-[440px] flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-dashed animate-spin-slow"
        style={{ borderColor: `${tone.color}30` }} />

      <div className={`absolute inset-2 rounded-full border animate-spin-reverse ${state === 'THINKING' ? 'animate-spin-medium' : ''}`}
        style={{ borderColor: `${tone.color}25` }}>
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-1/2 top-0 w-px"
            style={{
              height: i % 5 === 0 ? '10px' : '4px',
              background: tone.color,
              opacity: i % 5 === 0 ? 0.85 : 0.35,
              transform: `translateX(-50%) rotate(${i * 6}deg)`,
              transformOrigin: '50% 212px',
            }}
          />
        ))}
      </div>

      {[0, 90, 180, 270].map((deg) => (
        <div
          key={deg}
          className="absolute left-1/2 top-1/2 w-2.5 h-2.5 rounded-full z-10"
          style={{
            background: tone.color,
            transform: `translate(-50%, -50%) rotate(${deg}deg) translateY(-208px)`,
            boxShadow: `0 0 14px ${tone.color}`,
          }}
        />
      ))}

      <div className={`absolute inset-12 rounded-full border-2 border-dashed ${ringSpeed}`}
        style={{ borderColor: `${tone.color}40` }} />

      <div className="absolute inset-20 rounded-full border animate-spin-reverse"
        style={{ borderColor: `${tone.color}30` }}>
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <div
            key={deg}
            className="absolute left-1/2 top-1/2 w-3 h-0.5"
            style={{
              background: tone.color,
              transform: `translate(-50%, -50%) rotate(${deg}deg) translateX(8.5rem)`,
              boxShadow: `0 0 4px ${tone.color}`,
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      <div className={`absolute inset-28 rounded-full border-2 ${ringSpeed}`}
        style={{ borderColor: `${tone.color}50` }} />

      <div
        className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center border-2 z-10 transition-transform duration-200"
        style={{
          borderColor: `${tone.color}aa`,
          background: `radial-gradient(circle, ${tone.color}40 0%, ${tone.color}15 55%, transparent 100%)`,
          boxShadow: `0 0 60px -10px ${tone.glow}, inset 0 0 40px ${tone.glow}`,
          transform: `scale(${pulseScale})`,
        }}
      >
        <div
          className="absolute w-20 h-20 rounded-full"
          style={{
            background: `radial-gradient(circle, #ffffff 0%, ${tone.color} 50%, transparent 80%)`,
            boxShadow: `0 0 50px ${tone.color}`,
            opacity: state === 'IDLE' ? 0.5 : 0.8 + audioLevel * 0.2,
            animation: state === 'THINKING' ? 'pulse-slow 1s ease-in-out infinite' : undefined,
          }}
        />
        <div className="z-10 flex flex-col items-center">
          <span className="font-mono text-[9px] tracking-[0.3em]" style={{ color: `${tone.color}b0` }}>
            J.A.R.V.I.S
          </span>
          <span
            className="font-display text-3xl font-bold mt-1.5 tracking-tight glow-text tabular-nums"
            style={{ color: tone.color }}
          >
            {tone.label}
          </span>
          <span className="font-mono text-[9px] tracking-[0.3em] mt-1.5" style={{ color: `${tone.color}b0` }}>
            VOICE_LINK
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Live transcript bubble ─────────────────────────────────────────
function LiveTranscript({ text, state }) {
  if (!text || state === 'SPEAKING' || state === 'IDLE') return null;
  return (
    <div className="absolute bottom-72 left-1/2 -translate-x-1/2 w-[60%] max-w-2xl pointer-events-none animate-fade-in">
      <div className="relative glass px-5 py-3 text-center">
        <Brackets />
        <div className="font-mono text-[10px] text-primary/60 tracking-widest mb-1">
          {state === 'LISTENING' ? '◉ HEARING' : '◉ INPUT'}
        </div>
        <div className="font-display text-lg text-on-surface italic">
          "{text}"
        </div>
      </div>
    </div>
  );
}

// ─── Conversation log (terminal-style) ──────────────────────────────
function ConversationLog({ conversation }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [conversation]);

  return (
    <div className="fixed bottom-6 left-72 right-6 glass border-t-2 border-primary/30 h-44 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-primary/5 border-b border-outline/30">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-error animate-blink" />
          <span className="font-mono text-[10px] text-on-surface-dim tracking-[0.2em]">
            CONVERSATION_LOG · {conversation.length} TURNS
          </span>
        </div>
      </div>

      <div ref={ref} className="flex-1 p-4 overflow-y-auto font-mono text-[12px] leading-relaxed">
        {conversation.length === 0 && (
          <p className="text-on-surface-dim/40 italic">
            No exchanges yet. Press ENGAGE and start speaking, sir.
          </p>
        )}
        {conversation.map((m, i) => (
          <div key={i} className="mb-1.5 animate-fade-in">
            <span className={m.role === 'user' ? 'text-tertiary font-bold' : 'text-primary font-bold'}>
              {m.role === 'user' ? '> YOU' : '> JARVIS'}
            </span>
            <span className="text-on-surface ml-2">{m.content}</span>
          </div>
        ))}
        <div className="flex items-center mt-1 text-primary">
          <span className="mr-2">{'>'}</span>
          <span className="w-2 h-4 bg-primary animate-blink" />
        </div>
      </div>
    </div>
  );
}

// ─── Root ───────────────────────────────────────────────────────────
export default function App() {
  const [weather, setWeather] = useState(null);
  const [media, setMedia] = useState(null);
  const [map, setMap] = useState(null);

  const handleTool = useCallback(async (name, args) => {
    console.log('[App] Tool executed:', name, args);
    switch (name) {
      case 'play_video':
        setMedia({ type: 'video', query: args.query });
        return { success: true, message: `Searching YouTube for "${args.query}"` };

      case 'play_music':
        setMedia({ type: 'music', query: args.query + ' music' });
        return { success: true, message: `Searching YouTube for "${args.query}"` };

      case 'stop_media':
        setMedia(null);
        setWeather(null);
        setMap(null);
        return { success: true, message: 'Display cleared' };

      case 'get_weather':
        try {
          setMap(null); // close map when showing weather
          const w = await getWeather(args.location);
          setWeather(w);
          return {
            success: true,
            message: `${w.location}: ${w.temp}°C (feels ${w.feelsLike}°), ${w.conditionLabel}, wind ${w.wind} km/h, humidity ${w.humidity}%, precipitation ${w.precipitation}mm`,
          };
        } catch (err) {
          return { success: false, message: err.message };
        }

      case 'show_map':
        setWeather(null); // close weather when showing map (they share the slot)
        setMap(args);
        return {
          success: true,
          message:
            args.origin && args.destination
              ? `Showing directions from ${args.origin} to ${args.destination}`
              : `Showing ${args.location || args.destination || args.origin} on map`,
        };

      case 'get_time': {
        const loc = args.location || 'UTC';
        try {
          const now = new Date();
          let timeStr, tz = loc;
          try {
            timeStr = now.toLocaleTimeString('en-US', {
              timeZone: loc,
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });
          } catch {
            const map = {
              kottayam: 'Asia/Kolkata', mumbai: 'Asia/Kolkata', delhi: 'Asia/Kolkata',
              bangalore: 'Asia/Kolkata', chennai: 'Asia/Kolkata', kolkata: 'Asia/Kolkata',
              london: 'Europe/London', paris: 'Europe/Paris', berlin: 'Europe/Berlin',
              'new york': 'America/New_York', tokyo: 'Asia/Tokyo', sydney: 'Australia/Sydney',
              dubai: 'Asia/Dubai', singapore: 'Asia/Singapore',
            };
            tz = map[loc.toLowerCase()] || Intl.DateTimeFormat().resolvedOptions().timeZone;
            timeStr = now.toLocaleTimeString('en-US', {
              timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
            });
          }
          return { success: true, message: `${timeStr} in ${loc} (${tz})` };
        } catch (err) {
          return { success: false, message: err.message };
        }
      }

      default:
        return { success: false, message: 'Unknown tool' };
    }
  }, []);

  const a = useAssistant({ onTool: handleTool });

  const handleToggle = () => {
    if (a.state === 'IDLE') a.start();
    else a.stop();
  };

  if (!a.sttSupported) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-background text-error font-mono p-8">
        <div className="text-center">
          <h1 className="text-2xl mb-2">⚠ Speech Recognition Not Supported</h1>
          <p className="text-on-surface-dim">Try Chrome or Edge.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen flex bg-background overflow-hidden">
      <Sidebar state={a.state} onToggle={handleToggle} />

      <main className="flex-1 ml-64 relative scanline">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(circle at center, rgba(165,231,255,0.05) 0%, transparent 70%)',
        }} />

        <div className="absolute top-1/4 right-10 w-72 h-72 border border-primary/10 rounded-full pointer-events-none" />
        <div className="absolute bottom-1/3 left-10 w-[28rem] h-[28rem] border border-primary/5 rounded-full pointer-events-none" />

        <TopBar state={a.state} error={a.error} language={a.language} />

        <div className="pt-24 px-10 pb-56 h-full flex items-center justify-center relative">
          <div className="relative">
            <ArcReactor state={a.state} audioLevel={a.audioLevel} />
            <div className="absolute -top-2 -left-44"><StatePanel state={a.state} /></div>
            <div className="absolute -top-2 -right-44"><AudioPanel level={a.audioLevel} isVoice={a.isVoice} waveform={a.waveform} /></div>
            <div className="absolute -bottom-2 -left-44"><ModelPanel /></div>
            <div className="absolute -bottom-2 -right-44"><StatsPanel stats={a.stats} /></div>
          </div>
          <LiveTranscript text={a.transcript} state={a.state} />
        </div>

        <ConversationLog conversation={a.conversation} />
      </main>

      <MediaPlayer media={media} onClose={() => setMedia(null)} />
      <WeatherPanel weather={weather} onClose={() => setWeather(null)} />
      <MapPanel map={map} onClose={() => setMap(null)} />
    </div>
  );
}