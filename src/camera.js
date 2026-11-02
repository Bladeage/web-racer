// Verfolgerkamera: haengt hinter dem Kart, folgt weich, Blickfeld waechst mit dem Tempo.
import * as THREE from 'three';
import { KART } from './kart.js';

export function createChaseCam(camera) {
  return { camera, yaw: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 70, ready: false };
}

const tmp = new THREE.Vector3();

export function updateChaseCam(cc, k, dt) {
  // Im Drift schaut die Kamera etwas in die Kurve, sonst folgt sie der Ausrichtung.
  const target = k.heading - k.drift * 0.25;
  if (!cc.ready) cc.yaw = target;
  let dy = target - cc.yaw;
  dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  cc.yaw += dy * (1 - Math.exp(-dt * 6));
  const fx = Math.sin(cc.yaw), fz = Math.cos(cc.yaw);
  const sp = Math.max(0, k.speed);
  const dist = 6.5 + sp * 0.06;
  tmp.set(k.x - fx * dist, 2.7 + sp * 0.02, k.z - fz * dist);
  const look = new THREE.Vector3(k.x + fx * 4, 1.0, k.z + fz * 4);
  if (!cc.ready) { cc.pos.copy(tmp); cc.look.copy(look); cc.ready = true; }
  cc.pos.lerp(tmp, 1 - Math.exp(-dt * 12));
  cc.look.lerp(look, 1 - Math.exp(-dt * 16));
  cc.camera.position.copy(cc.pos);
  cc.camera.lookAt(cc.look);
  const fov = 68 + 10 * Math.min(1, sp / KART.maxSpeed) + (k.boost > 0 ? 7 : 0);
  cc.fov += (fov - cc.fov) * (1 - Math.exp(-dt * 4));
  if (Math.abs(cc.camera.fov - cc.fov) > 0.01) { cc.camera.fov = cc.fov; cc.camera.updateProjectionMatrix(); }
}
