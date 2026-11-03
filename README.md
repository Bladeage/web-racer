# Web Racer

Kart-Rennspiel im Browser. Gebaut mit Three.js, ohne Build-Schritt.

**Spielen:** https://bladeage.github.io/web-racer/

## Stand

- Hauptmenü mit Fahrerwahl (4 Avatare mit eigenen Fahrwerten), Streckenwahl, Spielerzahl, Rundenzahl und Lautstärke
- 3 Strecken aus Kenney-Kacheln (Waldring 334 m, Zeltplatz 526 m, Serpentinen 406 m), je 4 Boost-Felder
- Arcade-Fahrphysik, Drift mit Mini-Turbo (blaue und orange Funken)
- Countdown mit Ampel und Start-Turbo
- Verfolgerkamera, Motor- und Reifenton
- Ein KI-Gegner mit neutraler Fahrweise
- Minikarte und Abstand zum Vorder- und Hintermann
- Rampen, Bodenwellen und Pfützen
- Split-Screen für 2 Spieler (oben/unten): Tastatur geteilt, zwei Gamepads oder gemischt
- Gamepad (Xbox-Belegung, andere Gamepads über die Standard-Belegung des Browsers)
- Touch-Steuerung für das Einzelspiel
- Grafik-Stufe Schnell/Schön und Anzeige der Bilder pro Sekunde
- Menü komplett per Gamepad bedienbar
- Offline spielbar nach dem ersten Laden

## Steuerung

| Aktion | Einzelspiel (Tastatur) | Spieler 1 (Split) | Spieler 2 (Split) | Gamepad |
|---|---|---|---|---|
| Gas | W oder Pfeil hoch | W | Pfeil hoch | RT oder A |
| Bremse, rückwärts | S oder Pfeil runter | S | Pfeil runter | LT oder B |
| Lenken | A D oder Pfeile | A D | Pfeile links/rechts | linker Stick oder Steuerkreuz |
| Drift | Umschalt links, Strg rechts oder Leertaste | Umschalt links | Strg rechts | LB oder RB |
| Pause | Esc | Esc | Esc | Start |

**2 Spieler:** Im Menü "Spieler: 2" wählen und "Rennen starten". Jeder Spieler drückt auf seinem Gerät Gas (W, Pfeil hoch oder RT/A am Gamepad). Links/rechts wechselt den Fahrer. Danach startet Gas das Rennen.

**Start-Turbo:** Gas genau während der "1" drücken und halten. Wer schon bei "3" oder "2" Gas gibt, startet zu früh und der Motor stockt kurz.

**Fahrer:** Flitz ist schnell, beschleunigt aber träge. Moos haftet gut. Pflaume lenkt am engsten. Sonne beschleunigt am stärksten. Die Werte sind geschätzt und ausbalanciert.

**Boost-Felder:** Orange Felder mit Pfeilen geben kurz Schub. Zwei liegen auf langen Geraden, zwei kurz vor Kurven.

**Hindernisse:** Jede Strecke hat eine Rampe (Sprung, in der Luft lenkt man kaum), zwei Bodenwellen (kleiner Hopser) und zwei Pfützen (bremsen und machen rutschig).

**Touch (Handy, Tablet, Einzelspiel):** links ein Lenkfeld (je weiter zur Seite, desto stärker), rechts Gas, Bremse und Drift. Pause oben in der Mitte. Am besten im Querformat.

**Drift:** Taste halten und in die Kurve lenken. Nach kurzer Zeit erscheinen blaue Funken, später orange. Loslassen gibt einen Mini-Turbo.

**Menü per Gamepad:** Steuerkreuz oder Stick wählt, A bestätigt, B geht zurück. Start startet das Rennen oder pausiert.

**Grafik:** "Schnell" für schwache Rechner (keine Kantenglättung, niedrigere Auflösung, weniger Bäume, kürzere Sicht, kein Rauch). Der Wechsel lädt die Seite neu. "Bilder/s" zeigt die Bildrate unten in der Mitte.

**Offline:** Nach dem ersten Laden speichert der Browser alle Dateien. Danach startet das Spiel auch ohne Internet.

Hinweis: Manche Tastaturen erkennen nicht beliebig viele gleichzeitig gedrückte Tasten. Wenn zwei Spieler an einer Tastatur Eingaben verlieren, hilft ein Gamepad.

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
