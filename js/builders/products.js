// 実在製品の3Dモデル (メーカー公式寸法で作成)。寸法・出典は catalog.js の product フィールド参照。
// 慣例: 使う面(画面/座面/ドア面)は +Z。ベッドはヘッドボードを -Z、足側を +Z。
import * as THREE from 'three';
import { shade } from '../core/util.js';
import { roundedBoxGeom, mat, box, cyl, bedding } from '../core/helpers.js';
import { buildSofa3 } from './furniture.js';

// --- TVS REGZA 55E770S (55V型 4K Mini LED液晶): 外形 W1226×H761×D287mm (スタンド含む) ------------
function buildRegza55E770S({ color = '#1c1c1f' } = {}) {
  const g = new THREE.Group();
  const W = 1.226, H = 0.761, D = 0.287, PH = 0.705;          // PH: パネル高さ (スタンド部を除いた概算)
  const frame = mat(color, 0.35, 0.45, { env: 0.7 }), screen = mat('#07080b', 0.08, 0.25);
  const dark = mat('#26272a', 0.5, 0.4), chrome = mat('#9aa0a4', 0.22, 0.85, { env: 1.0 });
  const cy = H - PH / 2;                                       // パネル上端 = 0.761
  const zf = 0.02;                                             // 画面面の z (前面)
  const body = box(W, PH, 0.028, frame, 0, cy, zf - 0.014); body.userData.colorable = true; g.add(body);
  g.add(box(W * 0.88, PH * 0.52, 0.045, dark, 0, cy - PH * 0.22, zf - 0.05));        // 背面ハウジング
  g.add(box(W - 0.012, PH - 0.012, 0.006, screen, 0, cy, zf + 0.001));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.03, PH - 0.03), new THREE.MeshBasicMaterial({ color: 0x2c4a6a, transparent: true, opacity: 0.55 }));
  glow.position.set(0, cy, zf + 0.005); g.add(glow);
  const glow2 = new THREE.Mesh(new THREE.PlaneGeometry((W - 0.03) * 0.5, (PH - 0.03) * 0.6), new THREE.MeshBasicMaterial({ color: 0x6a90c0, transparent: true, opacity: 0.32 }));
  glow2.position.set(-W * 0.12, cy + 0.03, zf + 0.006); g.add(glow2);
  g.add(box(0.10, 0.008, 0.004, chrome, 0, cy - PH / 2 + 0.02, zf + 0.002));       // ロゴ
  // センタースタンド (プレート + ネック)。プレート奥行 = 設置奥行 28.7cm
  g.add(box(0.52, 0.014, D, mat('#2b2c2f', 0.4, 0.6, { env: 0.8 }), 0, 0.007, 0));
  g.add(box(0.18, 0.05, 0.06, dark, 0, 0.035, zf - 0.06));
  return g;
}

// --- IKEA FJÄLLBO テレビ台 150x36x54cm: 黒スチールフレーム + 無垢材棚板, 背板なし ---------------------
function buildFjallboTvBench({ color = '#5b3d29' } = {}) {
  const g = new THREE.Group();
  const W = 1.50, D = 0.36, H = 0.54, T = 0.025;
  const steel = mat('#232323', 0.45, 0.6, { env: 0.6 }), wood = mat(color, 0.62, 0.02, { env: 0.3 });
  const top = box(W, T, D, wood, 0, H - T / 2, 0); top.userData.colorable = true; g.add(top);
  const mid = box(W - 0.06, 0.02, D - 0.04, wood, 0, 0.26, 0); mid.userData.colorable = true; g.add(mid);   // 中段棚
  const legH = H - T;
  [[-W / 2 + 0.015, D / 2 - 0.015], [-W / 2 + 0.015, -(D / 2 - 0.015)], [W / 2 - 0.015, D / 2 - 0.015], [W / 2 - 0.015, -(D / 2 - 0.015)]]
    .forEach(([x, z]) => g.add(box(0.03, legH, 0.03, steel, x, legH / 2, z)));
  [-W / 2 + 0.015, W / 2 - 0.015].forEach(x => { g.add(box(0.03, 0.03, D - 0.03, steel, x, 0.25, 0)); g.add(box(0.03, 0.03, D - 0.03, steel, x, 0.06, 0)); });
  g.add(box(W - 0.03, 0.03, 0.03, steel, 0, 0.25, -(D / 2 - 0.015)));   // 背面横桟 (背板は無い)
  g.add(box(W - 0.03, 0.03, 0.03, steel, 0, 0.06, -(D / 2 - 0.015)));
  return g;
}

// --- IKEA VALNÄS 2人掛けソファ: W206×D94×H90cm (座面高49, 座面幅160, アーム幅約23) ----------------------
function buildValnasSofa2({ color = '#d8c7a6' } = {}) {
  return buildSofa3({ color, w: 2.06, d: 0.94, h: 0.90, seats: 2 });
}

// --- IKEA UGGLERUM コーヒーテーブル: 130×65×H43cm, ウォールナット材突き板, ミッドセンチュリー風テーパー脚 ----
function buildUgglerumCoffeeTable({ color = '#6b4a30' } = {}) {
  const g = new THREE.Group();
  const W = 1.30, D = 0.65, H = 0.43;
  const walnut = mat(color, 0.5, 0.03, { env: 0.45 }), dark = mat(shade(color, 0.75), 0.55, 0.03);
  const top = new THREE.Mesh(roundedBoxGeom(W, 0.03, D, 0.008, 3), walnut);
  top.position.y = H - 0.015; top.castShadow = top.receiveShadow = true; top.userData.colorable = true; g.add(top);
  g.add(box(W - 0.12, 0.05, D - 0.12, dark, 0, H - 0.055, 0));           // 幕板
  [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {            // 外側へ開いたテーパー脚
    const leg = cyl(0.016, 0.024, H - 0.08, 10, dark);
    leg.position.set(sx * (W / 2 - 0.16), (H - 0.08) / 2, sz * (D / 2 - 0.12));
    leg.rotation.z = -sx * 0.12; leg.rotation.x = sz * 0.10; g.add(leg);
  });
  return g;
}

// --- IKEA FÅGELFJÄLLET ベッドフレーム 120×200 (収納ボックス2個付): 外形 L207×W132cm,
//     ヘッドボード高101 / フットボード高39cm, ベッド下20cm, マットレス120×200 ------------------------------
function buildFagelfjalletBed({ color = '#5b7f9b' } = {}) {
  const g = new THREE.Group();
  const W = 1.32, L = 2.07, HB = 1.01, FB = 0.39, UNDER = 0.20;
  const oak = mat('#2f2621', 0.55, 0.08, { env: 0.35 }), oakL = mat('#3d3128', 0.5, 0.08, { env: 0.35 });
  const railH = 0.13, railT = 0.05;
  [[-W / 2 + 0.05, -L / 2 + 0.12], [W / 2 - 0.05, -L / 2 + 0.12], [-W / 2 + 0.05, L / 2 - 0.12], [W / 2 - 0.05, L / 2 - 0.12]]
    .forEach(([x, z]) => g.add(box(0.06, UNDER, 0.06, oak, x, UNDER / 2, z)));                 // 脚 (ベッド下 20cm)
  [-W / 2 + railT / 2, W / 2 - railT / 2].forEach(x => g.add(box(railT, railH, L - 0.10, oak, x, UNDER + railH / 2, 0)));  // サイドレール
  g.add(box(W - 0.10, 0.03, L - 0.14, oakL, 0, UNDER + 0.05, 0));                              // 床板
  const hbZ = -L / 2 + 0.025;                                                                   // ヘッドボード (象嵌風パネル)
  g.add(box(W, HB, 0.05, oak, 0, HB / 2, hbZ));
  g.add(box(W - 0.14, 0.62, 0.012, oakL, 0, 0.66, hbZ + 0.03));
  g.add(box(W - 0.22, 0.50, 0.006, oak, 0, 0.66, hbZ + 0.038));
  const fbZ = L / 2 - 0.025;                                                                    // フットボード (少し幅広・低い)
  g.add(box(W + 0.02, FB, 0.05, oak, 0, FB / 2, fbZ));
  g.add(box(W - 0.14, 0.18, 0.012, oakL, 0, 0.21, fbZ - 0.03));
  [-0.52, 0.52].forEach(z => {                                                                  // 収納ボックス ×2 (キャスター付き・片側)
    g.add(box(0.60, 0.16, 0.95, mat('#1e1b18', 0.7, 0.05), W / 2 - 0.36, 0.10, z));
    g.add(box(0.60, 0.02, 0.95, mat('#111111', 0.8), W / 2 - 0.36, 0.01, z));
  });
  g.add(bedding(1.20, 2.00, UNDER + 0.065 + 0.20, { duvet: color, double: false, mattH: 0.20, pillowZ: 0.34, throwFoot: true }));
  return g;
}

export { buildRegza55E770S, buildFjallboTvBench, buildValnasSofa2, buildUgglerumCoffeeTable, buildFagelfjalletBed };
