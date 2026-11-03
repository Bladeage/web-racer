# Arbeitsregeln für Claude Code

- Lies zuerst die neueste Übergabe in `docs/` (aktuell `docs/handover-2026-11-02.md`).
- Jeden Prompt des Nutzers gestrafft in `docs/prompt-historie.md` eintragen (Nr., Datum, Prompt, Ergebnis), auch Antworten auf Rückfragen. Mit dem nächsten Commit ablegen.
- Pro Sitzung genau eine Etappe: umsetzen, prüfen, committen, kurz berichten, dann anhalten und auf Freigabe warten.
- Nur die Dateien lesen, die die Etappe betrifft. Kenney-Asset-Ordner nicht komplett einlesen.
- Technik: Vanilla JS mit ES-Modulen, kein Build-Schritt. Three.js nur über die Import-Map in `index.html`, exakte Version gepinnt (zurzeit `0.186.1`). Keine weiteren Bibliotheken ohne Rückfrage.
- Eigene einfache Arcade-Physik. Keine Physik-Bibliothek.
- Leistung: Split-Screen zeichnet zweimal pro Bild. Wenig Licht, keine Schatten, einfache Materialien.
- Assets: nur benötigte Kenney-GLB-Dateien nach `assets/models/`, mit Lizenzdatei. Lizenz vor dem Einbau prüfen.
- Markennamen wie "Mario Kart" oder "Micro Machines" nicht im Namen, Titel oder in Dateien verwenden.
- Vor jedem Commit: `npm test` und Seite lokal starten (`python3 -m http.server 8080`) und im Browser prüfen. Keine Fehler in der Konsole. `?autopilot` lässt die KI das Spieler-Kart fahren (für automatische Tests).
- Module ohne DOM und ohne Three.js: `track`, `kart`, `ai`, `race`, `avatars`. Sie dürfen `three` nicht importieren, sonst laufen die Node-Tests nicht.
- Kenney-Assets: kenney.nl ist aus der Cloud-Umgebung gesperrt (403). Quelle ist `github.com/KenneyNL/Starter-Kit-Racing` über jsDelivr. Liste der übernommenen Dateien in `assets/LICENSE-kenney.txt`.
- Berichte an den Nutzer: einfaches Deutsch, kurze Sätze, gesichert und vermutet klar trennen. Der Nutzer hat wenig Code-Praxis. Schritte erklären, ohne zu vereinfachen.
- Bei offenen Entscheidungen den Vorschlag aus der Übergabe nehmen und im Bericht nennen.
- Pull Requests selbst mergen, sobald die Tests auf GitHub grün sind und kein Konflikt besteht (Freigabe des Nutzers vom 03.11.2026). Merge-Art: Merge-Commit.
- Verbesserungen, die auch web-fpv betreffen, an die web-fpv-Sitzung weitergeben (nicht selbst in web-fpv ändern).

## Festgelegt (02.11.2026)

- Name: **Web Racer**. Repo `bladeage/web-racer`. Lizenz MIT.
- Spieler 1: W A S D, Drift `ShiftLeft`. Spieler 2: Pfeiltasten, Drift `ControlRight`. Tasten über `event.code`.
- Split-Screen oben/unten. Ein Renderer, zwei Kameras, `setViewport` und `setScissor`.
- Auslieferung: GitHub Pages aus Branch `main`, Ordner `/`.

## Stand (02.11.2026)

- Fertig: Grundgerüst, Hauptmenü, Strecke "Waldring" aus Kenney-Kacheln (Maßstab 2), 4 Avatare (Kenney-Trucks), Fahrphysik, Drift mit Mini-Turbo, Verfolgerkamera, Ton, ein KI-Gegner (neutral), Countdown, Runden, Ergebnis.
- Offen laut Übergabe: Split-Screen für Spieler 2, danach weitere Strecken, Items, Gamepad.
- Strecke ändern: `TRACK_1.layout` in `src/track.js` (F, S, L, R). Ein Test prüft, dass sie geschlossen ist.
