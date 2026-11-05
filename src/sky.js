// Himmel mit Wolken, Sonne und Lens-Flare (optional, im Menue abschaltbar, Standard: aus).
// Wolken: Rauschen in mehreren Groessen auf einer gedachten Ebene hoch ueber der Strecke (Shader, kein Modell).
// Lens-Flare: Three.js-Zusatz Lensflare mit per Canvas erzeugten Lichtflecken.
import * as THREE from 'three';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

// Sonne eher tief, damit sie beim Fahren auch mal ins Bild kommt.
export const SUN_DIR = new THREE.Vector3(0.55, 0.3, 0.78).normalize();

const VS = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;            // immer ganz hinten
  gl_Position.z *= 0.99999;
}`;

const FS = `
uniform vec3 uSun;
uniform float uTime;
uniform vec3 uHorizon;
varying vec3 vDir;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  vec3 d = normalize(vDir);
  float up = clamp(d.y, 0.0, 1.0);
  vec3 col = mix(uHorizon, vec3(0.30, 0.55, 0.92), pow(up, 0.55));
  float s = max(dot(d, uSun), 0.0);
  col += vec3(1.0, 0.9, 0.7) * pow(s, 64.0) * 0.6;                 // Schein um die Sonne
  col = mix(col, vec3(1.0, 0.98, 0.9), smoothstep(0.9993, 0.9997, s)); // Sonnenscheibe
  if (d.y > 0.02) {
    vec2 uv = d.xz / d.y * 1.6 + vec2(uTime * 0.012, uTime * 0.004);
    float c = fbm(uv);
    float cov = smoothstep(0.52, 0.78, c) * smoothstep(0.02, 0.18, d.y);
    cov *= smoothstep(0.9995, 0.996, s);   // Wolken lassen die Sonne frei
    vec3 cloud = mix(vec3(0.82, 0.86, 0.92), vec3(1.0), smoothstep(0.55, 0.9, c));
    col = mix(col, cloud, cov * 0.9);
  }
  gl_FragColor = vec4(col, 1.0);
}`;

function flareTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.4, outer);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function createSky(horizonColor, far) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uSun: { value: SUN_DIR }, uTime: { value: 0 }, uHorizon: { value: new THREE.Color(horizonColor) } },
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), mat);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  // Lens-Flare an einem unsichtbaren Punkt in Sonnenrichtung, innerhalb der Sichtweite der Kamera.
  const sunHolder = new THREE.Object3D();
  const flare = new Lensflare();
  const glow = flareTexture('rgba(255,250,235,1)', 'rgba(255,220,160,0.35)');
  const ring = flareTexture('rgba(255,255,255,0.0)', 'rgba(170,210,255,0.35)');
  const dot = flareTexture('rgba(255,230,180,0.6)', 'rgba(255,180,120,0.2)');
  flare.addElement(new LensflareElement(glow, 260, 0));
  flare.addElement(new LensflareElement(dot, 50, 0.4));
  flare.addElement(new LensflareElement(ring, 90, 0.65));
  flare.addElement(new LensflareElement(dot, 70, 0.9));
  flare.addElement(new LensflareElement(ring, 130, 1.0));
  sunHolder.add(flare);
  return { dome, sunHolder, mat, dist: far * 0.85, on: false };
}

export function setSky(sky, scene, on) {
  if (on === sky.on) return;
  sky.on = on;
  if (on) { scene.add(sky.dome); scene.add(sky.sunHolder); } else { scene.remove(sky.dome); scene.remove(sky.sunHolder); }
}

// Vor jedem Zeichnen: Kuppel und Sonnenpunkt mit der Kamera mitfuehren.
export function placeSky(sky, camera, time) {
  if (!sky.on) return;
  sky.dome.position.copy(camera.position);
  sky.sunHolder.position.copy(camera.position).addScaledVector(SUN_DIR, sky.dist);
  sky.mat.uniforms.uTime.value = time;
}
