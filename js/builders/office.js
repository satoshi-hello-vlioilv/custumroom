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
  // 裏面バッキング(壁側) — 裏が白板面に見えて混同しないよう薄灰の板で塞ぐ。原点=壁内面に置くと面一で室内へ突き出す
  g.add(box(1.54, 1.04, 0.012, mat('#aeb4ba', 0.7), 0, 0.88, -0.022));
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


function buildCopier({ color='#e2e2de', w=0.62, d=0.56, h=1.08 } = {}) {
  const g = new THREE.Group();
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xaaccdd, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.5 });
  // Lower body
  const lower = box(w, h * 0.55, d, mat(color, 0.52, 0.04), 0, h * 0.55 / 2, 0); lower.userData.colorable = true; g.add(lower);
  // Paper cassette gap lines (2)
  const cassMat = mat(shade(color, 0.80), 0.5);
  [0.09, 0.21].forEach(cy => g.add(box(w - 0.04, 0.016, d * 0.9, cassMat, 0, cy, 0)));
  // Cassette handle tab
  g.add(box(0.16, 0.014, 0.014, mat(shade(color, 0.75), 0.5), 0.08, 0.15, d / 2 + 0.004));
  // Scanner bed (upper section)
  const scannerY = h * 0.55 + h * 0.06;
  const scannerMesh = box(w, h * 0.12, d, mat(shade(color, 0.92), 0.45), 0, scannerY, 0); scannerMesh.userData.colorable = true; g.add(scannerMesh);
  // Glass platen on scanner top
  g.add(plainBox(w - 0.06, 0.015, d - 0.06, glassMat, 0, scannerY + h * 0.06 + 0.0075, 0));
  // ADF lid
  const adfY = scannerY + h * 0.06 + h * 0.045;
  const adf = box(w - 0.02, h * 0.09, d - 0.02, mat(shade(color, 0.86), 0.48), 0, adfY, 0); adf.userData.colorable = true; g.add(adf);
  // Crease line at front edge of ADF
  g.add(box(w - 0.04, 0.006, 0.006, mat(shade(color, 0.72), 0.6), 0, adfY + h * 0.045 - 0.004, d / 2 - 0.02));
  // Control panel (raised on right side, tilted)
  const panelY = h * 0.6 + h * 0.12 + h * 0.09 + h * 0.095;
  const panel = box(w * 0.52, h * 0.19, d * 0.46, mat(shade(color, 0.95), 0.45, 0.02), w * 0.16, panelY, -d * 0.08); panel.userData.colorable = true; panel.rotation.x = -0.22; g.add(panel);
  // LCD on panel
  g.add(box(w * 0.36, h * 0.12, 0.012, mat('#0a1828', 0.85), w * 0.16, panelY, -d * 0.08 + d * 0.23 + 0.006));
  g.add(box(w * 0.34, h * 0.10, 0.010, mat('#1a4575', 0.7, 0.2), w * 0.16, panelY, -d * 0.08 + d * 0.23 + 0.001));
  // Output tray (between scanner and ADF)
  const tray = box(w - 0.02, 0.018, d * 0.62, mat(shade(color, 0.88), 0.5), 0, scannerY + h * 0.06 + 0.009, d * 0.1);
  tray.rotation.x = 0.12; g.add(tray);
  // Base feet (4 corners)
  const feetMat = mat('#2a2a2f', 0.7);
  [[-w / 2 + 0.04, -d / 2 + 0.04], [w / 2 - 0.04, -d / 2 + 0.04], [-w / 2 + 0.04, d / 2 - 0.04], [w / 2 - 0.04, d / 2 - 0.04]].forEach(([fx, fz]) => {
    g.add(box(0.055, 0.018, 0.055, feetMat, fx, 0.009, fz));
  });
  return g;
}

function buildProjector({ color='#2a2a2f', w=0.3, d=0.25, h=0.12 } = {}) {
  const g = new THREE.Group();
  // Body
  const bodyMesh = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.012, 3), mat(color, 0.42, 0.18, { env: 0.5 }));
  bodyMesh.position.y = h / 2; bodyMesh.castShadow = true; bodyMesh.receiveShadow = true; bodyMesh.userData.colorable = true; g.add(bodyMesh);
  // Lens barrel
  const barrel = cyl(0.038, 0.034, 0.055, 18, mat('#101014', 0.28, 0.6, { env: 1.0 }));
  barrel.rotation.x = Math.PI / 2; barrel.position.set(-w * 0.2, h * 0.5, d / 2 + 0.012); g.add(barrel);
  // Lens glass
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x112244, roughness: 0.03, metalness: 0.15, transparent: true, opacity: 0.85 });
  const lensGlass = cyl(0.026, 0.026, 0.01, 18, lensMat);
  lensGlass.rotation.x = Math.PI / 2; lensGlass.position.set(-w * 0.2, h * 0.5, d / 2 + 0.037); g.add(lensGlass);
  // Top exhaust vents (5)
  const ventMat = mat(shade(color, 0.6), 0.6);
  const ventZStart = -d / 2 + 0.025;
  const ventZStep = (d - 0.05) / 4;
  for (let i = 0; i < 5; i++) {
    g.add(box(w - 0.06, 0.005, 0.012, ventMat, 0, h + 0.002, ventZStart + i * ventZStep));
  }
  // Front LED indicator
  const led = cyl(0.005, 0.005, 0.007, 8, mat('#00cc44', 0.5));
  led.rotation.x = Math.PI / 2; led.position.set(w * 0.36, h * 0.52, d / 2 + 0.003); g.add(led);
  // Adjustment wheel (right side)
  const wheel = cyl(0.018, 0.018, 0.022, 10, mat('#3a3a42', 0.6, 0.1));
  wheel.rotation.z = Math.PI / 2; wheel.position.set(w / 2 + 0.011, h * 0.5, 0); g.add(wheel);
  return g;
}

function buildProjectorScreen({ color='#f5f5f2', w=1.8, d=0.05, h=1.4 } = {}) {
  const g = new THREE.Group();
  // Housing at top
  g.add(box(w + 0.08, 0.08, 0.08, mat('#2e2e2e', 0.5), 0, 2.2, 0));
  // Screen surface (DoubleSide)
  const screenMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.86, metalness: 0, side: THREE.DoubleSide });
  const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(w, 1.32, 0.008), screenMat);
  screenMesh.position.set(0, 1.50, 0); screenMesh.castShadow = true; screenMesh.receiveShadow = true; screenMesh.userData.colorable = true; g.add(screenMesh);
  // Black border frame
  const borderMat = mat('#1a1a1a', 0.6);
  g.add(box(w + 0.04, 0.028, 0.01, borderMat, 0, 2.16 + 0.014, 0));   // top
  g.add(box(w + 0.04, 0.028, 0.01, borderMat, 0, 0.84 - 0.014, 0));   // bottom
  g.add(box(0.028, 1.32 + 0.056, 0.01, borderMat, -w / 2 - 0.014, 1.50, 0)); // left
  g.add(box(0.028, 1.32 + 0.056, 0.01, borderMat,  w / 2 + 0.014, 1.50, 0)); // right
  // Side pull strings
  const strMat = mat('#3a3a3a', 0.7);
  g.add(box(0.012, 0.2, 0.012, strMat, -(w / 2 + 0.04), 2.16 - 0.1, 0));
  g.add(box(0.012, 0.2, 0.012, strMat,   w / 2 + 0.04,  2.16 - 0.1, 0));
  return g;
}

function buildATM({ color='#2a2a2e', w=0.65, d=0.55, h=1.7 } = {}) {
  const g = new THREE.Group();
  const bodyMat = mat(color, 0.42, 0.2, {env:0.4});
  const silverMat = mat('#9aa0a8', 0.28, 0.65, {env:0.8});
  const darkMat = mat('#0e0e12', 0.45, 0.1);
  const screenMat = new THREE.MeshStandardMaterial({color:0x0a1828, roughness:0.08, metalness:0.2});

  // Lower cabinet body
  const lowerBody = new THREE.Mesh(roundedBoxGeom(w, h*0.52, d, 0.022, 3), bodyMat);
  lowerBody.position.set(0, h*0.26, 0); lowerBody.castShadow = true; lowerBody.userData.colorable = true; g.add(lowerBody);

  // Upper terminal (slightly narrower, set back slightly)
  const upperBody = new THREE.Mesh(roundedBoxGeom(w-0.06, h*0.48, d-0.04, 0.022, 3), bodyMat);
  upperBody.position.set(0, h*0.52+h*0.24, -0.02); upperBody.castShadow = true; upperBody.userData.colorable = true; g.add(upperBody);

  // Privacy shield at top
  g.add(box(w, 0.025, 0.08, mat(shade(color,0.72),0.5,0.3), 0, h-0.025, d/2-0.04-0.02));

  // Screen
  g.add(plainBox(w-0.12, h*0.22, 0.012, screenMat, 0, h*0.52+h*0.22, d/2-0.03-0.02));

  // Screen glow
  const screenGlow = new THREE.Mesh(new THREE.PlaneGeometry(w-0.16, h*0.20), new THREE.MeshBasicMaterial({color:0x1a4070, transparent:true, opacity:0.8}));
  screenGlow.position.set(0, h*0.52+h*0.22, d/2-0.03-0.02+0.007); g.add(screenGlow);

  // Screen glow highlight
  const screenHighlight = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.08), new THREE.MeshBasicMaterial({color:0x4a80c0, transparent:true, opacity:0.4}));
  screenHighlight.position.set(-0.1, h*0.52+h*0.26, d/2-0.03-0.02+0.007+0.001); g.add(screenHighlight);

  // Card slot
  g.add(box(0.12, 0.014, 0.03, darkMat, 0, h*0.52+h*0.1, d/2-0.022-0.02));
  // Card slot label stripe
  g.add(box(0.12, 0.008, 0.004, mat('#ff8800',0.6), 0, h*0.52+h*0.1+0.011, d/2-0.022-0.02));

  // Numeric keypad
  g.add(box(0.16, 0.14, 0.025, mat('#1a1a20',0.4,0.15), 0, h*0.52+h*0.06, d/2-0.022-0.02));
  // Key buttons (3x4 grid)
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      g.add(cylAt(0.012, 0.012, 0.008, 10, silverMat, -0.04+c*0.04, h*0.52+h*0.10-r*0.032, d/2-0.014-0.02));
    }
  }

  // Cash dispense slot
  g.add(box(0.22, 0.025, 0.04, darkMat, 0, h*0.38, d/2-0.01));
  // Cash dispense inner glow
  g.add(box(0.18, 0.018, 0.02, mat('#ccaa00',0.8,0,{env:0}), 0, h*0.38, d/2));

  // Receipt slot
  g.add(box(0.08, 0.012, 0.028, darkMat, w*0.22, h*0.35, d/2-0.01));

  // Deposit slot
  g.add(box(0.14, 0.022, 0.03, darkMat, 0, h*0.30, d/2-0.01));

  // Accessibility pin bar
  g.add(box(0.18, 0.016, 0.016, silverMat, 0, h*0.25, d/2+0.005));

  // Lower skirt/base
  g.add(box(w+0.02, 0.04, d+0.02, mat(shade(color,0.65),0.5,0.2), 0, 0.02, 0));

  // Brand logo area
  g.add(box(w-0.16, 0.04, 0.008, mat('#1a3a6a',0.5), 0, h*0.52-0.06, d/2-0.01));

  return g;
}

// 連続デスク (ベンチデスク): 天板が footprint 全幅を占め、横に並べると隙間なく一続きになる。
// 脚は端から内側に控えて配置し、連結時に天板どうしが突き合う。アクセス面 = +Z。
function buildBenchDesk({ color='#e7e1d6', w=1.2, d=0.7, h=0.73 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.55), metal = mat('#6a7078', 0.35, 0.7, { env: 0.8 });
  // 全幅シームレス天板 (隣とエッジで突き合う)
  const top = box(w, 0.04, d, wood, 0, h - 0.02, 0); top.userData.colorable = true; g.add(top);
  g.add(box(w, 0.012, d + 0.004, mat(shade(color, 0.84), 0.5), 0, h - 0.045, 0)); // edge band
  // 端から控えた A 字金属脚 (前後ポスト+足元レール)。連結列が一体に見える
  const legInset = 0.1, legH = h - 0.04;
  [-(w / 2 - legInset), (w / 2 - legInset)].forEach(lx => {
    g.add(box(0.05, legH, 0.05, metal, lx, legH / 2,  (d / 2 - 0.07)));
    g.add(box(0.05, legH, 0.05, metal, lx, legH / 2, -(d / 2 - 0.07)));
    g.add(box(0.06, 0.04, d - 0.06, metal, lx, 0.02, 0));   // foot rail
  });
  // 脚を繋ぐビーム (天板下・背側)
  g.add(box(w - 2 * legInset + 0.05, 0.05, 0.05, metal, 0, h - 0.13, -(d / 2 - 0.09)));
  // 幕板 (背 -Z 側・膝が +Z から入る)
  g.add(box(w - 0.05, 0.26, 0.02, wood, 0, h - 0.19, -(d / 2 - 0.04)));
  // 配線トレイ
  g.add(box(w - 0.2, 0.05, 0.07, mat('#45454a', 0.6), 0, h - 0.16, -(d / 2 - 0.13)));
  return g;
}

// 両面フリーアドレス・ベンチデスク (島型): 全幅シームレス天板, 中央に配線スパイン+低い間仕切りスクリーン,
//  ±Z 両側に人が着席する。隣ユニットと X 端で突き合わせて長い「島」を作る (背面=壁ではない自立型)。
function buildBenchDeskDouble({ color='#e7e1d6', w=1.6, d=1.5, h=0.73 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.55), metal = mat('#6a7078', 0.35, 0.7, { env: 0.8 });
  // 全幅×全奥行シームレス天板 (隣とエッジで突き合う)
  const top = box(w, 0.04, d, wood, 0, h - 0.02, 0); top.userData.colorable = true; g.add(top);
  g.add(box(w, 0.012, d + 0.004, mat(shade(color, 0.84), 0.5), 0, h - 0.045, 0)); // edge band
  // 中央スパイン: 配線ダクト(背中合わせの両席で共有) + 低い間仕切りスクリーン
  g.add(box(w, 0.14, 0.11, mat('#41454b', 0.6), 0, h - 0.09, 0));            // cable spine
  g.add(box(w - 0.06, 0.30, 0.025, fabricMat('#8d99a6'), 0, h + 0.17, 0));   // privacy screen
  // 端から控えた A 字金属脚 (前後=±Z 両側)。連結列が一体に見える
  const legInset = 0.13, legH = h - 0.04;
  [-(w / 2 - legInset), (w / 2 - legInset)].forEach(lx => {
    [(d / 2 - 0.12), -(d / 2 - 0.12)].forEach(lz => g.add(box(0.05, legH, 0.05, metal, lx, legH / 2, lz)));
    g.add(box(0.06, 0.04, d - 0.16, metal, lx, 0.02, 0));   // foot rail (depth)
  });
  // 脚を繋ぐ中央ビーム
  g.add(box(w - 2 * legInset + 0.05, 0.05, 0.06, metal, 0, h - 0.135, 0));
  return g;
}

// ゴンドラ什器 (両面棚): コンビニ/小売の島什器。両面に商品棚を持ち、端を突き合わせて長い棚列を作る。
// 中央背板を境に ±Z 両面へ商品が並ぶ。前後どちらからもアクセスする島型 (背面=壁 ではない)。
function buildGondolaShelf({ color='#d8d2c4', w=1.2, d=0.6, h=1.5 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.5, 0.25, { env: 0.5 });
  const backM = mat(shade(color, 0.9), 0.6);
  const prodC = ['#d23b3b', '#e0962a', '#3b78d2', '#46a14a', '#caa23a', '#b25c78', '#3aa0a0'];
  // base plinth (full width — abuts neighbor)
  g.add(box(w, 0.12, d, mat(shade(color, 0.78), 0.5), 0, 0.06, 0));
  // central double-sided back panel (spine)
  g.add(box(w, h - 0.12, 0.05, backM, 0, (h - 0.12) / 2 + 0.12, 0));
  // end uprights (slightly inset)
  [-(w / 2 - 0.02), (w / 2 - 0.02)].forEach(lx => g.add(box(0.035, h - 0.12, d, mat(shade(color, 0.68), 0.5), lx, (h - 0.12) / 2 + 0.12, 0)));
  // shelves on BOTH faces + product blocks
  const levels = [0.45, 0.78, 1.11, 1.4];
  levels.forEach((sy, li) => {
    [1, -1].forEach(sgn => {
      g.add(box(w - 0.08, 0.03, d / 2 - 0.05, mat(shade(color, 1.02), 0.5), 0, sy, sgn * (d / 4)));         // shelf
      g.add(box(w - 0.08, 0.05, 0.012, mat(shade(color, 0.7), 0.5), 0, sy + 0.02, sgn * (d / 2 - 0.02)));   // front lip
      if (li < 3) {
        let bx = -w / 2 + 0.1;
        for (let k = 0; bx < w / 2 - 0.1; k++) {
          const bw = 0.1 + ((k * 5 + li * 3) % 4) * 0.02;
          if (bx + bw > w / 2 - 0.08) break;
          const bh = 0.16 + ((k * 7 + li) % 3) * 0.03;
          g.add(box(bw, bh, d / 2 - 0.1, mat(prodC[(k + li + (sgn > 0 ? 0 : 3)) % prodC.length], 0.7), bx + bw / 2, sy + 0.015 + bh / 2, sgn * (d / 4)));
          bx += bw + 0.02;
        }
      }
    });
  });
  // top header sign band (full width)
  const hdr = box(w, 0.14, d * 0.34, mat(shade(color, 1.06), 0.45, 0.2), 0, h + 0.07, 0); hdr.userData.colorable = true; g.add(hdr);
  return g;
}

export { buildATM, buildBarCounter, buildBarStool, buildBenchDesk, buildBenchDeskDouble, buildConferenceTable, buildCopier, buildDisplayCase, buildFilingCabinet, buildGondolaShelf, buildInfoPanel, buildPedestal, buildProjector, buildProjectorScreen, buildReceptionCounter, buildRegisterCounter, buildRoundTable, buildShelfRack, buildShowcaseFridge, buildWhiteboard };
