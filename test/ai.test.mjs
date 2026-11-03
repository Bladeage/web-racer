import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack, TRACKS, pointAt, groundHeight, inPuddle } from '../src/track.js';
import { AVATARS } from '../src/avatars.js';
import { createKart, stepKart, collideWall, checkPads, stepVertical } from '../src/kart.js';
import { createAi, aiInput } from '../src/ai.js';
import { createRace, stepRace } from '../src/race.js';

const DT = 1 / 120;

for (const def of TRACKS) for (const av of [AVATARS[0], AVATARS[2]]) test(`KI (${av.name}) faehrt 3 Runden auf ${def.name} ohne harte Bandenkontakte`, () => {
  const track = buildTrack(def);
  const p = pointAt(track, track.lineS - 6);
  const k = createKart(p.x, p.z, Math.atan2(p.tx, p.tz), av.stats);
  collideWall(k, track);
  const ai = createAi();
  const race = createRace(track, [{ kart: k, name: 'KI' }], 3);
  let hard = 0, maxD = 0;
  for (let i = 0; i < 200 / DT && race.phase !== 'done'; i++) {
    stepRace(race, DT);
    const inp = race.phase === 'countdown' ? { throttle: 0, brake: 0, steer: 0, drift: false } : aiInput(ai, k, track);
    stepKart(k, inp, DT);
    collideWall(k, track);
    checkPads(k, track);
    stepVertical(k, groundHeight(track, k.s, k.d), inPuddle(track, k.s, k.d), DT);
    if (k.wallHit > 2) hard++;
    maxD = Math.max(maxD, Math.abs(k.d));
  }
  const e = race.entries[0];
  console.log(def.name, av.name, 'Rundenzeiten', e.lapTimes.map(t => t.toFixed(2)).join(' / '), 'max. Abstand', maxD.toFixed(2), 'Laenge', track.length.toFixed(1));
  assert.equal(race.phase, 'done');
  assert.equal(hard, 0);
  assert.ok(e.lapTimes.every(t => t > 10 && t < 40));
});
