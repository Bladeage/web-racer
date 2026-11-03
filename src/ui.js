// Oberflaeche (DOM): Bildschirme, Fahrerwahl, Spielerwahl, Beitreten, Anzeige je Spieler, Countdown, Ergebnis.
const $ = (id) => document.getElementById(id);

export function showScreen(name) {
  for (const id of ['loading', 'menu', 'join', 'pause', 'result', 'fehler']) $(id).classList.toggle('show', id === name);
}

export function showError(text) {
  $('fehlerText').textContent = text;
  showScreen('fehler');
}

// ---------- Hauptmenue ----------

export function buildAvatarCards(avatars, portraits, selected, onSelect) {
  const box = $('avatars');
  box.innerHTML = '';
  avatars.forEach((a, i) => {
    const b = document.createElement('button');
    b.className = 'avatar' + (i === selected ? ' on' : '');
    b.innerHTML = '<img alt=""><b></b><small></small>';
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

function bindSeg(id, attr, cb) {
  $(id).addEventListener('click', (e) => {
    const v = e.target.dataset && e.target.dataset[attr];
    if (!v) return;
    $(id).querySelectorAll('button').forEach(b => b.classList.toggle('on', b === e.target));
    cb(Number(v));
  });
}

export function bindMenu(h) {
  bindSeg('laps', 'laps', h.onLaps);
  bindSeg('players', 'players', h.onPlayers);
  $('volume').addEventListener('input', (e) => h.onVolume(e.target.value / 100));
  $('start').addEventListener('click', h.onStart);
  $('resume').addEventListener('click', h.onResume);
  $('restart1').addEventListener('click', h.onRestart);
  $('again').addEventListener('click', h.onRestart);
  $('toMenu1').addEventListener('click', h.onMenu);
  $('toMenu2').addEventListener('click', h.onMenu);
  $('joinGo').addEventListener('click', h.onJoinGo);
  $('joinBack').addEventListener('click', h.onMenu);
}

export function setMenuValues(laps, players, volume, trackName) {
  $('laps').querySelectorAll('button').forEach(b => b.classList.toggle('on', Number(b.dataset.laps) === laps));
  $('players').querySelectorAll('button').forEach(b => b.classList.toggle('on', Number(b.dataset.players) === players));
  $('volume').value = Math.round(volume * 100);
  $('trackName').textContent = trackName;
}

// ---------- Beitreten (2 Spieler) ----------

// slots: [{ dev, devName, avatar } | null, ...]
export function updateJoin(slots, avatars, portraits) {
  slots.forEach((sl, i) => {
    const el = $('join' + i);
    el.classList.toggle('ready', !!sl);
    const img = el.querySelector('img');
    if (sl) {
      const a = avatars[sl.avatar];
      img.src = portraits[sl.avatar];
      img.style.visibility = 'visible';
      el.querySelector('.jname').textContent = a.name;
      el.querySelector('.jname').style.color = a.color;
      el.querySelector('.jdev').textContent = sl.devName;
      el.querySelector('.jhint').textContent = 'Links/rechts: Fahrer wechseln';
    } else {
      img.style.visibility = 'hidden';
      el.querySelector('.jname').textContent = '';
      el.querySelector('.jdev').textContent = '';
      el.querySelector('.jhint').textContent = i === 0
        ? 'Gas drücken: W, Pfeil hoch oder RT/A am Gamepad'
        : 'Zweites Gerät: Gas drücken';
    }
  });
  const both = slots.every(Boolean);
  $('joinGo').disabled = !both;
  $('joinStatus').textContent = both ? 'Beide bereit. Gas drücken oder "Los!" startet.' : 'Jeder Spieler drückt Gas auf seinem Gerät.';
}

// ---------- Anzeige im Rennen (je Spieler eine) ----------

let huds = [];

export function createHuds(n) {
  const box = $('huds');
  box.innerHTML = '';
  huds = [];
  for (let i = 0; i < n; i++) {
    const h = document.createElement('div');
    h.className = 'hud' + (n === 2 ? (i === 0 ? ' half top' : ' half bottom') : '');
    h.innerHTML = `
      <div class="hud-tl"><div class="lap"></div><div class="time"></div><div class="best dim"></div></div>
      <div class="hud-tr"><span class="pos"></span><span class="dim of"></span></div>
      <div class="hud-br"><span class="speed">0</span> <span class="dim">km/h</span></div>
      <div class="cd"><div class="lights"><i></i><i></i><i></i></div><div class="cd-num"></div><div class="cd-msg"></div></div>
      <div class="banner"></div>`;
    if (n === 2) {
      const tag = document.createElement('div');
      tag.className = 'ptag';
      tag.textContent = 'Spieler ' + (i + 1);
      h.appendChild(tag);
    }
    box.appendChild(h);
    huds.push({
      root: h, lap: h.querySelector('.lap'), time: h.querySelector('.time'), best: h.querySelector('.best'),
      pos: h.querySelector('.pos'), of: h.querySelector('.of'), speed: h.querySelector('.speed'),
      cd: h.querySelector('.cd'), lights: h.querySelectorAll('.lights i'), num: h.querySelector('.cd-num'),
      msg: h.querySelector('.cd-msg'), banner: h.querySelector('.banner'), bannerTimer: 0, cdKey: '',
    });
  }
}

export function showHuds(on) {
  $('huds').classList.toggle('show', on);
}

export function formatTime(t) {
  if (t === null || t === undefined || !isFinite(t)) return '-';
  t = Math.max(0, t);
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2);
}

export function updateHud(i, e, race, speed) {
  const h = huds[i];
  if (!h) return;
  h.lap.textContent = `Runde ${Math.min(race.laps, e.lap + 1)}/${race.laps}`;
  const lapTime = race.phase === 'countdown' ? 0 : race.time - e.lapStart;
  h.time.textContent = e.finishTime !== null ? formatTime(e.finishTime) : formatTime(lapTime);
  const best = e.lapTimes.length ? Math.min(...e.lapTimes) : null;
  h.best.textContent = best !== null ? 'Beste ' + formatTime(best) : '';
  h.pos.textContent = e.place + '.';
  h.of.textContent = '/' + race.entries.length;
  h.speed.textContent = Math.round(Math.abs(speed) * 3.6);
}

// Countdown-Overlay: drei Lampen, Zahl, Hinweis. Nach dem Start: Ergebnis des Starts.
// startWindow = Sekunden vor dem Start, in denen Gas den Turbo-Start gibt.
export function updateCountdown(i, t, e, startWindow) {
  const h = huds[i];
  if (!h) return;
  let key, num = '', msg = '', cls = '', lit = 0, green = false;
  if (t < 0) {
    const n = Math.ceil(-t);
    lit = 4 - n;
    num = String(n);
    if (e.gasFrom !== null && e.gasFrom < -startWindow) { msg = 'Zu früh! Gas loslassen'; cls = 'bad'; }
    else if (e.gasFrom !== null) { msg = 'Halten ...'; cls = 'good'; }
    else msg = 'Gas bei der 1 = Turbo-Start';
  } else if (t < 1.3) {
    green = true;
    num = 'LOS!';
    if (e.start === 'turbo') { msg = 'Turbo-Start!'; cls = 'good'; }
    else if (e.start === 'early') { msg = 'Zu früh gestartet'; cls = 'bad'; }
  }
  const show = t < 1.3;
  key = [show, num, msg, cls, lit, green].join('|');
  if (key === h.cdKey) return;
  h.cdKey = key;
  h.cd.classList.toggle('show', show);
  h.num.textContent = num;
  h.msg.textContent = msg;
  h.msg.className = 'cd-msg ' + cls;
  h.lights.forEach((l, j) => { l.className = green ? 'green' : (j < lit ? 'red' : ''); });
}

export function showBanner(i, text, sec = 1.6) {
  const h = huds[i];
  if (!h) return;
  h.banner.textContent = text;
  h.banner.classList.add('show');
  clearTimeout(h.bannerTimer);
  h.bannerTimer = setTimeout(() => h.banner.classList.remove('show'), sec * 1000);
}

// ---------- Ergebnis ----------

export function showResult(race, humans) {
  const best = humans.reduce((a, b) => (b.place < a.place ? b : a));
  $('resultTitle').textContent = humans.length === 1
    ? (best.place === 1 ? 'Gewonnen!' : `Platz ${best.place}`)
    : (best.place === 1 ? `${best.name} gewinnt!` : `Bester Spieler: ${best.name}`);
  const rows = [...race.entries].sort((a, b) => a.place - b.place).map(e => {
    const bl = e.lapTimes.length ? Math.min(...e.lapTimes) : null;
    const time = e.finishTime !== null ? formatTime(e.finishTime) : 'fährt noch';
    return `<tr class="${humans.includes(e) ? 'me' : ''}"><td>${e.place}.</td><td>${e.name}</td><td class="dim">Beste ${formatTime(bl)}</td><td>${time}</td></tr>`;
  });
  $('resultTable').innerHTML = rows.join('');
  showScreen('result');
}
