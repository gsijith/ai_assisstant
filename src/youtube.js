const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.private.coffee',
  'https://piped-api.lunar.icu',
  'https://pipedapi.r4fo.com',
];

const INVIDIOUS_INSTANCES = [
  'https://invidious.privacydev.net',
  'https://yewtu.be',
  'https://inv.nadeko.net',
  'https://invidious.fdn.fr',
];

const CORS_PROXIES = [
  'https://corsproxy.io/?url=',
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

async function tryPiped(query) {
  for (const base of PIPED_INSTANCES) {
    try {
      const res = await fetch(
        `${base}/search?q=${encodeURIComponent(query)}&filter=videos`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const ids = (data.items || [])
        .map((it) => it.url?.match(/v=([^&]+)/)?.[1])
        .filter(Boolean)
        .slice(0, 12);
      if (ids.length) {
        console.log('[YT search] Piped found', ids.length, 'videos');
        return ids;
      }
    } catch {}
  }
  return [];
}

async function tryInvidious(query) {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const res = await fetch(
        `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const ids = (Array.isArray(data) ? data : [])
        .map((it) => it.videoId)
        .filter(Boolean)
        .slice(0, 12);
      if (ids.length) {
        console.log('[YT search] Invidious found', ids.length, 'videos');
        return ids;
      }
    } catch {}
  }
  return [];
}

async function tryCorsProxy(query) {
  const target = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  for (const proxy of CORS_PROXIES) {
    try {
      const url = proxy + encodeURIComponent(target);
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const html = await res.text();
      const matches = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/g) || [];
      const ids = [...new Set(matches.map((m) => m.match(/"([a-zA-Z0-9_-]{11})"/)[1]))].slice(0, 12);
      if (ids.length) {
        console.log('[YT search] CORS proxy scraped', ids.length, 'videos');
        return ids;
      }
    } catch {}
  }
  return [];
}

export async function searchYouTubeIds(query) {
  // Try fastest first (Piped), then Invidious, then CORS-proxy scrape
  return (
    (await tryPiped(query)) ||
    (await tryInvidious(query)) ||
    (await tryCorsProxy(query)) ||
    []
  );
}

export function openYouTubeSearch(query) {
  window.open(
    `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    '_blank'
  );
}