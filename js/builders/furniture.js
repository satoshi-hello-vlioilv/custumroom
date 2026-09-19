import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost, bedding } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

// ---- ソファ (IKEA KIVIK 系の箱型): 低めで幅広のアーム(armW×armH), 厚い座クッション(座面高 seatH), 背クッション。使う面 +Z ----
function buildSofa3({ color='#c8a06a', w=2.28, d=0.95, h=0.83, seats=3, low=false, armH=null, armW=0.22, seatH=0.45, pillows=null } = {}) {
  const g = new THREE.Group();
  if (low) { h = h - 0.1; seatH = Math.min(seatH, 0.38); }
  if (armH == null) armH = Math.min(h - 0.12, seatH + 0.19);          // KIVIK: 座面から約20cmの低いアーム
  if (pillows == null) pillows = seats >= 2;
  const fabric = fabricMat(color), wood = mat('#5c3d1e', 0.7), accent = fabricMat(shade(color, 0.82));
  const baseTop = seatH - 0.16;
  const base = new THREE.Mesh(roundedBoxGeom(w, 0.26, d, 0.08, 4), fabric); base.position.set(0, baseTop - 0.13, 0); base.castShadow = base.receiveShadow = true; base.userData.colorable = true; g.add(base);
  const inner = w - 2 * armW, cushW = inner / seats;
  for (let i = 0; i < seats; i++) {
    const cx = -inner/2 + cushW/2 + i*cushW;
    const c = new THREE.Mesh(roundedBoxGeom(cushW - 0.03, 0.22, d - 0.18, 0.07, 4), fabric); c.position.set(cx, seatH - 0.09, 0.05); c.castShadow = true; c.userData.colorable = true; g.add(c);
    const bcH = h - seatH + 0.08;
    const bc = new THREE.Mesh(roundedBoxGeom(cushW - 0.03, bcH, 0.2, 0.07, 4), fabric); bc.position.set(cx, seatH - 0.14 + bcH/2, -d/2 + 0.16); bc.castShadow = true; bc.userData.colorable = true; g.add(bc);
  }
  const back = box(inner + 0.02, h - baseTop, 0.16, accent, 0, baseTop + (h - baseTop)/2, -d/2 + 0.08); back.userData.colorable = true; g.add(back);
  [-w/2 + armW/2, w/2 - armW/2].forEach(x => {
    const a = new THREE.Mesh(roundedBoxGeom(armW, armH - 0.08, d, 0.06, 4), fabric); a.position.set(x, (armH - 0.08)/2 + 0.08, 0); a.castShadow = true; a.userData.colorable = true; g.add(a);
  });
  if (pillows) [[-inner/2 + 0.2, '#d96a5b'], [inner/2 - 0.2, '#5b86b8']].forEach(([px, pc]) => {
    const pil = new THREE.Mesh(roundedBoxGeom(0.34, 0.34, 0.12, 0.06, 4), fabricMat(pc)); pil.position.set(px, seatH + 0.08, -d/2 + 0.3); pil.rotation.z = px < 0 ? 0.12 : -0.12; pil.castShadow = true; g.add(pil);
  });
  const legH = Math.max(0.04, baseTop - 0.26);
  [[-w/2+0.13,d/2-0.13],[-w/2+0.13,-(d/2-0.13)],[w/2-0.13,d/2-0.13],[w/2-0.13,-(d/2-0.13)]].forEach(([lx,lz]) => { const leg = cyl(0.03, 0.035, legH, 8, wood); leg.position.set(lx, legH/2, lz); g.add(leg); });
  return g;
}
// ---- 1人掛け (IKEA STRANDMON ウィングチェア風): 高い背 + 両側のウィング, 木の脚。使う面 +Z ----
function buildArmchair({ color='#c8a06a', w=0.82, d=0.96, h=1.01 } = {}) {
  const g = new THREE.Group(); const fabric = fabricMat(color), fabricD = fabricMat(shade(color, 0.9)), wood = mat('#5c3d1e', 0.6, 0.02);
  const LEG = 0.14, seatH = 0.45, armW = 0.13;
  [[-w/2+0.07, d/2-0.10],[w/2-0.07, d/2-0.10],[-w/2+0.07, -d/2+0.12],[w/2-0.07, -d/2+0.12]].forEach(([lx,lz]) => { const leg = cyl(0.02, 0.028, LEG, 10, wood); leg.position.set(lx, LEG/2, lz); g.add(leg); });
  const base = new THREE.Mesh(roundedBoxGeom(w, seatH - 0.10 - LEG, d - 0.04, 0.05, 4), fabricD); base.position.set(0, LEG + (seatH - 0.10 - LEG)/2, 0.0); base.castShadow = true; base.userData.colorable = true; g.add(base);
  const seat = new THREE.Mesh(roundedBoxGeom(w - 2*armW, 0.14, d - 0.24, 0.05, 4), fabric); seat.position.set(0, seatH - 0.05, 0.06); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  [-1, 1].forEach(s => {                                                                            // アーム(前で丸く巻く) + ウィング
    const a = new THREE.Mesh(roundedBoxGeom(armW, 0.22, d - 0.10, 0.05, 4), fabric); a.position.set(s*(w/2 - armW/2), seatH + 0.06, -0.01); a.castShadow = true; a.userData.colorable = true; g.add(a);
    const roll = cyl(0.065, 0.065, armW, 12, fabric); roll.rotation.z = Math.PI/2; roll.position.set(s*(w/2 - armW/2), seatH + 0.14, d/2 - 0.14); g.add(roll);
    const wing = new THREE.Mesh(roundedBoxGeom(0.06, h - seatH - 0.20, 0.24, 0.03, 4), fabric); wing.position.set(s*(w/2 - 0.04), seatH + 0.17 + (h - seatH - 0.20)/2, -d/2 + 0.20); wing.rotation.y = -s*0.18; wing.castShadow = true; wing.userData.colorable = true; g.add(wing);
  });
  const backH = h - seatH + 0.10;                                                                   // 背(やや後傾, 上部で少し丸み)
  const back = new THREE.Mesh(roundedBoxGeom(w - 0.02, backH, 0.12, 0.05, 4), fabric); back.position.set(0, seatH - 0.10 + backH/2, -d/2 + 0.09); back.rotation.x = -0.08; back.castShadow = true; back.userData.colorable = true; g.add(back);
  const cush = new THREE.Mesh(roundedBoxGeom(w - 2*armW - 0.02, backH - 0.30, 0.07, 0.03, 4), fabricD); cush.position.set(0, seatH + 0.05 + (backH - 0.30)/2, -d/2 + 0.19); cush.rotation.x = -0.08; cush.userData.colorable = true; g.add(cush);
  return g;
}
// ---- ダイニングチェア (IKEA STEFAN 風): 無垢材, 座面高45, 後脚がそのまま背柱になるラダーバック(横桟2 + 縦桟4)。使う面 +Z ----
function buildDiningChair({ color='#4a3b32', w=0.42, d=0.49, h=0.90 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.7, 0.02), pad = fabricMat('#d9d3c5');
  const seatH = 0.45, T = 0.035, lean = 0.06;
  const seat = box(w, 0.03, d - 0.02, wood, 0, seatH - 0.015, 0.01); seat.userData.colorable = true; g.add(seat);
  const cushion = new THREE.Mesh(roundedBoxGeom(w - 0.06, 0.03, d - 0.09, 0.012, 3), pad); cushion.position.set(0, seatH + 0.015, 0.02); cushion.castShadow = true; g.add(cushion);
  const bz = (y) => (-d/2 + T/2 + 0.02) - lean * (y - h/2);                                       // 後脚(背柱)の中心 z(y): 上ほど後ろ
  [-1, 1].forEach(s => {
    g.add(box(T, seatH, T, wood, s*(w/2 - T/2), seatH/2, d/2 - T/2));                           // 前脚
    const rl = box(T, h, T, wood, s*(w/2 - T/2), h/2, bz(h/2)); rl.rotation.x = -lean; g.add(rl); // 後脚 = 背柱
  });
  g.add(box(w - 2*T, 0.06, 0.02, wood, 0, seatH - 0.06, d/2 - 0.02));                              // 幕板(座枠)
  g.add(box(w - 2*T, 0.06, 0.02, wood, 0, seatH - 0.06, bz(seatH - 0.06) + 0.02));
  [-1, 1].forEach(s => g.add(box(0.02, 0.06, d - 0.08, wood, s*(w/2 - 0.03), seatH - 0.06, 0)));
  g.add(box(w - 2*T + 0.01, 0.06, 0.025, wood, 0, h - 0.05, bz(h - 0.05)));                        // 上桟
  g.add(box(w - 2*T + 0.01, 0.035, 0.025, wood, 0, seatH + 0.12, bz(seatH + 0.12)));               // 下桟
  const y0 = seatH + 0.14, y1 = h - 0.08, ym = (y0 + y1)/2;
  for (let i = 0; i < 4; i++) { const x = -w/2 + T + (w - 2*T) * (i + 1)/5; const sl = box(0.018, y1 - y0, 0.02, wood, x, ym, bz(ym)); sl.rotation.x = -lean; g.add(sl); }  // 縦桟
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
// ---- オフィスチェア (IKEA MARKUS 風): 高いメッシュバック(ヘッドレスト一体, 全高129cm), 座面53×47・座面高46, 固定アーム, 5本脚キャスター。使う面 +Z ----
function buildOfficeChair({ color='#5b5048', w=0.62, d=0.60, h=1.29 } = {}) {
  const g = new THREE.Group();
  const fabric = fabricMat(color), black = mat('#1f2124', 0.5, 0.3), chrome = mat('#aab0b5', 0.25, 0.85, { env: 1.0 });
  const meshM = mat(shade(color, 0.85), 0.9, 0); meshM.transparent = true; meshM.opacity = 0.82;
  const seatH = 0.46, sw = 0.53, sd = 0.47;
  const seat = new THREE.Mesh(roundedBoxGeom(sw, 0.08, sd, 0.03, 3), fabric); seat.position.set(0, seatH - 0.04, 0.02); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  g.add(box(sw - 0.06, 0.03, sd - 0.06, black, 0, seatH - 0.095, 0.02));                            // 座下シェル
  const bH = h - seatH + 0.02;                                                                         // 背(メッシュ): 座面後端から h まで, 少し後傾
  const bk = new THREE.Group(); bk.position.set(0, seatH - 0.02, -sd/2 + 0.03); bk.rotation.x = -0.1;
  const frame = new THREE.Mesh(roundedBoxGeom(0.50, bH, 0.03, 0.02, 3), black); frame.position.set(0, bH/2, 0); frame.castShadow = true; bk.add(frame);
  const meshB = new THREE.Mesh(roundedBoxGeom(0.44, bH - 0.06, 0.012, 0.02, 3), meshM); meshB.position.set(0, bH/2, 0.012); meshB.userData.colorable = true; bk.add(meshB);
  bk.add(box(0.36, 0.05, 0.03, black, 0, 0.30, 0.02));                                                // ランバーサポート
  g.add(bk);
  [-1, 1].forEach(s => { g.add(box(0.05, 0.02, 0.26, black, s*(sw/2 + 0.02), seatH + 0.20, 0.0)); g.add(box(0.03, 0.22, 0.05, black, s*(sw/2 + 0.02), seatH + 0.09, -0.06)); }); // アームレスト
  g.add(cylAt(0.03, 0.03, 0.10, 12, black, 0, seatH - 0.16, 0.02));                                  // 昇降機構
  g.add(cylAt(0.022, 0.022, seatH - 0.20, 12, chrome, 0, (seatH - 0.20)/2 + 0.05, 0.02));            // ガス圧支柱
  for (let i = 0; i < 5; i++) {                                                                       // 5本脚 + キャスター
    const a = (i/5)*Math.PI*2 + Math.PI/2;
    const spoke = box(0.30, 0.03, 0.04, black, Math.cos(a)*0.15, 0.05, 0.02 + Math.sin(a)*0.15); spoke.rotation.y = -a; g.add(spoke);
    const wheel = cyl(0.03, 0.03, 0.04, 10, black); wheel.rotation.z = Math.PI/2; wheel.position.set(Math.cos(a)*0.29, 0.03, 0.02 + Math.sin(a)*0.29); g.add(wheel);
  }
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
// ---- ダイニングテーブル (IKEA EKEDALEN 伸長式 180/240×90 風): 天板3cm, 角脚5.5cm + 幕板, 中央に伸長ジョイントの目地 ----
function buildDiningTable({ color='#8a5a2b', w=1.8, d=0.9, h=0.75 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6, 0.02, { env: 0.4 }), dark = mat(shade(color, 0.7), 0.6);
  const top = box(w, 0.03, d, wood, 0, h-0.015, 0); top.userData.colorable = true; g.add(top);
  g.add(box(0.006, 0.004, d - 0.02, dark, 0, h + 0.001, 0));                                          // 伸長ジョイントの目地
  const lt = 0.055, apH = 0.08;
  [[-w/2+0.06,d/2-0.06],[-w/2+0.06,-(d/2-0.06)],[w/2-0.06,d/2-0.06],[w/2-0.06,-(d/2-0.06)]].forEach(([lx,lz]) => { const leg = box(lt,h-0.03,lt,wood,lx,(h-0.03)/2,lz); leg.userData.colorable = true; g.add(leg); });
  g.add(box(w-0.18, apH, 0.03, wood, 0, h-0.03-apH/2, d/2-0.05));
  g.add(box(w-0.18, apH, 0.03, wood, 0, h-0.03-apH/2, -(d/2-0.05)));
  [-1, 1].forEach(s => g.add(box(0.03, apH, d-0.18, wood, s*(w/2-0.05), h-0.03-apH/2, 0)));
  return g;
}
// ---- コーヒーテーブル (IKEA LACK 118×78×45 風): 天板厚5cm, 角脚5×5cmが四隅に面一, 下段棚板 ----
function buildCoffeeTable({ color='#c8a06a', w=1.18, d=0.78, h=0.45 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.55, 0.02, { env: 0.4 });
  const top = box(w, 0.05, d, wood, 0, h-0.025, 0); top.userData.colorable = true; g.add(top);
  const L = 0.05;
  [[-w/2+L/2,d/2-L/2],[-w/2+L/2,-(d/2-L/2)],[w/2-L/2,d/2-L/2],[w/2-L/2,-(d/2-L/2)]].forEach(([lx,lz]) => { const leg = box(L,h-0.05,L,wood,lx,(h-0.05)/2,lz); leg.userData.colorable = true; g.add(leg); });
  const sh = box(w-2*L, 0.04, d-2*L, wood, 0, 0.12, 0); sh.userData.colorable = true; g.add(sh);
  return g;
}
// ---- デスク (IKEA MICKE 142×50×75 風): 薄い天板, 左側板, 右に引き出し1段+オープン棚のユニット(幅36), 配線口付き背面パネル。使う面 +Z ----
function buildDesk({ color='#f3ece0', w=1.42, d=0.50, h=0.75 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6), edge = mat(shade(color, 0.93), 0.6), metal = mat('#9aa0a4', 0.3, 0.7, { env: 0.9 });
  const T = 0.03, uW = 0.36, ux = w/2 - uW/2;
  const top = box(w, T, d, wood, 0, h-T/2, 0); top.userData.colorable = true; g.add(top);
  const sideL = box(T, h-T, d-0.02, wood, -w/2+T/2, (h-T)/2, 0); sideL.userData.colorable = true; g.add(sideL);
  [ux - uW/2 + T/2, ux + uW/2 - T/2].forEach(x => { const sp = box(T, h-T, d-0.02, wood, x, (h-T)/2, 0); sp.userData.colorable = true; g.add(sp); });   // 右ユニット側板
  g.add(box(uW-2*T, 0.02, d-0.04, edge, ux, 0.05, 0));                                               // 底板
  g.add(box(uW-2*T, 0.02, d-0.04, edge, ux, h-0.20, 0));                                              // 引き出し下の棚板
  const dr = box(uW-0.01, 0.15, 0.02, mat(shade(color,1.04), 0.55), ux, h-T-0.085, d/2-0.005); dr.userData.colorable = true; g.add(dr);   // 引き出し前板
  g.add(box(0.10, 0.006, 0.02, metal, ux, h-T-0.04, d/2+0.006));                                     // 引き手
  g.add(box(w-uW-T, h-0.28, 0.015, edge, -w/2 + T + (w-uW-T)/2, 0.25 + (h-0.28)/2, -d/2+0.02));      // 背面パネル(下部は配線用に開放)
  g.add(box(0.12, 0.004, 0.03, mat('#3a3a3a', 0.6), ux - 0.30, h + 0.001, -d/2 + 0.05));             // 天板の配線口
  return g;
}
// ---- サイドテーブル (IKEA LACK 55×55×45 風): 天板厚5cm, 角脚5×5cmが四隅に面一 ----
function buildSideTable({ color='#f3ece0', w=0.55, d=0.55, h=0.45 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.55, 0.02, { env: 0.4 });
  const top = box(w, 0.05, d, wood, 0, h-0.025, 0); top.userData.colorable = true; g.add(top);
  const L = 0.05;
  [[-w/2+L/2,d/2-L/2],[-w/2+L/2,-(d/2-L/2)],[w/2-L/2,d/2-L/2],[w/2-L/2,-(d/2-L/2)]].forEach(([lx,lz]) => { const leg = box(L,h-0.05,L,wood,lx,(h-0.05)/2,lz); leg.userData.colorable = true; g.add(leg); });
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
// ---- ベッド (IKEA MALM ベッドフレーム(高め) 風): 外形 w×d, 幅広で平らなサイドレール(上端38cm), 低いフットボード(38cm),
//      板状ヘッドボード(高さ h=100cm)。マットレス(90/140×200)はフレーム内側に落とし込み。頭側 -Z, 足側 +Z。color = 掛け布団(colorable) ----
function buildBed({ color='#5b86b8', w=1.05, d=2.09, h=1.0, double=false, mattW=null, mattL=2.0 } = {}) {
  const g = new THREE.Group();
  const wood = mat('#f2efe9', 0.55, 0.03, { env: 0.35 }), woodD = mat('#e4e0d8', 0.6, 0.03);        // ホワイト(MALM 標準色)
  const mw = mattW != null ? mattW : (double ? 1.40 : 0.90), ml = Math.min(mattL, d - 0.09);
  const RAIL = 0.38, LEG = 0.12, railW = Math.max(0.05, (w - mw) / 2);                                // レール幅 ≒ 7.5cm
  [[-w/2+0.10,-d/2+0.12],[w/2-0.10,-d/2+0.12],[-w/2+0.10,d/2-0.12],[w/2-0.10,d/2-0.12]].forEach(([lx,lz]) => g.add(box(0.06, LEG, 0.06, woodD, lx, LEG/2, lz)));   // 脚
  [-1, 1].forEach(s => g.add(box(railW, RAIL - LEG, d - 0.05, wood, s*(w/2 - railW/2), LEG + (RAIL - LEG)/2, 0)));   // サイドレール(幅広・平ら)
  g.add(box(w, RAIL - LEG, 0.05, wood, 0, LEG + (RAIL - LEG)/2, d/2 - 0.025));                       // フットボード(レールと同じ高さ)
  g.add(box(w - 2*railW, 0.02, d - 0.10, woodD, 0, 0.26, 0));                                        // すのこ(ベッドベース)
  const hb = box(w, h, 0.05, wood, 0, h/2, -d/2 + 0.025); g.add(hb);                                  // ヘッドボード(板状)
  g.add(box(w - 0.02, 0.008, 0.006, mat('#d9d5cd', 0.6), 0, h - 0.10, -d/2 + 0.053));               // ヘッドボードの目地
  g.add(bedding(mw, ml, 0.47, { duvet: color, double, mattH: 0.21, pillowZ: 0.32, throwFoot: true })); // 寝具(マットレス上面 47cm)
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
// ---- ワードローブ (IKEA PAX 150×58×201 風): 白い箱体 + 幅50cmの開き戸3枚(左端=左開き, 右端=右開き)。使う面 +Z ----
function buildWardrobe({ color='#f3ece0', w=1.5, d=0.58, h=2.01 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.65), doorM = mat('#fbf7ef', 0.6), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const body = box(w, h, d, wood, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  const n = Math.max(2, Math.round(w / 0.5)), dw = w/n - 0.006, dh = h - 0.04, dz = d/2 + 0.005;
  const handle = (parent, x) => { const hd = cyl(0.006, 0.006, 0.16, 10, metal); hd.position.set(x, 0, 0.02); parent.add(hd); };
  const pivL = new THREE.Group(); pivL.position.set(-w/2 + 0.003, h/2, dz);                          // 左端の扉: 左端ヒンジ
  const dL = box(dw, dh, 0.02, doorM, dw/2, 0, 0); dL.userData.colorable = true; pivL.add(dL); handle(pivL, dw - 0.05); g.add(pivL);
  const pivR = new THREE.Group(); pivR.position.set(w/2 - 0.003, h/2, dz);                           // 右端の扉: 右端ヒンジ
  const dR = box(dw, dh, 0.02, doorM, -dw/2, 0, 0); dR.userData.colorable = true; pivR.add(dR); handle(pivR, -dw + 0.05); g.add(pivR);
  for (let i = 1; i < n - 1; i++) {                                                                    // 中間の扉(固定)
    const x = -w/2 + (w/n) * (i + 0.5);
    const dm = box(dw, dh, 0.02, doorM, x, h/2, dz); dm.userData.colorable = true; g.add(dm);
    const hd = cyl(0.006, 0.006, 0.16, 10, metal); hd.position.set(x - dw/2 + 0.05, h/2, dz + 0.02); g.add(hd);
  }
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
  const openings = Math.max(3, Math.round((h - 0.1) / 0.32)), compH = (innerTop - innerBot) / openings;   // BILLY 202cm: 6段
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
// ---- チェスト (IKEA MALM 引き出し×4 80×48×100 風): 取っ手なし(前板下の指掛け), 台輪なしで床に接地, 前板は本体より少し内側 ----
function buildChest({ color='#5b5048', w=0.8, d=0.48, h=1.0 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.65, 0.02), front = mat(shade(color, 1.1), 0.62, 0.02), gapM = mat(shade(color, 0.45), 0.8);
  const body = box(w, h, d, wood, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  const n = 4, fh = (h - 0.05) / n;
  for (let i = 0; i < n; i++) {
    const y = 0.03 + fh*i + fh/2;
    const dr = box(w - 0.03, fh - 0.012, 0.02, front, 0, y, d/2 + 0.005); dr.userData.colorable = true; g.add(dr);
    g.add(box(w - 0.06, 0.010, 0.004, gapM, 0, y - fh/2 + 0.004, d/2 + 0.016));                     // 指掛けの影
  }
  return g;
}
// ---- テレビ台 (IKEA BESTÅ 扉付き 180×42×38 風): 白い箱体 + 幅60cmのプッシュオープン扉3枚(取っ手なし)。床置き ----
function buildTVBoard({ color='#f3ece0', w=1.8, d=0.42, h=0.38 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.65, 0.02), front = mat(shade(color, 1.04), 0.6, 0.02);
  const body = box(w, h, d, wood, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  const n = Math.max(1, Math.round(w / 0.6)), dw = w / n;
  for (let i = 0; i < n; i++) { const x = -w/2 + dw*(i + 0.5); const door = box(dw - 0.008, h - 0.02, 0.02, front, x, h/2, d/2 + 0.005); door.userData.colorable = true; g.add(door); }
  return g;
}
// ---- フロアランプ (IKEA HEKTAR 風): 直径34cmの円形ベース, 細い支柱, 首振りアームの先に直径31.5cmの円錐シェード(前方 +Z に向く)。高さ181cm ----
function buildFloorLamp({ color='#4a4f54', w=0.34, d=0.34, h=1.81 } = {}) {
  const g = new THREE.Group(); const metal = mat(color, 0.45, 0.6, { env: 0.6 }), dark = mat(shade(color, 0.75), 0.5, 0.5);
  g.add(cylAt(w/2, w/2, 0.02, 28, dark, 0, 0.01, 0));                                                 // ベース
  const poleH = h - 0.34;
  g.add(cylAt(0.014, 0.014, poleH, 12, metal, 0, 0.02 + poleH/2, 0));                                 // 支柱
  const arm = cylAt(0.011, 0.011, 0.235, 10, metal, 0, 0.02 + poleH + 0.115, 0.02); arm.rotation.x = 0.185; g.add(arm);   // 首振りアーム
  const shR = 0.1575, shH = 0.30;
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, shR, shH, 24, 1, false), metal);         // 円錐シェード(開口は前下向き)
  sh.position.set(0, h - 0.20, 0.16); sh.rotation.x = -0.9; sh.castShadow = true; sh.userData.colorable = true; g.add(sh);
  const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.055, shR - 0.005, shH - 0.01, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2cc, transparent: true, opacity: 0.7, side: THREE.BackSide }));
  inner.position.copy(sh.position); inner.rotation.copy(sh.rotation); g.add(inner);
  const bulb = new THREE.PointLight(0xffe9b8, 4, 4, 2); bulb.position.set(0, h - 0.28, 0.24); bulb.castShadow = false; g.add(bulb);
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

// ---- Lソファ (IKEA KIVIK 3人掛け 寝椅子付き 風): 3人掛け本体(奥行95)の右端に寝椅子(奥行 d)を前方(+Z)へ延長 ----
function buildSofaL({ color='#c8a06a', w=2.8, d=1.63, h=0.83 } = {}) {
  const g = new THREE.Group();
  const mainSofa = buildSofa3({ color, w, d: 0.95, h, seats: 3 });
  mainSofa.position.z = -(d - 0.95) / 2;                 // 背もたれ側を奥(-Z)へ寄せ, 寝椅子を手前(+Z)へ
  g.add(mainSofa);
  const chW = 0.95, chD = d - 0.95;
  const fabric = fabricMat(color), wood = mat('#5c3d1e', 0.7), accent = fabricMat(shade(color, 0.82));
  const chaise = new THREE.Group();
  const chBase = new THREE.Mesh(roundedBoxGeom(chW, 0.26, chD, 0.08, 4), fabric); chBase.position.set(0, 0.16, 0); chBase.castShadow = true; chBase.userData.colorable = true; chaise.add(chBase);
  const chSeat = new THREE.Mesh(roundedBoxGeom(chW - 0.04, 0.22, chD - 0.1, 0.07, 4), fabric); chSeat.position.set(0, 0.36, 0.05); chSeat.castShadow = true; chSeat.userData.colorable = true; chaise.add(chSeat);
  const chArm = new THREE.Mesh(roundedBoxGeom(0.22, h - 0.12, chD, 0.1, 4), fabric); chArm.position.set(-chW/2 + 0.12, (h-0.12)/2 + 0.08, 0); chArm.castShadow = true; chArm.userData.colorable = true; chaise.add(chArm);
  [[chW/2-0.1,chD/2-0.1],[chW/2-0.1,-(chD/2-0.1)],[-chW/2+0.1,chD/2-0.1],[-chW/2+0.1,-(chD/2-0.1)]].forEach(([lx,lz]) => { const leg = cyl(0.04, 0.05, 0.1, 8, wood); leg.position.set(lx, 0.05, lz); chaise.add(leg); });
  chaise.position.set(w/2 - chW/2, 0, d/2 - chD/2);
  g.add(chaise);
  return g;
}
// ---- スツール (IKEA MARIUS 風): 直径32cmの樹脂座面, 外に開いた4本のスチール脚(幅40), 座面高45。スタッキング可 ----
function buildStool({ color='#f2f2f0', w=0.4, d=0.4, h=0.45 } = {}) {
  const g = new THREE.Group(); const metal = mat(shade(color, 0.9), 0.45, 0.6, { env: 0.6 }), seatM = mat(color, 0.5, 0.05);
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.03, 24), seatM); seat.position.set(0, h - 0.015, 0); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  g.add(cylAt(0.125, 0.125, 0.02, 24, metal, 0, h - 0.04, 0));                                       // 座枠
  const legH = h - 0.03, r0 = 0.11, r1 = Math.min(w, d)/2 - 0.02, up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 4; i++) {
    const a = i/4*Math.PI*2 + Math.PI/4, x0 = Math.cos(a)*r0, z0 = Math.sin(a)*r0, x1 = Math.cos(a)*r1, z1 = Math.sin(a)*r1;
    const leg = cyl(0.009, 0.009, Math.hypot(legH, r1 - r0), 8, metal);
    leg.position.set((x0 + x1)/2, legH/2, (z0 + z1)/2);
    leg.quaternion.setFromUnitVectors(up, new THREE.Vector3(x1 - x0, -legH, z1 - z0).normalize()); g.add(leg);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r0 + (r1 - r0) * 0.6, 0.006, 6, 24), metal); ring.rotation.x = Math.PI/2; ring.position.set(0, legH * 0.4, 0); g.add(ring);   // 脚の補強リング
  return g;
}
// ---- ベンチ (IKEA SKOGSTA 120 風): アカシア無垢材の厚い天板, 板状の脚2枚 + 貫。120×38×45 ----
function buildBench({ color='#8a5a2b', w=1.2, d=0.38, h=0.45 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6, 0.02, { env: 0.3 }), woodD = mat(shade(color, 0.9), 0.62, 0.02);
  const top = new THREE.Mesh(roundedBoxGeom(w, 0.045, d, 0.008, 3), wood); top.position.set(0, h - 0.0225, 0); top.castShadow = true; top.userData.colorable = true; g.add(top);
  [-1, 1].forEach(s => { const leg = box(0.04, h - 0.045, d - 0.06, woodD, s*(w/2 - 0.12), (h - 0.045)/2, 0); leg.userData.colorable = true; g.add(leg); });
  g.add(box(w - 0.32, 0.06, 0.035, woodD, 0, h - 0.135, 0));                                          // 貫
  return g;
}
// ---- ラウンジチェア (IKEA POÄNG 風): 成型合板の片持ちフレーム(床ランナー→前脚→アーム)と, 前縁から張り出す座・背のシェル + クッション。
//      幅68×奥行82×高さ100, 座面高41。使う面 +Z ----
function buildLoungeChair({ color='#c2b6a3', w=0.68, d=0.82, h=1.0 } = {}) {
  const g = new THREE.Group(); const wood = mat('#c9a56b', 0.55, 0.02, { env: 0.35 }), fabric = fabricMat(color);
  const seg = (p0, p1, wd, th, m, x = 0) => {                                                          // (z,y) 2点を結ぶ帯状の板
    const dz = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dz, dy);
    const b = new THREE.Mesh(roundedBoxGeom(wd, L + th * 0.6, th, th * 0.35, 2), m);
    b.position.set(x, (p0[1] + p1[1])/2, (p0[0] + p1[0])/2); b.rotation.x = Math.atan2(dz, dy); b.castShadow = true; return b;
  };
  const zf = d/2 - 0.08, zb = -d/2 + 0.06;                                                            // 前脚位置 / 背の最後端
  const frame = [[[zb + 0.04, 0.015], [zf, 0.015]], [[zf, 0.015], [zf + 0.03, 0.30]], [[zf + 0.03, 0.30], [zf - 0.01, 0.56]], [[zf - 0.01, 0.56], [-0.10, 0.60]], [[-0.10, 0.60], [-0.22, 0.50]]];
  [-1, 1].forEach(s => frame.forEach(([p0, p1]) => g.add(seg(p0, p1, 0.03, 0.025, wood, s*(w/2 - 0.015)))));
  const shell = [[[zf + 0.02, 0.40], [0.05, 0.35]], [[0.05, 0.35], [-0.20, 0.41]], [[-0.20, 0.41], [zb - 0.02, 0.68]], [[zb - 0.02, 0.68], [zb - 0.08, h - 0.02]]];
  shell.forEach(([p0, p1]) => g.add(seg(p0, p1, w - 0.10, 0.015, wood)));                             // 座・背のシェル
  const cush = [[[zf + 0.01, 0.44], [0.05, 0.39]], [[0.05, 0.39], [-0.18, 0.45]], [[-0.18, 0.45], [zb + 0.02, 0.70]], [[zb + 0.02, 0.70], [zb - 0.04, h - 0.04]]];
  cush.forEach(([p0, p1]) => { const c = seg(p0, p1, w - 0.14, 0.07, fabric); c.userData.colorable = true; g.add(c); });
  const head = new THREE.Mesh(roundedBoxGeom(w - 0.18, 0.16, 0.10, 0.04, 4), fabric); head.position.set(0, h - 0.12, zb - 0.01); head.rotation.x = -0.25; head.userData.colorable = true; g.add(head);   // ヘッドクッション
  g.add(box(w - 0.06, 0.03, 0.03, wood, 0, 0.46, zf - 0.02));                                         // 前の横桟
  return g;
}
// ---- コンソールテーブル (IKEA LIATORP 133×37×75 風): 白い木枠にガラス天板, 下段棚, 角脚 ----
function buildConsoleTable({ color='#f3ece0', w=1.33, d=0.37, h=0.75 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6, 0.02, { env: 0.4 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 });
  const rim = 0.06;
  [[0, d/2 - rim/2], [0, -(d/2 - rim/2)]].forEach(([x, z]) => { const r = box(w, 0.05, rim, wood, x, h - 0.025, z); r.userData.colorable = true; g.add(r); });   // 天板枠
  [-1, 1].forEach(s => { const r = box(rim, 0.05, d - 2*rim, wood, s*(w/2 - rim/2), h - 0.025, 0); r.userData.colorable = true; g.add(r); });
  g.add(box(w - 2*rim + 0.02, 0.006, d - 2*rim + 0.02, glass, 0, h - 0.01, 0));                    // ガラス天板
  const shelf = box(w - 0.10, 0.025, d - 0.08, wood, 0, 0.22, 0); shelf.userData.colorable = true; g.add(shelf);   // 下段棚
  [[-w/2+0.035,d/2-0.035],[-w/2+0.035,-(d/2-0.035)],[w/2-0.035,d/2-0.035],[w/2-0.035,-(d/2-0.035)]].forEach(([lx,lz]) => {
    const leg = box(0.05, h - 0.05, 0.05, wood, lx, (h - 0.05)/2, lz); leg.userData.colorable = true; g.add(leg);
    g.add(box(0.06, 0.02, 0.06, mat(shade(color, 0.93), 0.6), lx, h - 0.06, lz));                    // 脚頭の飾り
  });
  return g;
}
// ---- 丸コーヒーテーブル (IKEA LISABO 直径70 高さ50 風): アッシュ材突き板の丸天板, 外へ開いた丸テーパー脚4本 ----
function buildRoundCoffeeTable({ color='#c8a06a', w=0.7, d=0.7, h=0.5 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.55, 0.03, { env: 0.4 }), woodD = mat(shade(color, 0.9), 0.6, 0.03);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(w/2, w/2 - 0.004, 0.025, 36), wood); top.position.set(0, h - 0.0125, 0); top.castShadow = true; top.userData.colorable = true; g.add(top);
  const up = new THREE.Vector3(0, 1, 0), legH = h - 0.025;
  for (let i = 0; i < 4; i++) {
    const a = i/4*Math.PI*2 + Math.PI/4, r0 = w/2 - 0.10, r1 = w/2 - 0.03;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.014, legH, 10), woodD);
    leg.position.set(Math.cos(a)*(r0 + r1)/2, legH/2, Math.sin(a)*(r0 + r1)/2);
    leg.quaternion.setFromUnitVectors(up, new THREE.Vector3(Math.cos(a)*(r1 - r0), -legH, Math.sin(a)*(r1 - r0)).normalize()); leg.castShadow = true; g.add(leg);
  }
  return g;
}
// ---- 2段ベッド (IKEA MYDAL パイン材 90×200 風): 角柱4本, 上下段のすのこ+受け桟, 上段は全周ガードレール(縦桟), 足側(+Z)に垂直はしご。
//      頭側 -Z。color = パイン材(colorable)。寝具は共通 bedding() ----
function buildBunkBed({ color='#e8c89a', w=0.97, d=2.06, h=1.57 } = {}) {
  const g = new THREE.Group();
  const pine = mat(color, 0.6, 0.02, { env: 0.3 }), pineD = mat(shade(color, 0.85), 0.62, 0.02);
  const P = 0.045, iw = w - 2*P, il = d - 2*P;
  [[-w/2+P/2, d/2-P/2],[w/2-P/2, d/2-P/2],[-w/2+P/2, -(d/2-P/2)],[w/2-P/2, -(d/2-P/2)]].forEach(([px,pz]) => { const post = box(P, h, P, pine, px, h/2, pz); post.userData.colorable = true; g.add(post); });
  const lowerY = 0.26, upperY = 1.18;                                                                  // すのこ上面
  [[lowerY, '#c98a5b'], [upperY, '#5b86b8']].forEach(([baseY, dvCol]) => {
    g.add(box(iw, 0.03, il, pineD, 0, baseY - 0.015, 0));                                             // すのこ
    g.add(box(iw, 0.10, 0.025, pine, 0, baseY, -d/2 + P + 0.0125));                                    // 頭側/足側の受け桟
    g.add(box(iw, 0.10, 0.025, pine, 0, baseY,  d/2 - P - 0.0125));
    [-1, 1].forEach(s => g.add(box(0.025, 0.14, il, pine, s*(w/2 - P - 0.0125), baseY + 0.02, 0)));    // サイドレール(マットレス止め)
    g.add(bedding(0.86, 1.96, baseY + 0.15, { duvet: dvCol, mattH: 0.15, accent: false, fold: true, pillowZ: 0.28 }));
  });
  const gy = upperY + 0.30;                                                                            // 上段ガードレール: 上桟 + 縦桟
  [-1, 1].forEach(s => { g.add(box(0.03, 0.05, il, pine, s*(w/2 - P/2), gy, 0)); for (let i = 1; i < 10; i++) g.add(box(0.025, gy - upperY - 0.04, 0.02, pine, s*(w/2 - P/2), (gy + upperY)/2, -d/2 + P + il * i/10)); });
  g.add(box(iw, 0.05, 0.03, pine, 0, gy, -d/2 + P/2));
  const lz = d/2 + 0.02, lx0 = 0.10, lx1 = 0.42, lh = upperY + 0.30;                                   // はしご(足側, 垂直)
  [lx0, lx1].forEach(x => g.add(box(0.035, lh, 0.035, pine, x, lh/2, lz)));
  for (let i = 0; i < 5; i++) g.add(box(lx1 - lx0 - 0.035, 0.03, 0.03, pine, (lx0 + lx1)/2, 0.22 + i*0.24, lz));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
// ---- ペンダントライト (IKEA REGOLIT 45cm 和紙シェード + HEMMA コードセット 風): 天井から吊り下げ, 直径45cmの球の中心を約1.85mに ----
function buildPendantLamp({ color='#f3ece0', w=0.45, d=0.45, h=1.2 } = {}) {
  const g = new THREE.Group();
  const metal = mat('#f4f4f2', 0.5, 0.2);
  const paper = mat(color, 0.95, 0); paper.transparent = true; paper.opacity = 0.93; paper.emissive = new THREE.Color('#ffe9b0'); paper.emissiveIntensity = 0.28;
  const ceilY = WALL_H - 0.02, R = w/2, shadeY = 1.85;
  const rose = cyl(0.045, 0.045, 0.03, 16, metal); rose.position.set(0, ceilY, 0); g.add(rose);       // シーリングカップ
  const cordLen = Math.max(0.1, ceilY - shadeY - R);
  const cord = cyl(0.004, 0.004, cordLen, 8, metal); cord.position.set(0, shadeY + R + cordLen / 2, 0); g.add(cord);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 24, 16), paper); globe.position.set(0, shadeY, 0); globe.castShadow = true; globe.userData.colorable = true; g.add(globe);
  for (let i = 1; i < 6; i++) { const y = -R + (2*R) * i/6, r = Math.sqrt(Math.max(0, R*R - y*y)); const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.003, 6, 40), mat('#e8e2d6', 0.9)); ring.rotation.x = Math.PI/2; ring.position.set(0, shadeY + y, 0); g.add(ring); }  // 竹ひご風のリブ
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), mat('#ffffee', 0.1, 0.0)); bulb.material.emissive = new THREE.Color('#ffffcc'); bulb.material.emissiveIntensity = 1.5; bulb.position.set(0, shadeY, 0); g.add(bulb);
  const light = new THREE.PointLight(0xfff5cc, 1.3, 4.5); light.position.set(0, shadeY - 0.10, 0); g.add(light);
  return g;
}
// ---- デスクランプ (IKEA TERTIAL 風): 机縁にクランプ固定するダブルアーム(全長56cm)と直径17cmの円錐シェード。シェードは前(+Z)を向く ----
function buildDeskLamp({ color='#f2f2f0', w=0.2, d=0.4, h=0.5 } = {}) {
  const g = new THREE.Group(); const metal = mat(color, 0.4, 0.5, { env: 0.6 }), dark = mat('#2b2b2b', 0.5, 0.4);
  const arm = (p0, p1) => { const dz = p1[0] - p0[0], dy = p1[1] - p0[1]; const a = cyl(0.007, 0.007, Math.hypot(dz, dy), 8, metal); a.position.set(0, (p0[1] + p1[1])/2, (p0[0] + p1[0])/2); a.rotation.x = Math.atan2(dz, dy); g.add(a); };
  g.add(box(0.05, 0.05, 0.07, dark, 0, 0.025, -0.13));                                               // クランプ
  g.add(box(0.03, 0.10, 0.02, dark, 0, 0.05, -0.17));
  g.add(cylAt(0.01, 0.01, 0.05, 8, metal, 0, 0.075, -0.13));                                         // 軸受
  arm([-0.13, 0.10], [0.0, 0.38]);                                                                    // 下アーム
  arm([0.0, 0.38], [0.24, 0.46]);                                                                     // 上アーム
  const spring = cyl(0.012, 0.012, 0.16, 8, mat('#8a8a8a', 0.5, 0.6)); spring.position.set(0.0, 0.26, -0.03); spring.rotation.x = 0.35; g.add(spring);   // スプリング
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.085, 0.14, 18), metal);            // 円錐シェード(開口は前下)
  head.position.set(0, h - 0.10, 0.28); head.rotation.x = -0.75; head.castShadow = true; head.userData.colorable = true; g.add(head);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 8), mat('#ffffee', 0.1, 0.0)); bulb.material.emissive = new THREE.Color('#ffffcc'); bulb.material.emissiveIntensity = 1.5; bulb.position.set(0, h - 0.15, 0.31); g.add(bulb);
  const light = new THREE.PointLight(0xfff5cc, 0.8, 2); light.position.set(0, h - 0.18, 0.32); g.add(light);
  return g;
}
// ---- テーブルランプ (IKEA ÅRSTID 風): ニッケルメッキの丸ベース(直径15)と支柱, 白い布シェード(直径22), 高さ55 ----
function buildTableLamp({ color='#f3ece0', w=0.22, d=0.22, h=0.55 } = {}) {
  const g = new THREE.Group(); const nickel = mat('#c9ccd0', 0.25, 0.85, { env: 1.0 }), shadeM = mat(color, 0.85, 0); shadeM.side = THREE.DoubleSide;
  g.add(cylAt(0.075, 0.075, 0.02, 24, nickel, 0, 0.01, 0));                                          // ベース
  g.add(cylAt(0.012, 0.012, h - 0.24, 12, nickel, 0, 0.02 + (h - 0.24)/2, 0));                       // 支柱
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(w/2 - 0.015, w/2, 0.21, 24, 1, true), shadeM); shade.position.set(0, h - 0.105, 0); shade.castShadow = true; shade.userData.colorable = true; g.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), mat('#ffffee', 0.1, 0.0)); bulb.material.emissive = new THREE.Color('#ffffcc'); bulb.material.emissiveIntensity = 1.2; bulb.position.set(0, h - 0.12, 0); g.add(bulb);
  const light = new THREE.PointLight(0xfff5cc, 0.9, 3); light.position.set(0, h - 0.14, 0); g.add(light);
  return g;
}
function buildRoundRug({ color='#b9714a', w=1.6, d=1.6 } = {}) {
  const g = new THREE.Group();
  const rugMat = mat(color, 0.92, 0.0); rugMat.side = THREE.DoubleSide;
  const rug = new THREE.Mesh(new THREE.CircleGeometry(w/2, 32), rugMat); rug.rotation.x = -Math.PI / 2; rug.position.set(0, 0.005, 0); rug.receiveShadow = true; rug.userData.colorable = true; g.add(rug);
  const border = new THREE.Mesh(new THREE.TorusGeometry(w/2 - 0.05, 0.04, 6, 32), mat(shade(color, 0.75), 0.92)); border.rotation.x = -Math.PI / 2; border.position.set(0, 0.006, 0); g.add(border);
  return g;
}
// ---- ウォールアート (IKEA RIBBA フレーム 50×70 風): 黒い細縁フレーム + 白いマット + 抽象画。画面中心高 1.45m ----
function buildWallArt({ color='#3f5d7a', w=0.7, d=0.04, h=0.5 } = {}) {
  const g = new THREE.Group(); const cy = 1.45;
  const frame = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.006, 3), mat('#1e1c1a', 0.5, 0.1)); frame.position.set(0, cy, 0); frame.castShadow = true; g.add(frame);
  g.add(plainBox(w - 0.03, h - 0.03, 0.01, mat('#f8f6f1', 0.9, 0.0), 0, cy, d * 0.3));                // マット
  const pw = w * 0.62, ph = h * 0.62;
  const colors = [color, shade(color, 1.4), '#e8b86d', shade(color, 0.7)];
  g.add(plainBox(pw, ph, 0.006, mat('#efe9df', 0.85), 0, cy, d * 0.33));
  [[0, -0.12, 0.5, 0.5], [0.25, 0.08, 0.28, 0.42], [-0.2, 0.12, 0.3, 0.32], [0.06, -0.06, 0.18, 0.18]].forEach(([bx, by, bw, bh], i) => {
    const bl = plainBox(bw * pw, bh * ph, 0.006, mat(colors[i % colors.length], 0.7), bx * pw, cy + by * ph, d * 0.36); bl.userData.colorable = (i === 0); g.add(bl);
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
// ---- ガラス棚 (IKEA BILLY/OXBERG 本棚 ガラス扉付き 80×30×202 風): BILLY本体(本入り) + 幅40cmのガラス扉2枚 ----
function buildGlassCabinet({ color='#f3ece0', w=0.8, d=0.3, h=2.02 } = {}) {
  const g = buildBookshelf({ color, w, d, h });
  const frameM = mat(shade(color, 0.96), 0.6, 0.02), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xd0eaf8, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1 });
  const dz = d/2 + 0.012, dh = h - 0.10, dy = 0.07 + dh/2, T = 0.045;
  [-1, 1].forEach(s => {
    const x = s * (w/4), dw = w/2 - 0.006;
    g.add(plainBox(dw - 2*T + 0.01, dh - 2*T + 0.01, 0.005, glassMat, x, dy, dz));                     // ガラス
    g.add(box(dw, T, 0.02, frameM, x, dy + dh/2 - T/2, dz)); g.add(box(dw, T, 0.02, frameM, x, dy - dh/2 + T/2, dz));   // 扉枠
    g.add(box(T, dh, 0.02, frameM, x - dw/2 + T/2, dy, dz)); g.add(box(T, dh, 0.02, frameM, x + dw/2 - T/2, dy, dz));
    const hd = cyl(0.006, 0.006, 0.12, 8, metal); hd.position.set(x - s*(dw/2 - 0.06), dy, dz + 0.02); g.add(hd);
  });
  return g;
}
// ---- オットマン (IKEA KIVIK フットスツール 90×70×43 風): 箱型の本体に厚いクッション, 低い脚(内部は収納) ----
function buildOttoman({ color='#c2b6a3', w=0.9, d=0.7, h=0.43 } = {}) {
  const g = new THREE.Group(); const fabric = fabricMat(color), wood = mat('#5c3d1e', 0.7);
  const base = new THREE.Mesh(roundedBoxGeom(w, h - 0.19, d, 0.05, 4), fabric); base.position.set(0, 0.04 + (h - 0.19)/2, 0); base.castShadow = true; base.userData.colorable = true; g.add(base);
  const cush = new THREE.Mesh(roundedBoxGeom(w - 0.02, 0.17, d - 0.02, 0.06, 4), fabric); cush.position.set(0, h - 0.085, 0); cush.castShadow = true; cush.userData.colorable = true; g.add(cush);
  [[-w/2+0.08,d/2-0.08],[-w/2+0.08,-(d/2-0.08)],[w/2-0.08,d/2-0.08],[w/2-0.08,-(d/2-0.08)]].forEach(([lx,lz]) => g.add(cylAt(0.025, 0.03, 0.04, 8, wood, lx, 0.02, lz)));
  return g;
}


// ---- PCモニター (Dell P2422H 23.8型 風): 矩形ベースプレート, 昇降スタンド, 細ベゼルの16:9パネル。外形 W538×D180×H496(最高位)。使う面 +Z ----
function buildMonitor({ color='#1c1c20', w=0.538, d=0.18, h=0.496 } = {}) {
  const g = new THREE.Group();
  const metal = mat('#8a9098', 0.25, 0.8, {env:0.9}), dark = mat(color, 0.4, 0.3);
  const PH = Math.min(h - 0.12, w * 9/16 + 0.02), cy = h - PH/2;                                       // パネル高(16:9 + ベゼル)
  g.add(box(0.24, 0.015, d, metal, 0, 0.0075, 0));                                                    // ベースプレート
  const colH = h - PH - 0.015 + 0.06;
  g.add(box(0.05, colH, 0.03, metal, 0, 0.015 + colH/2, -0.035));                                      // 支柱(昇降)
  g.add(box(0.10, 0.05, 0.03, dark, 0, cy - PH/2 + 0.06, -0.018));                                     // チルトヒンジ
  const panel = new THREE.Mesh(roundedBoxGeom(w, PH, 0.02, 0.006, 3), dark); panel.position.set(0, cy, 0.0); panel.castShadow = true; panel.userData.colorable = true; g.add(panel);
  g.add(box(w*0.7, PH*0.7, 0.03, mat(shade(color,1.15), 0.5, 0.2), 0, cy, -0.02));                     // 背面ハウジング
  g.add(box(w - 0.012, PH - 0.018, 0.006, mat('#080a0e', 0.08, 0.2), 0, cy + 0.003, 0.012));           // 画面
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.02, PH - 0.03), new THREE.MeshBasicMaterial({color:0x2a4a7a, transparent:true, opacity:0.65})); glow.position.set(0, cy + 0.003, 0.016); g.add(glow);
  const glow2 = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.14), new THREE.MeshBasicMaterial({color:0x6090c0, transparent:true, opacity:0.30})); glow2.position.set(-w*0.2, cy + 0.04, 0.017); g.add(glow2);
  const led = cyl(0.003, 0.003, 0.004, 6, mat('#e8e8e8', 0.5)); led.rotation.x = Math.PI/2; led.position.set(w*0.42, cy - PH/2 + 0.008, 0.012); g.add(led);
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
// ---- ドレッサー (IKEA HEMNES ドレッシングテーブル ミラー付き 100×50×159 風): 白い無垢材テーブル(天板高74, 幅広引き出し1段, ガラス天板)
//      + 支柱付きミラー(中央に小物棚)。使う面 +Z ----
function buildDresser({ color='#f3ece0', w=1.0, d=0.5, h=1.59 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.62, 0.02), woodD = mat(shade(color, 0.9), 0.6), metal = mat('#9aa0a4', 0.2, 0.8, {env:0.9});
  const TH = 0.74;
  [[w/2-0.05, d/2-0.05],[w/2-0.05,-(d/2-0.05)],[-(w/2-0.05), d/2-0.05],[-(w/2-0.05),-(d/2-0.05)]].forEach(([lx,lz]) => { const l = box(0.05, TH-0.03, 0.05, wood, lx, (TH-0.03)/2, lz); l.userData.colorable = true; g.add(l); });   // 脚
  g.add(box(w-0.10, 0.12, d-0.10, woodD, 0, TH-0.09, 0));                                             // 幕板
  const dr = box(w-0.24, 0.09, 0.02, mat(shade(color,1.06), 0.6), 0, TH-0.09, d/2-0.04); dr.userData.colorable = true; g.add(dr);   // 引き出し
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), metal); knob.position.set(0, TH-0.09, d/2-0.02); g.add(knob);
  const top = box(w, 0.03, d, wood, 0, TH-0.015, 0); top.userData.colorable = true; g.add(top);        // 天板
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 });
  g.add(box(w-0.02, 0.006, d-0.02, glass, 0, TH+0.003, 0));                                           // ガラス天板
  const MH = h - TH;                                                                                    // ミラー部
  [-1, 1].forEach(s => g.add(box(0.03, MH-0.02, 0.03, wood, s*0.23, TH + (MH-0.02)/2, -d/2+0.10)));    // 支柱
  g.add(box(0.46, 0.66, 0.03, woodD, 0, TH + 0.45, -d/2+0.10));                                         // 額縁
  g.add(box(0.40, 0.60, 0.012, mat('#c8d8e0', 0.04, 0.9, {env:1.3}), 0, TH + 0.45, -d/2+0.125));        // 鏡面
  g.add(box(0.46, 0.03, 0.14, wood, 0, TH + 0.10, -d/2+0.15));                                          // 小物棚
  g.add(cylAt(0.02, 0.018, 0.08, 10, mat('#d4a0b0', 0.3, 0.1), 0.12, TH + 0.155, -d/2+0.15));           // 香水瓶
  return g;
}
// ---- ハンガーラック (IKEA MULIG 99×46×151 風): 白いスチールパイプ。両端のH型フレーム(脚2本+上下の桟) + ハンガーバー + 下段バー。服3着付き ----
function buildHangerRack({ color='#f2f2f0', w=0.99, d=0.46, h=1.51 } = {}) {
  const g = new THREE.Group();
  const metal = mat(color, 0.4, 0.55, {env:0.6}); const R = 0.011;
  [-1, 1].forEach(s => {
    const x = s*(w/2 - R);
    [-1, 1].forEach(t => g.add(cylAt(R, R, h - 0.02, 10, metal, x, (h-0.02)/2, t*(d/2 - R))));           // 脚
    const foot = cylAt(R, R, d - 2*R, 10, metal, x, 0.06, 0); foot.rotation.x = Math.PI/2; g.add(foot);   // 足元の桟
    const topC = cylAt(R, R, d - 2*R, 10, metal, x, h - 0.02, 0); topC.rotation.x = Math.PI/2; g.add(topC); // 上部の桟
  });
  const bar = cylAt(R, R, w - 2*R, 12, metal, 0, h - 0.02, 0); bar.rotation.z = Math.PI/2; g.add(bar);   // ハンガーバー
  const low = cylAt(R*0.8, R*0.8, w - 2*R, 12, metal, 0, 0.06, 0); low.rotation.z = Math.PI/2; g.add(low); // 下段バー
  const hangM = mat('#5a4a3a', 0.6); const shirts = ['#5b86b8', '#e8e2d6', '#3f5d7a'];
  shirts.forEach((c, i) => {                                                                            // ハンガー + 服
    const hx = -0.26 + i*0.26;
    const hook = cyl(0.004, 0.004, 0.05, 6, hangM); hook.position.set(hx, h - 0.045, 0); g.add(hook);
    [-1, 1].forEach(s => { const arm = box(0.20, 0.008, 0.008, hangM, hx + s*0.10, h - 0.09, 0); arm.rotation.z = s*0.28; g.add(arm); });
    const sh = new THREE.Mesh(roundedBoxGeom(0.40, 0.62, 0.05, 0.02, 3), fabricMat(c)); sh.position.set(hx, h - 0.42, 0); sh.castShadow = true; g.add(sh);
  });
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
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
  // 脚の補強は左右の側面(奥行きz方向)に張る。+Z=椅子をしまう側の前後横木は入れず、椅子が干渉なく収まるようにする。
  [w/2-0.05, -(w/2-0.05)].forEach(rx => {
    const rail = cylAt(0.012, 0.012, d-0.1, 10, metal, rx, 0.14, 0); rail.rotation.x = Math.PI/2; g.add(rail);
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
