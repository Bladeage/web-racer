// Tastatur fuer zwei Spieler, unterschieden ueber event.code (unabhaengig vom Tastatur-Layout).
// Spieler 1: W A S D, Drift Umschalt links. Spieler 2: Pfeiltasten, Drift Strg rechts.
// Im Einzelspiel gelten beide Belegungen, dazu die Leertaste als Drift.
export const KEYS_P1 = { up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'], drift: ['ShiftLeft'] };
export const KEYS_P2 = { up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'], drift: ['ControlRight'] };
export const KEYS_SOLO = {
  up: [...KEYS_P1.up, ...KEYS_P2.up], down: [...KEYS_P1.down, ...KEYS_P2.down],
  left: [...KEYS_P1.left, ...KEYS_P2.left], right: [...KEYS_P1.right, ...KEYS_P2.right],
  drift: [...KEYS_P1.drift, ...KEYS_P2.drift, 'Space'],
};

const held = new Set();
const BLOCK = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);

export function initInput(onPress) {
  window.addEventListener('keydown', (e) => {
    if (BLOCK.has(e.code) && !(e.target instanceof HTMLInputElement)) e.preventDefault();
    if (!e.repeat) onPress(e.code);
    held.add(e.code);
  });
  window.addEventListener('keyup', (e) => { held.delete(e.code); });
  window.addEventListener('blur', () => held.clear());
}

const any = (codes) => codes.some(c => held.has(c));

export function readKeys(map) {
  return {
    throttle: any(map.up) ? 1 : 0,
    brake: any(map.down) ? 1 : 0,
    steer: (any(map.right) ? 1 : 0) - (any(map.left) ? 1 : 0),
    drift: any(map.drift),
  };
}

// Touch-Steuerung (nur Einzelspiel): links ein Lenkfeld (stufenlos), rechts Gas, Bremse, Drift.
const touch = { steer: 0, gas: false, brake: false, drift: false };

export function isTouchDevice() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches || navigator.maxTouchPoints > 0;
}

function capture(el, e) {
  try { el.setPointerCapture(e.pointerId); } catch (err) { /* z. B. bei synthetischen Ereignissen */ }
}

// Ein Knopf ist gedrueckt, solange ein Finger darauf liegt.
function bindHold(el, key) {
  const on = (e) => { e.preventDefault(); capture(el, e); touch[key] = true; el.classList.add('down'); };
  const off = () => { touch[key] = false; el.classList.remove('down'); };
  el.addEventListener('pointerdown', on);
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(t, off);
}

// Lenkfeld: Abstand des Fingers von der Mitte ergibt die Lenkung. Kleine tote Zone in der Mitte.
function bindSteer(pad, knob) {
  let id = null;
  const set = (e) => {
    const r = pad.getBoundingClientRect();
    const rel = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);   // -1 .. 1
    const a = Math.abs(rel);
    touch.steer = a < 0.12 ? 0 : Math.sign(rel) * Math.min(1, (a - 0.12) / 0.6);
    knob.style.transform = `translateX(${Math.max(-1, Math.min(1, rel)) * (r.width / 2 - 30)}px)`;
  };
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    touch.steer = 0;
    knob.style.transform = '';
  };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; capture(pad, e); set(e); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === id) set(e); });
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(t, end);
}

export function initTouch(els) {
  bindSteer(els.pad, els.knob);
  bindHold(els.gas, 'gas');
  bindHold(els.brake, 'brake');
  bindHold(els.drift, 'drift');
  els.root.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function resetTouch() {
  touch.steer = 0; touch.gas = touch.brake = touch.drift = false;
}

// Tastatur und Touch zusammen (Einzelspiel).
export function readSolo() {
  const k = readKeys(KEYS_SOLO);
  return {
    throttle: Math.max(k.throttle, touch.gas ? 1 : 0),
    brake: Math.max(k.brake, touch.brake ? 1 : 0),
    steer: k.steer !== 0 ? k.steer : touch.steer,
    drift: k.drift || touch.drift,
  };
}
