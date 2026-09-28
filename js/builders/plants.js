import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { mat, cyl, cylAt } from '../core/helpers.js';

// ============================================================================
// plants.js — 観葉植物シリーズ
// 実寸の根拠: HitoHana(ひとはな) の号数別サイズ(鉢込み高さ)。鉢は号数×3cm = 直径。
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
function potCover(g, r, h, col = '#ecebe6', { taper = 0.86, rough = 0.62, soil = '#3a2a1e', segs = 32 } = {}) {
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * taper, h, segs), mat(col, rough, 0.02));
  body.position.y = h / 2; body.castShadow = body.receiveShadow = true; g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.006, 0.006, 6, segs), mat(shade(col, 0.95), rough));
  rim.rotation.x = Math.PI / 2; rim.position.y = h; g.add(rim);
  g.add(cylAt(r - 0.012, r - 0.012, 0.012, segs, mat(soil, 0.98), 0, h - 0.02, 0));
  return h - 0.014;
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

// ---- サボテン (柱サボテン系の小鉢): 縦の稜(リブ)がある円柱 + 2本の腕, 素焼き鉢 ----
function ribbedColumn(r, h, ribs, material) {
  const geo = new THREE.CylinderGeometry(r, r, h, ribs * 4, 6, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), a = Math.atan2(z, x), rr = Math.hypot(x, z);
    if (rr < 1e-6) continue;
    const k = (0.84 + 0.16 * Math.abs(Math.cos(a * ribs / 2))) * (y > h * 0.35 ? 1 - Math.pow((y - h * 0.35) / (h * 0.15), 2) * 0.35 : 1);
    pos.setX(i, x * k); pos.setZ(i, z * k);
  }
  pos.needsUpdate = true; geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material); m.castShadow = true; m.receiveShadow = true; return m;
}
function buildCactus({ color = '#5f8a52', w = 0.3, d = 0.3, h = 0.55 } = {}) {
  const g = new THREE.Group();
  const pr = Math.min(w, d) / 2 - 0.035, ph = 0.14;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr * 0.78, ph, 28), mat('#b8704a', 0.85)); pot.position.y = ph / 2; pot.castShadow = pot.receiveShadow = true; g.add(pot);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(pr + 0.008, pr + 0.008, 0.028, 28), mat('#a9633f', 0.85)); lip.position.y = ph - 0.014; g.add(lip);
  g.add(cylAt(pr - 0.008, pr - 0.008, 0.01, 24, mat('#cdb892', 0.95), 0, ph - 0.004, 0));   // 化粧砂
  const green = mat(color, 0.62);
  const bodyH = h - ph - 0.02, br = 0.042;
  const body = ribbedColumn(br, bodyH, 8, green); body.position.y = ph + bodyH / 2 - 0.01; body.userData.colorable = true; g.add(body);
  const top = new THREE.Mesh(new THREE.SphereGeometry(br * 0.9, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), green); top.position.y = ph + bodyH - 0.012; top.userData.colorable = true; g.add(top);
  // 腕 (L字に立ち上がる。腕の外側が定義幅 w いっぱいになるよう張り出す)
  const armX = Math.max(br + 0.045, Math.min(w, d) / 2 - 0.03);
  [[-1, 0.38, 0.13], [1, 0.55, 0.1]].forEach(([s, fy, len]) => {
    const y0 = ph + bodyH * fy, ar = 0.026, outL = armX - br + 0.01;
    const out = cyl(ar, ar, outL, 12, green); out.rotation.z = Math.PI / 2; out.position.set(s * (br - 0.01 + outL / 2), y0, 0); out.userData.colorable = true; g.add(out);
    const up = ribbedColumn(ar, len, 6, green); up.position.set(s * armX, y0 + len / 2 - 0.01, 0); up.userData.colorable = true; g.add(up);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(ar * 0.9, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), green); cap.position.set(s * armX, y0 + len - 0.01, 0); cap.userData.colorable = true; g.add(cap);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(ar, 12, 8), green); elbow.position.set(s * armX, y0, 0); elbow.userData.colorable = true; g.add(elbow);
  });
  return g;
}
// ---- 多肉植物 (エケベリア系のロゼット): 六角鉢 + 3重のロゼット ----
function buildSucculent({ color = '#7fae8a', w = 0.25, d = 0.25, h = 0.2 } = {}) {
  const g = new THREE.Group(), R = rng(5307);
  const pr = Math.min(w, d) / 2 * 0.6, ph = h * 0.5;
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr * 0.86, ph, 6), mat('#d9d2c6', 0.82)); pot.position.y = ph / 2; pot.castShadow = pot.receiveShadow = true; g.add(pot);
  g.add(cylAt(pr - 0.01, pr - 0.01, 0.008, 6, mat('#b8a888', 0.95), 0, ph - 0.004, 0));
  const leafB = new Batch();
  const cy = ph + 0.005, k = Math.min(w, d) / 0.25;
  [[11, 0.1 * k, 0.18, 0.045 * k], [9, 0.08 * k, 0.55, 0.04 * k], [7, 0.055 * k, 0.95, 0.032 * k], [5, 0.035 * k, 1.25, 0.024 * k]].forEach(([n, len, pitch, wid], ring) => {
    for (let i = 0; i < n; i++) {
      const yaw = i / n * Math.PI * 2 + ring * 0.33 + R() * 0.12;
      addLeaf(leafB, [Math.sin(yaw) * 0.006, cy + ring * 0.01, Math.cos(yaw) * 0.006], { yaw, pitch, len, wid, prof: PROF.ovate, fold: 0.5, droop: 0.2, seg: 5, col: gray(0.85 + ring * 0.07 + R() * 0.06) });
    }
  });
  fitCrown([leafB], { w, d, h, y0: cy });
  g.add(leafB.mesh(vcMat(color, 0.45), true));
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

// ---- ポトス (5号吊り鉢を棚置き): 鉢の縁から垂れるツルにハート形の斑入り葉 ----
function buildPothos({ color = '#4a8040', w = 0.4, d = 0.4, h = 0.35 } = {}) {
  const g = new THREE.Group(), R = rng(2525);
  const soilY = potCover(g, 0.075, 0.13, '#f1eee8', { taper: 0.8 });
  const vineB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2 - 0.02;
  // 鉢の上の葉 (こんもり)
  for (let i = 0; i < 10; i++) {
    const yaw = i / 10 * Math.PI * 2 + R() * 0.5, B = [Math.sin(yaw) * 0.03, soilY, Math.cos(yaw) * 0.03];
    const pet = curvePts(B, yaw, 1.0 + R() * 0.4, lerp(0.1, h - soilY - 0.07, R()), 0.3, 3); addTube(vineB, pet, 0.003, gray(0.95), 4);
    const len = lerp(0.07, 0.1, R());
    addLeaf(leafB, pet[pet.length - 1], { yaw, pitch: 0.2 + R() * 0.3, roll: (R() - 0.5) * 0.6, len, wid: len * 0.8, prof: PROF.heart, fold: 0.15, droop: 2, seg: 6, col: gray(0.85 + R() * 0.2) });
  }
  // 垂れるツル (縁を越えて下へ)
  for (let v = 0; v < 6; v++) {
    const yaw = v / 6 * Math.PI * 2 + 0.3, pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8, r = 0.07 + reach * 0.8 * Math.sin(t * 1.4), y = soilY + 0.01 - (soilY - 0.02) * Math.pow(t, 1.3); pts.push([Math.sin(yaw + t * 0.4) * r, y, Math.cos(yaw + t * 0.4) * r]); }
    addTube(vineB, pts, 0.0025, gray(0.9), 4);
    for (let i = 2; i <= 8; i += 2) { const len = lerp(0.05, 0.075, R()), P = pts[i]; addLeaf(leafB, P, { yaw: yaw + (i % 4 ? 0.8 : -0.8), pitch: -0.5 - R() * 0.5, roll: 0, len, wid: len * 0.8, prof: PROF.heart, fold: 0.1, droop: 1, seg: 5, col: gray(0.85 + R() * 0.2) }); }
  }
  fitCrown([vineB, leafB], { w, d, h, y0: soilY });
  g.add(vineB.mesh(vcMat('#5f8a3a', 0.7)));
  g.add(leafB.mesh(vcMat(color, 0.45), true));
  return g;
}

// ---- バンブー (ミリオンバンブーの水挿し): ガラス器 + 化粧石 + 節のある茎 5 本, 先端に細い葉 ----
function buildBamboo({ color = '#5a9450', w = 0.35, d = 0.35, h = 0.85 } = {}) {
  const g = new THREE.Group(), R = rng(9090);
  const vr = 0.075, vh = 0.2;
  const glass = new THREE.MeshStandardMaterial({ color: 0xd9eef0, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(vr, vr, vh, 32, 1, true), glass); vase.position.y = vh / 2; g.add(vase);
  g.add(cylAt(vr, vr, 0.008, 32, glass, 0, 0.004, 0));
  g.add(cylAt(vr - 0.004, vr - 0.004, 0.05, 24, mat('#e6e1d6', 0.9), 0, 0.03, 0));   // 化粧石
  const water = new THREE.Mesh(new THREE.CylinderGeometry(vr - 0.003, vr - 0.003, 0.08, 32), new THREE.MeshStandardMaterial({ color: 0xbfe3ee, roughness: 0.05, transparent: true, opacity: 0.35 })); water.position.y = 0.095; g.add(water);
  const stemB = new Batch(), nodeB = new Batch(), leafB = new Batch();
  const heights = [0.72, 0.6, 0.5, 0.42, 0.66].map(k => k * (h - 0.1) / 0.72);
  heights.forEach((sh, i) => {
    const a = i / 5 * Math.PI * 2, x = Math.cos(a) * 0.03, z = Math.sin(a) * 0.03, n = Math.max(3, Math.round(sh / 0.12));
    addTube(stemB, [[x, 0.05, z], [x, 0.05 + sh, z]], 0.011, gray(0.95 + (i % 2) * 0.05), 8);
    for (let k = 1; k < n; k++) addTube(nodeB, [[x, 0.05 + sh * k / n - 0.004, z], [x, 0.05 + sh * k / n + 0.004, z]], 0.0125, gray(1), 8);
    const T = [x, 0.05 + sh, z];
    for (let l = 0; l < 6; l++) { const yaw = l / 6 * Math.PI * 2 + R(), len = lerp(0.09, 0.14, R()); addLeaf(leafB, T, { yaw, pitch: 0.9 - R() * 0.8, len, wid: 0.022, prof: PROF.lance, fold: 0.2, droop: 2, seg: 6, col: gray(0.85 + R() * 0.2) }); }
  });
  fitCrown([stemB, nodeB, leafB], { w, d, h, y0: 0.05 });
  g.add(stemB.mesh(vcMat('#7fb060', 0.5)));
  g.add(nodeB.mesh(vcMat('#5c8a44', 0.6)));
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

// ---- オリーブ: 素焼き鉢 + 少しねじれた幹, 銀緑色の細い葉 ----
function buildOlive({ color = '#7a9a5a', w = 0.6, d = 0.6, h = 1.1 } = {}) {
  const g = new THREE.Group(), R = rng(3131);
  const soilY = potCover(g, 0.15, 0.27, '#b5764e', { taper: 0.78, rough: 0.9 });
  const woodB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2, H = h - soilY, trunkTop = soilY + H * 0.5;
  const trunk = []; for (let i = 0; i <= 8; i++) { const t = i / 8; trunk.push([0.03 * Math.sin(t * 4), soilY - 0.02 + t * (trunkTop - soilY), 0.025 * Math.cos(t * 3)]); }
  addTube(woodB, trunk, trunk.map((p, i) => 0.02 - i * 0.0012), gray(1), 7);
  const ends = [];
  for (let b = 0; b < 6; b++) {
    const yaw = b / 6 * Math.PI * 2 + R() * 0.5, pts = curvePts(trunk[8], yaw, lerp(0.6, 1.2, R()), lerp(0.2, 0.32, R()), 0.2, 4);
    addTube(woodB, pts, 0.006, gray(0.95), 5); ends.push(pts[4]);
  }
  const cy = soilY + H * 0.74, rx = reach * 0.9, ry = H * 0.26;
  for (let i = 0; i < 520; i++) {
    const e = ends[i % ends.length], th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1), rr = Math.cbrt(R());
    let P = [Math.sin(ph) * Math.cos(th) * rx * rr, cy + Math.cos(ph) * ry * rr, Math.sin(ph) * Math.sin(th) * rx * rr];
    P = [lerp(P[0], e[0], 0.3), lerp(P[1], e[1], 0.25), lerp(P[2], e[2], 0.3)];
    if (P[1] > h - 0.03) P[1] = h - 0.03 - R() * 0.03;
    const len = lerp(0.05, 0.07, R()), silver = R() < 0.4;
    addLeaf(leafB, P, { yaw: R() * Math.PI * 2, pitch: -0.4 + R() * 0.9, roll: (R() - 0.5), len, wid: 0.011, prof: PROF.lance, fold: 0.1, droop: 1, seg: 3, col: silver ? [1.18, 1.22, 1.15] : gray(0.8 + R() * 0.2) });
  }
  fitCrown([woodB, leafB], { w, d, h, y0: soilY });
  g.add(woodB.mesh(vcMat('#6b5a44', 0.9)));
  g.add(leafB.mesh(vcMat(color, 0.6), true));
  return g;
}

// ---- ザミオクルカス (ZZプラント): 株元から弓なりに伸びる軸に, 光沢のある楕円の小葉が対生 ----
function buildZZPlant({ color = '#2a5a28', w = 0.55, d = 0.55, h = 1.05 } = {}) {
  const g = new THREE.Group(), R = rng(2626);
  const soilY = potCover(g, 0.15, 0.27, '#f2f0ea');
  const stemB = new Batch(), leafB = new Batch();
  const reach = Math.min(w, d) / 2, H = h - soilY;
  for (let s = 0; s < 9; s++) {
    const yaw = s / 9 * Math.PI * 2 + R() * 0.3, len = lerp(0.62, 0.9, R()) * H / 0.8, pitch = lerp(1.2, 1.45, R());
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
