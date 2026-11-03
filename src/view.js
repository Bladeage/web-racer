// Darstellung: Welt aus Kenney-Kacheln, Karts mit Raedern, Neigung, Drift-Funken, Rauch und Schub-Flamme.
import * as THREE from 'three';
import { TILE_SCALE, freeCells, pointAt as pointAtXZ } from './track.js';
import { chargeLevel } from './kart.js';

export const KART_SCALE = 1.25;     // Kenney-Truck ist etwa 2,8 m lang; skaliert etwa 3,5 m
const WHEEL_R = 0.3 * KART_SCALE;   // Radradius in m

// Kleine Pseudo-Zufallszahl aus Zellkoordinaten, damit die Deko immer gleich aussieht.
function hash(a, b) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function buildWorld(scene, track, models) {
  const world = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(1200, 1200),
    // Polygon-Offset und 25 cm Abstand: Sonst ueberdeckt der Boden bei breitem Bild (Split-Screen) den Asphalt.
    new THREE.MeshLambertMaterial({ color: 0x5fb36a, polygonOffset: true, polygonOffsetFactor: 2, polygonOffsetUnits: 4 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.25;
  world.add(ground);

  const byType = { S: 'track-straight', L: 'track-corner', R: 'track-corner', F: 'track-finish' };
  for (const t of track.tiles) {
    const m = models[byType[t.type]].clone(true);
    m.scale.setScalar(TILE_SCALE);
    m.position.set(t.x, 0, t.z);
    m.rotation.y = t.rot;
    world.add(m);
  }

  // Deko in freien Zellen: innen gemischt, aussen ein Waldring, neben dem Start Zelte.
  const start = track.tiles[0];
  for (const c of freeCells(track, 2)) {
    const r = hash(c.gx, c.gz);
    const nearStart = Math.abs(c.gx - start.gx) + Math.abs(c.gz - start.gz) === 1;
    let name = 'decoration-forest';
    if (nearStart) name = 'decoration-tents';
    else if (c.inside && r < 0.35) name = track.decoInside;
    const m = models[name].clone(true);
    m.scale.setScalar(TILE_SCALE);
    m.position.set(c.x, 0, c.z);
    m.rotation.y = Math.floor(hash(c.gz, c.gx) * 4) * Math.PI / 2;
    world.add(m);
  }
  world.add(buildPads(track));
  scene.add(world);
  return world;
}

// Boost-Felder: flache Flaeche mit Pfeilen (Canvas-Textur), die Pfeile laufen in Fahrtrichtung.
export const padTextures = [];
function buildPads(track) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ff8a1f';
  g.fillRect(0, 0, 64, 128);
  g.fillStyle = '#ffe14d';
  for (const y of [8, 72]) {
    g.beginPath();
    g.moveTo(6, y + 40); g.lineTo(32, y + 8); g.lineTo(58, y + 40); g.lineTo(58, y + 54); g.lineTo(32, y + 22); g.lineTo(6, y + 54);
    g.closePath();
    g.fill();
  }
  const group = new THREE.Group();
  for (const p of track.pads) {
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, (p.s1 - p.s0) / 4);
    padTextures.push(tex);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.s1 - p.s0),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.92 }));
    const mid = (p.s0 + p.s1) / 2;
    const a = pointAtXZ(track, mid, p.d);
    mesh.rotation.order = 'YXZ';
    mesh.rotation.y = Math.atan2(a.tx, a.tz) + Math.PI;   // Pfeilspitze in Fahrtrichtung
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(a.x, 0.03, a.z);
    group.add(mesh);
  }
  return group;
}

// Pfeile auf den Boost-Feldern laufen lassen.
export function animatePads(dt) {
  for (const t of padTextures) t.offset.y -= dt * 1.5;
}

// Runde, weiche Textur fuer Funken und Flamme (per Canvas erzeugt, keine Datei noetig).
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}

function glowSprite(color) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
  }));
  s.visible = false;
  return s;
}

// Schattenfleck unter dem Kart, statt echter Schatten (spart Leistung).
let blobTex = null;
function blobShadow() {
  if (!blobTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,0.45)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    blobTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.2),
    new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.04;
  return m;
}

export function createKartView(scene, model) {
  const root = new THREE.Group();
  const holder = new THREE.Group();              // dreht sich zusaetzlich im Drift
  const m = model.clone(true);
  m.scale.setScalar(KART_SCALE);
  holder.add(m);
  root.add(blobShadow());
  root.add(holder);
  const wheels = ['wheel-front-left', 'wheel-front-right', 'wheel-back-left', 'wheel-back-right']
    .map(n => m.getObjectByName(n)).filter(Boolean);
  for (const w of wheels) w.rotation.order = 'YXZ';  // erst drehen (X), dann lenken (Y)
  const body = m.getObjectByName('body');
  const bodyY = body ? body.position.y : 0;

  // Funken an den Hinterraedern, Flamme hinten in der Mitte.
  const sparks = [glowSprite(0x4fb7ff), glowSprite(0x4fb7ff)];
  sparks[0].position.set(0.75 * KART_SCALE, 0.25, -0.8 * KART_SCALE);
  sparks[1].position.set(-0.75 * KART_SCALE, 0.25, -0.8 * KART_SCALE);
  const flame = glowSprite(0xff9a2e);
  flame.position.set(0, 0.55 * KART_SCALE, -1.55 * KART_SCALE);
  holder.add(sparks[0], sparks[1], flame);

  scene.add(root);
  return { root, holder, model: m, wheels, body, bodyY, sparks, flame, visYaw: 0, lean: 0, pitch: 0, lastSpeed: 0, smokeTimer: 0 };
}

export function removeKartView(scene, v) {
  scene.remove(v.root);
}

const SPARK = [null, new THREE.Color(0x4fb7ff), new THREE.Color(0xff8a1f)];

export function updateKartView(v, k, dt, smoke) {
  v.root.position.set(k.x, 0, k.z);
  v.root.rotation.y = k.heading;
  // Im Drift zeigt die Nase staerker in die Kurve.
  const yawTarget = -k.drift * 0.38 - k.slip * 0.015;
  v.visYaw += (yawTarget - v.visYaw) * (1 - Math.exp(-dt * 8));
  v.holder.rotation.y = v.visYaw;
  // Hopser beim Drift-Start
  v.holder.position.y = k.hop > 0 ? Math.sin((1 - k.hop / 0.18) * Math.PI) * 0.35 : 0;

  // Raeder drehen und lenken
  const spin = k.speed / WHEEL_R * dt;
  v.wheels.forEach((w, i) => {
    w.rotation.x += spin;
    if (i < 2) w.rotation.y = -k.steer * 0.45;
  });
  // Aufbau neigt sich in Kurven und beim Beschleunigen
  if (v.body) {
    const acc = (k.speed - v.lastSpeed) / Math.max(dt, 1e-3);
    v.lastSpeed = k.speed;
    const leanT = k.yawRate * Math.min(1, Math.abs(k.speed) / 15) * 0.06;
    v.lean += (leanT - v.lean) * (1 - Math.exp(-dt * 8));
    v.pitch += (Math.max(-0.08, Math.min(0.08, -acc * 0.006)) - v.pitch) * (1 - Math.exp(-dt * 8));
    v.body.rotation.z = v.lean;
    v.body.rotation.x = v.pitch;
    v.body.position.y = v.bodyY;
  }

  // Funken je Mini-Turbo-Stufe
  const lvl = chargeLevel(k);
  for (const s of v.sparks) {
    s.visible = lvl > 0;
    if (lvl > 0) {
      s.material.color.copy(SPARK[lvl]);
      s.scale.setScalar((lvl === 2 ? 1.2 : 0.9) * (0.7 + Math.random() * 0.6));
    }
  }
  v.flame.visible = k.boost > 0;
  if (k.boost > 0) v.flame.scale.set(0.9 + Math.random() * 0.5, 0.7 + Math.random() * 0.4, 1);

  // Rauch beim Driften und Rutschen
  if (smoke && (k.drift || Math.abs(k.slip) > 4 || k.boostStart)) {
    v.smokeTimer -= dt;
    if (v.smokeTimer <= 0) {
      v.smokeTimer = 0.07;
      const c = Math.cos(k.heading), s = Math.sin(k.heading);
      for (const side of [-1, 1]) {
        const lx = side * 0.7 * KART_SCALE, lz = -0.8 * KART_SCALE;
        emitSmoke(smoke, k.x + lx * c + lz * s, k.z - lx * s + lz * c);
      }
    }
  }
}

// Rauchwolken: fester Vorrat an Sprites, die wiederverwendet werden.
export function createSmoke(scene, tex) {
  const parts = [];
  for (let i = 0; i < 48; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xdddddd, transparent: true, depthWrite: false, opacity: 0 }));
    sp.visible = false;
    scene.add(sp);
    parts.push({ sp, life: 0 });
  }
  return { parts, next: 0 };
}

function emitSmoke(smoke, x, z) {
  const p = smoke.parts[smoke.next];
  smoke.next = (smoke.next + 1) % smoke.parts.length;
  p.life = 0.7;
  p.sp.position.set(x, 0.3, z);
  p.sp.visible = true;
}

export function updateSmoke(smoke, dt) {
  for (const p of smoke.parts) {
    if (p.life <= 0) continue;
    p.life -= dt;
    if (p.life <= 0) { p.sp.visible = false; continue; }
    const t = 1 - p.life / 0.7;
    p.sp.position.y += dt * 0.8;
    p.sp.scale.setScalar(0.8 + t * 2.2);
    p.sp.material.opacity = 0.38 * (1 - t);
  }
}

export function clearSmoke(smoke) {
  for (const p of smoke.parts) { p.life = 0; p.sp.visible = false; }
}

// Vorschaubilder der Fahrer fuer das Menue (einmalig gerendert).
export function renderPortraits(models, names) {
  const W = 240, H = 150;
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setSize(W, H, false);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x667788, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(3, 5, 4);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(32, W / H, 0.1, 50);
  cam.position.set(3.4, 2.1, 4.4);
  cam.lookAt(0, 0.45, 0);
  const out = [];
  for (const n of names) {
    const m = models[n].clone(true);
    m.rotation.y = 0.15;
    scene.add(m);
    r.render(scene, cam);
    out.push(r.domElement.toDataURL('image/png'));
    scene.remove(m);
  }
  r.dispose();
  r.forceContextLoss();
  return out;
}
