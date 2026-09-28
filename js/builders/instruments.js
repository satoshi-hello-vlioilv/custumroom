import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

// Agilent 1260 Infinity II LC (ポンプ180/バイアルサンプラ320/カラム恒温槽160/DAD140mm, 幅396・奥行436〜468mm) を
// 汎用ラボカート (天板高さ約60cm, キャスター) に積み, 最上段に溶媒キャビネット(ボトル4本)。各モジュール前面は濃灰のカバー+状態LED。
function buildHPLC({ color='#e8e2d6', w=0.6, d=0.6, h=1.72 } = {}) {
  const g = new THREE.Group();
  const cartM = mat('#5b6168', 0.5, 0.4), shell = mat('#eceeee', 0.4, 0.06, { env: 0.5 }), front = mat('#3c4046', 0.45, 0.15), rub = mat('#161616', 0.85);
  const led = new THREE.MeshStandardMaterial({ color: 0x0a2a10, emissive: new THREE.Color('#2fd060'), emissiveIntensity: 0.9 });
  // カート (天板 + 下棚 + 4本脚 + キャスター)
  const cartH = 0.6;
  g.add(box(w, 0.03, d, cartM, 0, cartH - 0.015, 0));
  g.add(box(w - 0.04, 0.02, d - 0.04, cartM, 0, 0.18, 0));
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([s, t]) => { g.add(box(0.03, cartH - 0.1, 0.03, cartM, s * (w / 2 - 0.03), 0.07 + (cartH - 0.1) / 2, t * (d / 2 - 0.03))); const c = cyl(0.03, 0.03, 0.025, 12, rub); c.rotation.z = Math.PI / 2; c.position.set(s * (w / 2 - 0.03), 0.03, t * (d / 2 - 0.03)); g.add(c); });
  // モジュール (下から ポンプ → バイアルサンプラ → カラム恒温槽 → DAD)
  const mods = [
    { n: 'pump', H: 0.18, W: 0.396, D: 0.436 },
    { n: 'als', H: 0.32, W: 0.396, D: 0.468 },
    { n: 'mct', H: 0.16, W: 0.435, D: 0.436 },
    { n: 'dad', H: 0.14, W: 0.396, D: 0.436 },
  ];
  let y = cartH;
  const fz = d / 2 - 0.06;
  mods.forEach(m => {
    const b = box(m.W, m.H - 0.004, m.D, shell, 0, y + m.H / 2, fz - m.D / 2); b.userData.colorable = true; g.add(b);
    const fp = new THREE.Mesh(roundedBoxGeom(m.W - 0.02, m.H - 0.02, 0.02, 0.01, 3), front); fp.position.set(0, y + m.H / 2, fz + 0.005); g.add(fp);
    g.add(plainBox(0.018, 0.006, 0.003, led, -m.W / 2 + 0.03, y + m.H - 0.025, fz + 0.016));
    if (m.n === 'pump') { g.add(cylAt(0.02, 0.02, 0.02, 14, mat('#d0d4d8', 0.3, 0.7), m.W / 2 - 0.08, y + m.H / 2, fz + 0.022).rotateX(Math.PI / 2)); }
    if (m.n === 'als') { g.add(plainBox(m.W - 0.12, m.H - 0.12, 0.004, new THREE.MeshStandardMaterial({ color: 0x1a2a38, roughness: 0.05, transparent: true, opacity: 0.6 }), 0, y + m.H / 2, fz + 0.017));
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) g.add(cylAt(0.006, 0.006, 0.03, 8, mat('#8fa0b0', 0.3, 0.1), -0.12 + c * 0.034, y + 0.08 + r * 0.05, fz - 0.05 - r * 0.02)); }
    if (m.n === 'mct') g.add(box(m.W - 0.1, 0.012, 0.01, mat('#9aa2aa', 0.4, 0.5), 0, y + m.H / 2, fz + 0.018));
    y += m.H;
  });
  // 溶媒キャビネット + 溶媒ボトル4本 (褐色/透明) + テフロンチューブ
  g.add(box(0.396, 0.08, 0.436, shell, 0, y + 0.04, fz - 0.218));
  y += 0.08;
  [-0.12, -0.04, 0.04, 0.12].forEach((x, i) => {
    g.add(cylAt(0.034, 0.034, 0.16, 16, mat(i % 2 ? '#e8eef0' : '#7a4a22', 0.15, 0.05), x, y + 0.08, fz - 0.2));
    g.add(cylAt(0.018, 0.018, 0.03, 12, mat('#2f6ac0', 0.4), x, y + 0.175, fz - 0.2));
    g.add(cylAt(0.002, 0.002, 0.5, 6, mat('#e8e2d0', 0.6), x + 0.01, y - 0.1, fz - 0.22));
  });
  return g;
}
// 島津 紫外可視分光光度計 UV-1900i (幅450×奥行501×高さ244, 16.6kg): 明るいグレーの筐体, 左手前に傾いたカラー液晶, 右側に試料室の上開き蓋
function buildSpectrophotometer({ color='#e8e2d6', w=0.45, d=0.501, h=0.244 } = {}) {
  const g = new THREE.Group();
  const shell = mat('#e7e9e8', 0.4, 0.05, { env: 0.5 }), shellD = mat('#c9cdcf', 0.45, 0.05), dark = mat('#26292d', 0.45, 0.2);
  const base = new THREE.Mesh(roundedBoxGeom(w, h - 0.02, d, 0.02, 3), shell); base.position.set(0, (h - 0.02) / 2, 0); base.castShadow = true; base.userData.colorable = true; g.add(base);
  g.add(box(w - 0.004, 0.03, d - 0.004, shellD, 0, 0.015, 0));                                       // 下部の帯
  // 試料室の蓋 (右側・上開き, 少し高い)
  const lid = new THREE.Mesh(roundedBoxGeom(0.19, 0.03, 0.3, 0.012, 3), shellD); lid.position.set(w / 2 - 0.115, h - 0.01, 0.02); lid.castShadow = true; g.add(lid);
  g.add(box(0.08, 0.01, 0.02, dark, w / 2 - 0.115, h - 0.02, 0.18));                                   // 蓋の取っ手
  // 左手前のカラー液晶 (チルト)
  const pnl = new THREE.Group(); pnl.position.set(-w / 2 + 0.13, h - 0.035, d / 2 - 0.1); pnl.rotation.x = -0.9; g.add(pnl);
  pnl.add(box(0.2, 0.14, 0.016, dark, 0, 0, 0));
  pnl.add(plainBox(0.17, 0.105, 0.004, new THREE.MeshStandardMaterial({ color: 0x0b1726, emissive: new THREE.Color('#2a6aa0'), emissiveIntensity: 0.55 }), 0, 0, 0.009));
  // 前面: 電源スイッチ・USB
  g.add(box(0.02, 0.02, 0.006, dark, w / 2 - 0.05, 0.06, d / 2 + 0.002));
  g.add(box(0.014, 0.006, 0.004, dark, -w / 2 + 0.06, 0.06, d / 2 + 0.002));
  return g;
}
// ヤマト科学 定温乾燥器 DX302 (幅400×奥行440×高さ630, 自然対流): 白い本体, 前面の扉(右側に取っ手), 扉下の操作パネル(デジタル表示), 天面の排気口
function buildLabOven({ color='#e8e2d6', w=0.4, d=0.44, h=0.63 } = {}) {
  const g = new THREE.Group();
  const shell = mat('#f0f0ec', 0.42, 0.05, { env: 0.4 }), door = mat('#f6f6f2', 0.4, 0.04), dark = mat('#26292d', 0.45, 0.2), steel = mat('#b8c0c6', 0.3, 0.75);
  const body = new THREE.Mesh(roundedBoxGeom(w, h - 0.02, d - 0.03, 0.012, 3), shell); body.position.set(0, 0.02 + (h - 0.02) / 2, -0.015); body.castShadow = true; body.userData.colorable = true; g.add(body);
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([s, t]) => g.add(cylAt(0.015, 0.017, 0.02, 10, dark, s * (w / 2 - 0.05), 0.01, t * (d / 2 - 0.06))));
  // 操作パネル (下部)
  const pH = 0.13;
  g.add(box(w - 0.02, pH, 0.012, mat('#dfe2e4', 0.45), 0, 0.03 + pH / 2, d / 2 - 0.02));
  g.add(plainBox(0.12, 0.035, 0.004, new THREE.MeshStandardMaterial({ color: 0x1a0505, emissive: new THREE.Color('#e03a2a'), emissiveIntensity: 0.8 }), -0.07, 0.03 + pH * 0.62, d / 2 - 0.012));
  for (let i = 0; i < 4; i++) g.add(box(0.022, 0.016, 0.006, dark, 0.03 + i * 0.03, 0.03 + pH * 0.35, d / 2 - 0.011));
  g.add(box(0.03, 0.02, 0.008, mat('#2a9d4a', 0.4), w / 2 - 0.04, 0.03 + pH * 0.62, d / 2 - 0.011));   // 電源
  // 扉 + 取っ手 + パッキン
  const dY0 = 0.03 + pH + 0.008, dH = h - dY0 - 0.02;
  const dr = new THREE.Mesh(roundedBoxGeom(w - 0.02, dH, 0.03, 0.01, 3), door); dr.position.set(0, dY0 + dH / 2, d / 2 - 0.015); dr.castShadow = true; g.add(dr);
  g.add(box(0.03, 0.12, 0.03, steel, w / 2 - 0.045, dY0 + dH / 2, d / 2 + 0.012));
  // 天面の排気口 (ダンパー)
  g.add(cylAt(0.018, 0.018, 0.04, 12, steel, 0, h + 0.01, -0.08));
  g.add(cylAt(0.028, 0.028, 0.008, 12, steel, 0, h + 0.03, -0.08));
  return g;
}
// PHC CO2インキュベーター MCO-170AICUV (幅620×奥行730×高さ905, 165L): 白い本体, 操作パネル(タッチLCD)付きの外扉(右吊り), 左端の縦ハンドル, 脚
function buildIncubator({ color='#e8e2d6', w=0.62, d=0.73, h=0.905 } = {}) {
  const g = new THREE.Group();
  const shell = mat('#f2f2ef', 0.4, 0.05, { env: 0.5 }), door = mat('#f7f7f4', 0.38, 0.04), dark = mat('#2a2e33', 0.45, 0.2), steel = mat('#b8c0c6', 0.3, 0.75);
  const footH = 0.04, bodyH = h - footH - 0.012, fz = d / 2 - 0.03;                               // 扉の前面 (ハンドル・パネルを含めて奥行 d に収める)
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([s, t]) => g.add(cylAt(0.02, 0.022, footH, 10, dark, s * (w / 2 - 0.06), footH / 2, t * (d / 2 - 0.06))));
  const body = new THREE.Mesh(roundedBoxGeom(w, bodyH, d - 0.07, 0.02, 3), shell); body.position.set(0, footH + bodyH / 2, -0.035); body.castShadow = true; body.userData.colorable = true; g.add(body);
  // 外扉 (前面いっぱい, 右ヒンジ) + 周囲のパッキン線
  const dr = new THREE.Mesh(roundedBoxGeom(w - 0.01, bodyH - 0.01, 0.04, 0.015, 3), door); dr.position.set(0, footH + bodyH / 2, fz - 0.02); dr.castShadow = true; g.add(dr);
  g.add(box(w - 0.02, 0.004, 0.004, mat('#c8ccd0', 0.6), 0, footH + 0.01, fz + 0.001));
  // 操作パネル (扉上部: タッチLCD + キー)
  const pY = footH + bodyH - 0.1;
  g.add(box(0.3, 0.11, 0.012, dark, 0.04, pY, fz + 0.006));
  g.add(plainBox(0.14, 0.08, 0.004, new THREE.MeshStandardMaterial({ color: 0x0b1a26, emissive: new THREE.Color('#1c5a8a'), emissiveIntensity: 0.6 }), -0.03, pY, fz + 0.013));
  for (let i = 0; i < 3; i++) g.add(box(0.03, 0.02, 0.006, mat('#d9dde0', 0.5), 0.1 + (i % 2) * 0.04, pY + 0.02 - Math.floor(i / 2) * 0.04, fz + 0.014));
  // 縦ハンドル (左端) + ヒンジ (右)
  g.add(box(0.025, 0.3, 0.03, steel, -w / 2 + 0.04, footH + bodyH / 2, fz + 0.015));
  [0.2, bodyH - 0.2].forEach(yy => g.add(box(0.02, 0.06, 0.03, steel, w / 2 - 0.012, footH + yy, fz - 0.01)));
  // 天面後部の CO2 ガス接続口・アクセスポート
  g.add(cylAt(0.02, 0.02, 0.012, 12, steel, -0.15, h - 0.006, -d / 2 + 0.1));
  g.add(cylAt(0.03, 0.03, 0.01, 14, mat('#dfe2e4', 0.4), 0.15, h - 0.007, -d / 2 + 0.12));
  return g;
}
// アズワン 超音波洗浄器 ASU-6 (380×247×340): ステンレスの本体・槽, 前面の操作部(タイマー・ヒーター), 取っ手付きの蓋, 側面の排水コック
function buildUltrasonicCleaner({ color='#c0c8cc', w=0.38, d=0.247, h=0.34 } = {}) {
  const g = new THREE.Group();
  const sus = mat('#cdd2d6', 0.28, 0.85, { env: 0.9 }), susD = mat('#aeb4b9', 0.35, 0.8), dark = mat('#26292d', 0.45, 0.2);
  const water = new THREE.MeshStandardMaterial({ color: 0xb0d0e8, transparent: true, opacity: 0.45, roughness: 0.05 });
  const bodyH = h - 0.07, bw = w - 0.036, bxc = -0.018;                                           // 本体 (右側面の排水コックを含めて幅 w)
  const body = new THREE.Mesh(roundedBoxGeom(bw, bodyH, d, 0.012, 3), sus); body.position.set(bxc, bodyH / 2, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  // 前面の操作パネル (黒) + タイマーノブ + スイッチ + ランプ
  g.add(box(bw - 0.06, bodyH * 0.35, 0.006, dark, bxc, bodyH * 0.25, d / 2 - 0.002));
  g.add(cylAt(0.018, 0.018, 0.012, 16, mat('#d8dce0', 0.4, 0.5), bxc - 0.08, bodyH * 0.25, d / 2 + 0.004).rotateX(Math.PI / 2));
  [0.03, 0.08].forEach((x, i) => { g.add(box(0.025, 0.018, 0.008, mat(i ? '#e8b020' : '#e8e8e8', 0.5), bxc + x, bodyH * 0.25, d / 2 + 0.002)); });
  g.add(cylAt(0.005, 0.005, 0.006, 10, mat('#2fd060', 0.3), bxc + 0.13, bodyH * 0.25, d / 2 + 0.001).rotateX(Math.PI / 2));
  // 蓋 (ステンレス, 中央の取っ手) + 槽の水面 (蓋の隙間から少し見える)
  const lid = new THREE.Mesh(roundedBoxGeom(bw - 0.01, 0.02, d - 0.01, 0.008, 3), susD); lid.position.set(bxc, bodyH + 0.01, 0); lid.castShadow = true; g.add(lid);
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.007, 8, 16, Math.PI), sus); hd.position.set(bxc, bodyH + 0.02, 0); g.add(hd);
  g.add(plainBox(bw - 0.08, 0.002, d - 0.08, water, bxc, bodyH - 0.03, 0));
  // 排水コック (右側面)
  g.add(cylAt(0.008, 0.008, 0.03, 10, susD, bxc + bw / 2 + 0.015, 0.03, 0).rotateZ(Math.PI / 2));
  g.add(box(0.012, 0.03, 0.01, mat('#2f6ac0', 0.4), w / 2 - 0.006, 0.045, 0));
  return g;
}
// ULVAC GLD-137CC (油回転真空ポンプ 直結型, W170×D488×H250): モーター(後)+ポンプ部(前)を奥行方向に直結。
function buildVacuumPump({ color='#4a4a4a', w=0.17, d=0.488, h=0.25 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.45, 0.2, { env: 0.4 }), metal = mat('#888', 0.25, 0.7, { env: 0.7 }), oil_m = mat('#c8a020', 0.3, 0.1);
  const r = Math.min(w, h - 0.06) / 2;                 // モーター半径 (幅・高さに収める)
  const cy = 0.04 + r;                                 // 軸心高さ
  const base = new THREE.Mesh(roundedBoxGeom(w, 0.03, d, 0.008, 4), mat('#333', 0.6)); base.position.set(0, 0.015, 0); base.castShadow = true; g.add(base);
  [[-w/2+0.02, d/2-0.03], [w/2-0.02, d/2-0.03], [-w/2+0.02, -d/2+0.03], [w/2-0.02, -d/2+0.03]].forEach(([x, z]) => g.add(cylAt(0.01, 0.012, 0.01, 8, mat('#222', 0.8), x, 0.005, z))); // ゴム足
  // モーター (後方, 冷却フィン付き)
  const motorL = d * 0.5;
  const motor = new THREE.Mesh(new THREE.CylinderGeometry(r, r, motorL, 20), body); motor.rotation.x = Math.PI / 2; motor.position.set(0, cy, -d/2 + motorL/2 + 0.02); motor.castShadow = true; motor.userData.colorable = true; g.add(motor);
  for (let i = 0; i < 6; i++) { const fin = new THREE.Mesh(new THREE.CylinderGeometry(r + 0.006, r + 0.006, 0.006, 20), mat(shade(color, 0.9), 0.5, 0.2)); fin.rotation.x = Math.PI / 2; fin.position.set(0, cy, -d/2 + 0.06 + i * motorL * 0.15); g.add(fin); }
  g.add(cylAt(r * 0.6, r * 0.6, 0.02, 14, mat('#2a2a2a', 0.6), 0, cy, -d/2 + 0.01).rotateX(Math.PI / 2)); // ファンカバー
  g.add(box(w * 0.5, 0.05, 0.08, mat('#2a2a2a', 0.6), 0, cy + r + 0.02, -d/2 + 0.12)); // 端子箱
  // ポンプ部 (前方, 角型ハウジング + オイルケース)
  const pumpL = d * 0.42;
  const pump = new THREE.Mesh(roundedBoxGeom(w, h - 0.06, pumpL, 0.01, 4), mat(shade(color, 1.15), 0.4, 0.3)); pump.position.set(0, 0.04 + (h - 0.06)/2, d/2 - pumpL/2 - 0.01); pump.castShadow = true; g.add(pump);
  const sight = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.006, 12), oil_m); sight.rotation.z = Math.PI / 2; sight.position.set(w/2 + 0.002, cy - 0.02, d/2 - pumpL * 0.5); g.add(sight); // オイル窓
  // 吸気口 (KFフランジ, 上向き) と排気口 (前上部)
  g.add(cylAt(0.014, 0.014, 0.05, 10, metal, 0, h - 0.03, d/2 - pumpL * 0.7));
  g.add(cylAt(0.022, 0.022, 0.012, 12, metal, 0, h - 0.005, d/2 - pumpL * 0.7));      // フランジ
  g.add(cylAt(0.011, 0.011, 0.04, 10, metal, w * 0.25, h - 0.035, d/2 - pumpL * 0.3));
  g.add(cylAt(0.016, 0.016, 0.02, 10, mat('#c0392b', 0.5), w * 0.25, h - 0.01, d/2 - pumpL * 0.3)); // 排気キャップ
  // オイル給油キャップ
  g.add(cylAt(0.012, 0.012, 0.012, 10, oil_m, -w * 0.25, h - 0.03, d/2 - pumpL * 0.5));
  // キャリングハンドル (モーター上)
  const hd = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 6, 14, Math.PI), metal); hd.rotation.y = Math.PI / 2; hd.position.set(0, cy + r, -d/2 + motorL * 0.55); g.add(hd);
  return g;
}


export { buildHPLC, buildIncubator, buildLabOven, buildSpectrophotometer, buildUltrasonicCleaner, buildVacuumPump };
