import { useEffect, useRef, useState } from 'react';
import { searchYouTubeIds } from './youtube';

let ytReady = null;
function loadYT() {
  if (ytReady) return ytReady;
  ytReady = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      resolve(window.YT);
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  });
  return ytReady;
}

function useYouTubePlayer({ query }) {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const [status, setStatus] = useState('searching'); // searching | loading | playing | failed
  const [videoIds, setVideoIds] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Phase 1: Search for video IDs
  useEffect(() => {
    let cancelled = false;
    setStatus('searching');
    setVideoIds([]);
    setCurrentIdx(0);

    searchYouTubeIds(query).then((ids) => {
      if (cancelled) return;
      if (ids.length) {
        setVideoIds(ids);
        setStatus('loading');
      } else {
        setStatus('failed');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [query]);

  // Phase 2: Play current video, auto-skip on error
  useEffect(() => {
    if (!videoIds.length || currentIdx >= videoIds.length) return;
    const videoId = videoIds[currentIdx];
    let cancelled = false;

    loadYT().then((YT) => {
      if (cancelled || !containerRef.current) return;

      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      containerRef.current.innerHTML = '';
      const placeholder = document.createElement('div');
      placeholder.style.width = '100%';
      placeholder.style.height = '100%';
      containerRef.current.appendChild(placeholder);

      playerRef.current = new YT.Player(placeholder, {
        width: '100%',
        height: '100%',
        videoId,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onStateChange: (e) => {
            if (e.data === 1) setStatus('playing');
          },
          onError: (e) => {
            console.warn(`[YT] Video ${videoId} error ${e.data}, trying next...`);
            if (currentIdx + 1 < videoIds.length) {
              setCurrentIdx((i) => i + 1);
            } else {
              setStatus('failed');
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [videoIds, currentIdx]);

  return { containerRef, status, currentIdx, total: videoIds.length };
}

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

export default function MediaPlayer({ media, onClose }) {
  if (!media) return null;
  if (media.type === 'video') return <VideoPlayer media={media} onClose={onClose} />;
  return <MusicPlayer media={media} onClose={onClose} />;
}

function StatusLabel({ status, currentIdx, total }) {
  if (status === 'searching') return '◉ SEARCHING YOUTUBE...';
  if (status === 'loading') return `◉ LOADING (${currentIdx + 1}/${total})`;
  if (status === 'playing') return '● LIVE';
  if (status === 'failed') return '⚠ NO PLAYABLE RESULTS';
  return status;
}

function VideoPlayer({ media, onClose }) {
  const { containerRef, status, currentIdx, total } = useYouTubePlayer({ query: media.query });

  return (
    <div className="fixed top-24 right-6 w-[460px] z-50 glass border-2 border-primary/50 shadow-[0_0_50px_rgba(165,231,255,0.4)] animate-fade-in">
      <Brackets />
      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary text-base animate-pulse">play_circle</span>
          <div className="min-w-0">
            <div className="font-mono text-[10px] text-primary tracking-widest">VIDEO_FEED</div>
            <div className="font-mono text-[9px] text-on-surface-dim/60 truncate">"{media.query}"</div>
          </div>
        </div>
        <button onClick={onClose} className="text-on-surface-dim hover:text-error transition-colors">
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>
      <div className="relative aspect-video bg-black">
        <div ref={containerRef} className="absolute inset-0" />
        {status !== 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center font-mono text-xs animate-pulse pointer-events-none"
               style={{ color: status === 'failed' ? '#ffb4ab' : '#a5e7ff' }}>
            <StatusLabel status={status} currentIdx={currentIdx} total={total} />
          </div>
        )}
      </div>
      <div className="flex justify-between px-3 py-1.5 border-t border-primary/20 text-[9px] font-mono text-on-surface-dim/50 tracking-widest">
        <span style={{ color: status === 'playing' ? '#ffb4ab' : undefined }}>
          <StatusLabel status={status} currentIdx={currentIdx} total={total} />
        </span>
        <span>YT_FEED · 1080p</span>
      </div>
    </div>
  );
}

function MusicPlayer({ media, onClose }) {
  const { containerRef, status, currentIdx, total } = useYouTubePlayer({ query: media.query });
  const [bars, setBars] = useState(() => Array(48).fill(0.3));

  useEffect(() => {
    const id = setInterval(() => {
      setBars(() =>
        Array.from({ length: 48 }, (_, i) => {
          const dist = Math.abs(i - 23.5) / 23.5;
          return (0.15 + Math.random() * 0.85) * (1 - dist * 0.4);
        })
      );
    }, 90);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '320px',
          height: '180px',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />

      <div className="fixed top-24 right-6 w-96 z-50 glass border-2 border-primary/50 shadow-[0_0_50px_rgba(165,231,255,0.4)] animate-fade-in">
        <Brackets />
        <div className="flex items-center justify-between px-3 py-2 border-b border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-base animate-pulse">graphic_eq</span>
            <div className="min-w-0">
              <div className="font-mono text-[10px] text-primary tracking-widest">AUDIO_FEED</div>
              <div className="font-mono text-[9px] text-on-surface-dim/60 truncate">♪ {media.query}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-on-surface-dim hover:text-error transition-colors">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-4">
          <div className="flex items-end gap-[2px] h-36 justify-center">
            {bars.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-primary rounded-sm transition-all duration-100"
                style={{
                  height: `${Math.max(6, v * 100)}%`,
                  opacity: status === 'playing' ? 0.35 + v * 0.65 : 0.15,
                  boxShadow: v > 0.5 && status === 'playing' ? '0 0 6px #a5e7ff' : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-3 text-[9px] font-mono tracking-widest">
            <span className="text-on-surface-dim/50">
              <StatusLabel status={status} currentIdx={currentIdx} total={total} />
            </span>
            <span className={status === 'playing' ? 'text-primary glow-text' : 'text-on-surface-dim/40'}>
              <span className="animate-pulse">●</span> {status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}