// Rennablauf: Countdown, Runden, Zeiten, Platzierung. Ohne DOM und ohne Three.js.
// Fortschritt wird aus der Bewegung entlang der Mittellinie aufaddiert.
// So zaehlt Rueckwaertsfahren negativ, und Abkuerzen ueber die Ziellinie ist nicht moeglich.

import { KART } from './kart.js';

export const COUNTDOWN = 3; // s
// Start-Turbo: Gas waehrend der "1" (letzte Sekunde) gedrueckt und gehalten = Schub.
// Schon bei "3" oder "2" gedrueckt = zu frueh, der Motor stockt kurz.
export const START_WINDOW = 1.0;  // s vor dem Start
export const STALL = 0.8;         // s ohne Antrieb nach einem Fruehstart

// entries: [{ kart, name, isPlayer }]
export function createRace(track, entries, laps) {
  return {
    track, laps,
    phase: 'countdown',     // countdown, race, done
    time: -COUNTDOWN,       // Rennzeit; negativ waehrend des Countdowns
    entries: entries.map(e => ({
      ...e,
      prog: wrapS(e.kart.s - track.lineS, track.length),   // Weg seit der Ziellinie (vor dem Start negativ)
      lastS: e.kart.s,
      lap: 0,              // abgeschlossene Runden
      lapStart: 0,
      lapTimes: [],
      finishTime: null,
      place: 0,
      gasFrom: null,       // Zeitpunkt, seit dem im Countdown Gas gehalten wird
      start: null,         // turbo, early oder normal
      stall: 0,            // restliche Zeit ohne Antrieb nach Fruehstart
    })),
  };
}

function wrapS(ds, L) {
  if (ds > L / 2) ds -= L;
  if (ds < -L / 2) ds += L;
  return ds;
}

export function stepRace(race, dt) {
  race.time += dt;
  if (race.phase === 'countdown' && race.time >= 0) {
    race.phase = 'race';
    for (const e of race.entries) {
      if (e.gasFrom === null) e.start = 'normal';
      else if (e.gasFrom >= -START_WINDOW) {
        e.start = 'turbo';
        e.kart.boost = Math.max(e.kart.boost, KART.startBoost);
      } else {
        e.start = 'early';
        e.stall = STALL;
      }
    }
  } else if (race.phase !== 'countdown') {
    for (const e of race.entries) e.stall = Math.max(0, e.stall - dt);
  }
  const L = race.track.length;
  for (const e of race.entries) {
    e.prog += wrapS(e.kart.s - e.lastS, L);
    e.lastS = e.kart.s;
    if (race.phase === 'countdown' || e.finishTime !== null) continue;
    const lapsDone = Math.floor(e.prog / L);
    if (lapsDone > e.lap) {
      e.lap = lapsDone;
      e.lapTimes.push(race.time - e.lapStart);
      e.lapStart = race.time;
      if (e.lap >= race.laps) e.finishTime = race.time;
    }
  }
  // Platzierung: Wer im Ziel ist, nach Zeit. Sonst nach Fortschritt.
  const order = [...race.entries].sort((a, b) => {
    if (a.finishTime !== null && b.finishTime !== null) return a.finishTime - b.finishTime;
    if (a.finishTime !== null) return -1;
    if (b.finishTime !== null) return 1;
    return b.prog - a.prog;
  });
  order.forEach((e, i) => { e.place = i + 1; });
  if (race.entries.every(e => e.finishTime !== null)) race.phase = 'done';
}

// Gas im Countdown merken (fuer den Start-Turbo). Loslassen setzt zurueck.
export function noteStartInput(race, e, throttle) {
  if (race.phase !== 'countdown') return;
  if (throttle > 0) { if (e.gasFrom === null) e.gasFrom = race.time; } else e.gasFrom = null;
}

// Darf gefahren werden? Waehrend des Countdowns nicht.
export function canDrive(race) {
  return race.phase !== 'countdown';
}
