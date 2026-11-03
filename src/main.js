// Einstieg: Laden, Hauptmenue, Rennen mit Spieler und einem KI-Gegner, Spielschleife.
// Physik laeuft mit fester Schrittweite (1/120 s), Darstellung so oft der Browser zeichnet.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildTrack, TRACK_1, pointAt } from './track.js';
import { createKart, stepKart, collideWall, collideKarts } from './kart.js';
import { createAi, aiInput } from './ai.js';
import { createRace, stepRace, canDrive } from './race.js';
import { AVATARS } from './avatars.js';
import { initInput, readSolo, initTouch, resetTouch, isTouchDevice } from './input.js';
import { createChaseCam, updateChaseCam } from './camera.js';
import { buildWorld, createKartView, updateKartView, removeKartView, createSmoke, updateSmoke, clearSmoke, renderPortraits } from './view.js';
import { createSound, initSound, setVolume, startRaceSound, stopRaceSound, updateRaceSound, playImpact, playBoost, playBeep } from './sound.js';
import * as ui from './ui.js';

const DT = 1 / 120;
const MODELS = ['track-straight', 'track-corner', 'track-finish', 'decoration-forest', 'decoration-tents', 'decoration-empty',
  ...AVATARS.map(a => a.model)];
const NO_INPUT = { throttle: 0, brake: 0, steer: 0, drift: false };
// Testhilfe: ?autopilot in der Adresse laesst die KI auch das Spieler-Kart fahren.
const AUTOPILOT = new URLSearchParams(location.search).has('autopilot');

// Renderer und Szene. Wenig Licht, keine Schatten (Split-Screen zeichnet spaeter doppelt).
const canvas = document.getElementById('spiel');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
// Auf Touch-Geraeten (meist Handys) etwas niedrigere Aufloesung, damit es fluessig bleibt.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouchDevice() ? 1.5 : 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fcbf0);
scene.fog = new THREE.Fog(0x9fcbf0, 90, 260);
scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f5a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.7);
sun.position.set(40, 80, 25);
scene.add(sun);
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Einstellungen bleiben im Browser gespeichert, falls erlaubt.
const settings = { avatar: 0, laps: 3, volume: 0.7 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('webracer.settings') || '{}')); } catch (e) { /* ohne Speicher */ }
function saveSettings() {
  try { localStorage.setItem('webracer.settings', JSON.stringify(settings)); } catch (e) { /* ohne Speicher */ }
}

const snd = createSound();
snd.volume = settings.volume;
let track, models, smoke;
let menuViews = [];
let mode = 'loading';            // menu, race, paused
let game = null;
let orbit = 0;
const center = new THREE.Vector3();

// Startplaetze hinter der Ziellinie, versetzt links und rechts.
function gridSlot(i) {
  const p = pointAt(track, track.lineS - 6 - i * 6, i % 2 ? 3.5 : -3.5);
  return { x: p.x, z: p.z, heading: Math.atan2(p.tx, p.tz) };
}

async function boot() {
  const loader = new GLTFLoader();
  models = {};
  await Promise.all(MODELS.map(async (n) => { models[n] = (await loader.loadAsync('assets/models/' + n + '.glb')).scene; }));
  const smokeTex = await new THREE.TextureLoader().loadAsync('assets/sprites/smoke.png');
  track = buildTrack(TRACK_1);
  buildWorld(scene, track, models);
  smoke = createSmoke(scene, smokeTex);
  for (const t of track.tiles) center.add(new THREE.Vector3(t.x, 0, t.z));
  center.divideScalar(track.tiles.length);

  // Im Menue stehen alle Fahrer in der Startaufstellung.
  menuViews = AVATARS.map((a, i) => {
    const v = createKartView(scene, models[a.model]);
    const g = gridSlot(i);
    const k = createKart(g.x, g.z, g.heading);
    updateKartView(v, k, 0, null);
    return v;
  });

  const portraits = renderPortraits(models, AVATARS.map(a => a.model));
  if (settings.avatar >= AVATARS.length) settings.avatar = 0;
  ui.buildAvatarCards(AVATARS, portraits, settings.avatar, (i) => { settings.avatar = i; saveSettings(); });
  ui.setMenuValues(settings.laps, settings.volume, track.name);
  ui.bindMenu({
    onLaps: (n) => { settings.laps = n; saveSettings(); },
    onVolume: (v) => { settings.volume = v; setVolume(snd, v); saveSettings(); },
    onStart: () => startRace(),
    onRestart: () => startRace(),
    onResume: () => resume(),
    onMenu: () => enterMenu(),
  });
  initInput(onKey);
  initTouch({
    root: document.getElementById('touch'), pad: document.getElementById('steerPad'), knob: document.getElementById('steerKnob'),
    gas: document.getElementById('tGas'), brake: document.getElementById('tBrake'), drift: document.getElementById('tDrift'),
  });
  document.getElementById('tPause').addEventListener('click', () => { if (mode === 'race') pause(); });
  // Touch-Knoepfe zeigen, sobald das Geraet Touch kann oder zum ersten Mal beruehrt wird.
  if (isTouchDevice()) document.body.classList.add('touch-mode');
  window.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') document.body.classList.add('touch-mode'); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'race') pause(); });

  enterMenu();
  renderer.setAnimationLoop(frame);
  window.spielLaeuft = true;
}

function onKey(code) {
  if (code === 'Escape') {
    if (mode === 'race') pause();
    else if (mode === 'paused') resume();
  }
}

function clearGame() {
  if (!game) return;
  for (const v of game.views) removeKartView(scene, v);
  stopRaceSound(snd);
  clearSmoke(smoke);
  game = null;
}

function enterMenu() {
  clearGame();
  mode = 'menu';
  for (const v of menuViews) v.root.visible = true;
  camera.fov = 50;
  camera.updateProjectionMatrix();
  ui.showHud(false);
  ui.showScreen('menu');
}

async function startRace() {
  clearGame();
  try { await initSound(snd, 'assets/audio/'); } catch (e) { /* Spiel laeuft auch ohne Ton */ }
  for (const v of menuViews) v.root.visible = false;

  const me = settings.avatar;
  const rival = (me + 1) % AVATARS.length;
  const slots = [gridSlot(0), gridSlot(1)];
  const aiKart = createKart(slots[0].x, slots[0].z, slots[0].heading);       // KI startet vorn
  const myKart = createKart(slots[1].x, slots[1].z, slots[1].heading);
  const karts = [myKart, aiKart];
  for (const k of karts) collideWall(k, track);
  const race = createRace(track, [
    { kart: myKart, name: AVATARS[me].name, isPlayer: true },
    { kart: aiKart, name: AVATARS[rival].name + ' (KI)' },
  ], settings.laps);
  game = {
    race, karts,
    views: [createKartView(scene, models[AVATARS[me].model]), createKartView(scene, models[AVATARS[rival].model])],
    ais: [createAi(), createAi()],          // [0] faehrt fuer den Spieler nach dem Ziel weiter
    cc: createChaseCam(camera),
    acc: 0, lastCount: 99, finishedAt: null, resultShown: false, resultRefresh: 0, impactCd: [0, 0],
  };
  startRaceSound(snd, karts.length);
  mode = 'race';
  ui.showScreen(null);
  ui.showHud(true);
}

function pause() {
  mode = 'paused';
  resetTouch();
  ui.showScreen('pause');
}

function resume() {
  if (!game) return;
  mode = 'race';
  ui.showScreen(game.resultShown ? 'result' : null);
}

function step(dt) {
  const g = game, race = g.race, me = g.race.entries[0];
  const drive = canDrive(race);
  g.karts.forEach((k, i) => {
    let inp = NO_INPUT;
    if (drive) {
      if (i === 0 && me.finishTime === null && !AUTOPILOT) inp = readSolo();
      else inp = aiInput(g.ais[i], k, track);
    }
    stepKart(k, inp, dt);
    collideWall(k, track);
    g.impactCd[i] = Math.max(0, g.impactCd[i] - dt);
    if (k.wallHit > 2 && g.impactCd[i] === 0) { playImpact(snd, k.wallHit, k, g.karts[0]); g.impactCd[i] = 0.3; }
    if (k.boostStart) playBoost(snd, k, g.karts[0]);
  });
  const hit = collideKarts(g.karts[0], g.karts[1]);
  if (hit > 2) playImpact(snd, hit, g.karts[1], g.karts[0]);

  const lapBefore = me.lap;
  stepRace(race, dt);
  if (me.lap > lapBefore && me.finishTime === null && me.lap === race.laps - 1) ui.showBanner('Letzte Runde!');
  if (me.finishTime !== null && g.finishedAt === null) {
    g.finishedAt = race.time;
    ui.showBanner(me.place === 1 ? 'Ziel! Platz 1' : 'Ziel! Platz ' + me.place, 2.2);
  }
}

function updateCountdown(g) {
  const t = g.race.time;
  if (t < 0) {
    const n = Math.ceil(-t);
    if (n !== g.lastCount) { g.lastCount = n; ui.setCountdown(String(n)); playBeep(snd, false); }
  } else if (g.lastCount > 0) {
    g.lastCount = 0;
    ui.setCountdown('LOS!');
    playBeep(snd, true);
  } else if (t > 0.9 && g.lastCount === 0) {
    g.lastCount = -1;
    ui.setCountdown('');
  }
}

const timer = new THREE.Timer();
function frame(now) {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.1);

  if (mode === 'menu') {
    orbit += dt * 0.07;
    camera.position.set(center.x + Math.cos(orbit) * 125, 75, center.z + Math.sin(orbit) * 125);
    camera.lookAt(center);
  } else if (game) {
    const g = game;
    if (mode === 'race') {
      g.acc += dt;
      while (g.acc >= DT) { step(DT); g.acc -= DT; }
      updateCountdown(g);
      if (g.finishedAt !== null && !g.resultShown && g.race.time - g.finishedAt > 2.5) {
        g.resultShown = true;
        ui.showResult(g.race, g.race.entries[0]);
      }
      if (g.resultShown && (g.resultRefresh -= dt) <= 0) {
        g.resultRefresh = 0.5;
        ui.showResult(g.race, g.race.entries[0]);
      }
    }
    g.karts.forEach((k, i) => updateKartView(g.views[i], k, mode === 'race' ? dt : 0, mode === 'race' ? smoke : null));
    if (mode === 'race') updateSmoke(smoke, dt);
    updateChaseCam(g.cc, g.karts[0], dt);
    ui.updateHud(g.race.entries[0], g.race, g.karts[0].speed);
    updateRaceSound(snd, g.karts, g.karts[0], mode !== 'race');
  }
  // Touch-Knoepfe nur waehrend der Fahrt (nicht im Menue, in der Pause oder beim Ergebnis).
  const racing = mode === 'race' && game !== null && !game.resultShown;
  if (racing !== wasRacing) { wasRacing = racing; document.body.classList.toggle('racing', racing); if (!racing) resetTouch(); }
  renderer.render(scene, camera);
}
let wasRacing = false;

boot().catch((e) => {
  console.error(e);
  ui.showError('Fehler beim Laden: ' + e.message);
});
