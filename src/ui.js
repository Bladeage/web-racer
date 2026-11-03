// Oberflaeche (DOM): Bildschirme, Fahrerwahl, Anzeige im Rennen, Ergebnis.
const $ = (id) => document.getElementById(id);

export function showScreen(name) {
  for (const id of ['loading', 'menu', 'pause', 'result', 'fehler']) $(id).classList.toggle('show', id === name);
}

export function showHud(on) {
  $('hud').classList.toggle('show', on);
  if (!on) { $('countdown').textContent = ''; $('banner').classList.remove('show'); }
}

export function showError(text) {
  $('fehlerText').textContent = text;
  showScreen('fehler');
}

export function buildAvatarCards(avatars, portraits, selected, onSelect) {
  const box = $('avatars');
  box.innerHTML = '';
  avatars.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = 'avatar' + (i === selected ? ' on' : '');
    b.innerHTML = `<img alt=""><b></b><small></small>`;
    b.querySelector('img').src = portraits[i];
    b.querySelector('b').textContent = a.name;
    b.querySelector('b').style.color = a.color;
    b.querySelector('small').textContent = a.motto;
    b.addEventListener('click', () => {
      box.querySelectorAll('.avatar').forEach((x, j) => x.classList.toggle('on', j === i));
      onSelect(i);
    });
    box.appendChild(b);
  });
}

export function bindMenu(h) {
  $('laps').addEventListener('click', (e) => {
    const n = e.target.dataset && e.target.dataset.laps;
    if (!n) return;
    $('laps').querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target));
    h.onLaps(Number(n));
  });
  $('volume').addEventListener('input', (e) => h.onVolume(e.target.value / 100));
  $('start').addEventListener('click', h.onStart);
  $('resume').addEventListener('click', h.onResume);
  $('restart1').addEventListener('click', h.onRestart);
  $('again').addEventListener('click', h.onRestart);
  $('toMenu1').addEventListener('click', h.onMenu);
  $('toMenu2').addEventListener('click', h.onMenu);
}

export function setMenuValues(laps, volume, trackName) {
  $('laps').querySelectorAll('button').forEach(b => b.classList.toggle('on', Number(b.dataset.laps) === laps));
  $('volume').value = Math.round(volume * 100);
  $('trackName').textContent = trackName;
}

export function formatTime(t) {
  if (t === null || t === undefined || !isFinite(t)) return '-';
  t = Math.max(0, t);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
}

export function updateHud(e, race, speed) {
  $('hudLap').textContent = `Runde ${Math.min(race.laps, e.lap + 1)}/${race.laps}`;
  const lapTime = race.phase === 'countdown' ? 0 : (e.finishTime ?? race.time) - (e.finishTime !== null ? 0 : e.lapStart);
  $('hudTime').textContent = e.finishTime !== null ? formatTime(e.finishTime) : formatTime(lapTime);
  const best = e.lapTimes.length ? Math.min(...e.lapTimes) : null;
  $('hudBest').textContent = best !== null ? 'Beste ' + formatTime(best) : '';
  $('hudPos').textContent = e.place + '.';
  $('hudOf').textContent = '/' + race.entries.length;
  $('hudSpeed').textContent = Math.round(Math.abs(speed) * 3.6);
}

export function setCountdown(text) {
  $('countdown').textContent = text;
}

let bannerTimer = 0;
export function showBanner(text, sec = 1.6) {
  const b = $('banner');
  b.textContent = text;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), sec * 1000);
}

export function showResult(race, playerEntry) {
  $('resultTitle').textContent = playerEntry.place === 1 ? 'Gewonnen!' : `Platz ${playerEntry.place}`;
  const rows = [...race.entries].sort((a, b) => a.place - b.place).map(e => {
    const best = e.lapTimes.length ? Math.min(...e.lapTimes) : null;
    const time = e.finishTime !== null ? formatTime(e.finishTime) : 'fährt noch';
    return `<tr class="${e === playerEntry ? 'me' : ''}"><td>${e.place}.</td><td>${e.name}</td><td class="dim">Beste ${formatTime(best)}</td><td>${time}</td></tr>`;
  });
  $('resultTable').innerHTML = rows.join('');
  showScreen('result');
}
