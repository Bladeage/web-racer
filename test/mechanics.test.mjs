import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack, TRACK_1, pointAt } from '../src/track.js';
import { createKart, collideWall, checkPads, KART } from '../src/kart.js';
import { createRace, stepRace, noteStartInput, START_WINDOW } from '../src/race.js';

const track = buildTrack(TRACK_1);
const DT = 1 / 120;

function raceWithGasAt(pressAt) {
  const p = pointAt(track, track.lineS - 6);
  const k = createKart(p.x, p.z, Math.atan2(p.tx, p.tz));
  collideWall(k, track);
  const race = createRace(track, [{ kart: k, name: 'A' }], 1);
  const e = race.entries[0];
  while (race.time < 0.05) {
    noteStartInput(race, e, pressAt !== null && race.time >= pressAt ? 1 : 0);
    stepRace(race, DT);
  }
  return { e, k };
}

test('Start-Turbo: Gas waehrend der 1 gibt Schub', () => {
  const { e, k } = raceWithGasAt(-0.5);
  assert.equal(e.start, 'turbo');
  assert.ok(k.boost > KART.startBoost - 0.1);
});

test('Start-Turbo: Gas schon bei der 2 ist zu frueh', () => {
  const { e, k } = raceWithGasAt(-START_WINDOW - 0.5);
  assert.equal(e.start, 'early');
  assert.ok(e.stall > 0);
  assert.equal(k.boost, 0);
});

test('Start-Turbo: kein Gas ist ein normaler Start', () => {
  const { e } = raceWithGasAt(null);
  assert.equal(e.start, 'normal');
});

test('Boost-Felder liegen auf der Strecke und geben Schub', () => {
  assert.equal(track.pads.length, 4);
  for (const pad of track.pads) {
    assert.ok(Math.abs(pad.d) + pad.w / 2 < track.halfWidth, 'Feld innerhalb der Banden');
    const p = pointAt(track, (pad.s0 + pad.s1) / 2, pad.d);
    const k = createKart(p.x, p.z, Math.atan2(p.tx, p.tz));
    collideWall(k, track);
    assert.ok(checkPads(k, track));
    assert.ok(k.boost >= KART.padBoost - 1e-9 && k.boostStart);
  }
  const p = pointAt(track, track.pads[1].s0 + 2, track.pads[1].d + 6);   // daneben
  const k = createKart(p.x, p.z, 0);
  collideWall(k, track);
  assert.equal(checkPads(k, track), false);
});
