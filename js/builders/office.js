import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

function buildConferenceTable({ color='#8a5a2b', w=3.6, d=1.2, h=0.74 } = {}) {
  const g = new THREE.Group();
  const topMesh = new THREE.Mesh(roundedBoxGeom(w, 0.05, d, 0.015, 3), mat(color, 0.5, 0.04, { env: 0.5 }));
  topMesh.position.y = h - 0.025; topMesh.castShadow = true; topMesh.receiveShadow = true; topMesh.userData.colorable = true; g.add(topMesh);
  const leg = mat('#2a2018', 0.58, 0.18);
  [-w/2 + 0.35, w/2 - 0.35].forEach(x => {
    g.add(box(0.05, h - 0.06, d - 0.14, leg, x, (h - 0.06) / 2, 0));
    g.add(box(0.48, 0.04, d - 0.14, leg, x, 0.02, 0));
  });
  g.add(cylAt(0.03, 0.03, 0.022, 10, mat('#3a3530', 0.45, 0.5), 0, h + 0.01, 0));
  return g;
}
function buildWhiteboard({ color='#f9f9f6' } = {}) {
  const g = new THREE.Group();
  const frame = mat('#8a9098', 0.3, 0.65, { env: 0.8 });
  const board = box(1.5, 1.0, 0.03, mat(color, 0.9, 0), 0, 0.88, 0); board.userData.colorable = true; g.add(board);
  g.add(box(1.56, 0.04, 0.04, frame, 0, 1.40, 0));
  g.add(box(1.56, 0.08, 0.04, frame, 0, 0.37, 0));
  g.add(box(0.04, 1.1, 0.04, frame, -0.78, 0.88, 0));
  g.add(box(0.04, 1.1, 0.04, frame, 0.78, 0.88, 0));
  g.add(box(1.5, 0.04, 0.1, frame, 0, 0.38, 0.05));
  ['#e53', '#38f', '#2a2'].forEach((c, i) => g.add(box(0.018, 0.12, 0.018, mat(c, 0.7), -0.12 + i * 0.12, 0.42, 0.08)));
  [-0.6, 0.6].forEach(x => { g.add(box(0.04, 0.38, 0.04, frame, x, 0.19, 0)); g.add(box(0.28, 0.025, 0.05, frame, x, 0.025, 0)); });
  g.add(box(0.55, 0.018, 0.005, mat('#3b6bbf', 0.9), -0.25, 1.0, 0.022));
  g.add(box(0.30, 0.018, 0.005, mat('#3b6bbf', 0.9),  0.25, 0.82, 0.022));
  g.add(box(0.45, 0.018, 0.005, mat('#2a9c5a', 0.9), -0.1, 0.66, 0.022));
  return g;
}
function buildFilingCabinet({ color='#7a8fa0', w=0.46, d=0.62, h=1.32 } = {}) {
  const g = new THREE.Group();
  const cab = box(w, h, d, mat(color, 0.35, 0.5, { env: 0.8 }), 0, h / 2, 0); cab.userData.colorable = true; g.add(cab);
  g.add(box(w + 0.02, 0.03, d + 0.02, mat(shade(color, 0.82), 0.4, 0.5), 0, h + 0.015, 0));
  const hdl = mat('#c0c8d4', 0.2, 0.8, { env: 1.0 });
  for (let i = 0; i < 4; i++) {
    const fr = box(w - 0.04, 0.28, 0.022, mat(shade(color, 1.12), 0.38, 0.5), 0, 0.18 + i * 0.3, d / 2 + 0.007); fr.userData.colorable = true; g.add(fr);
    g.add(box(0.22, 0.022, 0.022, hdl, 0, 0.18 + i * 0.3, d / 2 + 0.026));
    g.add(box(0.2, 0.07, 0.006, mat('#e8e0d0', 0.75), 0, 0.26 + i * 0.3, d / 2 + 0.016));
  }
  g.add(box(w - 0.04, 0.04, d - 0.04, mat('#444', 0.7), 0, 0.02, 0));
  return g;
}
function buildReceptionCounter({ color='#f3ece0', w=2.4, d=0.7, h=1.1 } = {}) {
  const g = new THREE.Group();
  const darkWood = mat(shade(color, 0.78), 0.52, 0.06);
  const front = box(w, h, 0.045, darkWood, 0, h / 2, d / 2 - 0.022); front.userData.colorable = true; g.add(front);
  g.add(box(w + 0.04, 0.05, 0.12, mat(shade(color, 1.08), 0.38, 0.04), 0, h - 0.025, d / 2 - 0.01));
  g.add(box(w, 0.04, d, mat('#d4cec4', 0.4, 0.04), 0, 0.76, 0));
  const back = box(w, 0.76, 0.045, mat(shade(color, 0.88), 0.55), 0, 0.38, -d / 2 + 0.022); back.userData.colorable = true; g.add(back);
  [-w / 2 + 0.022, w / 2 - 0.022].forEach(x => g.add(box(0.045, h, d, darkWood, x, h / 2, 0)));
  g.add(box(w, 0.04, d, mat('#2a2520', 0.7), 0, 0.02, 0));
  g.add(box(0.8, 0.07, 0.01, mat('#3d8f60', 0.55), 0, h * 0.52, d / 2 - 0.002));
  return g;
}

function buildDisplayCase({ color='#aabcc8' } = {}) {
  const g = new THREE.Group();
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbcdde8, roughness: 0.04, metalness: 0.08, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
  const frameMat = mat('#9aa8b0', 0.28, 0.72, { env: 1.0 });
  g.add(box(0.88, 0.1, 0.58, mat('#4e4840', 0.65), 0, 0.05, 0));
  g.add(box(0.82, 0.2, 0.52, mat('#5e5448', 0.62), 0, 0.2, 0));
  const pw = 0.82, pd = 0.52, gh = 0.88, gy = 0.3 + gh / 2;
  g.add(plainBox(pw, gh, 0.008, glassMat, 0, gy,  pd / 2));
  g.add(plainBox(pw, gh, 0.008, glassMat, 0, gy, -pd / 2));
  g.add(plainBox(0.008, gh, pd, glassMat, -pw / 2, gy, 0));
  g.add(plainBox(0.008, gh, pd, glassMat,  pw / 2, gy, 0));
  [[pw/2,pd/2],[pw/2,-pd/2],[-pw/2,pd/2],[-pw/2,-pd/2]].forEach(([x,z]) => g.add(box(0.02, gh + 0.06, 0.02, frameMat, x, gy, z)));
  g.add(box(pw + 0.02, 0.03, pd + 0.02, frameMat, 0, 0.3 + gh + 0.015, 0));
  const obj = box(0.14, 0.18, 0.1, mat('#c8a438', 0.42, 0.58, { env: 1.4 }), 0, 0.39, 0); obj.userData.colorable = true; g.add(obj);
  return g;
}
function buildPedestal({ color='#c8c0b4' } = {}) {
  const g = new THREE.Group();
  g.add(box(0.56, 0.06, 0.56, mat(shade(color, 0.82), 0.7), 0, 0.03, 0));
  const col = box(0.5, 0.96, 0.5, mat(color, 0.68, 0.04), 0, 0.51, 0); col.userData.colorable = true; g.add(col);
  g.add(box(0.56, 0.05, 0.56, mat(shade(color, 0.85), 0.65), 0, 0.985, 0));
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), mat('#c8a020', 0.38, 0.72, { env: 1.5 }));
  sphere.position.y = 1.16; sphere.castShadow = true; sphere.userData.colorable = true; g.add(sphere);
  return g;
}
function buildInfoPanel({ color='#f2eee8' } = {}) {
  const g = new THREE.Group();
  const frame = mat('#2a2418', 0.6, 0.15);
  g.add(box(0.03, 1.5, 0.03, frame, 0, 0.75, 0));
  g.add(box(0.28, 0.025, 0.06, frame, 0, 0.025, 0));
  const board = box(0.72, 0.92, 0.025, mat(color, 0.78), 0, 1.02, 0.02); board.userData.colorable = true; g.add(board);
  g.add(box(0.76, 0.96, 0.03, mat('#1c1810', 0.7), 0, 1.02, 0.006));
  g.add(box(0.55, 0.06, 0.006, mat('#3a2a18', 0.7), 0, 1.36, 0.036));
  [0.18, 0.06, -0.06, -0.18].forEach(dy => g.add(box(0.48, 0.015, 0.006, mat('#5a4a38', 0.85), 0, 1.0 + dy, 0.036)));
  g.add(box(0.24, 0.22, 0.006, mat('#8a9888', 0.7), -0.18, 0.67, 0.034));
  return g;
}

function buildShelfRack({ color='#e0d8cc', w=1.2, d=0.5, h=1.9 } = {}) {
  const g = new THREE.Group();
  const steel = mat('#7a8490', 0.3, 0.6, { env: 0.8 });
  [-w/2 + 0.015, w/2 - 0.015].forEach(x => {
    g.add(box(0.03, h, 0.03, steel, x, h / 2, -d / 2 + 0.015));
    g.add(box(0.03, h, 0.03, steel, x, h / 2,  d / 2 - 0.015));
  });
  g.add(box(w, h, 0.02, mat('#d0c8bc', 0.8), 0, h / 2, -d / 2 + 0.01));
  const prodColors = ['#e05a2b','#2b7ae0','#28a044','#e0c42b','#c050c0','#ff8800'];
  [0.3, 0.75, 1.2, 1.65, h - 0.04].forEach(y => {
    const shelf = box(w, 0.025, d, mat(color, 0.6, 0.05), 0, y, 0); shelf.userData.colorable = true; g.add(shelf);
    if (y < h - 0.15) {
      for (let i = -0.44; i <= 0.44; i += 0.16) {
        const pc = prodColors[Math.floor(Math.abs(i * 7 + y * 3)) % prodColors.length];
        g.add(box(0.1, 0.15, 0.08, mat(pc, 0.8), i, y + 0.1, -0.1));
      }
    }
  });
  return g;
}
function buildRegisterCounter({ color='#f3ece0', w=1.2, d=0.65, h=0.9 } = {}) {
  const g = new THREE.Group();
  const dark = mat('#1e1a14', 0.5);
  const body = box(w, h - 0.05, d, mat(shade(color, 0.9), 0.52), 0, (h - 0.05) / 2, 0); body.userData.colorable = true; g.add(body);
  g.add(box(w + 0.02, 0.05, d + 0.02, mat(shade(color, 1.1), 0.35, 0.04), 0, h - 0.025, 0));
  g.add(box(0.28, 0.04, 0.24, dark, -0.2, h + 0.02, -0.05));
  g.add(box(0.28, 0.24, 0.03, mat('#0a1520', 0.9, 0.15), -0.2, h + 0.17, -0.16));
  g.add(box(0.30, 0.26, 0.035, dark, -0.2, h + 0.17, -0.174));
  g.add(box(0.20, 0.16, 0.03, mat('#0a1520', 0.9, 0.15), 0.2, h + 0.22, 0.15));
  g.add(box(0.03, 0.18, 0.03, dark, 0.2, h + 0.09, 0.12));
  g.add(box(0.20, 0.02, 0.18, mat('#1a1a1a', 0.7), 0.2, h + 0.01, -0.07));
  g.add(box(0.12, 0.005, 0.12, mat('#88aacc', 0.1, 0.2, { env: 1.5 }), 0.2, h + 0.022, -0.07));
  g.add(box(0.015, h - 0.05, d, mat('#a09888', 0.5), w / 2 - 0.015, (h - 0.05) / 2, 0));
  return g;
}
function buildShowcaseFridge({ color='#d8d0c4', w=1.2, d=0.72, h=2.0 } = {}) {
  const g = new THREE.Group();
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x90c8e4, roughness: 0.05, metalness: 0.12, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
  const frame = mat('#6a7078', 0.3, 0.72, { env: 0.9 });
  const bodyMesh = box(w, h, d, mat(color, 0.4, 0.3, { env: 0.6 }), 0, h / 2, 0); bodyMesh.userData.colorable = true; g.add(bodyMesh);
  [-w / 4, w / 4].forEach(x => {
    g.add(plainBox(w / 2 - 0.025, h - 0.1, 0.02, glassMat, x, h / 2, d / 2 + 0.01));
    g.add(box(0.04, 0.2, 0.042, frame, x, h * 0.5, d / 2 + 0.07));
  });
  g.add(box(w, 0.18, d, mat('#3a3a3a', 0.6, 0.2), 0, h + 0.09, 0));
  [0.4, 0.85, 1.3, 1.72].forEach(y => g.add(box(w - 0.1, 0.02, d - 0.1, mat('#c0d0d8', 0.45, 0.2), 0, y, 0)));
  g.add(box(w, 0.06, d, mat('#333', 0.7), 0, 0.03, 0));
  return g;
}
function buildBarCounter({ color='#5b3a22', w=2.4, d=0.5, h=1.1 } = {}) {
  const g = new THREE.Group();
  const base = box(w, h - 0.1, d, mat(shade(color, 0.82), 0.62), 0, (h - 0.1) / 2, 0); base.userData.colorable = true; g.add(base);
  const topMesh = new THREE.Mesh(roundedBoxGeom(w + 0.06, 0.08, d + 0.1, 0.02, 3), mat(color, 0.5, 0.04, { env: 0.4 }));
  topMesh.position.y = h; topMesh.castShadow = true; topMesh.receiveShadow = true; topMesh.userData.colorable = true; g.add(topMesh);
  g.add(box(w, 0.04, 0.04, mat('#8a7060', 0.4, 0.5), 0, 0.24, d / 2 + 0.02));
  for (let i = 0; i < 3; i++) g.add(box(w / 3 - 0.04, h - 0.26, 0.04, mat(shade(color, 1.1), 0.5), -w / 3 + i * (w / 3), (h - 0.12) / 2, d / 2 + 0.02));
  [0.35, 0.72].forEach(y => g.add(box(w - 0.1, 0.03, d - 0.08, mat(shade(color, 0.92), 0.6), 0, y, 0)));
  return g;
}
function buildBarStool({ color='#5b5048' } = {}) {
  const g = new THREE.Group();
  const chrome = mat('#c0c8d0', 0.2, 0.85, { env: 1.0 });
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.07, 16), fabricMat(color));
  seat.position.y = 0.8; seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.012, 8, 20), chrome); ring.rotation.x = Math.PI / 2; ring.position.y = 0.28; g.add(ring);
  const post = cyl(0.025, 0.025, 0.72, 10, chrome); post.position.y = 0.42; g.add(post);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 20), chrome); base.position.y = 0.02; base.castShadow = true; g.add(base);
  return g;
}
function buildRoundTable({ color='#8a5a2b', w=0.9, d=0.9, h=0.74 } = {}) {
  const g = new THREE.Group();
  const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.05, 32), mat(color, 0.5, 0.04, { env: 0.4 }));
  topMesh.position.y = h - 0.025; topMesh.castShadow = true; topMesh.receiveShadow = true; topMesh.userData.colorable = true; g.add(topMesh);
  const post = cyl(0.04, 0.04, h - 0.12, 10, mat('#2a2018', 0.5, 0.2)); post.position.y = (h - 0.12) / 2; g.add(post);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.05, 20), mat('#2a2018', 0.6, 0.2)); base.position.y = 0.025; base.castShadow = true; g.add(base);
  return g;
}


export { buildBarCounter, buildBarStool, buildConferenceTable, buildDisplayCase, buildFilingCabinet, buildInfoPanel, buildPedestal, buildReceptionCounter, buildRegisterCounter, buildRoundTable, buildShelfRack, buildShowcaseFridge, buildWhiteboard };
