import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

// ---- 下駄箱 (IKEA HEMNES 靴収納 4コンパートメント 107×22×101 風): 2列×2段の手前に倒れるフラップ扉(丸ノブ), 前脚のみ, 天板は少し大きい。使う面 +Z ----
function buildShoeCabinet({ color='#f3ece0', w=1.07, d=0.22, h=1.01 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.62, 0.02), flapM = mat(shade(color, 1.04), 0.6, 0.02), edge = mat(shade(color, 0.9), 0.6), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const LEG = 0.08, T = 0.02, bodyH = h - LEG - 0.03;
  const body = box(w, bodyH, d, wood, 0, LEG + bodyH/2, 0); body.userData.colorable = true; g.add(body);
  const top = box(w + 0.03, 0.03, d + 0.015, edge, 0, h - 0.015, 0.0075); top.userData.colorable = true; g.add(top);
  [-1, 1].forEach(s => g.add(box(0.04, LEG, 0.04, wood, s*(w/2 - 0.03), LEG/2, d/2 - 0.03)));          // 前脚のみ(壁際の巾木をかわす)
  const cols = 2, rows = 2, fw = (w - 0.06)/cols - 0.02, fh = (bodyH - 0.06)/rows - 0.02;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = -w/2 + 0.03 + (fw + 0.02)*(c + 0.5), y = LEG + 0.03 + (fh + 0.02)*(r + 0.5);
    const flap = box(fw, fh, T, flapM, x, y, d/2 + T/2); flap.userData.colorable = true; g.add(flap);
    g.add(box(fw - 0.06, 0.008, 0.004, edge, x, y + fh/2 - 0.03, d/2 + T + 0.002));                    // 面取り風の溝
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 10), metal); knob.position.set(x, y, d/2 + T + 0.012); g.add(knob);
  }
  return g;
}
// ---- トイレ (TOTO ピュアレストQR 組み合わせ便器・手洗なし 風): 壁側にタンク(幅≒w), 前方に大形(エロンゲート)便器, 便座・フタ閉。
//      奥行 d = 壁から便器先端まで(760mm)。リム高 40cm。使う面 +Z(前) ----
function buildToilet({ color='#e8e2d6', w=0.418, d=0.76, h=0.817 } = {}) {
  const g = new THREE.Group(); const white = mat('#f6f5f1', 0.22, 0.05, { env: 0.5 }), lidM = mat('#fbfaf6', 0.3), chrome = mat('#cfd3d6', 0.25, 0.7, { env: 0.9 });
  const tankD = 0.18, tankH = 0.40;
  const tank = new THREE.Mesh(roundedBoxGeom(w, tankH, tankD, 0.02, 3), white); tank.position.set(0, h - tankH/2, -d/2 + tankD/2); tank.castShadow = true; g.add(tank);
  g.add(box(0.30, h - tankH, tankD - 0.02, white, 0, (h - tankH)/2, -d/2 + tankD/2 + 0.02));      // タンク下の便器後部(密結部)
  g.add(box(w - 0.02, 0.015, tankD - 0.02, mat('#f0eeea', 0.3), 0, h + 0.005, -d/2 + tankD/2));         // タンクふた
  g.add(box(0.05, 0.02, 0.03, chrome, w/2 - 0.06, h - 0.06, -d/2 + tankD + 0.015));                     // レバー
  const rim = 0.40, bowlL = d - tankD - 0.02, bowlCz = -d/2 + tankD + bowlL/2;
  const base = new THREE.Mesh(roundedBoxGeom(0.30, rim - 0.05, bowlL*0.55, 0.05, 4), white); base.position.set(0, (rim - 0.05)/2, bowlCz - bowlL*0.2); base.castShadow = true; g.add(base);   // 便器後部
  const bowl = cylAt(0.185, 0.14, rim - 0.06, 28, white, 0, (rim - 0.06)/2 + 0.02, bowlCz + 0.02); bowl.scale.z = (bowlL*0.5)/0.185; g.add(bowl);       // 楕円ボウル
  const seat = cylAt(0.19, 0.19, 0.035, 28, white, 0, rim + 0.02, bowlCz + 0.02); seat.scale.z = (bowlL*0.52)/0.19; g.add(seat);                       // 便座
  const lid = cylAt(0.185, 0.185, 0.02, 28, lidM, 0, rim + 0.05, bowlCz + 0.02); lid.scale.z = (bowlL*0.5)/0.185; g.add(lid);                          // フタ(閉)
  g.add(box(0.26, 0.05, 0.10, white, 0, rim + 0.03, -d/2 + tankD + 0.05));                              // ヒンジ部
  return g;
}
// ---- 手洗い器 (TOTO 壁掛手洗器 L870 幅460×奥行205mm 風): 壁付けの浅い矩形ボウル(リム高 = h-10cm), 立水栓, 壁面に給排水管。使う面 +Z ----
function buildHandBasin({ color='#e8e2d6', w=0.46, d=0.205, h=0.85 } = {}) {
  const g = new THREE.Group(); const white = mat('#f6f5f1', 0.22, 0.05, { env: 0.5 }), chrome = mat('#cfd3d6', 0.2, 0.85, { env: 1.0 });
  const rim = h - 0.10, bh = 0.14;
  const basin = new THREE.Mesh(roundedBoxGeom(w, bh, d, 0.03, 4), white); basin.position.set(0, rim - bh/2, 0); basin.castShadow = true; g.add(basin);
  g.add(box(w - 0.06, 0.01, d - 0.06, mat('#dfe3e4', 0.25, 0.1), 0, rim - 0.008, 0.01));               // ボウルの凹み
  g.add(cylAt(0.012, 0.012, 0.06, 10, chrome, 0, rim + 0.03, -d/2 + 0.03));                            // 立水栓
  g.add(box(0.02, 0.02, 0.07, chrome, 0, rim + 0.07, -d/2 + 0.055));
  g.add(cylAt(0.015, 0.015, rim - bh - 0.05, 10, chrome, 0.06, (rim - bh - 0.05)/2 + 0.02, -d/2 + 0.03)); // 排水管
  g.add(cylAt(0.008, 0.008, 0.20, 8, chrome, -0.10, rim - bh - 0.10, -d/2 + 0.02));                    // 給水管
  return g;
}
// ---- 洗面台 (LIXIL オフト 間口750 風): 開き戸+片引出しのキャビネット, ボウル一体カウンター(高さ81.5cm), シングルレバー水栓,
//      1面鏡(鏡扉+右側オープン棚, 上部照明)。全高 h=180cm。使う面 +Z ----
function buildVanity({ color='#f3ece0', w=0.75, d=0.5, h=1.8 } = {}) {
  const g = new THREE.Group(); const white = mat('#f4f2ee', 0.3, 0.05), wood = mat(color, 0.6), front = mat(shade(color, 1.06), 0.6), metal = mat('#cfd3d6', 0.2, 0.85, { env: 1.0 });
  const counterH = 0.815, KICK = 0.08;
  const cab = box(w, counterH - 0.03 - KICK, d - 0.02, wood, 0, KICK + (counterH - 0.03 - KICK)/2, -0.01); cab.userData.colorable = true; g.add(cab);
  g.add(box(w - 0.06, KICK, d - 0.08, mat(shade(color, 0.7), 0.6), 0, KICK/2, -0.03));                 // 台輪(蹴込み)
  const dwL = w*0.55 - 0.02, dwR = w*0.45 - 0.02, fz = d/2 - 0.005, fH = counterH - 0.03 - KICK - 0.02;
  const doorL = box(dwL, fH, 0.02, front, -w/2 + 0.01 + dwL/2, KICK + 0.01 + fH/2, fz); doorL.userData.colorable = true; g.add(doorL);   // 開き戸
  g.add(box(0.10, 0.008, 0.02, metal, -w/2 + 0.01 + dwL - 0.08, counterH - 0.10, fz + 0.015));
  [0, 1].forEach(i => {                                                                                  // 片引出し(2段)
    const dh = (fH - 0.02)/2, y = KICK + 0.01 + dh/2 + i*(dh + 0.02);
    const dr = box(dwR, dh, 0.02, front, w/2 - 0.01 - dwR/2, y, fz); dr.userData.colorable = true; g.add(dr);
    g.add(box(0.10, 0.008, 0.02, metal, w/2 - 0.01 - dwR/2, y + dh/2 - 0.03, fz + 0.015));
  });
  const counter = new THREE.Mesh(roundedBoxGeom(w, 0.03, d, 0.01, 3), white); counter.position.set(0, counterH - 0.015, 0); counter.castShadow = true; g.add(counter);   // カウンター
  const bowl = new THREE.Mesh(roundedBoxGeom(w - 0.16, 0.05, d - 0.16, 0.04, 4), mat('#e7eaea', 0.2, 0.1)); bowl.position.set(0, counterH - 0.02, 0.02); g.add(bowl);   // 大型ボウル
  g.add(box(w, 0.06, 0.02, white, 0, counterH + 0.03, -d/2 + 0.01));                                  // バックガード
  g.add(cylAt(0.014, 0.014, 0.10, 10, metal, 0, counterH + 0.05, -d/2 + 0.07)); g.add(box(0.02, 0.02, 0.12, metal, 0, counterH + 0.10, -d/2 + 0.12)); g.add(box(0.05, 0.01, 0.03, metal, 0, counterH + 0.11, -d/2 + 0.06));   // シングルレバー水栓
  const mY0 = counterH + 0.10, mH = h - mY0 - 0.02, mirD = 0.14;                                        // 1面鏡ユニット
  g.add(box(w, mH, mirD, mat('#f7f6f3', 0.5), 0, mY0 + mH/2, -d/2 + mirD/2));
  g.add(box(w*0.62, mH - 0.04, 0.01, mat('#cfe0e8', 0.04, 0.9, { env: 1.2 }), -w*0.19, mY0 + mH/2, -d/2 + mirD + 0.005));     // 鏡扉(左)
  [0.33, 0.55, 0.77].forEach(f => g.add(box(w*0.34, 0.012, mirD - 0.02, mat('#e6e3de', 0.6), w*0.33, mY0 + mH*f, -d/2 + mirD/2)));   // 右側オープン棚
  const lamp = box(w - 0.04, 0.03, 0.06, mat('#ffffff', 0.3, 0.1), 0, mY0 + mH - 0.03, -d/2 + mirD + 0.03); lamp.material.emissive = new THREE.Color('#fff4d6'); lamp.material.emissiveIntensity = 0.6; g.add(lamp);   // 照明
  return g;
}
// ---- 洗濯機 (Panasonic NA-FA8H3 縦型全自動 8kg 風): 白い箱体, 上面に大きなフタ(半透明の窓), 背面上部に操作パネル。使う面 +Z ----
function buildWasher({ color='#eceef0', w=0.564, d=0.573, h=1.022 } = {}) {
  const g = new THREE.Group(); const body = mat(color, 0.4, 0.1, { env: 0.4 }), dark = mat('#2a2f33', 0.3, 0.3), glass = new THREE.MeshStandardMaterial({ color: 0x8fa3b3, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.55 });
  const bodyH = h - 0.10;                                                                               // 操作パネル部を除いた高さ
  const b = new THREE.Mesh(roundedBoxGeom(w, bodyH - 0.06, d, 0.02, 3), body); b.position.set(0, 0.06 + (bodyH - 0.06)/2, 0); b.castShadow = true; b.userData.colorable = true; g.add(b);
  g.add(box(w - 0.06, 0.06, d - 0.06, mat('#c9ccce', 0.5), 0, 0.03, 0));                                // 脚部
  const topP = new THREE.Mesh(roundedBoxGeom(w - 0.02, 0.03, d - 0.02, 0.01, 3), mat(shade(color, 0.97), 0.4)); topP.position.set(0, bodyH - 0.015, 0); g.add(topP);
  g.add(box(w - 0.06, 0.012, d - 0.16, mat(shade(color, 1.02), 0.35, 0.1), 0, bodyH + 0.006, 0.03));    // フタ
  g.add(box(w - 0.14, 0.006, d - 0.26, glass, 0, bodyH + 0.014, 0.03));                                 // 半透明の窓
  g.add(box(0.12, 0.008, 0.02, dark, 0, bodyH + 0.014, d/2 - 0.05));                                    // フタの取っ手
  g.add(box(w - 0.02, 0.10, 0.12, mat(shade(color, 0.96), 0.4), 0, bodyH + 0.05, -d/2 + 0.06));         // 操作パネル(背面上部)
  g.add(box(w - 0.12, 0.05, 0.005, dark, 0, bodyH + 0.055, -d/2 + 0.123));                              // 表示部
  const kn = cylAt(0.018, 0.018, 0.006, 12, mat('#7fd4ff', 0.3, 0.2), w/2 - 0.08, bodyH + 0.055, -d/2 + 0.125); kn.rotation.x = Math.PI/2; g.add(kn);
  g.add(box(w - 0.10, 0.03, 0.01, mat('#d5d8da', 0.5), 0, 0.12, d/2 + 0.002));                          // 前面下のライン
  return g;
}
// ---- 浴槽 (TOTO 洋風バス ポリバス 1600 P1030 風: 長さ1640×幅820×高さ465mm, 二方全エプロン)。長手 = d ----
function buildBathtub({ color='#b9714a', w=0.82, d=1.64, h=0.465 } = {}) {
  const g = new THREE.Group(); const shell = mat('#f3f0ea', 0.25, 0.05, { env: 0.5 }), water = new THREE.MeshStandardMaterial({ color: 0x9ad3e6, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.5 });
  const outer = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.03, 4), shell); outer.position.set(0, h/2, 0); outer.castShadow = true; outer.userData.colorable = true; g.add(outer);
  g.add(box(w-0.12, h*0.7, d-0.12, mat('#dfe6e6', 0.2, 0.1), 0, h/2+0.06, 0));                          // 内側
  const surf = box(w-0.16, 0.02, d-0.16, water, 0, h-0.08, 0); g.add(surf);                              // 水面
  g.add(box(w+0.02, 0.04, d+0.02, mat('#fbfaf6', 0.2), 0, h, 0));                                        // リム
  return g;
}
// ---- ユニットバス (LIXIL リノビオV 1616 風: 内寸1600×1600, 天井高2005): 壁2面 + 1600浴槽 + カウンター/鏡 + シャワー + 洗い場の床 ----
function buildBathSet({ color='#e8e2d6', w=1.6, d=1.6, h=2.05 } = {}) {
  const g = new THREE.Group();
  const panel = mat('#eef0f1', 0.35, 0.05, { env: 0.4 }), metal = mat('#cfd3d6', 0.2, 0.85, { env: 1.0 }), floorM = mat('#d8dbdc', 0.7, 0.05);
  g.add(box(0.04, h, d, panel, -w/2+0.02, h/2, 0));                                                     // 壁(左)
  g.add(box(w, h, 0.04, panel, 0, h/2, -d/2+0.02));                                                     // 壁(奥)
  g.add(box(w - 0.04, 0.02, d - 0.04, floorM, 0.02, 0.01, 0.02));                                       // 洗い場の床(キレイサーモフロア風)
  const tub = buildBathtub({ color: '#cfe0e8', w: 0.75, d: d - 0.04, h: 0.55 }); tub.position.set(w/2 - 0.395, 0, 0.02); g.add(tub);   // 1600浴槽
  g.add(box(0.60, 0.04, 0.24, mat('#f4f4f2', 0.4), -w/2 + 0.34, 0.70, -d/2 + 0.16));                    // カウンター
  g.add(box(0.04, 0.9, 0.04, metal, -w/2+0.16, 1.4, -d/2+0.08));                                        // シャワースライドバー
  g.add(cylAt(0.05, 0.04, 0.03, 16, metal, -w/2+0.16, 1.85, -d/2+0.12));                                // シャワーヘッド
  g.add(box(0.44, 0.60, 0.02, mat('#cfe0e8', 0.04, 0.9, { env: 1.2 }), -w/2 + 0.34, 1.25, -d/2 + 0.05)); // 鏡
  g.add(box(0.32, 0.04, 0.26, mat('#dcdee0', 0.4), -w/2+0.45, 0.24, d/2-0.4));                          // 風呂椅子
  [[-w/2+0.32,d/2-0.5],[-w/2+0.58,d/2-0.5],[-w/2+0.32,d/2-0.3],[-w/2+0.58,d/2-0.3]].forEach(([lx,lz])=>g.add(box(0.03,0.24,0.03,mat('#cfd3d6',0.4),lx,0.12,lz)));
  return g;
}
function buildCloset({ color='#f3ece0', w=1.6, d=0.6, h=2.2 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.65), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const body = box(w, h, d, wood, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  g.add(box(w+0.06, 0.08, d+0.04, mat(shade(color,0.85), 0.6), 0, h-0.04, 0)); // top frame
  // two sliding doors, offset in depth and shade — stored for animation
  const dw = w/2 - 0.02;
  const slideL = box(dw, h-0.16, 0.04, mat(shade(color,1.05), 0.6), -dw/2, h/2-0.04, d/2-0.01); slideL.userData.colorable = true; g.add(slideL);
  const slideR = box(dw, h-0.16, 0.04, mat(shade(color,0.88), 0.6), dw/2, h/2-0.04, d/2+0.025); slideR.userData.colorable = true; g.add(slideR);
  [[-dw/2,d/2+0.01],[dw/2,d/2+0.045]].forEach(([dx,dz],i)=>{ const hd=cyl(0.01,0.01,0.5,10,metal); hd.position.set(dx + (i?-dw/2+0.06:dw/2-0.06), h/2, dz); g.add(hd); });
  g.userData.parts = { slideL, slideR, slideRange: dw * 0.82 };
  return g;
}
// ---- 食器棚 (ニトリ キッチンボード レジューム 幅90 風): 下台(高さ95cm: 開き戸2枚) + カウンター + 中段オープン(家電置き, 背面パネル)
//      + 上台(ガラス開き戸2枚)。全高201cm。扉は parts.lowerL/lowerR/upperL/upperR で開閉アニメ。使う面 +Z ----
function buildCupboard({ color='#f3ece0', w=0.9, d=0.51, h=2.01 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.65), front = mat(shade(color,1.06), 0.6), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xbcd3dc, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35 });
  const LOW = 0.95, OPEN = 0.50, UPD = Math.min(d, 0.40);                                                // 下台高 / 中段オープン高 / 上台奥行
  const lower = box(w, LOW, d, wood, 0, LOW/2, 0); lower.userData.colorable = true; g.add(lower);        // 下台
  g.add(box(w + 0.01, 0.03, d + 0.01, mat(shade(color, 0.92), 0.55), 0, LOW + 0.015, 0));                // カウンター
  const upY0 = LOW + 0.03 + OPEN, upH = h - upY0;
  const upper = box(w, upH, UPD, wood, 0, upY0 + upH/2, -d/2 + UPD/2); upper.userData.colorable = true; g.add(upper);   // 上台
  [-1, 1].forEach(s => g.add(box(0.025, OPEN, UPD, wood, s*(w/2 - 0.0125), LOW + 0.03 + OPEN/2, -d/2 + UPD/2)));       // 中段の側板
  g.add(box(w - 0.05, OPEN, 0.012, mat(shade(color, 0.96), 0.7), 0, LOW + 0.03 + OPEN/2, -d/2 + 0.006));               // 中段の背面パネル
  g.add(box(0.07, 0.05, 0.01, mat('#f8f8f6', 0.6), w/2 - 0.12, LOW + 0.30, -d/2 + 0.013));                             // コンセント
  g.add(box(0.30, 0.10, 0.20, mat('#2b2d30', 0.4, 0.3), 0, LOW + 0.03 + 0.05, 0.02));                                    // 家電(トースター)
  const mkDoor = (x0, y, dw, dh, z, hinge, m) => { const p = new THREE.Group(); p.position.set(x0, y, z); const dm = box(dw, dh, 0.02, m, hinge*dw/2, 0, 0); dm.userData.colorable = (m === front); p.add(dm); const hd = cyl(0.006, 0.006, 0.12, 8, metal); hd.position.set(hinge*(dw - 0.05), 0, 0.02); p.add(hd); g.add(p); return p; };
  const ldw = w/2 - 0.02, udw = w/2 - 0.02;
  const lowerL = mkDoor(-w/2 + 0.01, LOW/2, ldw, LOW - 0.05, d/2 + 0.005,  1, front);
  const lowerR = mkDoor( w/2 - 0.01, LOW/2, ldw, LOW - 0.05, d/2 + 0.005, -1, front);
  const uz = -d/2 + UPD + 0.005;
  const upperL = mkDoor(-w/2 + 0.01, upY0 + upH/2, udw, upH - 0.05, uz,  1, glass);
  const upperR = mkDoor( w/2 - 0.01, upY0 + upH/2, udw, upH - 0.05, uz, -1, glass);
  for (let i = 0; i < 2; i++) g.add(box(w - 0.06, 0.018, UPD - 0.06, mat(shade(color, 0.88), 0.7), 0, upY0 + 0.18 + i*0.17, -d/2 + UPD/2));   // 上台の棚板
  g.userData.parts = { lowerL, lowerR, upperL, upperR };
  return g;
}
// ---- システムキッチン (LIXIL シエラS 壁付I型 間口2400 風): ステンレスワークトップ(高さ85cm), 左にシンク, 右にビルトイン3口コンロ,
//      手前はシンク下開き戸 + 引き出し(スライドストッカー)。使う面 +Z ----
function buildKitchenCounter({ color='#e8e2d6', w=2.4, d=0.65, h=0.85 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.55, 0.02), front = mat(shade(color, 1.05), 0.55, 0.02), steel = mat('#c9ced2', 0.25, 0.85, { env: 1.0 }), dark = mat('#1a1c1f', 0.3, 0.3), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const TOP = 0.04, KICK = 0.10;
  const cab = box(w, h - TOP - KICK, d - 0.02, wood, 0, KICK + (h - TOP - KICK)/2, -0.01); cab.userData.colorable = true; g.add(cab);
  g.add(box(w - 0.04, KICK, d - 0.10, mat('#6d6a66', 0.6), 0, KICK/2, -0.05));                          // 台輪(蹴込み)
  g.add(box(w + 0.01, TOP, d + 0.01, steel, 0, h - TOP/2, 0));                                          // ワークトップ
  const sx = -w/2 + 0.55;                                                                                // シンク(左)
  g.add(box(0.68, 0.006, 0.42, mat('#8f969b', 0.3, 0.8), sx, h + 0.001, 0.02));
  g.add(box(0.64, 0.16, 0.38, mat('#a9b0b5', 0.35, 0.7), sx, h - 0.09, 0.02));
  g.add(cylAt(0.014, 0.014, 0.18, 10, steel, sx, h + 0.09, -d/2 + 0.10)); g.add(box(0.02, 0.02, 0.16, steel, sx, h + 0.17, -d/2 + 0.17));   // 水栓
  const cx = w/2 - 0.45;                                                                                 // ビルトインコンロ(右, 60cm)
  g.add(box(0.60, 0.008, 0.46, dark, cx, h + 0.002, 0.0));
  [[-0.17, 0.07, 0.07], [0.17, 0.07, 0.07], [0, -0.14, 0.06]].forEach(([bx, bz, r]) => { g.add(cylAt(r, r, 0.006, 16, mat('#3a3d40', 0.5, 0.4), cx + bx, h + 0.008, bz)); g.add(cylAt(r*0.35, r*0.35, 0.02, 10, mat('#2a2c2e', 0.5, 0.5), cx + bx, h + 0.016, bz)); });
  const fz = d/2 - 0.005, fH = h - TOP - KICK - 0.02, fy0 = KICK + 0.01;
  const knob = (x, y) => { const k = cylAt(0.012, 0.012, 0.02, 10, metal, x, y, fz + 0.015); k.rotation.x = Math.PI/2; g.add(k); };
  const panel = (x, y, pw, ph) => { const p = box(pw, ph, 0.02, front, x, y, fz); p.userData.colorable = true; g.add(p); g.add(box(Math.min(0.30, pw - 0.10), 0.008, 0.02, metal, x, y + ph/2 - 0.03, fz + 0.015)); };
  const zw = 0.88, mw = w - 2*zw - 0.04;
  [-1, 1].forEach(s => panel(-w/2 + 0.02 + zw/4 + (s > 0 ? zw/2 : 0), fy0 + fH/2, zw/2 - 0.01, fH));    // シンク下: 開き戸2枚
  if (mw > 0.2) for (let i = 0; i < 3; i++) { const dh = (fH - 0.04)/3; panel(0, fy0 + dh/2 + i*(dh + 0.02), mw - 0.01, dh); }   // 中央: 引き出し3段
  g.add(box(0.56, 0.16, 0.02, dark, cx, h - TOP - 0.10, fz)); g.add(box(0.30, 0.012, 0.02, metal, cx, h - TOP - 0.10, fz + 0.015));   // グリル扉
  [-0.25, -0.19, 0.22].forEach(kx => knob(cx + kx, h - TOP - 0.10));
  const cdh = (fH - 0.22 - 0.02)/2; [0, 1].forEach(i => panel(cx, fy0 + cdh/2 + i*(cdh + 0.02), zw - 0.01, cdh));   // コンロ下: 引き出し2段
  return g;
}
// ---- ガスコンロ (リンナイ ガステーブル RT64JH 59cm・2口・水無し片面焼グリル 外形W596×D452×H218mm) を
//      汎用コンロ台(ステンレス W600×D550×H≒650mm)に載せた状態。使う面 +Z ----
function buildGasStove({ color='#3a332b', w=0.6, d=0.55, h=0.87 } = {}) {
  const g = new THREE.Group();
  const stand = mat('#c9ced2', 0.3, 0.8, { env: 0.9 }), body = mat(color, 0.35, 0.35), glass = mat('#111315', 0.1, 0.4), metal = mat('#7a8088', 0.3, 0.8, { env: 0.9 }), dark = mat('#1f2224', 0.5, 0.3);
  const GW = 0.596, GD = 0.452, GH = 0.218, SH = h - GH;                                                // ガステーブル外形 / 台の高さ
  g.add(box(w, 0.03, d, stand, 0, SH - 0.015, 0));                                                      // コンロ台
  [[-w/2+0.02, d/2-0.02],[w/2-0.02, d/2-0.02],[-w/2+0.02, -(d/2-0.02)],[w/2-0.02, -(d/2-0.02)]].forEach(([x,z]) => g.add(box(0.03, SH - 0.03, 0.03, stand, x, (SH-0.03)/2, z)));
  g.add(box(w - 0.06, 0.02, d - 0.06, stand, 0, 0.25, 0)); g.add(box(w - 0.06, 0.02, d - 0.06, stand, 0, 0.02, 0));
  const gz = -d/2 + GD/2 + 0.05;
  const b = new THREE.Mesh(roundedBoxGeom(GW, GH - 0.02, GD, 0.01, 3), body); b.position.set(0, SH + (GH - 0.02)/2, gz); b.castShadow = true; b.userData.colorable = true; g.add(b);
  g.add(box(GW - 0.01, 0.02, GD - 0.01, glass, 0, SH + GH - 0.01, gz));                                  // ガラストップ
  [[-0.16, 0.0], [0.16, 0.0]].forEach(([bx, bz]) => {                                                    // バーナー2口 + 五徳
    g.add(cylAt(0.085, 0.085, 0.006, 20, dark, bx, SH + GH + 0.003, gz + bz)); g.add(cylAt(0.032, 0.032, 0.018, 10, metal, bx, SH + GH + 0.012, gz + bz));
    for (let i = 0; i < 5; i++) { const a = i/5*Math.PI*2; const bar = box(0.075, 0.006, 0.006, dark, bx + Math.cos(a)*0.045, SH + GH + 0.012, gz + bz + Math.sin(a)*0.045); bar.rotation.y = -a; g.add(bar); }
  });
  g.add(box(0.30, 0.09, 0.02, mat(shade(color, 1.2), 0.3, 0.4), 0.0, SH + 0.075, gz + GD/2 + 0.005));   // グリル扉
  g.add(box(0.20, 0.012, 0.02, metal, 0.0, SH + 0.115, gz + GD/2 + 0.015));                              // グリル取っ手
  [-0.25, -0.19, 0.22].forEach(kx => { const k = cylAt(0.014, 0.014, 0.025, 12, metal, kx, SH + 0.06, gz + GD/2 + 0.012); k.rotation.x = Math.PI/2; g.add(k); });   // 点火つまみ
  return g;
}
// ---- 電子レンジ (Panasonic NE-MS4C オーブンレンジ 26L 風: W470×D390×H350mm): 大きな窓の扉 + 右側の操作パネル(ダイヤル)。使う面 +Z ----
function buildMicrowave({ color='#3a332b', w=0.47, d=0.39, h=0.35 } = {}) {
  const g = new THREE.Group(); const body = mat(color, 0.4, 0.2), glass = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.75 }), metal = mat('#9aa0a4', 0.3, 0.8, { env: 0.9 });
  const b = box(w, h, d, body, 0, h/2, 0); b.userData.colorable = true; g.add(b);
  g.add(box(w*0.70, h-0.04, 0.02, mat(shade(color, 1.1), 0.4, 0.2), -w*0.12, h/2, d/2+0.005));          // 扉
  g.add(box(w*0.56, h-0.10, 0.01, glass, -w*0.12, h/2, d/2+0.017));                                     // 窓
  g.add(box(0.012, h-0.09, 0.02, metal, w*0.20, h/2, d/2+0.025));                                       // 取っ手
  g.add(box(w*0.22, h-0.04, 0.015, mat('#1c1f22', 0.4), w/2-0.06, h/2, d/2+0.005));                     // 操作パネル
  const dial = cylAt(0.022, 0.022, 0.012, 14, metal, w/2-0.06, h*0.42, d/2+0.018); dial.rotation.x = Math.PI/2; g.add(dial);   // ダイヤル
  for (let i = 0; i < 3; i++) g.add(box(0.05, 0.012, 0.006, mat('#4a4d50', 0.5), w/2-0.06, h*0.62+i*0.035, d/2+0.014));
  return g;
}
// ---- 炊飯器 (象印 極め炊き NW-VD10 5.5合 IH 風: W255×D375×H205mm): 角の丸い箱型, 上面にフタ(前部に操作パネル), 背面に蒸気口。使う面 +Z ----
function buildRiceCooker({ color='#f0eee9', w=0.255, d=0.375, h=0.205 } = {}) {
  const g = new THREE.Group(); const body = mat(color, 0.4, 0.15, { env: 0.4 }), dark = mat('#2a2f33', 0.3, 0.2), metal = mat('#9aa0a4', 0.3, 0.8, { env: 0.9 });
  const b = new THREE.Mesh(roundedBoxGeom(w, h - 0.05, d, 0.03, 4), body); b.position.set(0, (h - 0.05)/2, 0); b.castShadow = true; b.userData.colorable = true; g.add(b);
  const lid = new THREE.Mesh(roundedBoxGeom(w - 0.01, 0.05, d - 0.02, 0.02, 4), mat(shade(color, 0.97), 0.35, 0.15)); lid.position.set(0, h - 0.025, 0); lid.castShadow = true; g.add(lid);
  g.add(box(w - 0.06, 0.004, 0.09, dark, 0, h + 0.002, d/2 - 0.08));                                     // 操作パネル
  const disp = box(0.04, 0.002, 0.012, mat('#ff8a3c', 0.5, 0.1), 0, h + 0.005, d/2 - 0.06); disp.material.emissive = new THREE.Color('#ff6a00'); disp.material.emissiveIntensity = 0.6; g.add(disp);
  g.add(box(0.05, 0.012, 0.02, metal, 0, h - 0.01, d/2 - 0.005));                                        // 開閉ボタン
  g.add(cylAt(0.02, 0.02, 0.006, 12, dark, 0, h + 0.003, -d/2 + 0.05));                                  // 蒸気口
  return g;
}
// ---- 冷蔵庫 (Panasonic NR-C344C 335L 3ドア 右開き 風: W590×D633×H1687mm): 上=冷蔵室(開き戸), 中=野菜室(引き出し), 下=冷凍室(引き出し)。使う面 +Z ----
function buildFridge({ color='#f2f1ee', w=0.59, d=0.633, h=1.687 } = {}) {
  const g = new THREE.Group(); const body = mat(color, 0.35, 0.25, { env: 0.6 }), face = mat(shade(color, 1.03), 0.3, 0.3, { env: 0.6 }), gap = mat('#9a9a98', 0.5), dark = mat('#2b2d30', 0.5, 0.3);
  const b = new THREE.Mesh(roundedBoxGeom(w, h - 0.06, d, 0.012, 3), body); b.position.set(0, 0.06 + (h - 0.06)/2, 0); b.castShadow = true; b.userData.colorable = true; g.add(b);
  g.add(box(w - 0.08, 0.06, d - 0.10, dark, 0, 0.03, -0.03));                                           // 脚部
  const fz = d/2 + 0.006;
  [[0.06, 0.34], [0.40, 0.36], [0.76, h - 0.76 - 0.01]].forEach(([y0, sh], i) => {                     // [下端, 高さ]: 冷凍室 / 野菜室 / 冷蔵室
    const f = box(w - 0.01, sh - 0.008, 0.012, face, 0, y0 + sh/2, fz); f.userData.colorable = true; g.add(f);
    if (i < 2) g.add(box(w - 0.10, 0.02, 0.02, gap, 0, y0 + sh - 0.03, fz + 0.012));                     // 引き出しの取っ手(上端の凹み)
    else g.add(box(0.02, sh - 0.30, 0.02, gap, -w/2 + 0.04, y0 + sh/2, fz + 0.012));                     // 冷蔵室の縦取っ手(左側 = 右開き)
  });
  return g;
}
// ---- 壁掛けテレビ (REGZA 55E770S スタンドなし 風: W1226×H711×D77mm, 15.4kg): 壁掛け金具 + 薄型パネル。画面中心高 1.35m。使う面 +Z ----
function buildWallTV({ color='#1c1c1f', w=1.226, d=0.08, h=0.711 } = {}) {
  const g = new THREE.Group(); const frame = mat(color, 0.3, 0.5, { env: 0.7 }), screen = mat('#08090c', 0.08, 0.25), metal = mat('#444', 0.4, 0.6);
  const cy = 1.35; // mounted height above floor
  g.add(box(0.30, 0.30, 0.02, metal, 0, cy, 0.01));                                                     // 壁掛け金具(VESA)
  g.add(box(0.06, 0.24, 0.02, metal, 0, cy, 0.03));
  const body = box(w, h, 0.032, frame, 0, cy, d - 0.02); body.userData.colorable = true; g.add(body);    // パネル(最薄部 7.7cm 以内)
  g.add(box(w*0.85, h*0.55, 0.03, mat('#26272a', 0.5, 0.4), 0, cy - h*0.2, d - 0.05));                  // 背面ハウジング
  g.add(box(w-0.012, h-0.012, 0.006, screen, 0, cy, d - 0.001));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w-0.03, h-0.03), new THREE.MeshBasicMaterial({ color: 0x2c4a6a, transparent: true, opacity: 0.6 })); glow.position.set(0, cy, d + 0.003); g.add(glow);
  const glow2 = new THREE.Mesh(new THREE.PlaneGeometry((w-0.03)*0.45, (h-0.03)*0.55), new THREE.MeshBasicMaterial({ color: 0x6a90c0, transparent: true, opacity: 0.32 })); glow2.position.set(-w*0.14, cy+0.05, d + 0.004); g.add(glow2);
  g.add(box(0.10, 0.008, 0.004, mat('#9aa0a4', 0.22, 0.85, { env: 1.0 }), 0, cy - h/2 + 0.02, d + 0.002));   // ロゴ
  return g;
}


// ---- 壁掛けエアコン (ダイキン Eシリーズ 6畳用 S224ATES 室内機 風: W798×H250×D255mm)。天井際(上端 ≒2.45m)に取付。使う面 +Z ----
function buildWallAC({ color='#f2f2f0', w=0.798, d=0.255, h=0.25 } = {}) {
  const g = new THREE.Group();
  const cy = 2.32;
  // Body
  const bodyMesh = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.022, 3), mat(color, 0.45, 0.05));
  bodyMesh.position.set(0, cy, 0); bodyMesh.castShadow = true; bodyMesh.receiveShadow = true; bodyMesh.userData.colorable = true; g.add(bodyMesh);
  // Front-face horizontal intake slats (7)
  const slatMat = mat(shade(color, 0.78), 0.55);
  for (let i = 0; i < 7; i++) {
    g.add(box(w - 0.06, 0.009, 0.006, slatMat, 0, cy + h * 0.22 - i * 0.023, d / 2 + 0.002));
  }
  // Bottom output louver
  const louver = box(w - 0.04, 0.022, 0.09, mat(shade(color, 0.82), 0.5), 0, cy - h * 0.38, d / 2 - 0.015);
  louver.rotation.x = 0.42; g.add(louver);
  // Top intake grille (4 boxes evenly spaced in z)
  const grilleMat = mat(shade(color, 0.88), 0.5);
  const grilleZStart = -d / 2 + 0.012;
  const grilleZStep = (d - 0.024) / 3;
  for (let i = 0; i < 4; i++) {
    g.add(box(w - 0.1, 0.007, 0.016, grilleMat, 0, cy + h / 2 + 0.003, grilleZStart + i * grilleZStep));
  }
  // LED display strip (right side)
  g.add(box(0.14, 0.014, 0.005, mat('#18283c', 0.6, 0.1), w * 0.27, cy + h * 0.1, d / 2 + 0.003));
  // Glow box
  g.add(box(0.07, 0.009, 0.007, mat('#0099dd', 0.3, 0.5), w * 0.27, cy + h * 0.1, d / 2 + 0.004));
  // IR sensor
  const sensor = cyl(0.007, 0.007, 0.006, 8, mat('#0a0e14', 0.6));
  sensor.rotation.x = Math.PI / 2; sensor.position.set(-w * 0.4, cy, d / 2 + 0.003); g.add(sensor);
  return g;
}

// ---- エスプレッソマシン (デロンギ マグニフィカS ECAM22112 全自動 風): W238×D430×H350。上面に豆ホッパー, 前面上部に操作パネル,
//      中央に高さ調節できる抽出口, 下部にカップ受けトレイ, 右側面に給水タンク, スチームノズル。使う面 +Z ----
function buildEspressoMachine({ color='#2a2a2e', w=0.238, d=0.43, h=0.35 } = {}) {
  const g = new THREE.Group();
  const bodyMat = mat(color, 0.35, 0.5, { env: 0.8 }), chromeMat = mat('#c8ccd0', 0.15, 0.85, { env: 1.1 }), dark = mat('#141416', 0.5, 0.3);
  const body = new THREE.Mesh(roundedBoxGeom(w, h, d - 0.02, 0.015, 3), bodyMat); body.position.set(0, h/2, -0.01); body.castShadow = true; body.userData.colorable = true; g.add(body);
  g.add(cylAt(0.06, 0.06, 0.012, 20, mat(shade(color, 1.3), 0.3, 0.3), 0, h + 0.006, -0.06));         // 豆ホッパーのふた
  g.add(box(w - 0.03, 0.01, 0.08, mat(shade(color, 1.2), 0.4, 0.3), 0, h + 0.005, d/2 - 0.08));        // 上面のパウダー投入口
  g.add(box(w - 0.04, 0.07, 0.008, dark, 0, h - 0.06, d/2 - 0.014));                                   // 操作パネル
  [-0.07, -0.035, 0.0, 0.035, 0.07].forEach(x => { const b = cylAt(0.007, 0.007, 0.006, 10, chromeMat, x, h - 0.06, d/2 - 0.009); b.rotation.x = Math.PI/2; g.add(b); });
  const spout = new THREE.Mesh(roundedBoxGeom(0.07, 0.06, 0.05, 0.01, 3), dark); spout.position.set(0, h * 0.42, d/2 - 0.02); g.add(spout);   // 抽出口(上下可動)
  [-0.012, 0.012].forEach(x => g.add(cylAt(0.004, 0.004, 0.02, 8, chromeMat, x, h * 0.42 - 0.04, d/2 - 0.01)));
  g.add(box(w - 0.02, 0.03, 0.12, dark, 0, 0.015, d/2 - 0.07));                                        // 受けトレイ
  g.add(box(w - 0.06, 0.006, 0.09, chromeMat, 0, 0.033, d/2 - 0.07));                                  // トレイのグリル
  g.add(cylAt(0.028, 0.024, 0.06, 16, mat('#f4f1ea', 0.6), 0, 0.066, d/2 - 0.07));                     // カップ
  g.add(box(0.015, h * 0.8, 0.09, new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.5 }), w/2 + 0.006, h * 0.45, -0.08));   // 給水タンク(右側面)
  const wand = cyl(0.006, 0.006, 0.11, 8, chromeMat); wand.position.set(w/2 + 0.02, h * 0.55, 0.08); wand.rotation.x = 0.5; wand.rotation.z = 0.35; g.add(wand);   // スチームノズル
  return g;
}

// ---- 食洗機 (ボッシュ 60cm ビルトイン SMV4ZDX016 風): W598×D550×H815, ステンレス面材のドア + 上部操作パネル。使う面 +Z ----
function buildDishwasher({ color='#e0e0dc', w=0.598, d=0.573, h=0.815 } = {}) {
  const g = new THREE.Group();
  const steelMat = mat('#c4c8cc', 0.22, 0.72, { env: 0.8 });
  const bodyMat = mat(color, 0.5, 0.06);
  // Main cabinet
  const cab = box(w, h, d, bodyMat, 0, h/2, 0); cab.userData.colorable = true; g.add(cab);
  // Front door panel
  g.add(box(w-0.02, h-0.08, 0.04, steelMat, 0, (h-0.08)/2, d/2-0.01));
  // Door handle bar
  g.add(box(w-0.1, 0.03, 0.04, mat('#9aa0a4',0.25,0.8,{env:0.9}), 0, h-0.07, d/2+0.01));
  // Control panel strip (top of door)
  g.add(box(w-0.02, 0.06, 0.045, mat('#2a2a2f', 0.4, 0.2), 0, h-0.04, d/2-0.008));
  // Status LED row
  const ledColors = [0x00cc44, 0xff8800, 0x0088ff];
  const ledXPos = [-0.05, 0, 0.05];
  ledColors.forEach((lc, i) => {
    const led = cylAt(0.005,0.005,0.006,6,new THREE.MeshStandardMaterial({color:lc,roughness:0.4,metalness:0.1,emissive:lc,emissiveIntensity:0.5}), ledXPos[i], h-0.04, d/2);
    led.rotation.x = Math.PI/2; g.add(led);
  });
  // Bottom vent
  g.add(box(w-0.04, 0.02, 0.035, mat('#1a1a1e',0.6), 0, 0.013, d/2+0.005));
  // Top cap
  g.add(box(w, 0.02, d, mat(shade(color,0.88),0.45), 0, h-0.01, 0));
  return g;
}

// ---- ロッカー (コクヨ LKロッカー 4人用 LK-4F1 風): W900×D515×H1790, 幅225mmの扉4枚(通気孔・名札・シリンダー錠), 台輪付き。使う面 +Z ----
function buildLockerUnit({ color='#c9cdd0', w=0.9, d=0.515, h=1.79 } = {}) {
  const g = new THREE.Group();
  const metalMat = mat(color, 0.38, 0.55, { env: 0.7 }), darkMat = mat('#2a2a2e', 0.5, 0.3), hdlM = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const body = box(w, h, d, metalMat, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  g.add(box(w - 0.04, 0.06, d - 0.06, mat(shade(color, 0.6), 0.5, 0.3), 0, 0.03, -0.03));             // 台輪(蹴込み)
  g.add(box(w + 0.01, 0.02, d + 0.01, mat(shade(color, 0.85), 0.4, 0.5), 0, h - 0.01, 0));           // 天板
  const n = Math.max(1, Math.round(w / 0.225)), dw = w / n;
  for (let i = 0; i < n; i++) {
    const x = -w/2 + dw*(i + 0.5);
    const door = box(dw - 0.008, h - 0.10, 0.02, mat(shade(color, 1.06), 0.42, 0.5), x, 0.07 + (h - 0.10)/2, d/2 + 0.005); door.userData.colorable = true; g.add(door);
    for (let j = 0; j < 4; j++) { g.add(box(dw - 0.09, 0.006, 0.006, darkMat, x, h - 0.16 - j*0.018, d/2 + 0.016)); g.add(box(dw - 0.09, 0.006, 0.006, darkMat, x, 0.24 + j*0.018, d/2 + 0.016)); }   // 通気孔(上下)
    g.add(box(0.06, 0.03, 0.004, mat('#f5f0e0', 0.8), x, h - 0.10, d/2 + 0.016));                     // 名札
    g.add(box(0.02, 0.10, 0.012, hdlM, x + dw/2 - 0.04, h * 0.52, d/2 + 0.02));                        // 取っ手
    const key = cyl(0.007, 0.007, 0.01, 8, hdlM); key.rotation.x = Math.PI/2; key.position.set(x + dw/2 - 0.04, h * 0.52 + 0.08, d/2 + 0.02); g.add(key);   // シリンダー錠
  }
  return g;
}

function buildVendingMachine({ color='#e8e0d8', w=0.75, d=0.35, h=1.85 } = {}) {
  const g = new THREE.Group();
  const bodyMat = mat(color, 0.45, 0.1, { env: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xb8d4e0, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.35 });
  const darkMat = mat('#1a1a1e', 0.5, 0.2);
  // Cabinet body
  const cab = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.025, 3), bodyMat);
  cab.position.set(0, h/2, 0); cab.castShadow = true; cab.userData.colorable = true; g.add(cab);
  // Display window
  g.add(plainBox(w-0.14, h*0.52, 0.016, glassMat, 0, h*0.64, d/2-0.005));
  // Product rows behind glass
  const productColors = ['#e8242a','#f5a623','#4a90e2','#7ed321','#d0021b'];
  for (let j = 0; j < 4; j++) {
    g.add(box(w-0.22, 0.08, 0.04, mat(productColors[j%5], 0.7), 0, h*0.42+j*0.1, d/2-0.04));
  }
  // Interior glow
  const glow = new THREE.Mesh(new THREE.BoxGeometry(w-0.2, h*0.48, 0.01), new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.3 }));
  glow.position.set(0, h*0.62, d/2-0.06); g.add(glow);
  // Payment panel
  g.add(box(0.18, h*0.22, 0.04, mat('#1a1a1e',0.4), w*0.28, h*0.28, d/2-0.002));
  // Panel screen
  g.add(box(0.12, 0.08, 0.008, mat('#0a1828',0.3,0.15), w*0.28, h*0.34, d/2+0.022));
  // Coin slot
  g.add(box(0.06, 0.012, 0.012, darkMat, w*0.28, h*0.26, d/2+0.022));
  // Bill slot
  g.add(box(0.09, 0.018, 0.012, darkMat, w*0.28, h*0.22, d/2+0.022));
  // Dispense slot
  g.add(box(w-0.16, 0.05, 0.06, mat(shade(color,0.7),0.5), 0, 0.16, d/2-0.01));
  g.add(box(w-0.24, 0.04, 0.04, darkMat, 0, 0.16, d/2+0.006));
  // Coin return
  g.add(box(0.055, 0.04, 0.04, darkMat, -w*0.32, h*0.16, d/2-0.002));
  // Decorative stripe
  g.add(box(0.06, h-0.1, 0.025, mat('#e8242a', 0.6), -w/2+0.06, h/2, d/2-0.003));
  return g;
}

export { buildBathSet, buildBathtub, buildCloset, buildCupboard, buildDishwasher, buildEspressoMachine, buildFridge, buildGasStove, buildHandBasin, buildKitchenCounter, buildLockerUnit, buildMicrowave, buildRiceCooker, buildShoeCabinet, buildToilet, buildVanity, buildVendingMachine, buildWallAC, buildWallTV, buildWasher };
