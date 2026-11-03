# Web Racer

Kart-Rennspiel im Browser. Gebaut mit Three.js, ohne Build-Schritt.

**Spielen:** https://bladeage.github.io/web-racer/

## Stand

- Hauptmenü mit Fahrerwahl (4 Avatare), Rundenzahl und Lautstärke
- Strecke "Waldring" aus Kenney-Kacheln, mit Banden und Wald
- Arcade-Fahrphysik, Drift mit Mini-Turbo (blaue und orange Funken)
- Verfolgerkamera, Motor- und Reifenton
- Ein KI-Gegner mit neutraler Fahrweise
- Countdown, Runden, Rundenzeiten, Platzierung, Ergebnis

Geplant: Split-Screen für 2 Spieler, weitere Strecken, Gamepad.

## Steuerung

| Aktion | Tasten |
|---|---|
| Gas | W oder Pfeil hoch |
| Bremse, rückwärts | S oder Pfeil runter |
| Lenken | A D oder Pfeile links/rechts |
| Drift | Umschalt links, Strg rechts oder Leertaste |
| Pause | Esc |

Drift: Taste halten und in die Kurve lenken. Nach kurzer Zeit erscheinen blaue Funken, später orange. Loslassen gibt einen Mini-Turbo.

Später im Split-Screen: Spieler 1 nur W A S D mit Umschalt links, Spieler 2 nur Pfeiltasten mit Strg rechts.

## Lokal starten

ES-Module laufen nicht per Doppelklick auf `index.html`. Im Projektordner einen Server starten:

```
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen. Mit `http://localhost:8080/?autopilot` fährt die KI auch das eigene Kart (Testhilfe).

## Tests

Physik, Strecke, KI und Rennablauf sind ohne Browser testbar (Node 20 oder neuer):

```
npm test
```

## Credits

- [Three.js](https://threejs.org/) (MIT), geladen von jsDelivr.
- Modelle und Töne: [Kenney Starter Kit Racing](https://github.com/KenneyNL/Starter-Kit-Racing) (CC0). Details in `assets/LICENSE-kenney.txt`.

## Lizenz

Code: MIT, siehe `LICENSE`.
