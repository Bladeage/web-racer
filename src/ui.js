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
    b.innerHTML = '<img alt=""><b></b><small></small><div class="bars"></div>';
    b.querySelector('img').src = portraits[i];
    b.querySelector('b').textContent = a.name;
    b.querySelector('b').style.color = a.color;
    b.querySelector('small').textContent = a.motto;
    b.title = a.motto;
    // Werte-Balken: Tempo, Beschleunigung, Kurven (1 bis 5)
    b.querySelector('.bars').innerHTML = ['Tempo', 'Beschl.', 'Kurven'].map((n, j) =>
      `<span>${n}</span><i style="--v:${a.bars[j] * 20}%"></i>`).join('');
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
  $('quality').addEventListener('click', (e) => { const q = e.target.dataset && e.target.dataset.q; if (q) h.onQuality(q); });
  $('fpsToggle').addEventListener('change', (e) => h.onFps(e.target.checked));
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

// Streckenwahl: Knoepfe mit Namen, daneben eine kleine Vorschau der gewaehlten Strecke.
export function buildTrackChoice(tracks, selected, onSelect) {
  const box = $('tracks');
  box.innerHTML = '';
  const show = (i) => {
    drawTrackShape($('trackPreview'), tracks[i], 4);
    $('trackInfo').textContent = Math.round(tracks[i].length) + ' m';
  };
  tracks.forEach((t, i) => {
    const b = document.createElement('button');
    b.textContent = t.name;
    b.className = i === selected ? 'on' : '';
    b.addEventListener('click', () => {
      box.querySelectorAll('button').forEach((x, j) => x.classList.toggle('on', j === i));
      show(i);
      onSelect(i);
    });
    box.appendChild(b);
  });
  show(selected);
}

// Strecke als Linie in ein Canvas zeichnen (Vorschau und Minikarte). Gibt die Umrechnung zurueck.
function drawTrackShape(canvas, track, line) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, pad = line + 3;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of track.pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z); }
  const sc = Math.min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (z1 - z0));
  const ox = (W - (x1 - x0) * sc) / 2 - x0 * sc, oz = (H - (z1 - z0) * sc) / 2 - z0 * sc;
  g.clearRect(0, 0, W, H);
  g.lineJoin = 'round';
  g.beginPath();
  track.pts.forEach((p, k) => (k ? g.lineTo(p.x * sc + ox, p.z * sc + oz) : g.moveTo(p.x * sc + ox, p.z * sc + oz)));
  g.closePath();
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = line;
  g.stroke();
  // Ziellinie
  const f = track.tiles[0];
  g.fillStyle = '#ffb52e';
  g.fillRect(f.x * sc + ox - line, f.z * sc + oz - line, line * 2, line * 2);
  return { sc, ox, oz };
}

export function setMenuValues(laps, players, volume, quality, fps) {
  $('laps').querySelectorAll('button').forEach(b => b.classList.toggle('on', Number(b.dataset.laps) === laps));
  $('players').querySelectorAll('button').forEach(b => b.classList.toggle('on', Number(b.dataset.players) === players));
  $('volume').value = Math.round(volume * 100);
  $('quality').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.q === quality));
  $('fpsToggle').checked = !!fps;
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
      <canvas class="mini" width="150" height="150"></canvas>
      <div class="gap"></div>
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
      mini: h.querySelector('.mini'), gap: h.querySelector('.gap'), gapKey: '',
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

// ---------- Minikarte und Abstand ----------

let miniBase = null, miniMap = null;

// Einmal pro Rennen: Strecke vorzeichnen (wird dann je Bild nur kopiert).
export function setMinimap(track) {
  miniBase = document.createElement('canvas');
  miniBase.width = miniBase.height = 150;
  miniMap = drawTrackShape(miniBase, track, 7);
}

// dots: [{ x, z, color, me }]
export function drawMinimap(i, dots) {
  const h = huds[i];
  if (!h || !miniBase) return;
  const g = h.mini.getContext('2d');
  g.clearRect(0, 0, 150, 150);
  g.drawImage(miniBase, 0, 0);
  for (const d of dots) {
    g.beginPath();
    g.arc(d.x * miniMap.sc + miniMap.ox, d.z * miniMap.sc + miniMap.oz, d.me ? 6 : 4.5, 0, Math.PI * 2);
    g.fillStyle = d.color;
    g.fill();
    if (d.me) { g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); }
  }
}

const fmtGap = (t) => t.toFixed(1).replace('.', ',') + ' s';

// Abstand zum Vorder- und Hintermann in Sekunden (null = keiner).
export function updateGap(i, ahead, behind) {
  const h = huds[i];
  if (!h) return;
  const parts = [];
  if (ahead !== null) parts.push('<span class="up">\u25b2 ' + fmtGap(ahead) + '</span>');
  if (behind !== null) parts.push('<span class="down">\u25bc ' + fmtGap(behind) + '</span>');
  const key = parts.join(' ');
  if (key !== h.gapKey) { h.gapKey = key; h.gap.innerHTML = key; }
}

// ---------- Bildrate ----------

let fpsOn = false, fpsAcc = 0, fpsN = 0;
export function showFps(on) {
  fpsOn = on;
  $('fps').classList.toggle('show', on);
}
export function tickFps(dt) {
  if (!fpsOn) return;
  fpsAcc += dt; fpsN++;
  if (fpsAcc >= 0.5) { $('fps').textContent = Math.round(fpsN / fpsAcc) + ' Bilder/s'; fpsAcc = 0; fpsN = 0; }
}

// ---------- Menue per Gamepad ----------
// Bewegt eine Auswahl ueber die sichtbaren Knoepfe des aktuellen Bildschirms (raeumlich: naechster Knopf in der Richtung).
// A klickt, links/rechts auf dem Lautstaerke-Regler aendert den Wert.

function navItems() {
  const scr = document.querySelector('.screen.show');
  if (!scr) return [];
  return [...scr.querySelectorAll('button, input')].filter(el => !el.disabled && el.offsetParent !== null);
}

function current(items) {
  const a = document.activeElement;
  return items.includes(a) ? a : null;
}

export function navFocus(el) {
  document.querySelectorAll('.padfocus').forEach(x => x.classList.remove('padfocus'));
  if (!el) return;
  el.focus({ preventScroll: false });
  el.classList.add('padfocus');
}

export function navMove(dir) {
  const items = navItems();
  if (!items.length) return;
  const cur = current(items);
  if (!cur) { navFocus(items.find(el => el.classList.contains('big')) || items[0]); return; }
  if (cur.type === 'range' && (dir === 'left' || dir === 'right')) {
    cur.value = Number(cur.value) + (dir === 'left' ? -5 : 5);
    cur.dispatchEvent(new Event('input', { bubbles: true }));
    return;
  }
  const r = cur.getBoundingClientRect();
  const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
  let best = null, bestScore = Infinity;
  for (const el of items) {
    if (el === cur) continue;
    const q = el.getBoundingClientRect();
    const dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
    const along = dx * v[0] + dy * v[1];
    if (along <= 4) continue;
    const across = Math.abs(dx * v[1] - dy * v[0]);
    const score = along + across * 2.5;
    if (score < bestScore) { bestScore = score; best = el; }
  }
  if (best) navFocus(best);
}

export function navActivate() {
  const items = navItems();
  const cur = current(items);
  if (!cur) { navMove('down'); return; }
  if (cur.type === 'checkbox') { cur.checked = !cur.checked; cur.dispatchEvent(new Event('change', { bubbles: true })); return; }
  if (cur.type !== 'range') cur.click();
}
