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

// Geraete: 'wasd' und 'arrows' (Tastatur-Haelften) sowie 'pad0' bis 'pad3' (Gamepads).
// Ereignisse fuer Menues und Beitreten: { dev, action } mit action = gas, left, right, start, back.
const KEY_EVENTS = {
  KeyW: ['wasd', 'gas'], KeyA: ['wasd', 'left'], KeyD: ['wasd', 'right'],
  ArrowUp: ['arrows', 'gas'], ArrowLeft: ['arrows', 'left'], ArrowRight: ['arrows', 'right'],
  Enter: ['kbd', 'start'], Escape: ['kbd', 'back'],
};
let events = [];

export function takeEvents() {
  const e = events;
  events = [];
  return e;
}

export function initInput(onPress) {
  window.addEventListener('keydown', (e) => {
    if (BLOCK.has(e.code) && !(e.target instanceof HTMLInputElement)) e.preventDefault();
    if (!e.repeat) {
      onPress(e.code);
      const ev = KEY_EVENTS[e.code];
      if (ev) events.push({ dev: ev[0], action: ev[1] });
    }
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

// Gamepads ueber die Standard-Belegung des Browsers (Xbox/XInput; andere Gamepads werden darauf abgebildet).
// Gas: RT oder A. Bremse/rueckwaerts: LT oder B. Drift: LB oder RB. Lenken: linker Stick oder Steuerkreuz.
// Pause: Start/Menue. Zurueck: B (nur in Menues).
const pads = [];          // aktueller Zustand je Gamepad-Index
const DEAD = 0.18;        // tote Zone des Sticks

function btn(gp, i) {
  const b = gp.buttons[i];
  return b ? (typeof b === 'object' ? b.value : b) : 0;
}

// Einmal pro Bild aufrufen: liest alle Gamepads und erzeugt Ereignisse bei neu gedrueckten Knoepfen.
export function pollPads() {
  const list = navigator.getGamepads ? navigator.getGamepads() : [];
  for (let i = 0; i < 4; i++) {
    const gp = list[i];
    if (!gp || !gp.connected) { pads[i] = null; continue; }
    const x = gp.axes[0] || 0;
    let steer = Math.abs(x) < DEAD ? 0 : Math.sign(x) * (Math.abs(x) - DEAD) / (1 - DEAD);
    if (btn(gp, 14) > 0.5) steer = -1;
    if (btn(gp, 15) > 0.5) steer = 1;
    const st = {
      throttle: Math.max(btn(gp, 7), btn(gp, 0) > 0.5 ? 1 : 0),
      brake: Math.max(btn(gp, 6), btn(gp, 1) > 0.5 ? 1 : 0),
      steer,
      drift: btn(gp, 4) > 0.5 || btn(gp, 5) > 0.5,
      start: btn(gp, 9) > 0.5,
      back: btn(gp, 1) > 0.5,
    };
    const old = pads[i];
    const dev = 'pad' + i;
    if (old) {
      if (st.throttle > 0.5 && old.throttle <= 0.5) events.push({ dev, action: 'gas' });
      if (st.steer < -0.6 && old.steer >= -0.6) events.push({ dev, action: 'left' });
      if (st.steer > 0.6 && old.steer <= 0.6) events.push({ dev, action: 'right' });
      if (st.start && !old.start) events.push({ dev, action: 'start' });
      if (st.back && !old.back) events.push({ dev, action: 'back' });
    }
    pads[i] = st;
  }
}

const NONE = { throttle: 0, brake: 0, steer: 0, drift: false };

// Eingabe eines Geraets im Split-Screen.
export function readDevice(dev) {
  if (dev === 'wasd') return readKeys(KEYS_P1);
  if (dev === 'arrows') return readKeys(KEYS_P2);
  const p = pads[Number(dev.slice(3))];
  return p ? { throttle: p.throttle, brake: p.brake, steer: p.steer, drift: p.drift } : NONE;
}

export function deviceName(dev) {
  if (dev === 'wasd') return 'Tastatur W A S D';
  if (dev === 'arrows') return 'Tastatur Pfeiltasten';
  return 'Gamepad ' + (Number(dev.slice(3)) + 1);
}

// Einzelspiel: Tastatur, Touch und alle Gamepads zusammen.
export function readSolo() {
  const k = readKeys(KEYS_SOLO);
  let throttle = Math.max(k.throttle, touch.gas ? 1 : 0);
  let brake = Math.max(k.brake, touch.brake ? 1 : 0);
  let steer = k.steer !== 0 ? k.steer : touch.steer;
  let drift = k.drift || touch.drift;
  for (const p of pads) {
    if (!p) continue;
    throttle = Math.max(throttle, p.throttle);
    brake = Math.max(brake, p.brake);
    if (steer === 0) steer = p.steer;
    drift = drift || p.drift;
  }
  return { throttle, brake, steer, drift };
}
