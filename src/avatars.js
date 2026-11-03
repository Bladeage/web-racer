// Fahrer (Avatare). Jeder faehrt etwas anders. Die Werte veraendern die Grundwerte aus kart.js.
// Alle Werte sind Schaetzungen, so ausbalanciert, dass kein Fahrer klar ueberlegen ist:
// mehr Hoechstgeschwindigkeit kostet Beschleunigung oder Kurvenverhalten.
// bars: Anzeige im Menue (1 bis 5) fuer Tempo, Beschleunigung, Kurven.
export const AVATARS = [
  { id: 'flitz', name: 'Flitz', model: 'vehicle-truck-red', color: '#e5533d', motto: 'Immer Vollgas',
    stats: { maxSpeed: 24.6, accel: 11.5, steerRate: 2.3 }, bars: [5, 2, 2] },
  { id: 'moos', name: 'Moos', model: 'vehicle-truck-green', color: '#3fa34d', motto: 'Ruhig und sicher',
    stats: { maxSpeed: 23.9, grip: 11, driftGrip: 6 }, bars: [3, 3, 4] },
  { id: 'pflaume', name: 'Pflaume', model: 'vehicle-truck-purple', color: '#8e5bd6', motto: 'Liebt enge Kurven',
    stats: { maxSpeed: 23.6, steerRate: 2.7, driftYaw: 1.7 }, bars: [2, 3, 5] },
  { id: 'sonne', name: 'Sonne', model: 'vehicle-truck-yellow', color: '#f2b632', motto: 'Gute Laune auf vier Raedern',
    stats: { maxSpeed: 23.7, accel: 15.5 }, bars: [2, 5, 3] },
];
