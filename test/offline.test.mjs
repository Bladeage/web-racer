import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Jede Datei, die das Spiel braucht, muss im Service Worker stehen, sonst fehlt sie offline.
test('Service Worker kennt alle Dateien aus src/ und assets/', () => {
  const sw = fs.readFileSync('sw.js', 'utf8');
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  for (const f of [...walk('src'), ...walk('assets'), 'index.html', 'style.css']) {
    const rel = f.split(path.sep).join('/');
    assert.ok(sw.includes(`'${rel}'`), 'fehlt in sw.js: ' + rel);
  }
});
