// Rennablauf: Countdown, Runden, Zeiten, Platzierung. Ohne DOM und ohne Three.js.
// Fortschritt wird aus der Bewegung entlang der Mittellinie aufaddiert.
// So zaehlt Rueckwaertsfahren negativ, und Abkuerzen ueber die Ziellinie ist nicht moeglich.

export const COUNTDOWN = 3; // s

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
  if (race.phase === 'countdown' && race.time >= 0) race.phase = 'race';
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

// Darf gefahren werden? Waehrend des Countdowns nicht.
export function canDrive(race) {
  return race.phase !== 'countdown';
}
