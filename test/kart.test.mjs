import test from 'node:test';
import assert from 'node:assert/strict';
import { createKart, stepKart, KART, collideKarts } from '../src/kart.js';

const DT = 1 / 120;
const run = (k, inp, sec) => { for (let i = 0; i < sec / DT; i++) stepKart(k, inp, DT); };

test('Gas gibt Hoechstgeschwindigkeit, nicht mehr', () => {
  const k = createKart(0, 0, 0);
  run(k, { throttle: 1, brake: 0, steer: 0, drift: false }, 6);
  assert.ok(Math.abs(k.speed - KART.maxSpeed) < 0.01, `speed ${k.speed}`);
  assert.ok(k.z > 50);                      // heading 0 faehrt nach +Z
});

test('Lenken rechts verkleinert heading', () => {
  const k = createKart(0, 0, 0);
  run(k, { throttle: 1, brake: 0, steer: 0, drift: false }, 2);
  run(k, { throttle: 1, brake: 0, steer: 1, drift: false }, 0.5);
  assert.ok(k.heading < -0.3, `heading ${k.heading}`);
});

test('Drift halten und loslassen gibt Mini-Turbo', () => {
  const k = createKart(0, 0, 0);
  run(k, { throttle: 1, brake: 0, steer: 0, drift: false }, 3);
  run(k, { throttle: 1, brake: 0, steer: 1, drift: true }, 2);
  assert.equal(k.drift, 1);
  run(k, { throttle: 1, brake: 0, steer: 0, drift: false }, DT);
  assert.equal(k.drift, 0);
  assert.ok(k.boost > 1, `boost ${k.boost}`);
  run(k, { throttle: 1, brake: 0, steer: 0, drift: false }, 0.8);
  assert.ok(k.speed > KART.maxSpeed + 2, `speed ${k.speed}`);
});

test('Kurzer Drift gibt keinen Schub', () => {
  const k = createKart(0, 0, 0);
  run(k, { throttle: 1, brake: 0, steer: 0, drift: false }, 3);
  run(k, { throttle: 1, brake: 0, steer: 1, drift: true }, 0.3);
  run(k, { throttle: 1, brake: 0, steer: 0, drift: false }, DT);
  assert.equal(k.boost, 0);
});

test('Kart-Stoss trennt zwei Karts', () => {
  const a = createKart(0, 0, 0), b = createKart(1, 0, 0);
  a.vx = 5;
  collideKarts(a, b);
  assert.ok(Math.hypot(b.x - a.x, b.z - a.z) >= 2 * KART.radius - 1e-9);
  assert.ok(b.vx > 0 && a.vx < 5);
});
