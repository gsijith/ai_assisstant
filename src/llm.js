function buildSystemPrompt(lang) {
  const langName = lang === 'ml' ? 'Malayalam' : 'English';
  return `You are J.A.R.V.I.S — Tony Stark's AI assistant. Witty, concise, slightly dry. Address the user as "sir" occasionally. Keep spoken replies under 2 sentences.

CURRENT LANGUAGE: ${langName}. Reply in ${langName} unless the user asks to switch.

LANGUAGE SWITCHING:
- If the user asks to speak Malayalam (e.g. "say it in malayalam", "reply in malayalam", "malayalathil parayuka"): call set_language with lang="ml", then reply in Malayalam, ENDING with this exact sentence: "ഇംഗ്ലീഷിലോ മലയാളത്തിലോ ആണോ തുടരേണ്ടത്, സർ?" (means "Continue in English or Malayalam, sir?")
- If the user asks to switch to English (e.g. "english please", "speak english", "switch back"): call set_language with lang="en", then reply in English.
- If the user picks a language after being asked: call set_language for their choice and reply in that language.
- If the language is already correct, do NOT call set_language redundantly.

TOOL CALLING RULES:
1. Only call a tool when the user's CURRENT message genuinely asks for that capability. Past tool calls don't justify new ones.
2. If no tool fits, DO NOT call any tool. Just reply in text. Never fall back to a "sort of" tool — especially get_weather.
3. Never call the same tool twice in one turn.
4. For news, email, calendar, stocks, sports — say "I don't have a feed for that yet, sir." Don't fabricate.

Available tools (use ONLY for listed intents):
- play_video — user wants to SEE a video, clip, trailer.
- play_music — user wants to HEAR a song or audio.
- stop_media — user says stop/close/pause.
- get_weather — user asks about weather/temperature/rain.
- get_time — user asks what time it is.
- show_map — user asks to see a place, get directions, share a location, or "show on map".
- set_language — user wants to change spoken language.`;
}

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'play_video',
      description: 'Open a visible YouTube video player. ONLY use when the user asks to SEE a video, clip, trailer, movie, or show.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'YouTube search query, e.g. "iron man trailer"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'play_music',
      description: 'Play YouTube AUDIO ONLY. ONLY use when the user asks for music, a song, or audio.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Music search query, e.g. "back in black ac dc"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stop_media',
      description: 'Stop and close the currently playing video, music, or weather panel. Use only on explicit stop/close requests.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Fetch live weather and show an animated weather panel. ONLY use when the user explicitly asks about weather, temperature, rain, or sky conditions. Do NOT use for time, news, or any other topic.',
      parameters: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City or place name, e.g. "Mumbai"' },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_time',
      description: 'Get the current local time for a city or timezone. ONLY use when the user explicitly asks what time it is.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City name (e.g. "Tokyo") or IANA timezone (e.g. "Asia/Kolkata"). If the user does not specify, use the user\'s likely local timezone.',
          },
        },
        required: ['location'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_language',
      description: 'Switch the assistant\'s spoken language. Use when the user asks to switch languages, or picks one after being asked.',
      parameters: {
        type: 'object',
        properties: {
          lang: {
            type: 'string',
            enum: ['en', 'ml'],
            description: '"en" for English, "ml" for Malayalam',
          },
        },
        required: ['lang'],
      },
    },
  },
  {
  type: 'function',
  function: {
    name: 'show_map',
    description:
      'Show a location on a map, or display directions between two places. Use when the user asks to see a location, asks for directions, distance, "send me the location", "show on map", or names a place geographically. Either provide a single `location`, OR provide both `origin` and `destination` for directions.',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'A single place to show on map. Use this OR origin+destination, not both.',
        },
        origin: {
          type: 'string',
          description: 'Starting point for directions. Use together with destination.',
        },
        destination: {
          type: 'string',
          description: 'End point for directions. Use together with origin.',
        },
      },
    },
  },
},
];


// Base URL for the serverless API proxy. Empty = same-origin (the web app).
// Set VITE_API_BASE to the deployed URL for the Capacitor/Android build.
const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function callLLM(messages, tools, lang = 'en') {
  const doCall = async (useTools) => {
    const t0 = performance.now();
    const res = await fetch(`${API_BASE}/api/groq`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: buildSystemPrompt(lang) }, ...messages],
        tools: useTools && tools?.length ? tools : undefined,
        tool_choice: useTools && tools?.length ? 'auto' : undefined,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, latency: Math.round(performance.now() - t0) };
  };

  let r = await doCall(true);
  if (!r.ok && r.status === 400 && r.text.includes('tool_use_failed')) {
    console.warn('[LLM] Tool call malformed, retrying without tools');
    r = await doCall(false);
  }
  if (!r.ok) throw new Error(`LLM error ${r.status}: ${r.text}`);

  const data = JSON.parse(r.text);
  const message = data.choices[0].message;
  return {
    text: message.content || '',
    toolCalls: message.tool_calls || [],
    raw: message,
    latency: r.latency,
    tokens: data.usage?.total_tokens || 0,
  };
}