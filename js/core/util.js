import * as THREE from 'three';

export const clamp = THREE.MathUtils.clamp;

export function shade(hex, f) {
  const c = new THREE.Color(hex);
  return '#' + new THREE.Color(clamp(c.r*f,0,1), clamp(c.g*f,0,1), clamp(c.b*f,0,1)).getHexString();
}
