// Etappe 1: leere Szene. Renderer, Kamera, Licht, Boden, Spielschleife.
// Split-Screen (zwei Kameras) folgt in Etappe 4.
import * as THREE from 'three';

const canvas = document.getElementById('spiel');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87b8e8);
scene.fog = new THREE.Fog(0x87b8e8, 60, 200);

// Wenig Licht, keine Schatten: Split-Screen zeichnet spaeter alles zweimal.
scene.add(new THREE.HemisphereLight(0xffffff, 0x557744, 1.5));
const sonne = new THREE.DirectionalLight(0xffffff, 1.5);
sonne.position.set(30, 50, 20);
scene.add(sonne);

// Boden: grosse gruene Flaeche.
const boden = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshLambertMaterial({ color: 0x4f9a3a })
);
boden.rotation.x = -Math.PI / 2;
scene.add(boden);

// Platzhalter-Wuerfel, damit man sieht, dass die Schleife laeuft.
const wuerfel = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshLambertMaterial({ color: 0xe0452b })
);
wuerfel.position.y = 1;
scene.add(wuerfel);

const kamera = new THREE.PerspectiveCamera(60, 1, 0.1, 500);
kamera.position.set(0, 5, 10);
kamera.lookAt(0, 1, 0);

function groesseAnpassen() {
  const b = window.innerWidth;
  const h = window.innerHeight;
  renderer.setSize(b, h, false);
  kamera.aspect = b / h;
  kamera.updateProjectionMatrix();
}
window.addEventListener('resize', groesseAnpassen);
groesseAnpassen();

const uhr = new THREE.Timer();
renderer.setAnimationLoop((zeit) => {
  uhr.update(zeit);
  const dt = Math.min(uhr.getDelta(), 0.1);
  wuerfel.rotation.y += dt;
  renderer.render(scene, kamera);
});

window.spielLaeuft = true;
