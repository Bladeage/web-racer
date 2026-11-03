// Ton ueber Web Audio: Motor je Kart (Tonhoehe nach Tempo), Reifenquietschen, Aufprall, Schub.
// Toene aus dem Kenney Starter Kit Racing (CC0). Kann ein Browser .ogg nicht dekodieren,
// ersetzt ein einfacher Oszillator den Motor; dann fehlen Quietschen und Aufprall.
import { KART } from './kart.js';

export function createSound() {
  return { ctx: null, master: null, buf: {}, voices: [], volume: 0.7, ready: false };
}

export async function initSound(snd, base) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!snd.ctx) {
    snd.ctx = new AC();
    snd.master = snd.ctx.createGain();
    snd.master.gain.value = snd.volume;
    snd.master.connect(snd.ctx.destination);
  }
  if (snd.ctx.state === 'suspended') await snd.ctx.resume();
  if (snd.ready) return;
  await Promise.all(['engine', 'skid', 'impact'].map(async (n) => {
    try {
      const res = await fetch(base + n + '.ogg');
      snd.buf[n] = await snd.ctx.decodeAudioData(await res.arrayBuffer());
    } catch (e) {
      snd.buf[n] = null;
    }
  }));
  snd.ready = true;
}

export function setVolume(snd, v) {
  snd.volume = v;
  if (snd.master) snd.master.gain.setTargetAtTime(v, snd.ctx.currentTime, 0.05);
}

function loop(snd, buffer, dest) {
  const src = snd.ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  src.connect(dest);
  src.start();
  return src;
}

// Eine Stimme je Kart: Motor und Quietschen, beide mit Lautstaerke und Stereo-Lage.
export function startRaceSound(snd, count) {
  stopRaceSound(snd);
  if (!snd.ctx || !snd.ready) return;
  for (let i = 0; i < count; i++) {
    const out = snd.ctx.createGain();
    const pan = snd.ctx.createStereoPanner ? snd.ctx.createStereoPanner() : null;
    if (pan) { out.connect(pan); pan.connect(snd.master); } else out.connect(snd.master);
    const engGain = snd.ctx.createGain();
    engGain.gain.value = 0;
    engGain.connect(out);
    let engine;
    if (snd.buf.engine) engine = loop(snd, snd.buf.engine, engGain);
    else {
      engine = snd.ctx.createOscillator();
      engine.type = 'sawtooth';
      const lp = snd.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 700;
      engine.connect(lp);
      lp.connect(engGain);
      engine.start();
    }
    const skidGain = snd.ctx.createGain();
    skidGain.gain.value = 0;
    skidGain.connect(out);
    const skid = snd.buf.skid ? loop(snd, snd.buf.skid, skidGain) : null;
    snd.voices.push({ out, pan, engine, engGain, skid, skidGain });
  }
}

export function stopRaceSound(snd) {
  for (const v of snd.voices) {
    try { v.engine.stop(); } catch (e) { /* schon gestoppt */ }
    if (v.skid) try { v.skid.stop(); } catch (e) { /* schon gestoppt */ }
    v.out.disconnect();
  }
  snd.voices = [];
}

// Lautstaerke nach Abstand zum Hoerer (dem Spieler-Kart), Lage links/rechts nach Richtung.
// me ist ein Kart oder eine Liste von Karts (Split-Screen). Mit zwei Hoerern: lautester Wert, keine Stereo-Lage.
function placement(k, me) {
  if (Array.isArray(me)) {
    if (me.length === 1) return placement(k, me[0]);
    let att = 0;
    for (const m of me) att = Math.max(att, placement(k, m).att);
    return { att, pan: 0 };
  }
  if (k === me) return { att: 1, pan: 0 };
  const dx = k.x - me.x, dz = k.z - me.z;
  const dist = Math.hypot(dx, dz);
  const right = (dx * -Math.cos(me.heading) + dz * Math.sin(me.heading)) / Math.max(dist, 1);
  return { att: 1 / (1 + dist / 6), pan: Math.max(-0.8, Math.min(0.8, right)) };
}

export function updateRaceSound(snd, karts, me, paused) {
  if (!snd.ctx || !snd.voices.length) return;
  const t = snd.ctx.currentTime;
  karts.forEach((k, i) => {
    const v = snd.voices[i];
    if (!v) return;
    const { att, pan } = placement(k, me);
    const sp = Math.min(1.3, Math.abs(k.speed) / KART.maxSpeed);
    const rate = 0.55 + sp * 1.0 + (k.boost > 0 ? 0.15 : 0);
    if (v.engine.playbackRate) v.engine.playbackRate.setTargetAtTime(rate, t, 0.05);
    else v.engine.frequency.setTargetAtTime(50 + rate * 90, t, 0.05);
    const eng = paused ? 0 : (0.18 + sp * 0.22) * att;
    v.engGain.gain.setTargetAtTime(eng, t, 0.05);
    const slide = k.drift ? 0.35 : Math.max(0, Math.min(1, (Math.abs(k.slip) - 3) / 6)) * 0.3;
    v.skidGain.gain.setTargetAtTime(paused ? 0 : slide * att, t, 0.04);
    if (v.pan) v.pan.pan.setTargetAtTime(pan, t, 0.05);
  });
}

export function playImpact(snd, strength, k, me) {
  if (!snd.ctx || !snd.buf.impact) return;
  const { att } = placement(k, me);
  const g = snd.ctx.createGain();
  g.gain.value = Math.min(1, strength / 10) * 0.8 * att;
  g.connect(snd.master);
  const src = snd.ctx.createBufferSource();
  src.buffer = snd.buf.impact;
  src.playbackRate.value = 0.9 + Math.random() * 0.2;
  src.connect(g);
  src.start();
}

// Schub: kurzes Rauschen, dessen Filter nach oben gleitet. Wird erzeugt, keine Datei noetig.
export function playBoost(snd, k, me) {
  if (!snd.ctx) return;
  const { att } = placement(k, me);
  const ctx = snd.ctx, t = ctx.currentTime, dur = 0.6;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 1.2;
  bp.frequency.setValueAtTime(400, t);
  bp.frequency.exponentialRampToValueAtTime(2600, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5 * att + 0.001, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(bp); bp.connect(g); g.connect(snd.master);
  src.start(t);
  src.stop(t + dur);
}

// Kurzer Piepton fuer den Countdown.
export function playBeep(snd, high) {
  if (!snd.ctx) return;
  const ctx = snd.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = 'square';
  o.frequency.value = high ? 880 : 440;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.15, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + (high ? 0.5 : 0.2));
  o.connect(g); g.connect(snd.master);
  o.start(t);
  o.stop(t + 0.6);
}
