import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { mat, cyl, cylAt, plainBox } from '../core/helpers.js';

// ============================================================================
// plants.js — 観葉植物シリーズ
// 実寸の根拠: HitoHana(ひとはな) の号数別サイズ(鉢込み高さ)。鉢は号数×3cm = 直径。
// 小鉢は販売店の商品寸法 (柱サボテン: ヤオコー / アガベ: cocoha / ミリオンバンブー: WOOTANG)。
// 葉は 1 枚ずつ Mesh にせず、頂点カラー付きの 1 メッシュへまとめる (描画負荷を抑え、葉数を実物に近づける)。
// 乱数は種(seed)固定の擬似乱数で、何度配置しても同じ形になる。
// ============================================================================

// ---- 決定的な擬似乱数 (mulberry32) ----
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const lerp = (a, b, t) => a + (b - a) * t;
const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul3 = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dir3 = (yaw, pitch) => [Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), Math.cos(pitch) * Math.cos(yaw)];

// 葉の座標系: L=主脈方向, W=葉幅方向, N=葉面の法線 (yaw: 水平方位, pitch: 仰角, roll: 主脈まわりのねじれ)
function leafFrame(yaw, pitch, roll = 0) {
  const L = dir3(yaw, pitch);
  const W0 = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const N0 = cross3(L, W0);
  const c = Math.cos(roll), s = Math.sin(roll);
  return { L, W: add3(mul3(W0, c), mul3(N0, s)), N: add3(mul3(N0, c), mul3(W0, -s)) };
}

// 三角形を貯めて 1 メッシュにするバッチ (頂点カラー = 色の倍率。マテリアル色と掛け合わされる)
class Batch {
  constructor() { this.p = []; this.c = []; }
  tri(a, b, c, col) { this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); for (let i = 0; i < 3; i++) this.c.push(col[0], col[1], col[2]); }
  quad(a, b, c, d, col) { this.tri(a, b, c, col); this.tri(a, c, d, col); }
  get empty() { return this.p.length === 0; }
  mesh(material, colorable = false) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true;
    if (colorable) m.userData.colorable = true;
    return m;
  }
}
const vcMat = (color, rough = 0.6, metal = 0) => { const m = mat(color, rough, metal); m.vertexColors = true; m.side = THREE.DoubleSide; return m; };
const gray = (k) => [k, k, k];
// 種ごとの葉色の濃さ (カタログ共通の緑に掛ける倍率。濃い緑のモンステラ〜明るいウンベラータ)
const tone = (k, v) => [v * k, v * k, v * k];

// 葉 1 枚。prof(t)=0..1 の半幅プロファイル, cells=半幅方向の分割 (切れ込み・穴の表現に使う)
function addLeaf(b, B, o) {
  const F = leafFrame(o.yaw, o.pitch, o.roll || 0), hw = o.wid / 2, seg = o.seg || 8, cells = o.cells || [0, 1];
  const P = (u, t) => {
    const s = t * o.len, off = (o.fold || 0) * Math.abs(u) * hw - (o.droop || 0) * s * s;
    return [B[0] + F.L[0] * s + F.W[0] * u * hw + F.N[0] * off, B[1] + F.L[1] * s + F.W[1] * u * hw + F.N[1] * off, B[2] + F.L[2] * s + F.W[2] * u * hw + F.N[2] * off];
  };
  for (const side of [-1, 1]) for (let i = 0; i < seg; i++) {
    const t0 = i / seg, t1 = (i + 1) / seg, h0 = o.prof(t0), h1 = o.prof(t1);
    for (let k = 0; k < cells.length - 1; k++) {
      if (o.skip && o.skip(side, (t0 + t1) / 2, k)) continue;
      const c0 = cells[k], c1 = cells[k + 1];
      const col = o.colorAt ? o.colorAt((t0 + t1) / 2, (c0 + c1) / 2) : (o.col || gray(1));
      b.quad(P(side * c0 * h0, t0), P(side * c1 * h0, t0), P(side * c1 * h1, t1), P(side * c0 * h1, t1), col);
    }
  }
  return P(0, 1);
}
// 折れ線を太さ付きのチューブにする (幹・茎・葉柄)
function addTube(b, pts, radii, col, sides = 6) {
  const rings = pts.map((p, i) => {
    const pa = pts[Math.max(0, i - 1)], pb = pts[Math.min(pts.length - 1, i + 1)];
    const d = norm3([pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]]);
    const ref = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = norm3(cross3(d, ref)), v = cross3(d, u), r = Array.isArray(radii) ? radii[i] : radii;
    const ring = []; for (let k = 0; k < sides; k++) { const a = k / sides * Math.PI * 2; ring.push(add3(p, add3(mul3(u, Math.cos(a) * r), mul3(v, Math.sin(a) * r)))); }
    return ring;
  });
  for (let i = 0; i < rings.length - 1; i++) for (let k = 0; k < sides; k++) {
    const k2 = (k + 1) % sides; b.quad(rings[i][k], rings[i][k2], rings[i + 1][k2], rings[i + 1][k], col);
  }
}
// 始点から方向 (yaw, pitch) へ曲がりながら伸びる曲線 (bend: 先端ほど下へ)
function curvePts(B, yaw, pitch, len, bend = 0, n = 6) {
  const pts = []; for (let i = 0; i <= n; i++) { const s = i / n * len; const d = dir3(yaw, pitch); pts.push([B[0] + d[0] * s, B[1] + d[1] * s - bend * s * s, B[2] + d[2] * s]); }
  return pts;
}

// 葉形プロファイル (t=0 付け根 → 1 先端)
const PROF = {
  ellip: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.75),
  heart: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * (0.06 + 0.94 * t))), 0.62) * (1 - 0.32 * t),
  lance: (t) => Math.min(1, t * 5) * Math.pow(Math.max(0, 1 - t), 0.85),
  strap: (t) => Math.min(1, t * 7) * (1 - Math.pow(t, 4)),
  paddle: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.55),
  ovate: (t) => Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, 0.8))), 0.7),
};

// ---- 株 (鉢より上の幹・葉) を定義寸法 w×d×h に収める ----
// 葉の向き・長さは乱数で決まるため、組み上げた後に株元 (0, y0, 0) を基準にして整える:
//  1) 樹冠の中心ずれを高さに比例して戻す (株元は鉢の中心のまま)
//  2) 水平は同じ倍率 kh、垂直は y0 より上だけ kv 倍 (どちらも 0.8〜1.25 倍まで。葉形が崩れる変形はしない)
//  3) 床より下に垂れた葉先は床面で止める
function fitCrown(batches, { w, d, h, y0 }) {
  const each = (fn) => { for (const b of batches) for (let i = 0; i < b.p.length; i += 3) fn(b.p, i); };
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity, top = y0 + 1e-3;
  each((p, i) => { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); z0 = Math.min(z0, p[i + 2]); z1 = Math.max(z1, p[i + 2]); top = Math.max(top, p[i + 1]); });
  const cx = clamp((x0 + x1) / 2, -0.05, 0.05), cz = clamp((z0 + z1) / 2, -0.05, 0.05);
  const kh = clamp(Math.min(w / (x1 - x0), d / (z1 - z0)), 0.8, 1.25), kv = clamp((h - y0) / (top - y0), 0.8, 1.25);
  each((p, i) => {
    const s = clamp((p[i + 1] - y0) / (0.4 * (top - y0)), 0, 1);
    p[i] = (p[i] - cx * s) * kh; p[i + 2] = (p[i + 2] - cz * s) * kh;
    if (p[i + 1] > y0) p[i + 1] = y0 + (p[i + 1] - y0) * kv;
    if (p[i + 1] < 0.003) p[i + 1] = 0.003;
  });
}

// ---- 鉢カバー (HitoHana の陶器・ファイバーストーン鉢) + 土/ウッドチップ。土の上面 Y を返す ----
// 鉢は上を開けて内側も描き (DoubleSide), 縁から 2cm 下に土の面を見せる
function potCover(g, r, h, col = '#ecebe6', { taper = 0.86, rough = 0.62, soil = '#3a2a1e', segs = 32 } = {}) {
  const pm = mat(col, rough, 0.02); pm.side = THREE.DoubleSide;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * taper, h, segs, 1, true), pm);
  body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  g.add(cylAt(r * taper, r * taper, 0.006, segs, pm, 0, 0.003, 0));                                // 底
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.004, 0.005, 6, segs), mat(shade(col, 0.95), rough));
  rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  const soilY = h - 0.02, rs = r - (r - r * taper) * 0.02 / h - 0.002;
  g.add(cylAt(rs, rs, 0.012, segs, mat(soil, 0.98), 0, soilY - 0.006, 0));
  return soilY;
}

// ---- 観葉植物 (HitoHana パキラ 8号, 鉢込み高さ約110〜130cm): ねじり幹 + 長い葉柄の先に掌状の小葉5〜7枚 ----
function buildPlant({ color = '#6f9e74', w = 0.55, d = 0.55, h = 1.2 } = {}) {
  const g = new THREE.Group(), R = rng(8101);
  const soilY = potCover(g, 0.145, 0.265, '#efece6');
  const trunkB = new Batch(), leafB = new Batch();
  const trunkTop = h * 0.68;
  // 3本のねじり幹
  for (let k = 0; k < 3; k++) {
    const pts = [], radii = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14, a = k * 2.094 + t * 7.5, rr = 0.022 * (1 - t * 0.35); pts.push([Math.cos(a) * rr, soilY - 0.02 + t * (trunkTop - soilY + 0.02), Math.sin(a) * rr]); radii.push(0.017 - t * 0.005); }
    addTube(trunkB, pts, radii, gray(0.95 + k * 0.03), 7);
  }
  // 葉柄 + 掌状複葉
  const nP = 16, reach = Math.min(w, d) / 2;
  for (let i = 0; i < nP; i++) {
    const yaw = i / nP * Math.PI * 2 * 2.3 + R() * 0.5, pitch = lerp(0.4, 1.3, R()), plen = lerp(0.14, 0.22, R());
    const B = [Math.cos(yaw) * 0.01, trunkTop - 0.06 + R() * 0.12, Math.sin(yaw) * 0.01];
    const pts = curvePts(B, yaw, pitch, plen, 0.35, 5); addTube(trunkB, pts, 0.004, [0.55, 0.85, 0.5], 4);
    const tip = pts[pts.length - 1], nL = 5 + (i % 3);
    for (let j = 0; j < nL; j++) {
      const f = (j / (nL - 1) - 0.5) * 2.2, lyaw = yaw + f * 0.55, lpitch = pitch * 0.35 - Math.abs(f) * 0.25 - 0.1;
      const len = (lerp(0.13, 0.18, R()) * (1 - Math.abs(f) * 0.2)) * Math.min(1, reach / 0.3);
      addLeaf(leafB, tip, { yaw: lyaw, pitch: lpitch, roll: f * 0.2, len, wid: len * 0.38, prof: PROF.ellip, fold: 0.12, droop: 1.2, seg: 6, col: tone(0.78, 0.86 + R() * 0.2) });
    }
  }
  fitCrown([trunkB, leafB], { w, d, h, y0: soilY });
  g.add(trunkB.mesh(vcMat('#7c6e52', 0.8)));
  g.add(leafB.mesh(vcMat(color, 0.55), true));
  return g;
}

// 葉の上の点 (addLeaf と同じ座標計算)。u=-1..1 (葉幅方向), t=0..1 (付け根→先端)
function leafPoint(B, o, u, t) {
  const F = leafFrame(o.yaw, o.pitch, o.roll || 0), s = t * o.len, hw = o.wid / 2 * o.prof(t);
  const off = (o.fold || 0) * Math.abs(u) * hw - (o.droop || 0) * s * s;
  return [B[0] + F.L[0] * s + F.W[0] * u * hw + F.N[0] * off, B[1] + F.L[1] * s + F.W[1] * u * hw + F.N[1] * off, B[2] + F.L[2] * s + F.W[2] * u * hw + F.N[2] * off];
}
// 小さな三角錐のトゲ (base から dir 方向へ len) を Batch に追加
function addSpine(b, base, dir, len, r, col) {
  const d = norm3(dir), ref = Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = norm3(cross3(d, ref)), v = cross3(d, u), tip = add3(base, mul3(d, len));
  const p = [0, 2.094, 4.189].map(a => add3(base, add3(mul3(u, Math.cos(a) * r), mul3(v, Math.sin(a) * r))));
  for (let i = 0; i < 3; i++) b.tri(p[i], p[(i + 1) % 3], tip, col);
}

// ---- 柱サボテン 6号・2本立ち (ヤオコー 商品番号023: 6号鉢・高さ約52cm / 園芸ネット 柱サボテン(2本立ち)6号):
//      鬼面角系の青緑の柱が 2 本。6 本の稜の山に沿ってトゲ座 (白い綿毛 + 放射状の短いトゲ) が並び, 頭頂は丸い。陶器の鉢カバー + 化粧砂 ----
function cereusStem(r, len, ribs, material, spineB, R) {
  // y=0 が茎の根元, y=len が頭頂。稜の山/谷と, 頭頂に向かって楕円状に絞る
  const cap = Math.min(r * 1.3, len * 0.3), rows = Math.max(10, Math.round(len / 0.01));
  const geo = new THREE.CylinderGeometry(1, 1, 1, ribs * 8, rows, true);
  const pos = geo.attributes.position;
  const radiusAt = (y) => y > len - cap ? Math.sqrt(Math.max(0, 1 - Math.pow((y - (len - cap)) / cap, 2))) : 1;
  const ribK = (a) => 0.78 + 0.22 * Math.pow(Math.abs(Math.cos(a * ribs / 2)), 0.7);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = (pos.getY(i) + 0.5) * len, a = Math.atan2(z, x);
    const k = r * ribK(a) * radiusAt(y);
    pos.setXYZ(i, Math.cos(a) * k, y, Math.sin(a) * k);
  }
  pos.needsUpdate = true; geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; m.userData.colorable = true;
  // トゲ座: 稜の山 (a = 2πj/ribs) に 1.6cm 間隔。白い綿毛 (小さな八面体) + 3〜5 本の黄褐色のトゲ
  for (let j = 0; j < ribs; j++) {
    const a = j / ribs * Math.PI * 2;
    for (let y = 0.03 + (j % 2) * 0.008; y < len - cap * 0.25; y += 0.016) {
      const k = r * radiusAt(y) + 0.001, P = [Math.cos(a) * k, y, Math.sin(a) * k], out = [Math.cos(a), 0.15, Math.sin(a)];
      addSpine(spineB, P, out, 0.003, 0.0035, [1.0, 1.0, 1.0]);
      const n = 3 + Math.floor(R() * 3);
      for (let s = 0; s < n; s++) { const t = (s / n - 0.5) * 2.2; addSpine(spineB, P, add3(out, [-Math.sin(a) * t, (R() - 0.3) * 0.9, Math.cos(a) * t]), 0.006 + R() * 0.006, 0.0006, [0.86, 0.74, 0.5]); }
    }
  }
  return m;
}
function buildCactus({ color = '#587f63', w = 0.22, d = 0.2, h = 0.52 } = {}) {
  const g = new THREE.Group(), R = rng(6161);
  const soilY = potCover(g, 0.095, 0.16, '#e6e2da', { taper: 0.84, soil: '#cdbb96' });   // 6号(φ18cm)を入れた鉢カバー + 化粧砂
  const green = mat(color, 0.55);
  // 2 本の柱: 高い方の頭頂が定義高さ h、低い方は約 7 割。わずかに外へ傾ける
  [[-0.024, 0.006, 0.031, 1.0, 0.05, 0.02], [0.03, -0.01, 0.026, 0.7, -0.08, -0.03]].forEach(([x, z, r, k, tiltZ, tiltX]) => {
    const len = (h - soilY + 0.01) * k / Math.cos(Math.abs(tiltZ));
    const spineB = new Batch();
    const stem = cereusStem(r, len, 6, green, spineB, R);
    const sg = new THREE.Group(); sg.position.set(x, soilY - 0.012, z); sg.rotation.set(tiltX, R() * 0.5, tiltZ);
    sg.add(stem); sg.add(spineB.mesh(vcMat('#f2eee2', 0.7)));
    g.add(sg);
  });
  return g;
}
// ---- 多肉植物 = アガベ・ホリダ 5号 (cocoha: 鉢 φ15×h17cm・全高20cm前後): 黒いロングスリット鉢 + 軽石の化粧土,
//      肉厚で硬い三角形の葉 (竜骨状に折れる) がロゼットに開き, 灰褐色の角質の縁・鋭い鋸歯・先端の頂棘 ----
function buildSucculent({ color = '#3f6b48', w = 0.2, d = 0.2, h = 0.2 } = {}) {
  const g = new THREE.Group(), R = rng(5307);
  const pr = 0.075, ph = 0.17, potM = mat('#262626', 0.5, 0.05); potM.side = THREE.DoubleSide;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr * 0.84, ph, 32, 1, true), potM); pot.position.y = ph / 2; pot.castShadow = pot.receiveShadow = true; g.add(pot);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(pr - 0.002, 0.004, 6, 32), potM); rim.rotation.x = Math.PI / 2; rim.position.y = ph; g.add(rim);
  g.add(cylAt(pr * 0.84, pr * 0.84, 0.006, 32, potM, 0, 0.003, 0));
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + Math.PI / 4, r0 = pr * 0.87 + 0.001; const s = plainBox(0.012, 0.05, 0.004, mat('#0e0e0e', 0.8), Math.cos(a) * r0, 0.028, Math.sin(a) * r0); s.rotation.y = -a + Math.PI / 2; g.add(s); }   // スリット
  const soilY = ph - 0.018;                                                                  // ウォータースペース 約2cm
  g.add(cylAt(pr - 0.006, pr - 0.006, 0.012, 28, mat('#cbbd9c', 0.97), 0, soilY - 0.006, 0));   // 軽石・日向土
  const leafB = new Batch(), edgeB = new Batch(), spineB = new Batch();
  const tri = (t) => Math.min(1, t * 6) * Math.pow(Math.max(0, 1 - t), 0.85);   // 付け根が広く先へ直線的に細る
  const nL = 19;
  for (let i = 0; i < nL; i++) {
    const f = i / (nL - 1), yaw = i * 2.39996 + R() * 0.15;                    // 黄金角で重なりを避ける
    const pitch = lerp(0.9, 0.3, f) + (R() - 0.5) * 0.08, len = lerp(0.04, 0.11, Math.pow(f, 0.8)), wid = len * 0.5;   // 外側の葉は鉢の縁を越えて外へ張り出す
    const B = [Math.sin(yaw) * 0.004, soilY + 0.004 + (1 - f) * 0.008, Math.cos(yaw) * 0.004];
    const o = { yaw, pitch, roll: 0, len, wid, prof: tri, fold: 0.55, droop: 0.4, seg: 7 };
    addLeaf(leafB, B, { ...o, cells: [0, 0.9], col: tone(0.9, 0.85 + R() * 0.2) });
    addLeaf(edgeB, B, { ...o, cells: [0.9, 1], col: gray(1) });
    // 鋸歯 (縁から外へ) と頂棘 (先端から葉の向きへ)
    for (const side of [-1, 1]) for (let t = 0.2; t < 0.9; t += 0.11) {
      const P = leafPoint(B, o, side, t), Q = leafPoint(B, o, side * 0.7, t), dir = [P[0] - Q[0], P[1] - Q[1] + 0.002, P[2] - Q[2]];
      addSpine(spineB, P, dir, 0.004 + len * 0.02, 0.0012, [1, 1, 1]);
    }
    const tip = leafPoint(B, o, 0, 1), pre = leafPoint(B, o, 0, 0.95);
    addSpine(spineB, tip, [tip[0] - pre[0], tip[1] - pre[1], tip[2] - pre[2]], 0.012, 0.0016, [1, 1, 1]);
  }
  fitCrown([leafB, edgeB, spineB], { w, d, h, y0: soilY });
  g.add(leafB.mesh(vcMat(color, 0.42, 0.02), true));
  g.add(edgeB.mesh(vcMat('#8a8270', 0.6)));
  g.add(spineB.mesh(vcMat('#4a3c2e', 0.6)));
  return g;
}

// ---- モンステラ (HitoHana 8号 ボサ造り, 鉢込み高さ約110〜130cm): 長い葉柄 + 切れ込みと穴のあるハート形の大葉 ----
function buildMonstera({ color = '#2d6a34', w = 0.8, d = 0.8, h = 1.2 } = {}) {
  const g = new THREE.Group(), R = rng(3301);
  const soilY = potCover(g, 0.15, 0.27, '#8f8c86', { taper: 0.9 });
  const stemB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2, H = h - soilY;
  // 葉柄の先端 (方位 yaw, 株元からの水平距離 r, 高さ比 y) と葉身 (長さ len, 下向きの傾き bp)。
  // ボサ造りは葉柄が立ち気味で、葉身は外へ 25〜45° 垂れる。新しい葉ほど高く小さい。
  const leaves = [
    { yaw: 0.2, r: 0.1, y: 0.97, len: 0.36, bp: -0.55 }, { yaw: 1.3, r: 0.13, y: 0.84, len: 0.40, bp: -0.5 }, { yaw: 2.3, r: 0.15, y: 0.66, len: 0.34, bp: -0.45 },
    { yaw: 3.2, r: 0.1, y: 0.92, len: 0.38, bp: -0.6 }, { yaw: 4.1, r: 0.17, y: 0.55, len: 0.31, bp: -0.4 }, { yaw: 5.0, r: 0.12, y: 0.8, len: 0.37, bp: -0.52 },
    { yaw: 5.8, r: 0.06, y: 1.0, len: 0.33, bp: -0.72 }, { yaw: 0.75, r: 0.18, y: 0.45, len: 0.28, bp: -0.35 }, { yaw: 3.7, r: 0.05, y: 0.99, len: 0.3, bp: -0.78 },
  ];
  leaves.forEach((L) => {
    const B = [Math.sin(L.yaw) * 0.03, soilY - 0.01, Math.cos(L.yaw) * 0.03];
    const T = [Math.sin(L.yaw) * L.r, soilY + L.y * H - 0.02, Math.cos(L.yaw) * L.r];
    // 葉柄: 株元から先端へ、途中で外へふくらむ緩い弧
    const pts = [];
    for (let i = 0; i <= 7; i++) { const t = i / 7, bow = Math.sin(t * Math.PI) * 0.035; pts.push([lerp(B[0], T[0], t) + Math.sin(L.yaw) * bow, lerp(B[1], T[1], t), lerp(B[2], T[2], t) + Math.cos(L.yaw) * bow]); }
    addTube(stemB, pts, 0.008, gray(0.9 + R() * 0.1), 5);
    // 葉身: 葉柄の先から外向き・下向き (付け根側が高く先端が垂れる)
    const len = L.len * Math.min(1, reach / 0.4), wid = len * 0.92, nS = len > 0.3 ? 4 : 3;
    const slitAt = []; for (let k = 1; k <= nS; k++) slitAt.push(k / (nS + 1));
    addLeaf(leafB, T, {
      yaw: L.yaw + (R() - 0.5) * 0.4, pitch: L.bp + (R() - 0.5) * 0.12, roll: (R() - 0.5) * 0.4, len, wid, prof: PROF.heart, fold: 0.12, droop: 0.9, seg: 16,
      cells: [0, 0.2, 0.36, 1],
      skip: (side, t, k) => (k === 2 && slitAt.some(s => Math.abs(t - s) < 0.035)) || (k === 1 && len > 0.3 && [0.3, 0.52].some(s => Math.abs(t - s) < 0.03) && side > 0),
      col: tone(0.58, 0.85 + R() * 0.2),
    });
  });
  fitCrown([stemB, leafB], { w, d, h, y0: soilY });
  g.add(stemB.mesh(vcMat('#3f6a30', 0.7)));
  g.add(leafB.mesh(vcMat(color, 0.42), true));
  return g;
}

// ---- ドラセナ・コンシンネ (HitoHana 8号, 約138cm〜): 高さ違いの細い幹 3 本 + 先端に赤い縁の細長い葉を放射状に ----
function buildDracaena({ color = '#3a6635', w = 0.5, d = 0.5, h = 1.4 } = {}) {
  const g = new THREE.Group(), R = rng(4412);
  const soilY = potCover(g, 0.15, 0.27, '#2e2e30');
  const stemB = new Batch(), leafB = new Batch(), edgeB = new Batch();
  const reach = Math.min(w, d) / 2;
  [[0.2, 0.62, -0.06], [2.3, 0.82, 0.08], [4.3, 0.98, 0.03]].forEach(([yaw, th, lean], si) => {
    const top = Math.min(th * (h - soilY) / 1.13, h - soilY - 0.14);
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push([Math.sin(yaw) * (0.03 + lean * t * t), soilY + t * top, Math.cos(yaw) * (0.03 + lean * t * t)]); }
    addTube(stemB, pts, pts.map((p, i) => 0.014 - i * 0.0007), gray(0.95), 6);
    for (let r = 0; r < 7; r++) { const y = soilY + top * (0.55 + r * 0.06); const ring = pts[Math.min(8, Math.round((y - soilY) / top * 8))]; addTube(stemB, [[ring[0], y, ring[2]], [ring[0], y + 0.006, ring[2]]], 0.0165, gray(0.7), 6); }
    const T = pts[pts.length - 1], nL = 26;
    for (let i = 0; i < nL; i++) {
      const yawL = i / nL * Math.PI * 2 * 3.7 + R() * 0.4, pitch = lerp(1.25, -0.35, i / nL) + (R() - 0.5) * 0.2;
      const len = lerp(0.18, 0.3, R()) * Math.min(1, reach / 0.25), wid = 0.018;
      const o = { yaw: yawL, pitch, roll: 0, len, wid, prof: PROF.strap, fold: 0.25, droop: pitch > 0.6 ? 0.5 : 1.6, seg: 8 };
      addLeaf(leafB, T, { ...o, cells: [0, 0.62], col: tone(0.72, 0.85 + R() * 0.2) });
      addLeaf(edgeB, T, { ...o, cells: [0.62, 1], col: gray(0.85 + R() * 0.25) });
    }
  });
  fitCrown([stemB, leafB, edgeB], { w, d, h, y0: soilY });
  g.add(stemB.mesh(vcMat('#8a7050', 0.8)));
  g.add(leafB.mesh(vcMat(color, 0.5), true));
  g.add(edgeB.mesh(vcMat('#a8323e', 0.55)));
  return g;
}

// ---- サンスベリア (HitoHana 6号, 約60cm〜): 横縞のある剣状の葉が直立, 黄色の覆輪 (ローレンチー) ----
function buildSansevieria({ color = '#2f5a2a', w = 0.35, d = 0.35, h = 0.65 } = {}) {
  const g = new THREE.Group(), R = rng(6206);
  const soilY = potCover(g, 0.105, 0.19, '#e9e6df');
  const leafB = new Batch(), edgeB = new Batch();
  const maxL = h - soilY - 0.01, nL = 9;
  for (let i = 0; i < nL; i++) {
    const yaw = i / nL * Math.PI * 2 + R() * 0.4, rr = 0.012 + (i % 3) * 0.02;
    const len = maxL * lerp(0.62, 1.0, (i * 37 % nL) / (nL - 1)), wid = lerp(0.05, 0.07, R()), pitch = lerp(1.35, 1.5, R());
    const B = [Math.sin(yaw) * rr, soilY - 0.02, Math.cos(yaw) * rr], seed = R() * 6;
    const o = { yaw, pitch, roll: (R() - 0.5) * 0.6, len, wid, prof: PROF.lance, fold: 0.35, droop: 0.15, seg: 18 };
    addLeaf(leafB, B, { ...o, cells: [0, 0.8], colorAt: (t) => tone(0.62, 0.78 + 0.3 * (0.5 + 0.5 * Math.sin(t * 34 + seed))) });
    addLeaf(edgeB, B, { ...o, cells: [0.8, 1], col: gray(1) });
  }
  fitCrown([leafB, edgeB], { w, d, h, y0: soilY });
  g.add(leafB.mesh(vcMat(color, 0.5), true));
  g.add(edgeB.mesh(vcMat('#d8c85a', 0.55)));
  return g;
}

// ---- フィカス・ウンベラータ (HitoHana 10号, 約174〜186cm): 細い幹 + 上部で分枝, 大きなハート形の薄い葉 ----
function buildFicusUmbellata({ color = '#4f8a3e', w = 0.8, d = 0.8, h = 1.8 } = {}) {
  const g = new THREE.Group(), R = rng(1010);
  const soilY = potCover(g, 0.18, 0.3, '#f0eee9', { taper: 0.84 });
  const trunkB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2, H = h - soilY;
  const trunk = []; for (let i = 0; i <= 10; i++) { const t = i / 10; trunk.push([0.04 * Math.sin(t * 2.2), soilY + t * H * 0.72, 0.02 * Math.sin(t * 3.1)]); }
  addTube(trunkB, trunk, trunk.map((p, i) => 0.022 - i * 0.001), gray(1), 7);
  const branches = [[trunk[7], 0.6, 0.85, 0.33], [trunk[8], 2.6, 0.95, 0.3], [trunk[9], 4.4, 1.05, 0.28], [trunk[10], 1.4, 1.35, 0.26]];
  const tips = [];
  branches.forEach(([B, yaw, pitch, len]) => { const pts = curvePts(B, yaw, pitch, len * H / 1.5, 0.05, 5); addTube(trunkB, pts, 0.011, gray(0.95), 6); tips.push({ pts, yaw }); });
  // 葉: 枝の上部に互生 (付け根から先端へ)
  let n = 0;
  tips.forEach(({ pts, yaw }, bi) => {
    [1, 2, 3, 4, 5, 5].forEach((pi, k) => {
      const P0 = pts[pi], lyaw = yaw + (k % 2 ? 1 : -1) * (0.6 + R() * 0.8), len = lerp(0.24, 0.32, R()) * Math.min(1, reach / 0.4);
      const pet = curvePts(P0, lyaw, 0.5, 0.07, 0, 2); addTube(trunkB, pet, 0.004, [0.6, 0.85, 0.5], 4);
      addLeaf(leafB, pet[pet.length - 1], { yaw: lyaw, pitch: -0.25 + R() * 0.35, roll: (R() - 0.5) * 0.5, len, wid: len * 0.95, prof: PROF.heart, fold: 0.1, droop: 1.1, seg: 12, col: tone(0.95, 0.86 + R() * 0.18) });
      n++;
    });
  });
  fitCrown([trunkB, leafB], { w, d, h, y0: soilY });
  g.add(trunkB.mesh(vcMat('#8b7b5c', 0.78)));
  g.add(leafB.mesh(vcMat(color, 0.55), true));
  return g;
}

// ---- シュロチク (HitoHana 8号, 約110cm〜): 繊維に覆われた細い幹が株立ち, 先端に掌状の葉 (細い裂片 5〜7) ----
function buildRhapis({ color = '#356e3a', w = 0.7, d = 0.7, h = 1.15 } = {}) {
  const g = new THREE.Group(), R = rng(7707);
  const soilY = potCover(g, 0.15, 0.27, '#b98a5c', { taper: 0.8, rough: 0.9 });
  const caneB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2, H = h - soilY;
  const canes = [[0.3, 0.7], [1.2, 0.62], [2.1, 0.78], [3.0, 0.55], [3.9, 0.72], [4.8, 0.6], [5.6, 0.66]];
  canes.forEach(([yaw, th], ci) => {
    const top = th * H / 0.88, lean = 0.06 + R() * 0.09;
    const pts = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([Math.sin(yaw) * (0.03 + lean * t * top), soilY + t * top, Math.cos(yaw) * (0.03 + lean * t * top)]); }
    addTube(caneB, pts, 0.0075, gray(0.9 + R() * 0.1), 6);
    const nLeaf = 3 + (ci % 2);
    for (let j = 0; j < nLeaf; j++) {
      const at = pts[Math.max(3, 6 - j)], lyaw = yaw + (j - nLeaf / 2) * 1.2 + R() * 0.4, lp = 0.9 - j * 0.25;
      const pet = curvePts(at, lyaw, lp, lerp(0.12, 0.2, R()), 0.2, 3); addTube(caneB, pet, 0.003, [0.55, 0.8, 0.45], 4);
      const P = pet[pet.length - 1], nSeg = 5 + (ci % 3);
      for (let s = 0; s < nSeg; s++) {
        const f = (s / (nSeg - 1) - 0.5) * 2, len = lerp(0.18, 0.24, R()) * (1 - Math.abs(f) * 0.2) * Math.min(1, reach / 0.35);
        addLeaf(leafB, P, { yaw: lyaw + f * 0.75, pitch: lp * 0.4 - Math.abs(f) * 0.15, roll: f * 0.4, len, wid: 0.03, prof: PROF.lance, fold: 0.3, droop: 1.3, seg: 6, col: tone(0.7, 0.86 + R() * 0.2) });
      }
    }
  });
  fitCrown([caneB, leafB], { w, d, h, y0: soilY });
  g.add(caneB.mesh(vcMat('#5a4630', 0.95)));
  g.add(leafB.mesh(vcMat(color, 0.5), true));
  return g;
}

// ---- ポトス 4号 (HitoHana, 鉢込み高さ約37cm〜): 4号鉢(φ12cm)を入れた陶器の鉢カバー。株元からこんもり茂る葉と,
//      縁を越えて垂れるツル。ハート形の葉に黄色い斑 (ゴールデンポトス) ----
function buildPothos({ color = '#3f7a3a', w = 0.4, d = 0.4, h = 0.37 } = {}) {
  const g = new THREE.Group(), R = rng(2525);
  const soilY = potCover(g, 0.068, 0.125, '#f1eee8', { taper: 0.8 });
  const vineB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2 - 0.02;
  // 斑: 葉脈に沿った黄色いすじ (頂点カラーでマテリアルの緑を黄緑〜クリームへ持ち上げる)
  const variegate = (seed, amt) => (t, c) => { const v = Math.sin(t * 11 + seed) * 0.5 + Math.sin(c * 7 + seed * 2.3) * 0.5; return v > 1 - amt ? [1.5, 1.42, 0.7] : v > 0.9 - amt ? [1.2, 1.16, 0.8] : gray(0.9 + 0.08 * Math.sin(seed)); };
  const heartLeaf = (P, o) => addLeaf(leafB, P, { prof: PROF.heart, seg: 7, cells: [0, 0.35, 0.7, 1], colorAt: variegate(R() * 9, 0.35 + R() * 0.3), ...o });
  // 鉢の上の株 (こんもり): 株元から立ち上がって外へ弓なりに倒れるツル 7 本に, 短い葉柄で葉が互生
  for (let i = 0; i < 7; i++) {
    const yaw = i / 7 * Math.PI * 2 + R() * 0.4, len = lerp(0.14, h - soilY - 0.02, R()), B = [Math.sin(yaw) * 0.02, soilY, Math.cos(yaw) * 0.02];
    const pts = curvePts(B, yaw, 1.25 - R() * 0.25, len, 0.9 + R() * 0.5, 6); addTube(vineB, pts, 0.0028, gray(0.95), 4);
    for (let j = 2; j <= 6; j++) {
      const P = pts[j], side = j % 2 ? 1 : -1, lyaw = yaw + side * (0.9 + R() * 0.5), pet = curvePts(P, lyaw, 0.5, 0.03, 0, 2);
      addTube(vineB, pet, 0.0018, gray(0.9), 3);
      const ll = lerp(0.065, 0.095, R()) * (j === 6 ? 0.75 : 1);
      heartLeaf(pet[2], { yaw: lyaw, pitch: 0.15 + R() * 0.45, roll: side * 0.3, len: ll, wid: ll * 0.78, fold: 0.15, droop: 2 });
    }
  }
  // 垂れるツル (縁を越えて床まで)。節ごとに葉が互生
  for (let v = 0; v < 7; v++) {
    const yaw = v / 7 * Math.PI * 2 + 0.3, pts = [], drop = lerp(0.55, 1, R());
    for (let i = 0; i <= 9; i++) { const t = i / 9, r = 0.066 + reach * 0.75 * Math.sin(t * 1.3), y = soilY + 0.012 - (soilY - 0.02) * drop * Math.pow(t, 1.25); pts.push([Math.sin(yaw + t * 0.35) * r, y, Math.cos(yaw + t * 0.35) * r]); }
    addTube(vineB, pts, 0.0024, gray(0.9), 4);
    for (let i = 2; i <= 9; i += 1.5) { const P = pts[Math.round(i)], len = lerp(0.05, 0.075, R()) * (1 - i / 30); heartLeaf(P, { yaw: yaw + (Math.round(i) % 2 ? 0.9 : -0.9), pitch: -0.45 - R() * 0.5, roll: 0, len, wid: len * 0.78, fold: 0.1, droop: 1 }); }
  }
  fitCrown([vineB, leafB], { w, d, h, y0: soilY });
  g.add(vineB.mesh(vcMat('#6a8a3a', 0.7)));
  g.add(leafB.mesh(vcMat(color, 0.42), true));
  return g;
}

// ---- ミリオンバンブー = WOOTANG 水耕栽培 L (ガラス器 H27×W10cm・木製ふた, 植物の高さ約40〜50cm):
//      円筒のガラス器に水と白い石, 水中に赤褐色の根。木のふたの穴から節のある茎 3 本が立ち, 先端と上の節から細い葉 ----
function buildBamboo({ color = '#4f8f45', w = 0.25, d = 0.25, h = 0.5 } = {}) {
  const g = new THREE.Group(), R = rng(9090);
  const vr = 0.05, vh = 0.27, lidH = 0.016;
  const glass = new THREE.MeshStandardMaterial({ color: 0xdcecee, roughness: 0.04, metalness: 0.05, transparent: true, opacity: 0.26, side: THREE.DoubleSide });
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(vr, vr, vh, 40, 1, true), glass); vase.position.y = vh / 2; g.add(vase);
  g.add(cylAt(vr, vr, 0.012, 40, glass, 0, 0.006, 0));                                                     // 厚い底
  g.add(cylAt(vr - 0.003, vr - 0.003, 0.035, 28, mat('#ebe6da', 0.9), 0, 0.03, 0));                        // 白い石
  const water = new THREE.Mesh(new THREE.CylinderGeometry(vr - 0.003, vr - 0.003, 0.15, 40), new THREE.MeshStandardMaterial({ color: 0xc7e6ee, roughness: 0.05, transparent: true, opacity: 0.3 }));
  water.position.y = 0.047 + 0.075; g.add(water);
  const lid = cylAt(vr + 0.004, vr + 0.004, lidH, 40, mat('#c9a57a', 0.62), 0, vh + lidH / 2, 0); g.add(lid);   // 木製のふた (ガラスの口に載る)
  const stemB = new Batch(), nodeB = new Batch(), leafB = new Batch(), rootB = new Batch();
  const top = h - 0.1;                                                                                       // 茎の上端 (葉を除く)
  [[-0.016, -0.01, 1.0], [0.018, -0.008, 0.86], [0.0, 0.02, 0.72]].forEach(([x, z, k], si) => {
    const y0 = 0.05, y1 = y0 + (top - y0) * k, n = Math.round((y1 - y0) / 0.065);
    g.add(cylAt(0.0085, 0.0085, 0.002, 12, mat('#2a1e14', 0.9), x, vh + lidH + 0.0005, z));                 // ふたの穴
    addTube(stemB, [[x, y0, z], [x, y1, z]], 0.0068, gray(0.95 + si * 0.03), 9);
    for (let i = 1; i <= n; i++) { const y = y0 + (y1 - y0) * i / (n + 0.4); addTube(nodeB, [[x, y - 0.003, z], [x, y + 0.003, z]], 0.0078, gray(1), 9); }
    // 根 (水中)
    for (let r = 0; r < 4; r++) { const a = R() * Math.PI * 2, pts = []; for (let i = 0; i <= 4; i++) { const t = i / 4; pts.push([x + Math.cos(a) * 0.03 * t, y0 + 0.06 - t * 0.02 + Math.sin(t * 5 + r) * 0.004, z + Math.sin(a) * 0.03 * t]); } addTube(rootB, pts, 0.0012, gray(1), 3); }
    // 頂部の葉 + 上の節からの脇芽
    const T = [x, y1, z];
    for (let l = 0; l < 5; l++) { const yaw = l / 5 * Math.PI * 2 + R(), len = lerp(0.09, 0.13, R()); addLeaf(leafB, T, { yaw, pitch: 1.0 - R() * 0.7, len, wid: 0.02, prof: PROF.lance, fold: 0.22, droop: 2.2, seg: 6, col: gray(0.85 + R() * 0.2) }); }
    if (k > 0.8) { const S = [x, y1 - 0.07, z], yaw = R() * Math.PI * 2, sh = curvePts(S, yaw, 0.9, 0.04, 0, 2); addTube(stemB, sh, 0.0035, gray(1), 6); for (let l = 0; l < 3; l++) addLeaf(leafB, sh[2], { yaw: yaw + (l - 1) * 0.7, pitch: 0.4 + R() * 0.3, len: lerp(0.07, 0.1, R()), wid: 0.018, prof: PROF.lance, fold: 0.2, droop: 2.5, seg: 5, col: gray(0.85 + R() * 0.2) }); }
  });
  fitCrown([stemB, nodeB, leafB], { w, d, h, y0: vh + lidH });
  g.add(stemB.mesh(vcMat('#86b861', 0.45)));
  g.add(nodeB.mesh(vcMat('#6a9a4c', 0.55)));
  g.add(rootB.mesh(vcMat('#b8683c', 0.8)));
  g.add(leafB.mesh(vcMat(color, 0.5), true));
  return g;
}

// ---- ストレリチア・レギネ (HitoHana 10号, 約112cm): 株元から長い葉柄が扇状に立ち上がり, 先にパドル形の葉 ----
function buildStrelitzia({ color = '#2f6a36', w = 0.75, d = 0.75, h = 1.12 } = {}) {
  const g = new THREE.Group(), R = rng(1212);
  const soilY = potCover(g, 0.18, 0.3, '#2b2b2d', { taper: 0.9 });
  const petB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2, H = h - soilY;
  const nL = 9;
  for (let i = 0; i < nL; i++) {
    const yaw = (i / nL) * Math.PI * 2 + R() * 0.3, pitch = lerp(1.12, 1.42, R()), plen = lerp(0.42, 0.56, R()) * H / 0.82;
    const B = [Math.sin(yaw) * 0.025, soilY - 0.01, Math.cos(yaw) * 0.025];
    const pts = curvePts(B, yaw, pitch, plen, 0.08, 6); addTube(petB, pts, [0.012, 0.011, 0.01, 0.009, 0.008, 0.007, 0.006], gray(0.9 + R() * 0.1), 5);
    const len = Math.min(lerp(0.28, 0.36, R()), H - (pts[6][1] - soilY) - 0.01), wid = len * 0.36;
    addLeaf(leafB, pts[6], { yaw: yaw + (R() - 0.5) * 0.3, pitch: pitch - 0.25, roll: lerp(0.9, 1.4, R()), len: Math.max(0.12, len) * Math.min(1, reach / 0.37), wid, prof: PROF.paddle, fold: 0.18, droop: 0.4, seg: 10, col: tone(0.66, 0.84 + R() * 0.18) });
  }
  fitCrown([petB, leafB], { w, d, h, y0: soilY });
  g.add(petB.mesh(vcMat('#3b6a33', 0.6)));
  g.add(leafB.mesh(vcMat(color, 0.45), true));
  return g;
}

// ---- ベンジャミン (HitoHana 8号, 約112cm〜): 3本編みの幹 + 細い枝, 光沢のある小さな葉を密に ----
function buildBenjamin({ color = '#3d7040', w = 0.7, d = 0.7, h = 1.15 } = {}) {
  const g = new THREE.Group(), R = rng(2323);
  const soilY = potCover(g, 0.15, 0.27, '#d8d4cb');
  const woodB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2, H = h - soilY, trunkTop = soilY + H * 0.48;
  for (let k = 0; k < 3; k++) {
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, a = k * 2.094 + t * 6.5; pts.push([Math.cos(a) * 0.014, soilY - 0.02 + t * (trunkTop - soilY), Math.sin(a) * 0.014]); }
    addTube(woodB, pts, 0.011, gray(0.95 + k * 0.03), 6);
  }
  const cy = soilY + H * 0.72, rx = reach * 0.92, ry = H * 0.3;
  const ends = [];
  for (let b = 0; b < 7; b++) {
    const yaw = b / 7 * Math.PI * 2 + R() * 0.4, pitch = lerp(0.5, 1.2, R()), len = lerp(0.2, 0.3, R());
    const pts = curvePts([0, trunkTop - 0.02, 0], yaw, pitch, len, 0.3, 4); addTube(woodB, pts, 0.005, gray(0.95), 5);
    ends.push({ P: pts[4], yaw });
  }
  const nLeaf = 420;
  for (let i = 0; i < nLeaf; i++) {
    // 楕円体の樹冠内に、枝先の近くほど多く葉を散らす
    const e = ends[i % ends.length], u = R(), v = R(), w_ = R();
    const th = u * Math.PI * 2, ph = Math.acos(2 * v - 1), rr = Math.cbrt(w_);
    let P = [Math.sin(ph) * Math.cos(th) * rx * rr, cy + Math.cos(ph) * ry * rr, Math.sin(ph) * Math.sin(th) * rx * rr];
    P = [lerp(P[0], e.P[0], 0.25), lerp(P[1], e.P[1], 0.2), lerp(P[2], e.P[2], 0.25)];
    if (P[1] > h - 0.04) P[1] = h - 0.04 - R() * 0.03;
    const len = lerp(0.05, 0.075, R());
    addLeaf(leafB, P, { yaw: R() * Math.PI * 2, pitch: -0.5 + R() * 0.6, roll: (R() - 0.5) * 0.8, len, wid: len * 0.42, prof: PROF.ovate, fold: 0.2, droop: 3, seg: 3, col: tone(0.62, 0.78 + R() * 0.3) });
  }
  fitCrown([woodB, leafB], { w, d, h, y0: soilY });
  g.add(woodB.mesh(vcMat('#7a6a55', 0.8)));
  g.add(leafB.mesh(vcMat(color, 0.35), true));
  return g;
}

// ---- オリーブの木 (HitoHana 8号, 鉢込み高さ約110〜130cm): 素焼き鉢 + 少しねじれた灰褐色の幹, 表が緑・裏が銀白色の細い葉 ----
function buildOlive({ color = '#7a9a5a', w = 0.6, d = 0.6, h = 1.2 } = {}) {
  const g = new THREE.Group(), R = rng(3131);
  const soilY = potCover(g, 0.15, 0.27, '#b5764e', { taper: 0.78, rough: 0.9 });
  const woodB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2, H = h - soilY, trunkTop = soilY + H * 0.42;
  // 幹: 株元が太く少しねじれた灰褐色。上で 2 本に分かれ, それぞれから小枝
  const trunk = []; for (let i = 0; i <= 8; i++) { const t = i / 8; trunk.push([0.025 * Math.sin(t * 4), soilY - 0.02 + t * (trunkTop - soilY), 0.02 * Math.cos(t * 3)]); }
  addTube(woodB, trunk, trunk.map((p, i) => 0.028 - i * 0.0018), gray(1), 8);
  const ends = [];
  [[0.8, 1.0, 0.27], [3.9, 1.1, 0.25]].forEach(([yaw, pitch, len]) => {
    const lead = curvePts(trunk[8], yaw, pitch, len, 0.15, 5); addTube(woodB, lead, [0.013, 0.012, 0.011, 0.01, 0.009, 0.008], gray(0.97), 6);
    for (let b = 0; b < 4; b++) {
      const P = lead[2 + (b % 4)], by = yaw + (b % 2 ? 1 : -1) * (0.7 + R() * 0.7), pts = curvePts(P, by, lerp(0.35, 0.9, R()), lerp(0.11, 0.17, R()), 0.25, 3);
      addTube(woodB, pts, 0.0045, gray(0.95), 5); ends.push(pts[3]);
    }
    ends.push(lead[5]);
  });
  // 葉: 枝先の周りに対生の細い葉 (表=緑, 裏=銀白。3割ほど裏が見える)
  for (let i = 0; i < 760; i++) {
    const e = ends[i % ends.length], rr = Math.cbrt(R()) * reach * 0.36, th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1);
    const P = [e[0] + Math.sin(ph) * Math.cos(th) * rr, Math.min(h - 0.03, e[1] + Math.cos(ph) * rr * 0.7 + 0.03), e[2] + Math.sin(ph) * Math.sin(th) * rr];
    const len = lerp(0.045, 0.07, R()), silver = R() < 0.3;
    addLeaf(leafB, P, { yaw: R() * Math.PI * 2, pitch: -0.4 + R() * 0.9, roll: (R() - 0.5), len, wid: 0.011, prof: PROF.lance, fold: 0.1, droop: 1, seg: 3, col: silver ? [1.12, 1.17, 1.1] : gray(0.72 + R() * 0.2) });
  }
  fitCrown([woodB, leafB], { w, d, h, y0: soilY });
  g.add(woodB.mesh(vcMat('#7a7064', 0.92)));
  g.add(leafB.mesh(vcMat(color, 0.6), true));
  return g;
}

// ---- ザミオクルカス (HitoHana 8号, 鉢込み高さ約75cm〜): 株元の芋から弓なりに伸びる太い葉軸に, 光沢のある肉厚の楕円の小葉が対生 (1本に10〜12枚) ----
function buildZZPlant({ color = '#2a5a28', w = 0.55, d = 0.55, h = 0.8 } = {}) {
  const g = new THREE.Group(), R = rng(2626);
  const soilY = potCover(g, 0.14, 0.24, '#f2f0ea');
  const stemB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2, H = h - soilY;
  for (let s = 0; s < 10; s++) {
    const yaw = s * 2.39996 + R() * 0.3, len = lerp(0.62, 0.9, R()) * H / 0.8, pitch = lerp(1.15, 1.45, R());   // 黄金角で四方へ
    const pts = curvePts([Math.sin(yaw) * 0.02, soilY - 0.01, Math.cos(yaw) * 0.02], yaw, pitch, len, 0.18, 8);
    addTube(stemB, pts, pts.map((p, i) => 0.014 - i * 0.0012), gray(0.9 + R() * 0.1), 6);
    for (let i = 3; i <= 8; i++) {
      const P = pts[i], ll = lerp(0.07, 0.1, R()) * (i === 8 ? 0.9 : 1) * Math.min(1, reach / 0.27);
      [-1, 1].forEach(side => { if (i === 8 && side > 0) return; addLeaf(leafB, P, { yaw: yaw + side * 1.1, pitch: 0.35 + R() * 0.3, roll: side * 0.5, len: ll, wid: ll * 0.5, prof: PROF.ellip, fold: 0.15, droop: 1.5, seg: 6, col: tone(0.5, 0.85 + R() * 0.2) }); });
    }
  }
  fitCrown([stemB, leafB], { w, d, h, y0: soilY });
  g.add(stemB.mesh(vcMat('#46703a', 0.5)));
  g.add(leafB.mesh(vcMat(color, 0.28, 0.02), true));
  return g;
}

export { buildBamboo, buildBenjamin, buildCactus, buildDracaena, buildFicusUmbellata, buildMonstera, buildOlive, buildPlant, buildPothos, buildRhapis, buildSansevieria, buildStrelitzia, buildSucculent, buildZZPlant };
