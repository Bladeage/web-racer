// Voegel: wenige einzelne Voegel, keine Schwaerme, keine Kollision mit den Karts (Idee aus web-fpv).
// Sie sitzen auf den Banden oder picken auf der Strecke. Kommt ein Kart naeher als BIRD.scare,
// fliegen sie in einem Bogen auf und landen an einem Platz weit weg von allen Karts.
// Form: einfacher Koerper und zwei Fluegel aus Grundformen (vom Nutzer am 05.11.2026 freigegeben).
import * as THREE from 'three';
import { pointAt, TILE } from './track.js';

// Schaetzwerte nach einer Taube: 9 m/s Flug, flieht ab 12 m (Karts sind schnell), sucht mind. 40 m Abstand.
export const BIRD = { n: 7, speed: 9, scare: 12, flee: 40, size: 2.2 };

const BARRIER_TOP = 1.5;    // Hoehe der Bande in m (Kenney 0,75 m, Massstab 2)
const BARRIER_D = 9.3;      // seitlicher Abstand der Bandenmitte zur Mittellinie in m

function spots(track, rand) {
  const out = [];
  for (const t of track.tiles) {
    if (t.type !== 'S') continue;
    const s = t.s0 + TILE * (0.2 + rand() * 0.6);
    const side = rand() < 0.5 ? -1 : 1;
    const a = pointAt(track, s, side * BARRIER_D);
    out.push({ x: a.x, y: BARRIER_TOP, z: a.z, ground: false });
    const b = pointAt(track, t.s0 + TILE * rand(), (rand() * 2 - 1) * 5);
    out.push({ x: b.x, y: 0, z: b.z, ground: true });
  }
  return out;
}

function makeMesh() {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xd6dbe2 });   // hell wie eine Taube, sichtbar auf Asphalt und Himmel
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.3), mat);
  body.position.y = 0.08;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), mat);
  head.position.set(0, 0.15, 0.14);
  const wingGeo = new THREE.BufferGeometry();
  wingGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.08, 0.32, 0, -0.02, 0, 0, -0.1], 3));
  wingGeo.computeVertexNormals();
  const wmat = new THREE.MeshLambertMaterial({ color: 0x8d96a3, side: THREE.DoubleSide });
  const wl = new THREE.Mesh(wingGeo, wmat), wr = new THREE.Mesh(wingGeo, wmat);
  wl.position.set(0.05, 0.12, 0); wr.position.set(-0.05, 0.12, 0); wr.scale.x = -1;
  g.add(body, head, wl, wr);
  g.scale.setScalar(BIRD.size);
  return { g, wl, wr, head };
}

export function createBirds(scene, track, rand = Math.random) {
  const sp = spots(track, rand);
  const list = [];
  for (let i = 0; i < BIRD.n && sp.length; i++) {
    const m = makeMesh();
    scene.add(m.g);
    const b = { m, spot: null, state: 'sit', x: 0, y: 0, z: 0, yaw: rand() * 6.28, t: 0, el: 0, phase: rand() * 6 };
    land(b, sp[Math.floor(rand() * sp.length)]);
    list.push(b);
  }
  return { list, spots: sp, scene, rand };
}

export function removeBirds(birds) {
  if (!birds) return;
  for (const b of birds.list) birds.scene.remove(b.m.g);
}

function land(b, spot) {
  b.spot = spot; b.state = 'sit';
  b.x = spot.x; b.y = spot.y; b.z = spot.z;
}

function flyTo(b, spot) {
  b.state = 'fly';
  b.from = { x: b.x, y: b.y, z: b.z };
  b.spot = spot;
  b.el = 0;
  const d = Math.hypot(spot.x - b.x, spot.z - b.z);
  b.apex = Math.max(b.y, spot.y) + Math.min(12, 3 + d * 0.15);
  b.dur = Math.max(1.5, d / BIRD.speed);
  b.yaw = Math.atan2(spot.x - b.x, spot.z - b.z);
}

// karts: Liste mit x, z. Ein Schritt fuer alle Voegel samt Darstellung.
export function stepBirds(birds, karts, dt) {
  if (!birds) return;
  const { list, spots: sp, rand } = birds;
  for (const b of list) {
    b.phase += dt;
    if (b.state === 'sit') {
      const near = karts.some(k => Math.hypot(k.x - b.x, k.z - b.z) < BIRD.scare);
      if (near) {
        const free = sp.filter(s => s !== b.spot && !list.some(o => o.spot === s) &&
          karts.every(k => Math.hypot(k.x - s.x, k.z - s.z) > BIRD.flee));
        const pool = free.length ? free : sp;
        flyTo(b, pool[Math.floor(rand() * pool.length)]);
      } else {
        // Umschauen und picken
        b.t -= dt;
        if (b.t <= 0) { b.t = 0.6 + rand() * 2; b.yaw += (rand() - 0.5) * 1.6; }
      }
    }
    if (b.state === 'fly') {
      b.el += dt;
      const u = Math.min(1, b.el / b.dur), f = b.from, e = b.spot;
      b.x = f.x + (e.x - f.x) * u;
      b.z = f.z + (e.z - f.z) * u;
      b.y = f.y + (e.y - f.y) * u + (b.apex - (f.y + e.y) / 2) * Math.sin(Math.PI * u);
      if (u >= 1) land(b, e);
    }
    // Darstellung
    const m = b.m;
    m.g.position.set(b.x, b.y, b.z);
    m.g.rotation.y = b.yaw;
    const flap = b.state === 'fly' ? Math.sin(b.phase * 22) * 0.9 : -0.15;
    m.wl.rotation.z = flap;
    m.wr.rotation.z = -flap;
    m.head.position.y = b.state === 'sit' && b.spot.ground && Math.sin(b.phase * 3) > 0.7 ? 0.08 : 0.15;   // picken
  }
}
