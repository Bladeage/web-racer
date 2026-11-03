import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack, TRACKS, pointAt, groundHeight, inPuddle, BUMP_RADIUS, BUMP_SCALE } from '../src/track.js';
import { createKart, stepKart, collideWall, stepVertical, KART } from '../src/kart.js';

const DT = 1 / 120;
const GAS = { throttle: 1, brake: 0, steer: 0, drift: false };

// Kart faehrt geradeaus ueber eine Stelle; liefert hoechste Hoehe, Luftzeit und Tempo danach.
function driveOver(track, f, speed, wetCheck = false) {
  const p = pointAt(track, f.s - 25, f.d);
  const k = createKart(p.x, p.z, Math.atan2(p.tx, p.tz));
  k.vx = Math.sin(k.heading) * speed; k.vz = Math.cos(k.heading) * speed;
  collideWall(k, track);
  let maxY = 0, air = 0, wet = 0;
  for (let i = 0; i < 2.2 / DT; i++) {
    stepKart(k, GAS, DT);
    collideWall(k, track);
    stepVertical(k, groundHeight(track, k.s, k.d), inPuddle(track, k.s, k.d), DT);
    maxY = Math.max(maxY, k.y);
    if (k.air) air += DT;
    if (k.wet) wet += DT;
  }
  return { maxY, air, wet, k };
}

test('Hoehenprofil: Mitte der Rampe hat die volle Hoehe, ausserhalb ist flach', () => {
  for (const def of TRACKS) {
    const t = buildTrack(def);
    for (const f of t.features) {
      if (f.type === 'puddle') continue;
      assert.ok(Math.abs(groundHeight(t, f.s, f.d) - 0.59 * f.sy) < 1e-6);
      assert.equal(groundHeight(t, f.s + BUMP_RADIUS * f.sz + 0.1, f.d), 0);
      assert.ok(Math.abs(f.d) + BUMP_RADIUS * f.sx * 0.5 < t.halfWidth, 'Hindernis in der Strecke');
    }
  }
});

test('Rampe: mit Tempo gibt es einen Sprung, das Kart landet wieder', () => {
  const t = buildTrack(TRACKS[0]);
  const ramp = t.features.find(f => f.type === 'ramp');
  const r = driveOver(t, ramp, KART.maxSpeed);
  assert.ok(r.air > 0.4, 'Luftzeit ' + r.air);
  assert.ok(r.maxY > 0.59 * BUMP_SCALE.ramp.y, 'hoeher als die Rampe ' + r.maxY);
  assert.equal(r.k.air, false);
  assert.ok(Math.abs(r.k.y) < 1e-9);
});

test('Bodenwelle: kleiner Hopser, kein grosser Sprung', () => {
  const t = buildTrack(TRACKS[0]);
  const bump = t.features.find(f => f.type === 'bump');
  const r = driveOver(t, bump, KART.maxSpeed);
  assert.ok(r.air < 0.5, 'Luftzeit ' + r.air);
  assert.ok(r.maxY < 1.2, 'Hoehe ' + r.maxY);
});

test('Pfuetze bremst und laesst das Kart rutschen', () => {
  const t = buildTrack(TRACKS[0]);
  const pud = t.features.find(f => f.type === 'puddle');
  const wet = driveOver(t, pud, 20);
  assert.ok(wet.wet > 0.1, 'Zeit in der Pfuetze ' + wet.wet);
  const k = createKart(0, 0, 0); k.vz = 20; k.wet = true;
  const k2 = createKart(0, 0, 0); k2.vz = 20;
  for (let i = 0; i < 60; i++) { k.wet = true; stepKart(k, { throttle: 0, brake: 0, steer: 0, drift: false }, DT); stepKart(k2, { throttle: 0, brake: 0, steer: 0, drift: false }, DT); }
  assert.ok(k.speed < k2.speed, 'nass langsamer');
});
