// Arcade-Fahrphysik mit Drift und Mini-Turbo. Ohne DOM und ohne Three.js.
//
// Richtung: heading ist der Gierwinkel. Vorwaerts = (sin h, cos h) in (x, z), wie rotation.y in Three.js.
// Rechts = (-cos h, sin h). Lenken nach rechts verkleinert heading.
//
// Alle Zahlen sind Schaetzungen fuer ein Arcade-Gefuehl, keine Messwerte.
// Annahme: Kart-Massstab etwa 3,5 m Laenge, Strasse etwa 17 m breit, Runde etwa 350 m.
import { project } from './track.js';

export const KART = {
  radius: 1.1,          // Kollisionskreis in m (Fahrzeug etwa 1,9 x 3,5 m)
  maxSpeed: 24,         // m/s, etwa 86 km/h
  accel: 13,            // m/s^2 beim Gasgeben
  brake: 28,            // m/s^2 beim Bremsen
  reverseMax: 7,        // m/s rueckwaerts
  roll: 3,              // m/s^2 Ausrollen ohne Gas
  steerRate: 2.4,       // rad/s Gierrate bei voller Lenkung (mittleres Tempo)
  steerHighLoss: 0.3,   // Anteil, um den die Lenkung bei Hoechstgeschwindigkeit abnimmt
  grip: 9,              // 1/s, wie schnell seitliches Rutschen abklingt
  driftGrip: 5,         // 1/s, im Drift rutscht das Kart mehr
  driftKeep: 0.7,       // Anteil des abgebauten Rutschens, der im Drift in Vortrieb uebergeht
  driftMinSpeed: 9,     // m/s, darunter kein Drift
  driftYaw: 1.5,        // rad/s Grund-Gierrate im Drift
  driftSteer: 0.55,     // wie stark Lenken die Drift-Kurve enger oder weiter macht
  charge1: 0.8,         // s Drift fuer Mini-Turbo Stufe 1 (blaue Funken)
  charge2: 1.8,         // s Drift fuer Stufe 2 (orange Funken)
  boost1: 0.7,          // s Schub Stufe 1
  boost2: 1.3,          // s Schub Stufe 2
  boostSpeed: 7,        // m/s mehr Hoechstgeschwindigkeit im Schub
  boostAccel: 22,       // m/s^2 zusaetzlich im Schub
};

export function createKart(x, z, heading) {
  return {
    x, z, heading, vx: 0, vz: 0,
    speed: 0,        // Geschwindigkeit in Fahrtrichtung (m/s)
    slip: 0,         // seitliche Geschwindigkeit (m/s)
    yawRate: 0,
    steer: 0,        // geglaettete Lenkung (fuer Anzeige)
    drift: 0,        // -1 links, 0 kein Drift, 1 rechts
    charge: 0,       // Drift-Dauer in s
    boost: 0,        // restliche Schub-Zeit in s
    boostStart: false, // true in dem Schritt, in dem ein Schub beginnt (fuer Ton)
    hop: 0,          // kleiner Hopser beim Drift-Start (s)
    wallHit: 0,      // Staerke des letzten Bandenkontakts (m/s), fuer Ton
    s: 0, d: 0, trackIdx: -1,
  };
}

export function chargeLevel(k) {
  if (!k.drift) return 0;
  return k.charge >= KART.charge2 ? 2 : k.charge >= KART.charge1 ? 1 : 0;
}

// inp: { throttle 0..1, brake 0..1, steer -1..1 (rechts positiv), drift bool }
export function stepKart(k, inp, dt, P = KART) {
  k.boostStart = false;
  let fx = Math.sin(k.heading), fz = Math.cos(k.heading);
  let vf = k.vx * fx + k.vz * fz;

  // Drift beginnen: Taste gedrueckt, gelenkt, schnell genug.
  if (!k.drift && inp.drift && Math.abs(inp.steer) > 0.3 && vf > P.driftMinSpeed) {
    k.drift = Math.sign(inp.steer);
    k.charge = 0;
    k.hop = 0.18;
  }
  // Drift beenden: Taste losgelassen gibt Schub je nach Stufe. Zu langsam bricht ohne Schub ab.
  if (k.drift && (!inp.drift || vf < P.driftMinSpeed * 0.6)) {
    const lvl = chargeLevel(k);
    if (!inp.drift && lvl > 0) {
      k.boost = Math.max(k.boost, lvl === 2 ? P.boost2 : P.boost1);
      k.boostStart = true;
    }
    k.drift = 0;
    k.charge = 0;
  }

  // Lenken
  k.steer += (inp.steer - k.steer) * Math.min(1, dt * 12);
  let targetYaw;
  if (k.drift) {
    const m = 1 + P.driftSteer * inp.steer * k.drift;     // zur Driftseite lenken = enger
    targetYaw = -k.drift * P.driftYaw * m;
    k.charge += dt * (inp.steer * k.drift > 0.2 ? 1.25 : 0.75);
  } else {
    // Im Stand kaum Lenkung. Mit Gas oder Bremse etwas, damit man sich von der Bande loesen kann.
    const low = Math.max(inp.throttle > 0 || inp.brake > 0 ? 0.45 : 0, Math.min(1, Math.abs(vf) / 5));
    const high = 1 - P.steerHighLoss * Math.min(1, Math.max(0, vf) / P.maxSpeed);
    targetYaw = -inp.steer * P.steerRate * low * high * (vf < -0.5 ? -1 : 1);
  }
  k.yawRate += (targetYaw - k.yawRate) * Math.min(1, dt * 10);
  k.heading += k.yawRate * dt;

  // Geschwindigkeit in die neue Ausrichtung zerlegen.
  fx = Math.sin(k.heading); fz = Math.cos(k.heading);
  const rx = -fz, rz = fx;
  vf = k.vx * fx + k.vz * fz;
  let vs = k.vx * rx + k.vz * rz;

  // Laengsrichtung
  if (k.boost > 0) k.boost = Math.max(0, k.boost - dt);
  const top = P.maxSpeed + (k.boost > 0 ? P.boostSpeed : 0);
  if (inp.throttle > 0 && vf < top) vf = Math.min(top, vf + P.accel * inp.throttle * dt);
  if (k.boost > 0 && vf < top) vf = Math.min(top, vf + P.boostAccel * dt);
  if (inp.brake > 0) {
    if (vf > 0.3) vf = Math.max(0, vf - P.brake * inp.brake * dt);
    else if (vf > -P.reverseMax) vf -= P.accel * 0.6 * inp.brake * dt;
  }
  if (!(inp.throttle > 0) && !(inp.brake > 0) && k.boost <= 0) {
    vf -= Math.sign(vf) * Math.min(Math.abs(vf), P.roll * dt);
  }
  if (vf > top) vf = top + (vf - top) * Math.exp(-1.5 * dt);   // nach dem Schub sanft abbremsen

  // Querrichtung: Haftung baut Rutschen ab.
  const vs0 = vs;
  vs *= Math.exp(-(k.drift ? P.driftGrip : P.grip) * dt);
  if (k.drift && vf > 0) vf = Math.min(top, vf + Math.abs(vs0 - vs) * P.driftKeep);

  k.vx = fx * vf + rx * vs;
  k.vz = fz * vf + rz * vs;
  k.x += k.vx * dt;
  k.z += k.vz * dt;
  k.speed = vf;
  k.slip = vs;
  if (k.hop > 0) k.hop = Math.max(0, k.hop - dt);
}

// Bande: Abstand zur Mittellinie begrenzen, Geschwindigkeit zur Bande hin daempfen und leicht abprallen.
export function collideWall(k, track, P = KART) {
  const pr = project(track, k.x, k.z, k.trackIdx);
  k.trackIdx = pr.idx;
  k.s = pr.s;
  k.d = pr.d;
  k.wallHit = 0;
  const lim = track.halfWidth - P.radius;
  if (Math.abs(pr.d) <= lim) return;
  const sg = Math.sign(pr.d);
  const rx = -pr.tz * sg, rz = pr.tx * sg;        // zeigt zur Bande hin
  const over = Math.abs(pr.d) - lim;
  k.x -= rx * over;
  k.z -= rz * over;
  k.d = sg * lim;
  const vn = k.vx * rx + k.vz * rz;
  if (vn > 0) {
    k.vx -= rx * vn * 1.3;                          // 30 % Abprall
    k.vz -= rz * vn * 1.3;
    const keep = Math.max(0.6, 1 - vn * 0.04);       // harter Aufprall kostet mehr Tempo
    k.vx *= keep;
    k.vz *= keep;
    k.wallHit = vn;
  }
}

// Zwei Karts als Kreise: auseinanderschieben, Geschwindigkeit entlang der Verbindung tauschen (gleiche Masse).
export function collideKarts(a, b, P = KART) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const dist = Math.hypot(dx, dz);
  const min = 2 * P.radius;
  if (dist >= min || dist === 0) return 0;
  const nx = dx / dist, nz = dz / dist;
  const push = (min - dist) / 2;
  a.x -= nx * push; a.z -= nz * push;
  b.x += nx * push; b.z += nz * push;
  const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (rel >= 0) return 0;
  const j = -rel * 0.75;                             // Stoss mit etwas Daempfung
  a.vx -= nx * j; a.vz -= nz * j;
  b.vx += nx * j; b.vz += nz * j;
  return -rel;
}
