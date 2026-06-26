import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost, bedding } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

function buildSofa3({ color='#c8a06a', w=2.2, d=0.95, h=0.85, seats=3, low=false } = {}) {
  const g = new THREE.Group();
  if (low) h = h - 0.1;
  const fabric = fabricMat(color), wood = mat('#5c3d1e', 0.7), accent = fabricMat(shade(color, 0.82));
  const base = new THREE.Mesh(roundedBoxGeom(w, 0.26, d, 0.08, 4), fabric); base.position.set(0, 0.16, 0); base.castShadow = base.receiveShadow = true; base.userData.colorable = true; g.add(base);
  const cushW = (w - 0.12) / seats;
  for (let i = 0; i < seats; i++) {
    const cx = -w/2 + cushW/2 + 0.06 + i*cushW;
    const c = new THREE.Mesh(roundedBoxGeom(cushW - 0.04, 0.22, d - 0.18, 0.07, 4), fabric); c.position.set(cx, 0.36, 0.05); c.castShadow = true; c.userData.colorable = true; g.add(c);
  }
  for (let i = 0; i < seats; i++) {
    const cx = -w/2 + cushW/2 + 0.06 + i*cushW;
    const bc = new THREE.Mesh(roundedBoxGeom(cushW - 0.04, h - 0.34, 0.2, 0.07, 4), fabric); bc.position.set(cx, 0.28 + (h-0.34)/2, -d/2 + 0.16); bc.castShadow = true; bc.userData.colorable = true; g.add(bc);
  }
  const back = box(w, h - 0.26, 0.16, accent, 0, 0.26 + (h-0.26)/2, -d/2 + 0.08); back.userData.colorable = true; g.add(back);
  [-w/2 + 0.12, w/2 - 0.12].forEach(x => {
    const a = new THREE.Mesh(roundedBoxGeom(0.22, h - 0.12, d, 0.1, 4), fabric); a.position.set(x, (h-0.12)/2 + 0.08, 0); a.castShadow = true; a.userData.colorable = true; g.add(a);
  });
  [[-w/2 + 0.42, 0.5, '#d96a5b'], [w/2 - 0.42, 0.52, '#5b86b8']].forEach(([px, py, pc]) => {
    const pil = new THREE.Mesh(roundedBoxGeom(0.34, 0.34, 0.12, 0.06, 4), fabricMat(pc)); pil.position.set(px, py, -d/2 + 0.3); pil.rotation.z = px < 0 ? 0.12 : -0.12; pil.castShadow = true; g.add(pil);
  });
  const legH = low ? 0.07 : 0.1;
  [[-w/2+0.13,d/2-0.13],[-w/2+0.13,-(d/2-0.13)],[w/2-0.13,d/2-0.13],[w/2-0.13,-(d/2-0.13)]].forEach(([lx,lz]) => { const leg = cyl(0.04, 0.05, legH, 8, wood); leg.position.set(lx, legH/2, lz); g.add(leg); });
  return g;
}
function buildArmchair({ color='#c8a06a', w=0.9, d=0.85, h=0.9 } = {}) {
  const g = new THREE.Group(); const fabric = fabricMat(color), wood = mat('#5c3d1e', 0.7);
  const base = new THREE.Mesh(roundedBoxGeom(w, 0.24, d, 0.08, 4), fabric); base.position.set(0, 0.15, 0); base.castShadow = base.receiveShadow = true; base.userData.colorable = true; g.add(base);
  const seat = new THREE.Mesh(roundedBoxGeom(w - 0.16, 0.2, d - 0.18, 0.07, 4), fabric); seat.position.set(0, 0.34, 0.05); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  const backC = new THREE.Mesh(roundedBoxGeom(w - 0.16, h - 0.34, 0.18, 0.07, 4), fabric); backC.position.set(0, 0.28 + (h-0.34)/2, -d/2 + 0.16); backC.castShadow = true; backC.userData.colorable = true; g.add(backC);
  const back = box(w, h - 0.26, 0.14, fabric, 0, 0.26 + (h-0.26)/2, -d/2 + 0.08); back.userData.colorable = true; g.add(back);
  [-w/2+0.11, w/2-0.11].forEach(x => { const a = new THREE.Mesh(roundedBoxGeom(0.2, h-0.16, d, 0.09, 4), fabric); a.position.set(x, (h-0.16)/2+0.08, 0); a.castShadow = true; a.userData.colorable = true; g.add(a); });
  [[-w/2+0.11,d/2-0.11],[-w/2+0.11,-(d/2-0.11)],[w/2-0.11,d/2-0.11],[w/2-0.11,-(d/2-0.11)]].forEach(([lx,lz]) => { const leg = cyl(0.035, 0.045, 0.1, 8, wood); leg.position.set(lx, 0.05, lz); g.add(leg); });
  return g;
}
function buildDiningChair({ color='#5b5048', w=0.48, d=0.48, h=0.9 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.7), pad = fabricMat('#efe7d8');
  const seat = box(w, 0.06, d, wood, 0, 0.45, 0); seat.userData.colorable = true; g.add(seat);
  const cushion = box(w-0.05, 0.06, d-0.05, pad, 0, 0.5, 0); g.add(cushion);
  g.add(box(w, 0.06, 0.05, wood, 0, h - 0.06, -d/2 + 0.04));
  for (let i = 0; i < 3; i++) { const x = -w/2 + 0.07 + (w-0.14)/2*i; g.add(box(0.04, h-0.5, 0.04, wood, x, 0.5+(h-0.5)/2, -d/2+0.04)); }
  [[-w/2+0.05,d/2-0.05],[-w/2+0.05,-(d/2-0.05)],[w/2-0.05,d/2-0.05],[w/2-0.05,-(d/2-0.05)]].forEach(([lx,lz]) => g.add(box(0.045,0.45,0.045,wood,lx,0.225,lz)));
  return g;
}
function buildOfficeChair({ color='#5b5048' } = {}) {
  const g = new THREE.Group(); const fabric = fabricMat(color), chrome = mat('#aab0b5', 0.25, 0.85, { env: 1.0 });
  const seat = box(0.55, 0.09, 0.55, fabric, 0, 0.5, 0); seat.userData.colorable = true; g.add(seat);
  const back = box(0.5, 0.52, 0.09, fabric, 0, 0.83, -0.24); back.userData.colorable = true; g.add(back);
  [-0.29, 0.29].forEach(x => g.add(box(0.05, 0.2, 0.2, chrome, x, 0.66, 0.06)));
  g.add(cylAt(0.045, 0.045, 0.46, 12, chrome, 0, 0.26, 0));
  for (let i = 0; i < 5; i++) {
    const a = (i/5)*Math.PI*2;
    const spoke = box(0.3, 0.05, 0.05, chrome, Math.cos(a)*0.15, 0.05, Math.sin(a)*0.15); spoke.rotation.y = a; g.add(spoke);
    const wheel = cyl(0.045, 0.045, 0.06, 10, chrome); wheel.rotation.z = Math.PI/2; wheel.position.set(Math.cos(a)*0.29, 0.045, Math.sin(a)*0.29); g.add(wheel);
  }
  return g;
}
function buildDiningTable({ color='#8a5a2b', w=1.8, d=0.9, h=0.75 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6, 0.02, { env: 0.4 });
  const top = box(w, 0.06, d, wood, 0, h-0.03, 0); top.userData.colorable = true; g.add(top);
  [[-w/2+0.08,d/2-0.08],[-w/2+0.08,-(d/2-0.08)],[w/2-0.08,d/2-0.08],[w/2-0.08,-(d/2-0.08)]].forEach(([lx,lz]) => g.add(box(0.08,h-0.06,0.08,wood,lx,(h-0.06)/2,lz)));
  g.add(box(w-0.3, 0.05, 0.06, wood, 0, h-0.16, d/2-0.1));
  g.add(box(w-0.3, 0.05, 0.06, wood, 0, h-0.16, -(d/2-0.1)));
  return g;
}
function buildCoffeeTable({ color='#c8a06a', w=1.2, d=0.6, h=0.42 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6, 0.02, { env: 0.4 });
  const top = box(w, 0.05, d, wood, 0, h-0.025, 0); top.userData.colorable = true; g.add(top);
  [[-w/2+0.06,d/2-0.06],[-w/2+0.06,-(d/2-0.06)],[w/2-0.06,d/2-0.06],[w/2-0.06,-(d/2-0.06)]].forEach(([lx,lz]) => g.add(box(0.06,h-0.05,0.06,wood,lx,(h-0.05)/2,lz)));
  g.add(box(w-0.16, 0.04, d-0.16, wood, 0, 0.13, 0));
  return g;
}
function buildDesk({ color='#f3ece0', w=1.4, d=0.7, h=0.75 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6), metal = mat('#9aa0a4', 0.3, 0.7, { env: 0.9 });
  const top = box(w, 0.05, d, wood, 0, h-0.025, 0); top.userData.colorable = true; g.add(top);
  g.add(box(0.05, h-0.05, d-0.06, wood, -w/2+0.05, (h-0.05)/2, 0));
  g.add(box(0.05, h-0.05, d-0.06, wood,  w/2-0.05, (h-0.05)/2, 0));
  g.add(box(w-0.1, 0.05, 0.05, wood, 0, 0.2, -d/2+0.06));
  const du = box(0.36, 0.52, d-0.06, wood, w/2-0.24, 0.28, 0); du.userData.colorable = true; g.add(du);
  for (let i = 0; i < 3; i++) { g.add(box(0.3,0.13,0.02,mat('#e7ddcb',0.6),w/2-0.24,0.14+i*0.16,d/2-0.04)); const hd=cyl(0.008,0.008,0.1,8,metal); hd.rotation.z=Math.PI/2; hd.position.set(w/2-0.24,0.14+i*0.16,d/2-0.02); g.add(hd); }
  return g;
}
function buildSideTable({ color='#f3ece0', w=0.5, d=0.5, h=0.55 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6, 0.02, { env: 0.4 });
  const top = box(w, 0.05, d, wood, 0, h-0.025, 0); top.userData.colorable = true; g.add(top);
  const col = cyl(0.07, 0.1, h-0.05, 16, wood); col.position.y = (h-0.05)/2; col.userData.colorable = true; g.add(col);
  return g;
}
function buildCafeChair({ color='#6a4830', w=0.46, d=0.48, h=0.87 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.65, 0.02);
  const metal = mat('#383838', 0.45, 0.65);
  const seat = new THREE.Mesh(roundedBoxGeom(w-0.02, 0.05, d-0.04, 0.03, 2), wood);
  seat.position.set(0, 0.46, 0.01); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  const legH = 0.44, ins = 0.03;
  [[-w/2+ins, d/2-ins],[w/2-ins, d/2-ins],[-w/2+ins, -(d/2-ins)],[w/2-ins, -(d/2-ins)]].forEach(([lx,lz]) => g.add(cylAt(0.016, 0.016, legH, 8, metal, lx, legH/2, lz)));
  const bpH = h - 0.46;
  [-w/2+ins, w/2-ins].forEach(x => g.add(cylAt(0.016, 0.016, bpH, 8, metal, x, 0.46+bpH/2, -(d/2-ins))));
  g.add(box(w-0.04, 0.05, 0.04, wood, 0, h-0.03, -(d/2-ins)));
  g.add(box(w-0.08, 0.03, 0.03, metal, 0, 0.68, -(d/2-ins)));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildWindsorChair({ color='#5a3820', w=0.48, d=0.48, h=0.95 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.68, 0.02);
  const seat = new THREE.Mesh(roundedBoxGeom(w, 0.07, d, 0.05, 2), wood);
  seat.position.set(0, 0.45, 0.02); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  const legH = 0.44;
  [[-w/2+0.05, d/2-0.05],[w/2-0.05, d/2-0.05],[-w/2+0.04, -(d/2-0.04)],[w/2-0.04, -(d/2-0.04)]].forEach(([lx,lz]) => g.add(cylAt(0.022, 0.022, legH, 8, wood, lx, legH/2, lz)));
  g.add(box(w-0.1, 0.03, 0.03, wood, 0, 0.24, 0));
  g.add(box(0.03, 0.03, d-0.12, wood, 0, 0.24, 0));
  const sH = h - 0.53, bZ = -(d/2 - 0.06);
  for (let i = 0; i < 5; i++) { const x = -w/2 + 0.06 + (w-0.12)*i/4; g.add(cylAt(0.018, 0.018, sH, 8, wood, x, 0.5+sH/2, bZ)); }
  g.add(box(w-0.02, 0.07, 0.06, wood, 0, h-0.04, bZ));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildStackingChair({ color='#222222', w=0.46, d=0.5, h=0.82 } = {}) {
  const g = new THREE.Group();
  const metal = mat(color, 0.55, 0.65);
  const plastic = mat(shade(color, 1.5), 0.85, 0.0);
  const seat = new THREE.Mesh(roundedBoxGeom(w-0.02, 0.03, d-0.08, 0.02, 2), plastic);
  seat.position.set(0, 0.45, 0.02); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  const back = new THREE.Mesh(roundedBoxGeom(w-0.04, 0.26, 0.03, 0.02, 2), plastic);
  back.position.set(0, 0.67, -(d/2-0.06)); back.castShadow = true; back.userData.colorable = true; g.add(back);
  const legH = 0.44, ins = 0.04;
  [[-w/2+ins, d/2-ins],[w/2-ins, d/2-ins],[-w/2+ins, -(d/2-ins)],[w/2-ins, -(d/2-ins)]].forEach(([lx,lz]) => g.add(cylAt(0.014, 0.014, legH, 8, metal, lx, legH/2, lz)));
  const bpH = h - 0.45;
  [-w/2+ins, w/2-ins].forEach(x => g.add(cylAt(0.014, 0.014, bpH, 8, metal, x, 0.45+bpH/2, -(d/2-ins))));
  g.add(box(w-0.08, 0.028, 0.028, metal, 0, h-0.02, -(d/2-ins)));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildUpholsteredChair({ color='#3a3a3a', w=0.52, d=0.54, h=0.92 } = {}) {
  const g = new THREE.Group();
  const wood = mat('#6a4a2a', 0.65, 0.02);
  const fabric = fabricMat(color);
  const seat = new THREE.Mesh(roundedBoxGeom(w-0.04, 0.1, d-0.06, 0.04, 2), fabric);
  seat.position.set(0, 0.47, 0.01); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  const back = new THREE.Mesh(roundedBoxGeom(w-0.08, 0.42, 0.1, 0.05, 2), fabric);
  back.position.set(0, 0.72, -(d/2-0.1)); back.castShadow = true; back.userData.colorable = true; g.add(back);
  g.add(box(w, 0.06, 0.06, wood, 0, h-0.04, -(d/2-0.08)));
  g.add(box(0.06, h-0.5, 0.06, wood, -w/2+0.04, 0.5+(h-0.5)/2, -(d/2-0.08)));
  g.add(box(0.06, h-0.5, 0.06, wood,  w/2-0.04, 0.5+(h-0.5)/2, -(d/2-0.08)));
  const legH = 0.44;
  [[-w/2+0.05, d/2-0.05],[w/2-0.05, d/2-0.05],[-w/2+0.05, -(d/2-0.06)],[w/2-0.05, -(d/2-0.06)]].forEach(([lx,lz]) => g.add(cylAt(0.025, 0.025, legH, 8, wood, lx, legH/2, lz)));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildCafeTable({ color='#8a6a3a', w=0.65, d=0.65, h=0.74 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.55, 0.02, { env: 0.4 });
  const metal = mat('#4a4a50', 0.4, 0.7);
  const top = new THREE.Mesh(roundedBoxGeom(w, 0.05, d, 0.03, 2), wood);
  top.position.set(0, h-0.025, 0); top.castShadow = true; top.userData.colorable = true; g.add(top);
  const legH = h - 0.06, ins = 0.05;
  [[-w/2+ins, d/2-ins],[w/2-ins, d/2-ins],[-w/2+ins, -(d/2-ins)],[w/2-ins, -(d/2-ins)]].forEach(([lx,lz]) => g.add(cylAt(0.022, 0.022, legH, 8, metal, lx, legH/2, lz)));
  g.add(box(w-0.14, 0.03, 0.03, metal, 0, 0.36,  d/2-ins));
  g.add(box(w-0.14, 0.03, 0.03, metal, 0, 0.36, -(d/2-ins)));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildRoundTableSm({ color='#8a6a3a', w=0.7, d=0.7, h=0.74 } = {}) {
  const g = new THREE.Group();
  const r = Math.min(w, d) / 2;
  const wood = mat(color, 0.55, 0.02, { env: 0.4 });
  const metal = mat('#4a4a50', 0.4, 0.7);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.05, 32), wood);
  top.position.set(0, h-0.025, 0); top.castShadow = true; top.userData.colorable = true; g.add(top);
  g.add(cylAt(0.04, 0.04, h-0.1, 12, metal, 0, (h-0.1)/2, 0));
  const base = new THREE.Mesh(new THREE.CylinderGeometry(r*0.55, r*0.6, 0.04, 20), metal);
  base.position.set(0, 0.02, 0); base.castShadow = true; g.add(base);
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildBed({ color='#5b86b8', w=1.0, d=2.1, h=0.55, double=false } = {}) {
  // 頭側(ヘッドボード)を -Z、足側を +Z に置く。color = 掛け布団(colorable)。
  const g = new THREE.Group();
  const wood = mat('#6e4f34', 0.55, 0.05, { env: 0.35 });
  const linen = fabricMat('#cbbda6');              // ヘッドボード張地(無彩のリネン)
  const sheetM = fabricMat('#fdfaf6'), pillowM = fabricMat('#fcf8f0');
  const duvetM = fabricMat(color), accentM = fabricMat(shade(color, 1.12)), throwM = fabricMat(shade(color, 0.66));
  // ---- 脚 (テーパー) ----
  [[-w/2+0.09,-d/2+0.1],[w/2-0.09,-d/2+0.1],[-w/2+0.09,d/2-0.1],[w/2-0.09,d/2-0.1]].forEach(([lx,lz]) => {
    const leg = cyl(0.034, 0.022, 0.2, 10, wood); leg.position.set(lx, 0.1, lz); g.add(leg);
  });
  // ---- ベースフレーム (台座 + サイドレール + 足側レール) ----
  g.add(box(w-0.03, 0.14, d-0.03, wood, 0, 0.27, 0));
  g.add(box(0.05, 0.17, d, wood, -w/2+0.025, 0.275, 0));
  g.add(box(0.05, 0.17, d, wood,  w/2-0.025, 0.275, 0));
  g.add(box(w, 0.17, 0.05, wood, 0, 0.275, d/2-0.025));
  // ---- マットレス (プラッシュ) + サイドパイピング ----
  const matt = new THREE.Mesh(roundedBoxGeom(w-0.05, 0.22, d-0.12, 0.07, 5), sheetM);
  matt.position.set(0, 0.46, 0); matt.castShadow = matt.receiveShadow = true; g.add(matt);
  g.add(new THREE.Mesh(roundedBoxGeom(w-0.03, 0.05, d-0.1, 0.02, 3), fabricMat('#eee7da')).translateY(0.455));
  // ---- 枕 (ふっくら) + 前のクッション ----
  const np = double ? 2 : 1, pw = double ? w/2-0.07 : Math.min(w-0.16, 0.56);
  for (let i = 0; i < np; i++) {
    const px = double ? (i ? pw/2+0.06 : -pw/2-0.06) : 0;
    const p = new THREE.Mesh(roundedBoxGeom(pw, 0.17, 0.44, 0.11, 5), pillowM); p.position.set(px, 0.63, -d/2+0.36); p.rotation.x = 0.16; p.castShadow = true; g.add(p);
    const ac = new THREE.Mesh(roundedBoxGeom(pw*0.78, 0.13, 0.3, 0.09, 4), accentM); ac.position.set(px, 0.61, -d/2+0.66); ac.rotation.x = 0.1; ac.userData.colorable = true; g.add(ac);
  }
  // ---- 掛け布団 (足側~62% + サイドの垂れ + 折り返し) ----
  const dl = d*0.6;
  const duv = new THREE.Mesh(roundedBoxGeom(w-0.01, 0.17, dl, 0.06, 4), duvetM); duv.position.set(0, 0.57, d/2 - dl/2 - 0.03); duv.castShadow = true; duv.userData.colorable = true; g.add(duv);
  [-1,1].forEach(sgn => { const dr = new THREE.Mesh(roundedBoxGeom(0.05, 0.2, dl-0.08, 0.02, 3), duvetM); dr.position.set(sgn*(w/2-0.02), 0.45, d/2 - dl/2 - 0.03); dr.userData.colorable = true; g.add(dr); });
  const fold = new THREE.Mesh(roundedBoxGeom(w-0.01, 0.1, 0.24, 0.05, 4), accentM); fold.position.set(0, 0.64, d/2 - dl); fold.rotation.x = -0.32; fold.userData.colorable = true; g.add(fold);
  // ---- 足元の畳んだスロー ----
  const thr = new THREE.Mesh(roundedBoxGeom(w-0.03, 0.11, 0.42, 0.05, 4), throwM); thr.position.set(0, 0.61, d/2 - 0.3); thr.castShadow = true; g.add(thr);
  // ---- 張りぐるみ(ボタン締め)ヘッドボード + 柱 ----
  const hbH = h + 0.46, hbY = 0.2 + hbH/2;
  const hb = new THREE.Mesh(roundedBoxGeom(w-0.04, hbH, 0.1, 0.07, 5), linen); hb.position.set(0, hbY, -d/2+0.05); hb.castShadow = true; g.add(hb);
  const cols = double ? 4 : 2, sp = (w-0.22)/cols;
  for (let r = 0; r < 2; r++) for (let c = 0; c < cols; c++) {
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), fabricMat(shade('#cbbda6', 0.8)));
    t.position.set((c-(cols-1)/2)*sp, hbY + (r ? 0.1 : -0.14), -d/2+0.105); g.add(t);
  }
  [-1,1].forEach(sgn => g.add(box(0.07, hbH+0.05, 0.13, wood, sgn*(w/2-0.035), hbY-0.02, -d/2+0.05)));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildWardrobe({ color='#f3ece0', w=1.8, d=0.6, h=2.1 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.65), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const body = box(w, h, d, wood, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  const dw = w/2 - 0.015;
  // left door: pivot at left hinge edge
  const pivL = new THREE.Group(); pivL.position.set(-dw-0.01, h/2, d/2+0.005);
  const dL = box(dw, h-0.1, 0.03, mat('#fbf7ef', 0.6), dw/2, 0, 0); dL.userData.colorable = true; pivL.add(dL);
  const hdlL = cyl(0.01,0.01,0.16,10,metal); hdlL.rotation.x = Math.PI/2; hdlL.position.set(dw-0.07, 0, 0.025); pivL.add(hdlL);
  g.add(pivL);
  // right door: pivot at right hinge edge
  const pivR = new THREE.Group(); pivR.position.set(dw+0.01, h/2, d/2+0.005);
  const dR = box(dw, h-0.1, 0.03, mat('#fbf7ef', 0.6), -dw/2, 0, 0); dR.userData.colorable = true; pivR.add(dR);
  const hdlR = cyl(0.01,0.01,0.16,10,metal); hdlR.rotation.x = Math.PI/2; hdlR.position.set(-dw+0.07, 0, 0.025); pivR.add(hdlR);
  g.add(pivR);
  g.add(box(w+0.04, 0.05, d+0.04, wood, 0, h-0.025, 0));
  g.userData.parts = { doorL: pivL, doorR: pivR };
  return g;
}
function buildBookshelf({ color='#c8a06a', w=1.0, d=0.3, h=1.8 } = {}) {
  const g = new THREE.Group();
  const T = 0.026;                                   // 板厚
  const plinth = 0.07;                               // 巾木(台輪)の高さ
  const grain = { roughMap: true };                  // 木目(粗さマップ)
  const wood   = mat(color, 0.6, 0, grain);
  const woodTop= mat(shade(color, 1.06), 0.55, 0, grain);
  const shelfM = mat(shade(color, 0.93), 0.62, 0, grain);
  const backM  = mat(shade(color, 0.6), 0.8);        // 背板(暗め, 非colorable)
  const plinM  = mat(shade(color, 0.8), 0.6, 0, grain);

  const sideX = w/2 - T/2;
  // ---- 筐体 ----
  [-1, 1].forEach(sgn => { const sp = box(T, h - plinth, d, wood, sgn * sideX, plinth + (h - plinth) / 2, 0); sp.userData.colorable = true; g.add(sp); }); // 側板
  const top = box(w + 0.03, T * 1.1, d + 0.02, woodTop, 0, h - T * 0.55, 0.006); top.userData.colorable = true; g.add(top);   // 天板(オーバーハング)
  const bot = box(w - 2 * T, T, d, shelfM, 0, plinth + T / 2, 0); bot.userData.colorable = true; g.add(bot);                   // 底板
  g.add(box(w - 2 * T, h - plinth - T, T * 0.5, backM, 0, plinth + (h - plinth) / 2, -d / 2 + T * 0.5 + 0.003));               // 背板(凹)
  const pl = box(w - 0.03, plinth, d - 0.03, plinM, 0, plinth / 2, 0); pl.userData.colorable = true; g.add(pl);                // 巾木
  g.add(box(w - 0.015, 0.012, d - 0.015, mat(shade(color, 0.68), 0.6), 0, plinth + 0.004, 0.004));                            // 見切り

  // ---- 本/飾りの決定論的配置 ----
  let seed = 0x4f3a2b;
  const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const SPINES = ['#7d3b39', '#324a63', '#46624a', '#9a7b32', '#6e547f', '#4f7aa6', '#a85a6e', '#37444c', '#a8623a', '#cdbfa6', '#6a655c', '#864540', '#b9a06a'];
  const pages = mat('#efe6d2', 0.85);
  const bookZ = 0.004, bd = d * 0.6;
  const pick = () => SPINES[Math.floor(rnd() * SPINES.length)];

  function uprightBook(xL, sy, bw, bh) {
    const col = pick();
    g.add(plainBox(bw, bh, bd, mat(col, 0.8), xL + bw / 2, sy + bh / 2, bookZ));
    g.add(plainBox(bw * 0.92, 0.01, bd * 0.96, pages, xL + bw / 2, sy + bh - 0.006, bookZ));     // 天ページ
    if (rnd() < 0.7) g.add(plainBox(bw * 0.66, bh * 0.09, 0.003, mat(rnd() < 0.5 ? '#d8c794' : shade(col, 0.65), 0.5), xL + bw / 2, sy + bh * (0.55 + rnd() * 0.18), bd / 2 + bookZ)); // 背の帯
  }
  function leaningBook(xCorner, sy, bw, bh, ang) {
    const grp = new THREE.Group(), col = pick();
    grp.add(plainBox(bw, bh, bd, mat(col, 0.8), bw / 2, bh / 2, bookZ));
    grp.add(plainBox(bw * 0.9, 0.01, bd * 0.96, pages, bw / 2, bh - 0.006, bookZ));
    grp.rotation.z = ang; grp.position.set(xCorner, sy, 0); g.add(grp);
    return xCorner + Math.cos(ang) * bw + Math.sin(Math.abs(ang)) * bh * 0.45;
  }
  function horizontalStack(xL, sy, sw) {
    const n = 2 + Math.floor(rnd() * 3); let y = sy;
    for (let k = 0; k < n; k++) {
      const th = 0.026 + rnd() * 0.018, ww = sw * (0.9 + rnd() * 0.1);
      g.add(plainBox(ww, th, bd, mat(pick(), 0.8), xL + ww / 2, y + th / 2, bookZ));
      g.add(plainBox(ww * 0.97, th * 0.6, 0.004, pages, xL + ww / 2, y + th / 2, bd / 2 + bookZ)); // 前小口
      y += th + 0.0015;
    }
    return xL + sw;
  }

  const innerL = -w / 2 + T + 0.012, innerR = w / 2 - T - 0.012;
  const innerBot = plinth + T, innerTop = h - T * 1.1;
  const openings = 4, compH = (innerTop - innerBot) / openings;
  for (let i = 0; i < openings; i++) {
    const sy = innerBot + i * compH;
    if (i > 0) { const shf = box(w - 2 * T, T * 0.85, d - 0.015, shelfM, 0, sy - T * 0.42, 0.006); shf.userData.colorable = true; g.add(shf); }
    const maxH = compH * 0.84;
    let x = innerL, guard = 0;
    while (x < innerR - 0.028 && guard++ < 80) {
      const r = rnd();
      if (r < 0.08) { x += 0.015 + rnd() * 0.025; continue; }                                         // 隙間
      if (r < 0.26 && innerR - x > 0.14) { x = horizontalStack(x, sy, 0.10 + rnd() * 0.05) + 0.018; continue; } // 横積み
      if (r < 0.40 && innerR - x > 0.16) {                                                            // 立て+斜め
        const bw0 = 0.034 + rnd() * 0.02; uprightBook(x, sy, bw0, maxH * (0.8 + rnd() * 0.18)); x += bw0 + 0.002;
        x = leaningBook(x, sy, 0.032 + rnd() * 0.016, maxH * (0.74 + rnd() * 0.16), -0.16 - rnd() * 0.08) + 0.006; continue;
      }
      const bw = 0.03 + rnd() * 0.032;                                                                 // 直立
      if (x + bw > innerR) break;
      uprightBook(x, sy, bw, maxH * (0.66 + rnd() * 0.32));
      x += bw + 0.004 + rnd() * 0.006;
    }
  }

  // ---- 天板上の飾り(横積み + 立て/斜め本 + 観葉植物) ----
  const ty = h;
  horizontalStack(-w / 2 + 0.1, ty, 0.16);
  let dx = -w / 2 + 0.3;
  uprightBook(dx, ty, 0.04, 0.2); dx += 0.044;
  leaningBook(dx, ty, 0.038, 0.18, -0.2);
  const potX = w / 2 - 0.15, potM = mat('#c0795c', 0.75), foM = mat('#5f8f5a', 0.82);
  const pot = cyl(0.055, 0.045, 0.09, 16, potM); pot.position.set(potX, ty + 0.045, 0); g.add(pot);
  [[0, 0.13, 0, 0.052], [-0.032, 0.11, 0.02, 0.042], [0.032, 0.11, -0.02, 0.042], [0, 0.165, 0, 0.038]].forEach(([fx, fy, fz, fr]) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(fr, 10, 10), foM); s.position.set(potX + fx, ty + fy, fz); s.castShadow = true; g.add(s);
  });

  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildChest({ color='#5b5048', w=1.0, d=0.5, h=1.0 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.7), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const body = box(w, h, d, wood, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  const drawers = 4;
  for (let i = 0; i < drawers; i++) {
    const dy = h/drawers;
    const dr = box(w-0.06, dy-0.05, 0.04, mat(shade(color,1.18), 0.7), 0, dy*i+dy/2, d/2-0.01); dr.userData.colorable = true; g.add(dr);
    const hdl = cyl(0.01,0.01,0.14,10,metal); hdl.rotation.z = Math.PI/2; hdl.position.set(0, dy*i+dy/2, d/2+0.02); g.add(hdl);
  }
  [[-w/2+0.07,d/2-0.06],[-w/2+0.07,-(d/2-0.06)],[w/2-0.07,d/2-0.06],[w/2-0.07,-(d/2-0.06)]].forEach(([lx,lz]) => g.add(box(0.06,0.08,0.06,mat('#3a332b',0.6),lx,0.04,lz)));
  return g;
}
function buildTVBoard({ color='#5b5048', w=1.8, d=0.45, h=0.5 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.7), metal = mat('#9aa0a4', 0.3, 0.7, { env: 0.9 });
  const body = box(w, h, d, wood, 0, h/2+0.06, 0); body.userData.colorable = true; g.add(body);
  [-w/4, w/4].forEach(dx => { const door = box(w/2-0.05, h-0.1, 0.03, mat(shade(color,1.15),0.7), dx, h/2+0.06, d/2-0.005); door.userData.colorable = true; g.add(door); const hdl = cyl(0.007,0.007,0.1,8,metal); hdl.rotation.x = Math.PI/2; hdl.position.set(dx, h/2+0.06, d/2+0.02); g.add(hdl); });
  [[-w/2+0.09,d/2-0.07],[-w/2+0.09,-(d/2-0.07)],[w/2-0.09,d/2-0.07],[w/2-0.09,-(d/2-0.07)]].forEach(([lx,lz]) => g.add(box(0.05,0.12,0.05,metal,lx,0.06,lz)));
  return g;
}
function buildFloorLamp({ color='#8a6fb0' } = {}) {
  const g = new THREE.Group(); const metal = mat('#3a332b', 0.3, 0.7, { env: 0.8 }), shadeM = mat(color, 0.7, 0.05);
  g.add(cylAt(0.16, 0.2, 0.05, 20, metal, 0, 0.025, 0));
  g.add(cylAt(0.025, 0.025, 1.5, 10, metal, 0, 0.77, 0));
  const sh = cyl(0.22, 0.13, 0.26, 20, shadeM); sh.position.y = 1.6; sh.userData.colorable = true; g.add(sh);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.25, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2cc, transparent: true, opacity: 0.7, side: THREE.BackSide })); inner.position.y = 1.6; g.add(inner);
  const bulb = new THREE.PointLight(0xffe9b8, 4, 4, 2); bulb.position.set(0, 1.55, 0); bulb.castShadow = false; g.add(bulb);
  return g;
}
function buildTV({ color='#1c1c1f', w=1.4, h=0.85 } = {}) {
  const g = new THREE.Group(); const frame = mat(color, 0.35, 0.45, { env: 0.7 }), screen = mat('#08090c', 0.08, 0.25), chrome = mat('#9aa0a4', 0.22, 0.85, { env: 1.0 });
  const cy = h/2 + 0.25;
  // ultra-thin bezel body
  const body = box(w, h, 0.04, frame, 0, cy, 0); body.userData.colorable = true; g.add(body);
  g.add(box(w-0.03, h-0.03, 0.015, screen, 0, cy, 0.025));
  // screen image glow (subtle gradient feel via two planes)
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w-0.05, h-0.05), new THREE.MeshBasicMaterial({ color: 0x2c4a6a, transparent: true, opacity: 0.6 })); glow.position.set(0, cy, 0.034); g.add(glow);
  const glow2 = new THREE.Mesh(new THREE.PlaneGeometry((w-0.05)*0.5, (h-0.05)*0.6), new THREE.MeshBasicMaterial({ color: 0x6a90c0, transparent: true, opacity: 0.35 })); glow2.position.set(-w*0.12, cy+0.04, 0.036); g.add(glow2);
  // brand strip
  g.add(box(0.12, 0.012, 0.005, chrome, 0, 0.27, 0.026));
  // pedestal stand
  g.add(box(0.5, 0.025, 0.26, chrome, 0, 0.012, 0));
  g.add(box(0.06, 0.25, 0.05, frame, 0, 0.14, 0));
  return g;
}
function buildRug({ color='#3f5d7a', w=2.0, d=1.5 } = {}) {
  const g = new THREE.Group();
  const tex = makeRugTexture(color);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.98, metalness: 0, envMapIntensity: 0.15 }));
  m.rotation.x = -Math.PI/2; m.position.y = 0.012; m.receiveShadow = true; m.userData.colorable = false; g.add(m);
  return g;
}

function buildSofaL({ color='#c8a06a', w=2.4, d=1.6, h=0.85 } = {}) {
  const g = new THREE.Group();
  const mainSofa = buildSofa3({ color, w, d: 0.95, h, seats: 3 });
  g.add(mainSofa);
  const chW = 0.95, chD = d - 0.95;
  const fabric = fabricMat(color), wood = mat('#5c3d1e', 0.7), accent = fabricMat(shade(color, 0.82));
  const chaise = new THREE.Group();
  const chBase = new THREE.Mesh(roundedBoxGeom(chW, 0.26, chD, 0.08, 4), fabric); chBase.position.set(0, 0.16, 0); chBase.castShadow = true; chBase.userData.colorable = true; chaise.add(chBase);
  const chSeat = new THREE.Mesh(roundedBoxGeom(chW - 0.04, 0.22, chD - 0.1, 0.07, 4), fabric); chSeat.position.set(0, 0.36, 0.05); chSeat.castShadow = true; chSeat.userData.colorable = true; chaise.add(chSeat);
  const chArm = new THREE.Mesh(roundedBoxGeom(0.22, h - 0.12, chD, 0.1, 4), fabric); chArm.position.set(-chW/2 + 0.12, (h-0.12)/2 + 0.08, 0); chArm.castShadow = true; chArm.userData.colorable = true; chaise.add(chArm);
  [[chW/2-0.1,chD/2-0.1],[chW/2-0.1,-(chD/2-0.1)],[-chW/2+0.1,chD/2-0.1],[-chW/2+0.1,-(chD/2-0.1)]].forEach(([lx,lz]) => { const leg = cyl(0.04, 0.05, 0.1, 8, wood); leg.position.set(lx, 0.05, lz); chaise.add(leg); });
  chaise.position.set(w/2 - chW/2, 0, -(0.95/2 + chD/2));
  g.add(chaise);
  return g;
}
function buildStool({ color='#5b5048', w=0.4, d=0.4, h=0.46 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6), pad = fabricMat(shade(color, 1.4));
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(w/2, w/2 - 0.02, 0.06, 16), pad); seat.position.set(0, h, 0); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  const seatRim = cyl(w/2 + 0.01, w/2 + 0.01, 0.03, 16, wood); seatRim.position.set(0, h - 0.02, 0); g.add(seatRim);
  const legR = 0.022, splay = 0.06;
  [0,1,2,3].forEach(i => {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(legR, legR * 0.8, h - 0.06, 8), wood);
    leg.position.set(Math.cos(ang) * (w/2 - 0.04 + splay), (h - 0.06)/2, Math.sin(ang) * (w/2 - 0.04 + splay));
    leg.rotation.x = Math.sin(ang) * 0.12; leg.rotation.z = -Math.cos(ang) * 0.12;
    leg.castShadow = true; g.add(leg);
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(w/2 - 0.06, 0.015, 8, 24), wood); ring.rotation.x = Math.PI / 2; ring.position.set(0, h * 0.38, 0); g.add(ring);
  return g;
}
function buildBench({ color='#8a5a2b', w=1.4, d=0.4, h=0.45 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6, 0.02, { env: 0.3 });
  const numSlats = 4;
  const slatW = (w - 0.05) / numSlats, slatGap = 0.05 / numSlats;
  for (let i = 0; i < numSlats; i++) {
    const sx = -w/2 + slatW/2 + 0.025 + i * (slatW + slatGap);
    const sl = new THREE.Mesh(roundedBoxGeom(slatW - 0.01, 0.045, d - 0.05, 0.015, 4), wood); sl.position.set(sx, h, 0); sl.castShadow = true; sl.userData.colorable = true; g.add(sl);
  }
  [[-w/2 + 0.06, 0], [w/2 - 0.06, 0]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(roundedBoxGeom(0.06, h, d - 0.04, 0.02, 4), wood); leg.position.set(lx, h/2, lz); leg.castShadow = true; leg.userData.colorable = true; g.add(leg);
  });
  const apron = new THREE.Mesh(roundedBoxGeom(w, 0.06, 0.03, 0.01, 4), wood); apron.position.set(0, h * 0.55, d/2 - 0.025); apron.castShadow = true; g.add(apron);
  const apronB = new THREE.Mesh(roundedBoxGeom(w, 0.06, 0.03, 0.01, 4), wood); apronB.position.set(0, h * 0.55, -d/2 + 0.025); apronB.castShadow = true; g.add(apronB);
  return g;
}
function buildLoungeChair({ color='#6f9e74', w=0.8, d=0.85, h=0.78 } = {}) {
  const g = new THREE.Group(); const fabric = fabricMat(color), wood = mat('#5c3d1e', 0.65);
  const seat = new THREE.Mesh(roundedBoxGeom(w - 0.1, 0.18, d - 0.2, 0.06, 4), fabric); seat.position.set(0, 0.32, 0.04); seat.rotation.x = -0.1; seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  const back = new THREE.Mesh(roundedBoxGeom(w - 0.1, h - 0.36, 0.16, 0.06, 4), fabric); back.position.set(0, 0.44 + (h - 0.36)/2, -d/2 + 0.1); back.rotation.x = 0.18; back.castShadow = true; back.userData.colorable = true; g.add(back);
  [-w/2 + 0.05, w/2 - 0.05].forEach(x => {
    const shell = new THREE.Mesh(roundedBoxGeom(0.06, h - 0.06, d, 0.02, 4), wood); shell.position.set(x, (h - 0.06)/2 + 0.04, 0); shell.castShadow = true; g.add(shell);
    const arm = new THREE.Mesh(roundedBoxGeom(0.06, 0.04, d * 0.5, 0.01, 4), wood); arm.position.set(x, h * 0.56, d * 0.1); g.add(arm);
  });
  [[-w/2+0.1,d/2-0.1],[-w/2+0.1,-(d/2-0.1)],[w/2-0.1,d/2-0.1],[w/2-0.1,-(d/2-0.1)]].forEach(([lx,lz]) => { const leg = cyl(0.025, 0.03, 0.08, 8, wood); leg.position.set(lx, 0.04, lz); g.add(leg); });
  return g;
}
function buildConsoleTable({ color='#8a5a2b', w=1.1, d=0.32, h=0.8 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6, 0.02, { env: 0.4 });
  const top = new THREE.Mesh(roundedBoxGeom(w, 0.04, d, 0.015, 4), wood); top.position.set(0, h, 0); top.castShadow = true; top.userData.colorable = true; g.add(top);
  const shelf = new THREE.Mesh(roundedBoxGeom(w - 0.06, 0.025, d - 0.04, 0.01, 4), wood); shelf.position.set(0, h * 0.38, 0); shelf.castShadow = true; g.add(shelf);
  [[-w/2+0.04,d/2-0.04],[-w/2+0.04,-(d/2-0.04)],[w/2-0.04,d/2-0.04],[w/2-0.04,-(d/2-0.04)]].forEach(([lx,lz]) => {
    const leg = new THREE.Mesh(roundedBoxGeom(0.04, h, 0.04, 0.01, 4), wood); leg.position.set(lx, h/2, lz); leg.castShadow = true; g.add(leg);
  });
  return g;
}
function buildRoundCoffeeTable({ color='#c8a06a', w=0.8, d=0.8, h=0.42 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.55, 0.03, { env: 0.4 }), metal = mat('#5a5a5a', 0.25, 0.8, { env: 0.7 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(w/2, w/2, 0.04, 32), wood); top.position.set(0, h, 0); top.castShadow = true; top.userData.colorable = true; g.add(top);
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const r = w/2 - 0.08;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.009, h - 0.04, 8), metal);
    leg.position.set(Math.cos(ang) * r, (h - 0.04)/2, Math.sin(ang) * r);
    leg.castShadow = true; g.add(leg);
  }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.03, 16), metal); base.position.set(0, 0.015, 0); g.add(base);
  return g;
}
function buildBunkBed({ color='#f3ece0', w=1.05, d=2.05, h=1.65 } = {}) {
  // 頭側 = -Z。下段 color / 上段 ブルーの掛け布団。共通の bedding() で寝具を載せる。
  const g = new THREE.Group();
  const wood = mat('#6e4f34', 0.55, 0.05, { env: 0.35 });
  const postR = 0.045;
  // 4 本柱 + 玉飾り
  [[-w/2+postR, d/2-postR],[w/2-postR, d/2-postR],[-w/2+postR, -(d/2-postR)],[w/2-postR, -(d/2-postR)]].forEach(([px,pz]) => {
    g.add(cylAt(postR, postR, h, 12, wood, px, h/2, pz));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(postR*1.5, 12, 12), wood); ball.position.set(px, h+postR*0.8, pz); g.add(ball);
  });
  const lowerY = 0.32, upperY = h * 0.56;
  [[lowerY, color], [upperY, '#5b86b8']].forEach(([baseY, dvCol]) => {
    g.add(box(w-0.06, 0.06, d-0.06, wood, 0, baseY, 0));                    // すのこ
    g.add(box(w-0.02, 0.06, 0.05, wood, 0, baseY+0.03, -d/2+0.04));         // 頭側レール
    g.add(box(w-0.02, 0.06, 0.05, wood, 0, baseY+0.03,  d/2-0.04));         // 足側レール
    g.add(box(0.05, 0.06, d-0.02, wood, -w/2+0.03, baseY+0.03, 0));         // サイドレール
    g.add(box(0.05, 0.06, d-0.02, wood,  w/2-0.03, baseY+0.03, 0));
    g.add(bedding(w-0.07, d-0.07, baseY+0.17, { duvet: dvCol, mattH: 0.13, accent: false, fold: true, pillowZ: 0.28 }));
  });
  // 上段の転落防止ガード (長手 -X 側)
  g.add(box(0.05, 0.18, d*0.62, wood, -w/2+0.03, upperY+0.18, d*0.04));
  g.add(box(0.05, 0.05, d*0.62, wood, -w/2+0.03, upperY+0.28, d*0.04));     // 手すり上桟
  // はしご (足側 +X 寄り・2本支柱 + 段)
  const lx = w/2+0.06, lz0 = d/2-0.55, lz1 = d/2-0.22, ladTop = upperY+0.18;
  [lz0, lz1].forEach(lz => g.add(box(0.035, ladTop, 0.04, wood, lx, ladTop/2, lz)));
  for (let i = 0; i < 5; i++) { const ry = 0.2 + i*((ladTop-0.3)/4); g.add(box(0.05, 0.028, lz1-lz0, wood, lx, ry, (lz0+lz1)/2)); }
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildPendantLamp({ color='#e0a23b', w=0.4, d=0.4, h=1.2 } = {}) {
  // 天井から吊り下がるペンダントライト。床(y=0)に置いても天井マウント→笠が頭上(約1.85m)に来る。
  const g = new THREE.Group();
  const metal = mat('#3a332b', 0.3, 0.7, { env: 0.8 }), shade_m = mat(color, 0.5, 0.3);
  const ceilY = WALL_H - 0.02;   // 天井マウント高
  const shadeY = 1.85;           // 笠(光源)の吊り下げ高さ
  // ceiling rose
  const rose = cyl(0.06, 0.06, 0.04, 16, metal); rose.position.set(0, ceilY, 0); g.add(rose);
  // cord from ceiling down to the shade
  const cordLen = Math.max(0.1, ceilY - shadeY);
  const cord = cyl(0.008, 0.008, cordLen, 8, metal); cord.position.set(0, shadeY + cordLen / 2, 0); g.add(cord);
  // shade dome (open side downward)
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), shade_m); dome.position.set(0, shadeY, 0); dome.castShadow = true; dome.userData.colorable = true; g.add(dome);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat('#ffffee', 0.1, 0.0, { emissive: '#ffffcc', emissiveIntensity: 1.5 })); bulb.position.set(0, shadeY - 0.06, 0); g.add(bulb);
  const light = new THREE.PointLight(0xfff5cc, 1.3, 4.5); light.position.set(0, shadeY - 0.12, 0); g.add(light);
  return g;
}
function buildDeskLamp({ color='#3a4250', w=0.3, d=0.3, h=0.5 } = {}) {
  const g = new THREE.Group(); const metal = mat(color, 0.35, 0.6, { env: 0.7 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.03, 16), metal); base.position.set(0, 0.015, 0); g.add(base);
  const arm1 = new THREE.Mesh(roundedBoxGeom(0.025, 0.22, 0.025, 0.008, 4), metal); arm1.position.set(0, 0.13, 0); arm1.rotation.z = 0.3; g.add(arm1);
  const arm2 = new THREE.Mesh(roundedBoxGeom(0.025, 0.18, 0.025, 0.008, 4), metal); arm2.position.set(0.07, 0.32, 0); arm2.rotation.z = -0.2; g.add(arm2);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.09, 12), metal); head.position.set(0.1, h, 0); head.rotation.z = Math.PI * 0.6; head.castShadow = true; head.userData.colorable = true; g.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), mat('#ffffee', 0.1, 0.0, { emissive: '#ffffcc', emissiveIntensity: 1.5 })); bulb.position.set(0.12, h - 0.02, 0); g.add(bulb);
  const light = new THREE.PointLight(0xfff5cc, 0.8, 2); light.position.set(0.12, h - 0.05, 0); g.add(light);
  return g;
}
function buildTableLamp({ color='#b25c78', w=0.3, d=0.3, h=0.55 } = {}) {
  const g = new THREE.Group();
  const base_m = mat('#caa46d', 0.3, 0.7, { env: 0.7 }), shade_m = mat(color, 0.6, 0.0);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 16), base_m); base.position.set(0, 0.11, 0); base.castShadow = true; g.add(base);
  const neck = cyl(0.02, 0.02, 0.06, 8, base_m); neck.position.set(0, 0.25, 0); g.add(neck);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.07, 0.18, 16, 1, true), shade_m); shade.position.set(0, 0.38, 0); shade.castShadow = true; shade.userData.colorable = true; g.add(shade);
  const shadeTop = cyl(0.07, 0.07, 0.01, 16, shade_m); shadeTop.position.set(0, 0.47, 0); g.add(shadeTop);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat('#ffffee', 0.1, 0.0, { emissive: '#ffffcc', emissiveIntensity: 1.2 })); bulb.position.set(0, 0.34, 0); g.add(bulb);
  const light = new THREE.PointLight(0xfff5cc, 0.9, 3); light.position.set(0, 0.3, 0); g.add(light);
  return g;
}
function buildRoundRug({ color='#b9714a', w=1.6, d=1.6 } = {}) {
  const g = new THREE.Group();
  const rugMat = mat(color, 0.92, 0.0); rugMat.side = THREE.DoubleSide;
  const rug = new THREE.Mesh(new THREE.CircleGeometry(w/2, 32), rugMat); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.005, 0); rug.receiveShadow = true; rug.userData.colorable = true; g.add(rug);
  const border = new THREE.Mesh(new THREE.TorusGeometry(w/2 - 0.05, 0.04, 6, 32), mat(shade(color, 0.75), 0.92)); border.rotation.x = -Math.PI / 2; border.position.set(0, 0.006, 0); g.add(border);
  return g;
}
function buildWallArt({ color='#3f5d7a', w=0.8, d=0.04, h=0.6 } = {}) {
  const g = new THREE.Group(); const cy = 1.45;
  const frame = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.015, 4), mat('#3a2a18', 0.5, 0.1)); frame.position.set(0, cy, 0); frame.castShadow = true; g.add(frame);
  const canvas_m = plainBox(w - 0.04, h - 0.04, 0.01, mat('#f8f4ee', 0.9, 0.0), 0, cy, d * 0.3); g.add(canvas_m);
  const colors = [color, shade(color, 1.4), '#e8b86d', shade(color, 0.7)];
  const blocks = [[0,-0.1,0.35,0.35],[0.2,0.05,0.18,0.28],[-0.15,0.08,0.2,0.22],[0.05,-0.05,0.12,0.12]];
  blocks.forEach(([bx,by,bw,bh],i) => {
    const bl = plainBox(bw, bh, 0.012, mat(colors[i % colors.length], 0.7), bx, cy + by, d * 0.35); bl.userData.colorable = (i === 0); g.add(bl);
  });
  return g;
}
function buildWallClock({ color='#2a2520', w=0.4, d=0.06, h=0.4 } = {}) {
  // 規約: 文字盤(使う面)はローカル +Z を向く。背面(z=0)を壁に付ける。
  const g = new THREE.Group();
  const cy = 1.6, R = w / 2, zf = d;            // zf = 前面の z
  const caseM = mat(color, 0.5, 0.25), faceM = mat('#f8f6f0', 0.7), markM = mat('#2a2a2a', 0.55), redM = mat('#c0392b', 0.5);
  // 本体ケース(円盤・軸=Z で前面+Z)
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.97, d, 44), caseM);
  body.rotation.x = Math.PI / 2; body.position.set(0, cy, d / 2); body.castShadow = true; body.receiveShadow = true; body.userData.colorable = true; g.add(body);
  // 文字盤(ケース前面キャップ z=d の手前に出す)
  const face = new THREE.Mesh(new THREE.CircleGeometry(R - 0.018, 44), faceM); face.position.set(0, cy, zf + 0.001); g.add(face);
  // 前縁ベゼル(文字盤の外周, 少し前へ突出)
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(R - 0.01, 0.014, 14, 44), caseM); bezel.position.set(0, cy, zf + 0.006); bezel.userData.colorable = true; g.add(bezel);
  // 時刻目盛り(12・3時間ごとに太く)
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, big = i % 3 === 0, tr = R - 0.045;
    const tick = new THREE.Mesh(new THREE.BoxGeometry(big ? 0.016 : 0.007, big ? 0.046 : 0.026, 0.004), markM);
    tick.position.set(Math.sin(a) * tr, cy + Math.cos(a) * tr, zf + 0.004); tick.rotation.z = -a; g.add(tick);
  }
  // 針(中心で旋回・10:10:30風) + 中央ハブ
  const hand = (len, wd, a, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(wd, len, 0.004), m); b.position.set(Math.sin(a) * len / 2, cy + Math.cos(a) * len / 2, z); b.rotation.z = -a; b.castShadow = true; g.add(b); };
  hand(R * 0.5, 0.013, -1.05, zf + 0.007, markM);   // 時針(約10時)
  hand(R * 0.72, 0.009, 1.0, zf + 0.009, markM);     // 分針(約2時)
  hand(R * 0.8, 0.0035, 3.0, zf + 0.011, redM);      // 秒針(赤)
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.018, 18), mat('#1a1a1a', 0.4, 0.5)); hub.rotation.x = Math.PI / 2; hub.position.set(0, cy, zf + 0.014); g.add(hub);
  // ガラスカバー
  const glass = new THREE.Mesh(new THREE.CircleGeometry(R - 0.012, 44), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.1 }));
  glass.position.set(0, cy, zf + 0.015); g.add(glass);
  return g;
}
function buildGlassCabinet({ color='#f3ece0', w=0.9, d=0.4, h=1.8 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.6), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xd0eaf8, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1 });
  const body = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.02, 4), wood); body.position.set(0, h/2, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  const frontGlass = plainBox(w - 0.06, h - 0.06, 0.01, glassMat, 0, h/2, d/2 - 0.015); g.add(frontGlass);
  const frameTop = new THREE.Mesh(roundedBoxGeom(w - 0.02, 0.03, 0.03, 0.008, 4), metal); frameTop.position.set(0, h - 0.015, d/2 - 0.02); g.add(frameTop);
  const frameBot = new THREE.Mesh(roundedBoxGeom(w - 0.02, 0.03, 0.03, 0.008, 4), metal); frameBot.position.set(0, 0.015, d/2 - 0.02); g.add(frameBot);
  [h * 0.38, h * 0.64].forEach(sy => {
    const shelf = new THREE.Mesh(roundedBoxGeom(w - 0.08, 0.02, d - 0.08, 0.006, 4), wood); shelf.position.set(0, sy, 0); g.add(shelf);
  });
  const handle = cyl(0.008, 0.008, 0.12, 8, metal); handle.rotation.z = Math.PI/2; handle.position.set(0, h * 0.5, d/2 + 0.015); g.add(handle);
  return g;
}
function buildOttoman({ color='#6f9e74', w=0.6, d=0.6, h=0.4 } = {}) {
  const g = new THREE.Group(); const fabric = fabricMat(color), wood = mat('#5c3d1e', 0.7);
  const body = new THREE.Mesh(roundedBoxGeom(w, h - 0.06, d, 0.06, 4), fabric); body.position.set(0, (h-0.06)/2 + 0.06, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  const numTufts = 3;
  for (let ix = 0; ix < numTufts; ix++) {
    for (let iz = 0; iz < numTufts; iz++) {
      const tx = -w/2 + (ix + 0.5) * (w / numTufts), tz = -d/2 + (iz + 0.5) * (d / numTufts);
      const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), wood); tuft.position.set(tx, h - 0.02, tz); g.add(tuft);
    }
  }
  const border = new THREE.Mesh(new THREE.TorusGeometry(Math.min(w,d) * 0.48, 0.015, 6, 32), wood); border.rotation.x = Math.PI/2; border.position.set(0, h - 0.03, 0); g.add(border);
  [[-w/2+0.06,d/2-0.06],[-w/2+0.06,-(d/2-0.06)],[w/2-0.06,d/2-0.06],[w/2-0.06,-(d/2-0.06)]].forEach(([lx,lz]) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.06, 8), wood); leg.position.set(lx, 0.03, lz); leg.castShadow = true; g.add(leg); });
  return g;
}


function buildMonitor({ color='#1c1c20', w=0.52, d=0.18, h=0.44 } = {}) {
  const g = new THREE.Group();
  const metal = mat('#8a9098', 0.25, 0.8, {env:0.9});
  // Base plate
  const base = box(0.22, 0.02, 0.18, metal, 0, 0.01, 0.01); g.add(base);
  // Neck/stem
  g.add(box(0.038, 0.12, 0.038, metal, 0, 0.09, 0.01));
  // Tilt arm
  g.add(box(0.06, 0.036, 0.06, metal, 0, 0.17, 0.01));
  // Panel back housing
  const panel = new THREE.Mesh(roundedBoxGeom(w, 0.29, 0.03, 0.01, 3), mat(color, 0.4, 0.3));
  panel.position.set(0, 0.30, 0.02); panel.castShadow = true; panel.userData.colorable = true; g.add(panel);
  // Screen surface
  g.add(box(w-0.04, 0.265, 0.01, mat('#080a0e', 0.08, 0.2), 0, 0.30, 0.036));
  // Screen glow
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w-0.06, 0.245), new THREE.MeshBasicMaterial({color:0x2a4a7a, transparent:true, opacity:0.65}));
  glow.position.set(0, 0.30, 0.042); g.add(glow);
  // Screen glow2 highlight
  const glow2 = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({color:0x6090c0, transparent:true, opacity:0.30}));
  glow2.position.set(-w*0.2, 0.33, 0.043); g.add(glow2);
  // Top bezel strip
  g.add(box(w, 0.012, 0.03, mat(shade(color,0.85), 0.4, 0.25), 0, 0.45, 0.02));
  // Power LED
  const led = cyl(0.004, 0.004, 0.006, 6, mat('#0066ff', 0.5));
  led.rotation.x = Math.PI/2; led.position.set(w*0.4, 0.16, 0.037); g.add(led);
  return g;
}
function buildKotatsu({ color='#8a5a2b', w=0.9, d=0.9, h=0.37 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.65, 0.02, {env:0.3});
  // 4 short legs
  [[ w/2-0.06,  d/2-0.06], [ w/2-0.06, -(d/2-0.06)],
   [-(w/2-0.06), d/2-0.06], [-(w/2-0.06), -(d/2-0.06)]].forEach(([lx,lz]) => {
    g.add(box(0.06, 0.30, 0.06, wood, lx, 0.15, lz));
  });
  // Lower cross-frame (ヤグラ) — two horizontal bars
  g.add(box(w-0.14, 0.03, 0.05, wood, 0, 0.14,  d/4));
  g.add(box(w-0.14, 0.03, 0.05, wood, 0, 0.14, -d/4));
  // Two side bars
  g.add(box(0.05, 0.03, d-0.14, wood,  w/4, 0.14, 0));
  g.add(box(0.05, 0.03, d-0.14, wood, -w/4, 0.14, 0));
  // Heater unit
  g.add(box(0.22, 0.05, 0.22, mat('#2a2a2a', 0.7), 0, 0.12, 0));
  // Table top
  const top = box(w, 0.04, d, mat(shade(color, 0.92), 0.55, 0.02), 0, h-0.02, 0);
  top.userData.colorable = true; g.add(top);
  // Top frame strip
  g.add(box(w+0.01, 0.012, d+0.01, mat(shade(color,0.78), 0.5), 0, h, 0));
  // Futon (布団)
  const futon = new THREE.Mesh(roundedBoxGeom(w+0.26, 0.1, d+0.26, 0.06, 4), fabricMat('#c8b49a'));
  futon.position.set(0, 0.30, 0); futon.material.opacity = 1.0; futon.userData.colorable = true; g.add(futon);
  return g;
}
function buildDresser({ color='#f3ece0', w=0.9, d=0.44, h=1.4 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.62, 0.02);
  const metal = mat('#9aa0a4', 0.2, 0.8, {env:0.9});
  // 4 thin tapered legs
  [[ w/2-0.06,  d/2-0.06], [ w/2-0.06, -(d/2-0.06)],
   [-(w/2-0.06), d/2-0.06], [-(w/2-0.06), -(d/2-0.06)]].forEach(([lx,lz]) => {
    g.add(box(0.04, 0.12, 0.04, mat(shade(color,0.7), 0.6), lx, 0.06, lz));
  });
  // Lower body (drawer cabinet)
  const body = box(w, 0.56, d, wood, 0, 0.12+0.28, 0); body.userData.colorable = true; g.add(body);
  // 3 drawer fronts
  [0.18, 0.34, 0.50].forEach(dy => {
    const dr = box(w-0.06, 0.16, 0.025, mat(shade(color,1.08), 0.6), 0, dy, d/2+0.008);
    dr.userData.colorable = true; g.add(dr);
    // Drawer handle
    const hdl = cyl(0.006, 0.006, 0.15, 8, metal);
    hdl.rotation.y = Math.PI/2; hdl.position.set(0, dy, d/2+0.028); g.add(hdl);
  });
  // Counter top surface
  g.add(box(w+0.02, 0.03, d+0.02, mat(shade(color,0.88), 0.55), 0, 0.705, 0));
  // Mirror shelf tray
  g.add(box(w-0.16, 0.04, d*0.38, mat(shade(color,0.82), 0.58), 0, 0.74, d*0.12));
  // Mirror back plate
  g.add(box(w-0.12, 0.64, 0.04, mat(shade(color,0.72), 0.5), 0, 1.07, -d/2+0.02));
  // Mirror surface
  g.add(box(w-0.18, 0.58, 0.012, mat('#c8d8e0', 0.04, 0.9, {env:1.3}), 0, 1.07, -d/2+0.04));
  // Mirror side posts
  g.add(box(0.035, 0.68, 0.04, wood,  (w/2-0.09), 1.07, -d/2+0.02));
  g.add(box(0.035, 0.68, 0.04, wood, -(w/2-0.09), 1.07, -d/2+0.02));
  // Small perfume bottle on tray
  g.add(cylAt(0.025, 0.022, 0.08, 10, mat('#d4a0b0', 0.3, 0.1), 0.16, 0.76, d*0.12));
  return g;
}
function buildHangerRack({ color='#8a7a6a', w=1.0, d=0.38, h=1.75 } = {}) {
  const g = new THREE.Group();
  const metal = mat('#5a5a5a', 0.35, 0.65, {env:0.8});
  const wood = mat(color, 0.65, 0.02);
  // Base board
  const base = box(w, 0.025, d, wood, 0, 0.012, 0); base.userData.colorable = true; g.add(base);
  // 2 vertical side poles
  g.add(cylAt(0.018, 0.018, 1.64, 12, metal,  (w/2-0.04), 0.84, 0));
  g.add(cylAt(0.018, 0.018, 1.64, 12, metal, -(w/2-0.04), 0.84, 0));
  // Horizontal top bar
  const topBar = cylAt(0.014, 0.014, w-0.08, 12, metal, 0, 1.58, 0);
  topBar.rotation.z = Math.PI/2; g.add(topBar);
  // Lower shelf
  const shelf = box(w-0.08, 0.022, d-0.08, wood, 0, 0.32, 0); shelf.userData.colorable = true; g.add(shelf);
  // Diagonal braces
  [[ (w/2-0.04),  0.01], [ (w/2-0.04), -0.01],
   [-(w/2-0.04),  0.01], [-(w/2-0.04), -0.01]].forEach(([bx, bz], i) => {
    const brace = box(0.014, 0.014, 0.36, metal, bx, 0.17, bz);
    brace.rotation.x = (i % 2 === 0 ? 0.4 : -0.4); g.add(brace);
  });
  // 3 clothes hangers on top bar
  [-0.25, 0, 0.25].forEach(hx => {
    g.add(box(0.18, 0.007, 0.007, metal, hx, 1.62, 0));
    const hook = cyl(0.007, 0.007, 0.08, 6, metal); hook.position.set(hx, 1.595, 0); g.add(hook);
    // diagonal arms of hanger
    g.add(box(0.092, 0.006, 0.006, metal, hx-0.046, 1.614, 0));
    g.add(box(0.092, 0.006, 0.006, metal, hx+0.046, 1.614, 0));
  });
  return g;
}
function buildPiano({ color='#1a1010', w=1.45, d=0.6, h=1.22 } = {}) {
  const g = new THREE.Group();
  const darkWood = mat(color, 0.55, 0.1, {env:0.5});
  const ivory = mat('#f8f4e8', 0.75, 0.0);
  const ebony = mat('#0a0808', 0.4, 0.05);
  // Main cabinet body
  const body = box(w, h-0.05, d-0.08, darkWood, 0, (h-0.05)/2, -0.04); body.userData.colorable = true; g.add(body);
  // Front panel above keys
  const frontPanel = box(w-0.06, 0.36, 0.055, darkWood, 0, 0.90, d/2-0.022); frontPanel.userData.colorable = true; g.add(frontPanel);
  // Key bed
  g.add(box(w-0.1, 0.06, 0.22, mat('#e8e4d8', 0.72), 0, 0.715, d/2-0.1));
  // White keys
  for (let i = 0; i < 13; i++) {
    g.add(box(0.086, 0.055, 0.168, ivory, -w/2+0.14+i*0.094, 0.745, d/2-0.09));
  }
  // Black keys
  const bkPos = [1,2,4,5,6,8,9,11];
  bkPos.forEach(i => g.add(box(0.052, 0.064, 0.1, ebony, -w/2+0.165+i*0.094, 0.755, d/2-0.065)));
  // Key fallboard (angled open)
  const fallboard = box(w-0.1, 0.014, 0.24, darkWood, 0, 0.78, d/2-0.18);
  fallboard.rotation.x = -0.35; g.add(fallboard);
  // Music desk
  const musicDesk = box(w-0.12, 0.22, 0.012, darkWood, 0, 1.04, d/2-0.13);
  musicDesk.rotation.x = -0.35; g.add(musicDesk);
  // Music desk ledge
  g.add(box(w-0.12, 0.012, 0.04, darkWood, 0, 0.94, d/2-0.05));
  // Top lid
  g.add(box(w, 0.018, d-0.04, darkWood, 0, h-0.02, -0.02));
  // 2 front legs
  g.add(box(0.06, 0.12, 0.055, darkWood,  (w/2-0.08), 0.06, d/2-0.04));
  g.add(box(0.06, 0.12, 0.055, darkWood, -(w/2-0.08), 0.06, d/2-0.04));
  // Pedal bracket
  g.add(box(0.32, 0.06, 0.06, mat('#8a9098', 0.3, 0.7), 0, 0.04, d/2-0.08));
  // 3 pedals
  [-0.08, 0, 0.08].forEach(px => {
    const pedal = cyl(0.018, 0.018, 0.025, 10, mat('#c0c8d0', 0.2, 0.8, {env:1.0}));
    pedal.rotation.x = Math.PI/2; pedal.position.set(px, 0.06, d/2-0.06); g.add(pedal);
  });
  return g;
}

function buildSchoolDesk({ color='#e8c89a', w=0.65, d=0.45, h=0.72 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.6, 0.03);
  const metal = mat('#b8bcc0', 0.3, 0.7, { env: 0.85 });
  // Desktop
  const top = box(w, 0.028, d, wood, 0, h, 0); top.userData.colorable = true; g.add(top);
  // Top edge trim
  g.add(box(w+0.01, 0.012, d+0.01, mat(shade(color,0.8),0.55), 0, h-0.018, 0));
  // Under-desk book tray (open toward +Z = student/access side per orient convention)
  const trayY = h - 0.14;
  g.add(box(w-0.06, 0.016, d-0.06, mat(shade(color,0.86),0.55), 0, trayY, 0));   // bottom
  g.add(box(w-0.06, 0.1, 0.016, mat(shade(color,0.82),0.55), 0, trayY+0.05, -(d/2-0.04)));  // back (-Z)
  g.add(box(0.016, 0.1, d-0.06, mat(shade(color,0.82),0.55),  (w/2-0.04), trayY+0.05, 0)); // right side
  g.add(box(0.016, 0.1, d-0.06, mat(shade(color,0.82),0.55), -(w/2-0.04), trayY+0.05, 0)); // left side
  // 4 tubular metal legs + rubber foot caps
  const footMat = mat('#2a2a2e', 0.7);
  [[ w/2-0.05,  d/2-0.05], [ w/2-0.05, -(d/2-0.05)],
   [-(w/2-0.05), d/2-0.05], [-(w/2-0.05), -(d/2-0.05)]].forEach(([lx,lz]) => {
    g.add(cylAt(0.014, 0.014, h-0.03, 10, metal, lx, (h-0.03)/2, lz));
    g.add(cylAt(0.02, 0.02, 0.012, 10, footMat, lx, 0.006, lz));
  });
  // Side stretcher rails (front + back, spanning x)
  [d/2-0.05, -(d/2-0.05)].forEach(rz => {
    const rail = cylAt(0.012, 0.012, w-0.1, 10, metal, 0, 0.14, rz); rail.rotation.z = Math.PI/2; g.add(rail);
  });
  // Side bag hook (+Z access/student side)
  g.add(box(0.02, 0.05, 0.02, metal, w/2-0.05, 0.42, (d/2-0.02)));
  return g;
}
function buildBlackboard({ color='#1f4a37', w=3.0, d=0.06, h=1.2 } = {}) {
  const g = new THREE.Group();
  const frame = mat('#7a5230', 0.6, 0.05);   // wooden frame
  const cy = 1.25;   // board center height
  // Board surface
  const board = box(w, h, 0.02, mat(color, 0.92, 0), 0, cy, 0); board.userData.colorable = true; g.add(board);
  // 裏面バッキング(壁側) — 裏が「表の黒板」に見えて混同しないよう暗色の板で塞ぐ
  g.add(box(w - 0.01, h - 0.01, 0.012, mat('#3a2c1d', 0.85), 0, cy, -0.022));
  // Wooden frame
  g.add(box(w+0.06, 0.05, 0.05, frame, 0, cy+h/2+0.01, 0));   // top
  g.add(box(w+0.06, 0.06, 0.05, frame, 0, cy-h/2-0.01, 0));   // bottom
  g.add(box(0.05, h+0.08, 0.05, frame, -w/2-0.02, cy, 0));    // left
  g.add(box(0.05, h+0.08, 0.05, frame,  w/2-0.02 + 0.04, cy, 0)); // right
  // Chalk tray
  g.add(box(w, 0.03, 0.1, frame, 0, cy-h/2-0.04, 0.05));
  g.add(box(w, 0.03, 0.02, frame, 0, cy-h/2-0.015, 0.095));   // tray lip
  // Chalk pieces + eraser
  ['#f4f4f0','#f4f4f0','#f7d0d0','#d0e8f7'].forEach((c,i)=>{
    const ch = cylAt(0.008,0.008,0.06,8, mat(c,0.8), -0.4+i*0.12, cy-h/2-0.02, 0.06); ch.rotation.z=Math.PI/2; g.add(ch);
  });
  g.add(box(0.13, 0.04, 0.06, mat('#3a3a40',0.7), 0.5, cy-h/2-0.02, 0.06));   // eraser
  // Faint chalk writing hints
  g.add(box(0.7, 0.012, 0.004, mat('#cfd8d0',0.9), -w*0.28, cy+h*0.2, 0.012));
  g.add(box(0.5, 0.012, 0.004, mat('#cfd8d0',0.9), -w*0.30, cy+h*0.05, 0.012));
  g.add(box(0.9, 0.012, 0.004, mat('#cfd8d0',0.9),  w*0.1,  cy-h*0.1, 0.012));
  return g;
}
function buildZabuton({ color='#7a3540', w=0.55, d=0.55, h=0.08 } = {}) {
  const g = new THREE.Group();
  const fabric = fabricMat(color);
  // Cushion body (puffy rounded)
  const cushion = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.045, 4), fabric);
  cushion.position.set(0, h/2, 0); cushion.castShadow = true; cushion.receiveShadow = true; cushion.userData.colorable = true; g.add(cushion);
  // Center tuft button
  const btn = cyl(0.025, 0.025, 0.015, 12, fabricMat(shade(color,0.8)));
  btn.position.set(0, h-0.005, 0); g.add(btn);
  // Edge seam piping (4 sides)
  const piping = fabricMat(shade(color,0.82));
  g.add(box(w, 0.014, 0.014, piping, 0, h*0.5, d/2-0.005));
  g.add(box(w, 0.014, 0.014, piping, 0, h*0.5, -(d/2-0.005)));
  g.add(box(0.014, 0.014, d, piping, w/2-0.005, h*0.5, 0));
  g.add(box(0.014, 0.014, d, piping, -(w/2-0.005), h*0.5, 0));
  // Corner tassels
  [[w/2-0.04,d/2-0.04],[w/2-0.04,-(d/2-0.04)],[-(w/2-0.04),d/2-0.04],[-(w/2-0.04),-(d/2-0.04)]].forEach(([tx,tz])=>{
    g.add(cylAt(0.008,0.012,0.03,6, fabricMat(shade(color,0.7)), tx, h*0.4, tz));
  });
  return g;
}
export { buildArmchair, buildBed, buildBench, buildBlackboard, buildBookshelf, buildBunkBed, buildCafeChair, buildCafeTable, buildChest, buildCoffeeTable, buildConsoleTable, buildDesk, buildDeskLamp, buildDiningChair, buildDiningTable, buildDresser, buildFloorLamp, buildGlassCabinet, buildHangerRack, buildKotatsu, buildLoungeChair, buildMonitor, buildOfficeChair, buildOttoman, buildPendantLamp, buildPiano, buildRoundCoffeeTable, buildRoundRug, buildRoundTableSm, buildRug, buildSchoolDesk, buildSideTable, buildSofa3, buildSofaL, buildStackingChair, buildStool, buildTV, buildTVBoard, buildTableLamp, buildUpholsteredChair, buildWallArt, buildWallClock, buildWardrobe, buildWindsorChair, buildZabuton };
