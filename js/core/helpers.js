import * as THREE from 'three';
import { clamp, shade } from './util.js';
import { noiseTex } from './textures.js';

const GRID_SNAP = 0.5;
const WALL_H    = 2.6;
const WALL_T    = 0.12;
const PART_H    = 2.4;   // interior partition height
const COLORS = [
  '#c8a06a','#f3ece0','#5b5048','#b9714a','#5b86b8',
  '#6f9e74','#b25c78','#8a6fb0','#8a5a2b','#3f5d7a',
  '#e8e2d6','#c2b6a3','#f5c020','#4a4f54','#34543f',
  // パステル(キッズ/可愛い系) — 既存indexを崩さないよう末尾に追加
  '#f7a8c4','#a9e7cf','#c9b3ec','#ffd382','#a9d8f0'
];

function roundedBoxGeom(w, h, d, radius = 0.03, seg = 3) {
  radius = Math.min(radius, w/2 - 1e-4, h/2 - 1e-4, d/2 - 1e-4);
  if (radius <= 0.002) return new THREE.BoxGeometry(w, h, d);
  const geo = new THREE.BoxGeometry(1, 1, 1, seg, seg, seg).toNonIndexed();
  const pos = geo.attributes.position, nor = geo.attributes.normal;
  const cx = w/2 - radius, cy = h/2 - radius, cz = d/2 - radius;
  const s = new THREE.Vector3(), core = new THREE.Vector3(), diff = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    s.set(pos.getX(i)*w, pos.getY(i)*h, pos.getZ(i)*d);
    core.set(clamp(s.x,-cx,cx), clamp(s.y,-cy,cy), clamp(s.z,-cz,cz));
    diff.subVectors(s, core);
    const len = diff.length();
    if (len > 1e-6) {
      const k = radius / len;
      pos.setXYZ(i, core.x + diff.x*k, core.y + diff.y*k, core.z + diff.z*k);
      nor.setXYZ(i, diff.x/len, diff.y/len, diff.z/len);
    } else {
      pos.setXYZ(i, core.x, core.y, core.z);
    }
  }
  pos.needsUpdate = true; nor.needsUpdate = true;
  geo.computeBoundingBox(); geo.computeBoundingSphere();
  return geo;
}

function mat(color, roughness = 0.8, metalness = 0, opts = {}) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness, metalness });
  m.envMapIntensity = opts.env ?? 0.5;
  if (opts.roughMap) { m.roughnessMap = noiseTex; }
  if (opts.map) m.map = opts.map;
  return m;
}
function fabricMat(color) { return mat(color, 0.96, 0, { roughMap: true, env: 0.18 }); }

function box(w, h, d, material, x = 0, y = 0, z = 0, cast = true) {
  const m = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.03, 3), material);
  m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = true;
  return m;
}
function plainBox(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
function cyl(rt, rb, h, seg, material) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), material);
  m.castShadow = true; m.receiveShadow = true; return m;
}

function makeGhost(group) {
  const g = new THREE.Group();
  group.traverse(child => {
    if (child.isMesh) {
      const m = new THREE.Mesh(child.geometry, new THREE.MeshStandardMaterial({
        color: 0x62a86d, transparent: true, opacity: 0.4, roughness: 0.9
      }));
      m.position.copy(child.position); m.rotation.copy(child.rotation); m.scale.copy(child.scale);
      g.add(m);
    }
  });
  return g;
}

function cylAt(rt, rb, h, seg, m, x, y, z) { const c = cyl(rt, rb, h, seg, m); c.position.set(x, y, z); return c; }

// 植木鉢 + 土。観葉植物ビルダー共通。soil top の Y を返す。
function _pot(g, top = 0.15, bot = 0.10, h = 0.26, col = '#d8c5a8', segs = 20) {
  const pm = new THREE.Mesh(new THREE.CylinderGeometry(top, bot, h, segs), mat(col, 0.85));
  pm.position.y = h / 2; pm.castShadow = pm.receiveShadow = true; g.add(pm);
  g.add(cylAt(top + 0.01, top, 0.04, segs, mat(shade(col, 0.88), 0.85), 0, h, 0));
  g.add(cylAt(top - 0.01, top - 0.01, 0.02, segs, mat('#3d2b1f', 0.98), 0, h + 0.01, 0));
  return h + 0.01; // soil top Y
}

export { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost, _pot };
