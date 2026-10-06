import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost, bedding } from '../core/helpers.js';

// ============================================================================
// kawaii.js — 可愛い系アイテム & 人物バリエーション (キッズ向け)
// 規約: 「使う面」「正面(顔)」をローカル +Z に向ける。
// ============================================================================

// パステル基調パレット
const PASTEL = { pink:'#f7a8c4', rose:'#ef7fa6', lav:'#c9b3ec', mint:'#a9e7cf', sky:'#a9d8f0',
  butter:'#ffe9a8', peach:'#ffcbb0', coral:'#ff9aa2', cream:'#fff3e2', white:'#fbf7f2' };

function sph(r, material, x = 0, y = 0, z = 0, segs = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, segs, segs), material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m;
}
// 丸みのある手足用カプセル
function cap(r, len, material, x = 0, y = 0, z = 0, rz = 0, rx = 0, seg = 10) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 5, seg), material);
  m.position.set(x, y, z); if (rz) m.rotation.z = rz; if (rx) m.rotation.x = rx;
  m.castShadow = m.receiveShadow = true; return m;
}

// ---------------------------------------------------------------- 人物
// 顔は +Z 向き。h = 身長 (足裏〜頭頂, 髪・保護帽のボリュームは含まない)。
// 体型は年齢で切り替える: 大人 (約7.7頭身) / 小学生 (headBig, 約6頭身) / 幼児 (headBig かつ h<1m, 約4.9頭身)。
// 胴・首・頭・手足は回転体 (LatheGeometry) の滑らかな形で作り、関節で太さをそろえて継ぎ目を目立たせない。
// 女性 (skirt) は肩幅を狭く・腰を広く・ウエストを細く。寸法はすべて身長に対する比率で持つ。
const _PUP = new THREE.Vector3(0, 1, 0), _PDN = new THREE.Vector3(0, -1, 0);
function _lathe(pts, seg = 20) { return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)), seg); }
function _pm(geo, material) { const m = new THREE.Mesh(geo, material); m.castShadow = m.receiveShadow = true; return m; }
// a → b を結ぶ先細りの丸棒 (両端は半球状, mid だけ中ほどをふくらませる)
function _limb(a, b, r0, r1, material, { mid = 0, seg = 14 } = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz) || 1e-6;
  const pts = [];
  for (let i = 0; i <= 4; i++) { const t = i / 4 * Math.PI / 2; pts.push([r0 * Math.sin(t), -r0 * 0.8 * Math.cos(t)]); }
  for (let i = 1; i < 10; i++) { const t = i / 10; pts.push([r0 + (r1 - r0) * t + mid * Math.sin(Math.PI * t), len * t]); }
  for (let i = 0; i <= 4; i++) { const t = i / 4 * Math.PI / 2; pts.push([r1 * Math.cos(t), len + r1 * 0.8 * Math.sin(t)]); }
  const m = _pm(_lathe(pts, seg), material);
  m.position.set(a[0], a[1], a[2]);
  m.quaternion.setFromUnitVectors(_PUP, new THREE.Vector3(dx / len, dy / len, dz / len));
  return m;
}
function _ell(rx, ry, rz, material, x, y, z, seg = 16) { const m = _pm(new THREE.SphereGeometry(1, seg, Math.max(8, seg * 0.75 | 0)), material); m.scale.set(rx, ry, rz); m.position.set(x, y, z); return m; }
// 制御点 [[y, r], ...] を滑らかにつないだ半径 r(y)
function _prof(ctrl) {
  return y => {
    if (y <= ctrl[0][0]) return ctrl[0][1];
    for (let i = 1; i < ctrl.length; i++) if (y <= ctrl[i][0]) {
      const [y0, r0] = ctrl[i - 1], [y1, r1] = ctrl[i], t = (y - y0) / (y1 - y0), s = t * t * (3 - 2 * t);
      return r0 + (r1 - r0) * s;
    }
    return ctrl[ctrl.length - 1][1];
  };
}
function buildPerson({ h = 1.6, skin = '#f4cba0', hair = '#4a3526', style = 'short',
  color, top, bottom = '#5b7fb0', skirt = false, bag = null, headBig = false, shoe = '#e2607a',
  ribbon = '#ef7fa6', eye = '#5a4636',
  adult = false, helmet = null, jacket = false, cargo = false, gloves = null, boots = false, suit = false } = {}) {
  const g = new THREE.Group();
  const kind = headBig ? (h < 1.0 ? 'toddler' : 'child') : 'adult', fem = !!skirt;
  const kid = kind !== 'adult';
  // ---- 体型 (身長比) ----
  const K = {
    adult:   { head: 0.130, hipY: 0.505, crotch: 0.465, waist: 0.615, chest: 0.72, shY: 0.805, neckY: 0.845, shX: fem ? 0.092 : 0.1, hipX: fem ? 0.054 : 0.05,
               kneeY: 0.285, ankY: 0.042, arm: [0.186, 0.146, 0.108], armR: fem ? 0.88 : 1, depth: 0.66, sx: 0.80 },
    child:   { head: 0.165, hipY: 0.475, crotch: 0.44, waist: 0.59, chest: 0.68, shY: 0.775, neckY: 0.805, shX: 0.098, hipX: 0.052,
               kneeY: 0.268, ankY: 0.045, arm: [0.17, 0.14, 0.1], armR: 1.0, depth: 0.72, sx: 0.85 },
    toddler: { head: 0.205, hipY: 0.40, crotch: 0.37, waist: 0.52, chest: 0.615, shY: 0.715, neckY: 0.765, shX: 0.104, hipX: 0.058,
               kneeY: 0.215, ankY: 0.05, arm: [0.15, 0.12, 0.09], armR: 1.22, depth: 0.8, sx: 0.9 },
  }[kind];
  const H = v => v * h;
  // 胴の半幅 r(y) (身長比)。奥行きは depth 倍の楕円断面
  const torsoCtrl = {
    adult: fem ? [[K.crotch - 0.02, 0], [K.crotch, 0.07], [0.525, 0.106], [0.565, 0.094], [K.waist, 0.074], [0.68, 0.084], [K.chest, 0.088], [0.775, 0.088], [K.shY, 0.082], [K.neckY - 0.016, 0.058], [K.neckY, 0.035]]
               : [[K.crotch - 0.02, 0], [K.crotch, 0.072], [0.52, 0.097], [0.565, 0.09], [K.waist, 0.084], [0.67, 0.092], [K.chest, 0.098], [0.775, 0.1], [K.shY, 0.09], [K.neckY - 0.016, 0.066], [K.neckY, 0.04]],
    child:   [[K.crotch - 0.02, 0], [K.crotch, 0.07], [0.5, 0.086], [K.waist, 0.08], [K.chest, 0.086], [0.745, 0.09], [K.shY, 0.08], [K.neckY - 0.012, 0.05], [K.neckY, 0.036]],
    toddler: [[K.crotch - 0.02, 0], [K.crotch, 0.08], [0.43, 0.1], [K.waist, 0.106], [K.chest, 0.1], [0.69, 0.098], [K.shY, 0.086], [K.neckY - 0.014, 0.06], [K.neckY, 0.045]],
  }[kind];
  const tr = _prof(torsoCtrl);
  const zf = y => tr(y) * K.depth * h;                 // 胴の前面 z (y: 身長比)
  // ---- 素材 ----
  const topCol = color || top || '#ff9aa2';            // 服 (colorable) はカラーピッカー対応
  const skinM = mat(skin, 0.55, 0.0), skinD = mat(shade(skin, 0.86), 0.6), topM = fabricMat(topCol), botM = fabricMat(bottom),
        hairM = mat(hair, 0.46, 0.08), shoeM = mat(shoe, 0.42, 0.1), soleM = mat('#2c2c2e', 0.85),
        darkM = mat('#2a2d31', 0.55), metalM = mat('#cdd2d8', 0.32, 0.8), lashM = mat('#241914', 0.6);
  hairM.side = THREE.DoubleSide;
  const gloveM = gloves ? fabricMat(gloves) : null;    // 軍手
  const legM = suit ? topM : (skirt ? skinM : botM);  // 作業着 = 上着と同色 / スカートなら素肌
  const cb = (m, on = true) => { if (on) m.userData.colorable = true; return m; };

  // ---- 胴 (腰〜ウエスト = 下衣, ウエスト〜首 = 上衣) ----
  const torsoPart = (y0, y1, material, n) => {
    const pts = []; for (let i = 0; i <= n; i++) { const y = y0 + (y1 - y0) * i / n; pts.push([tr(y) * h, y * h]); }
    const m = _pm(_lathe(pts, 28), material); m.scale.set(1, 1, K.depth); return m;
  };
  const beltY = K.waist + 0.012;
  g.add(cb(torsoPart(K.crotch - 0.02, beltY, suit ? topM : botM, 14), suit || skirt));
  g.add(cb(torsoPart(beltY - 0.004, K.neckY, topM, 22)));
  if (!suit && !skirt && kind !== 'toddler') {                      // ベルト
    const bt = _pm(new THREE.CylinderGeometry(tr(beltY) * h * 1.02, tr(beltY) * h * 1.02, 0.022 * h, 28, 1, true), mat('#2b2420', 0.5, 0.1));
    bt.scale.set(1, 1, K.depth); bt.position.y = beltY * h; g.add(bt);
    if (adult) g.add(box(0.03 * h, 0.018 * h, 0.006 * h, metalM, 0, beltY * h, zf(beltY) * 1.02 + 0.002));
  }
  // ---- 脚 (太もも・すね) と 靴 ----
  const lr = { adult: [0.05, 0.032, 0.033, 0.02], child: [0.05, 0.033, 0.034, 0.022], toddler: [0.07, 0.05, 0.051, 0.035] }[kind];
  [-1, 1].forEach(sgn => {
    const hip = [sgn * K.hipX * h, K.hipY * h, 0], knee = [sgn * (K.hipX + 0.004) * h, K.kneeY * h, 0.004 * h], ank = [sgn * (K.hipX + 0.007) * h, (K.ankY + 0.012) * h, -0.006 * h];
    const pant = !skirt;                                              // ズボンの裾はまっすぐ下へ
    g.add(cb(_limb(hip, knee, lr[0] * h, lr[1] * h, legM, { mid: 0.004 * h }), suit));
    g.add(cb(_limb(knee, ank, lr[2] * h * (pant ? 1.04 : 1), (pant ? Math.max(lr[3], 0.028) : lr[3]) * h, legM, { mid: (pant ? 0.002 : 0.006) * h }), suit));
    if (cargo) {                                                      // カーゴポケット (太もも外側 + フラップ)
      const py = (K.hipY * 0.45 + K.kneeY * 0.55) * h, px = sgn * (K.hipX + lr[0] * 0.95) * h;
      g.add(cb(_pm(roundedBoxGeom(0.022 * h, 0.075 * h, 0.06 * h, 0.008 * h, 2), legM).translateX(px).translateY(py), suit));
      g.add(cb(box(0.026 * h, 0.016 * h, 0.064 * h, legM, px, py + 0.042 * h, 0), suit));
    }
    // 靴 (かかと = 足首の真下, つま先は前方)
    const fl = { adult: 0.152, child: 0.15, toddler: 0.16 }[kind] * h, fw = { adult: 0.056, child: 0.058, toddler: 0.07 }[kind] * h, fh = 0.045 * h;
    const fx = ank[0], fz = ank[2] + fl * 0.3;
    if (boots) {                                                      // 安全靴 (先芯キャップ + 履き口)
      const bm = mat('#16120f', 0.42, 0.18);
      g.add(_pm(roundedBoxGeom(fw * 1.14, fh * 1.25, fl * 1.04, fw * 0.45, 3), bm).translateX(fx).translateY(fh * 0.68).translateZ(fz));
      g.add(_pm(roundedBoxGeom(fw * 1.08, fh * 0.75, fl * 0.3, fw * 0.35, 2), mat('#26221e', 0.3, 0.35)).translateX(fx).translateY(fh * 0.5).translateZ(fz + fl * 0.37));
      g.add(_limb([fx, fh * 0.9, ank[2] - 0.004 * h], [fx, (K.ankY + 0.06) * h, ank[2] - 0.004 * h], fw * 0.6, fw * 0.62, bm));
      const bs = _pm(roundedBoxGeom(fw * 1.2, fh, fl * 1.06, fw * 0.5, 3), soleM); bs.scale.y = 0.012 * h / fh; bs.position.set(fx, 0.006 * h, fz); g.add(bs);   // 靴底 (平面の角も丸く)
    } else {
      g.add(_pm(roundedBoxGeom(fw, fh, fl, fw * 0.48, 3), shoeM).translateX(fx).translateY(fh * 0.55 + 0.008 * h).translateZ(fz));
      const so = _pm(roundedBoxGeom(fw * 1.05, fh, fl * 1.01, fw * 0.48, 3), soleM); so.scale.y = 0.011 * h / fh; so.position.set(fx, 0.0055 * h, fz); g.add(so);   // 靴底
      g.add(_ell(fw * 0.32, 0.006 * h, fl * 0.2, mat(shade(shoe, 0.6), 0.6), fx, fh + 0.006 * h, fz - fl * 0.12, 12));   // 履き口
    }
  });
  // ---- スカート (ウエストから裾へ広がる。裾に濃い縁) ----
  if (skirt) {
    const hemY = (kind === 'adult' ? 0.335 : 0.37) * h, wy = (K.waist + 0.015) * h, wr = tr(K.waist + 0.015) * h * 1.04, hr0 = (kind === 'adult' ? 0.15 : 0.16) * h;
    const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push([wr + (hr0 - wr) * Math.pow(t, 0.8), wy + (hemY - wy) * t]); }
    const sk = _pm(_lathe(pts.reverse(), 40), botM); sk.material.side = THREE.DoubleSide; sk.scale.set(1, 1, 0.82); g.add(cb(sk));
    const hm = _pm(new THREE.TorusGeometry(hr0, 0.006 * h, 6, 40), mat(shade(bottom, 0.78), 0.8)); hm.rotation.x = Math.PI / 2; hm.position.y = hemY; hm.scale.set(1, 0.82, 1); g.add(hm);
  }
  // ---- 腕 (肩→肘→手首, 前腕はわずかに前へ) + 袖 + 手 ----
  const ar = { adult: [0.027, 0.021, 0.0205, 0.0145], child: [0.026, 0.02, 0.0195, 0.015], toddler: [0.028, 0.023, 0.022, 0.018] }[kind].map(v => v * K.armR);
  [-1, 1].forEach(sgn => {
    const S = [sgn * K.shX * h, (K.shY - 0.012) * h, -0.004 * h];
    const E = [S[0] + sgn * 0.014 * h, S[1] - K.arm[0] * h, S[2] - 0.006 * h];
    const W = [E[0] + sgn * 0.006 * h, E[1] - K.arm[1] * h * 0.97, E[2] + K.arm[1] * h * 0.23];
    const longSleeve = jacket;
    g.add(cb(_limb(S, E, ar[0] * h, ar[1] * h, longSleeve ? topM : skinM, { mid: 0.002 * h }), longSleeve));
    g.add(cb(_limb(E, W, ar[2] * h, ar[3] * h, longSleeve ? topM : skinM, { mid: 0.0035 * h }), longSleeve));
    if (!longSleeve) {                                                // 半袖: 上腕の上半分を覆う
      const se = [S[0] + (E[0] - S[0]) * 0.5, S[1] + (E[1] - S[1]) * 0.5, S[2] + (E[2] - S[2]) * 0.5];
      g.add(cb(_limb(S, se, ar[0] * h * 1.22, ar[0] * h * 1.12, topM)));
    } else {                                                          // 長袖の袖口
      const cw = [W[0] - (W[0] - E[0]) * 0.1, W[1] - (W[1] - E[1]) * 0.1, W[2] - (W[2] - E[2]) * 0.1];
      g.add(cb(_limb(cw, W, ar[3] * h * 1.2, ar[3] * h * 1.18, topM)));
    }
    // 手: 手のひらは太もも側 (内向き)。指をそろえて軽く曲げ、親指は前へ
    const hm = gloveM || skinM, hl = K.arm[2] * h;
    const hand = new THREE.Group(); hand.position.set(W[0], W[1], W[2]);
    const dl = Math.hypot(W[0] - E[0], W[1] - E[1], W[2] - E[2]);
    hand.quaternion.setFromUnitVectors(_PDN, new THREE.Vector3((W[0] - E[0]) / dl, (W[1] - E[1]) / dl, (W[2] - E[2]) / dl));
    const gk = gloveM ? 1.12 : 1;                                     // 軍手は少し厚く
    hand.add(_ell(0.11 * hl * gk, 0.3 * hl, 0.235 * hl * gk, hm, 0, -0.27 * hl, 0, 14));               // 手のひら
    const fg = _ell(0.085 * hl * gk, 0.3 * hl, 0.21 * hl * gk, hm, -sgn * 0.015 * hl, -0.66 * hl, 0.03 * hl, 14); fg.rotation.x = 0.25; hand.add(fg);   // 指
    hand.add(_limb([-sgn * 0.05 * hl, -0.16 * hl, 0.15 * hl], [-sgn * 0.09 * hl, -0.44 * hl, 0.25 * hl], 0.065 * hl * gk, 0.055 * hl * gk, hm));      // 親指
    if (gloveM) hand.add(_limb([0, 0.03 * hl, 0], [0, -0.1 * hl, 0], 0.15 * hl, 0.15 * hl, gloveM));                                   // 手首のリブ
    g.add(hand);
  });
  // ---- 首 ----
  const hh = K.head * h, hc = h - hh / 2;                            // 頭の高さ (あご〜頭頂) ・中心
  const nr = { adult: fem ? 0.029 : 0.035, child: 0.031, toddler: 0.04 }[kind] * h;
  g.add(_limb([0, (K.neckY - 0.02) * h, -0.004 * h], [0, hc - hh * 0.36, -0.03 * hh], nr, nr * 0.95, skinM));
  // ---- 頭 (卵形の回転体: 横幅 sx・奥行き 1.0) ----
  const headCtrl = kind === 'adult'
    ? [[-0.5, 0], [-0.485, 0.15], [-0.44, 0.26], [-0.34, 0.34], [-0.2, 0.385], [-0.05, 0.41], [0.08, 0.42], [0.22, 0.405], [0.34, 0.36], [0.435, 0.27], [0.49, 0.14], [0.5, 0]]
    : [[-0.5, 0], [-0.48, 0.17], [-0.42, 0.29], [-0.31, 0.37], [-0.16, 0.415], [0.0, 0.435], [0.14, 0.44], [0.27, 0.42], [0.37, 0.37], [0.45, 0.27], [0.495, 0.14], [0.5, 0]];
  const hp = _prof(headCtrl), SX = K.sx;
  const head = _pm(_lathe(headCtrl.map(([y, r]) => [r * hh, y * hh]), 32), skinM); head.scale.set(SX, 1, 1); head.position.y = hc; g.add(head);
  const fzH = (x, y) => Math.sqrt(Math.max(0, hp(y) ** 2 - (x / SX) ** 2)) * hh;   // 顔の表面 z (x, y: 頭の高さ比)
  const P = (x, y, dz = 0) => {                                     // 顔の表面の点から法線方向へ dz (頭の高さ比)
    const X = x * hh, Z = fzH(x, y), nx = X / (SX * SX), nl = Math.hypot(nx, Z) || 1;
    return [X + nx / nl * dz * hh, hc + y * hh, Z + Z / nl * dz * hh];
  };
  const yaw = x => Math.atan2(x * hh / (SX * SX), fzH(x, 0));          // 顔の表面の向き (左右)
  // 耳
  [-1, 1].forEach(sgn => {
    const ey = kind === 'adult' ? -0.04 : -0.07, ex = sgn * hp(ey) * SX * hh * 0.98;
    const ear = _ell(0.028 * hh, 0.1 * hh, 0.06 * hh, skinM, ex, hc + ey * hh, -0.03 * hh, 12); ear.rotation.y = sgn * 0.35; g.add(ear);
    g.add(_ell(0.012 * hh, 0.06 * hh, 0.032 * hh, skinD, ex + sgn * 0.016 * hh, hc + ey * hh, -0.02 * hh, 10));
  });
  // 目 (白目・虹彩・瞳孔・ハイライト・上まぶたのライン)
  const F = {
    adult:   { ey: 0.0,   ex: 0.138, ew: 0.066, eh: fem ? 0.032 : 0.027, ir: 0.032, by: 0.12, bw: 0.12, bt: fem ? 0.017 : 0.022, ny: -0.1, nl: 0.1, my: -0.235, mw: fem ? 0.075 : 0.085, lip: fem ? '#c46a6e' : '#b0726a' },
    child:   { ey: -0.03, ex: 0.15,  ew: 0.075, eh: 0.045, ir: 0.04,  by: 0.1,  bw: 0.11, bt: 0.015, ny: -0.135, nl: 0.07, my: -0.245, mw: 0.07, lip: '#cf7b7e' },
    toddler: { ey: -0.06, ex: 0.16,  ew: 0.08,  eh: 0.055, ir: 0.045, by: 0.065,bw: 0.1,  bt: 0.013, ny: -0.16, nl: 0.055, my: -0.26, mw: 0.06, lip: '#d8848a' },
  }[kind];
  const scleraM = mat('#fbfaf6', 0.28), irisM = mat(eye, 0.3, 0.05), pupilM = mat('#0f0b09', 0.3), hiM = mat('#ffffff', 0.15);
  [-1, 1].forEach(sgn => {
    const x = sgn * F.ex, p = P(x, F.ey, -0.012);
    const ry = yaw(x), eyeP = (dz, r1, r2, r3, m, dx = 0, dy = 0, seg = 14) => { const q = P(x + dx, F.ey + dy, dz); const e = _ell(r1 * hh, r2 * hh, r3 * hh, m, q[0], q[1], q[2], seg); e.rotation.y = ry; g.add(e); };
    eyeP(-0.012, F.ew, F.eh, 0.03, scleraM, 0, 0, 16);
    eyeP(0.014, F.ir, F.ir * 1.04, 0.01, irisM, 0, 0.002);
    eyeP(0.019, F.ir * 0.48, F.ir * 0.5, 0.008, pupilM, 0, 0.002, 12);
    eyeP(0.024, F.ir * 0.22, F.ir * 0.22, 0.006, hiM, -sgn * 0.01, F.ir * 0.4, 8);
    const lidTop = P(x + sgn * F.ew * 0.1, F.ey + F.eh * 1.0, -0.002);   // 上まぶた (まつげのライン): 目頭→最上部→目じりの弧
    g.add(_limb(P(x - sgn * F.ew * 0.92, F.ey + F.eh * 0.35, -0.006), lidTop, 0.006 * hh, 0.008 * hh, lashM, { seg: 8 }));
    g.add(_limb(lidTop, P(x + sgn * F.ew * 0.98, F.ey + F.eh * 0.3, -0.006), 0.008 * hh, (fem ? 0.008 : 0.006) * hh, lashM, { seg: 8 }));
    const brow = _limb(P(x - sgn * F.bw * 0.45, F.by, -0.004), P(x + sgn * F.bw * 0.55, F.by - 0.01, -0.004), F.bt * hh * 0.6, F.bt * hh * 0.4, hairM, { mid: F.bt * hh * 0.2, seg: 8 });
    g.add(brow);
    if (kid) { const bl = P(sgn * F.ex * 1.15, F.my + 0.09, -0.01); g.add(_ell(0.06 * hh, 0.03 * hh, 0.015 * hh, mat('#f3a7ad', 0.7), bl[0], bl[1], bl[2], 12)); }   // 頬
  });
  // 鼻 (鼻すじ + 小鼻)
  const nb = P(0, F.ny + F.nl * 0.5, -0.01), nt = P(0, F.ny, 0.035 * (kind === 'adult' ? 1 : 0.6));
  g.add(_limb(nb, nt, 0.03 * hh, (kind === 'adult' ? 0.04 : 0.036) * hh, skinM, { seg: 10 }));
  const nw = kind === 'adult' ? 1 : 0.7;
  [-1, 1].forEach(sgn => { const w = P(sgn * 0.045 * nw, F.ny - 0.012, -0.004); g.add(_ell(0.024 * hh * nw, 0.018 * hh * nw, 0.018 * hh * nw, skinM, w[0], w[1], w[2], 10)); });
  // 口 (上唇・下唇・口角のライン, 子供は少し笑顔)
  const lipM = mat(F.lip, 0.45), up = P(0, F.my + 0.012, -0.006), lo = P(0, F.my - 0.014, -0.004);
  const ul = _ell(F.mw * 0.5 * hh, 0.012 * hh, 0.018 * hh, lipM, up[0], up[1], up[2], 12); g.add(ul);
  const ll = _ell(F.mw * 0.44 * hh, 0.016 * hh, 0.02 * hh, lipM, lo[0], lo[1], lo[2], 12); g.add(ll);
  const ml = new THREE.Mesh(new THREE.TorusGeometry(F.mw * 0.5 * hh, 0.0035 * hh, 4, 16, Math.PI), mat('#6e3b37', 0.6));
  ml.rotation.x = Math.PI; ml.scale.set(1, kid ? 0.35 : 0.12, 1); const mp = P(0, F.my + 0.002, 0.004); ml.position.set(mp[0], mp[1] + (kid ? 0.01 * hh : 0.002 * hh), mp[2]); g.add(ml);
  // ---- 髪: 頭の回転体に沿った殻 (頭頂・側頭部・後頭部・前髪を扇形の回転体で) + スタイル別のパーツ ----
  // LatheGeometry の角度 φ は +Z (顔) が 0。顔の前を避けて扇形にする
  const hairShell = (yCut, phiS, phiL, th, tail = []) => {
    const k = (0.5 + th) / 0.5, pts = tail.map(([y, r]) => [r * hh, y * hh]), n = 16;   // 頭の輪郭を外へ k 倍した滑らかな殻
    for (let i = 0; i <= n; i++) { const y = yCut / k + (0.5 - yCut / k) * i / n; pts.push([hp(y) * k * hh, y * k * hh]); }
    const m = _pm(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r, 0), y)), 36, phiS, phiL), hairM);
    m.scale.set(SX, 1, 1); m.position.y = hc; g.add(m); return m;
  };
  const longHair = style === 'long', th = kid ? 0.03 : 0.028, PI = Math.PI;
  if (!helmet) hairShell(kid ? 0.25 : 0.3, 0, 2 * PI, th);                           // 頭頂 (額の生え際まで)
  if (longHair) {                                                                    // ロング: 顔の横から背中へ流れる
    const rb = hp(-0.2) + th;
    hairShell(-0.2, 0.27 * PI, 1.46 * PI, th, [[-1.08, rb + 0.03], [-0.95, rb + 0.05], [-0.6, rb + 0.05], [-0.35, rb + 0.02]]);
  } else {
    hairShell(0.08, 0.3 * PI, 1.4 * PI, th);                                         // 側頭部 (耳の上まで)
    hairShell(-0.3, 0.62 * PI, 0.76 * PI, th);                                       // 後頭部 (うなじまで)
  }
  if (!helmet && (kid || fem)) hairShell(kid ? 0.13 : 0.19, 1.62 * PI, 0.76 * PI, th + 0.012);   // 前髪 (眉の上で切りそろえる)
  if (style === 'twin') {                                            // ツインテール (結び目にリボン)
    [-1, 1].forEach(sgn => {
      const tx = sgn * (hp(0.1) + th) * SX * hh, ty = hc + 0.1 * hh;
      g.add(_ell(0.055 * hh, 0.05 * hh, 0.05 * hh, mat(ribbon, 0.5), tx + sgn * 0.02 * hh, ty, -0.06 * hh, 12));
      g.add(_limb([tx + sgn * 0.05 * hh, ty - 0.03 * hh, -0.08 * hh], [tx + sgn * 0.16 * hh, ty - 0.78 * hh, -0.12 * hh], 0.1 * hh, 0.045 * hh, hairM, { mid: 0.035 * hh }));
    });
  } else if (style === 'pony') {
    const bz = -(hp(0.1) + th) * hh;
    g.add(_ell(0.05 * hh, 0.05 * hh, 0.05 * hh, mat(ribbon, 0.5), 0, hc + 0.1 * hh, bz - 0.02 * hh, 12));
    g.add(_limb([0, hc + 0.06 * hh, bz - 0.05 * hh], [0, hc - 0.7 * hh, bz - 0.12 * hh], 0.09 * hh, 0.04 * hh, hairM, { mid: 0.03 * hh }));
  } else if (style === 'bun') {
    g.add(_ell(0.17 * hh, 0.15 * hh, 0.17 * hh, hairM, 0, hc + 0.5 * hh, -0.12 * hh, 16));
  }
  const hcx = { rx: (hp(0.08) + th) * SX, rz: hp(0.08) + th };
  // ---- 保護帽 (ヘルメット) + 顎紐 ----
  if (helmet) {
    const helmM = mat(helmet, 0.3, 0.05), R = hcx.rz * hh + 0.03 * hh, by = hc + 0.2 * hh;
    const dome = _pm(new THREE.SphereGeometry(R, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), helmM); dome.position.set(0, by, -0.01 * hh); dome.scale.set(hcx.rx / hcx.rz * 1.06, 0.92, 1.06); g.add(dome);
    const rib = _pm(new THREE.TorusGeometry(R * 0.995, 0.022 * hh, 6, 28, Math.PI), helmM);   // 中央リブ (前後に一本)
    rib.rotation.y = Math.PI / 2; rib.position.set(0, by, -0.01 * hh); rib.scale.set(1, 0.92, 1.06); g.add(rib);
    const brim = _pm(new THREE.CylinderGeometry(R * 1.08, R * 1.1, 0.03 * hh, 32), helmM); brim.position.set(0, by + 0.01 * hh, 0.05 * hh); brim.scale.set(hcx.rx / hcx.rz * 1.08, 1, 1.12); g.add(brim);
    const band = _pm(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.07 * hh, 32, 1, true), darkM);   // 内装 (ヘッドバンド)
    band.position.set(0, by - 0.025 * hh, -0.01 * hh); band.scale.set(hcx.rx / hcx.rz * 1.02, 1, 1.04); band.material.side = THREE.DoubleSide; g.add(band);
    const chin = P(0, -0.47, 0.012);                                  // 顎紐: 耳の前を通ってあごの下へ
    [-1, 1].forEach(sgn => g.add(_limb([sgn * (hp(0.05) + 0.01) * SX * hh, by - 0.04 * hh, 0.08 * hh], [sgn * 0.09 * hh, chin[1] - 0.01 * hh, chin[2] - 0.03 * hh], 0.008 * hh, 0.008 * hh, darkM, { seg: 6 })));
    g.add(box(0.07 * hh, 0.03 * hh, 0.02 * hh, darkM, 0, chin[1] - 0.012 * hh, chin[2] - 0.02 * hh));
  }
  // ---- 作業着ジャケット (開襟・中央ファスナー・胸ポケット・裾ベルト・腕ポケット) ----
  if (jacket) {
    const cy = K.chest * h;
    [-1, 1].forEach(sgn => {                                          // 開襟 (左右)
      const c = box(0.05 * h, 0.045 * h, 0.008 * h, topM, sgn * 0.03 * h, (K.neckY - 0.022) * h, zf(K.neckY - 0.03) + 0.004 * h);
      c.rotation.z = sgn * 0.55; c.rotation.x = -0.35; g.add(cb(c));
    });
    g.add(box(0.012 * h, (K.neckY - 0.04 - K.waist) * h, 0.004 * h, metalM, 0, ((K.neckY - 0.04 + K.waist) / 2) * h, zf(K.chest) + 0.003 * h));   // ファスナー
    [-1, 1].forEach(sgn => {                                          // 胸ポケット (フラップ + ボタン)
      const px = sgn * 0.042 * h, pz = zf(K.chest + 0.01) + 0.002 * h;
      g.add(cb(box(0.048 * h, 0.05 * h, 0.006 * h, topM, px, cy + 0.005 * h, pz)));
      g.add(cb(box(0.052 * h, 0.016 * h, 0.009 * h, topM, px, cy + 0.032 * h, pz + 0.002 * h)));
      g.add(_ell(0.004 * h, 0.004 * h, 0.003 * h, darkM, px, cy + 0.028 * h, pz + 0.007 * h, 8));
    });
    const hem = _pm(new THREE.CylinderGeometry(tr(K.waist + 0.02) * h * 1.04, tr(K.waist + 0.02) * h * 1.04, 0.03 * h, 28), topM);
    hem.scale.set(1, 1, K.depth); hem.position.y = (K.waist + 0.02) * h; g.add(cb(hem));   // 裾ベルト
    g.add(box(0.016 * h, 0.016 * h, 0.006 * h, darkM, 0, (K.waist + 0.02) * h, zf(K.waist + 0.02) * 1.04 + 0.002 * h));
    // 反射テープ (胸の高さを一周)
    const rt = _pm(new THREE.CylinderGeometry(tr(K.chest - 0.05) * h * 1.012, tr(K.chest - 0.05) * h * 1.012, 0.012 * h, 28, 1, true), mat('#d9dde0', 0.25, 0.6, { env: 1.1 }));
    rt.scale.set(1, 1, K.depth * 1.01); rt.position.y = (K.chest - 0.05) * h; g.add(rt);
  }
  // ---- 襟 (シャツ・ブラウス) ----
  if (!jacket && kind !== 'toddler') {
    const cr = tr(K.neckY - 0.008) * h;
    const col = _pm(new THREE.TorusGeometry(cr * 0.9, 0.006 * h, 6, 24), topM); col.rotation.x = Math.PI / 2 - 0.25; col.position.set(0, (K.neckY - 0.006) * h, 0.004 * h); col.scale.set(1, K.depth * 1.15, 1); g.add(cb(col));
  }
  // ---- ランドセル / リュック ----
  if (bag) {
    const by = (K.chest - 0.02) * h, bz = -zf(K.chest - 0.02);
    const col = bag === 'randoseru' ? mat(skirt ? '#c8304f' : '#1f3f7a', 0.38, 0.12) : fabricMat(PASTEL.mint);
    const bh = 0.24 * h, bw = 0.2 * h, bd = 0.1 * h;
    const body = _pm(roundedBoxGeom(bw, bh, bd, 0.035 * h, 3), col); body.position.set(0, by, bz - bd / 2 + 0.004 * h); g.add(cb(body, bag !== 'randoseru'));
    if (bag === 'randoseru') {
      const flap = _pm(roundedBoxGeom(bw * 1.02, bh * 0.7, 0.012 * h, 0.01 * h, 2), mat(skirt ? '#a82444' : '#183262', 0.38, 0.12));
      flap.position.set(0, by + bh * 0.15, bz - bd + 0.002 * h); flap.rotation.x = 0.04; g.add(flap);
      g.add(box(0.035 * h, 0.025 * h, 0.008 * h, metalM, 0, by - bh * 0.18, bz - bd - 0.004 * h));   // 錠前
      g.add(box(bw * 0.9, 0.008 * h, 0.006 * h, mat('#e8e2d0', 0.4, 0.2), 0, by - bh * 0.3, bz - bd - 0.002 * h));   // 反射材
    }
    [-1, 1].forEach(sgn => {                                          // 肩ベルト (肩の上を通って前へ)
      const sx = sgn * K.shX * 0.6 * h, sh = (K.shY + 0.01) * h;
      g.add(_limb([sx, sh, bz + 0.01 * h], [sx, sh + 0.006 * h, zf(K.shY - 0.03) * 0.7], 0.012 * h, 0.012 * h, col, { seg: 8 }));
      g.add(_limb([sx, sh, zf(K.shY - 0.03) * 0.75], [sgn * K.shX * 0.75 * h, (K.chest - 0.07) * h, zf(K.chest - 0.07) + 0.006 * h], 0.012 * h, 0.012 * h, col, { seg: 8 }));
    });
  }
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- ぬいぐるみ・玩具
// IKEA DJUNGELSKOG 子グマ 32cm: 形状は 0.36×0.32×0.49 で作成し w/d/h にスケール (座らせた姿勢)
function buildTeddyBear({ color = '#c79a6a', w = 0.28, d = 0.24, h = 0.32 } = {}) {
  const g = new THREE.Group();
  g.scale.set(w / 0.36, h / 0.49, d / 0.32);
  const fur = mat(color, 0.9), pad = mat(shade(color, 1.25), 0.85), face = mat('#3a2a1f', 0.5);
  const body = sph(0.13, fur, 0, 0.17, 0); body.scale.set(1, 1.15, 0.95); body.userData.colorable = true; g.add(body);
  g.add(sph(0.085, pad, 0, 0.2, 0.085)); // belly
  const head = sph(0.115, fur, 0, 0.36, 0.02); head.userData.colorable = true; g.add(head);
  [-1, 1].forEach(sgn => { g.add(sph(0.045, fur, sgn * 0.08, 0.44, 0)); g.add(sph(0.026, pad, sgn * 0.08, 0.45, 0.02)); }); // ears
  g.add(sph(0.035, pad, 0, 0.34, 0.11)); // snout
  g.add(sph(0.014, face, 0, 0.35, 0.14, 8)); // nose
  [-1, 1].forEach(sgn => g.add(sph(0.014, face, sgn * 0.04, 0.39, 0.105, 8))); // eyes
  [-1, 1].forEach(sgn => g.add(sph(0.05, fur, sgn * 0.13, 0.2, 0.02))); // arms
  [-1, 1].forEach(sgn => { const leg = sph(0.06, fur, sgn * 0.07, 0.06, 0.04); g.add(leg); g.add(sph(0.03, pad, sgn * 0.07, 0.06, 0.095)); }); // legs+paw
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.018, 6, 14), mat('#ef7fa6', 0.5)).translateY(0.27).translateZ(0.02)); // bow
  return g;
}
// IKEA VANDRING HARE 40cm: 形状は 0.31×0.30×0.61 で作成し w/d/h にスケール (座らせた姿勢, 耳先端まで)
function buildBunnyPlush({ color = '#fbf4f6', w = 0.22, d = 0.22, h = 0.40 } = {}) {
  const g = new THREE.Group();
  g.scale.set(w / 0.31, h / 0.61, d / 0.30);
  const fur = mat(color, 0.92), inner = mat('#f4b9cf', 0.85), face = mat('#6a4a55', 0.5);
  const body = sph(0.12, fur, 0, 0.16, 0); body.scale.set(1, 1.2, 0.95); body.userData.colorable = true; g.add(body);
  const head = sph(0.1, fur, 0, 0.33, 0.02); head.userData.colorable = true; g.add(head);
  [-1, 1].forEach(sgn => { // long ears
    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.16, 4, 8), fur); ear.position.set(sgn * 0.05, 0.5, -0.01); ear.rotation.z = sgn * 0.18; g.add(ear);
    const ei = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.12, 4, 8), inner); ei.position.set(sgn * 0.05, 0.5, 0.015); ei.rotation.z = sgn * 0.18; g.add(ei);
  });
  [-1, 1].forEach(sgn => g.add(sph(0.012, face, sgn * 0.038, 0.35, 0.092, 8)));
  g.add(sph(0.014, inner, 0, 0.32, 0.1, 8)); // nose
  [-1, 1].forEach(sgn => g.add(sph(0.045, fur, sgn * 0.11, 0.13, 0.02))); // feet
  g.add(sph(0.04, fur, 0, 0.13, -0.11)); // tail
  return g;
}
// HANSA ユニコーン 4974 (True-to-Life, 立ち姿 約42×16×48cm): リアルな馬体のぬいぐるみ。4本脚で立ち, 首を上げ,
// 額に金色のらせんの角 (先端 = 高さ h)。たてがみ・前髪・尾はふさふさの毛束。頭 = +X, 長さ w は尾の先〜鼻先
function buildUnicornToy({ color = '#f3e3f7', w = 0.42, d = 0.16, h = 0.48 } = {}) {
  const outer = new THREE.Group(), g = new THREE.Group(); outer.add(g);
  g.scale.set(w / 0.451, h / 0.484, d / 0.144); g.position.x = -0.0035 * w / 0.451;   // 作った形の外形 (0.451×0.144×0.484) を定義寸法に合わせる
  const fur = mat(color, 0.9, 0, { roughMap: true, env: 0.2 }), muzzleM = mat(shade(color, 0.93), 0.85);
  const hairM = mat(shade(color, 0.86), 0.8, 0, { roughMap: true, env: 0.2 }), gold = mat('#d8b35a', 0.35, 0.6, { env: 0.8 }), hoofM = mat('#c9ad72', 0.45, 0.35);
  const dark = mat('#2a2226', 0.3, 0.1);
  const ell = (rx, ry, rz, m, x, y, z, rotZ = 0) => { const e = sph(1, m, x, y, z, 20); e.scale.set(rx, ry, rz); e.rotation.z = rotZ; if (m === fur) e.userData.colorable = true; g.add(e); return e; };
  const seg = (a, b, r0, r1, m) => { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz); const c = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, len, 14), m); c.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize()); c.castShadow = true; if (m === fur) c.userData.colorable = true; g.add(c); return c; };
  // 胴 (樽形) + 胸 + 尻
  ell(0.13, 0.072, 0.066, fur, -0.025, 0.262, 0);
  ell(0.06, 0.07, 0.06, fur, 0.075, 0.27, 0);
  ell(0.065, 0.072, 0.064, fur, -0.12, 0.275, 0);
  // 脚 4 本 (上が太く下で細い) + 蹄
  [[0.075, 0.042], [0.075, -0.042], [-0.12, 0.042], [-0.12, -0.042]].forEach(([x, z], i) => {
    const back = x < 0, knee = back ? [x - 0.012, 0.115, z] : [x + 0.004, 0.11, z];
    seg([x, 0.24, z], knee, back ? 0.03 : 0.026, 0.018, fur);
    ell(0.019, 0.019, 0.019, fur, knee[0], knee[1], knee[2]);
    seg(knee, [x, 0.03, z], 0.018, 0.015, fur);
    g.add(cylAt(0.016, 0.019, 0.03, 14, hoofM, x, 0.015, z));
  });
  // 首 (前上方へ) + 頭 (鼻先を下げる) + 鼻づら
  seg([0.07, 0.3, 0], [0.132, 0.405, 0], 0.052, 0.036, fur);
  ell(0.058, 0.034, 0.033, fur, 0.162, 0.405, 0, -0.55);
  ell(0.03, 0.026, 0.027, muzzleM, 0.188, 0.372, 0, -0.55);
  [-1, 1].forEach(s => {
    g.add(sph(0.0045, dark, 0.206, 0.368, s * 0.011, 8));                                        // 鼻孔
    g.add(sph(0.0085, dark, 0.158, 0.418, s * 0.028, 10));                                       // 目
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.034, 10), fur); ear.position.set(0.14, 0.447, s * 0.02); ear.rotation.set(s * 0.25, 0, 0.35); ear.userData.colorable = true; g.add(ear);
  });
  // 角: 金色の円錐 + らせんの溝 (先端が定義高さ)
  const hornBase = new THREE.Vector3(0.162, 0.434, 0), hornDir = new THREE.Vector3(Math.sin(0.45), Math.cos(0.45), 0), hornL = 0.05;
  const horn = new THREE.Mesh(new THREE.ConeGeometry(0.009, hornL, 14), gold); horn.position.copy(hornBase).addScaledVector(hornDir, hornL / 2); horn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), hornDir); g.add(horn);
  const helix = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI * 8, r = 0.0095 * (1 - t) + 0.0005; helix.push(new THREE.Vector3(Math.cos(a) * r, (t - 0.5) * hornL, Math.sin(a) * r)); }
  const spiral = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 80, 0.0013, 5), mat('#b8903e', 0.4, 0.6)); spiral.position.copy(horn.position); spiral.quaternion.copy(horn.quaternion); g.add(spiral);
  // たてがみ (項から背へ, 首の片側に流れる毛束) + 前髪
  for (let i = 0; i < 9; i++) {
    const t = i / 8, x = lerpN(0.14, 0.035, t), y = lerpN(0.44, 0.33, t);
    const lock = ell(0.022, 0.034 - t * 0.008, 0.016, hairM, x - 0.004, y, 0.014 + (i % 2) * 0.006, 0.9 - t * 0.5); lock.rotation.x = 0.35;
  }
  ell(0.014, 0.022, 0.012, hairM, 0.166, 0.43, 0, -0.9);
  // 尾 (尻から垂れて先が広がる)
  const tailPts = [[-0.175, 0.3, 0], [-0.2, 0.26, 0.01], [-0.205, 0.19, 0.005], [-0.19, 0.12, -0.005]].map(p => new THREE.Vector3(...p));
  const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tailPts), 24, 0.017, 10), hairM); tail.castShadow = true; g.add(tail);
  ell(0.018, 0.034, 0.02, hairM, -0.192, 0.11, -0.005, 0.2);
  return outer;
}
const lerpN = (a, b, t) => a + (b - a) * t;
// Qualatex 11インチ ラウンド (膨らませて直径約28cm): ゴム風船 + 結び目 + カールしたリボン + 重り。高さ(H)は床からの高さ
function buildBalloon({ color = '#ff7d9c', w = 0.28, d = 0.28, h = 1.5 } = {}) {
  const g = new THREE.Group();
  const balloonM = mat(color, 0.28, 0.08, { env: 0.8 }), stringM = mat('#e8e2d8', 0.7);
  const r = Math.min(w, d) / 2, top = h - r * 1.1;
  const b = sph(r, balloonM, 0, top, 0, 28); b.scale.set(1, 1.1, 1); b.userData.colorable = true; g.add(b);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.025, 10), balloonM); knot.position.y = top - r * 1.1 - 0.008; knot.rotation.x = Math.PI; g.add(knot);
  // カールしたリボン (ゆるい螺旋) → 重り
  const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(Math.sin(t * 9) * 0.012 * (1 - t), top - r * 1.1 - 0.02 - t * (top - r * 1.1 - 0.06), Math.cos(t * 9) * 0.012 * (1 - t))); }
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], c = pts[i + 1], len = a.distanceTo(c); const seg = cylAt(0.0015, 0.0015, len, 4, stringM, (a.x + c.x) / 2, (a.y + c.y) / 2, (a.z + c.z) / 2); seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z).normalize()); g.add(seg); }
  g.add(cylAt(0.028, 0.032, 0.04, 16, mat('#f4f0ea', 0.4), 0, 0.02, 0));                                   // 重り
  g.add(sph(r * 0.22, mat('#ffffff', 0.15), -r * 0.38, top + r * 0.35, r * 0.72, 10));                     // ハイライト
  return g;
}
// IKEA FAMNIG HJÄRTA クッション (40×101cm): ふっくらしたハート (約44×40cm) の左右から腕が伸びる (腕を広げた幅 101cm)。
// 床に寝かせた状態: ハートの先端 → 手前 (+Z), くぼみ → 奥。厚み = h。縁にパイピング
function buildHeartCushion({ color = '#c8201e', w = 1.01, d = 0.4, h = 0.2 } = {}) {
  const g = new THREE.Group();
  const fab = fabricMat(color);
  // 腕: ハートの側面上寄りから左右へ。先は丸い手 (やや手前へ曲げる)
  const armR = Math.min(0.05, h * 0.26), hw = Math.min(0.22, w * 0.22);
  [-1, 1].forEach(s => {
    const len = w / 2 - hw + 0.03 - armR * 1.1, arm = new THREE.Mesh(new THREE.CapsuleGeometry(armR, len, 6, 14), fab);
    arm.rotation.z = Math.PI / 2; arm.rotation.y = s * 0.1; arm.position.set(s * (hw - 0.03 + len / 2 + armR * 0.1), armR, -d * 0.08); arm.castShadow = arm.receiveShadow = true; arm.userData.colorable = true; g.add(arm);
    const hand = sph(armR * 1.1, fab, s * (w / 2 - armR * 1.1), armR * 1.05, -d * 0.08 + s * s * 0.03, 16); hand.scale.set(1, 0.95, 1.15); hand.userData.colorable = true; g.add(hand);
  });
  w = hw * 2; d = Math.min(d, 0.4);
  const s = new THREE.Shape();
  s.moveTo(0, -0.22);
  s.bezierCurveTo(-0.08, -0.14, -0.25, -0.05, -0.25, 0.08);
  s.bezierCurveTo(-0.25, 0.2, -0.12, 0.26, -0.05, 0.21);
  s.bezierCurveTo(-0.02, 0.19, 0, 0.16, 0, 0.14);
  s.bezierCurveTo(0, 0.16, 0.02, 0.19, 0.05, 0.21);
  s.bezierCurveTo(0.12, 0.26, 0.25, 0.2, 0.25, 0.08);
  s.bezierCurveTo(0.25, -0.05, 0.08, -0.14, 0, -0.22);
  const bev = 0.07;
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: true, bevelThickness: bev, bevelSize: 0.045, bevelSegments: 8, curveSegments: 28 });
  geo.rotateX(-Math.PI / 2);                               // 押し出し方向 → 上, ハートのくぼみ → 奥 (-Z), 先端 → 手前 (+Z)
  geo.computeBoundingBox();
  const bb = geo.boundingBox, sx = w / (bb.max.x - bb.min.x), sy = h / (bb.max.y - bb.min.y), sz = d / (bb.max.z - bb.min.z);
  geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  geo.scale(sx, sy, sz); geo.computeVertexNormals();
  const body = new THREE.Mesh(geo, fab); body.castShadow = true; body.receiveShadow = true; body.userData.colorable = true; g.add(body);
  // 縁のパイピング (高さ中央の輪郭に沿って)
  // 輪郭を面取り幅ぶん外へずらした線 (時計回りの輪郭なので外向き法線 = (-ty, tx))
  const sp = s.getSpacedPoints(80).slice(0, -1), n = sp.length, cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2;
  const ring = sp.map((p, i) => {
    const a = sp[(i + n - 1) % n], b = sp[(i + 1) % n], tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
    const ox = p.x + (-ty / l) * 0.045, oy = p.y + (tx / l) * 0.045;
    return new THREE.Vector3((ox - cx) * sx, h / 2, (-oy - cz) * sz);
  });
  const pipe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 120, 0.006, 6, true), mat(shade(color, 0.85), 0.9));
  pipe.castShadow = true; g.add(pipe);
  return g;
}
// IKEA UNDERHÅLLA 積み木 40個セット: 無垢材の積み木 (持ちやすい幅3cm・角が丸い)。立方体・直方体・円柱・アーチ・三角屋根を
// 積んだ門と塔 + 床に散らばったブロック。形の組み合わせ・配置はモデル上の表現 (外形 w×d×h に収める)
function buildBuildingBlocks({ color = '#ff9aa2', w = 0.3, d = 0.25, h = 0.18 } = {}) {
  const g = new THREE.Group();
  const m = 0.03, rad = 0.004;
  const wood = (c) => mat(c, 0.62, 0, { env: 0.3 });
  const C = { nat: wood('#e3c79a'), red: wood('#d65a4f'), yel: wood('#eec24a'), blu: wood('#4f86c2'), grn: wood('#5fa36d'), acc: wood(color) };
  const add = (mesh, x, y, z, ry = 0, rz = 0) => { mesh.position.set(x, y, z); mesh.rotation.set(0, ry, rz); mesh.castShadow = mesh.receiveShadow = true; g.add(mesh); return mesh; };
  const blk = (sx, sy, sz, M, x, y, z, ry = 0) => { const b = add(new THREE.Mesh(roundedBoxGeom(sx, sy, sz, rad, 2), M), x, y + sy / 2, z, ry); if (M === C.acc) b.userData.colorable = true; return b; };
  const cylB = (r, len, M, x, y, z, lying = false, ry = 0) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), M); return lying ? add(c, x, y + r, z, ry, Math.PI / 2) : add(c, x, y + len / 2, z, ry); };
  const roof = (wd, ht, dp, M, x, y, z, ry = 0) => {   // 三角柱 (断面 = 二等辺三角形, 奥行 dp)
    const s = new THREE.Shape(); s.moveTo(-wd / 2, 0); s.lineTo(wd / 2, 0); s.lineTo(0, ht); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: dp - 2 * rad, bevelEnabled: true, bevelThickness: rad, bevelSize: rad * 0.6, bevelSegments: 2 }); geo.translate(0, rad * 0.6, -(dp - 2 * rad) / 2);
    const r = add(new THREE.Mesh(geo, M), x, y, z, ry); if (M === C.acc) r.userData.colorable = true; return r;
  };
  const arch = (wd, ht, dp, M, x, y, z) => {           // アーチ (下に半円の切り欠き)
    const s = new THREE.Shape(); s.moveTo(-wd / 2, 0); s.lineTo(-m / 2 - 0.004, 0); s.absarc(0, 0, m / 2 + 0.004, Math.PI, 0, true); s.lineTo(wd / 2, 0); s.lineTo(wd / 2, ht); s.lineTo(-wd / 2, ht); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: dp - 2 * rad, bevelEnabled: true, bevelThickness: rad, bevelSize: rad * 0.6, bevelSegments: 2, curveSegments: 12 }); geo.translate(0, rad * 0.6, -(dp - 2 * rad) / 2);
    return add(new THREE.Mesh(geo, M), x, y, z);
  };
  // 門: アーチの上に板・立方体 2 個・三角屋根
  arch(3 * m, 1.5 * m, m, C.red, -0.06, 0, 0.02);
  blk(4 * m, m / 2, m, C.nat, -0.06, 1.5 * m, 0.02);
  blk(m, m, m, C.yel, -0.093, 2 * m, 0.02); blk(m, m, m, C.blu, -0.027, 2 * m, 0.02);
  roof(2 * m, m, m, C.acc, -0.06, 3 * m, 0.02);
  // 塔: 立方体 5 段 + 三角屋根 (高さ h)
  const tower = [C.nat, C.grn, C.yel, C.red, C.nat];
  tower.forEach((M, i) => blk(m, m, m, M, 0.075, i * m, -0.035, i % 2 ? 0.08 : -0.05));
  roof(m, h - 5 * m - rad * 1.2, m, C.acc, 0.075, 5 * m, -0.035, -0.05);
  cylB(m / 2, 2 * m, C.blu, 0.03, 0, 0.055);                                   // 円柱の柱
  // 床に散らばったブロック
  blk(m, m, m, C.grn, 0.125, 0, 0.085, 0.6);
  blk(2 * m, m, m, C.yel, -0.105, 0, -0.085, 0.45);
  roof(2 * m, m, m, C.blu, 0.0, 0, -0.095, 0.9);
  cylB(m / 2, 2 * m, C.red, -0.01, 0, 0.1, true, 0.3);
  blk(m, m, m, C.acc, 0.02, 0, -0.03, 0.3);
  return g;
}
// IKEA FLISAT おもちゃ収納 キャスター付き (44×39×31): パイン無垢材のオープンボックス, 側面に手掛け穴, 4輪キャスター
function buildToyBox({ color = '#e6cfa3', w = 0.44, d = 0.39, h = 0.31 } = {}) {
  const g = new THREE.Group();
  const pine = mat(color, 0.65), pineD = mat(shade(color, 0.85), 0.7), dark = mat('#2a2a2a', 0.6);
  const castH = 0.045, t = 0.015;
  const bodyH = h - castH;
  // casters
  [[-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05], [-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05]].forEach(([x, z]) => {
    const wh = cylAt(0.02, 0.02, 0.018, 12, dark, x, 0.02, z); wh.rotation.z = Math.PI / 2; g.add(wh);
    g.add(box(0.03, 0.012, 0.03, mat('#888', 0.4, 0.6), x, castH - 0.006, z));
  });
  // bottom
  g.add(box(w, t, d, pineD, 0, castH + t / 2, 0));
  // long walls (front/back) + short walls (sides) with handle cutouts
  [-d / 2 + t / 2, d / 2 - t / 2].forEach(z => { const p = box(w, bodyH, t, pine, 0, castH + bodyH / 2, z); p.userData.colorable = true; g.add(p); });
  [-w / 2 + t / 2, w / 2 - t / 2].forEach(x => {
    const p = box(t, bodyH, d - 2 * t, pine, x, castH + bodyH / 2, 0); p.userData.colorable = true; g.add(p);
    g.add(box(t + 0.004, 0.03, 0.09, dark, x, castH + bodyH - 0.05, 0)); // handle cutout
  });
  // toys inside (peeking above the rim)
  g.add(sph(0.05, mat('#ff9aa2', 0.6), -0.1, castH + bodyH - 0.01, 0.05));
  g.add(new THREE.Mesh(roundedBoxGeom(0.08, 0.08, 0.08, 0.01, 2), mat('#ffd382', 0.65)).translateX(0.07).translateY(castH + bodyH - 0.02).translateZ(-0.05));
  g.add(sph(0.04, mat('#a9e7cf', 0.6), 0.14, castH + bodyH - 0.03, 0.08));
  g.add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 10), mat('#c9b3ec', 0.6)).translateX(-0.02).translateY(castH + bodyH + 0.02));
  return g;
}
// IKEA FLISAT ドールハウス/ウォールシェルフ (58×22×59): パイン材の前面オープンな家型シェルフ (2層 + 切妻屋根)
function buildDollhouse({ color = '#e6cfa3', w = 0.58, d = 0.22, h = 0.59 } = {}) {
  const g = new THREE.Group();
  const pine = mat(color, 0.65), pineD = mat(shade(color, 0.88), 0.7);
  const t = 0.015;
  const bodyH = h * 0.66;                 // 壁の高さ (屋根の下端)
  const roofH = h - bodyH;
  // 底板・側板・背板
  g.add(box(w, t, d, pineD, 0, t / 2, 0));
  [-w / 2 + t / 2, w / 2 - t / 2].forEach(x => { const s = box(t, bodyH, d, pine, x, bodyH / 2, 0); s.userData.colorable = true; g.add(s); });
  g.add(box(w - 2 * t, bodyH, t, pineD, 0, bodyH / 2, -d / 2 + t / 2));
  // 背板の切妻部 (三角柱: 3角形断面のシリンダーを回転・スケール)
  const gable = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, t, 3, 1, false, 0, Math.PI * 2), pineD);
  gable.rotation.x = -Math.PI / 2;
  gable.scale.set((w / 2 - t) / 0.866, 1, (roofH - 0.01) / 1.5);
  gable.position.set(0, bodyH + 0.5 * (roofH - 0.01) / 1.5, -d / 2 + t / 2); g.add(gable);
  // 中段の棚板 (2階の床)
  g.add(box(w - 2 * t, t, d - t, pineD, 0, bodyH * 0.5, 0));
  // 切妻屋根 (2枚の傾斜板, 少し軒を出す)
  const half = w / 2 + 0.02, slope = Math.hypot(half, roofH), ang = Math.atan2(roofH, half);
  [-1, 1].forEach(s => { const rp = box(slope, t, d + 0.03, pine, s * half / 2, bodyH + roofH / 2, 0); rp.rotation.z = -s * ang; rp.userData.colorable = true; g.add(rp); });
  // 小さな家具 (ベッド・テーブル)
  g.add(box(0.1, 0.03, 0.06, mat('#f4b9cf', 0.6), -0.15, bodyH * 0.5 + t / 2 + 0.015, 0.02));
  g.add(cylAt(0.03, 0.03, 0.03, 10, mat('#ffffff', 0.6), 0.15, t + 0.015, 0.02));
  g.add(box(0.06, 0.05, 0.05, mat('#a9d8f0', 0.6), 0.16, t + 0.025, -0.05));
  return g;
}
// 不二家 苺のショートケーキ M (直径17cm): 金台紙の上に, 生クリームで覆ったスポンジ (高さ約7cm)。裾に丸い絞り,
// 天面の縁に絞りを並べてその上にいちご 8 粒, 中央にチョコプレート。ろうそく 3 本はモデル上の表現 (炎の先 = 高さ h)
function buildCake({ color = '#fffaf2', w = 0.18, d = 0.18, h = 0.15 } = {}) {
  const g = new THREE.Group();
  const cream = mat(color, 0.55, 0, { env: 0.3 }), berry = mat('#d42336', 0.32, 0, { env: 0.6 }), seedM = mat('#f2d27a', 0.5);
  // いちご (へたを落として先を上に): 肩が張り先がとがる回転体 + 種
  const berryGeo = new THREE.LatheGeometry([[0, 0], [0.0095, 0], [0.0118, 0.006], [0.0112, 0.013], [0.0082, 0.021], [0.0035, 0.0265], [0, 0.0275]].map(([x, y]) => new THREE.Vector2(x, y)), 14);
  const board = mat('#d6b25e', 0.3, 0.7, { env: 0.9 });
  const r = Math.min(w, d) / 2 - 0.005, bodyH = 0.07, y0 = 0.003, top = y0 + bodyH;
  g.add(cylAt(Math.min(w, d) / 2, Math.min(w, d) / 2, y0, 40, board, 0, y0 / 2, 0));                               // 金台紙
  const body = cylAt(r, r, bodyH, 48, cream, 0, y0 + bodyH / 2, 0); body.userData.colorable = true; g.add(body);
  const topRound = new THREE.Mesh(new THREE.TorusGeometry(r - 0.004, 0.004, 6, 48), cream); topRound.rotation.x = Math.PI / 2; topRound.position.y = top - 0.002; topRound.userData.colorable = true; g.add(topRound);
  for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2, b = sph(0.0055, cream, Math.cos(a) * (r + 0.001), y0 + 0.005, Math.sin(a) * (r + 0.001), 8); b.userData.colorable = true; g.add(b); }   // 裾の絞り
  // 天面の縁の絞り (星口金のロゼット) + いちご (へたを落として先を上に)
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + 0.2, rx = Math.cos(a) * (r - 0.018), rz = Math.sin(a) * (r - 0.018);
    const ros = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.018, 8), cream); ros.position.set(rx, top + 0.008, rz); ros.userData.colorable = true; g.add(ros);
    const s = new THREE.Mesh(berryGeo, berry); s.position.set(rx, top + 0.014, rz); s.rotation.y = a; s.castShadow = true; g.add(s);
    for (let k = 0; k < 6; k++) { const sa = k * 1.047 + a, sy = 0.008 + (k % 2) * 0.007, sr = k % 2 ? 0.0106 : 0.0117; g.add(sph(0.0012, seedM, rx + Math.cos(sa) * sr, top + 0.014 + sy, rz + Math.sin(sa) * sr, 4)); }
  }
  // 中央のチョコプレート (白い文字の線)
  const plate = cylAt(0.028, 0.028, 0.004, 24, mat('#4a2c1c', 0.4), 0, top + 0.003, 0.012); plate.rotation.x = -0.25; g.add(plate);
  [-0.008, 0, 0.008].forEach((dz, i) => g.add(plainBox(0.03 - i * 0.006, 0.0008, 0.0016, mat('#fbf6ee', 0.5), 0, top + 0.0055 + dz * 0.25, 0.012 + dz)));
  // ろうそく 3 本 (らせん柄) + 炎
  const flame = new THREE.MeshStandardMaterial({ color: 0xffd27a, emissive: new THREE.Color('#ffb030'), emissiveIntensity: 1.3, roughness: 0.3 });
  const cH = h - top - 0.016;
  ['#ff9aa2', '#a9d8f0', '#ffd382'].forEach((c, i) => {
    const cx = (i - 1) * 0.026, cz = -0.028 + Math.abs(i - 1) * 0.01;
    g.add(cylAt(0.0032, 0.0032, cH, 8, mat(c, 0.55), cx, top + cH / 2, cz));
    for (let k = 0; k < 4; k++) { const band = new THREE.Mesh(new THREE.TorusGeometry(0.0033, 0.0008, 4, 10), mat('#ffffff', 0.5)); band.rotation.x = Math.PI / 2 + 0.35; band.position.set(cx, top + 0.008 + k * cH / 4.2, cz); g.add(band); }
    g.add(cylAt(0.0006, 0.0006, 0.004, 4, mat('#222', 0.8), cx, top + cH + 0.002, cz));
    const f = sph(0.0045, flame, cx, h - 0.007, cz, 8); f.scale.set(1, 1.7, 1); g.add(f);
  });
  return g;
}
// 生カップケーキ (プティル, 直径7.4cm): ひだのある紙カップ + 盛り上がったスポンジ + 生クリームの渦巻き絞り + さくらんぼ (高さ h)
function buildCupcake({ color = '#ffb3c6', w = 0.074, d = 0.074, h = 0.085 } = {}) {
  const g = new THREE.Group();
  const r = Math.min(w, d) / 2, cupH = 0.034;
  const cupGeo = new THREE.CylinderGeometry(r, r * 0.76, cupH, 48, 1, true), cp = cupGeo.attributes.position;   // ひだ (放射状の山谷)
  for (let i = 0; i < cp.count; i++) { const x = cp.getX(i), z = cp.getZ(i), a = Math.atan2(z, x), k = 1 + 0.035 * Math.cos(a * 24); cp.setX(i, x * k); cp.setZ(i, z * k); }
  cupGeo.computeVertexNormals();
  const cupM = mat('#f1e3c8', 0.75); cupM.side = THREE.DoubleSide;
  const cup = new THREE.Mesh(cupGeo, cupM); cup.position.y = cupH / 2; cup.castShadow = true; g.add(cup);
  g.add(cylAt(r * 0.76, r * 0.76, 0.002, 24, cupM, 0, 0.001, 0));
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 0.98, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#d9a25e', 0.85)); dome.scale.y = 0.4; dome.position.y = cupH - 0.002; g.add(dome);
  const cream = mat(color, 0.55, 0, { env: 0.3 }), creamTop = h - 0.016;
  [[0.82, 0.0105], [0.62, 0.0095], [0.42, 0.0085]].forEach(([k, t], i) => {
    const tor = new THREE.Mesh(new THREE.TorusGeometry(r * k - t, t, 10, 28), cream); tor.rotation.x = Math.PI / 2; tor.position.y = cupH + 0.009 + i * (creamTop - cupH - 0.02) / 2.6; tor.userData.colorable = true; g.add(tor);
  });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(r * 0.26, 0.014, 14), cream); tip.position.y = creamTop - 0.004; tip.userData.colorable = true; g.add(tip);
  g.add(sph(0.0078, mat('#c8102e', 0.25, 0, { env: 0.8 }), 0.002, h - 0.0085, 0, 12));
  const stem = cylAt(0.0007, 0.0007, 0.012, 4, mat('#5a7a2a', 0.7), 0.004, h - 0.0065, 0); stem.rotation.z = -0.5; g.add(stem);
  return g;
}
// 天蓋付きベッド (ARTTOWN ハミング シングル: 幅約98×奥行約203×高さ約100cm, 天蓋装着時 約197cm): アイアンのパイプフレーム,
// 渦巻き飾りのヘッド/フットボード, 床面高さ約33cm, 4本柱の天蓋フレームとシアーカーテン。ハート飾り・寝具はモデル上の表現。
function buildKidsBed({ color = '#fbe3ec', w = 0.98, d = 2.03, h = 1.97 } = {}) {
  const g = new THREE.Group();
  const iron = mat('#f6f1f3', 0.4, 0.5, { env: 0.6 }), heartM = mat('#ff8fab', 0.55);
  const pr = 0.016, x0 = w / 2 - pr, z0 = d / 2 - pr, deckY = 0.335;
  const tube = (a, b, r = pr * 0.7) => { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), iron); m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize()); m.castShadow = true; g.add(m); };
  const scroll = (x, y, z, r, rotY = 0) => { const c = new THREE.Mesh(new THREE.TorusGeometry(r, pr * 0.45, 6, 18, Math.PI * 1.6), iron); c.position.set(x, y, z); c.rotation.y = rotY; c.castShadow = true; g.add(c); };
  // 4本柱 (天蓋の高さまで) + 柱頭の玉
  const postTop = h - 0.03;                                         // 柱頭の玉の上端 = 天蓋装着時の高さ h
  [[-x0, -z0], [x0, -z0], [-x0, z0], [x0, z0]].forEach(([x, z]) => { g.add(cylAt(pr, pr, postTop, 10, iron, x, postTop / 2, z)); g.add(sph(pr * 1.8, iron, x, h - pr * 1.8, z, 10)); g.add(cylAt(pr * 1.4, pr * 1.2, 0.03, 10, iron, x, 0.015, z)); });
  // 床板フレーム (サイドレール) + スノコ
  [-1, 1].forEach(s => tube([s * x0, deckY, -z0], [s * x0, deckY, z0], pr * 0.9));
  [-1, 1].forEach(t => tube([-x0, deckY, t * z0], [x0, deckY, t * z0], pr * 0.9));
  // ヘッドボード (頭側 -Z): アーチ形の笠木 + 縦桟 + 渦巻き
  const hbTop = 1.0, arch = 0.08;
  for (let i = 0; i <= 10; i++) { const t0 = i / 10, t1 = (i + 1) / 10; if (i === 10) break; const xa = -x0 + t0 * 2 * x0, xb = -x0 + t1 * 2 * x0; tube([xa, hbTop - 0.06 + Math.sin(t0 * Math.PI) * arch, -z0], [xb, hbTop - 0.06 + Math.sin(t1 * Math.PI) * arch, -z0]); }
  tube([-x0, 0.62, -z0], [x0, 0.62, -z0]);
  for (let i = 1; i < 6; i++) { const x = -x0 + i * 2 * x0 / 6; tube([x, 0.62, -z0], [x, hbTop - 0.06 + Math.sin(i / 6 * Math.PI) * arch, -z0], pr * 0.5); }
  [-1, 1].forEach(s => { scroll(s * 0.22, 0.52, -z0, 0.06, 0); scroll(s * 0.1, 0.52, -z0, 0.04, 0); });
  // ハートの飾り (ヘッドボード中央)
  [-1, 1].forEach(sgn => g.add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), heartM).translateX(sgn * 0.032).translateY(0.84).translateZ(-z0 + 0.02)));
  const hc = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.035), heartM); hc.position.set(0, 0.8, -z0 + 0.02); hc.rotation.z = Math.PI / 4; g.add(hc);
  // フットボード (足側 +Z): 低めの笠木 + 縦桟 + 渦巻き
  tube([-x0, 0.72, z0], [x0, 0.72, z0]); tube([-x0, 0.5, z0], [x0, 0.5, z0]);
  for (let i = 1; i < 6; i++) { const x = -x0 + i * 2 * x0 / 6; tube([x, 0.5, z0], [x, 0.72, z0], pr * 0.5); }
  [-1, 1].forEach(s => scroll(s * 0.18, 0.42, z0, 0.05, 0));
  // 天蓋フレーム (上部の長方形) + 中央の王冠飾り
  const topY = h - 0.07;
  [-1, 1].forEach(s => tube([s * x0, topY, -z0], [s * x0, topY, z0]));
  [-1, 1].forEach(t => tube([-x0, topY, t * z0], [x0, topY, t * z0]));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 8, 14), mat('#ffd86a', 0.4, 0.3)).translateY(topY - 0.1).translateZ(-z0 + 0.025));   // 王冠飾り (バランスの前)
  // シアーカーテン (天蓋から四隅へ垂らし, 柱でタイバック)
  const sheer = fabricMat(color); sheer.transparent = true; sheer.opacity = 0.5; sheer.side = THREE.DoubleSide;
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([s, t]) => {
    const cz = t * (z0 - 0.1);                                    // カーテンは柱の内側に垂らす (外形 w×d に収める)
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.05, topY - 1.1, 10, 1, true, 0, Math.PI), sheer); top.position.set(s * (x0 - 0.1), 1.1 + (topY - 1.1) / 2, cz); top.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(top);
    const low = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 1.05, 10, 1, true, 0, Math.PI), sheer); low.position.set(s * (x0 - 0.09), 0.58, cz); low.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; g.add(low);
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12), heartM).translateX(s * (x0 - 0.06)).translateY(1.1).translateZ(cz));
  });
  const valance = new THREE.Mesh(roundedBoxGeom(w - 0.06, 0.16, 0.01, 0.005, 2), sheer); valance.position.set(0, topY - 0.08, -z0 + 0.012); g.add(valance);
  // 寝具 (マットレス厚18cm, 床面高さ33.5cm)
  g.add(bedding(w - 0.06, d - 0.08, deckY + 0.18, { duvet: color, mattH: 0.18, accent: true, fold: true, throwFoot: false, pillowZ: 0.34 }));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
// IKEA FLISAT 子ども用デスク (92×67, 高さ調節 ≈56cm): パイン材の角脚フレーム, 背面に MÅLA 紙ロールホルダー
function buildKidsDesk({ color = '#e6cfa3', w = 0.92, d = 0.67, h = 0.56 } = {}) {
  const g = new THREE.Group();
  const pine = mat(color, 0.65), pineD = mat(shade(color, 0.88), 0.7);
  const top = new THREE.Mesh(roundedBoxGeom(w, 0.025, d, 0.008, 2), pine); top.position.set(0, h - 0.0125, 0); top.castShadow = true; top.userData.colorable = true; g.add(top);
  // 角脚 45mm (前後脚を側枠でつなぐ)
  const lx = w / 2 - 0.06, lz = d / 2 - 0.05, legH = h - 0.025;
  [[-lx, lz], [lx, lz], [-lx, -lz], [lx, -lz]].forEach(([x, z]) => g.add(box(0.045, legH, 0.045, pineD, x, legH / 2, z)));
  [-lx, lx].forEach(x => g.add(box(0.04, 0.06, d - 0.1 - 0.045, pineD, x, 0.18, 0)));          // 側面貫
  g.add(box(w - 0.12 - 0.045, 0.06, 0.04, pineD, 0, 0.18, -lz));                                  // 背面貫
  g.add(box(w - 0.12 - 0.045, 0.08, 0.02, pineD, 0, h - 0.07, lz - 0.01));                       // 幕板(前)
  g.add(box(w - 0.12 - 0.045, 0.08, 0.02, pineD, 0, h - 0.07, -lz + 0.01));                      // 幕板(後)
  // 紙ロールホルダー (背面, MÅLA ロール)
  const roll = cylAt(0.045, 0.045, w - 0.2, 16, mat('#fbf7f2', 0.8), 0, h - 0.14, -lz + 0.06); roll.rotation.z = Math.PI / 2; g.add(roll);
  const axle = cylAt(0.008, 0.008, w - 0.12, 8, mat('#9aa0a4', 0.3, 0.7), 0, h - 0.14, -lz + 0.06); axle.rotation.z = Math.PI / 2; g.add(axle);
  // 天板上のペン立て
  g.add(cylAt(0.03, 0.03, 0.08, 12, mat('#a9d8f0', 0.6), w * 0.35, h + 0.04, -d * 0.3));
  return g;
}
// IKEA MAMMUT 子ども用チェア (39×36×67, 座面 30×26 高さ30): 一体成形プラスチックの丸いシェル + 太めの脚
function buildKidsChair({ color = '#ffd382', w = 0.39, d = 0.36, h = 0.67 } = {}) {
  const g = new THREE.Group();
  const shell = mat(color, 0.45, 0.05, { env: 0.4 });
  const seatH = 0.30, seatW = 0.30, seatD = 0.26;
  const seat = new THREE.Mesh(roundedBoxGeom(seatW + 0.04, 0.035, seatD + 0.04, 0.015, 3), shell);
  seat.position.set(0, seatH, 0.02); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  // 背もたれ (上が丸い一枚シェル, やや後傾)
  const back = new THREE.Mesh(roundedBoxGeom(w - 0.02, h - seatH, 0.035, 0.05, 4), shell);
  back.position.set(0, seatH + (h - seatH) / 2 - 0.02, -d / 2 + 0.05); back.rotation.x = -0.1; back.castShadow = true; back.userData.colorable = true; g.add(back);
  // 脚 (4本, テーパー, 外側に開く)
  [[-w / 2 + 0.05, d / 2 - 0.05], [w / 2 - 0.05, d / 2 - 0.05], [-w / 2 + 0.05, -d / 2 + 0.05], [w / 2 - 0.05, -d / 2 + 0.05]].forEach(([x, z]) => {
    const leg = cyl(0.024, 0.03, seatH - 0.02, 10, shell);
    leg.position.set(x * 0.85, (seatH - 0.02) / 2, z * 0.85 + 0.02);
    leg.rotation.z = x > 0 ? 0.12 : -0.12; leg.rotation.x = z > 0 ? -0.12 : 0.12;
    leg.castShadow = true; leg.userData.colorable = true; g.add(leg);
  });
  return g;
}
// 壁飾り: 顔(柄)を +Z に向ける壁掛け (壁面 = z -d/2)
// 三角フラッグガーランド (おとりよせ.com zak-40635: 一辺約12cmの正三角形の布の旗 10 枚, 全長約150cm):
// 両端を 1.3m 離して天井近く (留めピン 床上2.42m) に留め, 布テープが放物線状に約30cm 弛む (旗の先端 床上約2.0m)。
// 旗はテープに縫い付けられ, 先端が下を向く。柄は旗ごとに違う
function buildGarland({ color = '#ff9aa2', w = 1.3, d = 0.04, h = 0.4 } = {}) {
  const g = new THREE.Group();
  const top = 2.42, L = 1.5, side = 0.12, fh = side * Math.sqrt(3) / 2;
  const sag = Math.sqrt(3 * w * (L - w) / 8);                          // 弦長 w・全長 L の放物線の弛み
  const Y = (x) => top - sag * (1 - Math.pow(2 * x / w, 2));
  // 弧長のテーブル (x を弧長 s から引く)
  const N = 200, xs = [], ss = [0];
  for (let i = 0; i <= N; i++) xs.push(-w / 2 + w * i / N);
  for (let i = 1; i <= N; i++) ss.push(ss[i - 1] + Math.hypot(xs[i] - xs[i - 1], Y(xs[i]) - Y(xs[i - 1])));
  const scale = L / ss[N];                                              // 近似誤差を全長に合わせて補正
  const at = (s) => { s /= scale; let i = 1; while (i < N && ss[i] < s) i++; const t = (s - ss[i - 1]) / (ss[i] - ss[i - 1] || 1), x = xs[i - 1] + (xs[i] - xs[i - 1]) * t; return new THREE.Vector3(x, Y(x), 0); };
  const z0 = -d / 2 + 0.012;
  const tape = []; for (let i = 0; i <= 60; i++) { const x = -w / 2 + w * i / 60; tape.push(new THREE.Vector3(x, Y(x), z0)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tape), 120, 0.0035, 5), mat('#efe6d6', 0.9)));
  [-1, 1].forEach(s => { g.add(cylAt(0.004, 0.004, 0.012, 8, mat('#b8b8b8', 0.3, 0.8), s * w / 2, top, -d / 2 + 0.006).rotateX(Math.PI / 2)); });   // 留めピン
  const cols = [color, '#ffd382', '#a9e7cf', '#a9d8f0', '#c9b3ec'], dotM = mat('#fffaf2', 0.85);
  const start = (L - 10 * side) / 2;
  for (let i = 0; i < 10; i++) {
    const A = at(start + i * side + 0.004), B = at(start + (i + 1) * side - 0.004), M = A.clone().add(B).multiplyScalar(0.5);
    const dir = B.clone().sub(A).normalize(), down = new THREE.Vector3(dir.y, -dir.x, 0), C = M.clone().addScaledVector(down, fh);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([A.x, A.y, z0, C.x, C.y, z0, B.x, B.y, z0], 3)); geo.computeVertexNormals();
    const fm = fabricMat(cols[i % cols.length]); fm.side = THREE.DoubleSide;
    const flag = new THREE.Mesh(geo, fm); flag.castShadow = true; if (i % cols.length === 0) flag.userData.colorable = true; g.add(flag);
    // 柄: 水玉 (3 個) / 内側の縁取り / 無地
    if (i % 3 === 1) [[0.3, 0.25], [0.7, 0.25], [0.5, 0.6]].forEach(([u, v]) => { const P = A.clone().lerp(B, u).lerp(C, v); const dot = new THREE.Mesh(new THREE.CircleGeometry(0.008, 12), dotM); dot.position.set(P.x, P.y, z0 + 0.001); g.add(dot); });
    if (i % 3 === 2) { const k = 0.62, A2 = M.clone().lerp(A, k), B2 = M.clone().lerp(B, k), C2 = M.clone().lerp(C, k).addScaledVector(down, -0.012 * k); const t2 = new THREE.BufferGeometry(); t2.setAttribute('position', new THREE.Float32BufferAttribute([A2.x, A2.y - 0.012, z0 + 0.001, C2.x, C2.y, z0 + 0.001, B2.x, B2.y - 0.012, z0 + 0.001], 3)); t2.computeVertexNormals(); const tm = mat(shade(cols[i % cols.length], 1.12), 0.9); tm.side = THREE.DoubleSide; g.add(new THREE.Mesh(t2, tm)); }
  }
  return g;
}
// Lovi Decor Star (バーチ合板の組み立て式スター): 36cm と 24cm を紐で壁のピンに掛けた構成。星の板は透かしのある 5 芒星,
// 先端に直交するひし形のパーツが付き立体になる (奥行 d)。大きい星は色替え可 (既定 = ハニーイエロー), 小さい星はナチュラル
function buildStarWall({ color = '#ffe08a', w = 0.6, d = 0.06, h = 0.55 } = {}) {
  const g = new THREE.Group();
  const plyT = 0.004, zc = -d / 2 + d / 2;                          // 星の板の面 (奥行の中央)
  const starShape = (R, r) => { const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); return s; };
  const holeOf = (R, r) => { const p = new THREE.Path(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r : R; const x = Math.cos(a) * rr, y = Math.sin(a) * rr; i ? p.lineTo(x, y) : p.moveTo(x, y); } p.closePath(); return p; };
  const loviStar = (R, M, cx, cy, colorable) => {
    const sg = new THREE.Group(); sg.position.set(cx, cy, zc);
    const outer = starShape(R, R * 0.43); outer.holes.push(holeOf(R * 0.7, R * 0.3));                          // 外枠 (内側を星形に抜く)
    const geo = new THREE.ExtrudeGeometry(outer, { depth: plyT, bevelEnabled: false }); geo.translate(0, 0, -plyT / 2);
    const plate = new THREE.Mesh(geo, M); plate.castShadow = true; if (colorable) plate.userData.colorable = true; sg.add(plate);
    const core = new THREE.ExtrudeGeometry(starShape(R * 0.22, R * 0.1), { depth: plyT, bevelEnabled: false }); core.translate(0, 0, -plyT / 2);   // 中心の小さな星
    const cm = new THREE.Mesh(core, M); cm.rotation.z = Math.PI / 5; if (colorable) cm.userData.colorable = true; sg.add(cm);
    for (let i = 0; i < 5; i++) {                                                                            // 中心と外枠をつなぐ桟 (雪の結晶のような透かし)
      const a = Math.PI / 2 + i * 2 * Math.PI / 5, len = R * 0.5;
      const bar = plainBox(0.006, len, plyT, M, Math.cos(a) * (R * 0.18 + len / 2), Math.sin(a) * (R * 0.18 + len / 2), 0); bar.rotation.z = a - Math.PI / 2; if (colorable) bar.userData.colorable = true; sg.add(bar);
      // 先端のひし形 (板に直交)
      const dia = new THREE.Shape(), dl = R * 0.3, dw = Math.min(R * 0.17, d / 2 - 0.004);
      dia.moveTo(0, 0); dia.lineTo(dl / 2, dw); dia.lineTo(dl, 0); dia.lineTo(dl / 2, -dw); dia.closePath();
      const dg = new THREE.ExtrudeGeometry(dia, { depth: plyT, bevelEnabled: false }); dg.translate(0, 0, -plyT / 2);
      const dm = new THREE.Mesh(dg, M); dm.rotation.set(Math.PI / 2, 0, 0); const holder = new THREE.Group(); holder.add(dm);
      holder.rotation.z = a; holder.position.set(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, 0); if (colorable) dm.userData.colorable = true; sg.add(holder);
    }
    g.add(sg);
    // 掛け紐 + ピン
    const pinY = cy + R + 0.06;
    g.add(plainBox(0.0015, pinY - (cy + R) + 0.004, 0.0015, mat('#fbf8f2', 0.9), cx, (pinY + cy + R) / 2, zc));
    g.add(cylAt(0.003, 0.003, 0.012, 8, mat('#b8b8b8', 0.3, 0.8), cx, pinY, -d / 2 + 0.006).rotateX(Math.PI / 2));
  };
  const top = 1.84, R1 = 0.18, R2 = 0.12;
  loviStar(R1, mat(color, 0.6, 0, { env: 0.3 }), -w / 2 + R1 * Math.sin(2 * Math.PI / 5), top - h + R1 * Math.cos(Math.PI / 5), true);
  loviStar(R2, mat('#e9d2a8', 0.65, 0, { env: 0.3 }), w / 2 - R2 * Math.sin(2 * Math.PI / 5), top - 0.06 - R2, false);
  return g;
}

export {
  buildPerson, buildTeddyBear, buildBunnyPlush, buildUnicornToy, buildBalloon, buildHeartCushion,
  buildBuildingBlocks, buildToyBox, buildDollhouse, buildCake, buildCupcake,
  buildKidsBed, buildKidsDesk, buildKidsChair, buildGarland, buildStarWall,
};
