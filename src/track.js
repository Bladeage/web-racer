// Strecke aus Kacheln (Kenney Starter Kit Racing) und ihre Mittellinie.
// Ohne DOM und ohne Three.js, damit Node sie testen kann.
//
// Koordinaten: Welt-X nach Osten, Welt-Z nach Sueden (Three.js: -Z ist "vorn/Norden").
// Richtungen als Index: 0 = Nord (-Z), 1 = Ost (+X), 2 = Sued (+Z), 3 = West (-X).

export const TILE_SCALE = 2;              // Kenney-Kachel ist 10 m; Faktor 2 macht die Kurven fahrbar.
export const TILE = 10 * TILE_SCALE;      // Kachelgroesse in m
// Abstand Mittellinie bis Innenkante der Bande: 4,2 m in der Kenney-Kachel (aus einem Render von oben abgelesen).
export const HALF_WIDTH = 4.2 * TILE_SCALE;

export const DIR_VEC = [[0, -1], [1, 0], [0, 1], [-1, 0]];

// Strecke 1: F = Start/Ziel, S = gerade, L/R = Kurve links/rechts. Start in Richtung West.
// pads: Boost-Felder auf geraden Kacheln. tile = Kachel-Index, at = Lage in der Kachel (0..1),
// d = seitlicher Versatz (rechts positiv), len/w = Laenge und Breite in m.
// Mischung: zwei Felder auf langen Geraden (einfach mitnehmen), zwei kurz vor Kurven (Schub in die Kurve, braucht Koennen).
export const TRACK_1 = {
  name: 'Waldring', layout: 'FSRSSSRSSRLSRSSRSS', startDir: 3,
  pads: [
    { tile: 3, at: 0.2, d: 0, len: 6, w: 5 },      // Anfang der langen Gegengeraden, mittig
    { tile: 16, at: 0.3, d: -4, len: 6, w: 4.5 },  // Start-Zielgerade, links: man muss die Linie waehlen
    { tile: 8, at: 0.6, d: -3.5, len: 6, w: 4.5 }, // vor der Schikane, aussen: mit Schub in die Rechts-Links-Kombination
    { tile: 14, at: 0.6, d: -3.5, len: 6, w: 4.5 },// vor der letzten Rechtskurve, aussen
  ],
};

const STEP = 0.5; // Abstand der Mittellinien-Punkte in m

// Baut Kacheln und Mittellinie. Wirft einen Fehler, wenn die Strecke nicht geschlossen ist.
export function buildTrack(def) {
  let gx = 0, gz = 0, dir = def.startDir;
  const tiles = [];
  const pts = [];
  for (const c of def.layout) {
    const cx = gx * TILE, cz = gz * TILE;
    const inDir = dir;
    if (c === 'L') dir = (dir + 3) % 4;
    else if (c === 'R') dir = (dir + 1) % 4;
    tiles.push({ type: c, gx, gz, x: cx, z: cz, inDir, outDir: dir, rot: tileRotation(c, inDir, dir), i0: pts.length });
    tileCenterline(pts, cx, cz, inDir, dir);
    gx += DIR_VEC[dir][0];
    gz += DIR_VEC[dir][1];
  }
  if (gx !== 0 || gz !== 0 || dir !== def.startDir) throw new Error('Strecke ist nicht geschlossen');

  const n = pts.length;
  const cum = new Float64Array(n + 1);
  for (let k = 0; k < n; k++) {
    const a = pts[k], b = pts[(k + 1) % n];
    cum[k + 1] = cum[k] + Math.hypot(b.x - a.x, b.z - a.z);
  }
  const length = cum[n];

  // Kruemmung je Punkt (1/m), fuer die KI-Geschwindigkeit.
  const curv = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const p0 = pts[(k - 1 + n) % n], p1 = pts[k], p2 = pts[(k + 1) % n];
    const h1 = Math.atan2(p1.x - p0.x, p1.z - p0.z);
    const h2 = Math.atan2(p2.x - p1.x, p2.z - p1.z);
    curv[k] = Math.abs(wrapAngle(h2 - h1)) / STEP;
  }

  for (const t of tiles) t.s0 = cum[t.i0];
  const pads = (def.pads || []).map((p) => {
    const t = tiles[p.tile];
    if (!t || (t.type !== 'S' && t.type !== 'F')) throw new Error('Boost-Feld nur auf geraden Kacheln');
    const s0 = t.s0 + p.at * TILE;
    return { s0, s1: s0 + p.len, d: p.d, w: p.w };
  });

  // Ziellinie: Mitte der Startkachel. Die Mittellinie beginnt an deren Eingangskante.
  const lineS = TILE / 2;
  const sd = DIR_VEC[def.startDir];
  return {
    name: def.name, tiles, pts, cum, curv, length, halfWidth: HALF_WIDTH, lineS, pads,
    start: { x: tiles[0].x, z: tiles[0].z, heading: Math.atan2(sd[0], sd[1]) },
  };
}

// Drehung einer Kachel um Y in Vielfachen von 90 Grad (Three.js rotation.y, gegen den Uhrzeigersinn von oben).
// Gerade und Ziel: Modell verlaeuft Nord-Sued. Kurve: Modell verbindet Sued- und Westkante.
export function tileRotation(type, inDir, outDir) {
  if (type !== 'L' && type !== 'R') return (inDir % 2 === 0) ? 0 : Math.PI / 2;
  const a = (inDir + 2) % 4, b = outDir;      // Kanten, an denen die Strasse die Kachel beruehrt
  for (let k = 0; k < 4; k++) {
    // +90 Grad bildet Richtung d auf d-1 ab.
    const e1 = (2 - k + 4) % 4, e2 = (3 - k + 4) % 4;
    if ((e1 === a && e2 === b) || (e1 === b && e2 === a)) return k * Math.PI / 2;
  }
  throw new Error('Kurve ohne passende Drehung');
}

function tileCenterline(out, cx, cz, inDir, outDir) {
  const h = TILE / 2;
  const ex = cx - DIR_VEC[inDir][0] * h, ez = cz - DIR_VEC[inDir][1] * h;     // Eingang
  const ox = cx + DIR_VEC[outDir][0] * h, oz = cz + DIR_VEC[outDir][1] * h;   // Ausgang
  if (inDir === outDir) {
    const n = Math.round(TILE / STEP);
    for (let k = 0; k < n; k++) out.push({ x: ex + (ox - ex) * k / n, z: ez + (oz - ez) * k / n });
    return;
  }
  // Viertelkreis um die gemeinsame Ecke von Eingangs- und Ausgangskante.
  const mx = ex + DIR_VEC[outDir][0] * h, mz = ez + DIR_VEC[outDir][1] * h;
  const a0 = Math.atan2(ez - mz, ex - mx);
  const a1 = a0 + wrapAngle(Math.atan2(oz - mz, ox - mx) - a0);
  const n = Math.round((Math.PI / 2) * h / STEP);
  for (let k = 0; k < n; k++) {
    const a = a0 + (a1 - a0) * k / n;
    out.push({ x: mx + Math.cos(a) * h, z: mz + Math.sin(a) * h });
  }
}

export function wrapAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

// Naechster Punkt auf der Mittellinie. hint = letzter Index (oder -1 fuer volle Suche).
// Ergebnis: s (Weg entlang der Mittellinie), d (seitlicher Abstand, rechts positiv), Tangente, Index.
export function project(track, x, z, hint = -1) {
  const { pts, cum } = track;
  const n = pts.length;
  let from = 0, to = n;
  if (hint >= 0) { from = hint - 40; to = hint + 40; }
  let best = Infinity, bi = 0, bt = 0;
  for (let j = from; j < to; j++) {
    const k = ((j % n) + n) % n;
    const a = pts[k], b = pts[(k + 1) % n];
    const dx = b.x - a.x, dz = b.z - a.z;
    const l2 = dx * dx + dz * dz;
    let t = ((x - a.x) * dx + (z - a.z) * dz) / l2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a.x + dx * t, pz = a.z + dz * t;
    const d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
    if (d2 < best) { best = d2; bi = k; bt = t; }
  }
  const a = pts[bi], b = pts[(bi + 1) % n];
  const segLen = cum[bi + 1] - cum[bi];
  const tx = (b.x - a.x) / segLen, tz = (b.z - a.z) / segLen;
  const px = a.x + (b.x - a.x) * bt, pz = a.z + (b.z - a.z) * bt;
  // Rechts von der Fahrtrichtung (tx, tz) ist (-tz, tx).
  const d = (x - px) * -tz + (z - pz) * tx;
  return { s: cum[bi] + segLen * bt, d, tx, tz, idx: bi };
}

// Punkt auf der Mittellinie bei Weg s, optional seitlich versetzt (rechts positiv).
export function pointAt(track, s, offset = 0) {
  const { pts, cum, length } = track;
  const n = pts.length;
  s = ((s % length) + length) % length;
  let lo = 0, hi = n;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
  const a = pts[lo], b = pts[(lo + 1) % n];
  const segLen = cum[lo + 1] - cum[lo];
  const t = (s - cum[lo]) / segLen;
  const tx = (b.x - a.x) / segLen, tz = (b.z - a.z) / segLen;
  return { x: a.x + (b.x - a.x) * t - tz * offset, z: a.z + (b.z - a.z) * t + tx * offset, tx, tz, idx: lo };
}

// Index des Punkts bei Weg s.
export function indexAt(track, s) {
  return pointAt(track, s).idx;
}

// Zellen um die Strecke herum, die frei sind (fuer Deko). ring = Abstand in Kacheln.
export function freeCells(track, ring) {
  const used = new Set(track.tiles.map(t => t.gx + ',' + t.gz));
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const t of track.tiles) { x0 = Math.min(x0, t.gx); x1 = Math.max(x1, t.gx); z0 = Math.min(z0, t.gz); z1 = Math.max(z1, t.gz); }
  const cells = [];
  for (let gx = x0 - ring; gx <= x1 + ring; gx++) {
    for (let gz = z0 - ring; gz <= z1 + ring; gz++) {
      if (!used.has(gx + ',' + gz)) cells.push({ gx, gz, x: gx * TILE, z: gz * TILE, inside: gx > x0 && gx < x1 && gz > z0 && gz < z1 });
    }
  }
  return cells;
}
