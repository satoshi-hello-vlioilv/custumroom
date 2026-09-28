import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

function buildLabBench({ color='#f3ece0', w=2.0, d=0.75, h=0.85 } = {}) {
  const g = new THREE.Group();
  const cab = mat(shade(color, 0.92), 0.5), epoxy = mat('#2a2e2c', 0.4, 0.05), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const body = box(w, h - 0.1, d, cab, 0, (h - 0.1) / 2, 0); body.userData.colorable = true; g.add(body);
  g.add(box(w + 0.04, 0.04, d + 0.04, epoxy, 0, h - 0.02, 0)); // black epoxy worktop
  // reagent shelf rack above the bench
  [-w/2 + 0.05, w/2 - 0.05].forEach(x => g.add(box(0.04, 0.7, 0.04, metal, x, h + 0.35, -d/2 + 0.06)));
  g.add(box(w, 0.03, 0.2, mat(shade(color,1.05), 0.5), 0, h + 0.4, -d/2 + 0.1));
  g.add(box(w, 0.03, 0.2, mat(shade(color,1.05), 0.5), 0, h + 0.68, -d/2 + 0.1));
  // gooseneck faucet + sink at right
  g.add(box(0.34, 0.04, 0.3, mat('#0d1117', 0.3, 0.3), w/2 - 0.35, h, 0));
  g.add(box(0.03, 0.18, 0.03, metal, w/2 - 0.35, h + 0.1, -d/2 + 0.1));
  g.add(box(0.12, 0.03, 0.03, metal, w/2 - 0.30, h + 0.18, -d/2 + 0.14));
  // gas tap
  g.add(cylAt(0.02, 0.02, 0.1, 8, mat('#d9a23b', 0.5), -w/2 + 0.3, h + 0.07, -d/2 + 0.12));
  // drawers + door fronts
  const dn = 4;
  for (let i = 0; i < dn; i++) {
    const dx = -w/2 + w/dn * (i + 0.5);
    const fr = box(w/dn - 0.05, h - 0.24, 0.02, mat(shade(color, 1.06), 0.55), dx, (h - 0.1)/2, d/2 + 0.005); fr.userData.colorable = true; g.add(fr);
    g.add(box(0.16, 0.02, 0.02, metal, dx, h - 0.22, d/2 + 0.02));
  }
  [-w/2 + 0.04, w/2 - 0.04].forEach(x => g.add(box(0.05, 0.1, 0.05, mat('#555', 0.5), x, 0.05, d/2 - 0.06)));
  return g;
}
// ダルトン MAGBIT ドラフトチャンバー MDA15 (W1500×D850×H2450): 下部キャビネット + 黒い天板 + 白いフード本体,
// 前面の上下スライドサッシ(黒枠ガラス, 作業高さまで下げた状態), 上部の化粧パネル(風量モニタ), 天井の排気ダクト接続口。
function buildFumeHood({ color='#e8e2d6', w=1.5, d=0.85, h=2.45 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.45, 0.06), bodyD = mat(shade(color, 0.9), 0.5, 0.05), black = mat('#1b1d20', 0.45, 0.2), inner = mat('#dfe3e4', 0.6, 0.05);
  const steel = mat('#aab2b8', 0.3, 0.7, { env: 0.8 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xcfe3ea, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
  const topY = h - 0.15, workY = 0.82, side = 0.1, fz = d / 2;
  // 下部キャビネット (巾木 + 両開き扉 ×2)
  g.add(box(w - 0.04, 0.08, d - 0.06, black, 0, 0.04, -0.02));
  const cab = box(w, workY - 0.12, d - 0.02, body, 0, 0.08 + (workY - 0.12) / 2, -0.01); cab.userData.colorable = true; g.add(cab);
  for (let i = 0; i < 4; i++) { const x = -w / 2 + w / 8 + i * w / 4; g.add(box(w / 4 - 0.01, workY - 0.16, 0.012, bodyD, x, 0.08 + (workY - 0.12) / 2, fz - 0.01)); g.add(box(0.012, 0.12, 0.02, black, x + (i % 2 ? -1 : 1) * (w / 8 - 0.04), 0.55, fz + 0.003)); }
  g.add(box(w, 0.04, d, black, 0, workY - 0.02, 0));                                           // 天板 (セラミック/エポキシ, 黒)
  // フード本体: 側板 + 背板 + 天井
  [-1, 1].forEach(s => { const sp = box(side, topY - workY, d, body, s * (w / 2 - side / 2), workY + (topY - workY) / 2, 0); sp.userData.colorable = true; g.add(sp); });
  g.add(box(w - 2 * side, topY - workY, 0.04, inner, 0, workY + (topY - workY) / 2, -fz + 0.02));
  for (let i = 0; i < 3; i++) g.add(box(w - 2 * side - 0.1, 0.012, 0.01, mat('#9ea6aa', 0.6), 0, workY + 0.15 + i * 0.45, -fz + 0.045));   // バッフルのスリット
  const top = box(w, h - topY - 0.02, d, body, 0, topY + (h - topY - 0.02) / 2 - 0.06, 0); top.userData.colorable = true; g.add(top);
  // 上部化粧パネル (風量モニタ + 操作ボタン)
  g.add(box(w - 2 * side, 0.3, 0.03, body, 0, topY - 0.15, fz - 0.015));
  const lcd = new THREE.MeshStandardMaterial({ color: 0x0b1a10, emissive: new THREE.Color('#1fae5a'), emissiveIntensity: 0.6, roughness: 0.3 });
  g.add(box(0.2, 0.08, 0.01, black, w / 2 - side - 0.2, topY - 0.14, fz + 0.002));
  g.add(plainBox(0.16, 0.05, 0.004, lcd, w / 2 - side - 0.2, topY - 0.14, fz + 0.008));
  [0, 1, 2].forEach(i => g.add(cylAt(0.013, 0.013, 0.01, 12, mat(i === 0 ? '#22c55e' : '#e7e7e7', 0.4), w / 2 - side - 0.36 - i * 0.05, topY - 0.14, fz + 0.005).rotateX(Math.PI / 2)));
  // 前面サッシ (上下スライド: 下端を作業位置 天板+40cm まで下げた状態)
  const sashBot = workY + 0.4, sashTop = topY - 0.3;
  g.add(plainBox(w - 2 * side - 0.03, sashTop - sashBot, 0.01, glassM, 0, (sashBot + sashTop) / 2, fz - 0.035));
  [sashBot, sashTop].forEach(y => g.add(box(w - 2 * side - 0.02, 0.04, 0.03, black, 0, y, fz - 0.035)));
  [-1, 1].forEach(s => g.add(box(0.03, sashTop - sashBot, 0.03, black, s * (w / 2 - side - 0.02), (sashBot + sashTop) / 2, fz - 0.035)));
  g.add(box(w * 0.4, 0.025, 0.04, steel, 0, sashBot + 0.01, fz - 0.005));                           // サッシ取っ手
  g.add(box(w - 2 * side, 0.03, 0.04, black, 0, workY + 0.015, fz - 0.03));                        // エアフォイル
  // 庫内: 照明・カップシンク・給水/ガスコック
  const lampM = new THREE.MeshStandardMaterial({ color: 0xfaf8ee, emissive: new THREE.Color('#fff4d6'), emissiveIntensity: 0.6 });
  g.add(plainBox(w - 2 * side - 0.3, 0.01, 0.12, lampM, 0, topY - 0.005, 0.05));
  g.add(cylAt(0.06, 0.06, 0.01, 18, mat('#0e1012', 0.3), w / 2 - side - 0.2, workY + 0.004, -0.1));
  [[-1, '#2f7ad0'], [-1, '#d9a23b']].forEach(([s, c], i) => g.add(cylAt(0.014, 0.014, 0.06, 10, mat(c, 0.4), s * (w / 2 - side - 0.01), workY + 0.3 + i * 0.1, 0.1).rotateZ(Math.PI / 2)));
  // 天井の排気ダクト接続口 (φ250)
  g.add(cylAt(0.125, 0.125, 0.15, 24, steel, 0, h - 0.075, -0.12));
  g.add(cylAt(0.135, 0.135, 0.02, 24, steel, 0, h - 0.13, -0.12));
  return g;
}
// オリンパス(エビデント) CX23 教育用生物顕微鏡 (W198×D258×H384, 約6kg): アイボリーの本体 (台座 + 後ろの C 形アーム),
// 両側の同軸粗微動ハンドル, 黒いメカニカルステージ (右下に X/Y ハンドル) とアッベコンデンサ, 4 穴レボルバ (4×/10×/40×/100×),
// 30° 傾斜の双眼鏡筒 (接眼レンズ 10×)。使う人は手前 (+Z) に座る。実寸 (m) で作成。
function buildMicroscope({ color='#ece8df', w=0.198, d=0.258, h=0.384 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.4, 0.08, { env: 0.5 }), black = mat('#1a1c1f', 0.45, 0.25), chrome = mat('#c9ced3', 0.2, 0.9, { env: 1.0 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fd0e8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.6 });
  const rb = (bw, bh, bd, m, x, y, z, r = 0.008) => { const o = new THREE.Mesh(roundedBoxGeom(bw, bh, bd, r, 3), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const cx = (r, len, m, x, y, z) => { const c = cyl(r, r, len, 20, m); c.rotation.z = Math.PI / 2; c.position.set(x, y, z); g.add(c); return c; };
  const ax = 0, az = 0.035;                                              // 光軸 (ステージ中央)
  // 台座 (LED 照明内蔵) + フィールドレンズ + 右側面の明るさ調整ダイヤル
  const base = rb(Math.min(0.19, w - 0.008), 0.05, 0.236, body, 0, 0.025, -0.006, 0.014); base.userData.colorable = true;
  g.add(cylAt(0.016, 0.018, 0.008, 18, black, ax, 0.054, az)); g.add(cylAt(0.011, 0.011, 0.002, 18, glass, ax, 0.059, az));
  cx(0.016, 0.012, black, 0.098, 0.028, 0.05);
  // C 形アーム (後方) + ヘッドを支える上部
  const arm = rb(0.07, 0.25, 0.06, body, 0, 0.17, -0.082, 0.012); arm.userData.colorable = true;
  const armTop = rb(0.075, 0.04, 0.11, body, 0, 0.29, -0.04, 0.012); armTop.userData.colorable = true;
  // 同軸粗微動ハンドル (両側)
  [-1, 1].forEach(s => { cx(0.027, 0.018, black, s * 0.047, 0.11, -0.075); cx(0.017, 0.016, black, s * 0.064, 0.11, -0.075); });
  // メカニカルステージ + スライドホルダー + スライドガラス + X/Y ハンドル (右下) + ステージ支持
  rb(0.03, 0.03, 0.05, black, 0, 0.135, -0.045, 0.004);
  rb(0.14, 0.012, 0.13, black, 0, 0.146, az, 0.003);
  rb(0.05, 0.008, 0.014, black, -0.03, 0.156, az + 0.02, 0.002);
  g.add(plainBox(0.075, 0.0015, 0.025, glass, -0.005, 0.1528, az));
  [[0.012, 0.012], [0.009, 0.012]].forEach(([r, l], i) => g.add(cylAt(r, r, l, 14, black, 0.06, 0.118 - i * 0.012, az + 0.035)));
  g.add(cylAt(0.003, 0.003, 0.03, 8, chrome, 0.06, 0.13, az + 0.035));
  // アッベコンデンサ (ステージ下) + 開口絞りレバー
  g.add(cylAt(0.02, 0.016, 0.03, 18, black, ax, 0.123, az));
  g.add(plainBox(0.022, 0.003, 0.004, chrome, ax + 0.025, 0.118, az));
  // 4 穴レボルバ + 対物レンズ (色帯: 4× 赤 / 10× 黄 / 40× 水色 / 100× 白)
  g.add(cylAt(0.036, 0.024, 0.022, 20, chrome, ax, 0.245, az - 0.004));
  [['#d63a2a', 0, 0.034], ['#e8c21a', 1, 0.04], ['#4aa8e0', 2, 0.046], ['#f2f2f2', 3, 0.048]].forEach(([band, i, len]) => {
    const a = i * Math.PI / 2, tilt = i === 0 ? 0 : 0.35;
    const o = new THREE.Group(); o.position.set(ax + Math.sin(a) * 0.016 * (i ? 1 : 0), 0.234, az + Math.cos(a) * 0.016 * (i ? 1 : 0)); o.rotation.set(Math.cos(a) * tilt * (i ? 1 : 0), 0, -Math.sin(a) * tilt * (i ? 1 : 0)); g.add(o);
    const lens = cyl(0.0085, 0.0105, len, 14, chrome); lens.position.y = -len / 2; o.add(lens);
    const b = cyl(0.0107, 0.0107, 0.004, 14, mat(band, 0.4)); b.position.y = -len * 0.35; o.add(b);
  });
  // 鏡筒ベース + 30°傾斜の双眼鏡筒 + 接眼レンズ (10×) とアイカップ
  rb(0.085, 0.035, 0.1, body, ax, 0.272, az - 0.02, 0.01).userData.colorable = true;
  const tube = new THREE.Group(); tube.position.set(ax, 0.3, az - 0.015); tube.rotation.x = 0.52; g.add(tube);   // 上端を手前へ 30°
  const tb = new THREE.Mesh(roundedBoxGeom(0.1, 0.03, 0.05, 0.01, 3), body); tb.castShadow = true; tb.userData.colorable = true; tube.add(tb);
  [-1, 1].forEach(s => {
    const e = cyl(0.0115, 0.0115, 0.055, 16, black); e.position.set(s * 0.031, 0.04, 0); tube.add(e);
    const cup = cyl(0.014, 0.0125, 0.012, 16, mat('#0d0e10', 0.9)); cup.position.set(s * 0.031, 0.072, 0); tube.add(cup);
  });
  return g;
}
// 久保田商事 テーブルトップ遠心機 Model 2420 (W350×D420×H320): 角型ボディ + 丸いヒンジ蓋 + 前面傾斜の操作パネル
function buildCentrifuge({ color='#e8e2d6', w=0.35, d=0.42, h=0.32 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.45, 0.1, { env: 0.4 }), dark = mat('#2a2f33', 0.3, 0.2), metal = mat('#aab0b4', 0.3, 0.7);
  const bodyH = h - 0.05;
  const base = new THREE.Mesh(roundedBoxGeom(w, bodyH, d, 0.02, 3), body);
  base.position.y = bodyH / 2; base.castShadow = true; base.userData.colorable = true; g.add(base);
  // 前面の傾斜操作パネル (手前上部を斜めにカット)
  const panel = box(w - 0.04, 0.09, 0.02, dark, 0, bodyH - 0.03, d/2 - 0.02); panel.rotation.x = -0.35; g.add(panel);
  const disp = plainBox(0.09, 0.035, 0.006, mat('#0a2a2a', 0.5, 0.1), -0.06, bodyH - 0.02, d/2 - 0.005); disp.rotation.x = -0.35; g.add(disp);
  [0.03, 0.08].forEach((x, i) => { const k = cylAt(0.014, 0.014, 0.012, 10, mat(i ? '#3b82f6' : '#22c55e', 0.5), x, bodyH - 0.02, d/2 - 0.004); k.rotation.x = Math.PI/2 - 0.35; g.add(k); });
  // 丸いヒンジ蓋 (後ろ寄り) + 蓋のヒンジ・ラッチ
  const lidR = Math.min(w, d) / 2 - 0.03, lidZ = -d/2 + lidR + 0.05;
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(lidR - 0.01, lidR, 0.05, 28), mat(shade(color, 0.96), 0.4, 0.15));
  lid.position.set(0, bodyH + 0.025, lidZ); lid.castShadow = true; g.add(lid);
  g.add(cylAt(lidR - 0.03, lidR - 0.03, 0.006, 24, mat(shade(color, 1.04), 0.4, 0.1), 0, bodyH + 0.053, lidZ)); // 蓋の縁段差
  g.add(box(0.06, 0.02, 0.05, dark, 0, bodyH + 0.03, lidZ - lidR + 0.01));   // ヒンジ
  g.add(box(0.04, 0.02, 0.03, metal, 0, bodyH + 0.03, lidZ + lidR - 0.005)); // ラッチ
  // 排気スリット (側面)
  for (let i = 0; i < 5; i++) g.add(box(0.004, 0.006, d * 0.45, dark, w/2 + 0.001, 0.06 + i * 0.03, -d * 0.1));
  // ゴム脚
  [[-w/2+0.04, d/2-0.04], [w/2-0.04, d/2-0.04], [-w/2+0.04, -d/2+0.04], [w/2-0.04, -d/2+0.04]].forEach(([x, z]) => g.add(cylAt(0.012, 0.014, 0.01, 8, dark, x, 0.004, z)));
  return g;
}
// 島津 セミミクロ分析天びん AP225WD (212×411×345, 7.9kg): 本体ベース + 前面の表示部(キー) + ガラス風防(左右・上面の扉) + 皿φ91
function buildAnalyticalBalance({ color='#e8e2d6', w=0.212, d=0.411, h=0.345 } = {}) {
  const g = new THREE.Group();
  const body = mat('#eef0ef', 0.35, 0.08, { env: 0.5 }), dark = mat('#2b2f33', 0.4, 0.2), steel = mat('#b8c0c6', 0.25, 0.85, { env: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xd6e8ee, roughness: 0.04, metalness: 0.08, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
  const baseH = 0.085, shZ0 = -d / 2 + 0.03, shZ1 = d / 2 - 0.1, shH = h - baseH;
  const base = box(w, baseH - 0.006, d, body, 0, 0.006 + (baseH - 0.006) / 2, 0); base.userData.colorable = true; g.add(base);
  // 前面の表示部 (傾斜パネル + LCD + キー)
  const panel = new THREE.Group(); panel.position.set(0, baseH - 0.01, d / 2 - 0.05); panel.rotation.x = -0.35; g.add(panel);
  panel.add(box(w - 0.02, 0.012, 0.085, dark, 0, 0, 0));
  panel.add(plainBox(w - 0.07, 0.004, 0.03, mat('#0c1a1c', 0.3, 0.1), 0, 0.008, -0.012));
  for (let i = 0; i < 5; i++) panel.add(box(0.022, 0.006, 0.014, mat('#d9dcdf', 0.5), -0.07 + i * 0.035, 0.008, 0.024));
  // 風防 (背板 + 左右ガラス扉 + 上面ガラス扉 + 前面ガラス) とアルミ枠
  const cy = baseH + shH / 2, sd = shZ1 - shZ0, cz = (shZ0 + shZ1) / 2;
  g.add(box(w, shH, 0.03, body, 0, cy, shZ0 + 0.015));                                              // 背板 (機構部)
  [-1, 1].forEach(s => g.add(plainBox(0.005, shH - 0.01, sd - 0.03, glass, s * (w / 2 - 0.006), cy, cz + 0.015)));
  g.add(plainBox(w - 0.012, 0.005, sd - 0.03, glass, 0, h - 0.004, cz + 0.015));
  g.add(plainBox(w - 0.012, shH - 0.01, 0.005, glass, 0, cy, shZ1 - 0.003));
  [-1, 1].forEach(s => { g.add(box(0.008, shH, 0.008, steel, s * (w / 2 - 0.004), cy, shZ1 - 0.004)); g.add(box(0.008, 0.008, sd, steel, s * (w / 2 - 0.004), h - 0.004, cz)); });
  [-1, 1].forEach(s => g.add(box(0.006, 0.05, 0.012, steel, s * (w / 2 - 0.003), cy + 0.06, cz + 0.05)));   // 扉つまみ
  // 皿 φ91 + シールドリング
  g.add(cylAt(0.0455, 0.0455, 0.004, 32, steel, 0, baseH + 0.012, cz + 0.02));
  g.add(cylAt(0.06, 0.06, 0.006, 32, mat('#c9ced2', 0.4, 0.5), 0, baseH + 0.004, cz + 0.02));
  // 水準器 + 脚
  g.add(cylAt(0.009, 0.009, 0.004, 12, mat('#7fd0e8', 0.2, 0.1), w / 2 - 0.03, baseH + 0.002, d / 2 - 0.1));
  [[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([s, t]) => g.add(cylAt(0.01, 0.012, 0.008, 10, dark, s * (w / 2 - 0.025), 0.004, t * (d / 2 - 0.04))));
  return g;
}
// アズワン 薬品庫 SH型 ガラス扉 SH-G (950×510×1800, SUS304, 120kg): ステンレス本体・左右 2 室, アルミサッシのガラス扉, 可動棚 5段×2, 試薬びん
function buildChemShelf({ color='#e8e2d6', w=0.95, d=0.51, h=1.8 } = {}) {
  const g = new THREE.Group();
  const sus = mat('#c8cdd1', 0.3, 0.85, { env: 0.9 }), susD = mat('#a9afb4', 0.35, 0.8), alu = mat('#d2d6d9', 0.25, 0.8, { env: 1.0 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0xd9ecf2, roughness: 0.04, metalness: 0.08, transparent: true, opacity: 0.2, side: THREE.DoubleSide });
  const t = 0.02, base = 0.07;
  g.add(box(w - 0.02, base, d - 0.04, susD, 0, base / 2, -0.01));                                  // 台輪
  [-1, 1].forEach(s => { const sp = box(t, h - base, d, sus, s * (w / 2 - t / 2), base + (h - base) / 2, 0); sp.userData.colorable = true; g.add(sp); });
  const tp = box(w, t, d, sus, 0, h - t / 2, 0); tp.userData.colorable = true; g.add(tp);
  g.add(box(w, t, d, sus, 0, base + t / 2, 0));
  g.add(box(w - 2 * t, h - base, 0.012, susD, 0, base + (h - base) / 2, -d / 2 + 0.006));           // 背板
  g.add(box(t, h - base - t, d - 0.06, sus, 0, base + (h - base) / 2, -0.03));                        // 中仕切り (2室)
  // 棚板 (各室5段) + 試薬びん (褐色・透明・白ポリ)
  const cols = ['#6b3d1f', '#8a5a2b', '#e9e6de', '#dfe8ec', '#6b3d1f', '#2f5f9a'];
  const inW = (w - 3 * t) / 2;
  [-1, 1].forEach(s => {
    const cx = s * (t / 2 + inW / 2);
    [0.38, 0.68, 0.98, 1.28, 1.56].forEach((y, si) => {
      g.add(box(inW - 0.01, 0.012, d - 0.1, sus, cx, y, -0.02));
      g.add(box(inW - 0.01, 0.03, 0.008, sus, cx, y + 0.015, d / 2 - 0.05));                          // 転落防止の立ち上がり
      for (let i = 0; i < 4; i++) {
        const c = cols[(i + si + (s > 0 ? 2 : 0)) % cols.length], bx = cx - inW / 2 + 0.06 + i * (inW - 0.1) / 3, big = (i + si) % 3 === 0;
        g.add(cylAt(big ? 0.045 : 0.035, big ? 0.045 : 0.035, big ? 0.2 : 0.15, 14, mat(c, 0.25, 0.05), bx, y + 0.006 + (big ? 0.1 : 0.075), -0.05));
        g.add(cylAt(0.018, 0.018, 0.03, 10, mat(i % 2 ? '#1f1f1f' : '#f2f2f2', 0.5), bx, y + 0.006 + (big ? 0.215 : 0.165), -0.05));
      }
    });
  });
  // ガラス扉 (アルミサッシ) 各室 1 枚 + 取っ手・シリンダー錠
  [-1, 1].forEach(s => {
    const cx = s * (t / 2 + inW / 2), dw = inW + 0.008, dh = h - base - 2 * t - 0.01, cy = base + t + dh / 2;
    const dz = d / 2 - 0.035;                                                                      // 扉面 (側板の内側に納まる)
    g.add(plainBox(dw - 0.05, dh - 0.05, 0.005, glassM, cx, cy, dz));
    [-1, 1].forEach(k => { g.add(box(0.025, dh, 0.02, alu, cx + k * (dw / 2 - 0.0125), cy, dz)); g.add(box(dw, 0.025, 0.02, alu, cx, cy + k * (dh / 2 - 0.0125), dz)); });
    g.add(box(0.015, 0.16, 0.025, alu, cx - s * (dw / 2 - 0.04), cy, d / 2 - 0.0125));
  });
  g.add(cylAt(0.009, 0.009, 0.012, 12, mat('#8a8f94', 0.3, 0.8), 0, base + (h - base) * 0.55, d / 2 - 0.018).rotateX(Math.PI / 2));
  return g;
}
// 実験ガラス器具セット: IWAKI ビーカー 500mL (胴径φ90×高さ125) / 三角フラスコ 300mL (最大径φ90×高さ149) /
// IWAKI メスシリンダー 100mL (全高約250) / 試験管立て。液体は colorable。
function buildGlassware({ color='#5ac0e0', w=0.36, d=0.22, h=0.26 } = {}) {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xe8f6fa, roughness: 0.03, metalness: 0.0, transparent: true, opacity: 0.32, side: THREE.DoubleSide });
  const liquid = (c, op = 0.72) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.15, metalness: 0.05, transparent: true, opacity: op });
  const white = mat('#f4f4f2', 0.6);
  // ビーカー 500mL: 口の注ぎ口 + 白の目盛り + 液体(300mL程度)
  const bx = -w / 2 + 0.047, bz = 0.02;
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.044, 0.125, 32, 1, true), glass).translateX(bx).translateY(0.0625).translateZ(bz));
  g.add(cylAt(0.044, 0.044, 0.003, 32, glass, bx, 0.0015, bz));
  const lq = cylAt(0.042, 0.042, 0.072, 28, liquid(color), bx, 0.038, bz); lq.userData.colorable = true; g.add(lq);
  g.add(box(0.012, 0.004, 0.008, glass, bx, 0.123, bz + 0.046));
  for (let i = 0; i < 5; i++) g.add(plainBox(i % 2 ? 0.012 : 0.02, 0.0015, 0.001, white, bx - 0.012, 0.03 + i * 0.018, bz + 0.0452));
  // 三角フラスコ 300mL: 円錐の胴 + 細い首
  const fx = bx + 0.1;
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.045, 0.105, 32, 1, true), glass).translateX(fx).translateY(0.0525).translateZ(-0.01));
  g.add(cylAt(0.045, 0.045, 0.003, 32, glass, fx, 0.0015, -0.01));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.044, 20, 1, true), glass).translateX(fx).translateY(0.127).translateZ(-0.01));
  g.add(cylAt(0.042, 0.043, 0.035, 28, liquid('#e05a8a'), fx, 0.0185, -0.01));
  // メスシリンダー 100mL: 六角の台座 + 細長い管 + 目盛り
  const cx = w / 2 - 0.04, cz = -0.04;
  g.add(cylAt(0.036, 0.036, 0.01, 6, glass, cx, 0.005, cz));
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.24, 20, 1, true), glass).translateX(cx).translateY(0.13).translateZ(cz));
  g.add(cylAt(0.0135, 0.0135, 0.12, 16, liquid('#7ad05a'), cx, 0.07, cz));
  for (let i = 0; i < 10; i++) g.add(plainBox(i % 5 ? 0.006 : 0.012, 0.0012, 0.001, white, cx - 0.004, 0.03 + i * 0.02, cz + 0.0148));
  // 試験管立て + 試験管 5 本
  const rx = cx - 0.07, rz = 0.065;
  const rackM = mat('#f0f0ee', 0.5);
  [0.02, 0.06].forEach(y => g.add(box(0.14, 0.006, 0.04, rackM, rx, y, rz)));
  [-1, 1].forEach(s => g.add(box(0.006, 0.07, 0.04, rackM, rx + s * 0.067, 0.035, rz)));
  ['#e0c05a', '#5ae0a0', '#c05ae0', '#e08a5a', '#5a9ae0'].forEach((c, i) => {
    const tx = rx - 0.052 + i * 0.026;
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.13, 12, 1, true), glass).translateX(tx).translateY(0.075).translateZ(rz));
    g.add(cylAt(0.0072, 0.0072, 0.04, 10, liquid(c), tx, 0.032, rz));
  });
  return g;
}
// Tektronix TBS1102C (幅325×高さ155×奥行107, 2.0kg): 左に7型カラー液晶, 右に垂直/水平/トリガーの操作部, 下段に BNC 入力と USB
function buildOscilloscope({ color='#3a3f47', w=0.325, d=0.107, h=0.155 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.45, 0.2, { env: 0.5 }), bezel = mat('#1b1e22', 0.4, 0.2), key = mat('#d6d9dd', 0.5), metal = mat('#9aa2aa', 0.3, 0.7), darkM = mat('#15171a', 0.5);
  const b = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.012, 3), body); b.position.y = h / 2; b.castShadow = true; b.userData.colorable = true; g.add(b);
  const fz = d / 2;
  // 液晶 (7型, 800×480) + 波形
  const sw = w * 0.52, sh = h * 0.66, sx = -w / 2 + 0.015 + sw / 2, sy = h * 0.56;
  g.add(box(sw + 0.012, sh + 0.012, 0.004, bezel, sx, sy, fz + 0.001));
  const scr = new THREE.MeshStandardMaterial({ color: 0x07121a, emissive: new THREE.Color('#0f2c3a'), emissiveIntensity: 0.8, roughness: 0.2 });
  g.add(plainBox(sw, sh, 0.002, scr, sx, sy, fz + 0.004));
  [[0.02, '#f5e04a'], [-0.018, '#4ad8f5']].forEach(([dy, c]) => { for (let i = 0; i < 8; i++) g.add(plainBox(sw / 8 * 0.9, 0.0025, 0.001, new THREE.MeshBasicMaterial({ color: new THREE.Color(c) }), sx - sw / 2 + sw / 16 + i * sw / 8, sy + dy + Math.sin(i * 1.3) * 0.008, fz + 0.0055)); });
  for (let i = 0; i < 5; i++) g.add(box(0.016, 0.008, 0.004, key, sx - sw / 2 + 0.02 + i * sw / 5, h * 0.12, fz + 0.002));   // 画面下のソフトキー
  // 操作部 (右): ノブ (垂直×2ch・水平・トリガー) + キー
  const cx0 = sx + sw / 2 + 0.02, cw = w / 2 - 0.012 - cx0;
  [[0.2, 0.72], [0.2, 0.45], [0.55, 0.72], [0.85, 0.72], [0.55, 0.45], [0.85, 0.45]].forEach(([fx, fy], i) => g.add(cylAt(i < 2 ? 0.009 : 0.008, i < 2 ? 0.009 : 0.008, 0.012, 14, metal, cx0 + fx * cw, h * fy, fz + 0.006).rotateX(Math.PI / 2)));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) g.add(box(0.012, 0.007, 0.004, key, cx0 + 0.012 + c * cw / 4, h * (0.88 - r * 0.07), fz + 0.002));
  // BNC 入力 (CH1/CH2/EXT) + USB + 電源
  [0.25, 0.55, 0.85].forEach(fx => { g.add(cylAt(0.006, 0.006, 0.014, 12, metal, cx0 + fx * cw, h * 0.16, fz + 0.007).rotateX(Math.PI / 2)); });
  g.add(box(0.012, 0.005, 0.003, darkM, -w / 2 + 0.03, h * 0.08, fz + 0.001));
  g.add(cylAt(0.005, 0.005, 0.004, 10, mat('#2a9d4a', 0.4), -w / 2 + 0.012, h * 0.9, fz + 0.002).rotateX(Math.PI / 2));
  // 脚 (前脚を起こしてやや上向き)
  [-1, 1].forEach(s => g.add(box(0.02, 0.012, 0.02, bezel, s * (w / 2 - 0.03), 0.006, fz - 0.02)));
  return g;
}
// 日東工業 システムラック FS70-716EN (W700×D700×H1600, EIA 33U, 80kg): ペールホワイトの筐体, ブルースモークのアクリル前扉,
// 19インチラックに測定器 (オシロスコープ・DMM・ファンクションジェネレータ・直流電源・棚) を実装
function buildTestBench({ color='#f3ece0', w=0.7, d=0.7, h=1.6 } = {}) {
  const g = new THREE.Group();
  const shell = mat(color, 0.45, 0.1), dark = mat('#1e2226', 0.5, 0.25), rail = mat('#2d3136', 0.45, 0.5);
  const acryl = new THREE.MeshStandardMaterial({ color: 0x2a4d74, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, side: THREE.DoubleSide });
  const base = 0.07, t = 0.02;
  g.add(box(w - 0.02, base, d - 0.02, dark, 0, base / 2, 0));                                      // ベース
  [-1, 1].forEach(s => g.add(cylAt(0.02, 0.025, 0.02, 10, dark, s * (w / 2 - 0.06), 0.01, d / 2 - 0.06)));
  [-1, 1].forEach(s => { const sp = box(t, h - base, d, shell, s * (w / 2 - t / 2), base + (h - base) / 2, 0); sp.userData.colorable = true; g.add(sp); });
  const tp = box(w, t, d, shell, 0, h - t / 2, 0); tp.userData.colorable = true; g.add(tp);
  for (let i = 0; i < 6; i++) g.add(box(w - 0.2, 0.002, 0.012, dark, 0, h + 0.0005, -0.2 + i * 0.08));   // 天板の通気スリット
  g.add(box(w - 2 * t, h - base, t, shell, 0, base + (h - base) / 2, -d / 2 + t / 2));              // 背面扉
  // 19インチ マウントアングル (EIA 取付ピッチ 465)
  [-1, 1].forEach(s => g.add(box(0.03, h - base - 0.04, 0.02, rail, s * 0.2475, base + (h - base) / 2, d / 2 - 0.1)));
  // 実装機器 (前面パネル)
  const uz = d / 2 - 0.1 + 0.012, pw = 0.482;
  const scr = (c) => new THREE.MeshStandardMaterial({ color: 0x0a1a20, emissive: new THREE.Color(c), emissiveIntensity: 0.55, roughness: 0.3 });
  const unit = (y, u, face, fn) => { const hh = u * 0.04445 - 0.003; g.add(box(pw, hh, 0.012, face, 0, y + hh / 2, uz)); g.add(box(0.43, hh - 0.01, 0.35, dark, 0, y + hh / 2, uz - 0.18)); fn && fn(y + hh / 2, hh); };
  const knobs = (y, n, x0) => { for (let i = 0; i < n; i++) g.add(cylAt(0.012, 0.012, 0.012, 12, mat('#c8cdd2', 0.3, 0.6), x0 + i * 0.04, y, uz + 0.012).rotateX(Math.PI / 2)); };
  let y = base + 0.1;
  unit(y, 3, mat('#3a3e44', 0.5), (cy, hh) => { g.add(box(0.1, 0.05, 0.02, mat('#e7e7e7', 0.5), -0.15, cy, uz + 0.006)); knobs(cy, 3, 0.05); });            // 直流電源
  y += 3 * 0.04445 + 0.02;
  unit(y, 2, mat('#2e3238', 0.5), (cy) => { g.add(plainBox(0.12, 0.035, 0.004, scr('#3fd0ff'), -0.13, cy, uz + 0.008)); knobs(cy, 4, 0.02); });                      // ファンクションジェネレータ
  y += 2 * 0.04445 + 0.02;
  unit(y, 2, mat('#2e3238', 0.5), (cy) => { g.add(plainBox(0.14, 0.035, 0.004, scr('#9dff6a'), -0.12, cy, uz + 0.008)); for (let i = 0; i < 6; i++) g.add(box(0.02, 0.012, 0.008, mat('#d0d4d8', 0.5), 0.03 + i * 0.03, cy, uz + 0.01)); });   // DMM
  y += 2 * 0.04445 + 0.03;
  unit(y, 5, mat('#34383e', 0.5), (cy, hh) => { g.add(plainBox(0.24, 0.15, 0.004, scr('#1faa5a'), -0.08, cy, uz + 0.008)); g.add(plainBox(0.2, 0.004, 0.002, mat('#8fffc0', 0.2), -0.08, cy + 0.01, uz + 0.011)); knobs(cy + 0.04, 3, 0.1); knobs(cy - 0.02, 3, 0.1); });   // オシロスコープ
  y += 5 * 0.04445 + 0.04;
  g.add(box(pw - 0.02, 0.01, 0.45, rail, 0, y, uz - 0.22));                                        // 棚板 (キーボード・プローブ置き)
  g.add(box(0.36, 0.02, 0.13, dark, 0, y + 0.015, uz - 0.1));
  // ブルースモーク アクリル前扉 (枠 + レバーハンドル)
  const dh = h - base - 0.04, dcy = base + 0.02 + dh / 2;
  const dz = d / 2 - 0.022;                                                                        // 扉面 (側板の内側に納まる)
  g.add(plainBox(w - 0.08, dh - 0.06, 0.005, acryl, 0, dcy, dz));
  [-1, 1].forEach(k => { g.add(box(0.03, dh, 0.02, shell, k * (w / 2 - 0.035), dcy, dz)); g.add(box(w - 0.04, 0.03, 0.02, shell, 0, dcy + k * (dh / 2 - 0.015), dz)); });
  g.add(box(0.025, 0.12, 0.024, mat('#3a3e44', 0.4, 0.4), w / 2 - 0.06, dcy, d / 2 - 0.012));
  return g;
}
// TAKISAWA TAC-360 (フラット形 簡易NC旋盤, W2070×D1145×H1740, 1200kg, ベッド上の振り360・心間700, 7インチ3爪チャック, 刃物台 H-4, FANUC 0i-TF Plus):
// 汎用旋盤と同じ構成 (左: 主軸台とチャック / 中: 往復台・エプロンの電子ハンドル・4方刃物台 / 右: 心押台) を 2 台の脚とチップパンに載せ、
// 加工部を背面・天井・両端のガードと前面のスライド扉(窓付き)で囲む。NC 操作盤は右前のアームに取り付け。前面(+Z)が操作側。
function buildLathe({ color='#7a9486', w=2.07, d=1.145, h=1.74 } = {}) {
  const g = new THREE.Group();
  const machine = mat(color, 0.5, 0.25, { env: 0.45 }), machineD = mat(shade(color, 0.84), 0.55, 0.25);
  const ground = mat('#9aa3aa', 0.22, 0.85, { env: 0.9 }), chrome = mat('#c9ced3', 0.2, 0.9, { env: 1.0 }), dark = mat('#24272b', 0.5, 0.3), black = mat('#121314', 0.45, 0.2);
  const pc = new THREE.MeshStandardMaterial({ color: 0xcfe2ea, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.28, side: THREE.DoubleSide });
  const rb = (bw, bh, bd, m, x, y, z, r = 0.012) => { const o = new THREE.Mesh(roundedBoxGeom(bw, bh, bd, r, 2), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const tag = (o) => { o.userData.colorable = true; return o; };
  const x0 = -w / 2, x1 = w / 2, zB = -d / 2, zF = d / 2;
  const bedTop = 0.95, cH = bedTop + 0.18, axZ = -0.14;                     // 主軸中心の高さ (振り360 = ベッド上 180mm), 主軸中心の Z
  // 脚 (左: 主軸モーター・電装, 右: クーラントタンク) + 扉
  tag(rb(0.62, 0.72, 0.8, machine, x0 + 0.35, 0.36, -0.07));
  tag(rb(0.5, 0.72, 0.8, machine, x1 - 0.3, 0.36, -0.07));
  [[x0 + 0.35, 0.5], [x1 - 0.3, 0.38]].forEach(([x, dw]) => { rb(dw, 0.5, 0.012, machineD, x, 0.36, 0.335, 0.004); g.add(box(0.02, 0.1, 0.02, chrome, x + dw / 2 - 0.05, 0.4, 0.345)); });
  // チップパン (両脚にまたがる受け皿) + 切粉
  rb(w - 0.06, 0.06, 0.9, dark, 0, 0.75, -0.07, 0.008);
  for (let i = 0; i < 14; i++) g.add(new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.003, 4, 8, 4), ground).translateX(-0.3 + (i * 0.37) % 1.1).translateY(0.785).translateZ(-0.2 + (i * 0.13) % 0.35));
  // ベッド (平形の摺動面 2 本) + 送り軸・親ねじ
  const bedX0 = x0 + 0.1, bedX1 = x1 - 0.12, bedC = (bedX0 + bedX1) / 2;
  tag(rb(bedX1 - bedX0, 0.17, 0.38, machine, bedC, bedTop - 0.085, axZ));
  [axZ - 0.14, axZ + 0.14].forEach(z => g.add(plainBox(bedX1 - bedX0 - 0.02, 0.01, 0.06, ground, bedC, bedTop + 0.005, z)));
  [[0.82, 0.018], [0.87, 0.013]].forEach(([y, r]) => { const s = cyl(r, r, bedX1 - bedX0 - 0.3, 12, ground); s.rotation.z = Math.PI / 2; s.position.set(bedC + 0.1, y, axZ + 0.2); g.add(s); });
  // 主軸台 (左) + 7インチ3爪チャック + 加工中の丸棒 + チャックガード
  const hsX0 = x0 + 0.06, hsX1 = x0 + 0.62;
  tag(rb(hsX1 - hsX0, 0.44, 0.52, machine, (hsX0 + hsX1) / 2, bedTop + 0.22, axZ));
  rb(0.02, 0.3, 0.3, machineD, hsX0 - 0.005, bedTop + 0.2, axZ, 0.006);                               // 変換歯車カバー
  g.add(cylAt(0.06, 0.06, 0.03, 20, machineD, hsX1 + 0.015, cH, axZ).rotateZ(Math.PI / 2));             // 主軸端
  const chuck = cyl(0.089, 0.089, 0.1, 28, ground); chuck.rotation.z = Math.PI / 2; chuck.position.set(hsX1 + 0.08, cH, axZ); g.add(chuck);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3, jw = box(0.03, 0.05, 0.028, dark, hsX1 + 0.14, cH + Math.cos(a) * 0.045, axZ + Math.sin(a) * 0.045, false); jw.rotation.x = a; g.add(jw); }
  const bar = cyl(0.025, 0.025, 0.34, 18, mat('#b8bfc5', 0.3, 0.8)); bar.rotation.z = Math.PI / 2; bar.position.set(hsX1 + 0.32, cH, axZ); g.add(bar);
  const cg = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 20, 1, true, -Math.PI / 2, Math.PI), machineD); cg.rotation.z = Math.PI / 2; cg.position.set(hsX1 + 0.09, cH, axZ); cg.material.side = THREE.DoubleSide; g.add(cg);
  // 往復台: サドル + エプロン (電子ハンドル X/Z・送りレバー) + 横送り台 + 4方刃物台 (H-4)
  const cx = hsX1 + 0.62;
  tag(rb(0.34, 0.06, 0.5, machine, cx, bedTop + 0.03, axZ + 0.02));
  tag(rb(0.4, 0.3, 0.1, machine, cx, bedTop - 0.12, axZ + 0.29));
  _handwheel(g, cx - 0.1, bedTop - 0.1, axZ + 0.36, 'z', 1, 0.075, chrome, black);                    // Z軸 (長手) 電子ハンドル
  _handwheel(g, cx + 0.1, bedTop - 0.06, axZ + 0.36, 'z', 1, 0.055, chrome, black);                   // X軸 (横) 電子ハンドル
  g.add(_rod([cx + 0.02, bedTop - 0.2, axZ + 0.34], [cx + 0.05, bedTop - 0.12, axZ + 0.42], 0.007, chrome));
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), black).translateX(cx + 0.05).translateY(bedTop - 0.12).translateZ(axZ + 0.42));
  tag(rb(0.2, 0.05, 0.36, machine, cx, bedTop + 0.085, axZ + 0.06));
  rb(0.13, 0.09, 0.13, dark, cx, cH - 0.02, axZ + 0.13, 0.008);                                        // 4方刃物台
  g.add(cylAt(0.014, 0.014, 0.05, 10, chrome, cx, cH + 0.045, axZ + 0.13));                            // 締付レバー軸
  g.add(_rod([cx, cH + 0.06, axZ + 0.13], [cx + 0.12, cH + 0.07, axZ + 0.19], 0.008, chrome));
  [[0, -1], [1, 0]].forEach(([sx, sz]) => g.add(box(sx ? 0.09 : 0.02, 0.02, sx ? 0.02 : 0.09, mat('#d6b24a', 0.35, 0.7), cx + sx * 0.1, cH - 0.005, axZ + 0.13 + sz * 0.1, false)));   // バイト
  // 心押台 (右) + ラム + 回転センタ + ハンドル
  const tsX = bedX1 - 0.26;
  tag(rb(0.26, 0.27, 0.3, machine, tsX, bedTop + 0.135, axZ));
  g.add(cylAt(0.032, 0.032, 0.14, 16, ground, tsX - 0.2, cH, axZ).rotateZ(Math.PI / 2));
  g.add(cylAt(0.004, 0.022, 0.05, 14, chrome, tsX - 0.29, cH, axZ).rotateZ(-Math.PI / 2));
  _handwheel(g, tsX + 0.18, cH, axZ, 'x', 1, 0.07, chrome, black);
  // ガード: 背面・天井・両端 + 前面のスライド扉 (窓付き, 右は固定窓)
  const gX0 = hsX1 - 0.04, gX1 = x1 - 0.06, gZ1 = 0.2, gY0 = 0.78, gTop = 1.6;
  tag(rb(gX1 - gX0, gTop - gY0, 0.02, machine, (gX0 + gX1) / 2, (gY0 + gTop) / 2, zB + 0.01, 0.004));
  tag(rb(gX1 - gX0, 0.02, gZ1 - zB, machine, (gX0 + gX1) / 2, gTop, (zB + gZ1) / 2, 0.004));
  [gX0, gX1].forEach(x => tag(rb(0.02, gTop - bedTop - 0.06, gZ1 - zB, machine, x, (gTop + bedTop + 0.06) / 2, (zB + gZ1) / 2, 0.004)));
  const doorW = (gX1 - gX0) / 2 + 0.03, dY0 = bedTop + 0.1, dH = gTop - 0.02 - dY0;
  [[gX0 + doorW / 2, gZ1 + 0.012], [gX1 - doorW / 2, gZ1 - 0.012]].forEach(([x, z], k) => {
    [-1, 1].forEach(s => { tag(rb(0.04, dH, 0.02, machine, x + s * (doorW / 2 - 0.02), dY0 + dH / 2, z, 0.004)); tag(rb(doorW, 0.05, 0.02, machine, x, dY0 + (s > 0 ? dH - 0.025 : 0.025), z, 0.004)); });
    g.add(plainBox(doorW - 0.08, dH - 0.1, 0.006, pc, x, dY0 + dH / 2, z));
    if (k === 0) g.add(box(0.03, 0.2, 0.03, chrome, x + doorW / 2 - 0.06, dY0 + dH * 0.5, z + 0.025, false));
  });
  g.add(plainBox(gX1 - gX0, 0.03, 0.05, machineD, (gX0 + gX1) / 2, gTop - 0.03, gZ1 + 0.03));         // 扉レール
  // 作業灯 (ガード内)
  g.add(plainBox(0.5, 0.02, 0.04, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color('#fff4d6'), emissiveIntensity: 0.6 }), cx, gTop - 0.02, zB + 0.15));
  // NC 操作盤 (FANUC 0i-TF Plus): 右前のアームに取り付け, 上端 = h
  const pX = gX1 - 0.2, pZ = zF - 0.07, pH = 0.52, pY = h - pH / 2;
  g.add(_rod([gX1, gTop - 0.05, gZ1 - 0.05], [pX + 0.1, gTop - 0.05, pZ - 0.06], 0.025, machineD));
  tag(rb(0.36, pH, 0.1, machine, pX, pY, pZ, 0.01));
  g.add(plainBox(0.22, 0.17, 0.004, new THREE.MeshStandardMaterial({ color: 0x0a1822, emissive: new THREE.Color('#1c5f8f'), emissiveIntensity: 0.6 }), pX - 0.04, pY + 0.12, pZ + 0.051));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) g.add(plainBox(0.022, 0.016, 0.006, mat(r === 0 ? '#e3e6e8' : '#b9bfc4', 0.5), pX - 0.13 + c * 0.034, pY - 0.03 - r * 0.028, pZ + 0.052));
  g.add(cylAt(0.028, 0.028, 0.02, 16, mat('#d63a2a', 0.4), pX + 0.13, pY + 0.16, pZ + 0.058).rotateX(Math.PI / 2));   // 非常停止
  [['#22c55e', -0.03], ['#e8e8e8', -0.09]].forEach(([c, dy]) => g.add(cylAt(0.016, 0.016, 0.014, 12, mat(c, 0.4), pX + 0.13, pY + dy, pZ + 0.056).rotateX(Math.PI / 2)));
  g.add(cylAt(0.03, 0.03, 0.03, 16, dark, pX + 0.12, pY - 0.18, pZ + 0.06).rotateX(Math.PI / 2));    // 送りオーバライド
  return g;
}
// 静岡鐵工所 立フライス盤(ラム型) VHR-A (W1700×D1980×H2075, 2100kg, テーブル1100×280, 移動量 X820/Y300/Z450, 主軸 85〜3800min⁻¹ 16段):
// ベースと一体のコラム, コラム前面を上下するニー, その上のサドルとテーブル (T溝3本・両端ハンドル・左に自動送り装置),
// コラム上の旋回台に載ったラム (後ろへ張り出す), ラム先端の立て主軸ヘッドと上部のモーター。前面(+Z)が操作側、テーブル長手 = 幅(W)。
function buildMillingMachine({ color='#7a9486', w=1.7, d=1.98, h=2.075 } = {}) {
  const g = new THREE.Group();
  const machine = mat(color, 0.5, 0.25, { env: 0.45 }), machineD = mat(shade(color, 0.84), 0.55, 0.25);
  const ground = mat('#9aa3aa', 0.22, 0.85, { env: 0.9 }), chrome = mat('#c9ced3', 0.2, 0.9, { env: 1.0 }), dark = mat('#24272b', 0.5, 0.3), black = mat('#121314', 0.45, 0.2);
  const rb = (bw, bh, bd, m, x, y, z, r = 0.012) => { const o = new THREE.Mesh(roundedBoxGeom(bw, bh, bd, r, 2), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const tag = (o) => { o.userData.colorable = true; return o; };
  const zc = -d / 2 + 1.1;                                          // コラム前面 (後ろにラム後端まで 1.1m)
  // ベース (チップパン兼クーラントタンク)
  tag(rb(0.8, 0.12, 1.3, machine, 0, 0.06, zc + 0.05));
  rb(0.74, 0.012, 0.66, dark, 0, 0.126, zc + 0.36, 0.004);
  // コラム + 前面の摺動面 + 左側面の電装箱 (主電源スイッチ)
  const colY0 = 0.12, colH = 1.5, cTop = colY0 + colH;
  tag(rb(0.52, colH, 0.55, machine, 0, colY0 + colH / 2, zc - 0.275));
  [-1, 1].forEach(s => g.add(plainBox(0.05, 1.1, 0.012, ground, s * 0.17, 0.95, zc + 0.006)));
  tag(rb(0.12, 0.55, 0.42, machineD, -0.32, 1.1, zc - 0.3));
  g.add(cylAt(0.03, 0.03, 0.03, 14, dark, -0.39, 1.2, zc - 0.25).rotateZ(Math.PI / 2));
  // ニー + 昇降ねじ (テレスコカバー) + 昇降クランク
  const kY0 = 0.6, kH = 0.38;
  tag(rb(0.48, kH, 0.62, machine, 0, kY0 + kH / 2, zc + 0.31));
  g.add(cylAt(0.05, 0.05, kY0 - 0.12, 16, dark, 0, 0.12 + (kY0 - 0.12) / 2, zc + 0.42));
  g.add(cylAt(0.018, 0.018, 0.12, 10, chrome, -0.16, kY0 + 0.22, zc + 0.68).rotateX(Math.PI / 2));
  g.add(_rod([-0.16, kY0 + 0.22, zc + 0.74], [-0.16, kY0 + 0.1, zc + 0.74], 0.012, chrome));
  g.add(cylAt(0.013, 0.013, 0.08, 10, black, -0.16, kY0 + 0.1, zc + 0.78).rotateX(Math.PI / 2));
  g.add(box(0.1, 0.12, 0.08, machineD, 0.17, kY0 + 0.2, zc + 0.64, false));                          // ワンショット給油器
  // サドル + 前後送りハンドル (ニー前面)
  const sY0 = kY0 + kH, sH = 0.1;
  tag(rb(0.44, sH, 0.6, machine, 0, sY0 + sH / 2, zc + 0.31));
  g.add(cylAt(0.03, 0.03, 0.16, 12, machineD, 0, sY0 - 0.08, zc + 0.7).rotateX(Math.PI / 2));
  _handwheel(g, 0, sY0 - 0.08, zc + 0.8, 'z', 1, 0.09, chrome, black);
  // テーブル 1100×280 (上面は研削面・T溝3本) + 左右ハンドル + 左端の自動送り装置 + 機械万力と工作物
  const tY0 = sY0 + sH, tH = 0.075, tx = 0.05, tz = zc + 0.31, tL = 1.1;             // tx: X 移動範囲内で少し右に寄せた位置
  tag(rb(tL, tH, 0.28, machine, tx, tY0 + tH / 2, tz, 0.006));
  g.add(plainBox(tL - 0.01, 0.004, 0.27, ground, tx, tY0 + tH + 0.002, tz));
  [-0.07, 0, 0.07].forEach(dz => g.add(plainBox(tL - 0.012, 0.005, 0.018, dark, tx, tY0 + tH + 0.003, tz + dz)));
  const tEnd0 = tx - tL / 2, tEnd1 = tx + tL / 2;
  [[tEnd0 - 0.015, 0.03], [tEnd1 + 0.025, 0.05]].forEach(([x, bw]) => rb(bw, 0.1, 0.2, machineD, x, tY0 + 0.03, tz, 0.006));   // 送りねじの軸受ブラケット
  rb(0.14, 0.15, 0.15, machineD, tEnd0 - 0.1, tY0 + 0.03, tz + 0.02, 0.01);                            // 自動送り装置
  g.add(cylAt(0.025, 0.025, 0.02, 12, dark, tEnd0 - 0.1, tY0 + 0.03, tz + 0.1).rotateX(Math.PI / 2));
  g.add(_rod([tEnd0 - 0.125, tY0 + 0.1, tz + 0.02], [tEnd0 - 0.125, tY0 + 0.19, tz + 0.04], 0.007, chrome));
  g.add(cylAt(0.035, 0.035, 0.05, 14, chrome, tEnd0 - 0.195, tY0 + 0.03, tz).rotateZ(Math.PI / 2));    // 目盛環
  _handwheel(g, tEnd0 - 0.235, tY0 + 0.03, tz, 'x', -1, 0.085, chrome, black);
  g.add(cylAt(0.035, 0.035, 0.05, 14, chrome, tEnd1 + 0.075, tY0 + 0.03, tz).rotateZ(Math.PI / 2));
  _handwheel(g, tEnd1 + 0.12, tY0 + 0.03, tz, 'x', 1, 0.085, chrome, black);
  g.add(plainBox(tL - 0.1, 0.02, 0.012, ground, tx, tY0 + 0.03, tz + 0.146));                          // ドッグ溝
  const vY = tY0 + tH + 0.004;
  rb(0.32, 0.07, 0.14, dark, tx, vY + 0.035, tz, 0.006);                                               // 機械万力
  rb(0.03, 0.05, 0.14, ground, tx - 0.06, vY + 0.095, tz, 0.004); rb(0.03, 0.05, 0.14, ground, tx + 0.05, vY + 0.095, tz, 0.004);
  rb(0.1, 0.04, 0.1, mat('#c8c2b6', 0.35, 0.7), tx - 0.005, vY + 0.1, tz, 0.003);                     // 工作物 (アルミ)
  g.add(_rod([tx + 0.16, vY + 0.035, tz], [tx + 0.28, vY + 0.035, tz], 0.008, chrome));
  // 旋回台 + ラム (コラム上, 後端は後ろへ張り出す)
  g.add(cylAt(0.24, 0.26, 0.08, 28, machineD, 0, cTop + 0.04, zc - 0.275));
  const rY0 = cTop + 0.08, rH = 0.22, rz0 = -d / 2, rz1 = tz - 0.22;
  tag(rb(0.34, rH, rz1 - rz0, machine, 0, rY0 + rH / 2, (rz0 + rz1) / 2));
  [-1, 1].forEach(s => g.add(plainBox(0.012, 0.04, rz1 - rz0 - 0.06, ground, s * 0.172, rY0 + 0.03, (rz0 + rz1) / 2)));
  g.add(cylAt(0.17, 0.17, 0.05, 28, machineD, 0, rY0 + 0.02, rz1 + 0.025).rotateX(Math.PI / 2));      // 旋回アダプタ
  // 主軸ヘッド + クイル + 主軸 + エンドミル + 上部のベルトハウジングとモーター
  const hZ = rz1 + 0.05 + 0.17, hY0 = 1.46, hY1 = rY0 + 0.2;
  tag(rb(0.32, hY1 - hY0, 0.34, machine, 0, (hY0 + hY1) / 2, hZ));
  g.add(cylAt(0.045, 0.045, 0.08, 18, ground, 0, hY0 - 0.04, hZ));
  g.add(cylAt(0.034, 0.034, 0.03, 16, dark, 0, hY0 - 0.095, hZ));
  g.add(cylAt(0.008, 0.008, 0.07, 10, mat('#d6b24a', 0.35, 0.7), 0, hY0 - 0.145, hZ));
  tag(rb(0.3, 0.07, 0.36, machineD, 0, hY1 + 0.035, hZ - 0.02, 0.01));
  const mY0 = hY1 + 0.07, mTop = h;
  const motor = cyl(0.12, 0.12, mTop - mY0 - 0.02, 24, machine); motor.position.set(0, mY0 + (mTop - mY0 - 0.02) / 2, hZ - 0.03); tag(motor); g.add(motor);
  g.add(cylAt(0.1, 0.12, 0.02, 24, machineD, 0, mTop - 0.01, hZ - 0.03));
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; g.add(box(0.006, mTop - mY0 - 0.06, 0.012, machineD, Math.cos(a) * 0.121, mY0 + (mTop - mY0) / 2, hZ - 0.03 + Math.sin(a) * 0.121, false)); }
  // クイル送りレバー (右側面, 3本) + 微動送りハンドル (前面) + 主軸スイッチ (左側面)
  const lvX = 0.2;
  g.add(cylAt(0.035, 0.035, 0.05, 14, chrome, lvX - 0.02, 1.6, hZ).rotateZ(Math.PI / 2));
  [0, 2.09, 4.19].forEach(a => { const e = [lvX, 1.6 + Math.cos(a) * 0.18, hZ + Math.sin(a) * 0.18]; g.add(_rod([lvX, 1.6, hZ], e, 0.009, chrome)); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), black).translateX(e[0]).translateY(e[1]).translateZ(e[2])); });
  _handwheel(g, 0.08, 1.56, hZ + 0.2, 'z', 1, 0.05, chrome, black);
  rb(0.05, 0.12, 0.08, dark, -0.185, 1.66, hZ + 0.06, 0.006);
  [['#22c55e', 1.69], ['#ef4444', 1.64]].forEach(([c, y]) => g.add(cylAt(0.011, 0.011, 0.012, 10, mat(c, 0.4), -0.214, y, hZ + 0.06).rotateZ(Math.PI / 2)));
  // クーラントノズル (曲がるホース) + 作業灯 (コラム左)
  const hose = [[0.12, hY0 + 0.02, hZ + 0.12], [0.14, hY0 - 0.06, hZ + 0.1], [0.1, hY0 - 0.14, hZ + 0.06], [0.03, hY0 - 0.17, hZ + 0.02]];
  for (let i = 0; i < hose.length - 1; i++) g.add(_rod(hose[i], hose[i + 1], 0.008, mat('#3a7fd0', 0.4)));
  const lamp = [[-0.27, 1.45, zc - 0.05], [-0.36, 1.62, zc + 0.05], [-0.3, 1.62, zc + 0.25]];
  for (let i = 0; i < lamp.length - 1; i++) g.add(_rod(lamp[i], lamp[i + 1], 0.01, dark));
  const shadeM = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 14, 1, true), dark); shadeM.position.set(-0.28, 1.59, zc + 0.3); shadeM.material.side = THREE.DoubleSide; g.add(shadeM);
  return g;
}
// キラ 卓上ボール盤 KID-420 (本体 H1275・ベース600×340・130kg, テーブル300×300, 振り420mm) + 汎用ボール盤台 (H500)
// 振り420mm = 主軸中心〜コラム中心 210mm。モーターはコラムの後ろに縦置きし、上部のベルトカバーで主軸へ。
// ベース(600)の後端からはみ出さない配置にして、外形を w×d×h に収める。
function buildDrillPress({ color='#4f7a52', w=0.45, d=0.6, h=1.775 } = {}) {
  const g = new THREE.Group();
  const machine = mat(color, 0.45, 0.3, { env: 0.5 }), steel = mat('#a9b1b8', 0.28, 0.75, { env: 0.9 }), dark = mat('#2a2f33', 0.5, 0.3), standM = mat('#5b6168', 0.55, 0.35);
  const standH = 0.5, bh = h - standH;
  // ボール盤台 (天板 + 脚 + 下棚)
  g.add(box(w, 0.03, d, standM, 0, standH - 0.015, 0));
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([s, t]) => g.add(box(0.04, standH - 0.03, 0.04, standM, s * (w / 2 - 0.03), (standH - 0.03) / 2, t * (d / 2 - 0.03))));
  g.add(box(w - 0.06, 0.02, d - 0.06, standM, 0, 0.12, 0));
  // ベース (600×340) + コラム
  const y0 = standH, bw = 0.34, colZ = -d / 2 + 0.21, spZ = colZ + 0.21;
  const bs = box(bw, 0.07, d, machine, 0, y0 + 0.035, 0); bs.userData.colorable = true; g.add(bs);
  g.add(box(0.22, 0.004, 0.2, dark, 0, y0 + 0.072, spZ));                                        // T溝の面
  const colTop = y0 + bh - 0.3;
  g.add(cylAt(0.045, 0.045, colTop - (y0 + 0.07), 20, steel, 0, (colTop + y0 + 0.07) / 2, colZ));
  // テーブル (300×300) + アーム + クランプ・昇降ハンドル
  const tY = y0 + 0.42;
  g.add(box(0.3, 0.04, 0.3, dark, 0, tY, spZ));
  g.add(box(0.12, 0.08, spZ - colZ - 0.12, machine, 0, tY - 0.05, (colZ + spZ - 0.12) / 2 + 0.03));
  g.add(cylAt(0.06, 0.06, 0.1, 16, machine, 0, tY - 0.05, colZ));
  g.add(box(0.02, 0.02, 0.14, dark, 0.08, tY - 0.06, colZ + 0.05));
  // ヘッド (主軸ケース) + 後ろの縦置きモーター + 上部ベルトカバー
  const hY = colTop + 0.1;
  const head = box(0.3, 0.34, spZ - colZ + 0.16, machine, 0, hY, (colZ + spZ) / 2); head.userData.colorable = true; g.add(head);
  const mZ = -d / 2 + 0.085, mTop = h - 0.09;
  const motor = cyl(0.08, 0.08, 0.3, 20, machine); motor.position.set(0, mTop - 0.15, mZ); motor.userData.colorable = true; g.add(motor);
  for (let i = 0; i < 6; i++) g.add(box(0.004, 0.2, 0.01, mat(shade(color, 0.8), 0.5, 0.2), Math.cos(i * 0.6 + 1.9) * 0.081, mTop - 0.15, mZ + Math.sin(i * 0.6 + 1.9) * 0.081));   // 冷却フィン
  const cz0 = -d / 2 + 0.005, cz1 = spZ + 0.07;
  g.add(box(0.3, 0.09, cz1 - cz0, mat(shade(color, 0.88), 0.5, 0.2), 0, h - 0.045, (cz0 + cz1) / 2));
  // 主軸 (クイル) + ターレット式ドリルチャック + ドリル
  const qY = hY - 0.17;
  g.add(cylAt(0.038, 0.038, 0.14, 16, steel, 0, qY - 0.07, spZ));
  g.add(cylAt(0.045, 0.035, 0.09, 16, dark, 0, qY - 0.185, spZ));
  g.add(cylAt(0.006, 0.006, 0.12, 8, mat('#d0d4d8', 0.3, 0.7), 0, qY - 0.29, spZ));
  // 送りハンドル (3本スポーク, 右側) + 操作盤 (正面左: 回転数表示・運転/停止)
  const hubX = 0.165, hubZ = spZ - 0.09;
  g.add(cylAt(0.03, 0.03, 0.05, 12, dark, hubX, hY - 0.03, hubZ).rotateZ(Math.PI / 2));
  [0, 2.09, 4.19].forEach(a => { g.add(_rod([hubX + 0.02, hY - 0.03, hubZ], [hubX + 0.035, hY - 0.03 + Math.cos(a) * 0.17, hubZ + Math.sin(a) * 0.17], 0.009, dark)); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), mat('#15171a', 0.4)).translateX(hubX + 0.035).translateY(hY - 0.03 + Math.cos(a) * 0.17).translateZ(hubZ + Math.sin(a) * 0.17)); });
  const fz = spZ + 0.08;
  g.add(box(0.13, 0.17, 0.02, dark, -0.07, hY + 0.02, fz + 0.01));
  g.add(plainBox(0.07, 0.03, 0.004, new THREE.MeshBasicMaterial({ color: 0x7fe08a }), -0.07, hY + 0.07, fz + 0.021));
  [['#22c55e', 0.0], ['#ef4444', -0.05]].forEach(([c, dy]) => g.add(cylAt(0.014, 0.014, 0.012, 12, mat(c, 0.4), -0.07, hY + dy, fz + 0.026).rotateX(Math.PI / 2)));
  return g;
}
// 淀川電機 両頭グラインダー SY-205S (本体 459×274×278, 砥石205×19) + 汎用グラインダースタンド (砥石中心高さ約1m)
function buildBenchGrinder({ color='#4f7a52', w=0.46, d=0.4, h=1.2 } = {}) {
  const g = new THREE.Group();
  const machine = mat(color, 0.45, 0.3, { env: 0.5 }), steel = mat('#a9b1b8', 0.28, 0.75, { env: 0.9 }), dark = mat('#2a2f33', 0.5, 0.3), standM = mat('#50565c', 0.55, 0.35);
  const wheelM = mat('#9a8a78', 0.9, 0.02);
  // スタンド: ベース板 + 支柱 + 天板 (+ 冷却用の水つぼ)
  g.add(box(d, 0.02, d, standM, 0, 0.01, 0));
  g.add(cylAt(0.045, 0.05, 0.84, 16, standM, 0, 0.44, 0));
  g.add(box(0.3, 0.02, 0.22, standM, 0, 0.87, 0));
  g.add(cylAt(0.05, 0.045, 0.1, 14, mat('#8a9096', 0.4, 0.6), 0.12, 0.7, 0.1));
  // 本体: 台座 + モーター (横置き) + 両側の砥石・カバー
  const ax = 1.0;
  g.add(box(0.2, 0.05, 0.26, machine, 0, 0.905, 0));
  const motor = cyl(0.085, 0.085, 0.26, 20, machine); motor.rotation.z = Math.PI / 2; motor.position.set(0, ax, 0); motor.userData.colorable = true; g.add(motor);
  [-1, 1].forEach(s => g.add(cylAt(0.07, 0.07, 0.02, 16, dark, s * 0.135, ax, 0).rotateZ(Math.PI / 2)));
  g.add(box(0.06, 0.04, 0.04, dark, 0, ax - 0.06, 0.09));                                          // スイッチ
  [-1, 1].forEach(s => {
    const wx = s * 0.19;
    const wh = cyl(0.1025, 0.1025, 0.019, 28, wheelM); wh.rotation.z = Math.PI / 2; wh.position.set(wx, ax, 0); g.add(wh);
    g.add(cylAt(0.03, 0.03, 0.03, 12, steel, wx, ax, 0).rotateZ(Math.PI / 2));
    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.045, 24, 1, false, Math.PI * 0.15, Math.PI * 1.35), machine);
    guard.rotation.z = Math.PI / 2; guard.position.set(wx, ax, 0); g.add(guard);
    g.add(box(0.045, 0.012, 0.07, steel, wx, ax - 0.03, 0.12));                                    // ワークレスト
    g.add(box(0.008, 0.1, 0.008, steel, wx, ax + 0.14, 0.09));                                     // アイシールド支柱
    g.add(plainBox(0.1, 0.07, 0.004, new THREE.MeshStandardMaterial({ color: 0xc8e0f0, roughness: 0.08, transparent: true, opacity: 0.3 }), wx, ax + 0.17, 0.11));
  });
  g.add(_rod([0, ax - 0.05, -0.08], [0, 0.88, -0.14], 0.007, mat('#161616', 0.9)));                  // 電源コード
  return g;
}
function buildToolRack({ color='#3a3f47', w=1.0, d=0.12, h=1.2 } = {}) {
  const g = new THREE.Group();
  const board = mat(color, 0.6, 0.1);
  const metal = mat('#aab0b4', 0.3, 0.7, { env: 0.9 });

  // Wall-mount backing cleats
  [-w/2+0.06, w/2-0.06].forEach(rx => {
    g.add(box(0.04, 0.04, 0.06, mat('#555a60', 0.4, 0.5), rx, h*0.95 + 0.2, -0.02));
  });

  // Pegboard panel
  const pb = box(w, h, 0.03, mat(shade(color, 1.1), 0.7), 0, h/2 + 0.2, 0);
  pb.userData.colorable = true; g.add(pb);
  for (let yy = 0.4; yy < h + 0.05; yy += 0.12) {
    for (let xx = -w/2 + 0.1; xx < w/2; xx += 0.12) {
      g.add(cylAt(0.008, 0.008, 0.005, 6, mat('#222', 0.6), xx, yy, 0.016));
    }
  }

  // Front horizontal support rails
  [0.6, 1.0, h + 0.05].forEach(ry => {
    g.add(box(w - 0.06, 0.012, 0.018, metal, 0, ry + 0.2, 0.018));
  });

  // Hanging tools: wrenches (3 sizes)
  const hangTool = (x, len, wdt, c) => g.add(box(wdt, len, 0.02, mat(c, 0.4, 0.5), x, h*0.78 - len/2 + 0.2, 0.03));
  hangTool(-0.42, 0.34, 0.05, '#b8bcc0');
  hangTool(-0.34, 0.3, 0.045, '#b8bcc0');
  hangTool(-0.26, 0.26, 0.04, '#b8bcc0');

  // Hammer (T-head + handle) + shadow outline
  g.add(box(0.12, 0.052, 0.04, metal, -0.05, h*0.9 + 0.2, 0.03));
  g.add(box(0.03, 0.26, 0.03, mat('#8a5a2b', 0.6), -0.05, h*0.75 + 0.2, 0.03));
  g.add(box(0.14, 0.31, 0.005, mat('#1a1e24', 0.8), -0.05, h*0.81 + 0.2, 0.017));

  // Screwdrivers (handle + shaft) + shadow outlines
  [0.12, 0.2, 0.28].forEach((x, i) => {
    g.add(box(0.03, 0.1, 0.03, mat(['#e05a2b','#2b7ae0','#e0c42b'][i], 0.4), x, h*0.85 + 0.2, 0.03));
    g.add(box(0.012, 0.16, 0.012, metal, x, h*0.7 + 0.2, 0.03));
    g.add(box(0.038, 0.29, 0.005, mat('#1a1e24', 0.8), x, h*0.765 + 0.2, 0.018));
  });

  // Pliers + tape measure
  g.add(box(0.06, 0.2, 0.03, mat('#c05a3b', 0.4), 0.4, h*0.78 + 0.2, 0.03));
  g.add(cylAt(0.038, 0.038, 0.025, 12, mat('#f0c020', 0.5, 0.1), 0.44, h*0.6 + 0.2, 0.02).rotateX(Math.PI/2));

  // Bottom shelf with lip + tool boxes + small parts bin
  g.add(box(w, 0.03, 0.18, board, 0, 0.34, 0.08));
  g.add(box(w, 0.04, 0.012, board, 0, 0.365, 0.17));  // shelf lip
  g.add(box(0.3, 0.14, 0.14, mat('#c0392b', 0.5, 0.2), -0.25, 0.42, 0.08));
  g.add(box(0.26, 0.12, 0.14, mat('#2980b9', 0.5, 0.2), 0.15, 0.41, 0.08));
  g.add(box(0.14, 0.1, 0.12, mat('#e0a020', 0.5, 0.1), 0.44, 0.39, 0.08));

  return g;
}

// 寿貿易(メカニクス) 小型帯鋸盤 14型バンドソー (775×583×1550, テーブル500×500, 200kg, 750W): 閉鎖型スタンド + C形フレーム(上下の車輪カバー) + 傾斜テーブル + 鋸刃ガード
function buildBandSaw({ color='#4a5c6a', w=0.775, d=0.583, h=1.55 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.5, 0.15, { env: 0.4 }), dark = mat('#23272b', 0.5, 0.3), steel = mat('#b9c0c6', 0.25, 0.8), tableM = mat('#9aa1a7', 0.3, 0.7, { env: 0.8 });
  const standH = 0.62, tY = 1.0;
  // C形フレームの位置: 背骨の外側 = 左端 (-w/2)。鋸刃 = 車輪(14型 φ356)の右端
  const fx = -w / 2 + 0.24, fz = -0.03, bx = fx + 0.18;
  // スタンド (閉鎖型キャビネット, 前面に扉と電源スイッチ)
  const st = box(0.5, standH, 0.5, body, fx + 0.04, standH / 2, -0.04); st.userData.colorable = true; g.add(st);
  g.add(box(0.36, 0.44, 0.01, mat(shade(color, 0.9), 0.5), fx + 0.04, standH / 2 + 0.04, 0.211));
  g.add(box(0.08, 0.1, 0.05, dark, 0.2, tY - 0.12, 0.22));
  g.add(cylAt(0.02, 0.02, 0.02, 12, mat('#22c55e', 0.4), 0.2, tY - 0.1, 0.25).rotateX(Math.PI / 2));
  g.add(cylAt(0.022, 0.022, 0.02, 12, mat('#ef4444', 0.4), 0.2, tY - 0.14, 0.25).rotateX(Math.PI / 2));
  // C形フレーム: 下車輪カバー・背骨・上車輪カバー (左側)
  const lower = new THREE.Mesh(roundedBoxGeom(0.46, 0.4, 0.2, 0.12, 4), body); lower.position.set(fx, standH + 0.2, fz); lower.userData.colorable = true; g.add(lower);
  const spine = box(0.12, 0.6, 0.16, body, fx - 0.18, standH + 0.55, fz); spine.userData.colorable = true; g.add(spine);
  const upper = new THREE.Mesh(roundedBoxGeom(0.46, 0.38, 0.2, 0.12, 4), body); upper.position.set(fx, h - 0.22, fz); upper.userData.colorable = true; g.add(upper);
  g.add(cylAt(0.012, 0.012, 0.02, 10, steel, fx + 0.1, h - 0.02, fz));                            // 張力調整ねじ
  g.add(cylAt(0.028, 0.028, 0.012, 16, dark, fx + 0.1, h - 0.006, fz));                          // 張力調整ノブ
  // テーブル 500×500 (傾斜用トラニオン) + フェンス + 前面のフェンスレール (右端まで)
  g.add(box(0.5, 0.035, 0.5, tableM, bx + 0.05, tY, 0));
  g.add(box(0.12, 0.08, 0.12, dark, bx, tY - 0.06, 0));
  g.add(box(0.03, 0.06, 0.5, steel, bx + 0.26, tY + 0.045, 0));                                   // リップフェンス
  const railX0 = bx - 0.2, railX1 = w / 2;
  g.add(box(railX1 - railX0, 0.03, 0.03, steel, (railX0 + railX1) / 2, tY - 0.03, d / 2 - 0.015));   // フェンスレール
  g.add(box(0.004, h - 0.33 - tY + 0.1, 0.012, steel, bx, (tY + h - 0.28) / 2, fz + 0.03));         // 鋸刃 (テーブル上の露出部)
  g.add(box(0.05, 0.3, 0.06, mat('#e8b820', 0.5), bx, tY + 0.3, fz + 0.05));                      // 刃ガード (上下調整)
  g.add(box(0.06, 0.05, 0.08, dark, bx, tY + 0.13, fz + 0.05));                                   // 上部ガイド
  g.add(cylAt(0.045, 0.045, 0.06, 14, dark, fx - 0.05, standH + 0.15, fz - 0.14).rotateX(Math.PI / 2));   // 集じん口
  return g;
}
// ダイヘン CO2/MAG 半自動溶接機 DM-350 (溶接電源 250×560×370, 28kg) + ワイヤ送給装置 + 運搬台車: 電源の上に送給装置(ワイヤスプール)を載せた一般的な構成。
// 前面(+Z)に電源の操作パネル (表示・電流/電圧ダイヤル), トーチケーブルを掛けた状態。
function buildWelderStation({ color='#2e4a6a', w=0.45, d=0.65, h=0.9 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.5, 0.2, { env: 0.3 }), panel = mat('#18191b', 0.6), steel = mat('#9aa2aa', 0.3, 0.7), rub = mat('#141414', 0.85), cart = mat('#3a3f45', 0.55, 0.35);
  // 台車 (4輪)
  g.add(box(w - 0.04, 0.03, d - 0.02, cart, 0, 0.1, 0));
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([s, t]) => { const wh = cyl(0.04, 0.04, 0.03, 14, rub); wh.rotation.z = Math.PI / 2; wh.position.set(s * (w / 2 - 0.05), 0.04, t * (d / 2 - 0.06)); g.add(wh); g.add(box(0.03, 0.05, 0.03, steel, s * (w / 2 - 0.05), 0.08, t * (d / 2 - 0.06))); });
  const hTop = h - 0.012;
  g.add(_rod([-(w / 2 - 0.03), 0.12, -d / 2 + 0.02], [-(w / 2 - 0.03), hTop, -d / 2 + 0.02], 0.012, steel));
  g.add(_rod([w / 2 - 0.03, 0.12, -d / 2 + 0.02], [w / 2 - 0.03, hTop, -d / 2 + 0.02], 0.012, steel));
  g.add(_rod([-(w / 2 - 0.03), hTop, -d / 2 + 0.02], [w / 2 - 0.03, hTop, -d / 2 + 0.02], 0.012, steel));   // 押し手
  g.add(_rod([-(w / 2 - 0.03), 0.62, -d / 2 + 0.02], [w / 2 - 0.03, 0.62, -d / 2 + 0.02], 0.009, steel));   // ボンベ受けの横桟
  // 溶接電源 DM-350 (幅250×奥行560×高さ370)
  const pY = 0.115, pw = 0.25, pd = 0.56, ph = 0.37;
  const ps = new THREE.Mesh(roundedBoxGeom(pw, ph, pd, 0.015, 3), body); ps.position.set(0, pY + ph / 2, 0); ps.castShadow = true; ps.userData.colorable = true; g.add(ps);
  g.add(box(pw - 0.03, ph - 0.05, 0.01, panel, 0, pY + ph / 2, pd / 2 + 0.002));
  const led = new THREE.MeshStandardMaterial({ color: 0x1a0a00, emissive: new THREE.Color('#ff7a00'), emissiveIntensity: 0.8 });
  [-0.055, 0.055].forEach(x => g.add(plainBox(0.07, 0.03, 0.003, led, x, pY + ph - 0.07, pd / 2 + 0.008)));
  [-0.055, 0.055].forEach(x => g.add(cylAt(0.024, 0.024, 0.016, 16, mat('#d0d4d8', 0.4, 0.5), x, pY + ph - 0.15, pd / 2 + 0.012).rotateX(Math.PI / 2)));
  [-0.06, 0.06].forEach((x, i) => g.add(cylAt(0.016, 0.016, 0.02, 12, mat(i ? '#1a1a1a' : '#c05a1a', 0.4, 0.4), x, pY + 0.07, pd / 2 + 0.012).rotateX(Math.PI / 2)));   // 出力端子
  for (let i = 0; i < 6; i++) g.add(box(0.004, 0.01, pd * 0.6, panel, pw / 2 + 0.001, pY + 0.08 + i * 0.03, 0));   // 側面の通風孔
  // ワイヤ送給装置 (電源の上) + ワイヤスプール(銅色) + 蓋
  const fY = pY + ph, fw = 0.22, fd = 0.44, fh = 0.3;
  g.add(box(fw, 0.12, fd, mat('#d8dde2', 0.45, 0.2), 0, fY + 0.06, -0.02));
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 28), mat('#c07a3a', 0.4, 0.5)); spool.rotation.z = Math.PI / 2; spool.position.set(0, fY + 0.2, -0.05); spool.castShadow = true; g.add(spool);
  [-1, 1].forEach(s => g.add(cylAt(0.152, 0.152, 0.006, 28, mat('#4a4f55', 0.5, 0.3), s * 0.053, fY + 0.2, -0.05).rotateZ(Math.PI / 2)));
  g.add(box(0.09, 0.08, 0.1, panel, 0, fY + 0.1, fd / 2 - 0.08));                                    // 送給ローラ部
  // トーチケーブル (巻いて台車の右側に掛ける) + トーチ (ノズルを下にしてフックに掛ける)
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 8, 24), rub); coil.rotation.y = Math.PI / 2; coil.position.set(w / 2 - 0.02, 0.42, 0.05); g.add(coil);
  g.add(box(0.03, 0.02, 0.05, steel, w / 2 - 0.02, 0.76, 0.2));                                   // トーチフック
  const torch = cyl(0.014, 0.011, 0.24, 10, panel); torch.rotation.x = 0.25; torch.position.set(w / 2 - 0.025, 0.64, 0.2); g.add(torch);
  const nozzle = cyl(0.011, 0.016, 0.05, 10, mat('#b87333', 0.3, 0.7)); nozzle.rotation.x = 0.25; nozzle.position.set(w / 2 - 0.025, 0.5, 0.235); g.add(nozzle);
  return g;
}
// マサダ製作所 卓上矯正油圧プレス(手動) 10トン MTP-10HP (505×495×1235, 43kg, ストローク140): H形フレーム + ピン高さ調整のベッド +
// 上部シリンダー(ラム) + 圧力計 + 右側の手動ポンプとレバー
function buildHydraulicPress({ color='#3a5a3a', w=0.505, d=0.495, h=1.235 } = {}) {
  const g = new THREE.Group();
  const frame = mat(color, 0.5, 0.25, { env: 0.4 }), steel = mat('#b3bac0', 0.25, 0.8, { env: 0.8 }), dark = mat('#23272b', 0.5, 0.3), red = mat('#c0392b', 0.45, 0.2);
  const uw = 0.06, ux = (w - 0.14) / 2;                             // 支柱中心 (右外側の手動ポンプを含めて幅 w。最後に全体を左へ寄せる)
  // 脚 (前後に長い溝形鋼) + 支柱 (溝形鋼 2 本 × 左右) + 上梁
  [-1, 1].forEach(s => {
    g.add(box(0.07, 0.07, d, frame, s * ux, 0.035, 0));
    [-1, 1].forEach(t => { const u = box(uw, h - 0.07, 0.035, frame, s * ux, 0.07 + (h - 0.07) / 2, t * 0.035); u.userData.colorable = true; g.add(u); });
    for (let i = 0; i < 7; i++) g.add(cylAt(0.009, 0.009, 0.08, 10, dark, s * ux, 0.3 + i * 0.075, 0).rotateX(Math.PI / 2));   // ピン穴
  });
  const topB = box(2 * ux + 0.09, 0.12, 0.13, frame, 0, h - 0.06, 0); topB.userData.colorable = true; g.add(topB);
  // ベッド (溝形鋼 2 本) + 支えピン + Vブロック
  const bedY = 0.52;
  [-1, 1].forEach(t => g.add(box(2 * ux + 0.04, 0.1, 0.04, frame, 0, bedY, t * 0.035)));
  [-1, 1].forEach(s => g.add(cylAt(0.013, 0.013, 0.14, 12, steel, s * ux, bedY - 0.07, 0).rotateX(Math.PI / 2)));
  [-1, 1].forEach(s => g.add(box(0.08, 0.05, 0.08, steel, s * 0.08, bedY + 0.075, 0)));
  // シリンダー + ラム + 圧力計
  g.add(cylAt(0.05, 0.05, 0.22, 20, red, 0, h - 0.23, 0));
  g.add(cylAt(0.028, 0.028, 0.16, 16, steel, 0, h - 0.41, 0));
  g.add(cylAt(0.04, 0.04, 0.02, 16, steel, 0, h - 0.5, 0));
  const gauge = cyl(0.035, 0.035, 0.02, 20, mat('#f2f2f0', 0.3)); gauge.rotation.x = Math.PI / 2; gauge.position.set(-0.1, h - 0.06, 0.09); g.add(gauge);   // 圧力計 (上梁の前面)
  g.add(cylAt(0.037, 0.037, 0.008, 20, steel, -0.1, h - 0.06, 0.078).rotateX(Math.PI / 2));
  // 手動ポンプ (右支柱の外側) + レバー + 油圧ホース
  g.add(box(0.07, 0.12, 0.09, red, ux + 0.06, 0.8, 0));
  g.add(_rod([ux + 0.06, 0.86, 0], [ux + 0.07, 1.15, 0.2], 0.011, steel));
  g.add(_rod([ux + 0.06, 0.86, -0.04], [0.04, h - 0.2, -0.04], 0.007, dark));
  g.children.forEach(c => { c.position.x -= 0.025; });                // 左端 = -w/2, ポンプ外側 = +w/2
  return g;
}
// Bambu Lab X1-Carbon (389×389×457): 密閉CoreXY機。ダークグレー筐体・前面ガラス扉・天面ガラス蓋・右上タッチパネル
function build3DPrinter({ color='#3a3d42', w=0.389, d=0.389, h=0.457 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.5, 0.2, { env: 0.4 }), frame_m = mat('#1a1a1a', 0.4, 0.3);
  const glass_m = new THREE.MeshStandardMaterial({ color: 0xc8dce8, transparent: true, opacity: 0.22, roughness: 0.05 });
  const filament_m = mat('#ff8822', 0.5);
  const outer = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.015, 4), body); outer.position.set(0, h / 2, 0); outer.castShadow = true; outer.userData.colorable = true; g.add(outer);
  // 前面ガラス扉 (下段) と黒フレーム
  g.add(box(w - 0.04, h * 0.62, 0.006, frame_m, 0, h * 0.4, d / 2 - 0.004));
  const frontGlass = plainBox(w - 0.07, h * 0.58, 0.004, glass_m, 0, h * 0.4, d / 2 + 0.002); g.add(frontGlass);
  g.add(box(0.012, 0.05, 0.01, mat('#888', 0.3, 0.6), w * 0.38, h * 0.4, d / 2 + 0.006)); // 扉ハンドル
  // 天面ガラス蓋
  g.add(plainBox(w - 0.06, 0.004, d - 0.06, glass_m, 0, h + 0.002, 0));
  // 内部: ビルドプレート・X軸ガントリー・ツールヘッド
  const buildPlate = new THREE.Mesh(roundedBoxGeom(w * 0.7, 0.012, d * 0.7, 0.004, 4), mat('#3a3a3a', 0.6, 0.3)); buildPlate.position.set(0, h * 0.2, 0); g.add(buildPlate);
  g.add(box(w * 0.5, 0.01, 0.02, mat('#d8d8d8', 0.5), 0, h * 0.21, 0)); // 造形物(薄板)
  const xRail = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, w * 0.8, 8), frame_m); xRail.rotation.z = Math.PI / 2; xRail.position.set(0, h * 0.8, 0); g.add(xRail);
  const head = new THREE.Mesh(roundedBoxGeom(0.05, 0.06, 0.05, 0.008, 4), frame_m); head.position.set(0, h * 0.76, 0); g.add(head);
  g.add(cylAt(0.005, 0.003, 0.02, 8, mat('#e08030', 0.3, 0.7), 0, h * 0.72, 0)); // ノズル
  // 背面スプールホルダー
  const spool = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.016, 8, 24), filament_m); spool.rotation.x = Math.PI / 2; spool.position.set(0, h * 0.6, -d / 2 - 0.03); spool.castShadow = true; g.add(spool);
  // 右上 5インチ タッチパネル
  const scrM = new THREE.MeshStandardMaterial({ color: 0x0c1a26, roughness: 0.3, metalness: 0.1, emissive: new THREE.Color('#1a4a6a'), emissiveIntensity: 0.55 });
  g.add(box(0.12, 0.075, 0.008, frame_m, w * 0.28, h * 0.86, d / 2 + 0.002));
  g.add(plainBox(0.105, 0.06, 0.004, scrM, w * 0.28, h * 0.86, d / 2 + 0.008));
  return g;
}
// xTool P2 (1000×639×268, 45kg): 黒い筐体 + 大きなガラス窓付きの蓋 (蓋の天面にカメラ), 背面の排気口
function buildLaserCutter({ color='#2a2a2a', w=1.0, d=0.639, h=0.268 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.55, 0.1), cover_m = mat('#303234', 0.5, 0.1), glass_m = new THREE.MeshStandardMaterial({ color: 0x5a3a20, transparent: true, opacity: 0.45, roughness: 0.05 });
  const baseH = h * 0.5, lidH = h - baseH;
  const base = new THREE.Mesh(roundedBoxGeom(w, baseH, d, 0.025, 4), body); base.position.set(0, baseH / 2, 0); base.castShadow = true; base.userData.colorable = true; g.add(base);
  const lid = new THREE.Mesh(roundedBoxGeom(w - 0.01, lidH, d - 0.01, 0.025, 4), cover_m); lid.position.set(0, baseH + lidH / 2, 0); lid.castShadow = true; g.add(lid);
  g.add(plainBox(w * 0.72, 0.004, d * 0.62, glass_m, 0, h + 0.001, 0.02));                          // 天面の窓 (オレンジのCO2レーザー用フィルター)
  g.add(plainBox(w * 0.72, lidH * 0.5, 0.004, glass_m, 0, baseH + lidH * 0.5, d / 2 - 0.004));        // 前面の窓
  g.add(box(0.06, 0.012, 0.04, mat('#111', 0.4), 0, h + 0.004, -d * 0.25));                          // カメラ
  g.add(box(w * 0.5, 0.01, 0.02, mat('#555', 0.4, 0.5), 0, baseH + lidH * 0.9, d / 2 + 0.002));       // 取っ手
  g.add(box(0.18, baseH * 0.5, 0.01, mat('#1a1a1a', 0.7), w * 0.36, baseH * 0.5, d / 2 + 0.004));     // 操作部
  g.add(cylAt(0.018, 0.018, 0.006, 16, mat('#e03030', 0.4), w * 0.42, baseH * 0.55, d / 2 + 0.01).rotateX(Math.PI / 2));
  const ex = cyl(0.05, 0.05, 0.04, 16, mat('#555', 0.5, 0.2)); ex.rotation.x = Math.PI / 2; ex.position.set(-w * 0.3, baseH * 0.55, -d / 2 - 0.018); g.add(ex);   // 背面の排気口
  return g;
}
// 京セラ(リョービ) 卓上糸ノコ盤 TF-5400 (長さ590×幅248×高さ490, 17kg, ふところ400): 低いベースの上に下アーム(モーター部)と作業テーブル,
// 後方の支柱から前方へ伸びる細い上アーム(C形), 前端に鋸刃・押さえ・ブロワー。長手方向 = 奥行(D), 刃が前面(+Z)
function buildScrollSaw({ color='#4a5a4a', w=0.248, d=0.59, h=0.49 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.5, 0.15, { env: 0.3 }), dark = mat('#23272b', 0.5, 0.3), tableM = mat('#b3b9be', 0.3, 0.75, { env: 0.8 }), steel = mat('#c8cdd2', 0.25, 0.8);
  const bz = d / 2 - 0.11, tY = 0.2;                                                               // 刃の Z, テーブル上面高さ
  g.add(box(w, 0.045, d - 0.02, dark, 0, 0.0225, 0));                                               // ベース
  [-1, 1].forEach(s => [-1, 1].forEach(t => g.add(cylAt(0.014, 0.016, 0.01, 10, mat('#111', 0.8), s * (w / 2 - 0.03), 0.005, t * (d / 2 - 0.05)))));
  const low = box(0.15, tY - 0.06, d * 0.62, body, 0, 0.045 + (tY - 0.06) / 2, -0.02); low.userData.colorable = true; g.add(low);   // 下アーム(モーター)
  g.add(box(w, 0.012, 0.3, tableM, 0, tY - 0.006, bz - 0.04));                                      // テーブル (幅 = 本体幅)
  g.add(box(0.012, 0.006, 0.08, dark, 0, tY + 0.001, bz + 0.05));                                   // テーブルの刃溝
  const col = box(0.07, h - 0.07, 0.07, body, 0, 0.045 + (h - 0.07) / 2, -d / 2 + 0.07); col.userData.colorable = true; g.add(col);   // 後方支柱
  const arm = box(0.05, 0.045, bz - (-d / 2 + 0.05) + 0.03, body, 0, h - 0.0225, (bz + (-d / 2 + 0.05)) / 2 + 0.015); arm.userData.colorable = true; g.add(arm);   // 上アーム
  g.add(box(0.035, 0.06, 0.04, dark, 0, h - 0.07, bz));                                              // 刃の上部クランプ
  g.add(box(0.003, h - 0.07 - tY + 0.06, 0.003, steel, 0, (h - 0.07 + tY - 0.06) / 2, bz));          // 鋸刃
  g.add(_rod([0.02, h - 0.06, bz - 0.01], [0.02, tY + 0.03, bz - 0.01], 0.004, steel));               // 押さえの支柱
  g.add(box(0.05, 0.004, 0.03, steel, 0.01, tY + 0.02, bz + 0.005));                                 // 押さえ
  g.add(_rod([-0.02, h - 0.05, bz - 0.06], [-0.012, tY + 0.04, bz - 0.005], 0.003, mat('#2f7ad0', 0.4)));   // ブロワー管
  g.add(cylAt(0.018, 0.018, 0.02, 12, dark, w / 2 - 0.035, 0.07, d / 2 - 0.06).rotateX(Math.PI / 2));  // 速度ダイヤル
  g.add(box(0.03, 0.035, 0.02, mat('#e8b820', 0.4), -w / 2 + 0.045, 0.07, d / 2 - 0.055));             // スイッチ
  return g;
}


// 2点を結ぶ棒 (筋かい・レバー・ホース等)
function _rod(a, b, r, material) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), material);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  m.castShadow = true; return m;
}

// 工作機械のハンドル車 (リム + ハブ + 3本スポーク + 回し手)。axis 方向 (sgn=±1) が外向き、回し手は外へ突き出す
function _handwheel(g, x, y, z, axis, sgn, r, rimM, knobM) {
  const hw = new THREE.Group(); hw.position.set(x, y, z);
  hw.add(new THREE.Mesh(new THREE.TorusGeometry(r, Math.max(0.006, r * 0.09), 8, 28), rimM));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.28, r * 0.3, 0.045, 16), rimM); hub.rotation.x = Math.PI / 2; hw.add(hub);
  for (let i = 0; i < 3; i++) {
    const a = i * Math.PI * 2 / 3 + 0.5, sp = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.07, r * 0.07, r, 6), rimM);
    sp.position.set(Math.cos(a) * r / 2, Math.sin(a) * r / 2, 0); sp.rotation.z = a - Math.PI / 2; hw.add(sp);
  }
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.07, 10), knobM); knob.rotation.x = Math.PI / 2; knob.position.set(Math.cos(0.5) * r, Math.sin(0.5) * r, 0.045); hw.add(knob);
  if (axis === 'x') hw.rotation.y = sgn * Math.PI / 2; else if (sgn < 0) hw.rotation.y = Math.PI;
  hw.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(hw);
  return hw;
}

export { build3DPrinter, buildAnalyticalBalance, buildBandSaw, buildBenchGrinder, buildCentrifuge, buildChemShelf, buildDrillPress, buildFumeHood, buildGlassware, buildHydraulicPress, buildLabBench, buildLaserCutter, buildLathe, buildMicroscope, buildMillingMachine, buildOscilloscope, buildScrollSaw, buildTestBench, buildToolRack, buildWelderStation };
