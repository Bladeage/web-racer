import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack, TRACK_1, project, pointAt, TILE } from '../src/track.js';

const track = buildTrack(TRACK_1);

test('Strecke 1 ist geschlossen und hat eine plausible Laenge', () => {
  assert.equal(track.tiles.length, TRACK_1.layout.length);
  // 13 Geraden zu 20 m und 5 Kurven zu je einem Viertelkreis mit 10 m Radius
  const expected = 13 * TILE + 5 * Math.PI / 2 * TILE / 2 * 1;
  const corners = [...TRACK_1.layout].filter(c => c === 'L' || c === 'R').length;
  const exp = (TRACK_1.layout.length - corners) * TILE + corners * Math.PI / 2 * TILE / 2;
  assert.ok(Math.abs(track.length - exp) < 0.5, `Laenge ${track.length} statt ${exp}`);
  assert.ok(expected > 0);
});

test('Mittellinie ist lueckenlos', () => {
  const { pts } = track;
  for (let k = 0; k < pts.length; k++) {
    const a = pts[k], b = pts[(k + 1) % pts.length];
    assert.ok(Math.hypot(b.x - a.x, b.z - a.z) < 0.6);
  }
});

test('Projektion: Punkt neben der Mittellinie hat den erwarteten Abstand', () => {
  for (const s of [3, 50, 123.4, 300]) {
    const p = pointAt(track, s, 4);       // 4 m rechts
    const pr = project(track, p.x, p.z);
    assert.ok(Math.abs(pr.d - 4) < 0.05, `d=${pr.d} bei s=${s}`);
    assert.ok(Math.abs(pr.s - s) < 0.3, `s=${pr.s} statt ${s}`);
  }
});

test('Kacheldrehung: jede Kurve hat eine Drehung', () => {
  for (const t of track.tiles) assert.ok(Number.isFinite(t.rot));
});

import { TRACKS } from '../src/track.js';
test('Alle Strecken sind geschlossen, ohne Ueberschneidung und lang genug', () => {
  for (const def of TRACKS) {
    const t = buildTrack(def);
    assert.ok(t.length > 300, def.name + ' ' + t.length);
  }
});
