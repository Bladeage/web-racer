# Web Racer

Kart-Rennspiel im Browser. Zwei Spieler im Split-Screen an einem Rechner.
Gebaut mit Three.js, ohne Build-Schritt.

**Spielen:** https://bladeage.github.io/web-racer/ (sobald GitHub Pages aktiv ist)

Stand: Etappe 1 (Grundgerüst, leere Szene).

## Steuerung (geplant)

| | Spieler 1 | Spieler 2 |
|---|---|---|
| Gas, Bremse, Lenken | W A S D | Pfeiltasten |
| Drift | Umschalt links | Strg rechts |

## Lokal starten

ES-Module laufen nicht per Doppelklick auf `index.html`. Im Projektordner einen Server starten:

```
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen.

## Credits

- [Three.js](https://threejs.org/) (MIT), geladen von jsDelivr.

## Lizenz

Code: MIT, siehe `LICENSE`.
