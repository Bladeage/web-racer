// KI-Fahrer mit neutraler Fahrweise: faehrt die Mittellinie nach, bremst vor Kurven,
// driftet nicht, weicht nicht aus und draengelt nicht. Ohne DOM und ohne Three.js.
// Er erzeugt dieselben Eingaben wie ein Spieler und nutzt dieselbe Physik.
import { pointAt } from './track.js';
import { KART } from './kart.js';

// Schaetzwerte, so gewaehlt, dass die KI sauber faehrt, aber schlagbar bleibt.
export function createAi(opts = {}) {
  return {
    speedFactor: opts.speedFactor ?? 0.88,  // Anteil der Hoechstgeschwindigkeit auf Geraden
    latAcc: opts.latAcc ?? 24,              // m/s^2 erlaubte Querbeschleunigung in Kurven
    decel: opts.decel ?? 14,                // m/s^2, mit denen die KI vor Kurven plant zu bremsen
    offset: opts.offset ?? 0,               // seitlicher Versatz zur Mittellinie in m
    look: 5, lookGain: 0.45,                // Blick nach vorn: Grundweite plus Anteil der Geschwindigkeit
  };
}

// Zielgeschwindigkeit: kleinste Kurvengeschwindigkeit im Bremsweg voraus, inklusive Bremsweg.
function targetSpeed(ai, track, s) {
  const { curv, cum, length } = track;
  const n = curv.length;
  const vTop = KART.maxSpeed * ai.speedFactor;
  let v = vTop;
  const range = vTop * vTop / (2 * ai.decel) + 5;
  const i0 = pointAt(track, s).idx;
  for (let j = 0; j < n; j++) {
    const k = (i0 + j) % n;
    let dist = cum[k] - s;
    if (dist < 0) dist += length;
    if (dist > range) break;
    if (curv[k] < 1e-4) continue;
    const vCurve = Math.sqrt(ai.latAcc / curv[k]);
    v = Math.min(v, Math.sqrt(vCurve * vCurve + 2 * ai.decel * dist));
  }
  return v;
}

export function aiInput(ai, kart, track) {
  const v = Math.max(0, kart.speed);
  const p = pointAt(track, kart.s + ai.look + v * ai.lookGain, ai.offset);
  const fx = Math.sin(kart.heading), fz = Math.cos(kart.heading);
  const dx = p.x - kart.x, dz = p.z - kart.z;
  const lat = dx * -fz + dz * fx;          // rechts positiv
  const fwd = dx * fx + dz * fz;
  const ang = Math.atan2(lat, fwd);
  const steer = Math.max(-1, Math.min(1, ang * 2.5));
  const vt = targetSpeed(ai, track, kart.s);
  return {
    throttle: v < vt ? 1 : 0,
    brake: v > vt + 1.5 ? 1 : 0,
    steer,
    drift: false,
  };
}
