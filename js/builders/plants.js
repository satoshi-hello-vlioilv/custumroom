import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

function buildPlant({ color='#6f9e74' } = {}) {
  const g = new THREE.Group(); const pot = mat('#d8c5a8', 0.85), potRim = mat('#c7b393', 0.85), earth = mat('#3d2b1f', 0.98), leaf = mat(color, 0.78);
  // tapered ceramic pot with rim
  const potMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.26, 20), pot); potMesh.position.y = 0.13; potMesh.castShadow = potMesh.receiveShadow = true; g.add(potMesh);
  g.add(cylAt(0.16, 0.15, 0.04, 20, potRim, 0, 0.25, 0));
  g.add(cylAt(0.14, 0.14, 0.02, 16, earth, 0, 0.26, 0));
  // trunk
  g.add(cylAt(0.035, 0.05, 0.55, 8, mat('#5c3d1e', 0.8), 0, 0.52, 0));
  // fuller, layered foliage with slight per-leaf color variation
  const positions = [
    [0,1.12,0,0.2],[0.18,0.98,0.1,0.17],[-0.2,1.04,-0.05,0.18],[0.08,1.3,-0.14,0.15],
    [0,0.88,0.2,0.16],[-0.12,1.22,0.13,0.14],[0.22,1.16,-0.06,0.15],[-0.16,0.84,0.06,0.14],
    [0.12,0.78,-0.12,0.13],[0,1.4,0.02,0.13],[0.26,0.92,0.08,0.12],[-0.24,1.12,0.1,0.12]
  ];
  positions.forEach(([x,y,z,r], i) => {
    const lm = leaf.clone(); lm.color = new THREE.Color(shade(color, 0.85 + (i%4)*0.08));
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), lm);
    lf.position.set(x,y,z); lf.scale.y = 1.25; lf.rotation.set(Math.random()*0.4, i, Math.random()*0.4);
    lf.castShadow = true; lf.receiveShadow = true; lf.userData.colorable = true; g.add(lf);
  });
  return g;
}
function buildCactus({ color='#5f8a52', w=0.3, d=0.3, h=0.55 } = {}) {
  const g = new THREE.Group();
  const pot = mat('#c87f54', 0.8), earth = mat('#3d2b1f', 0.98), green = mat(color, 0.7);
  const potM = new THREE.Mesh(new THREE.CylinderGeometry(w/2 - 0.01, w/2 * 0.85, 0.16, 6), pot); potM.position.set(0, 0.08, 0); potM.castShadow = true; g.add(potM);
  const soilM = cyl(w/2 - 0.02, w/2 - 0.02, 0.02, 6, earth); soilM.position.set(0, 0.17, 0); g.add(soilM);
  const bodyH = h - 0.18;
  let bodyGeom;
  try { bodyGeom = new THREE.CapsuleGeometry(0.045, bodyH, 6, 12); }
  catch(_) { bodyGeom = new THREE.CylinderGeometry(0.045, 0.05, bodyH, 8); }
  const body = new THREE.Mesh(bodyGeom, green); body.position.set(0, 0.18 + bodyH/2, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  const armH = bodyH * 0.45;
  [-1, 1].forEach((side, idx) => {
    const ay = 0.18 + bodyH * (0.35 + idx * 0.15);
    let armG;
    try { armG = new THREE.CapsuleGeometry(0.028, armH, 5, 8); }
    catch(_) { armG = new THREE.CylinderGeometry(0.028, 0.03, armH, 6); }
    const arm = new THREE.Mesh(armG, green); arm.position.set(side * 0.08, ay, 0); arm.rotation.z = side * 0.9; arm.castShadow = true; g.add(arm);
  });
  return g;
}
function buildSucculent({ color='#6f9e74', w=0.25, d=0.25, h=0.2 } = {}) {
  const g = new THREE.Group();
  const pot = mat('#d8d0c4', 0.85), earth = mat('#3d2b1f', 0.98);
  const potM = new THREE.Mesh(new THREE.CylinderGeometry(w/2, w/2 * 0.88, 0.1, 6), pot); potM.position.set(0, 0.05, 0); potM.castShadow = true; g.add(potM);
  cyl(w/2 - 0.01, w/2 - 0.01, 0.01, 6, earth).position.set(0, 0.105, 0); g.add(g.children[g.children.length-1] = (() => { const m = cyl(w/2-0.01, w/2-0.01, 0.01, 6, earth); m.position.set(0, 0.105, 0); return m; })());
  const leafMat = mat(color, 0.75); const numLeaves = 8;
  for (let i = 0; i < numLeaves; i++) {
    const ang = (i / numLeaves) * Math.PI * 2;
    const r = (i % 2 === 0 ? 0.06 : 0.035);
    const leafH = h * (i % 2 === 0 ? 0.62 : 0.45);
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), leafMat);
    leaf.scale.set(0.5, leafH / 0.05, 0.5);
    leaf.position.set(Math.cos(ang) * r, 0.12 + leafH * 0.4, Math.sin(ang) * r);
    leaf.rotation.z = Math.cos(ang) * 0.5; leaf.rotation.x = Math.sin(ang) * 0.5;
    leaf.castShadow = true; leaf.userData.colorable = true; g.add(leaf);
  }
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), leafMat); center.position.set(0, 0.18, 0); center.userData.colorable = true; g.add(center);
  return g;
}
// 共通の鉢ヘルパー
function buildMonstera({ color='#2d6a34' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.20, 0.13, 0.32, '#b8956a');
  // 太い茎
  g.add(cylAt(0.045, 0.055, 0.65, 8, mat('#4a2f12', 0.8), 0, soilY + 0.32, 0));
  const lm = mat(color, 0.72);
  const darkLm = mat(shade(color, 0.62), 0.85);
  // 大きな丸葉をフラットなスケールで表現
  const leafDefs = [
    { x: 0.30, y: soilY+0.72, z: 0.05, rx:-0.35, ry: 0.3,  sx:2.0, sy:0.28, sz:1.7, r:0.28 },
    { x:-0.32, y: soilY+0.90, z:-0.05,rx: 0.28, ry:-0.4,  sx:2.2, sy:0.25, sz:1.8, r:0.27 },
    { x: 0.10, y: soilY+1.12, z: 0.22, rx:-0.4,  ry: 0.1,  sx:1.9, sy:0.22, sz:1.6, r:0.26 },
    { x:-0.08, y: soilY+0.56, z:-0.24, rx: 0.2,  ry: 0.7,  sx:1.5, sy:0.20, sz:1.3, r:0.22 },
    { x: 0.22, y: soilY+1.02, z:-0.18, rx: 0.15, ry:-0.6,  sx:1.7, sy:0.21, sz:1.5, r:0.24 },
  ];
  leafDefs.forEach(({ x,y,z,rx,ry,sx,sy,sz,r }, i) => {
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 2), lm.clone());
    lf.position.set(x,y,z); lf.scale.set(sx,sy,sz); lf.rotation.set(rx,ry,0);
    lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
    // 葉脈スリット (暗い細線)
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, r*sz*1.6), darkLm);
    slit.position.set(x, y, z); slit.rotation.set(rx,ry,0); g.add(slit);
    // 葉柄
    const petiole = cylAt(0.01,0.012, 0.18+i*0.02, 6, mat('#3a5a28',0.8), x*0.4, y-0.12, z*0.4);
    petiole.rotation.set(rx*0.5,ry,0); g.add(petiole);
  });
  return g;
}

// ドラセナ・マルギナータ — 細い幹+先端から放射状の細長い葉
function buildDracaena({ color='#3a6635' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.16, 0.10, 0.28, '#c4a87a');
  // 細い幹 (わずかに湾曲)
  const trunkMat = mat('#6b4a28', 0.75);
  g.add(cylAt(0.028, 0.038, 0.95, 8, trunkMat, 0, soilY+0.475, 0));
  // 幹の上部に環状節跡
  [0.3, 0.6, 0.85].forEach(frac => g.add(cylAt(0.032, 0.032, 0.015, 8, mat('#4a3018',0.9), 0, soilY + frac, 0)));
  // 先端から長い細葉を放射状に
  const leafH = soilY + 0.95;
  const lm = mat(color, 0.68);
  const numLeaves = 18;
  for (let i = 0; i < numLeaves; i++) {
    const ang = (i / numLeaves) * Math.PI * 2;
    const tilt = 0.28 + Math.random()*0.25;
    const len = 0.38 + Math.random()*0.18;
    const lf = new THREE.Mesh(new THREE.BoxGeometry(0.018, len, 0.006), mat(shade(color, 0.88+i*0.01), 0.7));
    lf.position.set(Math.cos(ang)*0.04, leafH + len*0.4, Math.sin(ang)*0.04);
    lf.rotation.set(Math.cos(ang)*tilt, ang, Math.sin(ang)*tilt*0.3);
    lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
    // 葉の先端の赤縁 (marginata特徴)
    if (i % 3 === 0) {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.002, len*0.9, 0.007), mat('#c04040',0.7));
      edge.position.copy(lf.position); edge.rotation.copy(lf.rotation); g.add(edge);
    }
  }
  return g;
}

// サンスベリア (虎の尾 / スネークプラント) — 直立した剣状の葉
function buildSansevieria({ color='#3a6030' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.18, 0.12, 0.24, '#c8b48a');
  const numLeaves = 7;
  for (let i = 0; i < numLeaves; i++) {
    const ang = (i / numLeaves) * Math.PI * 2 + i*0.15;
    const r = 0.04 + (i%3)*0.025;
    const h = 0.4 + (i%4)*0.12;
    const lean = 0.08 + (i%2)*0.06;
    const leafMat = mat(shade(color, 0.85+i*0.04), 0.65);
    // 葉本体 (細長い直方体、先端へ細くなる)
    const lf = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.018), leafMat);
    lf.position.set(Math.cos(ang)*r, soilY + h*0.5, Math.sin(ang)*r);
    lf.rotation.set(Math.cos(ang)*lean*0.4, ang, Math.sin(ang)*lean*0.4);
    lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
    // 葉の縁取り (明るい色)
    const edgeMat = mat(shade(color, 1.35), 0.7);
    [-0.027, 0.027].forEach(dx => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.006, h*0.9, 0.02), edgeMat);
      edge.position.set(Math.cos(ang)*r + dx*Math.cos(ang+Math.PI/2),
                        soilY + h*0.5, Math.sin(ang)*r + dx*Math.sin(ang+Math.PI/2));
      edge.rotation.copy(lf.rotation); g.add(edge);
    });
    // 横縞模様 (水平の暗い帯)
    for (let s = 0; s < 4; s++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.012, 0.02),
        mat(shade(color, 0.65), 0.8));
      stripe.position.set(lf.position.x, soilY + h*(0.2 + s*0.2), lf.position.z);
      stripe.rotation.copy(lf.rotation); g.add(stripe);
    }
  }
  return g;
}

// フィカス・ウンベラータ — 大きなハート形の葉、枝分かれした樹形
function buildFicusUmbellata({ color='#4a8040' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.22, 0.14, 0.34, '#b08060');
  const trunkMat = mat('#5c3c1a', 0.75);
  // メイン幹
  g.add(cylAt(0.045, 0.06, 0.85, 10, trunkMat, 0, soilY+0.425, 0));
  // 二股に分岐
  const branches = [
    { ox: 0.12, oy: soilY+0.9, oz: 0,    rx:-0.3, rz: 0.35,  len:0.45, r:0.028 },
    { ox:-0.10, oy: soilY+0.92, oz:0.08, rx:-0.2, rz:-0.3,  len:0.40, r:0.025 },
  ];
  branches.forEach(b => {
    const br = cylAt(b.r, b.r+0.005, b.len, 8, trunkMat, b.ox, b.oy+b.len*0.4, b.oz);
    br.rotation.set(b.rx, 0, b.rz); g.add(br);
  });
  // ハート形の大きな葉 (横に広い楕円で近似)
  const lm = mat(color, 0.70);
  const leafDefs = [
    { x: 0.28, y: soilY+1.20, z: 0.08,  ry: 0.5, sz: 1.4 },
    { x:-0.25, y: soilY+1.28, z:-0.05,  ry:-0.6, sz: 1.5 },
    { x: 0.08, y: soilY+1.45, z: 0.22,  ry: 0.2, sz: 1.3 },
    { x:-0.12, y: soilY+1.10, z:-0.25,  ry:-0.3, sz: 1.4 },
    { x: 0.32, y: soilY+1.05, z:-0.15,  ry: 0.8, sz: 1.3 },
    { x:-0.30, y: soilY+0.82, z: 0.18,  ry:-0.7, sz: 1.2 },
    { x: 0.04, y: soilY+0.90, z: 0.32,  ry: 0.0, sz: 1.4 },
  ];
  leafDefs.forEach(({ x,y,z,ry,sz }) => {
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 2), lm.clone());
    lf.position.set(x,y,z); lf.scale.set(1.0, 0.18, sz); lf.rotation.y = ry;
    lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
    // 中央葉脈
    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.005, 0.22*sz*1.8), mat(shade(color,0.6), 0.8));
    vein.position.set(x,y,z); vein.rotation.y = ry; g.add(vein);
  });
  return g;
}

// シュロチク (観音竹) — 細い複数の幹+扇状の葉
function buildRhapis({ color='#356e3a' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.24, 0.15, 0.36, '#c0a07a');
  const caneH = [0.85, 0.72, 0.92, 0.68, 0.80];
  const canePos = [[-0.06,-0.04],[0.08,0.06],[-0.04,0.10],[0.02,-0.10],[0.10,-0.02]];
  canePos.forEach(([cx,cz], ci) => {
    const h = caneH[ci];
    // 竹のような細い幹 (節あり)
    g.add(cylAt(0.018, 0.018, h, 8, mat('#4a3820', 0.7), cx, soilY+h/2, cz));
    for (let ni = 0; ni < 4; ni++) g.add(cylAt(0.020, 0.020, 0.018, 8, mat('#3a2810',0.8), cx, soilY+h*(0.2+ni*0.2), cz));
    // 先端から扇状の複葉
    const topY = soilY + h;
    const numFan = 5 + ci;
    for (let fi = 0; fi < numFan; fi++) {
      const fa = (fi/(numFan-1)-0.5)*Math.PI*1.1;
      const fl = 0.22 + Math.random()*0.08;
      const leaflet = new THREE.Mesh(new THREE.BoxGeometry(0.014, fl, 0.008),
        mat(shade(color, 0.88+fi*0.02), 0.70));
      leaflet.position.set(cx + Math.sin(fa)*fl*0.4, topY + fl*0.4*Math.cos(fa*0.3),
                           cz + Math.cos(fa)*fl*0.05);
      leaflet.rotation.set(-fl*0.2, fa*0.1, fa + Math.PI*0.1);
      leaflet.castShadow = true; leaflet.userData.colorable = true; g.add(leaflet);
    }
  });
  return g;
}

// ポトス — 小さな鉢から垂れ下がるハート葉のツル
function buildPothos({ color='#4a8040' } = {}) {
  const g = new THREE.Group();
  // 小鉢
  const potM = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.085, 0.20, 18), mat('#d0b890',0.85));
  potM.position.y = 0.10; potM.castShadow = potM.receiveShadow = true; g.add(potM);
  g.add(cylAt(0.125, 0.12, 0.03, 18, mat('#b8a070',0.85), 0, 0.20, 0));
  g.add(cylAt(0.115, 0.115, 0.015, 16, mat('#3d2b1f',0.98), 0, 0.21, 0));
  const lm = mat(color, 0.72);
  // 垂れ下がるツル + 葉
  const vines = [
    { ang: 0.2,    drops: [0.05, 0.18, 0.32, 0.44] },
    { ang: 1.8,    drops: [0.08, 0.22, 0.38] },
    { ang: 3.4,    drops: [0.04, 0.20, 0.35, 0.50] },
    { ang: 5.0,    drops: [0.10, 0.26, 0.40] },
  ];
  vines.forEach(({ ang, drops }) => {
    drops.forEach((drop, di) => {
      const r = 0.08 + drop * 0.5;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      const y = 0.22 - drop * 0.35;
      // 小葉 (ハート形 = 横長楕円)
      const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 1), lm.clone());
      lf.position.set(x, y, z); lf.scale.set(1.0, 0.4, 0.85);
      lf.rotation.y = ang + di * 0.4;
      lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
      // ツル線
      if (di > 0) {
        const pr = 0.08 + drops[di-1]*0.5, py = 0.22 - drops[di-1]*0.35;
        const px = Math.cos(ang)*pr, pz = Math.sin(ang)*pr;
        const mid = new THREE.Vector3((x+px)/2, (y+py)/2, (z+pz)/2);
        const len = Math.hypot(x-px, y-py, z-pz);
        const vine = cylAt(0.005, 0.005, len, 4, mat('#2a5020',0.9), mid.x, mid.y, mid.z);
        const dir = new THREE.Vector3(x-px, y-py, z-pz).normalize();
        vine.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
        g.add(vine);
      }
    });
  });
  return g;
}

// バンブー (幸運の竹 / Lucky Bamboo)
function buildBamboo({ color='#5a9450' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.14, 0.09, 0.22, '#c0d0b8');
  // 水の演出 (透明な水面)
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 18),
    new THREE.MeshStandardMaterial({ color: 0xb8e0f0, roughness: 0.05, metalness: 0.1, transparent:true, opacity:0.55 }));
  water.position.y = soilY - 0.04; g.add(water);
  // 3本の竹の茎
  const stems = [[-0.05, -0.04, 0.58+Math.random()*0.2], [0, 0.06, 0.75+Math.random()*0.25], [0.07, -0.02, 0.62+Math.random()*0.2]];
  stems.forEach(([cx, cz, sh]) => {
    const caneSegH = sh / 4;
    for (let s = 0; s < 4; s++) {
      g.add(cylAt(0.016, 0.016, caneSegH - 0.02, 10, mat(shade(color, 0.95+s*0.02), 0.6),
                  cx, soilY + s*caneSegH + caneSegH/2, cz));
      // 節
      g.add(cylAt(0.020, 0.020, 0.018, 10, mat(shade(color,0.7), 0.7), cx, soilY + (s+1)*caneSegH, cz));
    }
    // 先端の葉束
    const topY = soilY + sh;
    for (let li = 0; li < 5; li++) {
      const la = (li/5)*Math.PI*2;
      const lf = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.18, 0.005),
        mat(shade(color, 0.9+li*0.03), 0.65));
      lf.position.set(cx + Math.cos(la)*0.035, topY + 0.08, cz + Math.sin(la)*0.035);
      lf.rotation.set(-0.4 + Math.random()*0.3, la, Math.random()*0.3);
      lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
    }
  });
  return g;
}

// ストレリチア (極楽鳥花) — 大きなパドル型の葉
function buildStrelitzia({ color='#2a6a30' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.22, 0.14, 0.34, '#b89060');
  const lm = mat(color, 0.68);
  // 長い葉柄から大きなパドル葉が放射状に
  const leaves = [
    { ox:0.18, oy:soilY+0.90, oz:0.05, rx:-0.25, ry:0.4, rl:0.65, rw:0.16 },
    { ox:-0.20, oy:soilY+1.05, oz:-0.06, rx:0.20, ry:-0.5, rl:0.70, rw:0.17 },
    { ox:0.06, oy:soilY+1.25, oz:0.22, rx:-0.30, ry:0.1, rl:0.62, rw:0.15 },
    { ox:-0.08, oy:soilY+0.78, oz:-0.20, rx:0.18, ry:0.7, rl:0.58, rw:0.14 },
    { ox:0.22, oy:soilY+0.65, oz:-0.12, rx:0.12, ry:-0.6, rl:0.55, rw:0.13 },
  ];
  leaves.forEach(({ ox,oy,oz,rx,ry,rl,rw }, i) => {
    // 葉身 (細長い楕円)
    const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 2), lm.clone());
    lf.scale.set(rw/0.1, 0.06, rl/0.1);
    lf.position.set(ox, oy, oz); lf.rotation.set(rx, ry, 0);
    lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
    // 葉柄
    const petioleLen = 0.35 + i*0.05;
    g.add(cylAt(0.012, 0.016, petioleLen, 6, mat('#2a5020',0.8),
                ox*0.5, soilY + petioleLen*0.45, oz*0.5));
    // 中央葉脈
    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.004, rl*1.8),
      mat(shade(color, 0.55), 0.8));
    vein.position.set(ox, oy, oz); vein.rotation.set(rx, ry, 0); g.add(vein);
  });
  // 花 (オレンジ+青)
  const bract = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.18, 8),
    mat('#e87820', 0.5)); bract.position.set(0.15, soilY+1.35, 0.10); bract.rotation.z = -0.6; g.add(bract);
  const petal = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.015),
    mat('#2060c0', 0.5)); petal.position.set(0.17, soilY+1.42, 0.10); petal.rotation.z = -0.8; g.add(petal);
  return g;
}

// ベンジャミン (フィカス・ベンジャミナ) — 小さな丸葉の茂った樹
function buildBenjamin({ color='#3d7040' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.18, 0.11, 0.28, '#c8b080');
  const trunkMat = mat('#4a3520', 0.7);
  // スリムな幹
  g.add(cylAt(0.032, 0.042, 0.70, 10, trunkMat, 0, soilY+0.35, 0));
  // 枝分かれ
  const bdata = [
    { ox:0.08, oy:soilY+0.72, oz:0.04, rx:-0.5, rz:0.6, len:0.30, r:0.018 },
    { ox:-0.06, oy:soilY+0.75, oz:-0.04, rx:-0.4, rz:-0.5, len:0.28, r:0.016 },
    { ox:0.02, oy:soilY+0.80, oz:0.08, rx:-0.6, rz:0.2, len:0.26, r:0.015 },
    { ox:-0.04, oy:soilY+0.78, oz:-0.08, rx:-0.45, rz:-0.25, len:0.27, r:0.015 },
  ];
  bdata.forEach(b => {
    const br = cylAt(b.r, b.r+0.004, b.len, 7, trunkMat, b.ox, b.oy, b.oz);
    br.rotation.set(b.rx, 0, b.rz); g.add(br);
  });
  // 密な小葉の雲 (多数の小さな球)
  const lm = mat(color, 0.72);
  const cloudCenters = [
    [0.22, soilY+1.02, 0.12], [-0.20, soilY+1.05, -0.10], [0.06, soilY+1.20, 0.22],
    [-0.12, soilY+1.00, 0.20], [0.28, soilY+0.95, -0.08], [-0.24, soilY+1.10, 0.05],
    [0, soilY+1.28, 0], [0.18, soilY+1.15, -0.20], [-0.16, soilY+0.88, -0.18],
  ];
  cloudCenters.forEach(([cx,cy,cz], i) => {
    for (let k = 0; k < 8; k++) {
      const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05 + Math.random()*0.03, 0),
        mat(shade(color, 0.82 + Math.random()*0.24), 0.72));
      lf.position.set(cx + (Math.random()-0.5)*0.14, cy + (Math.random()-0.5)*0.12, cz + (Math.random()-0.5)*0.14);
      lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
    }
  });
  return g;
}

// オリーブ — 細かい葉の野性的な樹形
function buildOlive({ color='#7a9a5a' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.18, 0.11, 0.28, '#a89870');
  const trunkMat = mat('#4a3a28', 0.75);
  // ねじれた幹
  g.add(cylAt(0.035, 0.048, 0.72, 8, trunkMat, 0.02, soilY+0.36, 0));
  g.add(cylAt(0.025, 0.030, 0.22, 6, trunkMat, 0.06, soilY+0.82, 0.06));
  // 枝
  const branchDef = [
    [0.10, soilY+0.78, 0.05, -0.45, 0.55, 0.28], [-0.08, soilY+0.82, -0.04, -0.38, -0.48, 0.25],
    [0.03, soilY+0.90, 0.10, -0.52, 0.20, 0.22], [-0.05, soilY+0.88, -0.10, -0.42, -0.22, 0.24],
    [0.12, soilY+0.70, -0.06, -0.3, 0.65, 0.26],
  ];
  branchDef.forEach(([ox,oy,oz,rx,rz,len]) => {
    const br = cylAt(0.012, 0.015, len, 6, trunkMat, ox, oy, oz); br.rotation.set(rx,0,rz); g.add(br);
  });
  // 小葉クラスター (細長い葉 = 細いボックス)
  const lm = mat(color, 0.65);
  const silverLm = mat(shade(color, 1.25), 0.6);
  for (let i = 0; i < 65; i++) {
    const ang = Math.random()*Math.PI*2, dist = 0.10 + Math.random()*0.24;
    const x = Math.cos(ang)*dist * (1 + Math.random()*0.3);
    const y = soilY + 0.78 + (Math.random()-0.3)*0.45;
    const z = Math.sin(ang)*dist * (1 + Math.random()*0.3);
    const lf = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.07 + Math.random()*0.04, 0.004),
      i%3===0 ? silverLm.clone() : lm.clone());
    lf.position.set(x, y, z);
    lf.rotation.set((Math.random()-0.5)*0.8, ang, (Math.random()-0.5)*1.2);
    lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
  }
  return g;
}

// 大型フロアグリーン (ザミオクルカス / ZZ Plant風 — 光沢のある広葉)
function buildZZPlant({ color='#2a5a28' } = {}) {
  const g = new THREE.Group();
  const soilY = _pot(g, 0.20, 0.13, 0.30, '#c0a87a');
  const stemMat = mat('#3a5a30', 0.7);
  const lm = mat(color, 0.55, 0.08, { env: 0.4 }); // 光沢
  // 複数の茎から楕円葉が交互に出る
  const stems = [
    { cx:-0.06, cz:-0.04, ang: -0.5, h:0.90 },
    { cx: 0.08, cz: 0.06, ang:  0.6, h:1.00 },
    { cx:-0.02, cz: 0.10, ang:  2.0, h:0.82 },
    { cx: 0.04, cz:-0.10, ang: -1.8, h:0.95 },
    { cx: 0.12, cz:-0.04, ang:  0.3, h:0.75 },
  ];
  stems.forEach(({ cx, cz, ang, h }) => {
    g.add(cylAt(0.018, 0.018, h*0.5, 8, stemMat, cx, soilY+h*0.25, cz));
    const numLeaflets = 5 + Math.floor(h*4);
    for (let li = 0; li < numLeaflets; li++) {
      const t = (li+1)/(numLeaflets+1);
      const ly = soilY + h*t*0.9;
      const side = li%2===0 ? 1 : -1;
      const lf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.055, 1), lm.clone());
      lf.scale.set(0.6, 0.28, 1.0);
      lf.position.set(cx + Math.cos(ang)*0.10*side, ly, cz + Math.sin(ang)*0.10*side);
      lf.rotation.y = ang + side*0.3;
      lf.castShadow = true; lf.userData.colorable = true; g.add(lf);
    }
  });
  return g;
}


export { buildBamboo, buildBenjamin, buildCactus, buildDracaena, buildFicusUmbellata, buildMonstera, buildOlive, buildPlant, buildPothos, buildRhapis, buildSansevieria, buildStrelitzia, buildSucculent, buildZZPlant };
