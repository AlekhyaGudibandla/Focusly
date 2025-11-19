// src/components/Music.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Play, Pause, Volume2, VolumeX, Link as LinkIcon,
  SlidersHorizontal, Music2, Waves, CloudRain, Coffee, Trees, Radio, Youtube
} from "lucide-react";

/* ----------------------------- small utils ----------------------------- */
function useLocalStorage(key, initial) {
  const [v, setV] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; }
    catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }, [key, v]);
  return [v, setV];
}
const clamp = (n, a=0, b=1) => Math.min(b, Math.max(a, n));

/* ----------------------------- data ----------------------------- */
// Same-origin: place files in /public/sounds to avoid CORS issues.
const AMBIENT = [
  { id: "rain",   name: "Rain",         desc: "Gentle rain for deep focus",     url: "https://cdn.pixabay.com/audio/2025/11/15/audio_c5116879e1.mp3",   icon: CloudRain },
  { id: "forest", name: "Forest",       desc: "Birds & wind in trees",          url: "https://cdn.pixabay.com/audio/2025/02/03/audio_7599bcb342.mp3", icon: Trees },
  { id: "ocean",  name: "Ocean Waves",  desc: "Slow rolling surf",              url: "https://cdn.pixabay.com/audio/2021/08/09/audio_165a149ae7.mp3",  icon: Waves },
  { id: "cafe",   name: "Cafe",         desc: "Chatter & cups clinking",        url: "https://cdn.pixabay.com/audio/2022/03/10/audio_9a103c8b91.mp3",   icon: Coffee },
  { id: "white",  name: "White Noise",  desc: "Pure noise for masking",         url: "https://cdn.pixabay.com/audio/2025/11/11/audio_95ac248cb1.mp3",  icon: Radio },
  { id: "brown",  name: "Brown Noise",  desc: "Warm, low-frequency noise",      url: "https://cdn.pixabay.com/audio/2025/01/30/audio_3355ff9be4.mp3",  icon: Radio },
];

const FREQS = [
  { id:"alpha", label:"Alpha 8–12Hz",  beat:10, hint:"Relaxed awareness" },
  { id:"beta",  label:"Beta 13–20Hz",  beat:14, hint:"Active concentration" },
  { id:"theta", label:"Theta 4–8Hz",   beat:6,  hint:"Creative flow" },
  { id:"gamma", label:"Gamma 30–45Hz", beat:40, hint:"High focus" },
];

/* ----------------------------- audio engine ----------------------------- */
function useAudioEngine() {
  const ctxRef = useRef(null);
  const masterRef = useRef(null);

  const ensure = async () => {
    if (!ctxRef.current) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);
      ctxRef.current = ctx; masterRef.current = master;
    }
    if (ctxRef.current.state === "suspended") {
      try { await ctxRef.current.resume(); } catch {}
    }
    return { ctx: ctxRef.current, master: masterRef.current };
  };

  const close = async () => {
    try { await ctxRef.current?.close(); } catch {}
    ctxRef.current = null; masterRef.current = null;
  };

  return { ensure, close, ctxRef, masterRef };
}

/* ----------------------- YouTube audio-only iframe ----------------------- */
function YouTubeAudio({ url, playing, volume, muted, onError }) {
  const iframeRef = useRef(null);
  const videoId = useMemo(() => {
    if (!url) return "";
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtube.com")) return u.searchParams.get("v") || "";
      if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
      return "";
    } catch { return ""; }
  }, [url]);

  const post = (func, args=[]) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(JSON.stringify({ event:"command", func, args }), "*");
  };

  useEffect(() => {
    if (!videoId) return;
    const t = setTimeout(() => {
      post(muted ? "mute" : "unMute");
      post("setVolume", [Math.round(clamp(volume,0,1)*100)]);
      post(playing ? "playVideo" : "pauseVideo");
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  useEffect(() => { if (videoId) post(muted ? "mute" : "unMute"); }, [muted]);   // eslint-disable-line
  useEffect(() => { if (videoId) post("setVolume", [Math.round(clamp(volume,0,1)*100)]); }, [volume]); // eslint-disable-line
  useEffect(() => { if (videoId) post(playing ? "playVideo" : "pauseVideo"); }, [playing]); // eslint-disable-line

  if (!videoId) return null;

  const src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=0&fs=0&playsinline=1&rel=0&modestbranding=1`;

  return (
    <iframe
      ref={iframeRef}
      title="YouTube audio"
      src={src}
      allow="autoplay; encrypted-media"
      style={{ width: 0, height: 0, border: 0, position: "absolute", left: "-9999px" }}
      onError={onError}
    />
  );
}

/* ----------------------------- main component ---------------------------- */
export default function Music() {
  const engine = useAudioEngine();

  // global ui state
  const [volume, setVolume] = useLocalStorage("music:vol", 0.7);
  const [muted, setMuted]   = useLocalStorage("music:muted", false);

  // ambient player
  const audioRef = useRef(null);
  const [ambientId, setAmbientId] = useLocalStorage("music:ambientId", "");
  const [ambientPlaying, setAmbientPlaying] = useLocalStorage("music:ambientPlaying", false);
  const [ambientError, setAmbientError] = useState("");

  // custom url player
  const customRef = useRef(null);
  const [customUrl, setCustomUrl] = useLocalStorage("music:url", "");
  const [customPlaying, setCustomPlaying] = useLocalStorage("music:urlPlaying", false);
  const [customError, setCustomError] = useState("");

  // YouTube audio-only
  const [ytUrl, setYtUrl] = useLocalStorage("music:ytUrl", "");
  const [ytPlaying, setYtPlaying] = useLocalStorage("music:ytPlaying", false);
  const [ytError, setYtError] = useState("");

  // binaural
  const [freqId, setFreqId] = useLocalStorage("music:freqId", "alpha");
  const [carrier, setCarrier] = useLocalStorage("music:carrier", 200);
  const [binauralVol, setBinauralVol] = useLocalStorage("music:binVol", 0.3);
  const [binauralOn, setBinauralOn] = useLocalStorage("music:binOn", false);
  const bins = useRef(null);

  /* ----------------------------- effects ----------------------------- */
  useEffect(() => {
    const v = muted ? 0 : volume;
    if (audioRef.current)  audioRef.current.volume  = v;
    if (customRef.current) customRef.current.volume = v;
  }, [volume, muted]);

  useEffect(() => { if (audioRef.current) ambientPlaying ? audioRef.current.play().catch(()=>{}) : audioRef.current.pause(); }, [ambientPlaying]);
  useEffect(() => { if (customRef.current) customPlaying ? customRef.current.play().catch(()=>{}) : customRef.current.pause(); }, [customPlaying]);

  useEffect(() => () => { engine.close(); }, []); // cleanup audio context

  const currentBeat = useMemo(() => (FREQS.find(x => x.id === freqId) || FREQS[0]).beat, [freqId]);

  /* ----------------------------- actions ----------------------------- */
  const playAmbient = (id) => {
    const track = AMBIENT.find(t => t.id === id);
    if (!track) return;
    setAmbientError("");
    setAmbientId(id);
    setCustomPlaying(false);
    setYtPlaying(false);
    if (audioRef.current) {
      audioRef.current.src = track.url; // same-origin => no CORS issues
      audioRef.current.play()
        .then(()=> setAmbientPlaying(true))
        .catch(()=> setAmbientError("Couldn’t play this file. Check that /public/sounds/<file>.mp3 exists."));
    }
  };
  const toggleAmbient = () => { if (ambientId) setAmbientPlaying(p => !p); };

  const playCustom = () => {
    if (!customUrl.trim()) return;
    setCustomError("");
    setAmbientPlaying(false);
    setYtPlaying(false);
    if (customRef.current) {
      customRef.current.src = customUrl.trim();
      customRef.current.play()
        .then(()=> setCustomPlaying(true))
        .catch(()=> setCustomError("Couldn’t play this URL. It must be a direct audio link (e.g. .mp3)."));
    }
  };
  const toggleCustom = () => setCustomPlaying(p => !p);

  const playYouTube = () => {
    if (!ytUrl.trim()) return;
    setAmbientPlaying(false);
    setCustomPlaying(false);
    setYtError("");
    setYtPlaying(true);
  };
  const toggleYouTube = () => setYtPlaying(p => !p);

  const toggleMute = () => setMuted(m => !m);

  /* ----------------------------- binaural ----------------------------- */
  const startBinaural = async () => {
    const { ctx, master } = await engine.ensure();
    if (!bins.current) {
      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();
      const gain = ctx.createGain(); gain.gain.value = clamp(binauralVol,0,1);

      const panL = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const panR = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (panL) panL.pan.value = -1;
      if (panR) panR.pan.value = 1;

      leftOsc.type = "sine"; rightOsc.type = "sine";
      if (panL && panR) {
        leftOsc.connect(panL); panL.connect(gain);
        rightOsc.connect(panR); panR.connect(gain);
      } else {
        const merger = ctx.createChannelMerger(2);
        leftOsc.connect(merger, 0, 0);
        rightOsc.connect(merger, 0, 1);
        merger.connect(gain);
      }
      gain.connect(master);

      bins.current = { leftOsc, rightOsc, gain, started:false };
    }
    const { leftOsc, rightOsc, gain } = bins.current;
    leftOsc.frequency.setValueAtTime(Math.max(40, carrier - currentBeat/2), ctx.currentTime);
    rightOsc.frequency.setValueAtTime(Math.max(40, carrier + currentBeat/2), ctx.currentTime);
    gain.gain.setTargetAtTime(clamp(binauralVol,0,1), ctx.currentTime, 0.05);

    if (!bins.current.started) { leftOsc.start(); rightOsc.start(); bins.current.started = true; }
    setBinauralOn(true);
  };

  const stopBinaural = () => {
    if (!bins.current || !engine.ctxRef.current) return setBinauralOn(false);
    try { bins.current.gain.gain.setTargetAtTime(0, engine.ctxRef.current.currentTime, 0.05); } catch {}
    setBinauralOn(false);
  };

  useEffect(() => {
    if (!bins.current || !engine.ctxRef.current) return;
    const { leftOsc, rightOsc, gain } = bins.current;
    const ctx = engine.ctxRef.current;
    leftOsc?.frequency?.setTargetAtTime(Math.max(40, carrier - currentBeat/2), ctx.currentTime, 0.05);
    rightOsc?.frequency?.setTargetAtTime(Math.max(40, carrier + currentBeat/2), ctx.currentTime, 0.05);
    gain?.gain?.setTargetAtTime(clamp(binauralVol,0,1), ctx.currentTime, 0.05);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrier, currentBeat, binauralVol]);

  /* ----------------------------- ui ----------------------------- */
  const activeAmbient = AMBIENT.find(a => a.id === ambientId);

  return (
    <section className="space-y-5">
      {/* Title */}
      <div className="rounded-2xl bg-white/80 dark:bg-zinc-800/70 backdrop-blur p-4 shadow-soft border border-black/5 dark:border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music2 className="opacity-70" />
            <h2 className="text-xl font-extrabold tracking-tight">Music & Focus</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMute}
              className="rounded-xl px-3 py-2 bg-zinc-100 dark:bg-zinc-900 hover:opacity-90 cursor-pointer"
              title={muted ? "Unmute" : "Mute"}
            >
              {muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs">
              <span className="text-zinc-500 ">Volume</span>
              <input
                type="range" min={0} max={1} step="0.01"
                value={volume}
                className="cursor-pointer"
                onChange={(e)=>setVolume(+e.target.value)}
              />
              <span className="w-10 text-right">{Math.round(volume*100)}%</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-500 mt-1">Play ambient loops, your own audio URLs, YouTube audio-only, and gentle binaural tones.</p>
      </div>

      {/* Ambient grid */}
      <Card title="Ambient Mix" icon={<Waves size={16}/>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {AMBIENT.map(t => {
            const Icon = t.icon || Music2;
            const active = ambientId === t.id && ambientPlaying;
            return (
              <button
                key={t.id}
                onClick={() => (ambientId === t.id ? toggleAmbient() : playAmbient(t.id))}
                className={`group rounded-2xl p-4 border transition text-left cursor-pointer
                  ${active ? "bg-zinc-900 text-white border-zinc-800" : "bg-white/80 dark:bg-zinc-800/70 border-black/5 dark:border-white/5"}
                  hover:shadow-lg`}
              >
                <div className="flex items-center gap-3">
                  <span className={`rounded-xl p-2 ${active ? "bg-white/15" : "bg-zinc-100 dark:bg-zinc-900"}`}>
                    <Icon size={18}/>
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="text-xs text-zinc-500 group-hover:text-zinc-400 truncate">{t.desc}</div>
                  </div>
                  <div className="ml-auto rounded-lg px-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-900">
                    {active ? "Pause" : (ambientId === t.id ? "Resume" : "Play")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {activeAmbient && (
          <div className="mt-3 text-xs text-zinc-500">
            Now {ambientPlaying ? "playing" : "selected"}: <span className="font-medium">{activeAmbient.name}</span>
          </div>
        )}
        {ambientError && <div className="mt-2 text-xs text-rose-500">{ambientError}</div>}
      </Card>

      {/* Custom URL */}
      <Card title="Play Your Audio (Direct URL)" icon={<LinkIcon size={16}/>}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              value={customUrl}
              onChange={(e)=>setCustomUrl(e.target.value)}
              placeholder="Paste a direct audio URL (e.g. https://.../file.mp3)"
              className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2 outline-none"
            />
            <button
              onClick={() => customPlaying ? toggleCustom() : playCustom()}
              className="rounded-xl px-3 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
              disabled={!customUrl.trim()}
            >
              {customPlaying ? <Pause size={16}/> : <Play size={16}/>}
            </button>
          </div>
          {customError && <div className="text-xs text-rose-500">{customError}</div>}
          <p className="text-[11px] text-zinc-500">
            If it doesn’t play, the host may block cross-origin playback. Try another URL.
          </p>
        </div>
      </Card>

      {/* YouTube audio-only */}
      <Card title="YouTube (audio only)" icon={<Youtube size={16}/>}>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input
              value={ytUrl}
              onChange={(e)=>setYtUrl(e.target.value)}
              placeholder="Paste a YouTube URL"
              className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2 outline-none"
            />
            <button
              onClick={() => ytPlaying ? toggleYouTube() : playYouTube()}
              className="rounded-xl px-3 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer"
              disabled={!ytUrl.trim()}
            >
              {ytPlaying ? <Pause size={16}/> : <Play size={16}/>}
            </button>
          </div>
          {ytError && <div className="text-xs text-rose-500">{ytError}</div>}
          <p className="text-[11px] text-zinc-500">
            Video stays hidden; we control audio via the YouTube IFrame API.
          </p>
        </div>

        {/* hidden audio-only iframe */}
        <YouTubeAudio
          url={ytUrl}
          playing={ytPlaying}
          volume={muted ? 0 : volume}
          muted={muted}
          onError={() => setYtError("Couldn’t load YouTube. Check the link.")}
        />
      </Card>

      {/* Binaural focus tones */}
      <Card title="Focus Tones (Binaural)" icon={<SlidersHorizontal size={16}/>}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {FREQS.map(f => {
            const active = freqId === f.id && binauralOn;
            return (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                onClick={() => setFreqId(f.id)}
                onKeyDown={(e)=> (e.key === "Enter" || e.key === " ") && setFreqId(f.id)}
                className={`rounded-2xl p-4 border transition text-left cursor-pointer
                  ${active ? "bg-zinc-900 text-white border-zinc-800" : "bg-white/80 dark:bg-zinc-800/70 border-black/5 dark:border-white/5"}
                  hover:shadow-lg`}
              >
                <div className="font-semibold">{f.label}</div>
                <div className="text-xs text-zinc-500 mt-1">{f.hint}</div>
                {freqId === f.id && (
                  <div className="mt-3 flex items-center gap-2">
                    {!binauralOn ? (
                      <button
                        onClick={(e)=>{ e.stopPropagation(); startBinaural(); }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs cursor-pointer"
                      >
                        <Play size={14}/> Play
                      </button>
                    ) : (
                      <button
                        onClick={(e)=>{ e.stopPropagation(); stopBinaural(); }}
                        className="px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 text-xs cursor-pointer"
                      >
                        <Pause size={14}/> Pause
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* fine controls */}
        <div className="mt-4 grid md:grid-cols-3 gap-3 text-xs">
          <label className="flex items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2">
            <span className="shrink-0 text-zinc-500">Carrier</span>
            <input type="range" min={120} max={600} value={carrier} onChange={(e)=>setCarrier(+e.target.value)} className="w-full"/>
            <span className="w-10 text-right">{carrier}</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2">
            <span className="shrink-0 text-zinc-500">Beat</span>
            <span className="w-full">{(FREQS.find(freq=>freq.id===freqId)?.beat) ?? 10} Hz</span>
          </label>
          <label className="flex items-center gap-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 px-3 py-2">
            <span className="shrink-0 text-zinc-500">Tone Vol</span>
            <input type="range" min={0} max={1} step="0.01" value={binauralVol} onChange={(e)=>setBinauralVol(+e.target.value)} className="w-full"/>
            <span className="w-10 text-right">{Math.round(binauralVol*100)}%</span>
          </label>
        </div>
      </Card>

      {/* hidden players */}
      <audio ref={audioRef} loop preload="none" />
      <audio ref={customRef} loop preload="none" />
    </section>
  );
}

/* -------------------------------- UI bits ------------------------------- */
function Card({ title, icon, children }) {
  return (
    <div className="rounded-2xl bg-white/80 dark:bg-zinc-800/70 backdrop-blur p-4 shadow-soft border border-black/5 dark:border-white/5">
      <div className="flex items-center gap-2 mb-3">
        <div className="opacity-70">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
