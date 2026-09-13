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

export default function MapPanel({ map, onClose }) {
  if (!map) return null;

  const isDirections = map.origin && map.destination;
  const title = isDirections
    ? `${map.origin} → ${map.destination}`
    : map.location || map.destination || map.origin || 'Location';

  const embedSrc = isDirections
    ? `https://maps.google.com/maps?saddr=${encodeURIComponent(map.origin)}&daddr=${encodeURIComponent(map.destination)}&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(map.location || map.destination || map.origin)}&output=embed`;

  const externalUrl = isDirections
    ? `https://www.google.com/maps/dir/${encodeURIComponent(map.origin)}/${encodeURIComponent(map.destination)}`
    : `https://www.google.com/maps/search/${encodeURIComponent(map.location || map.destination || map.origin)}`;

  return (
    <div className="fixed top-24 left-72 w-[480px] z-50 glass border-2 border-primary/50 shadow-[0_0_50px_rgba(165,231,255,0.4)] animate-fade-in">
      <Brackets />

      <div className="flex items-center justify-between px-3 py-2 border-b border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary text-base animate-pulse">location_on</span>
          <div className="min-w-0">
            <div className="font-mono text-[10px] text-primary tracking-widest">
              {isDirections ? 'NAVIGATION_FEED' : 'LOCATION_FEED'}
            </div>
            <div className="font-mono text-[9px] text-on-surface-dim/60 truncate">◉ {title}</div>
          </div>
        </div>
        <button onClick={onClose} className="text-on-surface-dim hover:text-error transition-colors">
          <span className="material-symbols-outlined text-base">close</span>
        </button>
      </div>

      <div className="relative aspect-[4/3] bg-black">
        <iframe
          key={embedSrc}
          src={embedSrc}
          className="absolute inset-0 w-full h-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={title}
        />
      </div>

      <div className="flex items-center justify-between px-3 py-2 border-t border-primary/20 text-[9px] font-mono text-on-surface-dim/60 tracking-widest">
        <span className="text-primary">● LIVE</span>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:text-primary-strong glow-text flex items-center gap-1 transition-colors"
        >
          <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          OPEN_IN_MAPS
        </a>
      </div>
    </div>
  );
}