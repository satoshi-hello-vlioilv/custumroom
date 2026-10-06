import * as THREE from 'three';
import { shade } from '../core/util.js';
import { mat } from '../core/helpers.js';

// ============================================================================
// people.js — 人物 (作業員・大人・小学生・幼児)
//  - 体は SDF (符号付き距離関数) で骨格・筋肉の形を滑らかに合成し, サーフェスネッツで 1 枚の皮膚にメッシュ化する。
//    頭 (顔) と手 (指) は細かい格子で別にメッシュ化し, 首と手首で同じ形どうしを重ねてつなぐ
//  - 服・髪は体の SDF を外側へオフセットした面で作り, 裾・袖口・襟ぐりは平面で切る (布の厚みが見える)
//  - 19 本のボーンを持つスケルトンで SkinnedMesh を動かす。関節の前後で重みを滑らかに配分し, 曲げても継ぎ目が出ない
//  - 靴・ベルト・保護帽・保護メガネ・名札・腕時計・バッグ・ランドセルなどの装身具は押し出し (ExtrudeGeometry) 等で作りボーンに固定
//  - 同じ体型・服装のジオメトリはキャッシュし, 配置ごとにスケルトンと素材だけを作る
// 座標: 足元中心が原点, 顔は +Z, 人物の左手側が +X。単位 m
// ============================================================================


const PEOPLE = (() => {
  // ---------------------------------------------------------------- SDF
  const _ss = (x, a, b) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };
  function smin(a, b, k) { if (k <= 0) return a < b ? a : b; const h = Math.max(k - Math.abs(a - b), 0) / k; return (a < b ? a : b) - h * h * k * 0.25; }
  function smax(a, b, k) { return -smin(-a, -b, k); }
  function _rot(rx = 0, ry = 0, rz = 0) {                 // R = Rx·Ry·Rz (three の 'XYZ'), 行優先 3×3
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    return [cy * cz, -cy * sz, sy, cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy, sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy];
  }
  // 先細りの丸棒 (a→b, 半径 r1→r2)
  function sdCone(a, b, r1, r2) {
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
    return {
      f(x, y, z) {
        const px = x - a[0], py = y - a[1], pz = z - a[2], yy = px * bx + py * by + pz * bz, zz = yy - l2;
        const qx = px * l2 - bx * yy, qy = py * l2 - by * yy, qz = pz * l2 - bz * yy;
        const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2, k = Math.sign(rr) * rr * rr * x2;
        if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
        if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
        return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
      },
      bs: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.sqrt(l2) / 2 + Math.max(r1, r2)],
    };
  }
  // 楕円体 (中心 c, 半径 r, 回転 rot=[rx,ry,rz])
  function sdEll(c, r, rot) {
    const m = rot ? _rot(rot[0], rot[1], rot[2]) : null, ix = 1 / r[0], iy = 1 / r[1], iz = 1 / r[2];
    return {
      f(x, y, z) {
        let px = x - c[0], py = y - c[1], pz = z - c[2];
        if (m) { const X = m[0] * px + m[3] * py + m[6] * pz, Y = m[1] * px + m[4] * py + m[7] * pz, Z = m[2] * px + m[5] * py + m[8] * pz; px = X; py = Y; pz = Z; }
        const ax = px * ix, ay = py * iy, az = pz * iz, k0 = Math.sqrt(ax * ax + ay * ay + az * az);
        const bx = ax * ix, by = ay * iy, bz = az * iz, k1 = Math.sqrt(bx * bx + by * by + bz * bz);
        return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(r[0], r[1], r[2]);
      },
      bs: [c[0], c[1], c[2], Math.max(r[0], r[1], r[2])],
    };
  }
  // 角を丸めた箱 (中心 c, 半寸法 b, 丸み rad)
  function sdBox(c, b, rad, rot) {
    const m = rot ? _rot(rot[0], rot[1], rot[2]) : null;
    return {
      f(x, y, z) {
        let px = x - c[0], py = y - c[1], pz = z - c[2];
        if (m) { const X = m[0] * px + m[3] * py + m[6] * pz, Y = m[1] * px + m[4] * py + m[7] * pz, Z = m[2] * px + m[5] * py + m[8] * pz; px = X; py = Y; pz = Z; }
        const qx = Math.abs(px) - b[0], qy = Math.abs(py) - b[1], qz = Math.abs(pz) - b[2];
        const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
        return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - rad;
      },
      bs: [c[0], c[1], c[2], Math.hypot(b[0], b[1], b[2]) + rad],
    };
  }
  // 平面: 法線 n の側が正 (int で使うと n の側を切り落とす)
  function sdPlane(p0, n) {
    const l = Math.hypot(n[0], n[1], n[2]), nx = n[0] / l, ny = n[1] / l, nz = n[2] / l;
    return { f: (x, y, z) => (x - p0[0]) * nx + (y - p0[1]) * ny + (z - p0[2]) * nz };
  }
  // 形の組み立て: 項目 { f, bs, op: 'add'|'sub'|'int', k } または { list: [...] } (入れ子) を順に合成する
  function compile(list) {
    const items = list.map(it => (it.list ? Object.assign({}, it, compile(it.list)) : it));
    const n = items.length, F = items.map(i => i.f), K = items.map(i => i.k || 0), B = items.map(i => i.bs || null);
    const O = items.map(i => (i.op === 'sub' ? 1 : i.op === 'int' ? 2 : 0));
    const f = (x, y, z) => {
      let d = 1e3;
      for (let i = 0; i < n; i++) {
        const b = B[i], o = O[i];
        if (o === 0) {
          if (b !== null) { const dx = x - b[0], dy = y - b[1], dz = z - b[2]; if (Math.sqrt(dx * dx + dy * dy + dz * dz) - b[3] > d + K[i]) continue; }
          d = smin(d, F[i](x, y, z), K[i]);
        } else if (o === 1) {
          if (b !== null) { const dx = x - b[0], dy = y - b[1], dz = z - b[2]; if (Math.sqrt(dx * dx + dy * dy + dz * dz) - b[3] > K[i] - d) continue; }
          d = smax(d, -F[i](x, y, z), K[i]);
        } else d = smax(d, F[i](x, y, z), K[i]);
      }
      return d;
    };
    const adds = items.filter((it, i) => O[i] === 0);
    let bs = null;
    if (adds.length && adds.every(it => it.bs)) {
      let cx = 0, cy = 0, cz = 0; adds.forEach(it => { cx += it.bs[0]; cy += it.bs[1]; cz += it.bs[2]; });
      cx /= adds.length; cy /= adds.length; cz /= adds.length;
      let r = 0; adds.forEach(it => { r = Math.max(r, Math.hypot(it.bs[0] - cx, it.bs[1] - cy, it.bs[2] - cz) + it.bs[3]); });
      bs = [cx, cy, cz, r + Math.max(0, ...K)];
    }
    return { f, bs };
  }
  const A = (p, k = 0, bone) => Object.assign({ op: 'add', k, bone }, p);
  const S = (p, k = 0) => Object.assign({ op: 'sub', k }, p);
  const I = (p, k = 0) => Object.assign({ op: 'int', k }, p);

  // ---------------------------------------------------------------- サーフェスネッツ
  // fd: 距離関数, box: [x0,y0,z0,x1,y1,z1], h: 格子間隔。粗い格子で表面から遠い点を補間で済ませ, 頂点は面へ 1 回射影する
  // 重い計算は generator にして少しずつ進められるようにする (drain で一気に実行)
  const drain = g => { let r; while (!(r = g.next()).done); return r.value; };
  const meshSDF = (...a) => drain(meshGen(...a));
  function* meshGen(fd, box, h, { coarse = 3, keepTri = null, cull = null, band: bandK = 1.9, fast = false } = {}) {
    const [x0, y0, z0, x1, y1, z1] = box;
    const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
    const C = coarse, H = h * C;
    const cnx = Math.ceil((nx - 1) / C) + 2, cny = Math.ceil((ny - 1) / C) + 2, cnz = Math.ceil((nz - 1) / C) + 2;
    const cv = new Float32Array(cnx * cny * cnz);
    for (let k = 0; k < cnz; k++) for (let j = 0; j < cny; j++) for (let i = 0; i < cnx; i++) cv[(k * cny + j) * cnx + i] = fd(x0 + i * H, y0 + j * H, z0 + k * H);
    const v = new Float32Array(nx * ny * nz), band = H * bandK, sY = cnx, sZ = cnx * cny;
    for (let k = 0; k < nz; k++) {
      if (k % 3 === 2) yield;
      const fk = k / C, ck = Math.floor(fk), tk = fk - ck;
      for (let j = 0; j < ny; j++) {
        const fj = j / C, cj = Math.floor(fj), tj = fj - cj;
        for (let i = 0; i < nx; i++) {
          const fi = i / C, ci = Math.floor(fi), ti = fi - ci, b = (ck * cny + cj) * cnx + ci;
          const c00 = cv[b] + (cv[b + 1] - cv[b]) * ti, c10 = cv[b + sY] + (cv[b + sY + 1] - cv[b + sY]) * ti;
          const c01 = cv[b + sZ] + (cv[b + sZ + 1] - cv[b + sZ]) * ti, c11 = cv[b + sZ + sY] + (cv[b + sZ + sY + 1] - cv[b + sZ + sY]) * ti;
          const c0 = c00 + (c10 - c00) * tj, c1 = c01 + (c11 - c01) * tj, e = c0 + (c1 - c0) * tk;
          v[(k * ny + j) * nx + i] = Math.abs(e) < band ? fd(x0 + i * h, y0 + j * h, z0 + k * h) : e;
        }
      }
    }
    const cnx1 = nx - 1, cny1 = ny - 1, cell = new Int32Array(cnx1 * cny1 * (nz - 1)).fill(-1), P = [];
    const CO = [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1];
    const ED = [0, 1, 2, 3, 4, 5, 6, 7, 0, 2, 1, 3, 4, 6, 5, 7, 0, 4, 1, 5, 2, 6, 3, 7];
    const val = new Float32Array(8);
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let neg = 0;
      for (let c = 0; c < 8; c++) { const vv = v[((k + CO[c * 3 + 2]) * ny + j + CO[c * 3 + 1]) * nx + i + CO[c * 3]]; val[c] = vv; if (vv < 0) neg++; }
      if (neg === 0 || neg === 8) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (let e = 0; e < 12; e++) {
        const a = ED[e * 2], bb = ED[e * 2 + 1], va = val[a], vb = val[bb];
        if ((va < 0) === (vb < 0)) continue;
        const t = va / (va - vb);
        sx += CO[a * 3] + (CO[bb * 3] - CO[a * 3]) * t; sy += CO[a * 3 + 1] + (CO[bb * 3 + 1] - CO[a * 3 + 1]) * t; sz += CO[a * 3 + 2] + (CO[bb * 3 + 2] - CO[a * 3 + 2]) * t; n++;
      }
      cell[(k * cny1 + j) * cnx1 + i] = P.length / 3;
      P.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
    }
    // 頂点を面へ射影し, 勾配から法線 (四面体の 4 点で勾配と値を同時に求める)
    const nv = P.length / 3, pos = new Float32Array(P), nrm = new Float32Array(nv * 3), e = h * 0.3;
    const grad = (x, y, z, o) => {
      const a = fd(x + e, y - e, z - e), b = fd(x - e, y - e, z + e), c = fd(x - e, y + e, z - e), d = fd(x + e, y + e, z + e);
      o[0] = a - b - c + d; o[1] = -a - b + c + d; o[2] = -a + b - c + d; o[3] = (a + b + c + d) / 4;
    };
    const G = new Float64Array(4);
    for (let q = 0; q < nv; q++) {
      if ((q & 2047) === 2047) yield;
      let x = pos[q * 3], y = pos[q * 3 + 1], z = pos[q * 3 + 2];
      grad(x, y, z, G);
      let gx = G[0], gy = G[1], gz = G[2], g2 = gx * gx + gy * gy + gz * gz;
      if (g2 > 1e-14) {
        let s = G[3] * 4 * e / g2; const step = Math.abs(s) * Math.sqrt(g2);
        if (step > h * 0.7) s *= h * 0.7 / step;
        x -= s * gx; y -= s * gy; z -= s * gz;
        if (!fast) { grad(x, y, z, G); gx = G[0]; gy = G[1]; gz = G[2]; g2 = gx * gx + gy * gy + gz * gz; }
      }
      const gl = Math.sqrt(g2) || 1;
      pos[q * 3] = x; pos[q * 3 + 1] = y; pos[q * 3 + 2] = z; nrm[q * 3] = gx / gl; nrm[q * 3 + 1] = gy / gl; nrm[q * 3 + 2] = gz / gl;
    }
    // cull(x,y,z) が真の頂点だけでできた三角形は捨てる (服の下に隠れる肌など)
    const hide = cull ? new Uint8Array(nv) : null;
    if (cull) for (let q = 0; q < nv; q++) hide[q] = cull(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]) ? 1 : 0;
    const idx = [], cid = (i, j, k) => cell[(k * cny1 + j) * cnx1 + i];
    const d2 = (a, b) => { const dx = pos[a * 3] - pos[b * 3], dy = pos[a * 3 + 1] - pos[b * 3 + 1], dz = pos[a * 3 + 2] - pos[b * 3 + 2]; return dx * dx + dy * dy + dz * dz; };
    const tri = (a, b, c) => {
      if (hide && hide[a] && hide[b] && hide[c]) return;
      if (keepTri && !keepTri(pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2], pos[b * 3], pos[b * 3 + 1], pos[b * 3 + 2], pos[c * 3], pos[c * 3 + 1], pos[c * 3 + 2])) return;
      idx.push(a, b, c);
    };
    const quad = (a, b, c, dd, flip) => {
      if (a < 0 || b < 0 || c < 0 || dd < 0) return;
      if (flip) { const t = b; b = dd; dd = t; }
      if (d2(a, c) < d2(b, dd)) { tri(a, b, c); tri(a, c, dd); } else { tri(a, b, dd); tri(b, c, dd); }
    };
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {      // X 方向の辺
      const v0 = v[(k * ny + j) * nx + i], v1 = v[(k * ny + j) * nx + i + 1];
      if ((v0 < 0) !== (v1 < 0)) quad(cid(i, j - 1, k - 1), cid(i, j, k - 1), cid(i, j, k), cid(i, j - 1, k), !(v0 < 0));
    }
    for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {      // Y 方向の辺
      const v0 = v[(k * ny + j) * nx + i], v1 = v[(k * ny + j + 1) * nx + i];
      if ((v0 < 0) !== (v1 < 0)) quad(cid(i - 1, j, k - 1), cid(i, j, k - 1), cid(i, j, k), cid(i - 1, j, k), v0 < 0);
    }
    for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {      // Z 方向の辺
      const v0 = v[(k * ny + j) * nx + i], v1 = v[((k + 1) * ny + j) * nx + i];
      if ((v0 < 0) !== (v1 < 0)) quad(cid(i - 1, j - 1, k), cid(i, j - 1, k), cid(i, j, k), cid(i - 1, j, k), !(v0 < 0));
    }
    return { pos, nrm, idx: new Uint32Array(idx) };
  }
  // 頂点を詰め直す (使われない頂点を除く)
  function compact(m) {
    const nv = m.pos.length / 3, map = new Int32Array(nv).fill(-1); let n = 0;
    for (let i = 0; i < m.idx.length; i++) { const a = m.idx[i]; if (map[a] < 0) map[a] = n++; }
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3);
    for (let a = 0; a < nv; a++) { const b = map[a]; if (b < 0) continue; for (let c = 0; c < 3; c++) { pos[b * 3 + c] = m.pos[a * 3 + c]; nrm[b * 3 + c] = m.nrm[a * 3 + c]; } }
    const idx = new Uint32Array(m.idx.length); for (let i = 0; i < idx.length; i++) idx[i] = map[m.idx[i]];
    return { pos, nrm, idx };
  }
  // X を反転したコピー (左右対称の手など)。巻き順も反転
  function mirrorX(m) {
    const pos = m.pos.slice(), nrm = m.nrm.slice(), idx = m.idx.slice();
    for (let i = 0; i < pos.length; i += 3) { pos[i] = -pos[i]; nrm[i] = -nrm[i]; }
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    return { pos, nrm, idx };
  }
  // メッシュ → BufferGeometry。uv/color/weights は頂点ごとのコールバック
  function toGeometry(m, { uv, color, rgba, weights } = {}) {
    const nv = m.pos.length / 3, g = new THREE.BufferGeometry(), P = m.pos, N = m.nrm;
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
    if (uv) { const U = new Float32Array(nv * 2); for (let i = 0; i < nv; i++) { const t = uv(P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N[i * 3], N[i * 3 + 1], N[i * 3 + 2]); U[i * 2] = t[0]; U[i * 2 + 1] = t[1]; } g.setAttribute('uv', new THREE.BufferAttribute(U, 2)); }
    if (color) { const Cc = new Float32Array(nv * 3); for (let i = 0; i < nv; i++) { const c = color(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); Cc[i * 3] = c[0]; Cc[i * 3 + 1] = c[1]; Cc[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(Cc, 3)); }
    if (rgba) { const Cc = new Float32Array(nv * 4); for (let i = 0; i < nv; i++) { const c = rgba(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); Cc[i * 4] = c[0]; Cc[i * 4 + 1] = c[1]; Cc[i * 4 + 2] = c[2]; Cc[i * 4 + 3] = c[3]; } g.setAttribute('color', new THREE.BufferAttribute(Cc, 4)); }
    if (weights) {
      const SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4);
      for (let i = 0; i < nv; i++) { const w = weights(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); for (let j = 0; j < 4; j++) { SI[i * 4 + j] = w[j * 2]; SW[i * 4 + j] = w[j * 2 + 1]; } }
      g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    }
    g.setIndex(new THREE.BufferAttribute(m.idx, 1));
    return g;
  }
  // 箱投影の UV (scale: 1 UV あたりの m)
  const boxUV = (sc = 0.25) => (x, y, z, nx, ny, nz) => {
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    return ax >= ay && ax >= az ? [z / sc, y / sc] : az >= ay ? [x / sc, y / sc] : [x / sc, z / sc];
  };

  // ---------------------------------------------------------------- スケルトン
  const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'upperArmL', 'foreArmL', 'handL', 'shoulderR', 'upperArmR', 'foreArmR', 'handR',
    'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR'];
  const BI = Object.fromEntries(BONES.map((b, i) => [b, i]));
  const PARENT = { hips: null, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', shoulderL: 'chest', upperArmL: 'shoulderL', foreArmL: 'upperArmL', handL: 'foreArmL',
    shoulderR: 'chest', upperArmR: 'shoulderR', foreArmR: 'upperArmR', handR: 'foreArmR', thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR' };
  // 頂点の重み: 一番近い形 (プリミティブ) のボーンを持ち主とし, 関節の前後 ±L で親子のボーンへ滑らかに配分する
  function makeWeigher(prims, joints) {
    const np = prims.length, BS = prims.map(p => p.bs || null);
    return (x, y, z) => {
      let best = 1e9, owner = 0;
      for (let i = 0; i < np; i++) {
        const b = BS[i]; if (b !== null) { const dx = x - b[0], dy = y - b[1], dz = z - b[2]; if (Math.sqrt(dx * dx + dy * dy + dz * dz) - b[3] > best) continue; }
        const d = prims[i].f(x, y, z); if (d < best) { best = d; owner = prims[i].bone; }
      }
      const w = new Float32Array(BONES.length); w[owner] = 1;
      for (let i = 0; i < joints.length; i++) {
        const j = joints[i];
        if (j.p !== owner && j.c !== owner) continue;
        const dx = x - j.at[0], dy = y - j.at[1], dz = z - j.at[2];
        const fall = j.R ? _ss(Math.sqrt(dx * dx + dy * dy + dz * dz), j.R, j.R * 0.5) : 1;
        if (fall <= 0) continue;
        const f = _ss(dx * j.dir[0] + dy * j.dir[1] + dz * j.dir[2], -j.L, j.L);
        const t = (owner === j.p ? f : 1 - f) * fall, other = owner === j.p ? j.c : j.p;
        const give = Math.min(t, w[owner]); w[other] += give; w[owner] -= give;
      }
      const top = [];
      for (let b = 0; b < w.length; b++) if (w[b] > 1e-3) top.push([b, w[b]]);
      top.sort((a, b) => b[1] - a[1]); top.length = Math.min(top.length, 4);
      const s = top.reduce((a, t) => a + t[1], 0) || 1, out = [0, 0, 0, 0, 0, 0, 0, 0];
      top.forEach((t, i) => { out[i * 2] = t[0]; out[i * 2 + 1] = t[1] / s; });
      return out;
    };
  }
  const rigid = bone => () => [BI[bone], 1, 0, 0, 0, 0, 0, 0];
  // 2 つの重み (各 4 本まで) を t で混ぜ, 大きい 4 本に正規化
  function blendW(a, b, t) {
    const m = new Map();
    for (let i = 0; i < 4; i++) { if (a[i * 2 + 1] > 0) m.set(a[i * 2], (m.get(a[i * 2]) || 0) + a[i * 2 + 1] * (1 - t)); if (b[i * 2 + 1] > 0) m.set(b[i * 2], (m.get(b[i * 2]) || 0) + b[i * 2 + 1] * t); }
    const top = [...m].sort((p, q) => q[1] - p[1]).slice(0, 4), s = top.reduce((v, e) => v + e[1], 0) || 1, out = [0, 0, 0, 0, 0, 0, 0, 0];
    top.forEach((e, i) => { out[i * 2] = e[0]; out[i * 2 + 1] = e[1] / s; });
    return out;
  }
  const _sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const _add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const _mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
  const _lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const _nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const _mx = p => [-p[0], p[1], p[2]];
  const _dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const _cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  // ---------------------------------------------------------------- 面の上の点・断面・押し出し
  // 距離場の勾配 (単位ベクトル)
  function gradN(fd, p, e = 2e-4) {
    const [x, y, z] = p;
    return _nrm([fd(x + e, y, z) - fd(x - e, y, z), fd(x, y + e, z) - fd(x, y - e, z), fd(x, y, z + e) - fd(x, y, z - e)]);
  }
  // 点を等値面 fd = off へ勾配に沿って移す
  function project(fd, p, off = 0) {
    let q = p.slice();
    for (let i = 0; i < 8; i++) {
      const d = fd(q[0], q[1], q[2]) - off; if (Math.abs(d) < 2e-5) break;
      const n = gradN(fd, q); q = [q[0] - n[0] * d, q[1] - n[1] * d, q[2] - n[2] * d];
    }
    return q;
  }
  // 軸 (中心 c, 向き ax) まわりの断面: 外側 rMax から内向きに進み, 最初に fd = off となる半径を角度ごとに求める
  // ref: 角度 0 の向き (ax に直交)。返り値は点列 (閉曲線)
  function ring(fd, c, ax, ref, n, off = 0, rMax = 0.3) {
    const a = _nrm(ax), r0 = _nrm(_sub(ref, _mul(a, _dot(ref, a)))), r1 = _cross(a, r0), out = [];
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, d = _add(_mul(r0, Math.cos(t)), _mul(r1, Math.sin(t)));
      const at = r => fd(c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r) - off;
      let r = rMax, v = at(r), lo = -1;
      for (let k = 0; k < 200 && r > 0; k++) { const nr = r - Math.max(Math.abs(v) * 0.9, 4e-4); const nv = at(nr); if (nv <= 0) { lo = nr; break; } r = nr; v = nv; }
      if (lo < 0) { out.push(c.slice()); continue; }
      let a0 = lo, a1 = r; for (let k = 0; k < 18; k++) { const m = (a0 + a1) / 2; if (at(m) <= 0) a0 = m; else a1 = m; }
      out.push(_add(c, _mul(d, (a0 + a1) / 2)));
    }
    return out;
  }
  // 断面 prof ([[u, v], ...] 反時計回りの閉多角形。u: 幅, v: 厚み (面から外向き)) を経路 pts に沿って押し出す。
  // nrmAt(p, i): 断面の v 方向 (多くは面の法線)。closed: 閉じた経路 (ベルト・輪)。端は閉じる
  function sweep(pts, prof, nrmAt, { closed = false, caps = true } = {}) {
    const n = pts.length, m = prof.length, P = [], idx = [];
    for (let i = 0; i < n; i++) {
      const a = pts[closed ? (i - 1 + n) % n : Math.max(i - 1, 0)], b = pts[closed ? (i + 1) % n : Math.min(i + 1, n - 1)];
      const T = _nrm(_sub(b, a)); let N = nrmAt(pts[i], i); N = _nrm(_sub(N, _mul(T, _dot(N, T)))); const S = _cross(T, N);
      for (let k = 0; k < m; k++) { const [u, v] = prof[k]; P.push(pts[i][0] + S[0] * u + N[0] * v, pts[i][1] + S[1] * u + N[1] * v, pts[i][2] + S[2] * u + N[2] * v); }
    }
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) { const i1 = (i + 1) % n; for (let k = 0; k < m; k++) { const k1 = (k + 1) % m, a = i * m + k, b = i * m + k1, c = i1 * m + k1, d = i1 * m + k; idx.push(a, d, c, a, c, b); } }
    if (!closed && caps) {
      [[0, -1], [n - 1, 1]].forEach(([i, sg]) => {
        let cx = 0, cy = 0, cz = 0; for (let k = 0; k < m; k++) { cx += P[(i * m + k) * 3]; cy += P[(i * m + k) * 3 + 1]; cz += P[(i * m + k) * 3 + 2]; }
        const c = P.length / 3; P.push(cx / m, cy / m, cz / m);
        for (let k = 0; k < m; k++) { const a = i * m + k, b = i * m + (k + 1) % m; if (sg < 0) idx.push(c, b, a); else idx.push(c, a, b); }
      });
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  // 断面形: 角を丸めた長方形 (幅 w, 厚み t, 面から off だけ浮かせる) / 楕円
  function rrProf(w, t, off = 0, r = Math.min(w, t) * 0.45, seg = 3) {
    const out = [], hw = w / 2, ht = t / 2, c = [[hw - r, ht - r], [-hw + r, ht - r], [-hw + r, -ht + r], [hw - r, -ht + r]];
    for (let q = 0; q < 4; q++) for (let i = 0; i <= seg; i++) { const a = (q + i / seg) * Math.PI / 2; out.push([c[q][0] + Math.cos(a) * r, c[q][1] + Math.sin(a) * r + ht + off]); }
    return out;
  }
  function ellProf(rx, ry, n = 10, off = 0) { const out = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; out.push([Math.cos(a) * rx, Math.sin(a) * ry + off]); } return out; }
  // 3 次スプライン補間で点列を細かくする
  function spline(pts, n, closed = false) { const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])), closed, 'centripetal'); return c.getSpacedPoints(closed ? n : n - 1).slice(0, n).map(v => [v.x, v.y, v.z]); }

  // BufferGeometry → 頂点ごとの重み (weights(x,y,z)) と頂点色を付ける
  function skinGeo(g, weights, color) {
    const P = g.attributes.position.array, nv = P.length / 3, SI = new Uint16Array(nv * 4), SW = new Float32Array(nv * 4);
    for (let i = 0; i < nv; i++) { const w = weights(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); for (let j = 0; j < 4; j++) { SI[i * 4 + j] = w[j * 2]; SW[i * 4 + j] = w[j * 2 + 1]; } }
    g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
    if (color) { const C = new Float32Array(nv * 3); for (let i = 0; i < nv; i++) { const c = typeof color === 'function' ? color(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) : color; C[i * 3] = c[0]; C[i * 3 + 1] = c[1]; C[i * 3 + 2] = c[2]; } g.setAttribute('color', new THREE.BufferAttribute(C, 3)); }
    return g;
  }
  // 同じ素材のジオメトリを 1 つにまとめる (描画回数を減らす)。属性は全部に揃える
  function mergeGeos(list) {
    if (list.length === 1) return list[0];
    const keys = ['position', 'normal', 'uv', 'color', 'skinIndex', 'skinWeight'], has = {};
    keys.forEach(k => { has[k] = list.some(g => g.attributes[k]); });
    let nv = 0, ni = 0; list.forEach(g => { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; });
    const out = new THREE.BufferGeometry(), arr = {}, dim = { position: 3, normal: 3, uv: 2, color: 3, skinIndex: 4, skinWeight: 4 };
    keys.forEach(k => { if (has[k]) arr[k] = k === 'skinIndex' ? new Uint16Array(nv * 4) : new Float32Array(nv * dim[k]); });
    const I = new Uint32Array(ni); let vo = 0, io = 0;
    list.forEach(g => {
      const c = g.attributes.position.count;
      keys.forEach(k => {
        if (!has[k]) return; const a = g.attributes[k];
        if (a) arr[k].set(a.array.length === c * dim[k] ? a.array : Array.from({ length: c * dim[k] }, (_, i) => a.getComponent ? a.getComponent(Math.floor(i / dim[k]), i % dim[k]) : a.array[i]), vo * dim[k]);
        else if (k === 'color') arr[k].fill(1, vo * 3, (vo + c) * 3);
        else if (k === 'skinWeight') for (let i = 0; i < c; i++) arr[k][(vo + i) * 4] = 1;
      });
      if (g.index) { const s = g.index.array; for (let i = 0; i < s.length; i++) I[io + i] = s[i] + vo; io += s.length; }
      else { for (let i = 0; i < c; i++) I[io + i] = vo + i; io += c; }
      vo += c;
    });
    keys.forEach(k => { if (has[k]) out.setAttribute(k, new THREE.BufferAttribute(arr[k], dim[k])); });
    out.setIndex(new THREE.BufferAttribute(I, 1));
    return out;
  }

  // ---------------------------------------------------------------- 局所座標系
  // R: 行優先 3×3 で列が局所 x,y,z 軸 (モデル座標), t: 原点。局所で定義した形をモデル座標で評価する
  const frameR = (x, y, z) => [x[0], y[0], z[0], x[1], y[1], z[1], x[2], y[2], z[2]];
  const _apR = (R, p) => [R[0] * p[0] + R[1] * p[1] + R[2] * p[2], R[3] * p[0] + R[4] * p[1] + R[5] * p[2], R[6] * p[0] + R[7] * p[1] + R[8] * p[2]];
  function xform(pr, R, t) {
    const f0 = pr.f, out = Object.assign({}, pr);
    out.f = (x, y, z) => { const px = x - t[0], py = y - t[1], pz = z - t[2]; return f0(R[0] * px + R[3] * py + R[6] * pz, R[1] * px + R[4] * py + R[7] * pz, R[2] * px + R[5] * py + R[8] * pz); };
    if (pr.bs) { const c = _add(_apR(R, pr.bs), t); out.bs = [c[0], c[1], c[2], pr.bs[3]]; }
    return out;
  }
  function xformMesh(m, R, t) {
    const pos = new Float32Array(m.pos.length), nrm = new Float32Array(m.nrm.length);
    for (let i = 0; i < pos.length; i += 3) {
      const p = _apR(R, [m.pos[i], m.pos[i + 1], m.pos[i + 2]]), n = _apR(R, [m.nrm[i], m.nrm[i + 1], m.nrm[i + 2]]);
      pos[i] = p[0] + t[0]; pos[i + 1] = p[1] + t[1]; pos[i + 2] = p[2] + t[2]; nrm[i] = n[0]; nrm[i + 1] = n[1]; nrm[i + 2] = n[2];
    }
    return { pos, nrm, idx: m.idx };
  }
  // 表面の z を探す (x, y を固定して z0 から z1 へ距離場をたどる)
  function surfZ(fd, x, y, z0, z1) {
    let z = z0; const dir = Math.sign(z1 - z0);
    for (let i = 0; i < 80; i++) { const d = fd(x, y, z); if (d < 1e-4) return z; z += dir * Math.max(d, 4e-4); if ((z - z1) * dir > 0) return z1; }
    return z;
  }

  // ---------------------------------------------------------------- 体型 (身長比)。関節は人物の左 (+X) 側の値
  const TYPES = {
    man: { hh: .13, neckR: .031, hand: .108, armR: [.029, .0215, .021, .0142], legR: [.053, .031, .033, .0185],
      j: { hips: [0, .555, -.004], spine: [0, .615, -.012], chest: [0, .7, -.014], neck: [0, .842, -.02], head: [0, .884, -.01],
        shoulder: [.02, .812, .006], upperArm: [.1, .806, -.012], foreArm: [.117, .628, -.026], hand: [.124, .486, .004],
        thigh: [.051, .524, .002], shin: [.055, .287, .006], foot: [.058, .043, -.012] },
      torso: { pelvis: [[0, .54, -.004], [.097, .062, .068]], glute: [[.044, .505, -.04], [.058, .062, .048]], abd: [[0, .575, .012], [.086, .055, .06]],
        waist: [[0, .625, 0], [.087, .055, .062]], rib: [[0, .705, -.004], [.098, .085, .068]], pec: [[.045, .74, .034], [.05, .034, .028]],
        back: [[0, .755, -.04], [.093, .065, .042]], trap: [[0, .81, -.022], [.073, .03, .05]], delt: [[.104, .79, -.01], [.034, .05, .041]] } },
    woman: { hh: .135, neckR: .027, hand: .105, armR: [.026, .019, .019, .0128], legR: [.056, .031, .032, .017],
      j: { hips: [0, .55, -.006], spine: [0, .612, -.012], chest: [0, .695, -.012], neck: [0, .838, -.018], head: [0, .88, -.01],
        shoulder: [.02, .806, .004], upperArm: [.097, .8, -.012], foreArm: [.113, .622, -.022], hand: [.124, .486, .008],
        thigh: [.056, .52, .002], shin: [.055, .283, .006], foot: [.056, .043, -.012] },
      torso: { pelvis: [[0, .535, -.006], [.1, .065, .07]], glute: [[.047, .5, -.042], [.06, .065, .05]], abd: [[0, .57, .012], [.085, .055, .058]],
        waist: [[0, .62, 0], [.074, .05, .056]], rib: [[0, .7, -.004], [.084, .08, .062]], bust: [[.042, .718, .04], [.044, .042, .04]],
        back: [[0, .75, -.036], [.083, .06, .038]], trap: [[0, .805, -.02], [.065, .026, .045]], delt: [[.1, .785, -.01], [.031, .044, .037]] } },
    child: { hh: .158, neckR: .03, hand: .105, armR: [.026, .02, .02, .0145], legR: [.05, .031, .032, .019],
      j: { hips: [0, .52, -.004], spine: [0, .58, -.01], chest: [0, .66, -.012], neck: [0, .805, -.016], head: [0, .845, -.008],
        shoulder: [.02, .775, .004], upperArm: [.098, .77, -.01], foreArm: [.11, .612, -.02], hand: [.116, .483, .006],
        thigh: [.052, .485, .002], shin: [.053, .268, .006], foot: [.056, .046, -.012] },
      torso: { pelvis: [[0, .505, -.004], [.088, .058, .062]], glute: [[.04, .475, -.034], [.05, .055, .042]], abd: [[0, .545, .014], [.082, .055, .06]],
        waist: [[0, .6, .004], [.083, .055, .062]], rib: [[0, .67, -.002], [.088, .078, .064]],
        back: [[0, .715, -.034], [.084, .06, .04]], trap: [[0, .775, -.02], [.065, .026, .045]], delt: [[.1, .758, -.008], [.03, .042, .036]] } },
    toddler: { hh: .2, neckR: .036, hand: .1, armR: [.032, .026, .026, .021], legR: [.066, .045, .046, .03],
      j: { hips: [0, .45, -.004], spine: [0, .52, -.01], chest: [0, .6, -.012], neck: [0, .765, -.016], head: [0, .805, -.008],
        shoulder: [.022, .735, .004], upperArm: [.104, .73, -.008], foreArm: [.12, .6, -.014], hand: [.126, .487, .006],
        thigh: [.058, .412, .002], shin: [.06, .215, .006], foot: [.062, .05, -.01] },
      torso: { pelvis: [[0, .425, -.004], [.1, .065, .072]], glute: [[.045, .4, -.036], [.058, .06, .05]], abd: [[0, .5, .02], [.1, .085, .085]],
        waist: [[0, .55, .01], [.098, .06, .078]], rib: [[0, .615, 0], [.1, .075, .075]],
        back: [[0, .65, -.03], [.094, .06, .05]], trap: [[0, .715, -.016], [.075, .03, .05]], delt: [[.108, .715, -.006], [.036, .044, .04]] } },
  };
  // 顔 (頭の高さ hh 比, 頭の中心が原点, 顔は +Z)。cheek は頬骨 (顔の面に沿って回した楕円), muzzle は口元 (上あご) のふくらみ
  const FACES = {
    man: { cran: [[0, .07, -.05], [.355, .42, .44]], face: [[0, -.02, .1], [.32, .34, .33]], jaw: [[0, -.24, .08], [.29, .2, .3]], gon: [[.235, -.245, -.04], [.075, .11, .1]],
      chin: [[0, -.405, .24], [.12, .072, .08]], cheek: [[.215, -.05, .28], [.1, .07, .052]], muzzle: [[0, -.2, .27], [.14, .115, .13]], brow: [[0, .115, .3], [.27, .05, .09]],
      eye: [.135, .015, .3, .062], socket: [[.135, .015, .345], [.075, .05, .06]], nose: [[0, .08, .355], [0, -.125, .45], .026, .04], tip: [[0, -.138, .455], [.041, .038, .04]],
      ala: [[.046, -.162, .405], [.032, .026, .03]], nostril: [[.022, -.184, .433], [.012, .008, .019]], ulip: [[0, -.236, .385], [.095, .024, .034]], llip: [[0, -.281, .376], [.082, .027, .034]],
      mouth: -.259, ear: [[.355, -.03, -.03], [.045, .13, .085]], browT: .013, iris: .5, lip: [.1, .36, .32] },
    woman: { cran: [[0, .07, -.05], [.34, .42, .43]], face: [[0, -.02, .1], [.3, .33, .32]], jaw: [[0, -.23, .08], [.25, .19, .28]], gon: [[.205, -.23, -.03], [.06, .09, .09]],
      chin: [[0, -.395, .23], [.088, .065, .07]], cheek: [[.205, -.06, .272], [.1, .075, .05]], muzzle: [[0, -.2, .265], [.13, .11, .125]], brow: [[0, .11, .29], [.26, .04, .08]],
      eye: [.132, .012, .3, .062], socket: [[.132, .012, .345], [.072, .05, .058]], nose: [[0, .07, .35], [0, -.115, .435], .022, .035], tip: [[0, -.128, .44], [.037, .034, .036]],
      ala: [[.041, -.152, .395], [.029, .024, .027]], nostril: [[.02, -.171, .421], [.011, .007, .017]], ulip: [[0, -.232, .383], [.09, .026, .036]], llip: [[0, -.278, .374], [.08, .03, .036]],
      mouth: -.256, ear: [[.34, -.03, -.03], [.04, .12, .08]], browT: .009, iris: .52, lip: [.14, .52, .44] },
    child: { cran: [[0, .08, -.04], [.37, .44, .44]], face: [[0, -.06, .1], [.31, .3, .32]], jaw: [[0, -.22, .07], [.25, .18, .27]], gon: [[.2, -.2, -.02], [.06, .08, .08]],
      chin: [[0, -.37, .2], [.085, .06, .07]], cheek: [[.2, -.13, .26], [.12, .1, .075]], muzzle: [[0, -.2, .25], [.12, .095, .12]], brow: [[0, .07, .29], [.26, .035, .07]],
      eye: [.145, -.02, .29, .07], socket: [[.145, -.02, .33], [.08, .058, .06]], nose: [[0, .02, .34], [0, -.125, .4], .02, .028], tip: [[0, -.13, .405], [.031, .029, .03]],
      ala: [[.034, -.148, .37], [.025, .02, .023]], nostril: [[.017, -.161, .39], [.009, .006, .013]], ulip: [[0, -.212, .349], [.074, .02, .033]], llip: [[0, -.248, .343], [.065, .023, .033]],
      mouth: -.232, ear: [[.37, -.05, -.03], [.04, .12, .08]], browT: .0075, iris: .56, lip: [.1, .36, .32] },
    toddler: { cran: [[0, .1, -.03], [.39, .44, .44]], face: [[0, -.08, .1], [.32, .3, .32]], jaw: [[0, -.22, .06], [.26, .17, .27]], gon: [[.21, -.2, -.01], [.06, .08, .08]],
      chin: [[0, -.36, .19], [.08, .055, .065]], cheek: [[.205, -.16, .25], [.13, .11, .085]], muzzle: [[0, -.2, .24], [.115, .09, .11]], brow: [[0, .04, .28], [.25, .03, .06]],
      eye: [.15, -.05, .285, .074], socket: [[.15, -.05, .32], [.085, .062, .06]], nose: [[0, -.02, .33], [0, -.135, .385], .016, .024], tip: [[0, -.14, .39], [.028, .025, .026]],
      ala: [[.03, -.152, .358], [.022, .018, .02]], nostril: null, ulip: [[0, -.212, .339], [.066, .019, .031]], llip: [[0, -.245, .333], [.058, .022, .031]],
      mouth: -.23, ear: [[.385, -.07, -.03], [.04, .115, .075]], browT: .0065, iris: .6, lip: [.08, .3, .26] },
  };

  // ---------------------------------------------------------------- 骨格 (関節位置) と体の形
  const ARM_OUT = .12;
  function rig(T, h) {
    const J = {};
    const put = (name, p) => { J[name] = [p[0] * h, p[1] * h, p[2] * h]; };
    ['hips', 'spine', 'chest', 'neck', 'head'].forEach(n => put(n, T.j[n]));
    [['L', 1], ['R', -1]].forEach(([sd, s]) => ['shoulder', 'upperArm', 'foreArm', 'hand', 'thigh', 'shin', 'foot'].forEach(n => { const p = T.j[n]; put(n + sd, [p[0] * s, p[1], p[2]]); }));
    // 形を作る姿勢 (bind) では腕を ARM_OUT だけ外へ開き, 手と腰の間をあける (服や肌が腕と腰でつながらない)。立ち姿勢で戻す
    [['L', 1], ['R', -1]].forEach(([sd, s]) => {
      const o = J['upperArm' + sd], c = Math.cos(ARM_OUT), sn = Math.sin(ARM_OUT) * s;
      ['foreArm', 'hand'].forEach(n => { const p = J[n + sd], dx = p[0] - o[0], dy = p[1] - o[1]; J[n + sd] = [o[0] + dx * c - dy * sn, o[1] + dx * sn + dy * c, p[2]]; });
    });
    const hh = T.hh * h, HC = [0, h - hh * 0.5, J.head[2] + 0.004 * h];
    // 手の座標系 (左手): 局所 -Y = 前腕の向き, 局所 +X = 外側 (手の甲), +Z = 親指側。手のひらはやや後ろへひねる
    const d = _nrm(_sub(J.handL, J.foreArmL)), yA = _mul(d, -1);
    const xA = _nrm([yA[1], -yA[0], 0]);                                                  // y × (0,0,1)
    const zA = [xA[1] * yA[2] - xA[2] * yA[1], xA[2] * yA[0] - xA[0] * yA[2], xA[0] * yA[1] - xA[1] * yA[0]];
    const tw = 0.28, xT = _add(_mul(xA, Math.cos(tw)), _mul(zA, Math.sin(tw))), zT = _add(_mul(zA, Math.cos(tw)), _mul(xA, -Math.sin(tw)));
    const handR = frameR(xT, yA, zT);
    return { J, hh, HC, handR, neckCut: h - hh * 0.93, s: T.hand * h / 0.185 };
  }
  // 体 (首〜足) の形。返り値 { list: SDF 項目, own: 重み用の (形, ボーン) }
  function bodyShape(T, h, R) {
    const J = R.J, own = [], tor = T.torso, L = [];
    const parts = { torso: [], pelvis: [], upperArm: { L: [], R: [] }, foreArm: { L: [], R: [] }, thigh: { L: [], R: [] }, shin: { L: [], R: [] }, foot: { L: [], R: [] } };
    const E = (cr, s = 1, rot) => sdEll([cr[0][0] * h * s, cr[0][1] * h, cr[0][2] * h], cr[1].map(v => v * h), rot);
    const add = (list, p, k, bone, reg) => { const it = A(p, k, BI[bone]); list.push(it); own.push({ f: p.f, bs: p.bs, bone: BI[bone] }); if (reg) reg.forEach(r => r.push(it)); return it; };
    add(L, E(tor.pelvis), .03 * h, 'hips', [parts.torso, parts.pelvis]);
    [1, -1].forEach(s => add(L, E(tor.glute, s), .02 * h, 'hips', [parts.torso, parts.pelvis]));
    add(L, E(tor.abd), .03 * h, 'hips', [parts.torso, parts.pelvis]);
    add(L, E(tor.waist), .035 * h, 'spine', [parts.torso]);
    add(L, E(tor.rib), .035 * h, 'chest', [parts.torso]);
    if (tor.pec) [1, -1].forEach(s => add(L, E(tor.pec, s, [0, s * 0.15, 0]), .02 * h, 'chest', [parts.torso]));
    if (tor.bust) [1, -1].forEach(s => add(L, E(tor.bust, s, [-0.25, s * 0.2, 0]), .025 * h, 'chest', [parts.torso]));
    add(L, E(tor.back), .03 * h, 'chest', [parts.torso]);
    add(L, E(tor.trap), .035 * h, 'chest', [parts.torso]);
    const nk = neckCone(T, h, J, 0);
    add(L, nk, .02 * h, 'neck');
    const sc = T.legR[0] / .053, ac = T.armR[0] / .029;
    [['L', 1], ['R', -1]].forEach(([sd, s]) => {
      const sh = J['upperArm' + sd], el = J['foreArm' + sd], wr = J['hand' + sd], arm = [], UA = [parts.upperArm[sd]], FA = [parts.foreArm[sd]];
      add(arm, E(tor.delt, s), 0, 'upperArm' + sd, UA);
      add(arm, sdCone(sh, el, T.armR[0] * h, T.armR[1] * h), .015 * h, 'upperArm' + sd, UA);
      add(arm, sdEll(_add(_lerp(sh, el, .5), [0, 0, .008 * h]), [.023 * h * ac, .055 * h, .024 * h * ac]), .015 * h, 'upperArm' + sd, UA);
      add(arm, sdEll(_add(_lerp(sh, el, .42), [0, 0, -.01 * h]), [.023 * h * ac, .06 * h, .022 * h * ac]), .015 * h, 'upperArm' + sd, UA);
      add(arm, sdCone(el, wr, T.armR[2] * h, T.armR[3] * h), .012 * h, 'foreArm' + sd, FA);
      add(arm, sdEll(_lerp(el, wr, .22), [.022 * h * ac, .05 * h, .021 * h * ac]), .015 * h, 'foreArm' + sd, FA);
      // 手首 (手のメッシュと同じ楕円) と手首の切断面
      const HR = s > 0 ? R.handR : mirR(R.handR);
      add(arm, xform(wristEll(R.s), HR, wr), .006 * h, 'foreArm' + sd, FA);
      arm.push(I(sdPlane(_add(wr, _apR(HR, [0, -.004 * R.s, 0])), _apR(HR, [0, -1, 0]))));
      L.push({ list: arm, op: 'add', k: .016 * h });
      const hp = J['thigh' + sd], kn = J['shin' + sd], an = J['foot' + sd], leg = [], TH = [parts.thigh[sd]], SH = [parts.shin[sd]], FT = [parts.foot[sd]];
      add(leg, sdCone(hp, kn, T.legR[0] * h, T.legR[1] * h), .02 * h, 'thigh' + sd, TH);
      add(leg, sdEll(_add(_lerp(hp, kn, .42), [s * .004 * h, 0, .012 * h]), [.044 * h * sc, .1 * h, .04 * h * sc]), .03 * h, 'thigh' + sd, TH);
      add(leg, sdEll(_add(_lerp(hp, kn, .3), [-s * .014 * h, 0, -.006 * h]), [.034 * h * sc, .08 * h, .034 * h * sc]), .03 * h, 'thigh' + sd, TH);
      add(leg, sdEll(_add(kn, [0, 0, .008 * h]), [.032 * h * sc, .034 * h, .031 * h * sc]), .015 * h, 'shin' + sd, SH);
      add(leg, sdCone(kn, an, T.legR[2] * h, T.legR[3] * h), .015 * h, 'shin' + sd, SH);
      add(leg, sdEll(_add(_lerp(kn, an, .27), [0, 0, -.013 * h]), [.03 * h * sc, .066 * h, .029 * h * sc]), .02 * h, 'shin' + sd, SH);
      add(leg, sdEll(an, [.019 * h, .02 * h, .021 * h]), .012 * h, 'foot' + sd, FT);
      add(leg, sdCone(an, [an[0] + s * .002 * h, .011 * h, an[2] + .095 * h], .019 * h, .0105 * h), .012 * h, 'foot' + sd, FT);
      add(leg, sdEll([an[0], .017 * h, an[2] - .018 * h], [.019 * h, .017 * h, .024 * h]), .012 * h, 'foot' + sd, FT);
      L.push({ list: leg, op: 'add', k: .02 * h });
    });
    L.push(I(sdPlane([0, R.neckCut, 0], [0, 1, 0])));
    return { list: L, own, parts };
  }
  // 首 (体側・頭側で同じ形)。頭側は首の付け根へ向かってわずかに細くし, 体の切り口を覆いつつ下端は体の内側に隠れるようにする
  function neckCone(T, h, J, taper, R) {
    const c = sdCone([0, J.neck[1] - .03 * h, J.neck[2]], [0, J.head[1] + .012 * h, J.head[2] + .006 * h], T.neckR * h * 1.08, T.neckR * h);
    if (!taper) return c;
    const y0 = R.neckCut - .012 * h, y1 = R.neckCut - .002 * h, f0 = c.f;
    return { f: (x, y, z) => f0(x, y, z) - (-.0005 + .001 * _ss(y, y0, y1)), bs: c.bs };
  }
  const mirR = R => [R[0], -R[1], -R[2], -R[3], R[4], R[5], -R[6], R[7], R[8]];   // X 反転した座標系 (右手)
  const wristEll = s => sdEll([0, .004 * s, 0], [.0155 * s, .017 * s, .0205 * s]);
  // 関節 (重みの配分)
  function joints(R, h) {
    const J = R.J, out = [];
    const jt = (p, c, at, dir, L, Rr) => out.push({ p: BI[p], c: BI[c], at, dir: _nrm(dir), L: L * h, R: Rr ? Rr * h : 0 });
    jt('hips', 'spine', J.spine, [0, 1, 0], .035, 0);
    jt('spine', 'chest', J.chest, [0, 1, 0], .04, 0);
    jt('chest', 'neck', J.neck, [0, 1, 0], .02, .09);
    jt('neck', 'head', J.head, [0, 1, 0], .018, 0);
    [['L', 1], ['R', -1]].forEach(([sd, s]) => {
      jt('chest', 'shoulder' + sd, J['shoulder' + sd], [s, 0, 0], .03, .09);
      jt('shoulder' + sd, 'upperArm' + sd, J['upperArm' + sd], _sub(J['foreArm' + sd], J['upperArm' + sd]), .035, .1);
      jt('upperArm' + sd, 'foreArm' + sd, J['foreArm' + sd], _sub(J['hand' + sd], J['foreArm' + sd]), .025, 0);
      jt('foreArm' + sd, 'hand' + sd, J['hand' + sd], _sub(J['hand' + sd], J['foreArm' + sd]), .012, 0);
      jt('hips', 'thigh' + sd, J['thigh' + sd], _sub(J['shin' + sd], J['thigh' + sd]), .04, .12);
      jt('thigh' + sd, 'shin' + sd, J['shin' + sd], _sub(J['foot' + sd], J['shin' + sd]), .03, 0);
      jt('shin' + sd, 'foot' + sd, J['foot' + sd], [0, -0.5, 1], .015, 0);
    });
    return out;
  }
  // 頭 (顔・耳・首の上部)
  function headShape(T, F, h, R) {
    const hh = R.hh, HC = R.HC, own = [], L = [];
    const P = p => [p[0] * hh, HC[1] + p[1] * hh, HC[2] + p[2] * hh], Rr = r => r.map(v => v * hh);
    const E = (cr, s = 1, rot) => sdEll(P([cr[0][0] * s, cr[0][1], cr[0][2]]), Rr(cr[1]), rot);
    const add = (p, k, bone = 'head') => { L.push(A(p, k, BI[bone])); own.push({ f: p.f, bs: p.bs, bone: BI[bone] }); };
    add(E(F.cran), 0); add(E(F.face), .1 * hh); add(E(F.jaw), .1 * hh);
    [1, -1].forEach(s => add(E(F.gon, s), .07 * hh));
    add(E(F.chin), .06 * hh);
    [1, -1].forEach(s => add(E(F.cheek, s, [0, s * .75, 0]), .07 * hh));
    add(E(F.muzzle), .09 * hh);                                                   // 口元のふくらみ (上あご)
    add(E(F.brow), .05 * hh);
    [1, -1].forEach(s => L.push(S(E(F.socket, s), .035 * hh)));
    add(sdCone(P(F.nose[0]), P(F.nose[1]), F.nose[2] * hh, F.nose[3] * hh), .025 * hh);
    add(E(F.tip), .02 * hh);
    [1, -1].forEach(s => add(E(F.ala, s), .02 * hh));
    if (F.nostril) [1, -1].forEach(s => L.push(S(E(F.nostril, s), .006 * hh)));
    const ul = E(F.ulip), ll = E(F.llip);
    add(ul, .025 * hh); add(ll, .02 * hh);
    L.push(S(sdEll(P([0, F.mouth, F.ulip[0][2] + .04]), Rr([F.ulip[1][0] * .85, .0025, .03])), .003 * hh));
    [1, -1].forEach(s => { add(E(F.ear, s, [0, s * 0.3, 0]), .03 * hh); L.push(S(sdEll(P([F.ear[0][0] * s * 1.08, F.ear[0][1] - .01, F.ear[0][2] + .02]), Rr([.022, .07, .045]), [0, s * 0.3, 0]), .01 * hh)); });
    add(neckCone(T, h, R.J, 1, R), .08 * hh, 'neck');
    L.push(I(sdPlane([0, R.neckCut - .012 * h, 0], [0, -1, 0])));
    return { list: L, own, lips: [ul, ll] };
  }
  // 手 (左手の局所座標: 手首が原点, 指は -Y, 手のひらは -X (体側), 親指は +Z)
  function handShape(T, h, R, o = 0, cuff = .022) {
    const s = R.s, L = [], own = [];
    const add = (p, k, bone) => { L.push(A(p, k, BI[bone])); own.push({ f: p.f, bs: p.bs, bone: BI[bone] }); };
    const fLen = Math.hypot(...(_sub(R.J.foreArmL, R.J.handL)));
    const tp = pr => (o > 0 ? { f: (x, y, z) => pr.f(x, y, z) - o, bs: pr.bs } : { f: (x, y, z) => pr.f(x, y, z) - (.0005 - .001 * _ss(y, -.002 * s, .02 * s)), bs: pr.bs });   // 体の手首の切り口を覆い, 上端は前腕の内側へ
    add(tp(wristEll(s)), 0, 'foreArmL');
    add(tp(sdCone([0, fLen, 0], [0, 0, 0], T.armR[2] * h, T.armR[3] * h)), .006 * s, 'foreArmL');
    add(sdBox([0, -.052 * s, .002 * s], [.004 * s + o, .04 * s, .0325 * s + o], .01 * s), .012 * s, 'handL');
    add(sdEll([-.006 * s, -.036 * s, .028 * s], [.013 * s + o, .028 * s, .019 * s + o]), .01 * s, 'handL');
    add(sdEll([-.004 * s, -.06 * s, -.03 * s], [.011 * s + o, .032 * s, .012 * s + o]), .008 * s, 'handL');
    const FG = [{ z: .03, len: [.043, .025, .02], r: .0092, sp: .07 }, { z: .01, len: [.047, .029, .021], r: .0095, sp: .0 }, { z: -.01, len: [.044, .027, .021], r: .009, sp: -.06 }, { z: -.028, len: [.035, .021, .018], r: .0079, sp: -.13 }];
    const curl = [.18, .4, .26];
    FG.forEach(fg => {
      let p = [-.001 * s, -.09 * s, fg.z * s], ang = 0, r = fg.r * s;
      for (let k = 0; k < 3; k++) {
        ang += curl[k];
        const q = _add(p, _mul(_nrm([-Math.sin(ang), -Math.cos(ang), fg.sp * (1 - k * 0.3)]), fg.len[k] * s)), r2 = r * (k === 2 ? 0.84 : 0.92);
        add(sdCone(p, q, r + o, r2 + o), .004 * s, 'handL'); p = q; r = r2;
      }
    });
    const th = [[-.006, -.02, .028], [-.016, -.048, .047], [-.024, -.072, .055], [-.029, -.09, .057]].map(p => _mul(p, s)), tr = [.0125, .011, .0098, .0083].map(v => v * s);
    for (let k = 0; k < 3; k++) add(sdCone(th[k], th[k + 1], tr[k] + o, tr[k + 1] + o), .006 * s, 'handL');
    L.push(I(sdPlane([0, cuff * s, 0], [0, 1, 0])));
    return { list: L, own };
  }
  // ---------------------------------------------------------------- 髪
  // 頭の近似 (頭蓋 + 顔の上部 + 眉弓)。髪はこの面から外へ厚みを持たせ, 生え際では厚みを 0 → 負にして頭の中へ沈める (縁が立たない)
  function headProxy(F, R) {
    const hh = R.hh, HC = R.HC, E = cr => sdEll([cr[0][0] * hh, HC[1] + cr[0][1] * hh, HC[2] + cr[0][2] * hh], cr[1].map(v => v * hh));
    return compile([A(E(F.cran)), A(E(F.face), .1 * hh), A(E(F.brow), .05 * hh)]).f;
  }
  // 方位 (頭頂から見て 0 = 正面, +90° = 人物の左, ±180° = 後ろ) ごとの値を滑らかにつなぐ。sym: 左右対称 (0〜180° だけ与える)
  function ringFn(pts, sym) {
    const P = pts.map(([d, v]) => [d * Math.PI / 180, v]);
    return a => {
      const x = sym ? Math.abs(a) : a;
      if (x <= P[0][0]) return P[0][1];
      for (let i = 0; i < P.length - 1; i++) if (x <= P[i + 1][0]) { const t = (x - P[i][0]) / (P[i + 1][0] - P[i][0]); return P[i][1] + (P[i + 1][1] - P[i][1]) * t * t * (3 - 2 * t); }
      return P[P.length - 1][1];
    };
  }
  // 髪型: line = 生え際の高さ (方位ごと, 頭の高さ比), jag = 前髪の毛先のギザギザ, soft = 生え際のぼかし幅, thick = 厚み,
  //       part = 分け目 [位置, 深さ, 幅], crown = つむじ (毛束の溝はここから放射状), groove = [本数, 深さ]
  const HAIR = {
    biz: { // 大人の短髪 (七三分け, 襟足は刈り上げ気味)
      line: [[0, .33], [22, .3], [40, .22], [55, .13], [66, .03], [74, -.09], [80, -.1], [85, .06], [93, .12], [106, .13], [118, .04], [128, -.14], [145, -.27], [165, -.33], [180, -.35]], sym: true,
      soft: .022, eps: .006, part: [-.13, .013, .016], crown: [-.03, .33, -.22], groove: [30, .0075],
      thick: (u, v, w) => (.016 + .03 * _ss(v, 0, .32) + .016 * _ss(w, .1, .35) * _ss(v, .18, .36) + .012 * Math.exp(-(((u + .06) / .08) ** 2)) * _ss(v, .22, .4) * _ss(w, -.15, .2)) * (1 - .45 * _ss(-v, .05, .3) * _ss(-w, 0, .2)) },
    kid: { // 小学生男子 (前髪は毛束が分かれたナチュラルショート)
      line: [[0, .17], [15, .18], [30, .16], [45, .13], [58, .08], [68, .02], [76, -.04], [82, .05], [90, .12], [105, .13], [120, .02], [138, -.18], [160, -.28], [180, -.31]], sym: true,
      jag: a => Math.abs(a) < .95 ? .028 * (.5 + .5 * Math.cos(a * 22 + .4 + .8 * Math.sin(a * 7))) * _ss(.95 - Math.abs(a), 0, .3) : 0,
      soft: .018, eps: .006, crown: [.02, .36, -.2], groove: [26, .01],
      thick: (u, v, w) => (.022 + .026 * _ss(v, .05, .35) + .01 * _ss(w, .1, .3) * _ss(v, .1, .3)) * (1 - .4 * _ss(-v, .05, .28) * _ss(-w, 0, .2)) },
    baby: { // 幼児 (柔らかい細い髪)
      line: [[0, .2], [25, .2], [45, .16], [62, .1], [75, .05], [85, .1], [100, .12], [118, .04], [138, -.14], [160, -.22], [180, -.25]], sym: true,
      jag: a => Math.abs(a) < .8 ? .025 * (.5 + .5 * Math.cos(a * 12)) : 0,
      soft: .03, eps: .006, crown: [0, .38, -.18], groove: [22, .006],
      thick: (u, v) => .016 + .018 * _ss(v, .1, .42) },
    long: { // 大人の女性 (肩下のロング, 左で分けて額を出す)
      line: [[0, .3], [18, .29], [36, .24], [58, .13], [82, .02], [100, -.06], [120, -.25], [150, -.42], [180, -.5]], sym: true,
      soft: .02, eps: .006, part: [.12, .011, .014], crown: [.06, .3, -.12], groove: [40, .007],
      thick: (u, v) => .022 + .022 * _ss(v, .1, .42) },
    twin: { // 小学生女子 (ぱっつん前髪 + 耳の後ろで結んだツインテール, 後ろは中央で分ける)
      line: [[0, .1], [20, .1], [35, .085], [50, .065], [62, .05], [72, .06], [84, .13], [100, .14], [118, .05], [135, -.12], [160, -.25], [180, -.3]], sym: true,
      soft: a => Math.abs(a) < .8 ? .01 : .022, eps: .006, backPart: [.012, .012], crown: [0, .36, -.2], groove: [28, .008],
      thick: (u, v) => .02 + .022 * _ss(v, .1, .4),
      tails: [[.36, -.02, -.2, .07], [.44, -.2, -.26, .085], [.45, -.45, -.26, .075], [.41, -.7, -.22, .045], [.37, -.84, -.19, .012]] },
  };
  // 髪の距離場。o.torso: 体 (肩・背中) の距離場 (長い髪をそわせる), o.cut: 取り除く領域 (保護帽の内側など)
  function hairShape(style, kind, F, h, R, o = {}) {
    const hh = R.hh, HC = R.HC, S = HAIR[style] || HAIR.biz, base = headProxy(F, R);
    const line = ringFn(S.line, S.sym), jag = S.jag || (() => 0), soft = typeof S.soft === 'function' ? S.soft : () => S.soft;
    const [gN, gA] = S.groove, cr = S.crown;
    const P = p => [p[0] * hh, HC[1] + p[1] * hh, HC[2] + p[2] * hh];
    const shell = (x, y, z) => {
      const u = x / hh, v = (y - HC[1]) / hh, w = (z - HC[2]) / hh, a = Math.atan2(u, w), l = line(a) + jag(a), sf = soft(a);
      const m = _ss(v - l, -sf, sf);
      let d = base(x, y, z) - (S.thick(u, v, w) * m - S.eps) * hh;
      if (S.part) d += S.part[1] * hh * Math.exp(-(((u - S.part[0]) / S.part[2]) ** 2)) * _ss(v, .2, .38) * _ss(w, -.2, -.05);
      if (S.backPart) d += S.backPart[0] * hh * Math.exp(-((u / S.backPart[1]) ** 2)) * _ss(-w, .05, .15) * _ss(v, -.3, -.1);
      const du = u - cr[0], dw = w - cr[2], rr = Math.hypot(du, dw, (v - cr[1]) * .5), ga = Math.atan2(du, dw);
      const ph = gN * ga + 1.7 * Math.sin(3 * ga) + .8 * Math.sin(5.3 * ga + 1.1);
      d += gA * hh * m * (.5 - .5 * Math.cos(ph)) * (.65 + .35 * Math.sin(2.3 * ga + .7)) * _ss(rr, .04, .16);
      return smax(d, (l - 3 * sf - .02 - v) * hh, .01 * hh);                                  // 生え際より下 (頭の中) は切り落とす
    };
    let extra = null, ties = [];
    if (style === 'long') {
      const back = sdBox(P([0, -.5, -.24]), [.26 * hh, .5 * hh, .11 * hh], .1 * hh);
      const sides = [1, -1].map(s => sdCone(P([s * .3, .02, -.03]), P([s * .3, -.9, -.1]), .1 * hh, .06 * hh));
      const face = sdEll(P([0, -.33, .42]), [.3 * hh, .56 * hh, .26 * hh]);
      extra = (x, y, z) => {
        const u = x / hh, v = (y - HC[1]) / hh, w = (z - HC[2]) / hh;
        let d = smin(back.f(x, y, z), smin(sides[0].f(x, y, z), sides[1].f(x, y, z), .08 * hh), .1 * hh);
        d += .02 * hh * _ss(-v, .65, 1.0);                                                     // 毛先へ向けて薄く
        const ga = Math.atan2(u, w + .05);
        d += .008 * hh * (.5 - .5 * Math.cos(44 * ga + 1.5 * Math.sin(4 * ga))) * _ss(-v, .1, .3);   // 縦の毛束
        d = smax(d, -face.f(x, y, z), .04 * hh);                                               // 顔の前は空ける
        d = smax(d, (-1.0 + .14 * (u / .3) ** 2 - v) * hh, .02 * hh);                          // 裾 (横は少し短く)
        return d;
      };
    } else if (style === 'twin') {
      const T2 = [1, -1].map(s => S.tails.map(t => [s * t[0], t[1], t[2], t[3]]));
      const cones = T2.map(ch => ch.slice(1).map((t, i) => sdCone(P(ch[i]), P(t), ch[i][3] * hh, t[3] * hh)));
      extra = (x, y, z) => {
        const u = x / hh, v = (y - HC[1]) / hh, w = (z - HC[2]) / hh;
        let d = 1e3;
        T2.forEach((ch, si) => {
          let e = 1e3; cones[si].forEach(c => { e = smin(e, c.f(x, y, z), .04 * hh); });
          // 毛束の溝 (房の中心からの方位)
          let k = 0; while (k < ch.length - 2 && v < ch[k + 1][1]) k++;
          const t = Math.min(Math.max((v - ch[k][1]) / (ch[k + 1][1] - ch[k][1]), 0), 1), xc = ch[k][0] + (ch[k + 1][0] - ch[k][0]) * t, zc = ch[k][2] + (ch[k + 1][2] - ch[k][2]) * t;
          const ga = Math.atan2(u - xc, w - zc);
          e += .01 * hh * (.5 - .5 * Math.cos(9 * ga + 1.3 * Math.sin(2 * ga))) * _ss(-v, -.1, .1);
          d = Math.min(d, e);
        });
        return d;
      };
      ties = T2.map(ch => ({ c: P(_lerp(ch[0], ch[1], .3)), axis: _nrm(_sub(P(ch[1]), P(ch[0]))), r: (ch[0][3] * .7 + ch[1][3] * .3) * hh }));
    }
    const tor = o.torso, cut = o.cut;
    const f = (x, y, z) => {
      let d = shell(x, y, z);
      if (extra) { let e = extra(x, y, z); if (tor && e < .05 * hh) e = smax(e, -(tor(x, y, z) - .004 * h / 1.6), .008 * hh); d = smin(d, e, .05 * hh); }
      if (cut) d = smax(d, -cut(x, y, z), .004 * hh);
      return d;
    };
    const bx = style === 'long' ? [-.5, -1.1, -.5, .5, .62, .56] : style === 'twin' ? [-.62, -.95, -.55, .62, .62, .56] : [-.5, -.62, -.6, .5, .62, .56];
    const box = [bx[0] * hh, HC[1] + bx[1] * hh, HC[2] + bx[2] * hh, bx[3] * hh, HC[1] + bx[4] * hh, HC[2] + bx[5] * hh];
    // 重み: 長い髪の下側は胸に付けて (頭を動かしても背中から離れない), それ以外は頭
    const weights = style === 'long' ? (x, y) => { const t = _ss((y - HC[1]) / hh, -.75, -.3); return t > .999 ? [BI.head, 1, 0, 0, 0, 0, 0, 0] : [BI.head, t, BI.chest, 1 - t, 0, 0, 0, 0]; } : rigid('head');
    // 生え際の濃さ (1 = 髪の中, 0 = 生え際の外)。描画で生え際を少しずつ透かす
    const mask = (x, y, z) => { const u = x / hh, v = (y - HC[1]) / hh, w = (z - HC[2]) / hh, a = Math.atan2(u, w), sf = soft(a); return _ss(v - line(a) - jag(a), -sf * .35, sf * .7); };
    const alpha = (x, y, z) => (extra && extra(x, y, z) < shell(x, y, z) + .002 * hh ? 1 : mask(x, y, z));
    return { f, box, ties, weights, alpha };
  }

  // ---------------------------------------------------------------- テクスチャ
  let _texCache = {};
  function eyeTexture(iris) {
    const key = 'eye' + iris; if (_texCache[key]) return _texCache[key];
    const W = 256, Hh = 128, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
    const g = cv.getContext('2d');
    g.fillStyle = '#f4f1ec'; g.fillRect(0, 0, W, Hh);
    const ri = 26, rp = 10;                                                    // 虹彩・瞳孔 (行)
    const grd = g.createLinearGradient(0, 0, 0, ri + 2);
    grd.addColorStop(0, '#1a120e'); grd.addColorStop(rp / (ri + 2), '#1a120e'); grd.addColorStop(rp / (ri + 2) + 0.02, iris); grd.addColorStop(0.92, shade(iris, 0.7)); grd.addColorStop(1, '#2a1d17');
    g.fillStyle = grd; g.fillRect(0, 0, W, ri + 2);
    for (let i = 0; i < 90; i++) { const x = (i * 37) % W; g.fillStyle = `rgba(0,0,0,${0.08 + (i % 5) * 0.03})`; g.fillRect(x, rp + 1, 1.2, ri - rp - 2); }
    g.fillStyle = 'rgba(214,150,140,0.18)'; g.fillRect(0, Hh * 0.5, W, Hh * 0.5);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return (_texCache[key] = t);
  }
  function hairTexture() {
    if (_texCache.hair) return _texCache.hair;
    const W = 256, Hh = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
    const g = cv.getContext('2d');
    g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, W, Hh);
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 900; i++) {
      const x = rnd() * W, y = rnd() * Hh, len = 30 + rnd() * 90, l = rnd();
      g.strokeStyle = l < 0.5 ? `rgba(0,0,0,${0.12 + rnd() * 0.2})` : `rgba(255,255,255,${0.1 + rnd() * 0.18})`;
      g.lineWidth = 0.6 + rnd() * 1.1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rnd() - 0.5) * 6, y + len); g.stroke();
    }
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return (_texCache.hair = t);
  }
  function canvasTex(key, W, H, draw, { repeat = true, srgb = true } = {}) {
    if (_texCache[key]) return _texCache[key];
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; draw(cv.getContext('2d'), W, H);
    const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
    return (_texCache[key] = t);
  }
  const _rnd = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // 布・革の凹凸 (グレースケールの bumpMap): knit 天竺 / twill 綾織り / weave 平織り / rib リブ / leather しぼ / mesh メッシュ
  function fabricTex(kind) {
    return canvasTex('fab_' + kind, 128, 128, (g, W, H) => {
      const r = _rnd(kind.length * 977 + 13);
      g.fillStyle = '#808080'; g.fillRect(0, 0, W, H);
      if (kind === 'knit') {
        for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) {
          g.strokeStyle = `rgba(255,255,255,${.35 + r() * .2})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y + 3.5); g.lineTo(x + 4, y); g.stroke();
          g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 1.5, y + 3.5, 1, .8);
        }
      } else if (kind === 'twill') {
        g.lineWidth = 2;
        for (let i = -H; i < W + H; i += 4) { g.strokeStyle = `rgba(255,255,255,${.3 + r() * .15})`; g.beginPath(); g.moveTo(i, H); g.lineTo(i + H, 0); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.moveTo(i + 2, H); g.lineTo(i + 2 + H, 0); g.stroke(); }
      } else if (kind === 'weave') {
        for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) { const o = ((x + y) / 4) % 2; g.fillStyle = o ? `rgba(255,255,255,${.25 + r() * .1})` : `rgba(0,0,0,${.2 + r() * .1})`; g.fillRect(x, y, 4, 4); }
      } else if (kind === 'rib') {
        for (let x = 0; x < W; x += 4) { g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x, 0, 2, H); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x + 2, 0, 2, H); }
      } else if (kind === 'leather') {
        for (let i = 0; i < 700; i++) { g.fillStyle = r() < .5 ? `rgba(0,0,0,${.12 + r() * .15})` : `rgba(255,255,255,${.1 + r() * .12})`; g.beginPath(); g.arc(r() * W, r() * H, .8 + r() * 2.2, 0, 7); g.fill(); }
      }
    }, { srgb: false });
  }


  // ============================================================================ 服 (体の距離場を外側へずらした布)
  // 布は体の形 + ゆとり (ease) で作り, 裾・袖口・襟ぐりは平面や円柱で切る。裾や袖口は帯状に少し厚くして縫い返しを表す
  const offs = (it, t) => ({ f: (x, y, z) => it.f(x, y, z) - t, bs: it.bs ? [it.bs[0], it.bs[1], it.bs[2], it.bs[3] + Math.abs(t)] : null });
  const cutP = (p0, n, k = 0) => I(sdPlane(p0, n), k);
  const U = (list, k = 0) => ({ list, op: 'add', k });
  function distSeg(x, y, z, a, b) {
    const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2];
    const t = Math.min(Math.max((px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz), 0), 1);
    return Math.hypot(px - bx * t, py - by * t, pz - bz * t);
  }
  // 縫い目・溝: 折れ線 (点列) のまわりを depth だけへこませる。帯: mask(x,y,z) が 1 の所を t だけ厚くする
  function detailF(f, { seams = [], bands = [], extra = null } = {}) {
    seams.forEach(s => { const m = s.w * 3; s.bb = [0, 1, 2].map(k => [Math.min(...s.pts.map(p => p[k])) - m, Math.max(...s.pts.map(p => p[k])) + m]); });
    return (x, y, z) => {
      let d = f(x, y, z);
      for (const s of seams) {
        const b = s.bb; if (x < b[0][0] || x > b[0][1] || y < b[1][0] || y > b[1][1] || z < b[2][0] || z > b[2][1]) continue;
        let q = 1e3; for (let i = 0; i < s.pts.length - 1; i++) q = Math.min(q, distSeg(x, y, z, s.pts[i], s.pts[i + 1])); if (q < s.w * 3) d += s.depth * Math.exp(-((q / s.w) ** 2));
      }
      for (const b of bands) d -= b.t * b.mask(x, y, z);
      return extra ? extra(d, x, y, z) : d;
    };
  }
  // 平面からの距離の帯 (端 p0, 向き n: 布の残る側が -n) を軸 (a→b, 半径 rMax) の近くだけに限る
  const edgeBand = (p0, n, w, axis) => (x, y, z) => {
    const s = -((x - p0[0]) * n[0] + (y - p0[1]) * n[1] + (z - p0[2]) * n[2]);
    if (s < -.002 || s > w + .004) return 0;
    if (axis && distSeg(x, y, z, axis[0], axis[1]) > axis[2]) return 0;
    return _ss(s, w + .003, w) * _ss(s, -.002, .001);
  };

  // ---------------------------------------------------------------- 上衣 (シャツ・ブラウス・T シャツ・作業着)
  // sp: ease 体からのゆとり, drape, sleeve (0〜1 上腕の割合 / 1〜2 前腕), sleeveEase, hem (身長比), neckGap, scoop [下げ, 幅, 高さ], bandT
  // 上衣の下地: 胴の筒 (首の付け根〜裾) と左右の袖の筒 (肩〜ひじ, 長袖はひじ〜手首も)
  function* topBase(C, sp) {
    const { h, J, T, B } = C, P = B.parts, e = sp.ease * h, ea = Math.min(e, .0065 * h) * (sp.kind === 'jacket' ? .8 : 1), cell = .011 * h / 1.7;
    const top = [0, J.neck[1] + .025 * h, J.neck[2]], bot = [0, sp.hem * h - .04 * h, J.hips[2]];
    const yArm = J.upperArmL[1] - .045 * h;                                                    // わきの下の高さ: これより上は肩 (三角筋) も身ごろに含める
    const torso = yield* tubeField(compile([...P.torso, ...P.thigh.L, ...P.thigh.R]).f, top, bot, { rows: Math.ceil((top[1] - bot[1]) / cell), nA: 72, ease: e, slope: sp.slope ?? .22, rMax: .28 * h,
      fd2: compile([...P.upperArm.L, ...P.upperArm.R]).f, use2: c => c[1] > yArm });
    const arms = {};
    for (const sd of ['L', 'R']) {
      const sh = J['upperArm' + sd], el = J['foreArm' + sd], wr = J['hand' + sd], dir = _nrm(_sub(el, sh));
      const a0 = _lerp(sh, el, (sh[1] - (yArm + .012 * h)) / (sh[1] - el[1])), upper = yield* tubeField(compile(P.upperArm[sd]).f, a0, el, { rows: Math.ceil(Math.hypot(..._sub(el, a0)) / cell), nA: 40, ease: ea + sp.sleeveEase * h * .4, slope: .24, rMax: .12 * h, ref: [0, 1, 0] });
      arms[sd] = { upper };
      if (sp.sleeve > 1) arms[sd].fore = yield* tubeField(compile(P.foreArm[sd]).f, _sub(el, _mul(_nrm(_sub(wr, el)), .02 * h)), wr, { rows: Math.ceil(Math.hypot(..._sub(wr, el)) / cell) + 2, nA: 36, ease: ea + sp.sleeveEase * h * .4, slope: sp.cuffTight ? .3 : .12, rMax: .1 * h, ref: [0, 1, 0] });
    }
    return { torso, arms };
  }
  function topList(C, sp, shift = 0, base = null) {
    const { h, J, T } = C, TB = base || drain(topBase(C, sp));
    const L = [A(TB.torso)], ends = [];
    ['L', 'R'].forEach(sd => {
      const sh = J['upperArm' + sd], el = J['foreArm' + sd], wr = J['hand' + sd], arm = [A(TB.arms[sd].upper)];
      let p0, n;
      if (sp.sleeve <= 1) { n = _nrm(_sub(el, sh)); p0 = _lerp(sh, el, sp.sleeve); }
      else { arm.push(A(TB.arms[sd].fore, .012 * h)); n = _nrm(_sub(wr, el)); p0 = _lerp(el, wr, sp.sleeve - 1); }
      arm.push(cutP(_sub(p0, _mul(n, shift)), n));
      L.push(U(arm, .016 * h));
      ends.push({ p0, n, axis: [sp.sleeve <= 1 ? sh : el, sp.sleeve <= 1 ? el : wr, .07 * h] });
    });
    const rn = T.neckR * h * 1.08 + sp.neckGap * h - shift, holes = [];
    holes.push(S(sdCone([0, J.neck[1] - .06 * h, J.neck[2]], [0, J.head[1] + .02 * h, J.head[2]], rn, rn)));
    if (sp.scoop) {                                                                          // 前の U 字の襟ぐり: 胸の面を急な角度で切るので縁がきれいに出る
      const yb = J.neck[1] - sp.scoop[0] * h - shift, k = (sp.scoop[0] * h * .85) / ((sp.scoop[1] * h) ** 2), z0 = J.neck[2] + T.neckR * h * .5;
      holes.push(S({ f: (x, y, z) => Math.max(yb + k * x * x - y, z0 - z, Math.abs(x) - sp.scoop[1] * h * 1.25) }, .004 * h));
    }
    const full = L.slice(); L.push(...holes);
    L.push(cutP([0, sp.hem * h + shift, 0], [0, -1, 0]));
    return { list: L, ends, rn, full, holes };
  }

  // ---------------------------------------------------------------- 下衣 (ズボン・半ズボン)
  // sp: ease, waist / hem (身長比), long (長ズボン), legEase (ひざのゆとり), hemEase, cargo
  // ズボンの下地: 腰の筒 (ウエスト〜股) + 左右の脚の筒 (股〜裾)。脚の筒は内側を体の中心の面で切り, 股下で左右が触れても溶け合わない
  function* pantsBase(C, sp) {
    const { h, J, B } = C, P = B.parts, e = sp.ease * h, cell = .011 * h / 1.7, yCr = J.thighL[1] - .045 * h;
    const seat = yield* tubeField(compile([...P.pelvis, ...P.thigh.L, ...P.thigh.R]).f, [0, sp.waist * h + .025 * h, J.hips[2]], [0, yCr - .01 * h, J.hips[2]], { rows: Math.ceil((sp.waist * h + .035 * h - yCr) / cell), nA: 72, ease: e, slope: .3, rMax: .28 * h, taper: .12 });
    const legs = {};
    for (const sd of ['L', 'R']) {
      const s = sd === 'L' ? 1 : -1, hp = J['thigh' + sd], kn = J['shin' + sd], an = J['foot' + sd];
      const t0 = (hp[1] - (yCr + .012 * h)) / (hp[1] - kn[1]), a0 = _lerp(hp, kn, t0);
      const b0 = sp.long ? [an[0] + s * .002 * h, sp.hem * h - .015 * h, an[2] + .008 * h] : [_lerp(hp, kn, .9)[0] + s * .01 * h, sp.hem * h - .015 * h, hp[2]];
      const tube = yield* tubeField(compile([...P.thigh[sd], ...P.shin[sd]]).f, a0, b0, { rows: Math.ceil((a0[1] - b0[1]) / cell), nA: 48, ease: e + sp.legEase * h * .3, slope: sp.long ? .05 : .02, grow: sp.long ? 0 : .012 * h, rMax: .18 * h });
      legs[sd] = { tube, s };
    }
    return { seat, legs };
  }
  function pantsList(C, sp, shift = 0, base = null) {
    const { h, J, T } = C, PB = base || drain(pantsBase(C, sp));
    const L = [A(PB.seat)];
    ['L', 'R'].forEach(sd => {
      const { tube, s } = PB.legs[sd], hp = J['thigh' + sd], kn = J['shin' + sd];
      const leg = [A(tube), I(sdPlane([0, 0, 0], [-s, 0, 0]))];                                  // 内側は体の中心で切る
      if (sp.cargo) {                                                                          // カーゴポケット (ふた付き)
        const ym = _lerp(hp, kn, .5)[1], zc = hp[2] + .006 * h; let xo = s * .3 * h; for (let k = 0; k < 200 && tube.f(xo, ym, zc) > 0; k++) xo -= s * Math.max(tube.f(xo, ym, zc) * .9, 3e-4);
        leg.push(A(sdBox([xo + s * .004 * h, ym, zc], [.009 * h, .05 * h, .042 * h], .006 * h), .006 * h));
        leg.push(A(sdBox([xo + s * .007 * h, ym + .052 * h, zc], [.009 * h, .012 * h, .045 * h], .004 * h), .002 * h));
      }
      L.push(U(leg, .018 * h));
    });
    L.push(cutP([0, sp.waist * h - shift, 0], [0, 1, 0]));
    L.push(cutP([0, sp.hem * h + shift, 0], [0, -1, 0]));
    return { list: L };
  }
  // 靴下 (すね〜足)。top: はき口の高さ (身長比)
  function sockList(C, sp, shift = 0) {
    const { h, B } = C, L = [];
    ['L', 'R'].forEach(sd => L.push(U([A(offs(compile([...B.parts.shin[sd], ...B.parts.foot[sd]]), .0014 * h / 1.6)), cutP([0, sp.top * h - shift, 0], [0, 1, 0])])));
    return { list: L };
  }

  // ---------------------------------------------------------------- スカート (腰から下げた布を, 高さと方位ごとの半径で張る)
  // 腰まわりの体の外形を上から順に「最大値」で下へ送ると, 布が腰やお尻から垂れ下がる形になる
  function skirtGeo(C, sp) {
    const { h, J, B } = C, yTop = sp.waist * h, yHem = sp.hem * h, zc = J.hips[2] - .01 * h, yHip = J.thighL[1] - .02 * h;
    const fb = compile([...B.parts.torso, ...B.parts.thigh.L, ...B.parts.thigh.R]).f;
    const NY = 56, NA = 128, rMax = .3 * h, th = sp.thick * h;
    const rad = new Float32Array((NY + 1) * NA), run = new Float32Array(NA);
    for (let i = 0; i <= NY; i++) {
      const t = i / NY, y = yTop + (yHem - yTop) * t;
      for (let j = 0; j < NA; j++) {
        const a = j / NA * Math.PI * 2, dx = Math.sin(a), dz = Math.cos(a);
        let r = 0;
        if (y > yHip - .06 * h) {                                                            // 体の外側の面 (外から内へ探す)
          let q = rMax, v = fb(dx * q, y, zc + dz * q);
          for (let k = 0; k < 120 && q > 0; k++) { const nq = q - Math.max(v * .9, 6e-4); const nv = fb(dx * nq, y, zc + dz * nq); if (nv <= 0) { r = nq; break; } q = nq; v = nv; }
        }
        run[j] = Math.max(run[j], r);
      }
      for (let j = 0; j < NA; j++) {                                                         // 方位方向にならす
        const a = j / NA * Math.PI * 2, r0 = (run[(j - 1 + NA) % NA] + 2 * run[j] + run[(j + 1) % NA]) / 4;
        const fl = sp.flare * h * Math.pow(Math.max(0, (yHip - y) / (yHip - yHem)), 1.3);
        let pl = 0;
        if (sp.pleats) { const s = (a * sp.pleats / (Math.PI * 2) + .5) % 1; pl = sp.pleatD * h * (s < .82 ? s / .82 : (1 - s) / .18) * _ss(yHip + .02 * h - y, 0, .08 * h); }
        if (sp.folds) pl += sp.folds[1] * h * (.5 - .5 * Math.cos(sp.folds[0] * a + .7 * Math.sin(3 * a))) * Math.pow(Math.max(0, (yHip - y) / (yHip - yHem)), 1.2);
        const wb = _ss(y, yTop - sp.band * h - .004 * h, yTop - sp.band * h) * .0016 * h;        // ウエストの帯
        rad[i * NA + j] = r0 + sp.ease * h + fl + pl + wb;
      }
    }
    // 外面・内面・裾・上端をつなぐ
    const P = [], idx = [], V = (i, j, o) => (o * (NY + 1) + i) * NA + (j % NA);
    for (let o = 0; o < 2; o++) for (let i = 0; i <= NY; i++) {
      const y = yTop + (yHem - yTop) * i / NY;
      for (let j = 0; j < NA; j++) { const a = j / NA * Math.PI * 2, r = rad[i * NA + j] - o * th; P.push(Math.sin(a) * r, y, zc + Math.cos(a) * r); }
    }
    for (let i = 0; i < NY; i++) for (let j = 0; j < NA; j++) {
      const a = V(i, j, 0), b = V(i, j + 1, 0), c = V(i + 1, j + 1, 0), d = V(i + 1, j, 0); idx.push(a, d, c, a, c, b);
      const a2 = V(i, j, 1), b2 = V(i, j + 1, 1), c2 = V(i + 1, j + 1, 1), d2 = V(i + 1, j, 1); idx.push(a2, c2, d2, a2, b2, c2);
    }
    for (let j = 0; j < NA; j++) {
      const o0 = V(NY, j, 0), o1 = V(NY, j + 1, 0), i0 = V(NY, j, 1), i1 = V(NY, j + 1, 1); idx.push(o0, i0, i1, o0, i1, o1);
      const t0 = V(0, j, 0), t1 = V(0, j + 1, 0), u0 = V(0, j, 1), u1 = V(0, j + 1, 1); idx.push(t0, t1, u1, t0, u1, u0);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(idx); g.computeVertexNormals();
    // 被覆 (肌を隠す範囲): 半径の内側かつ裾・上端から margin 以上内側
    const cover = (x, y, z, m) => {
      if (y > yTop - m || y < yHem + m) return false;
      const i = Math.round((yTop - y) / (yTop - yHem) * NY), a = Math.atan2(x, z - zc), j = Math.round(((a + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * NA) % NA;
      return Math.hypot(x, z - zc) < rad[i * NA + j] - th - .002;
    };
    // 重み: 上は腰, 裾へ向かって左右の太ももへ少し配る (歩いてもひざが布を突き抜けにくい)
    const weights = (x, y, z) => {
      const t = _ss(yHip - y, 0, yHip - yHem) * (.35 + .35 * _ss(z - zc, -.02 * h, .06 * h)), side = _ss(x, -.03 * h, .03 * h);
      const wl = t * side, wr = t * (1 - side), wh = 1 - wl - wr;
      return [BI.hips, wh, BI.thighL, wl, BI.thighR, wr, 0, 0];
    };
    return { geo: g, cover, weights, yTop, yHem, zc, rad, NY, NA };
  }

  // ---------------------------------------------------------------- 靴 (履いた姿勢で設計し, 足の骨の座標へ戻す)
  // ts: つま先側の底の厚さ, hs: かかとの高さ。かかとが高いと足首を伸ばす (足のボーンを alpha 回す) 分だけ体を持ち上げる
  const SHOES = {
    sneaker: { ts: .022, hs: .03, wide: 1, toe: 'round', collar: .3, sole: 'cup' },
    velcro: { ts: .018, hs: .022, wide: 1.06, toe: 'round', collar: .32, sole: 'cup' },
    leather: { ts: .012, hs: .025, wide: .96, toe: 'almond', collar: .27, sole: 'welt' },
    pump: { ts: .01, hs: .048, wide: .9, toe: 'point', collar: .2, sole: 'heel' },
    boot: { ts: .03, hs: .036, wide: 1.06, toe: 'cap', collar: .52, sole: 'lug' },
  };
  function shoePose(C, kind) {
    const { h, J } = C, S0 = SHOES[kind], sc = Math.min(1, h / 1.6) * .6 + .4, ts = S0.ts * sc, hs = S0.hs * sc, an = J.footL;
    const al = Math.asin(Math.min(.5, (hs - ts) / (.09 * h)));
    const lift = ts - an[1] + an[1] * Math.cos(al) + .07 * h * Math.sin(al);
    return { al, lift, ts, hs };
  }
  // 足首まわりの回転 (x 軸) と持ち上げ: 骨の座標 (bind) ↔ 履いた姿勢 (rest)
  function footXf(an, al, lift) {
    const c = Math.cos(al), s = Math.sin(al);
    return {
      toRest: p => { const y = p[1] - an[1], z = p[2] - an[2]; return [p[0], an[1] + y * c - z * s + lift, an[2] + y * s + z * c]; },
      toBind: p => { const y = p[1] - an[1] - lift, z = p[2] - an[2]; return [p[0], an[1] + y * c + z * s, an[2] - y * s + z * c]; },
    };
  }
  // 左の靴 (履いた姿勢の座標)。返り値: upper / sole の距離場と箱
  function shoeShape(C, kind, pose) {
    const { h, J } = C, S0 = SHOES[kind], an = J.footL, FL = .151 * h, W = S0.wide, { ts, hs, al, lift } = pose;
    const X = footXf(an, al, lift), heelB = X.toRest([an[0], 0, an[2] - .042 * h]), zH = heelB[2] - .006 * h, L = FL * 1.07 + .012 * h;
    const cx = z => an[0] + .03 * (z - an[2]);                                                // つま先をわずかに外へ
    const yIns = z => ts + (hs - ts) * (1 - _ss(z, zH + .22 * L, zH + .62 * L));             // 中敷きの高さ (土踏まずでかかとへ上がる)
    const at = (u, z) => [cx(z), yIns(z) + u, z];
    const E = (u, zf, r) => { const z = zH + zf * L; return sdEll(at(u, z), r); };
    const toe = S0.toe, list = [];
    list.push(A(E(.15 * FL, .2, [.13 * FL * W, .165 * FL, .2 * FL])));                        // かかと
    list.push(A(E(.15 * FL, .45, [.165 * FL * W, .14 * FL, .2 * FL]), .05 * FL));             // 土踏まず
    list.push(A(E(.105 * FL, .66, [.2 * FL * W, .12 * FL, .23 * FL]), .05 * FL));              // 親指の付け根 (一番幅が広い)
    if (toe === 'point') list.push(A(E(.06 * FL, .9, [.12 * FL * W, .055 * FL, .2 * FL]), .05 * FL));
    else if (toe === 'almond') list.push(A(E(.068 * FL, .87, [.16 * FL * W, .066 * FL, .165 * FL]), .05 * FL));
    else if (toe === 'cap') list.push(A(E(.085 * FL, .86, [.185 * FL * W, .088 * FL, .155 * FL]), .05 * FL));
    else list.push(A(E(.078 * FL, .86, [.172 * FL * W, .08 * FL, .155 * FL]), .05 * FL));
    const ank = X.toRest(an);
    list.push(A(sdCone([ank[0], ank[1] + (S0.collar > .4 ? .022 * h : .004 * h), ank[2] - .004 * h], at(.19 * FL, zH + .6 * L), .16 * FL * W, .155 * FL * W), .05 * FL));   // 甲
    if (S0.collar > .4) list.push(A(sdCone([ank[0], ank[1] - .01 * h, ank[2] - .006 * h], [ank[0], ank[1] + S0.collar * FL, ank[2] - .008 * h], .155 * FL, .145 * FL), .04 * FL));   // ブーツの筒
    list.push(cutP([0, 0, 0], [0, -1, 0]));
    const upperBase = compile(list).f;
    // はき口: かかと側は高く, 甲の前で低い面で切る。パンプスは甲を大きく開ける
    const colH = S0.collar * FL, zc0 = zH, zc1 = zH + .5 * L;
    // はき口の高さ: かかと側は colH。短い靴は足首より前を切らない (甲・ベロは型の形のまま)
    const front = kind === 'pump' || S0.collar > .4 ? () => 0 : z => _ss(z, ank[2] - .012 * h, ank[2] + .012 * h);
    const collarCut = (x, y, z) => { const t = Math.min(Math.max((z - zc0) / (zc1 - zc0), 0), 1); return y - (yIns(z) + colH * (1 - .22 * t) + front(z)); };
    const open = kind === 'pump' ? sdEll(at(.21 * FL, zH + .4 * L), [.13 * FL, .11 * FL, .24 * L])
      : sdEll([ank[0], ank[1] + .1 * FL + (S0.collar > .4 ? S0.collar * FL - .2 * FL : 0), ank[2] - .024 * h], [.12 * FL, .12 * FL, .13 * FL]);
    const upper = (x, y, z) => smax(smax(upperBase(x, y, z), collarCut(x, y, z), .015 * FL), -open.f(x, y, z), .012 * FL);
    // 底: 足形の輪郭 (上から見た楕円の和) × 高さ
    const prE = (zf, r) => sdEll([cx(zH + zf * L), 0, zH + zf * L], [r[0], 5, r[1]]);
    const pr = compile([A(prE(.19, [.145 * FL * W, .21 * FL])), A(prE(.66, [.215 * FL * W, .25 * FL]), .12 * FL), A(prE(toe === 'point' ? .88 : .85, [toe === 'point' ? .12 * FL : .175 * FL * W, .17 * FL]), .08 * FL)]).f;
    const marg = S0.sole === 'welt' ? .0019 * h : S0.sole === 'lug' ? .0045 * h : .0022 * h;
    let sole;
    if (S0.sole === 'heel') {                                                                 // パンプス: 薄い前底 + 細めのヒール
      const heel = sdCone([cx(zH + .16 * L), 0, zH + .15 * L], [cx(zH + .16 * L), hs, zH + .13 * L], .05 * FL, .085 * FL);
      sole = (x, y, z) => {
        const p = pr(x, y, z) - marg * .5, sl = smax(p, Math.max(y - (yIns(z) + .001), (yIns(z) - .006 * h) - y), .002 * h);
        return smin(sl, smax(heel.f(x, y, z), -y, .001), .004 * h);
      };
    } else {
      const lugs = S0.sole === 'lug';
      sole = (x, y, z) => {
        let d = smax(pr(x, y, z) - marg, Math.max(y - (yIns(z) + .002), -y), .004 * h);
        if (S0.sole === 'cup') d = smin(d, smax(upper(x, y, z) - .0015, y - (yIns(z) + .007 * h), .002), .002);   // つま先とかかとの巻き上げ
        if (lugs && y < .008 * h) d += .0025 * h * _ss(Math.abs(Math.sin(z * 260 / (h / 1.7))), .45, .65) * _ss(-y, -.006 * h, -.003 * h);
        return d;
      };
    }
    const bx = [cx(zH) - .16 * FL * W - marg - .01, -.002, zH - .02, cx(zH + L) + .16 * FL * W + marg + .01, Math.max(hs, ts) + colH + .03, zH + L + .02];
    return { upper, sole, box: bx, L, zH, yIns, cx, X, FL, at, ank };
  }

  // ---------------------------------------------------------------- 筒 (服の下地): 軸に直交する断面ごとに体の外形を測り, 凸包で凹みに橋を渡し,
  // 軸の始点側から終点側へ「布が垂れる」(半径が slope より速くは縮まない) ようにした形。胴・袖・ズボンの脚に使う
  function hull2(P) {                                                                         // 2 次元の凸包 (反時計回り)
    const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  function rayHull(H, c, s) {                                                                  // 原点から (c, s) 方向の半直線と凸包の交点までの距離
    let best = 0;
    for (let i = 0; i < H.length; i++) {
      const a = H[i], b = H[(i + 1) % H.length], ex = b[0] - a[0], ey = b[1] - a[1], den = c * ey - s * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = (a[0] * ey - a[1] * ex) / den, u = (a[0] * s - a[1] * c) / den;
      if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.max(best, t);
    }
    return best;
  }
  function* tubeField(fd, a, b, { rows = 40, nA = 48, ease = 0, slope = .3, grow = 0, rMax = .3, ref = [0, 0, 1], smooth = 2, fd2 = null, use2 = null, taper = 0 } = {}) {
    const ax = _sub(b, a), L = Math.hypot(ax[0], ax[1], ax[2]), u = _mul(ax, 1 / L);
    const r0 = _nrm(_sub(ref, _mul(u, _dot(ref, u)))), r1 = _cross(u, r0), dl = L / rows;
    let Rr = new Float32Array((rows + 1) * nA);
    const R2 = fd2 ? new Float32Array((rows + 1) * nA) : null;
    const cs = [], sn = []; for (let j = 0; j < nA; j++) { const t = j / nA * Math.PI * 2; cs.push(Math.cos(t)); sn.push(Math.sin(t)); }
    const section = (g, c0, out, i) => {                                                        // 断面の外形 → 凸包 → 方位ごとの半径 (行の間の厚みぶんの 3 枚をまとめる)
      const pts = [];
      for (const off of [-.5, 0, .5]) for (let j = 0; j < nA; j++) {
        const c = _add(c0, _mul(u, dl * off));
        const dx = r0[0] * cs[j] + r1[0] * sn[j], dy = r0[1] * cs[j] + r1[1] * sn[j], dz = r0[2] * cs[j] + r1[2] * sn[j];
        const at = r => g(c[0] + dx * r, c[1] + dy * r, c[2] + dz * r);
        let r = rMax, v = at(r), hit = 0;
        for (let k = 0; k < 160 && r > 0; k++) { const nr = r - Math.max(v * .9, 5e-4); const nv = at(nr); if (nv <= 0) { let lo = nr, hi = r; for (let q = 0; q < 10; q++) { const m = (lo + hi) / 2; if (at(m) <= 0) lo = m; else hi = m; } hit = (lo + hi) / 2; break; } r = nr; v = nv; }
        if (hit > 0) pts.push([hit * cs[j], hit * sn[j]]);
      }
      if (pts.length >= 3) { const H = hull2(pts); for (let j = 0; j < nA; j++) out[i * nA + j] = rayHull(H, cs[j], sn[j]); }
    };
    const both = fd2 ? (x, y, z) => Math.min(fd(x, y, z), fd2(x, y, z)) : null;
    for (let i = 0; i <= rows; i++) {
      if ((i & 3) === 3) yield;
      const c = _add(a, _mul(u, dl * i));
      section(fd, c, Rr, i);
      if (fd2 && use2(c)) section(both, c, R2, i);
    }
    for (let i = 1; i <= rows; i++) for (let j = 0; j < nA; j++) Rr[i * nA + j] = Math.max(Rr[i * nA + j], Rr[(i - 1) * nA + j] - slope * dl);   // 垂れ
    if (R2) for (let q = 0; q < Rr.length; q++) Rr[q] = Math.max(Rr[q], R2[q]);               // 2 つ目の形 (肩) は垂らさずに足す
    for (let it = 0; it < smooth; it++) {                                                      // ならし (軸方向・方位方向)
      const S = new Float32Array(Rr.length);
      for (let i = 0; i <= rows; i++) for (let j = 0; j < nA; j++) {
        const i0 = Math.max(i - 1, 0), i1 = Math.min(i + 1, rows), j0 = (j - 1 + nA) % nA, j1 = (j + 1) % nA;
        S[i * nA + j] = (4 * Rr[i * nA + j] + Rr[i0 * nA + j] + Rr[i1 * nA + j] + Rr[i * nA + j0] + Rr[i * nA + j1]) / 8;
      }
      for (let i = 0; i <= rows; i++) for (let j = 0; j < nA; j++) S[i * nA + j] = Math.max(S[i * nA + j], Rr[i * nA + j] - .002);
      Rr = S;
    }
    for (let i = 0; i <= rows; i++) for (let j = 0; j < nA; j++) Rr[i * nA + j] = (Rr[i * nA + j] + ease + grow * i / rows) * (1 - taper * _ss(i / rows, 1 - .18, 1));   // taper: 終点側をすぼめて他の筒の中へ隠す
    const ia = nA / (Math.PI * 2);
    const f = (x, y, z) => {
      const px = x - a[0], py = y - a[1], pz = z - a[2], t = px * u[0] + py * u[1] + pz * u[2];
      const qx = px - u[0] * t, qy = py - u[1] * t, qz = pz - u[2] * t, rho = Math.sqrt(qx * qx + qy * qy + qz * qz);
      let fi = Math.min(Math.max(t / dl, 0), rows), i = Math.min(Math.floor(fi), rows - 1); const ti = fi - i;
      let ang = Math.atan2(qx * r1[0] + qy * r1[1] + qz * r1[2], qx * r0[0] + qy * r0[1] + qz * r0[2]); if (ang < 0) ang += Math.PI * 2;
      const fj = ang * ia, j = Math.floor(fj) % nA, j1 = (j + 1) % nA, tj = fj - Math.floor(fj);
      const r = (Rr[i * nA + j] * (1 - tj) + Rr[i * nA + j1] * tj) * (1 - ti) + (Rr[(i + 1) * nA + j] * (1 - tj) + Rr[(i + 1) * nA + j1] * tj) * ti;
      let d = rho - r;
      if (t < 0) d = Math.max(d, -t); else if (t > L) d = Math.max(d, t - L);
      return d;
    };
    const c = _lerp(a, b, .5);
    return { f, bs: [c[0], c[1], c[2], L / 2 + rMax], R: Rr, rows, nA };
  }


  // ============================================================================ 装身具 (押し出し・掃引で作る)
  // 表面の y を探す (x, z を固定して上から下へ)
  function surfY(fd, x, z, y0, y1) {
    let y = y0;
    for (let i = 0; i < 160; i++) { const d = fd(x, y, z); if (d < 1e-4) return y; y -= Math.max(d * .9, 3e-4); if (y < y1) return y1; }
    return y;
  }
  // 面の上の座標系 (Z = 法線, Y ≒ up)
  function frameAt(p, n, up = [0, 1, 0]) {
    const Z = _nrm(n); let X = _cross(up, Z); if (Math.hypot(X[0], X[1], X[2]) < 1e-6) X = [1, 0, 0]; X = _nrm(X); const Y = _cross(Z, X);
    return new THREE.Matrix4().makeBasis(new THREE.Vector3(X[0], X[1], X[2]), new THREE.Vector3(Y[0], Y[1], Y[2]), new THREE.Vector3(Z[0], Z[1], Z[2])).setPosition(p[0], p[1], p[2]);
  }
  function rrPath(P, w, h, r, cx = 0, cy = 0) {
    const x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2;
    P.moveTo(x0 + r, y0); P.lineTo(x1 - r, y0); P.quadraticCurveTo(x1, y0, x1, y0 + r); P.lineTo(x1, y1 - r); P.quadraticCurveTo(x1, y1, x1 - r, y1);
    P.lineTo(x0 + r, y1); P.quadraticCurveTo(x0, y1, x0, y1 - r); P.lineTo(x0, y0 + r); P.quadraticCurveTo(x0, y0, x0 + r, y0);
    return P;
  }
  const extrude = (shape, depth, bevel = 0, seg = 2) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: seg, curveSegments: 10 });
  // 文字・図柄のテクスチャ
  function labelTex(key, W, H, draw) { return canvasTex(key, W, H, draw, { repeat: false }); }

  // ---------------------------------------------------------------- 襟 (首の付け根に沿って断面を掃引)
  // 断面は (上, 外) 座標の反時計回り。gap: 前の開き (片側の角度)
  const COLLARS = {
    polo: { gap: .2, prof: [[0, 0], [.03, 0], [.034, .004], [.031, .01], [.011, .025], [-.02, .046], [-.023, .043], [.008, .021], [.026, .007], [.026, .004], [0, .004]] },
    round: { gap: .08, prof: [[0, 0], [.01, 0], [.013, .004], [.008, .018], [-.004, .046], [-.008, .044], [.003, .017], [.007, .006], [.006, .004], [0, .004]] },
    stand: { gap: .07, prof: [[0, 0], [.038, -.003], [.041, .001], [.004, .0065], [0, .0055]] },
  };
  // 襟ぐりの縁: 方位ごとに, 首の軸から外へ「布の上面が襟ぐりの穴から出る所」を二分探索で求める
  function neckPoint(C, fdFull, holeF, a) {
    const { h, J } = C, dx = Math.sin(a), dz = Math.cos(a);
    let lo = .02 * h, hi = .17 * h, y = 0;
    const at = r => { const x = dx * r, z = J.neck[2] + dz * r; y = surfY(fdFull, x, z, J.head[1], J.chest[1] - .06 * h); return holeF(x, y, z) < 0; };
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (at(m)) lo = m; else hi = m; }
    at(hi); return [dx * hi, y, J.neck[2] + dz * hi];
  }
  function collarGeo(C, kind, fdTop, edge) {
    const { h, J } = C, sc = h / 1.7, K = COLLARS[kind], n = 72, pts = [];
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * 2 - K.gap - (Math.PI * 2 - 2 * K.gap) * i / n, p = edge(a), o = _nrm([p[0], 0, p[2] - J.neck[2]]);
      pts.push([p[0] - o[0] * .004 * sc, p[1] - .002 * sc, p[2] - o[2] * .004 * sc]);       // 襟ぐりの縁に少しかぶせる
    }
    const prof = K.prof.map(([u, v]) => [u * sc, v * sc]);
    const g = sweep(pts, prof, p => _nrm([p[0], 0, p[2] - J.neck[2]]));
    // 襟の下側が布より下にもぐる所は, 真上へ持ち上げて肩や胸の上に沿わせる
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), sy = surfY(fdTop, x, z, y + .05 * h, y - .08 * h) + .0012 * sc;
      if (y < sy && fdTop(x, sy - .0012 * sc, z) < .003) P.setY(i, sy);
    }
    g.computeVertexNormals();
    return g;
  }

  // 襟ぐりの縁取り (リブ・パイピング): 縁に沿った閉じた輪に断面を掃引し, ぎざつく切り口を覆う
  function neckBinding(C, fdTop, edge, w, t) {
    const { h } = C, sc = h / 1.7, pts = [];
    for (let i = 0; i < 96; i++) pts.push(edge(i / 96 * Math.PI * 2));
    return sweep(spline(pts, 128, true), rrProf(w * sc, t * sc, -.001 * sc), p => gradN(fdTop, p), { closed: true });
  }

  // ---------------------------------------------------------------- ベルト (ズボンの腰まわりの断面に沿って掃引) + バックル + ベルト通し
  function beltParts(C, fdP, y) {
    const { h, J } = C, sc = h / 1.7, c = [0, y, J.hips[2]];
    const pts = ring(fdP, c, [0, 1, 0], [0, 0, 1], 128, .0008 * sc, .3 * h);
    const strap = sweep(pts, rrProf(.033 * sc, .0034 * sc), p => gradN(fdP, p), { closed: true });
    const loops = [.55, 1.45, Math.PI, -1.45, -.55].map(a => {
      const p0 = ring(fdP, c, [0, 1, 0], [Math.sin(a), 0, Math.cos(a)], 1, .0008 * sc, .3 * h)[0];
      const n = gradN(fdP, p0), q = [p0[0], p0[1] - .024 * sc, p0[2]], r = [p0[0], p0[1] + .022 * sc, p0[2]];
      const path = spline([project(fdP, q, .001 * sc), _add(_add(q, [0, .006 * sc, 0]), _mul(n, .0048 * sc)), _add(_add(r, [0, -.006 * sc, 0]), _mul(n, .0048 * sc)), project(fdP, r, .001 * sc)], 10);
      return sweep(path, rrProf(.011 * sc, .0022 * sc), (p, i) => n);
    });
    // バックル: 角を丸めた枠を押し出し (中央の穴にベルトが見える)
    const sh = rrPath(new THREE.Shape(), .048 * sc, .04 * sc, .008 * sc), hole = rrPath(new THREE.Path(), .034 * sc, .026 * sc, .004 * sc);
    sh.holes.push(hole);
    const p0 = pts[0], n0 = gradN(fdP, p0), buckle = extrude(sh, .003 * sc, .0012 * sc);
    buckle.applyMatrix4(frameAt(_add(p0, _mul(n0, .0034 * sc)), n0));
    const prong = new THREE.CylinderGeometry(.0016 * sc, .0016 * sc, .03 * sc, 8); prong.rotateZ(Math.PI / 2); prong.applyMatrix4(frameAt(_add(p0, _mul(n0, .0052 * sc)), n0));
    return { leather: [strap, ...loops], metal: [buckle, prong] };
  }

  // ---------------------------------------------------------------- 腕時計 (手首の断面に沿うバンド + ケース + 文字盤)
  function watchParts(C, sd, gold) {
    const { h, J, B, R } = C, sc = h / 1.7, s = sd === 'L' ? 1 : -1, el = J['foreArm' + sd], wr = J['hand' + sd], ax = _nrm(_sub(wr, el));
    const c = _sub(wr, _mul(ax, .022 * sc)), fa = compile(B.parts.foreArm[sd]).f;
    const HR = s > 0 ? R.handR : mirR(R.handR), dors = _nrm(_apR(HR, [1, 0, 0]));            // 手の甲の向き
    const loop = ring(fa, c, ax, dors, 56, .0012 * sc, .1 * h);
    const band = sweep(loop, rrProf(.017 * sc, .0026 * sc), p => gradN(fa, p), { closed: true });
    const top = loop[0], n = gradN(fa, top);
    const M = frameAt(_add(top, _mul(n, .0045 * sc)), n, ax);
    const cs = new THREE.CylinderGeometry(.0175 * sc, .0185 * sc, .008 * sc, 32); cs.rotateX(Math.PI / 2); cs.applyMatrix4(M);
    const dial = new THREE.CircleGeometry(.0148 * sc, 32); dial.translate(0, 0, .0041 * sc); dial.applyMatrix4(M);
    const crown = new THREE.CylinderGeometry(.0022 * sc, .0022 * sc, .004 * sc, 10); crown.rotateZ(Math.PI / 2); crown.translate(.0195 * sc, 0, 0); crown.applyMatrix4(M);
    return { band, metal: [cs, crown], dial, bone: 'foreArm' + sd, gold };
  }
  function dialTex(gold) {
    return labelTex('dial' + (gold ? 'g' : 's'), 128, 128, (g, W) => {
      g.fillStyle = gold ? '#f6efe2' : '#1d2430'; g.beginPath(); g.arc(64, 64, 64, 0, 7); g.fill();
      g.strokeStyle = gold ? '#8a6a2a' : '#e8edf2'; g.lineCap = 'round';
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r0 = i % 3 ? 50 : 44; g.lineWidth = i % 3 ? 3 : 6; g.beginPath(); g.moveTo(64 + Math.sin(a) * r0, 64 - Math.cos(a) * r0); g.lineTo(64 + Math.sin(a) * 58, 64 - Math.cos(a) * 58); g.stroke(); }
      g.lineWidth = 6; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 + 26, 64 - 18); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.moveTo(64, 64); g.lineTo(64 - 10, 64 - 44); g.stroke();
      g.fillStyle = gold ? '#8a6a2a' : '#e8edf2'; g.beginPath(); g.arc(64, 64, 5, 0, 7); g.fill();
    });
  }

  // ---------------------------------------------------------------- 眼鏡 (リムを押し出し + レンズ + 掃引したテンプル)
  function glassesParts(C, fdHead, safety) {
    const { R, F } = C, hh = R.hh, HC = R.HC, sc = hh / .223, ey = HC[1] + F.eye[1] * hh, ez = HC[2] + (F.eye[2] + F.eye[3]) * hh;
    const out = { frame: [], lens: [] };
    const templeTo = (s, p0) => {                                                             // テンプル: こめかみ → 耳の上 → 耳の後ろへ下がる
      const ear = [s * F.ear[0][0] * hh, HC[1] + (F.ear[0][1] + F.ear[1][1] * .55) * hh, HC[2] + (F.ear[0][2] - .02) * hh];
      const pts = [p0, [s * .37 * hh, ey + .004 * hh, ez - .12 * hh], [s * .4 * hh, ear[1] + .02 * hh, ear[2] + .06 * hh], [s * .395 * hh, ear[1] + .01 * hh, ear[2] - .04 * hh], [s * .37 * hh, ear[1] - .08 * hh, ear[2] - .1 * hh]];
      const pp = pts.map((p, i) => (i === 0 ? p : project(fdHead, p, .006 * sc))), path = spline(pp, 24);
      return sweep(path, rrProf(.0026 * sc, .0018 * sc), p => _nrm([s, .2, 0]));
    };
    if (safety) {                                                                              // 保護メガネ: 一枚の曲面レンズ (円筒の一部) + 上の枠
      const Rr = .44 * hh, cz = ez + .07 * hh - Rr, len = new THREE.CylinderGeometry(Rr, Rr * .98, .2 * hh, 40, 1, true, -1.05, 2.1);
      len.translate(0, ey - .01 * hh, cz); out.lens.push(len);
      const arc = []; for (let i = 0; i <= 30; i++) { const a = -1.05 + 2.1 * i / 30; arc.push([Math.sin(a) * (Rr + .002), ey + .09 * hh, cz + Math.cos(a) * (Rr + .002)]); }
      out.frame.push(sweep(arc, rrProf(.006 * sc, .007 * sc), p => _nrm([p[0], 0, p[2] - cz])));
      [1, -1].forEach(s => out.frame.push(templeTo(s, arc[s > 0 ? 30 : 0])));
      const pad = new THREE.SphereGeometry(.012 * hh, 10, 8); pad.scale(1, 1.4, .7); pad.translate(0, ey - .06 * hh, ez + .055 * hh); out.frame.push(pad);
      return out;
    }
    const lw = .205 * hh, lh = .14 * hh, rim = .011 * hh;
    [1, -1].forEach(s => {
      const cx = s * F.eye[0] * hh * 1.04;
      const sh = rrPath(new THREE.Shape(), lw + 2 * rim, lh + 2 * rim, .055 * hh), ho = rrPath(new THREE.Path(), lw, lh, .048 * hh);
      sh.holes.push(ho);
      const fr = extrude(sh, .007 * hh, .002 * hh); fr.rotateY(-s * .12); fr.translate(cx, ey + .004 * hh, ez + .1 * hh);
      out.frame.push(fr);
      const le = new THREE.ShapeGeometry(rrPath(new THREE.Shape(), lw, lh, .048 * hh), 8); le.translate(0, 0, .0035 * hh); le.rotateY(-s * .12); le.translate(cx, ey + .004 * hh, ez + .1 * hh);
      out.lens.push(le);
      out.frame.push(templeTo(s, [cx + s * (lw / 2 + rim * .6), ey + .05 * hh, ez + .1 * hh - s * s * .02 * hh]));
    });
    const br = spline([[.05 * hh, ey + .05 * hh, ez + .108 * hh], [0, ey + .065 * hh, ez + .118 * hh], [-.05 * hh, ey + .05 * hh, ez + .108 * hh]], 10);   // ブリッジ
    out.frame.push(sweep(br, rrProf(.004 * sc, .003 * sc), () => [0, 0, 1]));
    return out;
  }

  // ---------------------------------------------------------------- 保護帽 (外殻・内側・つばを 1 枚の格子で張る) + 緑十字 + あご紐
  function helmetParts(C) {
    const { R } = C, hh = R.hh, HC = R.HC, sc = hh / .223;
    const c = [0, HC[1] + .08 * hh, HC[2] - .03 * hh], ax = .48 * hh, ay = .5 * hh, az = .57 * hh, th = .014 * hh;
    const yRim = a => HC[1] + (.2 - .1 * (1 - Math.cos(a))) * hh;                            // 縁の高さ (前は眉の上, 後ろは低い)
    const NP = 96, NT = 26, NB = 8, rows = [];
    const dome = (t, a) => {                                                                   // t: 0 (頂点) 〜 1 (縁)
      const tr = Math.acos(Math.max(-1, Math.min(1, (yRim(a) - c[1]) / ay))), th0 = t * tr, sx = Math.sin(th0) * Math.sin(a), sy = Math.cos(th0), sz = Math.sin(th0) * Math.cos(a);
      const ridge = .028 * hh * Math.exp(-((sx / .1) ** 2)) * _ss(1 - t, .05, .35);
      const k = 1 + ridge / ay;
      return [c[0] + ax * sx * k, c[1] + ay * sy * k, c[2] + az * sz * k];
    };
    for (let i = 0; i <= NT; i++) { const t = .02 + .98 * i / NT, row = []; for (let j = 0; j < NP; j++) row.push(dome(t, j / NP * Math.PI * 2 - Math.PI)); rows.push(row); }
    const rim = rows[NT];
    for (let k = 1; k <= NB; k++) {                                                            // つば: 前は 5cm ほど張り出し, 横・後ろは小さな返し
      const u = k / NB, row = [];
      for (let j = 0; j < NP; j++) {
        const a = j / NP * Math.PI * 2 - Math.PI, p = rim[j], o = _nrm([p[0] - c[0], 0, p[2] - c[2]]);
        const fr = _ss(.9 - Math.abs(a), 0, .45), wv = (.2 * fr + .022) * hh;
        row.push([p[0] + o[0] * wv * u, p[1] - (.02 * u + .03 * u * u) * hh * fr - .004 * hh * u, p[2] + o[2] * wv * u]);
      }
      rows.push(row);
    }
    const nr = rows.length, P = [], idx = [];
    rows.forEach(r => r.forEach(p => P.push(p[0], p[1], p[2])));
    // 内面: 外面を法線方向に th だけ内側へ (後で法線を計算するため, いったん外面だけで法線を出す)
    const gOut = new THREE.BufferGeometry(); gOut.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    const oi = []; for (let i = 0; i < nr - 1; i++) for (let j = 0; j < NP; j++) { const j1 = (j + 1) % NP, a = i * NP + j, b = i * NP + j1, cc = (i + 1) * NP + j1, d = (i + 1) * NP + j; oi.push(a, b, cc, a, cc, d); }
    gOut.setIndex(oi); gOut.computeVertexNormals();
    const N = gOut.attributes.normal.array, nv = nr * NP;
    for (let q = 0; q < nv; q++) P.push(P[q * 3] - N[q * 3] * th, P[q * 3 + 1] - N[q * 3 + 1] * th, P[q * 3 + 2] - N[q * 3 + 2] * th);
    oi.forEach(v => idx.push(v));
    for (let q = 0; q < oi.length; q += 3) idx.push(oi[q] + nv, oi[q + 2] + nv, oi[q + 1] + nv);
    for (let j = 0; j < NP; j++) { const j1 = (j + 1) % NP, a = (nr - 1) * NP + j, b = (nr - 1) * NP + j1; idx.push(a, b + nv, b, a, a + nv, b + nv); }
    const top = P.length / 3; P.push(c[0], c[1] + ay + .028 * hh, c[2]); const topI = P.length / 3; P.push(c[0], c[1] + ay - th, c[2]);
    for (let j = 0; j < NP; j++) { const j1 = (j + 1) % NP; idx.push(top, j1, j); idx.push(topI, j + nv, j1 + nv); }
    const shell = new THREE.BufferGeometry(); shell.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); shell.setIndex(idx); shell.computeVertexNormals();
    // 緑十字のステッカー (前面の格子の一部を少し浮かせる)
    const dec = [], du = [], di = [], DA = 10, DT = 10;
    for (let i = 0; i <= DT; i++) for (let j = 0; j <= DA; j++) {
      const t = .44 + .3 * i / DT, a = -.24 + .48 * j / DA, p = dome(t, a), n = _nrm(_sub(p, c));
      dec.push(p[0] + n[0] * .0008, p[1] + n[1] * .0008, p[2] + n[2] * .0008); du.push(j / DA, 1 - i / DT);
    }
    for (let i = 0; i < DT; i++) for (let j = 0; j < DA; j++) { const a = i * (DA + 1) + j, b = a + 1, cc = a + DA + 2, d = a + DA + 1; di.push(a, cc, b, a, d, cc); }
    const decal = new THREE.BufferGeometry(); decal.setAttribute('position', new THREE.Float32BufferAttribute(dec, 3)); decal.setAttribute('uv', new THREE.Float32BufferAttribute(du, 2)); decal.setIndex(di); decal.computeVertexNormals();
    const inner = (x, y, z) => smax(sdEll(c, [ax - th - .008 * hh, ay - th - .008 * hh, az - th - .008 * hh]).f(x, y, z), (yRim(Math.atan2(x, z - c[2])) - .03 * hh) - y, .01 * hh);
    return { shell, decal, inner, c, yRim, sc };
  }
  function crossTex() {
    return labelTex('greencross', 128, 128, g => {
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(64, 64, 60, 0, 7); g.fill();
      g.fillStyle = '#0a8a3a'; g.fillRect(48, 14, 32, 100); g.fillRect(14, 48, 100, 32);
    });
  }
  function chinStrap(C, fdHead, H) {
    const { R } = C, hh = R.hh, HC = R.HC, sc = hh / .223, pts = [];
    [[.37, .1, .05], [.35, -.06, .1], [.31, -.24, .13], [.22, -.4, .15], [.1, -.5, .2], [0, -.525, .215], [-.1, -.5, .2], [-.22, -.4, .15], [-.31, -.24, .13], [-.35, -.06, .1], [-.37, .1, .05]]
      .forEach(p => pts.push(project(fdHead, [p[0] * hh, HC[1] + p[1] * hh, HC[2] + p[2] * hh], .004 * sc)));
    const path = spline(pts, 40);
    return sweep(path, rrProf(.012 * sc, .0018 * sc), p => gradN(fdHead, p));
  }

  // ---------------------------------------------------------------- ネックレス・ピアス
  function necklaceParts(C, fd) {
    const { h, J } = C, sc = h / 1.6, pts = [];
    for (let i = 0; i < 72; i++) {
      const a = i / 72 * Math.PI * 2, f = Math.pow(.5 + .5 * Math.cos(a), 2), y = J.neck[1] - .012 * h - .05 * h * f;
      const d = [Math.sin(a), 0, Math.cos(a)];
      let r = .2 * h, v = fd(d[0] * r, y, J.neck[2] + d[2] * r);
      for (let k = 0; k < 200 && r > 0; k++) { const nr = r - Math.max(v * .9, 3e-4); const nv = fd(d[0] * nr, y, J.neck[2] + d[2] * nr); if (nv <= .0012) { r = nr; break; } r = nr; v = nv; }
      pts.push([d[0] * r, y, J.neck[2] + d[2] * r]);
    }
    const chain = sweep(spline(pts, 140, true), ellProf(.0007 * sc, .0007 * sc, 6), p => gradN(fd, p), { closed: true });
    const p0 = pts[0], n0 = gradN(fd, p0), sh = new THREE.Shape();
    const r = .0065 * sc; sh.moveTo(0, r * 1.6); sh.quadraticCurveTo(r * 1.1, r * .2, 0, -r); sh.quadraticCurveTo(-r * 1.1, r * .2, 0, r * 1.6);   // しずく形のペンダント
    const pend = extrude(sh, .0018 * sc, .0008 * sc); pend.applyMatrix4(frameAt(_add(_add(p0, [0, -.008 * sc, 0]), _mul(n0, .0025 * sc)), n0));
    return [chain, pend];
  }

  // ---------------------------------------------------------------- 斜め掛けバッグ (本体・ふたを押し出し + 体に沿う肩ひも)
  function bagParts(C, fd, sideOut) {
    const { h, J } = C, sc = h / 1.6, s = -1;                                                  // 右の腰に下げ, 左肩に掛ける
    const y = J.hips[1] - .012 * h, a = s * 1.05, d = [Math.sin(a), 0, Math.cos(a)];
    const r = sideOut(y, a) + .004 * sc, n = d, p = [d[0] * r, y, J.hips[2] + d[2] * r];
    const W = .2 * sc, Hh = .135 * sc, D = .055 * sc;
    const body = extrude(rrPath(new THREE.Shape(), W - .02 * sc, Hh - .02 * sc, .025 * sc), D - .016 * sc, .008 * sc, 3);
    body.translate(0, 0, .008 * sc);
    const flap = new THREE.Shape(); flap.moveTo(-W / 2, Hh / 2); flap.lineTo(W / 2, Hh / 2); flap.lineTo(W / 2, -.005 * sc); flap.quadraticCurveTo(W / 2, -.035 * sc, W / 2 - .03 * sc, -.035 * sc); flap.lineTo(-W / 2 + .03 * sc, -.035 * sc); flap.quadraticCurveTo(-W / 2, -.035 * sc, -W / 2, -.005 * sc); flap.lineTo(-W / 2, Hh / 2);
    const fl = extrude(flap, .003 * sc, .0012 * sc); fl.translate(0, 0, D + .0015 * sc);
    const clasp = extrude(rrPath(new THREE.Shape(), .022 * sc, .012 * sc, .004 * sc), .003 * sc, .001 * sc); clasp.translate(0, -.03 * sc, D + .005 * sc);
    const M = frameAt(p, n); [body, fl, clasp].forEach(g => g.applyMatrix4(M));
    const corner = sx => { const v = new THREE.Vector3(sx * (W / 2 - .01 * sc), Hh / 2 - .004 * sc, D * .5).applyMatrix4(M); return [v.x, v.y, v.z]; };
    // 肩ひも: 前の角 → 胸の前 → 左肩 → 背中 → 後ろの角
    const ctrl = [corner(-1), [-.07 * h, .61 * h, .1 * h], [.02 * h, .7 * h, .1 * h], [.075 * h, .79 * h, .045 * h], [.088 * h, .812 * h, -.012 * h], [.07 * h, .78 * h, -.07 * h], [-.01 * h, .69 * h, -.09 * h], [-.085 * h, .6 * h, -.08 * h], corner(1)];
    const pp = ctrl.map((q, i) => (i === 0 || i === ctrl.length - 1 ? q : project(fd, q, .0025 * sc)));
    const path = spline(pp, 90).map((q, i, arr) => (i < 3 || i > arr.length - 4 ? q : project(fd, q, .0022 * sc)));
    const strap = sweep(path, rrProf(.016 * sc, .0026 * sc), q => gradN(fd, q));
    return { leather: [body, fl], metal: [clasp], strap };
  }

  // ---------------------------------------------------------------- ランドセル (側面形を押し出した本体 + かぶせ + 錠前 + 肩ベルト)
  function randoseruParts(C, fd) {
    const { h, J } = C, sc = h / 1.34, W = .235 * sc, Hh = .3 * sc, D = .175 * sc;
    const yTop = J.upperArmL[1] - .005 * h, yBot = yTop - Hh;
    const zf = surfZ(fd, 0, yTop - Hh * .4, -.4 * h, 0) - .006 * sc;                          // 背中に当たる面
    // 本体: 側面 (奥行き × 高さ) の角丸形を幅方向へ押し出す。外側の上角は大きく丸める
    const side = (dd, hh2, rTop, r) => { const s = new THREE.Shape(); s.moveTo(r, 0); s.lineTo(dd - r, 0); s.quadraticCurveTo(dd, 0, dd, r); s.lineTo(dd, hh2 - rTop); s.quadraticCurveTo(dd, hh2, dd - rTop, hh2); s.lineTo(r, hh2); s.quadraticCurveTo(0, hh2, 0, hh2 - r); s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0); return s; };
    const M = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)).setPosition(-W / 2, yBot, zf);
    const body = extrude(side(D, Hh, .07 * sc, .018 * sc), W - .016 * sc, .008 * sc, 3); body.translate(0, 0, .008 * sc); body.applyMatrix4(M);
    // かぶせ: 上面と外面を覆う帯 (外形の内側を少し削った形) を少し広い幅で押し出す
    const t = .0045 * sc, cover = new THREE.Shape(), r0 = .07 * sc, hd = Hh * .16;
    cover.moveTo(.012 * sc, Hh + t); cover.lineTo(D - r0, Hh + t); cover.quadraticCurveTo(D + t, Hh + t, D + t, Hh - r0); cover.lineTo(D + t, hd + .02 * sc); cover.quadraticCurveTo(D + t, hd, D + t - .02 * sc, hd);
    cover.lineTo(D - .02 * sc, hd); cover.quadraticCurveTo(D, hd, D, hd + .02 * sc); cover.lineTo(D, Hh - r0); cover.quadraticCurveTo(D, Hh, D - r0, Hh); cover.lineTo(.012 * sc, Hh); cover.lineTo(.012 * sc, Hh + t);
    const cv = extrude(cover, W + .002 * sc, .0015 * sc, 2); cv.translate(0, 0, -.001 * sc); cv.applyMatrix4(M);
    // 錠前 (かぶせの下端) と受け金具, 横のナスカン
    const lock = extrude(rrPath(new THREE.Shape(), .03 * sc, .022 * sc, .006 * sc), .006 * sc, .0015 * sc);
    lock.applyMatrix4(frameAt([0, yBot + hd + .004 * sc, zf - D - t - .002 * sc], [0, 0, -1]));
    const knob = new THREE.CylinderGeometry(.006 * sc, .007 * sc, .008 * sc, 16); knob.rotateX(Math.PI / 2); knob.translate(0, yBot + hd + .004 * sc, zf - D - t - .01 * sc);
    const hooks = [1, -1].map(s => { const g = new THREE.TorusGeometry(.009 * sc, .0022 * sc, 6, 16); g.rotateY(Math.PI / 2); g.translate(s * (W / 2 + .004 * sc), yBot + Hh * .45, zf - D * .5); return g; });
    // 肩ベルト: 本体の上 → 肩 → 胸の前 → わきの下 → 本体の下の横
    const straps = [1, -1].map(s => {
      const ctrl = [[s * .055 * sc, yTop - .02 * sc, zf - .03 * sc], [s * .06 * sc, yTop + .012 * sc, zf + .012 * sc], [s * .072 * h, J.neck[1] - .025 * h, J.neck[2] - .02 * h],
        [s * .078 * h, J.neck[1] - .02 * h, J.neck[2] + .045 * h], [s * .082 * h, J.chest[1] + .04 * h, .08 * h], [s * .092 * h, J.chest[1] - .035 * h, .06 * h], [s * .11 * h, J.chest[1] - .07 * h, .0], [s * (W / 2 - .012 * sc), yBot + .04 * sc, zf - .02 * sc]];
      const pp = ctrl.map((q, i) => (i < 2 || i === ctrl.length - 1 ? q : project(fd, q, .0035 * sc)));
      const path = spline(pp, 80).map((q, i, arr) => (i < 12 || i > arr.length - 6 ? q : project(fd, q, .0032 * sc)));
      return sweep(path, rrProf(.034 * sc, .0055 * sc), (q, i) => (i < 12 || i > path.length - 6 ? [0, 1, 0] : gradN(fd, q)));
    });
    return { body: [body], cover: [cv], metal: [lock, knob, ...hooks], straps, zf, D };
  }

  // ---------------------------------------------------------------- 名札 / 社員証 (押し出した板 + 文字)
  function tagParts(C, fd, kind) {
    const { h, J } = C, sc = h / 1.6, w = (kind === 'badge' ? .07 : .06) * sc, ht = (kind === 'badge' ? .032 : .03) * sc;
    const x = (kind === 'badge' ? .055 : .05) * h, y = J.chest[1] + (kind === 'badge' ? .085 : .07) * h;
    const p = project(fd, [x, y, .15 * h], .002 * sc), n = gradN(fd, p), M = frameAt(p, n);
    const plate = extrude(rrPath(new THREE.Shape(), w, ht, .005 * sc), .0025 * sc, .0008 * sc); plate.applyMatrix4(M);
    const face = new THREE.PlaneGeometry(w * .92, ht * .86); face.translate(0, 0, .0035 * sc); face.applyMatrix4(M);
    return { plate, face };
  }
  function tagTex(kind) {
    return labelTex('tag_' + kind, 256, 128, g => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 256, 128);
      if (kind === 'badge') {
        g.fillStyle = '#1f5fa8'; g.fillRect(0, 0, 256, 30); g.fillStyle = '#ffffff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center'; g.fillText('SAFETY  FIRST', 128, 22);
        g.fillStyle = '#222'; g.font = 'bold 54px sans-serif'; g.fillText('田中', 150, 100); g.fillStyle = '#c7d3e0'; g.fillRect(16, 42, 60, 74);
      } else {
        g.strokeStyle = '#2b6cc4'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 118);
        g.fillStyle = '#222'; g.textAlign = 'center'; g.font = 'bold 26px sans-serif'; g.fillText('3年2組', 128, 46); g.font = 'bold 44px sans-serif'; g.fillText(kind === 'girl' ? 'さくら' : 'はると', 128, 100);
      }
    });
  }

  // ---------------------------------------------------------------- 髪ゴム + リボン
  function tieParts(C, ties) {
    const { R } = C, hh = R.hh, sc = hh / .2, out = { tie: [], bow: [] };
    ties.forEach((t, i) => {
      const s = t.c[0] > 0 ? 1 : -1, M = frameAt(t.c, t.axis, [0, 0, 1]);
      const tor = new THREE.TorusGeometry(t.r * .95, .03 * hh, 8, 24); tor.applyMatrix4(M); out.tie.push(tor);
      // リボン: 輪 2 つ (角丸三角を押し出し) + 結び目 + 垂れ
      const lobe = new THREE.Shape(), L = .09 * hh, Wd = .06 * hh;
      lobe.moveTo(0, 0); lobe.quadraticCurveTo(L * .6, Wd, L, Wd * .7); lobe.quadraticCurveTo(L * 1.15, 0, L, -Wd * .7); lobe.quadraticCurveTo(L * .6, -Wd, 0, 0);
      const hole = new THREE.Path(); hole.moveTo(L * .3, 0); hole.quadraticCurveTo(L * .6, Wd * .45, L * .85, Wd * .35); hole.quadraticCurveTo(L * .95, 0, L * .85, -Wd * .35); hole.quadraticCurveTo(L * .6, -Wd * .45, L * .3, 0);
      lobe.holes.push(hole);
      const up = _nrm(_cross(t.axis, [s, 0, 0])), out2 = _nrm([s, .3, -.4]), Mb = frameAt(_add(t.c, _mul(out2, t.r + .02 * hh)), out2, [0, 1, 0]);
      [0, Math.PI].forEach(rz => { const g = extrude(lobe, .018 * hh, .006 * hh); g.translate(0, 0, -.009 * hh); g.rotateZ(rz + .25); g.applyMatrix4(Mb); out.bow.push(g); });
      const knot = new THREE.SphereGeometry(.026 * hh, 12, 10); knot.scale(1, 1, .7); knot.applyMatrix4(Mb); out.bow.push(knot);
      [-.5, .5].forEach(dx => { const tail = extrude(rrPath(new THREE.Shape(), .03 * hh, .1 * hh, .008 * hh), .01 * hh, .003 * hh); tail.translate(0, -.06 * hh, -.005 * hh); tail.rotateZ(dx * .7); tail.applyMatrix4(Mb); out.bow.push(tail); });
    });
    return out;
  }

  // ---------------------------------------------------------------- 胸のプリント (服の三角形を写して少し浮かせ, 平面の UV を付ける)
  function decalFromMesh(mesh, test, uvf, lift) {
    const P = mesh.pos, N = mesh.nrm, ix = mesh.idx, map = new Map(), pos = [], uv = [], nrm = [], idx = [];
    for (let t = 0; t < ix.length; t += 3) {
      const a = ix[t], b = ix[t + 1], c = ix[t + 2];
      const cx = (P[a * 3] + P[b * 3] + P[c * 3]) / 3, cy = (P[a * 3 + 1] + P[b * 3 + 1] + P[c * 3 + 1]) / 3, cz = (P[a * 3 + 2] + P[b * 3 + 2] + P[c * 3 + 2]) / 3;
      if (!test(cx, cy, cz)) continue;
      [a, b, c].forEach(v => {
        if (!map.has(v)) { map.set(v, pos.length / 3); pos.push(P[v * 3] + N[v * 3] * lift, P[v * 3 + 1] + N[v * 3 + 1] * lift, P[v * 3 + 2] + N[v * 3 + 2] * lift); nrm.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); const q = uvf(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); uv.push(q[0], q[1]); }
        idx.push(map.get(v));
      });
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
    return g;
  }
  function bearTex() {
    return labelTex('bear', 256, 256, g => {
      g.clearRect(0, 0, 256, 256);
      const br = '#a8714a';
      g.fillStyle = br; [[70, 70], [186, 70]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 36, 0, 7); g.fill(); });
      g.fillStyle = '#f2c6a0'; [[70, 70], [186, 70]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 18, 0, 7); g.fill(); });
      g.fillStyle = br; g.beginPath(); g.arc(128, 140, 92, 0, 7); g.fill();
      g.fillStyle = '#f6e3cc'; g.beginPath(); g.ellipse(128, 172, 44, 34, 0, 0, 7); g.fill();
      g.fillStyle = '#2a1a12'; [[94, 126], [162, 126]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); });
      g.beginPath(); g.ellipse(128, 160, 14, 10, 0, 0, 7); g.fill();
      g.strokeStyle = '#2a1a12'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 168); g.lineTo(128, 182); g.moveTo(112, 188); g.quadraticCurveTo(128, 198, 144, 188); g.stroke();
      g.fillStyle = 'rgba(240,120,120,.55)'; [[78, 160], [178, 160]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 14, 9, 0, 0, 7); g.fill(); });
    });
  }

  // ---------------------------------------------------------------- 靴の部品 (ひも・マジックテープ・ベルト通し) 履いた姿勢で作り足の座標へ戻す
  function shoeExtras(C, kind, SH) {
    const { h } = C, sc = h / 1.7, out = { lace: [], strap: [] }, L = SH.L, zH = SH.zH;
    const surf = (z, dx) => { const x = SH.cx(z) + dx; return [x, surfY(SH.upper, x, z, .3, 0), z]; };
    if (kind === 'sneaker' || kind === 'boot' || kind === 'leather') {
      const n = kind === 'boot' ? 7 : kind === 'leather' ? 4 : 5, z0 = zH + (kind === 'boot' ? .28 : .43) * L, z1 = zH + (kind === 'leather' ? .6 : .64) * L;
      for (let i = 0; i < n; i++) {
        const z = z0 + (z1 - z0) * i / (n - 1), w = (kind === 'boot' ? .028 : .022) * sc * (1 + .25 * (z - z0) / (z1 - z0));
        const pts = [surf(z, -w), surf(z + .004 * sc, 0), surf(z, w)].map(p => project(SH.upper, p, .0018 * sc));
        out.lace.push(sweep(spline(pts, 9), ellProf(.0016 * sc, .0012 * sc, 6), () => [0, 1, 0]));
      }
      // 結び目と輪
      const zt = z0 - .006 * sc, top = project(SH.upper, surf(zt, 0), .003 * sc);
      [-1, 1].forEach(s => {
        const loop = [top, _add(top, [s * .012 * sc, .006 * sc, -.004 * sc]), _add(top, [s * .022 * sc, .002 * sc, .004 * sc]), _add(top, [s * .01 * sc, .001 * sc, .006 * sc]), top];
        out.lace.push(sweep(spline(loop, 14), ellProf(.0016 * sc, .0012 * sc, 6), () => [0, 1, 0]));
        const end = [top, _add(top, [s * .006 * sc, -.004 * sc, .012 * sc]), _add(top, [s * .009 * sc, -.012 * sc, .02 * sc])];
        out.lace.push(sweep(spline(end, 8), ellProf(.0016 * sc, .0012 * sc, 6), () => [0, 1, 0]));
      });
    }
    if (kind === 'velcro') {
      [.46, .6].forEach(f => {
        const z = zH + f * L, pts = [];
        for (let i = 0; i <= 8; i++) { const dx = (-1 + 2 * i / 8) * .17 * SH.FL; pts.push(project(SH.upper, surf(z + dx * .15, dx), .002 * sc)); }
        out.strap.push(sweep(spline(pts, 16), rrProf(.017 * sc, .0028 * sc), p => gradN(SH.upper, p)));
      });
    }
    return out;
  }


  // ============================================================================ 服装 (人物の種類ごと)
  // 数値は身長比。top: 上衣 / bottom: ズボン / skirt / socks / shoes / acc: 装身具
  const OUTFITS = {
    man: {     // ネイビーのポロシャツ (パンツにイン) + チノパン + 革ベルト + 革靴 + 腕時計 + 眼鏡
      top: { kind: 'polo', ease: .0035, drape: true, sleeve: .52, sleeveEase: .006, hem: .515, neckGap: .004, tex: 'knit', collar: 'polo', placket: true, band: .014, tuck: true },
      bottom: { kind: 'pants', ease: .0058, waist: .585, hem: .03, long: true, legEase: .011, hemEase: .016, tex: 'twill', seams: true, belt: true },
      socks: { top: .1, color: '#2b2d33' }, shoes: 'leather', acc: ['watch', 'glasses'] },
    woman: {   // 七分袖のニット (スカートにイン) + A ラインスカート + パンプス + ネックレス・ピアス・腕時計 + ショルダーバッグ
      top: { kind: 'knit', ease: .0042, drape: true, sleeve: 1.62, sleeveEase: .006, hem: .56, neckGap: .01, scoop: [.05, .065, 0], tex: 'knit', band: .012, tuck: true },
      skirt: { waist: .615, hem: .3, ease: .0075, flare: .036, folds: [9, .006], thick: .0035, band: .02, tex: 'twill' },
      shoes: 'pump', acc: ['necklace', 'earrings', 'bag', 'watchGold'] },
    boy: {     // T シャツ + 半ズボン + 白いソックス + スニーカー + 黒いランドセル + 名札
      top: { kind: 'tee', ease: .0105, drape: true, sleeve: .56, sleeveEase: .012, hem: .465, neckGap: .011, scoop: [.022, .05, 0], tex: 'knit', band: .012 },
      bottom: { kind: 'shorts', ease: .0065, waist: .565, hem: .355, long: false, legEase: .012, tex: 'twill', seams: true },
      socks: { top: .115 }, shoes: 'sneaker', acc: ['randoseru', 'nametag'] },
    girl: {    // 丸襟のブラウス (スカートにイン) + プリーツスカート + ハイソックス + スニーカー + 赤いランドセル + 名札 + 髪ゴムとリボン
      top: { kind: 'blouse', ease: .004, drape: true, sleeve: .5, sleeveEase: .012, hem: .55, neckGap: .009, tex: 'weave', collar: 'round', band: .01, tuck: true },
      skirt: { waist: .6, hem: .34, ease: .007, flare: .03, pleats: 26, pleatD: .005, thick: .003, band: .02, tex: 'twill' },
      socks: { top: .235 }, shoes: 'sneaker', acc: ['randoseru', 'nametag', 'ties'] },
    toddler: { // くまのプリントの T シャツ + 長ズボン + マジックテープのスニーカー
      top: { kind: 'tee', ease: .011, drape: true, sleeve: .6, sleeveEase: .012, hem: .44, neckGap: .012, scoop: [.022, .05, 0], tex: 'knit', band: .012, print: 'bear' },
      bottom: { kind: 'pants', ease: .007, waist: .505, hem: .055, long: true, legEase: .014, hemEase: .016, tex: 'knit' },
      shoes: 'velcro', acc: [] },
    worker: {  // 作業服 (スタンドカラー・ファスナー・胸ポケット) + カーゴパンツ (上下同色) + 安全靴 + 保護帽 + 保護メガネ + 軍手 + 名札
      top: { kind: 'jacket', ease: .012, drape: true, sleeve: 1.96, sleeveEase: .006, cuffTight: true, hem: .505, neckGap: .012, tex: 'twill', collar: 'stand', zipper: true, pockets: true, band: .022 },
      bottom: { kind: 'pants', ease: .0085, waist: .59, hem: .034, long: true, legEase: .016, hemEase: .02, cargo: true, tex: 'twill', seams: true },
      socks: { top: .12, color: '#3a3d44' }, shoes: 'boot', acc: ['helmet', 'sglasses', 'gloves', 'badge'] },
  };
  function outfitKey(type, o) { if (o.jacket || o.helmet || o.suit) return 'worker'; if (type === 'child') return o.skirt ? 'girl' : 'boy'; return type; }
  const HAIR_OF = { short: { man: 'biz', woman: 'biz', child: 'kid', toddler: 'baby' }, long: 'long', twin: 'twin' };
  const COVER_BONES = {
    top: ['hips', 'spine', 'chest', 'shoulderL', 'shoulderR', 'upperArmL', 'upperArmR'], topLong: ['foreArmL', 'foreArmR'],
    pants: ['hips', 'thighL', 'thighR'], pantsLong: ['shinL', 'shinR'], skirt: ['hips', 'thighL', 'thighR'], socks: ['shinL', 'shinR', 'footL', 'footR'], shoes: ['shinL', 'shinR', 'footL', 'footR'],
  };

  // ---------------------------------------------------------------- ジオメトリの組み立て (体型・服装ごとにキャッシュ)
  const _geoCache = new Map();
  const _LR = BONES.map(n => BI[n.endsWith('L') ? n.slice(0, -1) + 'R' : n.endsWith('R') ? n.slice(0, -1) + 'L' : n]);
  const swapW = w => [_LR[w[0]], w[1], _LR[w[2]], w[3], _LR[w[4]], w[5], _LR[w[6]], w[7]];
  function typeOf(o) { return o.headBig ? (o.h < 1.0 ? 'toddler' : 'child') : (o.skirt ? 'woman' : 'man'); }
  // 手を左手の局所座標でメッシュ化し, 左右へ配置する (右は X 反転)
  function* handPair(fd, box, cell, R, ownLocal, JT) {
    const J = R.J, mh = compact(yield* meshGen(fd, box, cell));
    const mL = xformMesh(mh, R.handR, J.handL), mR = mirrorX(mL);
    const wL = makeWeigher(ownLocal.map(o => ({ f: xform(o, R.handR, J.handL).f, bone: o.bone })), JT);
    return [toGeometry(mL, { weights: wL, uv: boxUV(.03) }), toGeometry(mR, { weights: (x, y, z) => swapW(wL(-x, y, z)), uv: boxUV(.03) })];
  }
  // 左右の鏡像 (重みも左右を入れ替える)
  function mirrorGeo(g) {
    const m = g.clone(), P = m.attributes.position, N = m.attributes.normal;
    for (let i = 0; i < P.count; i++) { P.setX(i, -P.getX(i)); if (N) N.setX(i, -N.getX(i)); }
    if (m.index) { const a = m.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } }
    else { const swap = attr => { if (!attr) return; const s = attr.itemSize, a = attr.array; for (let i = 0; i < a.length; i += 3 * s) for (let k = 0; k < s; k++) { const t = a[i + s + k]; a[i + s + k] = a[i + 2 * s + k]; a[i + 2 * s + k] = t; } }; Object.values(m.attributes).forEach(swap); }
    const SI = m.attributes.skinIndex; if (SI) for (let i = 0; i < SI.count; i++) for (let k = 0; k < 4; k++) SI.setComponent(i, k, _LR[SI.getComponent(i, k)]);
    return m;
  }
  // 履いた姿勢 (rest) で作った形を足の骨の座標 (bind) へ: 行列
  function restToBindM(an, al, lift) {
    return new THREE.Matrix4().makeTranslation(an[0], an[1], an[2]).multiply(new THREE.Matrix4().makeRotationX(-al)).multiply(new THREE.Matrix4().makeTranslation(-an[0], -an[1] - lift, -an[2]));
  }

  function* geoGen(o, type) {
    const ok = outfitKey(type, o);
    const T = TYPES[type], F = FACES[type], h = o.h, R = rig(T, h), JT = joints(R, h), J = R.J, hh = R.hh, OF = OUTFITS[ok];
    const B = bodyShape(T, h, R), C = { T, F, h, R, J, hh, B, type }, W = makeWeigher(B.own, JT), sc = h / 1.7;
    // 胴だけの重み (腕のボーンを使わない): 身ごろの脇・肩ひも・ネックレスが, 腕を上げても引っ張られないように
    const TB_ = new Set(['hips', 'spine', 'chest', 'neck'].map(n => BI[n])), Wt = makeWeigher(B.own.filter(p => TB_.has(p.bone)), JT);
    const LB_ = new Set(['hips', 'spine', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'].map(n => BI[n])), Wl = makeWeigher(B.own.filter(p => LB_.has(p.bone)), JT);   // 腰と脚だけ (ズボン・靴下)
    const parts = [], add = (geo, mat, weights, extra) => { if (weights) skinGeo(geo, weights); parts.push(Object.assign({ geo, mat }, extra || {})); return geo; };
    const covers = [], gc = Math.max(.0045, .0086 * sc), M = .028 * sc, FB = { band: .9, fast: true };                       // 服の格子間隔 / 肌を隠す範囲の縁の余裕
    const fdBody = compile(B.list).f;
    let fdTop = null, fdBottom = null, skirt = null, topMesh = null;
    const tuckY = OF.skirt ? OF.skirt.waist * h - .012 * h : OF.bottom ? OF.bottom.waist * h - .012 * h : 0;
    // ---- 上衣
    if (OF.top) {
      const sp = OF.top, TB = yield* topBase(C, sp), TL = topList(C, sp, 0, TB);
      if (sp.pockets) [1, -1].forEach(s => {                                                  // 胸ポケット (ふた付き)
        const tf = TB.torso.f, x = s * .058 * h, y = J.chest[1] + .07 * h, z = surfZ(tf, x, y, .3 * h, 0), n = gradN(tf, [x, y, z]);
        const rot = [-Math.asin(n[1]), Math.asin(n[0]), 0];
        TL.list.splice(TL.list.length - 1, 0, A(sdBox([x + n[0] * .002 * h, y, z + n[2] * .002 * h], [.034 * h, .036 * h, .003 * h], .004 * h, rot), .004 * h),
          A(sdBox([x + n[0] * .004 * h, y + .036 * h, z + n[2] * .004 * h], [.036 * h, .011 * h, .0035 * h], .003 * h, rot), .001 * h));
      });
      const base = compile(TL.list).f, bands = [], seamsL = [];
      bands.push({ t: .0011 * sc, mask: edgeBand([0, sp.hem * h, 0], [0, -1, 0], sp.band * sc * 1.7) });
      TL.ends.forEach(e => bands.push({ t: .001 * sc, mask: edgeBand(e.p0, e.n, sp.band * sc * 1.4, e.axis) }));
      const zN = J.neck[2] + TL.rn + .002, yN = surfY(base, 0, zN, J.head[1], J.neck[1] - .1 * h);
      if (sp.placket) {                                                                       // ポロシャツの前立て
        const y0 = yN - .12 * sc;
        bands.push({ t: .0011 * sc, mask: (x, y, z) => (z < 0 ? 0 : _ss(.016 * sc, .012 * sc, Math.abs(x)) * _ss(y, y0 - .004 * sc, y0)) });
        [-1, 1].forEach(s => seamsL.push({ pts: [0, .33, .66, 1].map(t => { const y = y0 + (yN - y0) * t, x = s * .0135 * sc; return [x, y, surfZ(base, x, y, .3 * h, 0)]; }), depth: .0007 * sc, w: .0015 * sc }));
      }
      if (sp.kind === 'jacket') [1, -1].forEach(s => seamsL.push({ pts: [[s * .12 * h, J.chest[1] + .11 * h, 0], [s * .06 * h, J.neck[1] - .04 * h, 0]].map(p => project(base, [p[0], p[1], surfZ(base, p[0], p[1], .3 * h, -.05 * h)], 0)), depth: .0008 * sc, w: .0018 * sc }));
      const tuck = sp.tuck ? (d, x, y) => d + (y < tuckY ? Math.min(.012 * sc, (tuckY - y) * .35) : 0) : null;
      fdTop = detailF(base, { bands, seams: seamsL, extra: tuck });
      const xm = (sp.sleeve > 1 ? J.handL[0] + .05 * h : J.upperArmL[0] + .08 * h);
      topMesh = compact(yield* meshGen(fdTop, [-xm, (sp.sleeve > 1 ? J.handL[1] - .03 * h : Math.min(sp.hem * h, J.foreArmL[1])) - .02, -.15 * h, xm, J.neck[1] + .05 * h, .15 * h], gc, FB));
      // 身ごろ (袖でない所) のわきの下より下は胴だけで動かし, 袖との境は 2 つの重みを混ぜる
      const yArm = J.upperArmL[1] - .045 * h, sleeves = [TB.arms.L.upper, TB.arms.R.upper, TB.arms.L.fore, TB.arms.R.fore].filter(Boolean);
      const topW = (x, y, z) => {
        let dA = 1e3; for (const t of sleeves) dA = Math.min(dA, t.f(x, y, z));
        const t = _ss(dA - TB.torso.f(x, y, z), -.006 * h, .006 * h) * _ss(yArm + .015 * h, yArm - .01 * h, y);
        return t <= 0 ? W(x, y, z) : t >= 1 ? Wt(x, y, z) : blendW(W(x, y, z), Wt(x, y, z), t);
      };
      add(toGeometry(topMesh, { weights: topW, uv: boxUV(.06 * sc) }), 'top', null, { colorable: true });
      const cv = compile(topList(C, sp, M, TB).list).f;
      covers.push({ f: (x, y, z) => cv(x, y, z) + (sp.tuck && y < tuckY ? 1 : 0), thr: sp.ease * h * .4, bones: COVER_BONES.top.concat(sp.sleeve > 1 ? COVER_BONES.topLong : []) });
      // 襟ぐりの縁 (襟の付け根 / 縁取りの位置)
      const fdFull = compile(TL.full).f, holeF = (x, y, z) => { let d = 1e3; for (const it of TL.holes) d = Math.min(d, it.f(x, y, z)); return d; };
      const edge = a => neckPoint(C, fdFull, holeF, a);
      if (sp.collar) add(collarGeo(C, sp.collar, fdTop, edge), sp.collar === 'round' ? 'collar' : 'top', W, sp.collar === 'round' ? null : { colorable: true });
      else add(neckBinding(C, fdTop, edge, sp.kind === 'tee' ? .022 : .018, sp.kind === 'tee' ? .0045 : .0035), 'top', W, { colorable: true });
      if (sp.placket) [.035, .075].forEach(dy => {                                           // ボタン
        const y = yN - dy * sc, p = [0, y, surfZ(fdTop, 0, y, .3 * h, 0)], n = gradN(fdTop, p);
        const b = new THREE.CylinderGeometry(.0052 * sc, .0055 * sc, .0026 * sc, 16); b.rotateX(Math.PI / 2); b.applyMatrix4(frameAt(_add(p, _mul(n, .0012 * sc)), n));
        add(b, 'button', W);
      });
      if (sp.zipper) {                                                                        // ファスナー + 引き手
        const pts = []; for (let i = 0; i <= 40; i++) { const y = sp.hem * h + .004 + (yN + .036 * sc - sp.hem * h) * i / 40; pts.push([0, y, surfZ(fdTop, 0, y, .3 * h, -.1 * h) + .0004]); }
        add(sweep(pts, rrProf(.0085 * sc, .0022 * sc), p => gradN(fdTop, p)), 'zip', W);
        const top = pts[34], n = gradN(fdTop, top), pull = extrude(rrPath(new THREE.Shape(), .009 * sc, .022 * sc, .003 * sc), .0016 * sc, .0006 * sc);
        pull.translate(0, -.012 * sc, 0); pull.applyMatrix4(frameAt(_add(top, _mul(n, .0024 * sc)), n)); add(pull, 'metal', W);
      }
      if (sp.print === 'bear') {
        const y0 = J.chest[1] - .015 * h, s0 = .085 * h;
        add(decalFromMesh(topMesh, (x, y, z) => z > 0 && Math.abs(x) < s0 * .62 && y > y0 - s0 * .62 && y < y0 + s0 * .62, (x, y) => [(x / s0) + .5, (y - y0) / s0 + .5], .0012 * sc), 'print', W);
      }
    }
    // ---- ズボン / スカート
    if (OF.bottom) {
      const sp = OF.bottom, PB = yield* pantsBase(C, sp), PL = pantsList(C, sp, 0, PB), base = compile(PL.list).f, yW = sp.waist * h, seamsL = [], bands = [];
      bands.push({ t: .0012 * sc, mask: edgeBand([0, yW, 0], [0, 1, 0], .036 * sc) });
      bands.push({ t: .001 * sc, mask: edgeBand([0, sp.hem * h, 0], [0, -1, 0], (sp.long ? .03 : .022) * sc) });
      if (sp.seams) {
        const yC = J.thighL[1] - .04 * h, zf = y => surfZ(base, 0, y, .3 * h, -.05 * h);
        seamsL.push({ pts: [[0, yW - .002, zf(yW - .002)], [0, yC + .03 * h, zf(yC + .03 * h)]], depth: .0008 * sc, w: .0016 * sc });
        seamsL.push({ pts: [[.032 * sc, yW - .036 * sc, 0], [.032 * sc, yC + .06 * h, 0], [.012 * sc, yC + .045 * h, 0], [0, yC + .04 * h, 0]].map(p => [p[0], p[1], surfZ(base, p[0], p[1], .3 * h, -.05 * h)]), depth: .0007 * sc, w: .0014 * sc });
        [1, -1].forEach(s => {
          seamsL.push({ pts: [[s * .075 * h, yW - .004 * h, .2 * h], [s * .118 * h, yW - .08 * h, .1 * h]].map(p => project(base, p, 0)), depth: .0009 * sc, w: .0016 * sc });   // 前ポケット
          const side = []; for (let i = 0; i <= 8; i++) { const y = yW - .005 * h - (yW - sp.hem * h - .01 * h) * i / 8; side.push(project(base, [s * .25 * h, y, J.hips[2]], 0)); }
          seamsL.push({ pts: side, depth: .0008 * sc, w: .0016 * sc });                    // 脇の縫い目
          seamsL.push({ pts: [[s * .03 * h, yW - .045 * h, -.3 * h], [s * .085 * h, yW - .045 * h, -.3 * h]].map(p => project(base, p, 0)), depth: .0009 * sc, w: .0014 * sc });   // 後ろポケット
        });
      }
      fdBottom = detailF(base, { bands, seams: seamsL });
      const legX = J.thighL[0] + .12 * h, y0 = sp.hem * h - .015;
      const mesh = compact(yield* meshGen(fdBottom, [-legX, y0, -.14 * h, legX, yW + .02, .14 * h], gc, FB));
      add(toGeometry(mesh, { weights: Wl, uv: boxUV(.06 * sc) }), 'bottom', null, { colorable: !!o.suit });
      const cv = compile(pantsList(C, sp, M, PB).list).f;
      covers.push({ f: cv, thr: sp.ease * h * .4, bones: COVER_BONES.pants.concat(sp.long ? COVER_BONES.pantsLong : []) });
      if (sp.belt) { const bp = beltParts(C, fdBottom, yW - .017 * sc); bp.leather.forEach(g => add(g, 'belt', Wt)); bp.metal.forEach(g => add(g, 'metal', Wt)); }
    }
    if (OF.skirt) {
      skirt = skirtGeo(C, OF.skirt);
      const uvS = boxUV(.06 * sc), P = skirt.geo.attributes.position, Nn = skirt.geo.attributes.normal, U = new Float32Array(P.count * 2);
      for (let i = 0; i < P.count; i++) { const t = uvS(P.getX(i), P.getY(i), P.getZ(i), Nn.getX(i), Nn.getY(i), Nn.getZ(i)); U[i * 2] = t[0]; U[i * 2 + 1] = t[1]; }
      skirt.geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
      add(skirt.geo, 'bottom', skirt.weights);
      covers.push({ test: (x, y, z) => skirt.cover(x, y, z, M), bones: COVER_BONES.skirt });
    }
    // ---- 靴 (履いた姿勢で作り, 足の骨の座標へ戻して左右に置く)
    const pose = OF.shoes ? shoePose(C, OF.shoes) : { al: 0, lift: 0 };
    let inShoe = () => false;
    if (OF.shoes) {
      const kind = OF.shoes, SH = shoeShape(C, kind, pose), Mb = restToBindM(J.footL, pose.al, pose.lift), sc2 = .0045 * Math.max(.7, sc);
      function* mk(fd, box, cell, color) {
        const m = compact(yield* meshGen(fd, box, cell, FB)), g = toGeometry(m, { uv: boxUV(.04 * sc), color });
        g.applyMatrix4(Mb); return g;
      }
      const upL = yield* mk(SH.upper, SH.box, sc2, null), soleL = yield* mk(SH.sole, [SH.box[0] - .005, -.002, SH.box[2] - .005, SH.box[3] + .005, Math.max(pose.hs, pose.ts) + .03, SH.box[5] + .005], sc2 * 1.15);
      const ex = shoeExtras(C, kind, SH);
      const extra = [...ex.lace.map(g => ({ g, m: 'lace' })), ...ex.strap.map(g => ({ g, m: 'strap' }))];
      extra.forEach(e => e.g.applyMatrix4(Mb));
      [['L', g => g], ['R', mirrorGeo]].forEach(([sd, f]) => {
        const rg = rigid('foot' + sd);
        add(f(skinGeo(upL.clone(), rigid('footL'))), 'shoe');
        add(f(skinGeo(soleL.clone(), rigid('footL'))), 'sole');
        extra.forEach(e => add(f(skinGeo(e.g.clone(), rigid('footL'))), e.m));
        void rg;
      });
      // 靴の中の肌・靴下は作らない: はき口より 2cm 下までの範囲と, 靴の内側に深く入った所 (パンプスは甲が見えるので後者だけ)
      const X = footXf(J.footL, pose.al, pose.lift), colTop = SH.yIns(SH.zH) + SHOES[kind].collar * SH.FL * .78 - .012 * h;
      const ankR = X.toRest(J.footL);
      inShoe = (x, y, z) => { const p = X.toRest([Math.abs(x), y, z]); return (kind !== 'pump' && (p[1] < colTop || (p[2] > ankR[2] + .012 * h && p[1] < SH.yIns(p[2]) + .32 * SH.FL))) || SH.upper(p[0], p[1], p[2]) < -.003 * sc; };
      covers.push({ test: inShoe, bones: COVER_BONES.shoes });
    }
    // ---- 靴下
    if (OF.socks) {
      const sp = OF.socks, SL = sockList(C, sp), base = compile(SL.list).f, top = sp.top * h;
      const fd = (x, y, z) => base(x, y, z) - .0007 * sc * _ss(y, top - .03 * sc, top - .022 * sc) * (.6 + .4 * Math.cos(Math.atan2(Math.abs(x) - J.footL[0], z - J.footL[2]) * 28));
      const mesh = compact(yield* meshGen(fd, [-J.footL[0] - .06 * h, -.005, -.08 * h, J.footL[0] + .06 * h, top + .01, .14 * h], gc * .8, Object.assign({ cull: inShoe }, FB)));
      add(toGeometry(mesh, { weights: Wl, uv: boxUV(.04 * sc) }), 'sock');
      const cv = compile(sockList(C, sp, M * .5).list).f;
      covers.push({ f: cv, thr: .0005, bones: COVER_BONES.socks });
    }
    // ---- 体 (首〜足先): 服や靴に隠れる三角形は作らない (重みが一番大きいボーンが服の覆う範囲で, 服の内側にある頂点)
    const coverB = covers.map(c => new Set(c.bones.map(n => BI[n])));
    const cb = Math.max(.0055, .0105 * h / 1.715);
    yield; const bm = compact(yield* meshGen(fdBody, [-.19 * h, -.01, -.13 * h, .19 * h, R.neckCut + .01, .16 * h], cb, { band: 1.05, fast: true }));
    {
      const nv = bm.pos.length / 3, Wt = new Array(nv), hide = new Uint8Array(nv);
      for (let i = 0; i < nv; i++) {
        const x = bm.pos[i * 3], y = bm.pos[i * 3 + 1], z = bm.pos[i * 3 + 2], w = W(x, y, z); Wt[i] = w;
        for (let k = 0; k < covers.length; k++) { const c = covers[k]; if (coverB[k].has(w[0]) && (c.test ? c.test(x, y, z) : c.f(x, y, z) < -c.thr)) { hide[i] = 1; break; } }
      }
      const idx = []; for (let t = 0; t < bm.idx.length; t += 3) { const a = bm.idx[t], b = bm.idx[t + 1], c = bm.idx[t + 2]; if (!(hide[a] && hide[b] && hide[c])) idx.push(a, b, c); }
      const m2 = compact({ pos: bm.pos, nrm: bm.nrm, idx: new Uint32Array(idx) }), map = new Int32Array(nv).fill(-1); let n = 0;
      for (let t = 0; t < idx.length; t++) if (map[idx[t]] < 0) map[idx[t]] = n++;
      const W2 = new Array(n); for (let i = 0; i < nv; i++) if (map[i] >= 0) W2[map[i]] = Wt[i];
      let vi = 0; const g = toGeometry(m2, { color: () => [1, 1, 1] }); skinGeo(g, () => W2[vi++]);
      add(g, 'skin');
    }
    // ---- 頭 (唇・頬は頂点色)
    const Hd = headShape(T, F, h, R), fdH = compile(Hd.list).f;
    yield; const hm = compact(yield* meshGen(fdH, [-.46 * hh, R.neckCut - .016 * h, R.HC[2] - .54 * hh, .46 * hh, h + .02 * hh, R.HC[2] + .58 * hh], hh * .019));
    const mouthY = R.HC[1] + F.mouth * hh, kid = type === 'child' || type === 'toddler', lip = F.lip;
    const cheekC = [1, -1].map(s => [s * F.cheek[0][0] * hh, R.HC[1] + (F.cheek[0][1] - .05) * hh, R.HC[2] + (F.cheek[0][2] + .1) * hh]);
    add(toGeometry(hm, { weights: makeWeigher(Hd.own, JT), color: (x, y, z) => {
      let r = 1, g = 1, b = 1;
      const dl = Math.min(Hd.lips[0].f(x, y, z), Hd.lips[1].f(x, y, z)), t = _ss(dl, .026 * hh, .004 * hh) * (z > R.HC[2] + .25 * hh ? 1 : 0);
      r -= lip[0] * t; g -= lip[1] * t; b -= lip[2] * t;
      const m = Math.exp(-(((y - mouthY) / (.011 * hh)) ** 2)) * (z > R.HC[2] + .3 * hh ? 1 : 0) * _ss(Math.abs(x), F.ulip[1][0] * hh * .95, F.ulip[1][0] * hh * .55);
      r -= .22 * m; g -= .3 * m; b -= .28 * m;
      cheekC.forEach(c => { const q = Math.exp(-(((x - c[0]) ** 2 + (y - c[1]) ** 2 + (z - c[2]) ** 2) / ((.11 * hh) ** 2))) * (kid ? 1 : type === 'woman' ? .6 : .25); g -= .1 * q; b -= .07 * q; });
      return [r, g, b];
    } }), 'skin');
    // ---- 手 (軍手のときは手袋に置き換え)
    const gloves = OF.acc.includes('gloves'), s = R.s;
    const Hn = handShape(T, h, R, gloves ? .0016 * sc : 0, gloves ? .075 : .022), fdHn = compile(Hn.list).f;
    const fdHand = gloves ? (x, y, z) => fdHn(x, y, z) - .0006 * sc * _ss(y, .03 * s, .04 * s) * Math.cos(Math.atan2(x, z) * 30) : (x, y, z) => fdHn(x, y, z) + .0005;
    yield; (yield* handPair(fdHand, [-.05 * s, -.2 * s, -.055 * s, .035 * s, (gloves ? .085 : .03) * s, .09 * s], (gloves ? .0039 : .0033) * s, R, Hn.own, JT)).forEach(geo => { if (!gloves) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3)); add(geo, gloves ? 'glove' : 'skin'); });
    // ---- 髪 (保護帽の内側は切り取る)
    const hs = typeof HAIR_OF[o.style] === 'string' ? HAIR_OF[o.style] : (HAIR_OF[o.style] || HAIR_OF.short)[type];
    const helmet = OF.acc.includes('helmet') ? helmetParts(C) : null;
    const torsoF = compile([...B.parts.torso, ...B.parts.upperArm.L, ...B.parts.upperArm.R]).f;
    const Hr = hairShape(hs, type, F, h, R, { torso: (x, y, z) => Math.min(torsoF(x, y, z) - (fdTop ? OF.top.ease * h + .002 : 0), 1), cut: helmet ? helmet.inner : null });
    yield; const hrm = compact(yield* meshGen(Hr.f, Hr.box, hh * .0168));
    add(toGeometry(hrm, { weights: Hr.weights, uv: boxUV(.05 * sc), rgba: (x, y, z) => [1, 1, 1, Hr.alpha(x, y, z)] }), 'hair');
    // ---- 装身具
    yield;
    const fdHeadHair = (x, y, z) => Math.min(fdH(x, y, z), Hr.f(x, y, z));
    const fdWear = (x, y, z) => Math.min(fdBody(x, y, z), fdTop ? fdTop(x, y, z) : 1e3);
    const RH = rigid('head'), RC = rigid('chest');
    OF.acc.forEach(a => {
      if (a === 'watch' || a === 'watchGold') { const wp = watchParts(C, 'L', a === 'watchGold'), rw = rigid(wp.bone); add(wp.band, a === 'watchGold' ? 'strapTan' : 'belt', rw); wp.metal.forEach(g => add(g, a === 'watchGold' ? 'gold' : 'metal', rw)); add(wp.dial, a === 'watchGold' ? 'dialG' : 'dialS', rw); }
      if (a === 'glasses' || a === 'sglasses') { const gp = glassesParts(C, fdHeadHair, a === 'sglasses'); gp.frame.forEach(g => add(g, a === 'sglasses' ? 'sframe' : 'frame', RH)); gp.lens.forEach(g => add(g, 'lens', RH)); }
      if (a === 'helmet') { add(helmet.shell, 'helmet', RH); add(helmet.decal, 'cross', RH); add(chinStrap(C, fdHeadHair, helmet), 'strapDark', RH); }
      if (a === 'necklace') necklaceParts(C, fdWear).forEach(g => add(g, 'gold', Wt));
      if (a === 'earrings') [1, -1].forEach(sg => { const e = new THREE.SphereGeometry(.0042 * sc, 14, 10); e.translate(sg * (F.ear[0][0] + .012) * hh, R.HC[1] + (F.ear[0][1] - F.ear[1][1] * .82) * hh, R.HC[2] + (F.ear[0][2] + .03) * hh); add(e, 'pearl', RH); });
      if (a === 'bag') {
        const sideOut = (y, ang) => { if (!skirt) return .15 * h; const i = Math.max(0, Math.min(skirt.NY, Math.round((skirt.yTop - y) / (skirt.yTop - skirt.yHem) * skirt.NY))), j = Math.round(((ang + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * skirt.NA) % skirt.NA; return skirt.rad[i * skirt.NA + j]; };
        const bp = bagParts(C, fdWear, sideOut); bp.leather.forEach(g => add(g, 'bag', rigid('hips'))); bp.metal.forEach(g => add(g, 'gold', rigid('hips'))); add(bp.strap, 'bag', Wt);
      }
      if (a === 'randoseru') { const rp = randoseruParts(C, fdWear); rp.body.forEach(g => add(g, 'rando', RC)); rp.cover.forEach(g => add(g, 'rando', RC)); rp.metal.forEach(g => add(g, 'metal', RC)); rp.straps.forEach(g => add(g, 'rando', Wt)); }
      if (a === 'nametag' || a === 'badge') { const tp = tagParts(C, fdWear, a === 'badge' ? 'badge' : ok); add(tp.plate, 'tagPlate', RC); add(tp.face, a === 'badge' ? 'tagBadge' : ok === 'girl' ? 'tagGirl' : 'tagBoy', RC); }
      if (a === 'ties') { const tp = tieParts(C, Hr.ties); tp.tie.forEach(g => add(g, 'tie', RH)); tp.bow.forEach(g => add(g, 'bow', RH)); }
    });
    // ---- 目と眉 (頭のボーンに固定する部品の位置)
    const set = { R, F, type, ok, pose, h };
    set.eyes = [1, -1].map(sg => ({ c: [sg * F.eye[0] * hh, R.HC[1] + F.eye[1] * hh, R.HC[2] + F.eye[2] * hh], r: F.eye[3] * hh, s: sg }));
    set.brows = [1, -1].map(sg => [[-.075, .002], [-.01, .014], [.06, .013], [.12, -.01]].map(([dx, dy]) => {                     // 眉: 目頭側は下げずに, 目尻へなだらかに下がる
      const x = sg * (F.eye[0] + dx) * hh, y = R.HC[1] + (F.brow[0][1] - .005 + dy) * hh;
      return [x, y, surfZ(fdH, x, y, R.HC[2] + .7 * hh, R.HC[2]) + .003 * hh];
    }));
    // 同じ素材をまとめる
    const byMat = new Map();
    parts.forEach(p => { if (!p.geo.attributes.skinIndex) skinGeo(p.geo, W); if (!byMat.has(p.mat)) byMat.set(p.mat, { list: [], colorable: false }); const e = byMat.get(p.mat); e.list.push(p.geo); e.colorable = e.colorable || !!p.colorable; });
    set.meshes = [...byMat.entries()].map(([mat, e]) => ({ mat, colorable: e.colorable, geo: mergeGeos(e.list.map(g => (g.index ? g : g))) }));
    set.meshes.forEach(m => { m.geo.computeBoundingSphere(); });
    return set;
  }

  // ---------------------------------------------------------------- 素材
  function fabric(color, tex, o = {}) {
    const m = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), roughness: o.rough ?? .86, metalness: 0, sheen: o.sheen ?? .5, sheenRoughness: .75, sheenColor: new THREE.Color(shade(color, 1.35)) });
    if (tex) { m.bumpMap = fabricTex(tex); m.bumpScale = o.bump ?? .7; }
    if (o.vc) m.vertexColors = true;
    return m;
  }
  function materials(o, set) {
    const OF = OUTFITS[set.ok], tc = o.color || '#8aa4c8', bc = o.suit ? (o.color || o.bottom) : o.bottom;
    const std = (color, rough = .5, metal = 0, ex = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: new THREE.Color(color), roughness: rough, metalness: metal }, ex));
    const skin = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.skin), roughness: .5, metalness: 0, sheen: .35, sheenRoughness: .55, sheenColor: new THREE.Color('#ffcdb8'), vertexColors: true });
    const hair = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.hair), roughness: .48, metalness: 0, map: hairTexture(), bumpMap: hairTexture(), bumpScale: 1.2, sheen: .45, sheenColor: new THREE.Color(shade(o.hair, 1.7)), sheenRoughness: .35, vertexColors: true, alphaHash: true });   // 生え際は頂点の不透明度で少しずつ透ける
    const eye = new THREE.MeshPhysicalMaterial({ map: eyeTexture(o.eye), roughness: .2, clearcoat: 1, clearcoatRoughness: .04 });
    const shoeC = o.shoe || '#2a2a2a', kind = OF.shoes;
    const sneaker = kind === 'sneaker' || kind === 'velcro';
    const shoe = sneaker ? fabric(shoeC, 'weave', { bump: .5, sheen: .3 }) : std(shoeC, kind === 'boot' ? .55 : .32, 0, { clearcoat: kind === 'boot' ? .2 : .7, clearcoatRoughness: .3, bumpMap: fabricTex('leather'), bumpScale: .3 });
    const tex = (key, t) => { const m = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .35, roughness: .6, polygonOffset: true, polygonOffsetFactor: -2 }); return m; };
    return {
      skin, hair, eye,
      lash: new THREE.MeshStandardMaterial({ color: new THREE.Color('#1c1410'), roughness: .7 }), brow: new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(o.hair, .85)), roughness: .8 }),
      top: fabric(tc, OF.top && OF.top.tex, { sheen: OF.top && OF.top.kind === 'jacket' ? .25 : .55 }),
      collar: fabric('#fbfbf8', 'weave'),
      bottom: fabric(bc, (OF.bottom || OF.skirt || {}).tex, { sheen: .3 }),
      sock: fabric((OF.socks && OF.socks.color) || '#f6f6f3', 'rib', { bump: .5 }),
      shoe, sole: std(kind === 'leather' ? '#3b2a20' : kind === 'pump' ? shade(shoeC, .8) : kind === 'boot' ? '#1d1d1f' : '#f4f2ee', kind === 'pump' || kind === 'leather' ? .45 : .8),
      lace: std(kind === 'leather' ? '#2b1d14' : kind === 'boot' ? '#222' : '#fafafa', .8), strap: std('#fafafa', .8),
      belt: std('#4a2f1d', .45, 0, { clearcoat: .4, bumpMap: fabricTex('leather'), bumpScale: .25 }), strapTan: std('#8a5a3a', .5, 0, { bumpMap: fabricTex('leather'), bumpScale: .25 }), strapDark: std('#2a2c30', .7),
      metal: std('#c9ccd1', .22, 1), gold: std('#d8b25a', .25, 1), button: std(shade(tc, .8), .35),
      zip: std('#3a3d42', .4, .6), frame: std('#2a2220', .35, .1, { clearcoat: .6 }), sframe: std('#2f4a6e', .4),
      lens: new THREE.MeshPhysicalMaterial({ color: new THREE.Color('#e8f2f6'), roughness: .04, metalness: 0, transparent: true, opacity: .2, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1 }),
      dialS: new THREE.MeshStandardMaterial({ map: dialTex(false), roughness: .3 }), dialG: new THREE.MeshStandardMaterial({ map: dialTex(true), roughness: .3 }),
      helmet: std(o.helmet || '#f1f3f6', .25, 0, { clearcoat: 1, clearcoatRoughness: .08 }), cross: tex('cross', crossTex()),
      pearl: std('#f6f1ea', .2, 0, { clearcoat: 1, sheen: 1, sheenColor: new THREE.Color('#ffe9f0') }),
      bag: std('#b07a4a', .42, 0, { clearcoat: .5, bumpMap: fabricTex('leather'), bumpScale: .3 }),
      rando: std(set.ok === 'girl' ? '#b0182a' : '#1c1c20', .3, 0, { clearcoat: 1, clearcoatRoughness: .15, bumpMap: fabricTex('leather'), bumpScale: .15 }),
      tagPlate: std('#fafafa', .35), tagBoy: tex('tb', tagTex('boy')), tagGirl: tex('tg', tagTex('girl')), tagBadge: tex('tw', tagTex('badge')),
      tie: std('#2a2a2e', .6), bow: fabric('#e2607a', 'weave', { sheen: .8, rough: .6 }),
      print: tex('print', bearTex()),
      glove: fabric(o.gloves || '#fbfaf6', 'knit', { bump: 1.2 }),
    };
  }

  // ---------------------------------------------------------------- 計算の順番待ち (画面を止めないよう 1 回 24ms ずつ進める)
  const _jobs = new Map();
  let _pumping = false;
  function _pump() {
    const t0 = performance.now();
    for (const [key, job] of _jobs) {
      try {
        let r;
        do { r = job.gen.next(); } while (!r.done && performance.now() - t0 < 24);
        if (r.done) { _geoCache.set(key, r.value); _jobs.delete(key); job.waiters.forEach(f => f(r.value)); }
      } catch (e) { console.warn('people: build failed', e); _jobs.delete(key); }
      if (performance.now() - t0 >= 24) break;
    }
    if (_jobs.size) setTimeout(_pump, 0); else _pumping = false;
  }
  function requestSet(key, o, type, cb) {
    let job = _jobs.get(key);
    if (!job) { job = { gen: geoGen(o, type), waiters: [] }; _jobs.set(key, job); }
    job.waiters.push(cb);
    if (!_pumping) { _pumping = true; setTimeout(_pump, 0); }
  }
  // 計算を待つ間の仮の姿 (簡単なマネキン)。胴は色替えの対象にして, 待つ間に変えた色を本体へ引き継ぐ
  function placeholder(opt, T, R, lift) {
    const h = opt.h, J = R.J, grp = new THREE.Group(), base = new THREE.MeshStandardMaterial({ color: new THREE.Color('#cfd4da'), roughness: .75 });
    const top = new THREE.MeshStandardMaterial({ color: new THREE.Color(opt.color || '#8aa4c8'), roughness: .8 });
    const seg = (a, b, r, m) => {
      const d = _sub(b, a), L = Math.hypot(d[0], d[1], d[2]), g = new THREE.CapsuleGeometry(r, Math.max(L, .001), 3, 10), mesh = new THREE.Mesh(g, m);
      mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]).normalize());
      grp.add(mesh); return mesh;
    };
    const t = seg([0, J.hips[1] - .02 * h, J.hips[2]], [0, J.neck[1] - .05 * h, J.neck[2]], T.torso.rib[1][0] * h * .95, top); t.userData.colorable = true;
    seg(J.neck, [0, R.neckCut, J.head[2]], T.neckR * h, base);
    const head = new THREE.Mesh(new THREE.SphereGeometry(R.hh * .45, 16, 12), base); head.position.set(0, R.HC[1], R.HC[2]); head.scale.set(.9, 1.05, 1); grp.add(head);
    ['L', 'R'].forEach(sd => {
      seg(J['upperArm' + sd], J['foreArm' + sd], T.armR[0] * h * .9, top); seg(J['foreArm' + sd], J['hand' + sd], T.armR[2] * h * .9, base);
      seg(J['thigh' + sd], J['shin' + sd], T.legR[0] * h * .8, base); seg(J['shin' + sd], J['foot' + sd], T.legR[2] * h * .9, base);
      const f = J['foot' + sd]; seg([f[0], .02 * h, f[2] - .03 * h], [f[0], .02 * h, f[2] + .09 * h], .022 * h, base);
    });
    grp.position.y = lift; grp.userData.placeholder = true;
    grp.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    return grp;
  }

  // ---------------------------------------------------------------- 人物
  function buildPerson(o = {}) {
    const opt = Object.assign({ h: 1.6, skin: '#f1c7a4', hair: '#3a2a1f', eye: '#4a3326', style: 'short', bottom: '#5b7fb0', shoe: '#2a2a2a' }, o);
    const type = typeOf(opt), ok = outfitKey(type, opt), key = JSON.stringify([type, opt.h, opt.style, ok]), T = TYPES[type], R = rig(T, opt.h), J = R.J, OF = OUTFITS[ok];
    const pose = OF.shoes ? shoePose({ h: opt.h, J }, OF.shoes) : { al: 0, lift: 0 };
    const g = new THREE.Group(), bones = {}, list = [];
    BONES.forEach(n => { const b = new THREE.Bone(); b.name = n; bones[n] = b; list.push(b); });
    BONES.forEach(n => { const p = PARENT[n], q = p ? _sub(J[n], J[p]) : J[n]; bones[n].position.set(q[0], q[1], q[2]); if (p) bones[p].add(bones[n]); });
    g.add(bones.hips); g.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(list);                                                // 逆行列はこの (骨の) 姿勢で決まる
    // ランドセルを背負う子は, 体 + ランドセルの外形が置き場所の中央に来るよう少し前に立たせる
    const zShift = OF.acc.includes('randoseru') ? .065 * opt.h / 1.34 : 0;
    bones.hips.position.z += zShift;
    // 立ち姿勢: 靴の高さだけ持ち上げ, かかとの高い靴では足首を伸ばす。腕は体から少し離して肘をわずかに曲げる
    bones.hips.position.y += pose.lift;
    bones.footL.rotation.x = bones.footR.rotation.x = pose.al;
    const ab = ok === 'woman' || ok === 'girl' ? .055 : ok === 'toddler' ? .05 : ok === 'worker' ? .008 : .018;
    bones.upperArmL.rotation.z = ab - ARM_OUT; bones.upperArmR.rotation.z = ARM_OUT - ab;
    bones.foreArmL.rotation.x = bones.foreArmR.rotation.x = -.14;
    g.updateMatrixWorld(true);
    const rigInfo = { bones, lids: [], type, ok, h: opt.h, thighV: _sub(J.shinL, J.thighL), shinV: _sub(J.footL, J.shinL), ready: false };
    g.userData.rig = rigInfo;
    // 当たり判定用の簡易形状 (見えない)。スキンメッシュの細かい当たり判定は重いので使わない
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 1, 12), new THREE.MeshBasicMaterial({ visible: false }));
    hit.scale.set(.24 * opt.h, opt.h * .98, .16 * opt.h); hit.position.set(0, opt.h * .49 + pose.lift, zShift); hit.userData.hitProxy = true; g.add(hit);
    const set = _geoCache.get(key);
    if (set) dress(g, set, opt, skeleton, rigInfo, null);
    else if (globalThis.__PEOPLE_SYNC) { const s2 = drain(geoGen(opt, type)); _geoCache.set(key, s2); dress(g, s2, opt, skeleton, rigInfo, null); }   // 検証ツール用: その場で計算しきる
    else { const ph = placeholder(opt, T, R, pose.lift); ph.position.z = zShift; g.add(ph); requestSet(key, opt, type, s2 => dress(g, s2, opt, skeleton, rigInfo, ph)); }
    return g;
  }
  buildPerson.pending = () => _jobs.size;
  // 計算済みの形に素材を付けて骨に結び付ける。仮の姿があれば, その間に変えられた色・影・選択の強調を引き継いで外す
  function dress(g, set, opt, skeleton, rigInfo, ph) {
    const R = set.R, J = R.J, hh = R.hh, bones = rigInfo.bones;
    let color = null, cast = true, recv = true, emis = null;
    if (ph) {
      ph.traverse(c => { if (!c.isMesh) return; if (c.userData.colorable) color = '#' + c.material.color.getHexString(); cast = c.castShadow; recv = c.receiveShadow; if (c.material.emissive && c.material.emissiveIntensity > 0) emis = [c.material.emissive.clone(), c.material.emissiveIntensity]; });
      g.remove(ph); ph.traverse(c => { if (c.isMesh) c.geometry.dispose(); });
    }
    const M = materials(color ? Object.assign({}, opt, { color }) : opt, set), made = [];
    set.meshes.forEach(pt => {
      const m = new THREE.SkinnedMesh(pt.geo, M[pt.mat] || M.metal); m.frustumCulled = false; m.name = pt.mat;
      m.raycast = () => {};                                                                   // 当たり判定は簡易形状で
      if (pt.colorable) m.userData.colorable = true;
      g.add(m); m.bind(skeleton, new THREE.Matrix4()); made.push(m);
    });
    // 目 (眼球 + 上まぶた + まつげ + 下まぶた) と眉 (先細りの掃引)
    const attach = (bone, obj, p) => { const q = _sub(p, J[bone]); obj.position.set(q[0], q[1], q[2]); bones[bone].add(obj); return obj; };
    const skinLid = M.skin.clone(); skinLid.vertexColors = false;
    set.eyes.forEach(e => {
      const eg = new THREE.Group(); attach('head', eg, e.c);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(e.r, 24, 16), M.eye); ball.rotation.x = Math.PI / 2; ball.rotation.y = -e.s * .06; eg.add(ball);
      const lid = new THREE.Group(); lid.rotation.x = -.42; eg.add(lid);
      lid.add(new THREE.Mesh(new THREE.SphereGeometry(e.r * 1.07, 24, 10, 0, Math.PI * 2, 0, Math.PI * .5), skinLid));
      const lash = new THREE.Mesh(new THREE.TorusGeometry(e.r * 1.075, e.r * (set.type === 'woman' ? .075 : .06), 6, 24, Math.PI * .9), M.lash); lash.rotation.set(Math.PI / 2, 0, Math.PI * .05); lid.add(lash);
      const low = new THREE.Mesh(new THREE.SphereGeometry(e.r * 1.05, 24, 6, 0, Math.PI * 2, Math.PI * .72, Math.PI * .28), skinLid); low.rotation.x = .25; eg.add(low);
      rigInfo.lids.push(lid); made.push(eg);
    });
    set.brows.forEach(pts => {
      const path = spline(pts.map(p => [p[0] - J.head[0], p[1] - J.head[1], p[2] - J.head[2]]), 18), n = path.length, w0 = set.F.browT * hh, prof = ellProf(1, .45, 8), pp = [], ix = [];
      path.forEach((p, i) => {
        const t = i / (n - 1), r = w0 * (1.25 - .75 * t) * (t < .08 ? .6 + 5 * t : 1);
        const a = path[Math.max(i - 1, 0)], b = path[Math.min(i + 1, n - 1)], T0 = _nrm(_sub(b, a)), N0 = _nrm(_sub([0, 0, 1], _mul(T0, T0[2]))), S0 = _cross(T0, N0);
        prof.forEach(([u, v]) => pp.push(p[0] + S0[0] * u * r + N0[0] * v * r, p[1] + S0[1] * u * r + N0[1] * v * r, p[2] + S0[2] * u * r + N0[2] * v * r));
      });
      for (let i = 0; i < n - 1; i++) for (let k = 0; k < 8; k++) { const k1 = (k + 1) % 8, a = i * 8 + k, b = i * 8 + k1, c = (i + 1) * 8 + k1, d = (i + 1) * 8 + k; ix.push(a, d, c, a, c, b); }
      const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); bg.setIndex(ix); bg.computeVertexNormals();
      const bm = new THREE.Mesh(bg, M.brow); bones.head.add(bm); made.push(bm);
    });
    made.forEach(o => o.traverse(c => {
      if (!c.isMesh) return; c.castShadow = cast; c.receiveShadow = recv;
      if (emis && c.material.emissive) { c.material = c.material.clone(); c.material.emissive.copy(emis[0]); c.material.emissiveIntensity = emis[1]; }
    }));
    rigInfo.ready = true;
  }

  // ---------------------------------------------------------------- 動き: クリックで 立つ → 手を振る → 歩く → おじぎ を切り替え。まばたき・呼吸は常に
  const POSE_BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR', 'upperArmL', 'upperArmR', 'foreArmL', 'foreArmR', 'handL', 'handR', 'thighL', 'thighR', 'shinL', 'shinR', 'footL', 'footR'];
  function personInteractor(g) {
    const rig = g.userData.rig; if (!rig) return null;
    const B = rig.bones, base = {}, cur = {}, kid = rig.type === 'child' || rig.type === 'toddler', skirtW = rig.ok === 'woman' || rig.ok === 'girl';
    POSE_BONES.forEach(n => { base[n] = B[n].quaternion.clone(); cur[n] = [0, 0, 0]; });
    const baseY = B.hips.position.y;
    const MODES = ['idle', 'wave', 'walk', 'bow'];
    let mode = 0, t = 0, clock = 0, nextBlink = 1.5 + Math.random() * 2, blinkT = -1;
    const e = new THREE.Euler(), q = new THREE.Quaternion();
    const target = () => {
      const P = {}; POSE_BONES.forEach(n => { P[n] = [0, 0, 0]; });
      const br = Math.sin(clock * 1.7) * .012;                                                 // 呼吸
      P.chest[0] -= br; P.neck[0] += br * .6; P.head[1] = .045 * Math.sin(clock * .41); P.head[0] = .02 * Math.sin(clock * .57);
      const m = MODES[mode];
      if (m === 'idle') { P.upperArmL[0] = .02 * Math.sin(clock * .8); P.upperArmR[0] = -.02 * Math.sin(clock * .8 + .5); }
      if (m === 'wave') {
        const w = Math.sin(t * 7.5);
        P.shoulderR = [0, 0, -.05]; P.upperArmR = [-.32, .1, -.42]; P.foreArmR = [-.35, 0, -2.15 + .28 * w]; P.handR = [0, .15 * w, -.12];   // ひじは下げたまま前腕を立てて振る
        P.head[2] = -.06; P.head[1] -= .1; P.chest[2] = -.02;
      }
      if (m === 'walk') {
        const f = kid ? 1.15 : .95, ph = t * Math.PI * 2 * f, s = Math.sin(ph), c = Math.cos(ph), A = skirtW ? .26 : .34, K = kid ? .8 : .72;
        P.thighL[0] = -A * s; P.thighR[0] = A * s;
        P.shinL[0] = K * Math.max(0, c) ** 2 + .06; P.shinR[0] = K * Math.max(0, -c) ** 2 + .06;
        P.footL[0] = -(P.thighL[0] + P.shinL[0]) - .15 * Math.max(0, c); P.footR[0] = -(P.thighR[0] + P.shinR[0]) - .15 * Math.max(0, -c);   // 足裏は床と平行, 振り出す足はつま先を上げる
        P.upperArmL[0] = .3 * s; P.upperArmR[0] = -.3 * s; P.foreArmL[0] = -.18 - .12 * Math.max(0, -s); P.foreArmR[0] = -.18 - .12 * Math.max(0, s);
        P.hips[1] = .07 * s; P.chest[1] = -.1 * s; P.spine[0] = .04; P.hips[2] = .03 * c;
      }
      if (m === 'bow') {
        const cyc = t % 4.2, k = cyc < .9 ? _ss(cyc, 0, .9) : cyc < 2.1 ? 1 : cyc < 3 ? 1 - _ss(cyc, 2.1, 3) : 0;
        P.spine[0] = .34 * k; P.chest[0] = .16 * k - br; P.neck[0] = .06 * k; P.upperArmL[0] = .42 * k; P.upperArmR[0] = .42 * k;
        P.upperArmL[2] = -.05 * k; P.upperArmR[2] = .05 * k; P.foreArmL[0] = -.1 * k; P.foreArmR[0] = -.1 * k;
      }
      return { P };
    };
    return {
      toggle() { mode = (mode + 1) % MODES.length; t = 0; },
      tick(dt) {
        t += dt; clock += dt;
        const { P } = target(), k = Math.min(1, dt * 7);
        POSE_BONES.forEach(n => { const c = cur[n], p = P[n]; c[0] += (p[0] - c[0]) * k; c[1] += (p[1] - c[1]) * k; c[2] += (p[2] - c[2]) * k; e.set(c[0], c[1], c[2]); q.setFromEuler(e); B[n].quaternion.copy(base[n]).multiply(q); });
        // 低い方の足首が立ち姿勢の高さに来るよう腰の高さを決める (脚を開くと腰が下がり, 足は床に付いたまま)
        const ank = (a, b) => rig.thighV[1] * Math.cos(a) - rig.thighV[2] * Math.sin(a) + rig.shinV[1] * Math.cos(a + b) - rig.shinV[2] * Math.sin(a + b);
        B.hips.position.y = baseY + (rig.thighV[1] + rig.shinV[1]) - Math.min(ank(cur.thighL[0], cur.shinL[0]), ank(cur.thighR[0], cur.shinR[0]));
        // まばたき
        if (blinkT < 0 && clock > nextBlink) { blinkT = 0; nextBlink = clock + 2.2 + Math.random() * 3.5; }
        let lid = -.42;
        if (blinkT >= 0) { blinkT += dt; const u = blinkT / .16; lid = -.42 + 1.27 * (u < .5 ? u * 2 : Math.max(0, 2 - u * 2)); if (u >= 1) blinkT = -1; }
        rig.lids.forEach(l => { l.rotation.x = lid; });
      },
      get mode() { return MODES[mode]; },
    };
  }

  return { buildPerson, personInteractor };
})();
const buildPerson = PEOPLE.buildPerson, personInteractor = PEOPLE.personInteractor;

export { buildPerson, personInteractor };
