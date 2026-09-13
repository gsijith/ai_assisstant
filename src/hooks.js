import { useState, useEffect, useRef, useCallback } from 'react';
import { callLLM, TOOLS } from './llm';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

// Base URL for the serverless API proxy. Empty = same-origin (the web app).
// Set VITE_API_BASE to the deployed URL for the Capacitor/Android build.
const API_BASE = import.meta.env.VITE_API_BASE || '';

// ─── STT (Web Speech API) ───────────────────────────────────────────
export function useSTT({ lang = 'en-US' } = {}) {
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [supported, setSupported] = useState(true);
  const recRef = useRef(null);
  const onFinalRef = useRef(null);
  const shouldRunRef = useRef(false);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    let cancelled = false;

    rec.onresult = (e) => {                                                                                                                                                                                                                   
      let final = '', inter = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else inter += t;
      }
      if (final) {
        setTranscript((prev) => (prev + ' ' + final).trim());
        if (onFinalRef.current) onFinalRef.current(final.trim());
      }
      setInterim(inter);
    };
    rec.onerror = (e) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('STT error:', e.error);
    };
    rec.onend = () => {
      if (cancelled) return;
      if (shouldRunRef.current) {
        try { rec.start(); } catch {
          setTimeout(() => { if (shouldRunRef.current && !cancelled) try { rec.start(); } catch {} }, 250);
        }
      }
    };

    recRef.current = rec;
    if (shouldRunRef.current) { try { rec.start(); } catch {} }

    return () => { cancelled = true; try { rec.abort(); } catch {} recRef.current = null; };
  }, [lang]);

  const start = useCallback(() => { shouldRunRef.current = true; try { recRef.current?.start(); } catch {} }, []);
  const stop = useCallback(() => { shouldRunRef.current = false; try { recRef.current?.stop(); } catch {} }, []);
  const reset = useCallback(() => { setTranscript(''); setInterim(''); }, []);
  const onFinal = useCallback((cb) => { onFinalRef.current = cb; }, []);

  return { transcript, interim, supported, start, stop, reset, onFinal };
}
// ─── TTS (SpeechSynthesis) ──────────────────────────────────────────
// ─── TTS providers ─────────────────────────────────────

function chunkText(text, maxLen = 180) {
  const parts = text.match(/[^.!?।॥,;]+[.!?।॥,;]?\s*/g) || [text];
  const chunks = [];
  let cur = '';
  for (const p of parts) {
    if (cur.length + p.length > maxLen && cur) { chunks.push(cur); cur = p; }
    else cur += p;
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

// ElevenLabs — best Malayalam quality, requires ELEVENLABS_API_KEY set server-side (see /api/elevenlabs)
async function elevenLabsTTS(text) {
  // "Rachel" voice (works well for multilingual). Swap voice IDs from elevenlabs.io/voice-library
  const voiceId = '21m00Tcm4TlvDq8ikWAM';
  const res = await fetch(`${API_BASE}/api/elevenlabs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      voiceId,
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    console.warn('[TTS] ElevenLabs error', res.status, await res.text());
    return null;
  }
  return URL.createObjectURL(await res.blob());
}

function googleTTSUrl(text, lang) {
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${lang}&client=tw-ob`;
}

// ─── Hook ──────────────────────────────────────────────

// ─── Sarvam TTS (free Indian-language TTS, Malayalam native) ───────

async function sarvamTTS(text, lang = 'ml') {
  const langCode = lang === 'ml' ? 'ml-IN' : 'en-IN';

  // v3 supports up to ~1500 chars per request and handles code-mixed text well
  const res = await fetch(`${API_BASE}/api/sarvam`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: [text],
      target_language_code: langCode,
      speaker: 'anushka', // female voice; try 'abhilash' or 'karun' for male
      model: 'bulbul:v2',
      pitch: 0,
      pace: 1.0,
      loudness: 1.0,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
    }),
  });

  if (!res.ok) {
    console.warn('[TTS] Sarvam error', res.status, await res.text());
    return null;
  }

  const data = await res.json();
  const base64 = data.audios?.[0];
  if (!base64) return null;

  // Sarvam returns base64-encoded WAV. Convert to a blob URL.
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

// ─── Hook ────────────────────────────────────────────────────────

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState([]);
  const audioRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.onvoiceschanged = update;
  }, []);

  const pickMlVoice = useCallback(
    () => voices.find((v) => v.lang.toLowerCase().startsWith('ml')) || null,
    [voices]
  );
  const pickEnVoice = useCallback(
    () =>
      voices.find((v) =>
        v.lang.startsWith('en') &&
        (v.name.includes('Daniel') || v.name.includes('Google UK English Male') ||
         v.name.includes('Microsoft Guy') || v.name.includes('Microsoft David'))) ||
      voices.find((v) => v.lang.startsWith('en-GB')) ||
      voices.find((v) => v.lang.startsWith('en')) ||
      voices[0] || null,
    [voices]
  );

  const playUrl = (url) =>
    new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = finish;
      audio.onpause = finish;
      audio.onerror = (e) => { console.warn('[TTS] Audio error', e); finish(); };
      audio.play().catch((e) => { console.warn('[TTS] play() blocked:', e); finish(); });
    });

  const speakNative = (text, lang) =>
    new Promise((resolve) => {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const voice = lang === 'ml' ? pickMlVoice() : pickEnVoice();
      if (voice) u.voice = voice;
      u.lang = lang === 'ml' ? 'ml-IN' : 'en-US';
      u.rate = lang === 'ml' ? 0.95 : 1.05;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => { setIsSpeaking(false); resolve(); };
      u.onerror = () => { setIsSpeaking(false); resolve(); };
      window.speechSynthesis.speak(u);
    });

  const speak = useCallback(
    async (text, lang = 'en') => {
      if (!text) return;
      cancelledRef.current = false;

      // For Malayalam, only use native if a real ml-* voice exists; otherwise use Sarvam.
      // sarvamTTS returns null if the server has no SARVAM_API_KEY configured.
      if (lang === 'ml' && !pickMlVoice()) {
        console.log('[TTS] Using Sarvam AI for Malayalam');
        setIsSpeaking(true);
        try {
          const url = await sarvamTTS(text, 'ml');
          if (url) {
            await playUrl(url);
            URL.revokeObjectURL(url);
            setIsSpeaking(false);
            return;
          }
        } catch (e) {
          console.warn('[TTS] Sarvam failed:', e);
        }
        setIsSpeaking(false);
        console.warn('[TTS] Malayalam TTS unavailable — silent.');
        return;
      }

      return speakNative(text, lang);
    },
    [pickMlVoice, pickEnVoice]
  );

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { speak, cancel, isSpeaking };
}

// ─── VAD (Web Audio API) ────────────────────────────────────────────
export function useVAD() {
  const [level, setLevel] = useState(0);
  const [isVoice, setIsVoice] = useState(false);
  const [waveform, setWaveform] = useState(() => new Uint8Array(64));
  const [active, setActive] = useState(false);
  const ctxRef = useRef(null);
  const streamRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  const start = useCallback(async () => {
    if (active) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});
      streamRef.current = stream;
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.6;
      src.connect(analyser);
      analyserRef.current = analyser;

      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const timeData = new Uint8Array(64);

      const tick = () => {
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) sum += freqData[i] * freqData[i];
        const rms = Math.sqrt(sum / freqData.length) / 255;
        setLevel(rms);
        setIsVoice(rms > 0.04);

        // Sample the waveform for visualization
        const wfData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(wfData);
        const step = Math.floor(wfData.length / 64);
        for (let i = 0; i < 64; i++) timeData[i] = wfData[i * step];
        setWaveform(new Uint8Array(timeData));

        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
      setActive(true);
    } catch (err) {
      console.error('Mic permission denied:', err);
      throw err;
    }
  }, [active]);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
    analyserRef.current = null;
    setLevel(0);
    setIsVoice(false);
    setActive(false);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { level, isVoice, waveform, active, start, stop };
}

// ─── Main Assistant Orchestration ───────────────────────────────────
export function useAssistant({ onTool: outerOnTool } = {}) {
  const [state, setState] = useState('IDLE');
  const [conversation, setConversation] = useState([]);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ turns: 0, latency: 0, tokens: 0 });
  const [language, setLanguageState] = useState('en');
  const languageRef = useRef('en');

  const stt = useSTT({ lang: language === 'ml' ? 'ml-IN' : 'en-US' });
  const tts = useTTS();
  const vad = useVAD();

  const sttRef = useRef(stt); sttRef.current = stt;
  const ttsRef = useRef(tts); ttsRef.current = tts;
  const vadRef = useRef(vad); vadRef.current = vad;
  const stateRef = useRef(state); stateRef.current = state;
  const conversationRef = useRef(conversation); conversationRef.current = conversation;
  const outerOnToolRef = useRef(outerOnTool); outerOnToolRef.current = outerOnTool;
  const silenceTimerRef = useRef(null);
  const bargeInStartRef = useRef(0);

  // Wrapped tool handler — handles set_language internally, delegates everything else
  const onTool = useCallback(async (name, args) => {
    if (name === 'set_language') {
      const lang = args?.lang === 'ml' ? 'ml' : 'en';
      languageRef.current = lang;        // synchronous so TTS reads it correctly
      setLanguageState(lang);            // async — drives STT useEffect
      return { success: true, message: `Language switched to ${lang === 'ml' ? 'Malayalam' : 'English'}` };
    }
    return outerOnToolRef.current
      ? outerOnToolRef.current(name, args)
      : { success: false, message: 'No tool handler registered' };
  }, []);

  const submit = useCallback(async (text) => {
    if (!text?.trim()) return;
    if (stateRef.current !== 'LISTENING') return;

    console.log('[JARVIS] Submitting:', text);
    const recent = conversationRef.current.slice(-12);
    let messages = [...recent, { role: 'user', content: text.trim() }];
    setConversation([...conversationRef.current, { role: 'user', content: text.trim() }]);
    sttRef.current.reset();
    sttRef.current.stop();
    setState('THINKING');

    try {
      let totalLatency = 0, totalTokens = 0, finalText = '';

      for (let iter = 0; iter < 4; iter++) {
        const result = await callLLM(messages, TOOLS, languageRef.current);
        totalLatency += result.latency;
        totalTokens += result.tokens;

        if (result.toolCalls.length > 0) {
          messages = [...messages, result.raw];
          for (const call of result.toolCalls) {
            const args = JSON.parse(call.function.arguments || '{}');
            console.log('[JARVIS] 🔧 Tool:', call.function.name, args);
            const toolResult = await onTool(call.function.name, args);
            messages.push({
              role: 'tool',
              tool_call_id: call.id,
              content: JSON.stringify(toolResult),
            });
          }
        } else {
          finalText = result.text;
          break;
        }
      }

      if (!finalText) finalText = languageRef.current === 'ml' ? 'ശരി, സർ.' : 'Done, sir.';

      console.log('[JARVIS] Reply:', finalText, `(${totalLatency}ms, lang=${languageRef.current})`);
      setConversation((prev) => [...prev, { role: 'assistant', content: finalText }]);
      setStats((s) => ({ turns: s.turns + 1, latency: totalLatency, tokens: s.tokens + totalTokens }));

      setState('SPEAKING');
      await ttsRef.current.speak(finalText, languageRef.current);
      setState('LISTENING');
      sttRef.current.start();
    } catch (err) {
      console.error('[JARVIS] LLM error:', err);
      setError(err.message);
      setState('LISTENING');
      sttRef.current.start();
    }
  }, [onTool]);

  useEffect(() => {
  if (state !== 'LISTENING') return;
  const text = (stt.transcript + ' ' + stt.interim).trim();
  if (!text) return;

  if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

  // Faster submit when VAD confirms silence; longer wait if user might still be talking.
  const delay = vad.isVoice ? 1800 : 700;

  silenceTimerRef.current = setTimeout(() => {
    silenceTimerRef.current = null;
    const final = (sttRef.current.transcript + ' ' + sttRef.current.interim).trim();
    if (final) submit(final);
  }, delay);

  return () => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  };
}, [stt.transcript, stt.interim, vad.isVoice, state, submit]);

// Barge-in — interrupt TTS when the user starts speaking
// Barge-in — interrupt TTS when the user starts speaking
useEffect(() => {
  if (state !== 'SPEAKING') {
    bargeInStartRef.current = 0;
    return;
  }

  // Grace period: don't check for barge-in during the first 1.2s of speaking.
  // This lets TTS audio ramp up and echo cancellation stabilize.
  const speakingStartedAt = Date.now();

  const id = setInterval(() => {
    // Skip the first 1.2s entirely
    if (Date.now() - speakingStartedAt < 1200) return;

    // Aggressive threshold — must be clearly louder than residual TTS bleed
    const speaking = vadRef.current.isVoice && vadRef.current.level > 0.15;

    if (speaking) {
      if (bargeInStartRef.current === 0) {
        bargeInStartRef.current = Date.now();
      } else if (Date.now() - bargeInStartRef.current > 700) {
        console.log('[JARVIS] Barge-in detected — interrupting');
        ttsRef.current.cancel();
        bargeInStartRef.current = 0;
      }
    } else {
      bargeInStartRef.current = 0;
    }
  }, 80);

  return () => clearInterval(id);
}, [state]);

  const start = useCallback(async () => {
    setError(null);
    try {
      await vadRef.current.start();
      sttRef.current.start();
      setState('LISTENING');
    } catch {
      setError('Microphone access denied');
      setState('IDLE');
    }
  }, []);

  const stop = useCallback(() => {
    setState('IDLE');
    vadRef.current.stop();
    sttRef.current.stop();
    ttsRef.current.cancel();
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
  }, []);

  return {
    state,
    conversation,
    transcript: (stt.transcript + ' ' + stt.interim).trim(),
    audioLevel: vad.level,
    waveform: vad.waveform,
    isVoice: vad.isVoice,
    sttSupported: stt.supported,
    error,
    stats,
    language,
    start,
    stop,
  };
}