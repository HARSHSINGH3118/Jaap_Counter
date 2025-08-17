import { useEffect, useRef, useState } from "react";

export default function AudioPlayer() {
  const audioRef = useRef(null);
  const [on, setOn] = useState(localStorage.getItem("audio:on") === "1");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    localStorage.setItem("audio:on", on ? "1" : "0");
  }, [on]);

  async function toggle() {
    const a = audioRef.current;
    if (!a) return;
    setErr("");
    try {
      if (!on) {
        setLoading(true);
        const bust = Date.now();               // cache-bust stale SW entries
        a.src = `/audio/jaap.mp3?v=${bust}`;
        a.volume = 0.6;
        a.muted = false;
        if (a.readyState === 0) a.load();
        await a.play();                        // user gesture
        setOn(true);
      } else {
        a.pause();
        setOn(false);
      }
    } catch (e) {
      setErr(humanizeAudioError(e, a));
    } finally {
      setLoading(false);
    }
  }

  async function testBeep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      await ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440;
      gain.gain.value = 0.1;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      setTimeout(() => { osc.stop(); ctx.close(); }, 300);
    } catch {}
  }

  return (
    <div className="audio-widget">
      <audio ref={audioRef} preload="none" loop playsInline />
      <button className={`btn small ${on ? "" : "ghost"}`} onClick={toggle} disabled={loading}>
        {on ? "⏸︎ Pause Kirtan" : (loading ? "Loading…" : "▶︎ Play Kirtan")}
      </button>
      <input
        type="range" min="0" max="1" step="0.01" defaultValue="0.6"
        onChange={(e)=>{ if (audioRef.current) audioRef.current.volume = Number(e.target.value); }}
        style={{ width: 90 }} aria-label="Volume"
      />
      <button className="btn small ghost" onClick={testBeep} title="Play a short test tone">🔊 Test</button>

      

      {err && <span className="dim" style={{marginLeft:8}} title={err}>⚠️ {err}</span>}
    </div>
  );
}

function humanizeAudioError(e, audioEl) {
  const me = audioEl?.error;
  if (me) {
    switch (me.code) {
      case me.MEDIA_ERR_ABORTED: return "Playback aborted.";
      case me.MEDIA_ERR_NETWORK: return "Audio network error.";
      case me.MEDIA_ERR_DECODE: return "Cannot decode audio.";
      case me.MEDIA_ERR_SRC_NOT_SUPPORTED: return "Audio missing/unsupported.";
      default: return "Audio error.";
    }
  }
  const msg = String(e?.message || e);
  if (/NotAllowedError|interact|autoplay/i.test(msg)) return "Tap Play to start (autoplay policy).";
  return msg;
}
