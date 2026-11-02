# Arbeitsregeln für Claude Code

- Lies zuerst die neueste Übergabe in `docs/` (aktuell `docs/handover-2026-11-02.md`).
- Jeden Prompt des Nutzers gestrafft in `docs/prompt-historie.md` eintragen (Nr., Datum, Prompt, Ergebnis), auch Antworten auf Rückfragen. Mit dem nächsten Commit ablegen.
- Pro Sitzung genau eine Etappe: umsetzen, prüfen, committen, kurz berichten, dann anhalten und auf Freigabe warten.
- Nur die Dateien lesen, die die Etappe betrifft. Kenney-Asset-Ordner nicht komplett einlesen.
- Technik: Vanilla JS mit ES-Modulen, kein Build-Schritt. Three.js nur über die Import-Map in `index.html`, exakte Version gepinnt (zurzeit `0.186.1`). Keine weiteren Bibliotheken ohne Rückfrage.
- Eigene einfache Arcade-Physik. Keine Physik-Bibliothek.
- Physik und Spiellogik (`kart.js`, `track.js`, `race.js`) ohne DOM halten, damit sie testbar bleiben.
- Leistung: Split-Screen zeichnet zweimal pro Bild. Wenig Licht, keine Schatten, einfache Materialien.
- Assets: nur benötigte Kenney-GLB-Dateien nach `assets/models/`, mit Lizenzdatei. Lizenz vor dem Einbau prüfen.
- Markennamen wie "Mario Kart" oder "Micro Machines" nicht im Namen, Titel oder in Dateien verwenden.
- Vor jedem Commit: Seite lokal starten (`python3 -m http.server 8080`) und im Browser prüfen. Keine Fehler in der Konsole.
- Berichte an den Nutzer: einfaches Deutsch, kurze Sätze, gesichert und vermutet klar trennen. Der Nutzer hat wenig Code-Praxis. Schritte erklären, ohne zu vereinfachen.
- Bei offenen Entscheidungen den Vorschlag aus der Übergabe nehmen und im Bericht nennen.

## Festgelegt (02.11.2026)

- Name: **Web Racer**. Repo `bladeage/web-racer`. Lizenz MIT.
- Spieler 1: W A S D, Drift `ShiftLeft`. Spieler 2: Pfeiltasten, Drift `ControlRight`. Tasten über `event.code`.
- Split-Screen oben/unten. Ein Renderer, zwei Kameras, `setViewport` und `setScissor`.
- Auslieferung: GitHub Pages aus Branch `main`, Ordner `/`.
