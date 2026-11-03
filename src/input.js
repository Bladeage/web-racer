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
