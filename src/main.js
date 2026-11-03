// Einstieg: Laden, Hauptmenue, Beitreten (2 Spieler), Rennen, Spielschleife.
// Physik laeuft mit fester Schrittweite (1/120 s), Darstellung so oft der Browser zeichnet.
// Split-Screen: ein Renderer, zwei Kameras, obere und untere Bildhaelfte (setViewport, setScissor).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildTrack, TRACKS, pointAt } from './track.js';
import { createKart, stepKart, collideWall, collideKarts, checkPads } from './kart.js';
import { createAi, aiInput } from './ai.js';
import { createRace, stepRace, canDrive, noteStartInput, START_WINDOW } from './race.js';
import { AVATARS } from './avatars.js';
import { initInput, readSolo, readDevice, deviceName, pollPads, takeEvents, initTouch, resetTouch, isTouchDevice } from './input.js';
import { createChaseCam, updateChaseCam } from './camera.js';
import { buildWorld, createKartView, updateKartView, removeKartView, createSmoke, updateSmoke, clearSmoke, renderPortraits, animatePads } from './view.js';
import { createSound, initSound, setVolume, startRaceSound, stopRaceSound, updateRaceSound, playImpact, playBoost, playBeep } from './sound.js';
import * as ui from './ui.js';

const DT = 1 / 120;
const MODELS = ['track-straight', 'track-corner', 'track-finish', 'decoration-forest', 'decoration-tents', 'decoration-empty',
  ...AVATARS.map(a => a.model)];
const NO_INPUT = { throttle: 0, brake: 0, steer: 0, drift: false };
// Testhilfe: ?autopilot in der Adresse laesst die KI auch die Spieler-Karts fahren.
const AUTOPILOT = new URLSearchParams(location.search).has('autopilot');

// Renderer und Szene. Wenig Licht, keine Schatten (Split-Screen zeichnet doppelt).
const canvas = document.getElementById('spiel');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fcbf0);
scene.fog = new THREE.Fog(0x9fcbf0, 90, 260);
scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8f5a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.7);
sun.position.set(40, 80, 25);
scene.add(sun);
const cameras = [new THREE.PerspectiveCamera(60, 1, 0.1, 600), new THREE.PerspectiveCamera(60, 1, 0.1, 600)];

// Einstellungen bleiben im Browser gespeichert, falls erlaubt.
const settings = { avatar: 0, laps: 3, volume: 0.7, players: 1, track: 0 };
try { Object.assign(settings, JSON.parse(localStorage.getItem('webracer.settings') || '{}')); } catch (e) { /* ohne Speicher */ }
function saveSettings() {
  try { localStorage.setItem('webracer.settings', JSON.stringify(settings)); } catch (e) { /* ohne Speicher */ }
}

const snd = createSound();
snd.volume = settings.volume;
let track, models, smoke, portraits, world = null;
let menuViews = [];
let mode = 'loading';            // menu, join, race, paused
let game = null;
let join = null;                 // { slots: [ {dev, avatar} | null, ... ] }
let orbit = 0;
const center = new THREE.Vector3();

const isSplit = () => game !== null && game.humans.length === 2 && (mode === 'race' || mode === 'paused');

// Aufloesung: im Split-Screen niedriger, damit schwache Rechner fluessig bleiben.
function applySize() {
  const split = isSplit();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, split ? 1.25 : (isTouchDevice() ? 1.5 : 2)));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const aspect = window.innerWidth / (window.innerHeight / (split ? 2 : 1));
  for (const c of cameras) { c.aspect = aspect; c.updateProjectionMatrix(); }
}
window.addEventListener('resize', applySize);
applySize();

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
  smoke = createSmoke(scene, smokeTex);
  if (!(settings.track < TRACKS.length)) settings.track = 0;
  loadTrack(settings.track);

  portraits = renderPortraits(models, AVATARS.map(a => a.model));
  if (settings.avatar >= AVATARS.length) settings.avatar = 0;
  ui.buildAvatarCards(AVATARS, portraits, settings.avatar, (i) => { settings.avatar = i; saveSettings(); });
  ui.setMenuValues(settings.laps, settings.players, settings.volume);
  ui.buildTrackChoice(TRACKS.map(d => buildTrack(d)), settings.track, (i) => { settings.track = i; saveSettings(); loadTrack(i); });
  ui.bindMenu({
    onLaps: (n) => { settings.laps = n; saveSettings(); },
    onPlayers: (n) => { settings.players = n; saveSettings(); },
    onVolume: (v) => { settings.volume = v; setVolume(snd, v); saveSettings(); },
    onStart: () => startFromMenu(),
    onRestart: () => restart(),
    onResume: () => resume(),
    onMenu: () => enterMenu(),
    onJoinGo: () => { if (join && join.slots.every(Boolean)) beginRace(join.slots); },
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

// Strecke laden: Welt neu aufbauen, Fahrer im Menue in die Startaufstellung stellen.
function loadTrack(i) {
  if (world) {
    scene.remove(world);
    world.traverse((o) => { if (o.material && o.material.map && o.material.map.isCanvasTexture) o.material.map.dispose(); });
  }
  for (const v of menuViews) removeKartView(scene, v);
  track = buildTrack(TRACKS[i]);
  world = buildWorld(scene, track, models);
  center.set(0, 0, 0);
  for (const t of track.tiles) center.add(new THREE.Vector3(t.x, 0, t.z));
  center.divideScalar(track.tiles.length);
  menuViews = AVATARS.map((a, j) => {
    const v = createKartView(scene, models[a.model]);
    const g = gridSlot(j);
    updateKartView(v, createKart(g.x, g.z, g.heading), 0, null);
    v.root.visible = mode === 'menu' || mode === 'join' || mode === 'loading';
    return v;
  });
}

function onKey(code) {
  if (code === 'Escape') {
    if (mode === 'race') pause();
    else if (mode === 'paused') resume();
  }
}

// Menue-Steuerung mit Gamepad und Enter/Esc (Ereignisse aus input.js).
function handleEvents(evs) {
  for (const ev of evs) {
    if (mode === 'menu') {
      if (ev.action === 'start') startFromMenu();
    } else if (mode === 'join') {
      handleJoin(ev);
    } else if (mode === 'race') {
      if (game.resultShown) {
        if (ev.action === 'start') restart();
        else if (ev.action === 'back' && ev.dev !== 'kbd') enterMenu();
      } else if (ev.action === 'start' && ev.dev.startsWith('pad')) pause();
    } else if (mode === 'paused') {
      if (ev.action === 'start' && ev.dev.startsWith('pad')) resume();
    }
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
  join = null;
  mode = 'menu';
  for (const v of menuViews) v.root.visible = true;
  cameras[0].fov = 50;
  applySize();
  ui.showHuds(false);
  ui.showScreen('menu');
}

function startFromMenu() {
  // Ton hier starten: Browser erlauben Ton erst nach einer Nutzeraktion (Klick oder Taste).
  initSound(snd, 'assets/audio/').catch(() => { /* Spiel laeuft auch ohne Ton */ });
  if (settings.players === 2) {
    mode = 'join';
    join = { slots: [null, null] };
    ui.updateJoin(join.slots.map(slotView), AVATARS, portraits);
    ui.showScreen('join');
  } else {
    beginRace([{ dev: 'solo', avatar: settings.avatar }]);
  }
}

function slotView(sl) {
  return sl ? { dev: sl.dev, devName: deviceName(sl.dev), avatar: sl.avatar } : null;
}

// Beitreten: Jedes Geraet tritt mit seiner Gas-Taste bei. Links/rechts wechselt den Fahrer.
function handleJoin(ev) {
  const slots = join.slots;
  if (ev.action === 'back') { enterMenu(); return; }
  if (ev.dev === 'kbd') { if (ev.action === 'start' && slots.every(Boolean)) beginRace(slots); return; }
  const idx = slots.findIndex(s => s && s.dev === ev.dev);
  if (ev.action === 'gas') {
    if (idx >= 0) { if (slots.every(Boolean)) { beginRace(slots); return; } }
    else {
      const free = slots.indexOf(null);
      if (free < 0) return;
      const other = slots[1 - free];
      let av = free === 0 ? settings.avatar : (settings.avatar + 1) % AVATARS.length;
      if (other && other.avatar === av) av = (av + 1) % AVATARS.length;
      slots[free] = { dev: ev.dev, avatar: av };
    }
  } else if ((ev.action === 'left' || ev.action === 'right') && idx >= 0) {
    const dir = ev.action === 'left' ? -1 : 1;
    const other = slots[1 - idx];
    let av = slots[idx].avatar;
    do { av = (av + dir + AVATARS.length) % AVATARS.length; } while (other && other.avatar === av);
    slots[idx].avatar = av;
  } else if (ev.action === 'start' && slots.every(Boolean)) { beginRace(slots); return; }
  ui.updateJoin(slots.map(slotView), AVATARS, portraits);
}

// players: [{ dev, avatar }]. dev 'solo' = Einzelspiel (Tastatur, Touch, Gamepad zusammen).
function beginRace(players) {
  clearGame();
  join = null;
  for (const v of menuViews) v.root.visible = false;
  const used = players.map(p => p.avatar);
  const rival = AVATARS.findIndex((a, i) => !used.includes(i));
  const two = players.length === 2;

  // Reihenfolge: zuerst die Spieler, dann die KI. Die KI startet vorn.
  const karts = [], views = [], entries = [];
  players.forEach((p, i) => {
    const g = gridSlot(i + 1);
    const k = createKart(g.x, g.z, g.heading, AVATARS[p.avatar].stats);
    karts.push(k);
    views.push(createKartView(scene, models[AVATARS[p.avatar].model]));
    entries.push({ kart: k, name: AVATARS[p.avatar].name + (two ? ` (Spieler ${i + 1})` : ''), isPlayer: true });
  });
  const g0 = gridSlot(0);
  const aiKart = createKart(g0.x, g0.z, g0.heading, AVATARS[rival].stats);
  karts.push(aiKart);
  views.push(createKartView(scene, models[AVATARS[rival].model]));
  entries.push({ kart: aiKart, name: AVATARS[rival].name + ' (KI)' });
  for (const k of karts) collideWall(k, track);

  game = {
    players: players.map(p => ({ ...p })),
    race: createRace(track, entries, settings.laps),
    karts, views,
    ais: karts.map(() => createAi()),     // fuer Spieler: faehrt nach dem Ziel weiter
    humans: players.map((p, i) => ({ dev: p.dev, cc: createChaseCam(cameras[i]), cam: cameras[i], done: false })),
    acc: 0, lastCount: 99, startDone: false, finishedAt: null, resultShown: false, resultRefresh: 0,
    impactCd: karts.map(() => 0),
    colors: [...players.map(p => AVATARS[p.avatar].color), AVATARS[rival].color],
  };
  ui.setMinimap(track);
  startRaceSound(snd, karts.length);
  mode = 'race';
  applySize();
  ui.createHuds(players.length);
  ui.showHuds(true);
  ui.showScreen(null);
}

function restart() {
  if (game) beginRace(game.players);
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

const listeners = () => game.humans.map((h, i) => game.karts[i]);

function step(dt) {
  const g = game, race = g.race, nh = g.humans.length;
  const drive = canDrive(race);
  g.karts.forEach((k, i) => {
    const e = race.entries[i];
    let inp;
    if (i < nh && e.finishTime === null && !AUTOPILOT) inp = g.humans[i].dev === 'solo' ? readSolo() : readDevice(g.humans[i].dev);
    else inp = aiInput(g.ais[i], k, track);
    if (!drive) {
      if (i < nh && !AUTOPILOT) noteStartInput(race, e, inp.throttle);
      inp = NO_INPUT;
    } else if (e.stall > 0) inp = NO_INPUT;
    stepKart(k, inp, dt);
    collideWall(k, track);
    checkPads(k, track);
    g.impactCd[i] = Math.max(0, g.impactCd[i] - dt);
    if (k.wallHit > 2 && g.impactCd[i] === 0) { playImpact(snd, k.wallHit, k, listeners()); g.impactCd[i] = 0.3; }
    if (k.boostStart) playBoost(snd, k, listeners());
  });
  for (let a = 0; a < g.karts.length; a++) {
    for (let b = a + 1; b < g.karts.length; b++) {
      const hit = collideKarts(g.karts[a], g.karts[b]);
      if (hit > 2) playImpact(snd, hit, g.karts[b], listeners());
    }
  }

  const lapsBefore = race.entries.map(e => e.lap);
  stepRace(race, dt);
  if (!g.startDone && race.phase !== 'countdown') {
    g.startDone = true;
    race.entries.forEach((e, i) => { if (i < nh && e.start === 'turbo') playBoost(snd, e.kart, listeners()); });
  }
  g.humans.forEach((h, i) => {
    const e = race.entries[i];
    if (e.lap > lapsBefore[i] && e.finishTime === null && e.lap === race.laps - 1) ui.showBanner(i, 'Letzte Runde!');
    if (e.finishTime !== null && !h.done) {
      h.done = true;
      ui.showBanner(i, 'Ziel! Platz ' + e.place, 2.2);
    }
  });
  if (g.finishedAt === null && g.humans.every(h => h.done)) g.finishedAt = race.time;
}

function updateCountdown(g) {
  const t = g.race.time;
  g.humans.forEach((h, i) => ui.updateCountdown(i, t, g.race.entries[i], START_WINDOW));
  const n = t < 0 ? Math.ceil(-t) : 0;
  if (n !== g.lastCount && g.lastCount > 0) playBeep(snd, n === 0);   // 3, 2, 1 tief, Start hoch
  g.lastCount = n;
}

const timer = new THREE.Timer();
let wasRacing = false;
function frame(now) {
  timer.update(now);
  const dt = Math.min(timer.getDelta(), 0.1);
  pollPads();
  handleEvents(takeEvents());

  if (mode === 'menu' || mode === 'join') {
    orbit += dt * 0.07;
    cameras[0].position.set(center.x + Math.cos(orbit) * 125, 75, center.z + Math.sin(orbit) * 125);
    cameras[0].lookAt(center);
  } else if (game) {
    const g = game;
    if (mode === 'race') {
      g.acc += dt;
      while (g.acc >= DT) { step(DT); g.acc -= DT; }
      updateCountdown(g);
      if (g.finishedAt !== null && !g.resultShown && g.race.time - g.finishedAt > 2.5) {
        g.resultShown = true;
        ui.showResult(g.race, g.race.entries.slice(0, g.humans.length));
      }
      if (g.resultShown && (g.resultRefresh -= dt) <= 0) {
        g.resultRefresh = 0.5;
        ui.showResult(g.race, g.race.entries.slice(0, g.humans.length));
      }
      updateSmoke(smoke, dt);
      animatePads(dt);
    }
    g.karts.forEach((k, i) => updateKartView(g.views[i], k, mode === 'race' ? dt : 0, mode === 'race' ? smoke : null));
    g.humans.forEach((h, i) => {
      updateChaseCam(h.cc, g.karts[i], dt, track);
      ui.updateHud(i, g.race.entries[i], g.race, g.karts[i].speed);
      ui.drawMinimap(i, g.karts.map((k, j) => ({ x: k.x, z: k.z, color: g.colors[j], me: j === i })));
      updateGaps(g, i);
    });
    updateRaceSound(snd, g.karts, listeners(), mode !== 'race');
  }
  // Touch-Knoepfe nur im Einzelspiel waehrend der Fahrt.
  const racing = mode === 'race' && game !== null && !game.resultShown && game.humans.length === 1;
  if (racing !== wasRacing) { wasRacing = racing; document.body.classList.toggle('racing', racing); if (!racing) resetTouch(); }
  render();
}

// Abstand zum Vorder- und Hintermann: Wegdifferenz geteilt durch das Tempo des Hinteren (mind. 8 m/s).
function updateGaps(g, i) {
  const me = g.race.entries[i];
  if (me.finishTime !== null || g.race.phase === 'countdown') { ui.updateGap(i, null, null); return; }
  let ahead = null, behind = null;
  for (const e of g.race.entries) {
    if (e === me || e.finishTime !== null) continue;
    const d = e.prog - me.prog;
    if (d > 0 && (ahead === null || d < ahead.d)) ahead = { d, e };
    if (d < 0 && (behind === null || -d < behind.d)) behind = { d: -d, e };
  }
  ui.updateGap(i,
    ahead ? ahead.d / Math.max(8, me.kart.speed) : null,
    behind ? behind.d / Math.max(8, behind.e.kart.speed) : null);
}

function render() {
  const W = window.innerWidth, H = window.innerHeight;
  if (!isSplit()) {
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, W, H);
    renderer.render(scene, cameras[0]);
    return;
  }
  // WebGL zaehlt y von unten: obere Haelfte = Spieler 1, untere = Spieler 2.
  const h = Math.floor(H / 2);
  renderer.setScissorTest(true);
  renderer.setViewport(0, H - h, W, h);
  renderer.setScissor(0, H - h, W, h);
  renderer.render(scene, cameras[0]);
  renderer.setViewport(0, 0, W, H - h);
  renderer.setScissor(0, 0, W, H - h);
  renderer.render(scene, cameras[1]);
  renderer.setScissorTest(false);
}

boot().catch((e) => {
  console.error(e);
  ui.showError('Fehler beim Laden: ' + e.message);
});
