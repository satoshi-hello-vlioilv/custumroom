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
// ---- ホワイトボード (馬印 ホーローホワイトボード 壁掛 1800×900 風): アルミ枠, 板面 w×h, 粉受け, マーカー。下端 0.9m。使う面 +Z ----
function buildWhiteboard({ color='#f9f9f6', w=1.8, d=0.04, h=0.9 } = {}) {
  const g = new THREE.Group();
  const frame = mat('#b9bec3', 0.3, 0.65, { env: 0.8 });
  const y0 = 0.9, cy = y0 + h/2;
  g.add(box(w + 0.04, h + 0.04, 0.012, mat('#aeb4ba', 0.7), 0, cy, -0.022));                        // 裏面バッキング(壁側)
  const board = box(w, h, 0.025, mat(color, 0.9, 0), 0, cy, 0); board.userData.colorable = true; g.add(board);
  g.add(box(w + 0.05, 0.025, d, frame, 0, y0 + h + 0.0125, 0)); g.add(box(w + 0.05, 0.025, d, frame, 0, y0 - 0.0125, 0));   // アルミ枠
  [-1, 1].forEach(s => g.add(box(0.025, h + 0.05, d, frame, s*(w/2 + 0.0125), cy, 0)));
  g.add(box(w * 0.8, 0.03, 0.09, frame, 0, y0 - 0.03, 0.045));                                       // 粉受け
  ['#e53', '#38f', '#2a2'].forEach((c, i) => g.add(box(0.018, 0.12, 0.018, mat(c, 0.7), -0.12 + i * 0.12, y0 - 0.01, 0.07)));
  g.add(box(w * 0.30, 0.018, 0.005, mat('#3b6bbf', 0.9), -w * 0.15, cy + h * 0.22, 0.015));           // 板書
  g.add(box(w * 0.18, 0.018, 0.005, mat('#3b6bbf', 0.9),  w * 0.12, cy + h * 0.04, 0.015));
  g.add(box(w * 0.25, 0.018, 0.005, mat('#2a9c5a', 0.9), -w * 0.05, cy - h * 0.14, 0.015));
  return g;
}
// ---- ファイリングキャビネット (コクヨ A4-04F1N 風): A4引き出し4段, W388×D620×H1335, ナチュラルグレー ----
function buildFilingCabinet({ color='#b7bcbf', w=0.388, d=0.62, h=1.335 } = {}) {
  const g = new THREE.Group();
  const cab = box(w, h, d, mat(color, 0.35, 0.5, { env: 0.8 }), 0, h / 2, 0); cab.userData.colorable = true; g.add(cab);
  const hdl = mat('#c0c8d4', 0.2, 0.8, { env: 1.0 }), n = 4, dh = (h - 0.08)/n;
  for (let i = 0; i < n; i++) {
    const y = 0.06 + dh*i + dh/2;
    const fr = box(w - 0.02, dh - 0.012, 0.022, mat(shade(color, 1.06), 0.38, 0.5), 0, y, d / 2 + 0.007); fr.userData.colorable = true; g.add(fr);
    g.add(box(w - 0.14, 0.02, 0.02, hdl, 0, y - dh/2 + 0.05, d / 2 + 0.026));                          // 引き手
    g.add(box(0.11, 0.045, 0.006, mat('#e8e0d0', 0.75), 0, y + dh/2 - 0.05, d / 2 + 0.016));            // 見出しカード
    if (i === n - 1) { const key = cyl(0.008, 0.008, 0.01, 8, hdl); key.rotation.x = Math.PI/2; key.position.set(w/2 - 0.04, y + dh/2 - 0.05, d/2 + 0.02); g.add(key); }   // シリンダー錠
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

// ---- 展示ケース (チヨダディステム クアドラート W900×D450×H1200): 化粧板の台 + フレームレスのアクリル被せカバー(プッシュロック) ----
function buildDisplayCase({ color='#e8e2d6', w=0.9, d=0.45, h=1.2 } = {}) {
  const g = new THREE.Group();
  const board = mat(color, 0.55, 0.02), boardD = mat(shade(color, 0.86), 0.6);
  const acryl = new THREE.MeshPhysicalMaterial({ color: 0xf2fbff, roughness: 0.02, metalness: 0.0, transmission: 0.0, transparent: true, opacity: 0.16, side: THREE.DoubleSide });
  const edgeM = new THREE.MeshStandardMaterial({ color: 0xcfe6ea, roughness: 0.1, transparent: true, opacity: 0.55 });
  const coverH = 0.4, baseH = h - coverH, t = 0.006;
  // 台: 巾木(引っ込み) + 本体 + 天板(展示面)
  g.add(box(w - 0.04, 0.06, d - 0.04, boardD, 0, 0.03, 0));
  const body = box(w, baseH - 0.08, d, board, 0, 0.06 + (baseH - 0.08) / 2, 0); body.userData.colorable = true; g.add(body);
  const deck = box(w, 0.02, d, mat(shade(color, 1.03), 0.5), 0, baseH - 0.01, 0); deck.userData.colorable = true; g.add(deck);
  g.add(box(w - 0.04, 0.004, d - 0.04, mat('#d8d2c8', 0.9), 0, baseH + 0.002, 0));      // 展示面のクロス
  g.add(cylAt(0.011, 0.011, 0.008, 16, mat('#b9bcc0', 0.3, 0.8), w * 0.36, baseH - 0.05, d / 2 + 0.003).rotateX(Math.PI / 2));   // プッシュロック
  // アクリルカバー (5面・フレームレス) + 小口の光るエッジ
  const cy = baseH + coverH / 2;
  g.add(plainBox(w - 0.01, coverH, t, acryl, 0, cy,  d / 2 - 0.008));
  g.add(plainBox(w - 0.01, coverH, t, acryl, 0, cy, -d / 2 + 0.008));
  g.add(plainBox(t, coverH, d - 0.02, acryl, -w / 2 + 0.008, cy, 0));
  g.add(plainBox(t, coverH, d - 0.02, acryl,  w / 2 - 0.008, cy, 0));
  g.add(plainBox(w - 0.01, t, d - 0.01, acryl, 0, h - t / 2, 0));
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => g.add(plainBox(0.004, coverH, 0.004, edgeM, sx * (w / 2 - 0.006), cy, sz * (d / 2 - 0.006))));
  [-1, 1].forEach(sz => g.add(plainBox(w - 0.012, 0.003, 0.004, edgeM, 0, h - 0.003, sz * (d / 2 - 0.006))));
  // 展示物: 青磁の壺 (回転体) + 小さな台
  g.add(box(0.16, 0.03, 0.12, mat('#3a2e26', 0.5), -0.08, baseH + 0.019, 0));
  const vase = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [0.04, 0], [0.055, 0.04], [0.06, 0.1], [0.045, 0.17], [0.022, 0.2], [0.026, 0.23], [0, 0.23]].map(([x, y]) => new THREE.Vector2(x, y)), 28), mat('#9cbfae', 0.25, 0.05, { env: 1.1 }));
  vase.position.set(-0.08, baseH + 0.034, 0); vase.castShadow = true; g.add(vase);
  g.add(box(0.1, 0.006, 0.06, mat('#f5f2ea', 0.8), 0.22, baseH + 0.008, 0.1));       // キャプション札
  return g;
}
// ---- 展示台 (鈴屋 スクエア展示台(側板付) H925×W450×D450): アルミの角フレーム + 白い側板・天板。天板上の球は展示物 ----
function buildPedestal({ color='#f3ece0', w=0.45, d=0.45, h=0.925 } = {}) {
  const g = new THREE.Group();
  const alu = mat('#c9ced3', 0.3, 0.75, { env: 0.9 }), aluD = mat('#9aa1a8', 0.4, 0.6);
  const panel = mat(color, 0.6, 0.02);
  const p = 0.024, top = 0.018;
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {                                  // 支柱 (溝付きの角アルミ)
    const x = sx * (w / 2 - p / 2), z = sz * (d / 2 - p / 2);
    g.add(box(p, h - top, p, alu, x, (h - top) / 2, z));
    g.add(box(0.006, h - top - 0.02, 0.006, aluD, x - sx * p / 2, (h - top) / 2, z - sz * 0.004));
  });
  [0.012, h - top - 0.012].forEach(y => {                                                        // 上下の横桟
    [-1, 1].forEach(s => { g.add(box(w - 2 * p, 0.024, 0.018, alu, 0, y, s * (d / 2 - 0.012))); g.add(box(0.018, 0.024, d - 2 * p, alu, s * (w / 2 - 0.012), y, 0)); });
  });
  const ph = h - top - 0.05, py = 0.025 + ph / 2;                                                // 側板 (白塗装)
  [-1, 1].forEach(s => {
    const a = box(w - 2 * p, ph, 0.006, panel, 0, py, s * (d / 2 - 0.009)); a.userData.colorable = true; g.add(a);
    const b = box(0.006, ph, d - 2 * p, panel, s * (w / 2 - 0.009), py, 0); b.userData.colorable = true; g.add(b);
  });
  const tp = box(w, top, d, mat(shade(color, 1.03), 0.5), 0, h - top / 2, 0); tp.userData.colorable = true; g.add(tp);
  // 展示物 (金属の球体オブジェ) + 台座リング
  g.add(cylAt(0.05, 0.06, 0.02, 24, mat('#2a2826', 0.5), 0, h + 0.01, 0));
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 28, 18), mat('#c8a020', 0.32, 0.8, { env: 1.5 }));
  sphere.position.y = h + 0.02 + 0.115; sphere.castShadow = true; g.add(sphere);
  return g;
}
// ---- 解説パネル (ベルク アルモード 2383 A1 片面 ポスタースタンド): 直立したアルミフレーム(A1) + 背面の支柱 + キャスター付きスチールベース ----
function buildInfoPanel({ color='#f2eee8', w=0.645, d=0.421, h=1.608 } = {}) {
  const g = new THREE.Group();
  const alu = mat('#c3c8cd', 0.28, 0.8, { env: 1.0 }), steel = mat('#2e3033', 0.5, 0.4), rub = mat('#161616', 0.8);
  const fh = 0.841 + 0.09, fy = h - fh / 2, fz = 0.03;                                             // フレーム(A1 + 枠)
  // ベース (L型: 前後に長いスチール板) + キャスター(後) + アジャスター(前)
  g.add(box(w - 0.1, 0.022, d, steel, 0, 0.034, 0));
  [-1, 1].forEach(s => {
    const cz = -d / 2 + 0.06, cx = s * (w / 2 - 0.1);
    const whl = cyl(0.022, 0.022, 0.018, 14, rub); whl.rotation.z = Math.PI / 2; whl.position.set(cx, 0.022, cz); g.add(whl);
    g.add(box(0.03, 0.012, 0.03, steel, cx, 0.02, cz));
    g.add(cylAt(0.016, 0.018, 0.022, 12, rub, s * (w / 2 - 0.1), 0.011, d / 2 - 0.05));
  });
  // 支柱 (背面中央, 高さ調整式の二重パイプ)
  g.add(box(0.05, fy + 0.2, 0.03, alu, 0, (fy + 0.2) / 2 + 0.03, -0.02));
  g.add(box(0.058, 0.04, 0.038, steel, 0, fy - 0.2, -0.02));                                      // 高さ調整ノブ
  g.add(cylAt(0.012, 0.012, 0.03, 12, rub, 0, fy - 0.2, 0.0).rotateX(Math.PI / 2));
  // A1 フレーム (4辺開閉式) + アクリル面板 + ポスター
  const fw = w, border = 0.033;
  [-1, 1].forEach(s => { g.add(box(border, fh, 0.03, alu, s * (fw / 2 - border / 2), fy, fz)); g.add(box(fw, border, 0.03, alu, 0, fy + s * (fh / 2 - border / 2), fz)); });
  g.add(box(fw - 0.02, fh - 0.02, 0.006, mat('#e9e6df', 0.8), 0, fy, fz - 0.012));              // 背板(MDF)
  const poster = box(0.579, 0.826, 0.003, mat(color, 0.85), 0, fy, fz + 0.002); poster.userData.colorable = true; g.add(poster);
  const pz = fz + 0.0045, px = -0.579 / 2 + 0.04;
  g.add(plainBox(0.5, 0.05, 0.001, mat('#2f3a44', 0.7), 0, fy + 0.34, pz));                     // 見出し帯
  g.add(plainBox(0.28, 0.2, 0.001, mat('#8a9a8c', 0.7), px + 0.14, fy + 0.15, pz));              // 図版
  [0.2, 0.16, 0.12, 0.08].forEach(dy => g.add(plainBox(0.2, 0.012, 0.001, mat('#6c655c', 0.9), 0.16, fy + dy + 0.02, pz)));
  for (let i = 0; i < 9; i++) g.add(plainBox(i % 4 === 3 ? 0.32 : 0.5, 0.01, 0.001, mat('#6c655c', 0.9), i % 4 === 3 ? -0.09 : 0, fy - 0.04 - i * 0.034, pz));
  g.add(plainBox(0.579, 0.826, 0.002, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.03, transparent: true, opacity: 0.1 }), 0, fy, fz + 0.012));   // アクリル
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
// ホシザキ リーチイン冷蔵ショーケース RSC-120EM (W1200×D600×H1880, 669L, 129kg, スライド扉・ユニット下置き):
// 下部に冷凍ユニット室 (前面ガラリ), 中段がガラス越しに見える庫内 (棚4段 + 飲料), 上部に照明付きヘッダー。
// 前面は 2 枚のスライドガラス扉 (前後にずらして重ねる) で、取っ手も奥行 d の内側に収める。
function buildShowcaseFridge({ color='#d8d0c4', w=1.2, d=0.6, h=1.88 } = {}) {
  const g = new THREE.Group();
  const shell = mat(color, 0.4, 0.3, { env: 0.6 }), frame = mat('#3c4046', 0.35, 0.6, { env: 0.7 }), dark = mat('#1e2124', 0.6, 0.2);
  const inner = mat('#eef1f2', 0.45, 0.1), wire = mat('#b8c2c8', 0.35, 0.6, { env: 0.6 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xcfe6f0, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.16, side: THREE.DoubleSide });
  const t = 0.05, unitH = 0.3, headH = 0.14, y0 = unitH, y1 = h - headH;          // 庫内の下端・上端
  const tag = (m) => { m.userData.colorable = true; return m; };
  // 外箱: 左右側板・天板・背板・底 (庫内が見えるよう箱を組む)
  [-1, 1].forEach(s => g.add(tag(box(t, h, d, shell, s * (w / 2 - t / 2), h / 2, 0))));
  g.add(tag(box(w, headH, d, shell, 0, h - headH / 2, 0)));
  g.add(plainBox(w - 2 * t, y1 - y0, 0.04, inner, 0, (y0 + y1) / 2, -d / 2 + 0.02));
  g.add(tag(box(w, unitH, d, shell, 0, unitH / 2, 0)));
  // 冷凍ユニット室の前面ガラリ + 巾木
  g.add(box(w - 0.12, unitH - 0.1, 0.012, dark, 0, unitH / 2 + 0.02, d / 2 - 0.004));
  for (let i = 0; i < 9; i++) g.add(plainBox(w - 0.16, 0.008, 0.006, mat('#3a3e42', 0.5, 0.3), 0, 0.1 + i * 0.02, d / 2 + 0.003));
  g.add(plainBox(w - 0.02, 0.05, 0.01, dark, 0, 0.025, d / 2 - 0.02));
  // ヘッダー: 前面の照明パネル (ロゴ帯)
  g.add(plainBox(w - 0.14, headH - 0.05, 0.006, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color('#e8f4ff'), emissiveIntensity: 0.55, roughness: 0.4 }), 0, h - headH / 2, d / 2 + 0.002));
  g.add(plainBox(0.3, 0.03, 0.004, mat('#2a5aa8', 0.4), 0, h - headH / 2, d / 2 + 0.006));
  // 庫内: LED 照明・棚 4 段 (ワイヤー) ・飲料 (ペットボトルと缶)
  const inW = w - 2 * t, inD = d - 0.12, inZ = -0.02;
  g.add(plainBox(inW - 0.04, 0.012, 0.03, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.8 }), 0, y1 - 0.02, d / 2 - 0.12));
  const levels = [y0 + 0.02, y0 + 0.33, y0 + 0.64, y0 + 0.95, y0 + 1.22];
  const cols = ['#e33a2c', '#2d7fd6', '#f2c230', '#2fa35a', '#f07f2a', '#8a4fc0', '#e8e8e8', '#2a2a2a'], mcache = {};
  levels.forEach((ly, li) => {
    if (li > 0) g.add(box(inW - 0.02, 0.012, inD, wire, 0, ly, inZ));
    const tall = li % 2 === 0, bh = tall ? 0.22 : 0.12, br = tall ? 0.034 : 0.033, n = Math.floor((inW - 0.04) / (br * 2 + 0.008));
    // 手前 2 列だけ並べる (ガラス越しに見える範囲。奥は同じ商品が続く)
    const pet = mat('#dfeef4', 0.1, 0.05, { env: 0.6 });
    for (let r = 0; r < 2; r++) for (let i = 0; i < n; i++) {
      const ck = cols[(i + li * 3 + (i >> 2)) % cols.length] + (tall ? 'p' : 'c'), c = mcache[ck] || (mcache[ck] = mat(ck.slice(0, 7), 0.4, tall ? 0 : 0.6)), x = -inW / 2 + 0.02 + br + i * (br * 2 + 0.008), z = inZ + inD / 2 - 0.06 - r * 0.15;
      if (tall) { g.add(cylAt(br, br, bh - 0.04, 10, pet, x, ly + 0.006 + (bh - 0.04) / 2, z)); g.add(cylAt(br * 1.02, br * 1.02, 0.07, 10, c, x, ly + 0.08, z)); g.add(cylAt(0.014, br, 0.05, 8, c, x, ly + bh - 0.025, z)); }
      else g.add(cylAt(br, br, bh, 10, c, x, ly + 0.006 + bh / 2, z));
    }
  });
  // スライドガラス扉 2 枚 (枠 + ガラス + 縦の取っ手)。前の扉 = 左, 奥の扉 = 右
  const dW = inW / 2 + 0.03, dH = y1 - y0;
  [[-1, d / 2 - 0.028], [1, d / 2 - 0.058]].forEach(([s, z]) => {
    const cx = s * (inW / 4 - 0.005);
    [-1, 1].forEach(k => { g.add(plainBox(0.035, dH, 0.024, frame, cx + k * (dW / 2 - 0.0175), y0 + dH / 2, z)); g.add(plainBox(dW, 0.035, 0.024, frame, cx, y0 + (k > 0 ? dH - 0.0175 : 0.0175), z)); });
    g.add(plainBox(dW - 0.07, dH - 0.07, 0.006, glassMat, cx, y0 + dH / 2, z));
    g.add(plainBox(0.022, 0.5, 0.02, mat('#9aa3aa', 0.25, 0.8), cx - s * (dW / 2 - 0.05), y0 + dH * 0.5, z + 0.02));
  });
  g.add(plainBox(inW, 0.02, 0.07, frame, 0, y0 - 0.01, d / 2 - 0.045));                        // 下レール
  g.add(plainBox(inW, 0.02, 0.07, frame, 0, y1 + 0.01, d / 2 - 0.045));                        // 上レール
  return g;
}
// ---- バーカウンター = ストア・エキスプレス 木製ハイカウンター H100cm W120cm (61-828-79: 幅120×奥行60×高さ101.2cm) を 2 台連結 ----
// 低圧メラミン化粧板の箱組み。客側 (+Z) は化粧板の前板, スタッフ側 (-Z) は棚板を 9.6cm 間隔・8 か所で調節できるオープン棚。
// 天板は前後に少し張り出す。幅 w は連結後の全幅 (1 台 = w/2)
function buildBarCounter({ color='#5b3a22', w=2.4, d=0.6, h=1.012 } = {}) {
  const g = new THREE.Group();
  const board = mat(color, 0.55, 0.02, { env: 0.35 }), boardD = mat(shade(color, 0.86), 0.6, 0.02), edge = mat(shade(color, 0.72), 0.5);
  const tag = (m) => { m.userData.colorable = true; return m; };
  const t = 0.02, topT = 0.028, plinth = 0.06, units = Math.max(1, Math.round(w / 1.2)), uw = w / units;
  // 天板 (連結した 2 枚を突き付け, 継ぎ目を細い溝で表す)
  g.add(tag(plainBox(w, topT, d, board, 0, h - topT / 2, 0)));
  for (let u = 1; u < units; u++) g.add(plainBox(0.002, topT + 0.001, d + 0.001, edge, -w / 2 + u * uw, h - topT / 2, 0));
  const holeM = mat('#2a2622', 0.8);
  for (let u = 0; u < units; u++) {
    const cx = -w / 2 + uw * (u + 0.5), inner = uw - 2 * t, bodyH = h - topT;
    [-1, 1].forEach(s => g.add(tag(plainBox(t, bodyH, d, boardD, cx + s * (uw / 2 - t / 2), bodyH / 2, 0))));        // 側板
    g.add(tag(plainBox(inner, bodyH - plinth, t, board, cx, plinth + (bodyH - plinth) / 2, d / 2 - t / 2)));        // 客側の前板
    g.add(plainBox(inner, plinth, t, edge, cx, plinth / 2, d / 2 - t / 2 - 0.012));                                 // 巾木 (少し引っ込める)
    g.add(tag(plainBox(inner, t, d - t, boardD, cx, plinth + t / 2, -t / 2)));                                      // 底板
    g.add(plainBox(inner, 0.05, t, boardD, cx, plinth / 2, -d / 2 + 0.03));                                         // 後ろの台輪
    // 可動棚 2 枚 (9.6cm ピッチの 8 か所のうち 3・6 段目) + 側板の棚ダボ穴
    const pins = []; for (let k = 0; k < 8; k++) pins.push(plinth + t + 0.2 + k * 0.096);
    [pins[1], pins[5]].forEach(y => g.add(tag(plainBox(inner - 0.004, t, d - t - 0.03, board, cx, y, -0.015 - t / 2))));
    [-1, 1].forEach(s => pins.forEach(y => g.add(cylAt(0.0025, 0.0025, 0.002, 6, holeM, cx + s * (uw / 2 - t - 0.001), y + 0.012, -d / 2 + 0.06).rotateZ(Math.PI / 2))));
    // 棚の上の物 (スタッフ側から見える): 下段に酒瓶, 上段にグラス
    if (u === 0) {
      ['#2f5a2a', '#6a3a1a', '#c8c0a8', '#2a2a30'].forEach((c, i) => { const bx = cx - inner / 2 + 0.1 + i * 0.1, bm = mat(c, 0.15, 0.05, { env: 0.8 }); g.add(cylAt(0.036, 0.036, 0.2, 14, bm, bx, pins[1] + t / 2 + 0.1, -0.1)); g.add(cylAt(0.013, 0.036, 0.05, 14, bm, bx, pins[1] + t / 2 + 0.225, -0.1)); g.add(cylAt(0.012, 0.012, 0.04, 10, bm, bx, pins[1] + t / 2 + 0.27, -0.1)); });
    } else {
      const glassM = new THREE.MeshStandardMaterial({ color: 0xe8f2f4, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35 });
      for (let i = 0; i < 6; i++) g.add(cylAt(0.034, 0.03, 0.1, 14, glassM, cx - inner / 2 + 0.08 + i * 0.1, pins[5] + t / 2 + 0.05, -0.12));
    }
  }
  return g;
}
// ---- バースツール (IKEA DALFRED 風): 直径30cmの丸座面, ガス圧で63〜74cmに昇降する支柱, リング状の足置き, 直径50cmのドーム状ベース。ブラック ----
function buildBarStool({ color='#2b2b2b', w=0.5, d=0.5, h=0.74 } = {}) {
  const g = new THREE.Group();
  const metal = mat(color, 0.4, 0.55, { env: 0.7 }), chrome = mat('#c0c8d0', 0.2, 0.85, { env: 1.0 });
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.03, 24), metal); seat.position.y = h - 0.015; seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  g.add(cylAt(0.05, 0.05, 0.03, 16, metal, 0, h - 0.045, 0));                                          // 座面下のハブ
  g.add(cylAt(0.02, 0.02, h - 0.35, 12, chrome, 0, 0.3 + (h - 0.35)/2, 0));                            // ガス圧シリンダー
  g.add(cylAt(0.028, 0.028, 0.28, 12, metal, 0, 0.16, 0));                                             // 外筒
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.008, 8, 28), metal); ring.rotation.x = Math.PI / 2; ring.position.y = 0.30; g.add(ring);   // 足置きリング
  for (let i = 0; i < 4; i++) { const a = i/4*Math.PI*2; const spoke = box(0.15, 0.008, 0.008, metal, Math.cos(a)*0.095, 0.30, Math.sin(a)*0.095); spoke.rotation.y = -a; g.add(spoke); }
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.03, w/2, 0.03, 28), metal); base.position.y = 0.015; base.castShadow = true; g.add(base);   // ドーム状ベース
  return g;
}
// ---- 丸テーブル (IKEA GAMLARED 直径85 高さ75 風): パイン無垢材の丸天板(縁が丸い), ブラックステインの丸脚4本 ----
function buildRoundTable({ color='#c8a06a', w=0.85, d=0.85, h=0.75 } = {}) {
  const g = new THREE.Group();
  const r = Math.min(w, d) / 2;
  const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r - 0.012, 0.035, 36), mat(color, 0.55, 0.03, { env: 0.4 }));
  topMesh.position.y = h - 0.0175; topMesh.castShadow = true; topMesh.receiveShadow = true; topMesh.userData.colorable = true; g.add(topMesh);
  const legM = mat('#2a2018', 0.55, 0.05), legH = h - 0.035;
  for (let i = 0; i < 4; i++) { const a = i/4*Math.PI*2 + Math.PI/4, lr = r - 0.09; g.add(cylAt(0.022, 0.028, legH, 10, legM, Math.cos(a)*lr, legH/2, Math.sin(a)*lr)); }
  g.add(box(r*1.1, 0.06, 0.03, legM, 0, h - 0.065, 0)); g.add(box(0.03, 0.06, r*1.1, legM, 0, h - 0.065, 0));   // 幕板(十字)
  return g;
}


// リコー RICOH IM C3000F (A3 カラー複合機, W587×D685×H913, 96kg 以下): 下段に給紙トレイ 2 段, 前扉, 本体と読み取り部の間の胴内排紙スペース,
// 読み取り部 (原稿ガラス) + 両面同時読み取り ADF (上に原稿トレイ), 右前に 10.1 型スマートオペレーションパネル (手前へ張り出し, 上向きにチルト)。
// 右側面に手差しトレイ。パネルの張り出しを含めて外形 w×d×h に収める。
function buildCopier({ color='#e2e2de', w=0.587, d=0.685, h=0.913 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.5, 0.04), bodyD = mat(shade(color, 0.86), 0.55, 0.04), gap = mat('#3a3d42', 0.7), dark = mat('#26292d', 0.5, 0.2);
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x9fbccc, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.55 });
  const rb = (bw, bh, bd, m, x, y, z, r = 0.01) => { const o = new THREE.Mesh(roundedBoxGeom(bw, bh, bd, r, 3), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const tag = (o) => { o.userData.colorable = true; return o; };
  const bd = d - 0.07, bz = -0.035, fz = bz + bd / 2;                     // 本体の奥行と前面 (パネルは前面から 7cm 張り出す)
  const yT = 0.33, yExit0 = 0.6, yScan = 0.7, yAdf = 0.79;                 // 給紙トレイ上端 / 胴内排紙 / 読み取り部 / ADF
  // 台座 + 給紙トレイ 2 段 (前面に取っ手の凹み)
  tag(rb(w, 0.05, bd, bodyD, 0, 0.025, bz, 0.006));
  [[0.05, 0.19], [0.19, yT]].forEach(([y0, y1]) => {
    tag(rb(w - 0.01, y1 - y0 - 0.006, bd, body, 0, (y0 + y1) / 2, bz, 0.006));
    g.add(plainBox(0.16, 0.022, 0.012, gap, 0, y1 - 0.03, fz + 0.001));
    g.add(plainBox(0.03, 0.05, 0.004, mat('#9aa3aa', 0.4), w / 2 - 0.05, (y0 + y1) / 2, fz + 0.001));   // 用紙残量表示
  });
  // 本体 (前扉) + 右側面の手差しトレイ (閉じた状態)
  tag(rb(w, yExit0 - yT, bd, body, 0, (yT + yExit0) / 2, bz, 0.008));
  g.add(plainBox(0.004, yExit0 - yT - 0.04, 0.004, gap, -0.05, (yT + yExit0) / 2, fz + 0.001));
  g.add(plainBox(0.12, 0.012, 0.004, mat('#b0b5ba', 0.4), -0.18, yExit0 - 0.05, fz + 0.001));
  rb(0.012, 0.18, 0.36, bodyD, w / 2 + 0.0, 0.48, bz, 0.004);
  // 胴内排紙スペース: 右側だけ柱で読み取り部を支え, 左と前は開いている (排紙された用紙)
  tag(rb(0.14, yScan - yExit0, bd, body, w / 2 - 0.07, (yExit0 + yScan) / 2, bz, 0.006));
  rb(w - 0.14, 0.01, bd - 0.02, gap, -0.07, yExit0 + 0.005, bz, 0.003);
  g.add(plainBox(0.3, 0.004, 0.42, mat('#fbfbf8', 0.9), -0.09, yExit0 + 0.014, bz + 0.02));
  // 読み取り部 + 原稿ガラス (ADF の下) + ADF (原稿トレイ・排紙トレイ・開閉レバー)
  tag(rb(w, yAdf - yScan, bd, body, 0, (yScan + yAdf) / 2, bz, 0.008));
  g.add(plainBox(w - 0.06, 0.004, bd - 0.08, glassMat, 0, yAdf - 0.002, bz));
  tag(rb(w - 0.01, 0.075, bd - 0.02, bodyD, 0, yAdf + 0.0375, bz, 0.01));
  const tray = rb(w - 0.2, 0.012, bd * 0.55, body, -0.03, h - 0.028, bz - 0.02, 0.004); tray.rotation.x = 0.1;        // 原稿トレイ
  rb(0.12, 0.02, 0.18, body, -0.03, h - 0.012, bz - bd * 0.28, 0.006);                                                    // 給紙ローラカバー
  g.add(plainBox(0.21, 0.002, 0.297, mat('#fbfbf8', 0.9), -0.03, h - 0.016, bz + 0.01));                                  // 原稿 (A4)
  g.add(plainBox(0.1, 0.012, 0.02, dark, w / 2 - 0.12, yAdf + 0.05, fz - 0.005));
  // 10.1 型スマートオペレーションパネル (右前, 手前へ張り出して上向きにチルト)
  const pn = new THREE.Group(); pn.position.set(w / 2 - 0.16, yScan + 0.02, d / 2 - 0.085); pn.rotation.x = -0.9; g.add(pn);
  const ph = new THREE.Mesh(roundedBoxGeom(0.29, 0.2, 0.03, 0.01, 3), dark); ph.castShadow = true; pn.add(ph);
  pn.add(plainBox(0.24, 0.15, 0.004, new THREE.MeshStandardMaterial({ color: 0x0b1a28, emissive: new THREE.Color('#2a78c8'), emissiveIntensity: 0.55, roughness: 0.25 }), 0, 0.005, 0.016));
  [0, 1, 2, 3].forEach(i => pn.add(plainBox(0.045, 0.035, 0.002, new THREE.MeshBasicMaterial({ color: i === 0 ? 0xe8f2ff : 0x7fb2e6 }), -0.08 + i * 0.055, 0.02, 0.019)));
  rb(0.06, 0.05, 0.06, bodyD, w / 2 - 0.16, yScan + 0.01, fz - 0.01, 0.006);                                             // パネルの取付アーム
  // 前面のロゴ帯 + 主電源ランプ
  g.add(plainBox(0.12, 0.018, 0.003, mat('#c8102e', 0.4), -0.17, yAdf - 0.035, fz + 0.001));
  g.add(cylAt(0.006, 0.006, 0.004, 10, mat('#2fd060', 0.3), w / 2 - 0.03, yAdf - 0.03, fz + 0.001).rotateX(Math.PI / 2));
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

// ---- プロジェクタースクリーン (キクチ GRANDVIEW GSR-80WXW 風): 80型 16:10 手動巻き上げ。上部ケース(幅 w)から画面 1723×1077 が垂れる。
//      ケース上端 2.2m。使う面 +Z ----
function buildProjectorScreen({ color='#f5f5f2', w=1.87, d=0.09, h=1.4 } = {}) {
  const g = new THREE.Group();
  const top = 2.2, caseR = d/2;
  const cs = cyl(caseR, caseR, w, 20, mat('#f2f2f0', 0.45, 0.2)); cs.rotation.z = Math.PI/2; cs.position.set(0, top - caseR, 0); g.add(cs);   // 巻き上げケース
  [-1, 1].forEach(s => g.add(box(0.02, d + 0.01, d + 0.01, mat('#2e2e2e', 0.5), s*(w/2 + 0.01), top - caseR, 0)));                      // エンドキャップ
  const sw = w - 0.15, sh = sw * 10/16, drop = Math.max(0.05, h - sh - d - 0.06);                     // 画面(16:10) + 上部黒帯
  const screenMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.86, metalness: 0, side: THREE.DoubleSide });
  const black = mat('#1a1a1a', 0.6); black.side = THREE.DoubleSide;
  g.add(new THREE.Mesh(new THREE.BoxGeometry(sw + 0.06, drop, 0.006), black).translateY(top - d - drop/2));
  const sy = top - d - drop - sh/2;
  const screenMesh = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, 0.008), screenMat);
  screenMesh.position.set(0, sy, 0); screenMesh.castShadow = true; screenMesh.receiveShadow = true; screenMesh.userData.colorable = true; g.add(screenMesh);
  g.add(box(sw + 0.06, 0.03, 0.01, black, 0, sy + sh/2 + 0.015, 0)); g.add(box(sw + 0.06, 0.03, 0.01, black, 0, sy - sh/2 - 0.015, 0));   // 黒縁
  [-1, 1].forEach(s => g.add(box(0.03, sh + 0.06, 0.01, black, s*(sw/2 + 0.015), sy, 0)));
  g.add(box(sw + 0.08, 0.025, 0.025, mat('#8a8d90', 0.4, 0.6), 0, sy - sh/2 - 0.045, 0));            // 下端バー
  const cord = cyl(0.003, 0.003, 0.18, 6, mat('#3a3a3a', 0.7)); cord.position.set(0, sy - sh/2 - 0.15, 0); g.add(cord);   // 引き手ひも
  return g;
}

// ---- ATM = Hyosung 8L ロビー型キャッシュリサイクルATM (MX8200QTN: 幅530×奥行1039×高さ1298mm〔トップハット上端まで〕, 505.8kg) ----
// 下部は金庫 (紙幣リサイクル部) の筐体, 中段に張り出したカウンター (暗証番号キーパッド + 覗き見防止フード),
// その上の縦のファシア面に紙幣入出金口 (シャッター)・カード挿入口・レシート口, 上段は後ろへ傾けたタッチ画面,
// 最上部に照明付きのトップハット (看板)。国内のコンビニATMは外形非公開のため, 外形を公開している本機を採用。前面 = +Z
function buildATM({ color='#e8e2d6', w=0.53, d=1.039, h=1.298 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.4, 0.15, { env: 0.5 }), fascia = mat('#2c2f35', 0.45, 0.25, { env: 0.5 }), dark = mat('#101216', 0.5, 0.2);
  const steel = mat('#b9c0c6', 0.25, 0.8, { env: 0.9 }), lampG = new THREE.MeshStandardMaterial({ color: 0x3ad06a, emissive: new THREE.Color('#1fbf55'), emissiveIntensity: 0.9 });
  const tag = (m) => { m.userData.colorable = true; return m; };
  const zf = d / 2, zb = -d / 2, yCab = 0.82, yLedge = 0.86, yMid = 0.99, yScr = 1.18;
  // 台輪 + 金庫筐体 (前扉の見切り線・鍵)
  g.add(plainBox(w - 0.03, 0.05, d - 0.05, dark, 0, 0.025, -0.01));
  const cabD = d - 0.06;
  g.add(tag(box(w, yCab - 0.05, cabD, body, 0, 0.05 + (yCab - 0.05) / 2, zb + cabD / 2)));
  const cabF = zb + cabD;
  [[w - 0.06, 0.004, 0.08], [w - 0.06, 0.004, yCab - 0.03]].forEach(([bw, bh, y]) => g.add(plainBox(bw, bh, 0.004, dark, 0, y, cabF + 0.001)));
  [-1, 1].forEach(s => g.add(plainBox(0.004, yCab - 0.11, 0.004, dark, s * (w / 2 - 0.03), (yCab + 0.08) / 2, cabF + 0.001)));
  g.add(cylAt(0.014, 0.014, 0.008, 16, steel, w / 2 - 0.07, 0.5, cabF + 0.004).rotateX(Math.PI / 2));
  g.add(plainBox(0.006, 0.02, 0.002, dark, w / 2 - 0.07, 0.5, cabF + 0.009));
  // 上部筐体 (ファシアの後ろ): 金庫と同じ色
  const zF = zf - 0.1, headD = zF - 0.01 - zb;                                          // ファシア面の後ろまで
  g.add(tag(plainBox(w, yScr - yCab, headD, body, 0, (yCab + yScr) / 2, zb + headD / 2)));
  // カウンター (張り出し) + 暗証番号キーパッド (傾斜) + 覗き見防止フード
  g.add(box(w, yLedge - yCab, zf - (cabF - 0.02), fascia, 0, (yCab + yLedge) / 2, (zf + cabF - 0.02) / 2));
  const pad = new THREE.Group(); pad.position.set(-0.09, yLedge + 0.012, zf - 0.07); pad.rotation.x = -0.35; g.add(pad);
  pad.add(plainBox(0.13, 0.012, 0.1, dark, 0, 0, 0));
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) pad.add(plainBox(0.022, 0.006, 0.017, c === 3 ? mat(['#d23a2a', '#e0b020', '#2a9a4a', '#dddddd'][r], 0.5) : steel, -0.045 + c * 0.03, 0.009, -0.034 + r * 0.023));
  [-1, 1].forEach(s => g.add(plainBox(0.006, 0.06, 0.1, fascia, -0.09 + s * 0.075, yLedge + 0.03, zf - 0.075)));
  g.add(plainBox(0.156, 0.006, 0.07, fascia, -0.09, yLedge + 0.06, zf - 0.09));
  // 縦のファシア面: 紙幣入出金口 (シャッター + 緑のガイドランプ), カード挿入口, レシート口
  g.add(plainBox(w, yMid - yLedge, 0.02, fascia, 0, (yLedge + yMid) / 2, zF));
  g.add(plainBox(0.25, 0.04, 0.01, dark, -0.04, 0.925, zF + 0.012));
  g.add(plainBox(0.22, 0.012, 0.004, steel, -0.04, 0.925, zF + 0.018));
  g.add(plainBox(0.25, 0.004, 0.004, lampG, -0.04, 0.95, zF + 0.017));
  g.add(box(0.09, 0.05, 0.035, dark, 0.175, 0.955, zF + 0.02));
  g.add(plainBox(0.06, 0.004, 0.004, mat('#050505', 0.8), 0.175, 0.958, zF + 0.038));
  g.add(plainBox(0.07, 0.004, 0.003, lampG, 0.175, 0.945, zF + 0.038));
  g.add(plainBox(0.07, 0.008, 0.006, mat('#050505', 0.8), 0.175, 0.895, zF + 0.012));
  // 後ろへ傾けたタッチ画面 (上端が 5cm 奥へ)
  const scr = new THREE.Group(), tilt = Math.atan2(0.07, yScr - yMid); scr.position.set(0, (yMid + yScr) / 2, zF - 0.025); scr.rotation.x = -tilt; g.add(scr);
  scr.add(plainBox(w, (yScr - yMid) / Math.cos(tilt) + 0.004, 0.03, fascia, 0, 0, 0));
  scr.add(plainBox(0.36, 0.23, 0.004, mat('#0a0c10', 0.2, 0.2), 0, 0.005, 0.016));
  scr.add(plainBox(0.34, 0.21, 0.002, new THREE.MeshStandardMaterial({ color: 0x0c2a4a, emissive: new THREE.Color('#1d5fa8'), emissiveIntensity: 0.65, roughness: 0.2 }), 0, 0.005, 0.019));
  [[-0.08, 0.04], [0.08, 0.04], [-0.08, -0.03], [0.08, -0.03]].forEach(([x, y]) => scr.add(plainBox(0.13, 0.05, 0.001, new THREE.MeshBasicMaterial({ color: 0xe8f1fb }), x, y, 0.0205)));
  // トップハット (照明看板) — 上端 = h
  const thD = 0.4, thZ = zF - 0.09 - thD / 2;
  g.add(tag(box(w, h - yScr, thD, body, 0, (yScr + h) / 2, thZ)));
  g.add(plainBox(w - 0.04, h - yScr - 0.03, 0.004, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: new THREE.Color('#dfeaf8'), emissiveIntensity: 0.6, roughness: 0.4 }), 0, (yScr + h) / 2, thZ + thD / 2 + 0.001));
  g.add(plainBox(0.2, 0.03, 0.002, mat('#0d4fa8', 0.4), 0, (yScr + h) / 2, thZ + thD / 2 + 0.004));
  return g;
}

// 連続デスク (ベンチデスク): 天板が footprint 全幅を占め、横に並べると隙間なく一続きになる。
// 脚は端から内側に控えて配置し、連結時に天板どうしが突き合う。アクセス面 = +Z。
// 連続デスク (IKEA MITTZON デスク 120×60 風): 全幅シームレス天板(厚2.5cm), 端から控えたT字脚(支柱+足元バー), 背面の配線トレイ。
// 横に並べると隙間なく一続きになる。アクセス面 = +Z。
function buildBenchDesk({ color='#f3ece0', w=1.2, d=0.6, h=0.75 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.55), metal = mat('#f4f4f2', 0.35, 0.55, { env: 0.7 });
  const top = box(w, 0.025, d, wood, 0, h - 0.0125, 0); top.userData.colorable = true; g.add(top);
  const legInset = 0.10, legH = h - 0.025;
  [-(w / 2 - legInset), (w / 2 - legInset)].forEach(lx => {
    g.add(box(0.06, legH - 0.03, 0.06, metal, lx, 0.03 + (legH - 0.03) / 2, 0));                     // T字脚の支柱
    g.add(box(0.06, 0.03, d - 0.10, metal, lx, 0.015, 0));                                            // 足元バー
    g.add(box(0.06, 0.03, d - 0.14, metal, lx, legH - 0.015, 0));                                     // 天板受け
  });
  g.add(box(w - 2 * legInset + 0.06, 0.05, 0.05, metal, 0, h - 0.05, -(d / 2 - 0.10)));               // 背側ビーム
  g.add(box(w - 0.24, 0.06, 0.10, mat('#45454a', 0.6), 0, h - 0.06, -(d / 2 - 0.18)));                // 配線トレイ
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
