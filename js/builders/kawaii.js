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
// 顔は +Z 向き。h = 身長 (足裏〜頭頂, 髪のボリュームは含まない)。headBig で子供体型(大きめの頭)。
function buildPerson({ h = 1.6, skin = '#f4cba0', hair = '#4a3526', style = 'short',
  color, top, bottom = '#5b7fb0', skirt = false, bag = null, headBig = false, shoe = '#e2607a',
  ribbon = '#ef7fa6', eye = '#5a4636',
  adult = false, helmet = null, jacket = false, cargo = false, gloves = null, boots = false, suit = false } = {}) {
  const g = new THREE.Group();
  // 頭頂 = 頭の中心(1.45s + hr) + 頭の半径×1.06 → 身長 h に一致するよう s を決める
  const hrRel = headBig ? 0.155 : 0.125;
  const s = h / (1.45 + hrRel * 2.06);
  const topCol = color || top || '#ff9aa2';   // 服(colorable)はカラーピッカー対応
  const skinM = mat(skin, 0.66, 0.02), topM = mat(topCol, 0.72), botM = mat(bottom, 0.76),
        hairM = mat(hair, 0.5, 0.06), shoeM = mat(shoe, 0.4, 0.12), soleM = mat('#2c2c2e', 0.85),
        noseM = mat(shade(skin, 0.95), 0.7);
  const gloveM = gloves ? mat(gloves, 0.94) : null;   // 軍手
  const metalM = mat('#cdd2d8', 0.32, 0.8);           // ファスナー/金具
  const darkM  = mat('#2a2d31', 0.55);                // ボタン/スナップ/顎紐
  const legColorable = suit;                          // 上下同色の作業着は脚も色替え対象
  const legM = suit ? topM : (skirt ? skinM : botM);  // 作業着=上着と同色 / スカートなら素肌
  const hr = (headBig ? 0.155 : 0.125) * s;           // head radius
  const headY = 1.45 * s + hr;                         // 頭中心 (首の上)
  const eS = headBig ? 1.18 : (adult ? 0.9 : 1);       // 目の拡大(子供は大きめ/大人は控えめ)

  // ---- 脚 (太もも+膝+すね+靴/安全靴) ----
  [-1, 1].forEach(sgn => {
    const x = sgn * 0.085 * s;
    const thigh = cap(0.073 * s, 0.20 * s, legM, x, 0.70 * s);     // thigh
    const knee  = sph(0.062 * s, legM, x, 0.50 * s);               // knee
    const shin  = cap(0.057 * s, 0.20 * s, legM, x, 0.30 * s);     // shin
    if (legColorable) thigh.userData.colorable = knee.userData.colorable = shin.userData.colorable = true;
    g.add(thigh); g.add(knee); g.add(shin);
    if (cargo) {   // カーゴポケット (太もも外側 + フラップ)
      const cp = new THREE.Mesh(roundedBoxGeom(0.052 * s, 0.12 * s, 0.085 * s, 0.02 * s, 2), legM);
      cp.position.set(x + sgn * 0.07 * s, 0.40 * s, 0.012 * s); cp.castShadow = true;
      if (legColorable) cp.userData.colorable = true; g.add(cp);
      const fl = box(0.058 * s, 0.022 * s, 0.092 * s, legM, x + sgn * 0.07 * s, 0.465 * s, 0.012 * s);
      if (legColorable) fl.userData.colorable = true; g.add(fl);
    }
    g.add(sph(0.05 * s, soleM, x, 0.052 * s, 0.035 * s));          // ankle/heel (靴の中, 床より上)
    if (boots) {   // 安全靴 (つま先キャップ + 履き口リブ)
      const bm = mat('#16120f', 0.42, 0.18);
      const bt = new THREE.Mesh(roundedBoxGeom(0.118 * s, 0.105 * s, 0.25 * s, 0.05 * s, 3), bm);
      bt.position.set(x, 0.062 * s, 0.05 * s); bt.castShadow = true; g.add(bt);
      const toe = new THREE.Mesh(roundedBoxGeom(0.112 * s, 0.06 * s, 0.075 * s, 0.03 * s, 2), mat('#26221e', 0.3, 0.35));
      toe.position.set(x, 0.05 * s, 0.145 * s); g.add(toe);        // steel toe cap
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.05 * s, 0.017 * s, 8, 14), bm);
      collar.rotation.x = Math.PI / 2; collar.position.set(x, 0.12 * s, 0.005 * s); g.add(collar);
      g.add(box(0.125 * s, 0.025 * s, 0.26 * s, soleM, x, 0.014 * s, 0.05 * s));   // sole
    } else {
      const sh = new THREE.Mesh(roundedBoxGeom(0.105 * s, 0.075 * s, 0.215 * s, 0.04 * s, 3), shoeM);
      sh.position.set(x, 0.05 * s, 0.045 * s); sh.castShadow = true; g.add(sh);
      g.add(box(0.115 * s, 0.022 * s, 0.225 * s, soleM, x, 0.012 * s, 0.045 * s));   // sole
    }
  });
  // ---- 腰 ----
  const pelvis = sph(0.13 * s, legM, 0, 0.9 * s); pelvis.scale.set(1.32, 0.72, 0.9); if (legColorable) pelvis.userData.colorable = true; g.add(pelvis);
  // ---- 胴 (テーパー: 肩広め・薄め) ----
  const torso = cap(0.135 * s, 0.20 * s, topM, 0, 1.15 * s); torso.scale.set(1.18, 1.0, 0.66);
  torso.userData.colorable = true; g.add(torso);
  [-1, 1].forEach(sgn => { const sh = sph(0.06 * s, topM, sgn * 0.148 * s, 1.34 * s); sh.scale.set(1, 0.92, 0.85); sh.userData.colorable = true; g.add(sh); });
  // ---- 作業着ジャケット (襟 / 中央ファスナー / 胸ポケット / 裾ベルト / 肩ポケット) ----
  if (jacket) {
    const cz = 0.09 * s;                                  // 胴前面の z
    const cb = c => { c.userData.colorable = true; return c; };
    [-1, 1].forEach(sgn => {                              // 開襟 (左右)
      const col = box(0.075 * s, 0.062 * s, 0.02 * s, topM, sgn * 0.046 * s, 1.345 * s, cz * 0.66);
      col.rotation.z = sgn * 0.5; col.rotation.x = -0.22; g.add(cb(col));
    });
    g.add(box(0.018 * s, 0.35 * s, 0.012 * s, metalM, 0, 1.165 * s, cz));   // 中央ファスナー
    g.add(sph(0.014 * s, metalM, 0, 1.33 * s, cz));                          // 引き手
    [-1, 1].forEach(sgn => {                              // 胸ポケット×2 (フラップ + ボタン)
      const px = sgn * 0.062 * s;
      g.add(cb(box(0.072 * s, 0.078 * s, 0.012 * s, topM, px, 1.205 * s, cz * 0.99)));
      g.add(cb(box(0.08 * s, 0.026 * s, 0.016 * s, topM, px, 1.247 * s, cz)));
      g.add(sph(0.008 * s, darkM, px, 1.232 * s, cz * 1.05));
    });
    const hem = new THREE.Mesh(roundedBoxGeom(0.30 * s, 0.05 * s, 0.20 * s, 0.02 * s, 2), topM);
    hem.scale.set(1, 1, 0.92); hem.position.set(0, 1.005 * s, 0); g.add(cb(hem));   // 裾ベルト
    g.add(box(0.028 * s, 0.028 * s, 0.02 * s, darkM, 0, 1.0 * s, cz * 0.95));        // 裾スナップ
    g.add(cb(box(0.046 * s, 0.062 * s, 0.012 * s, topM, -0.2 * s, 1.27 * s, 0.05 * s)));  // 肩(袖)ポケット
  }
  // ---- スカート ----
  if (skirt) {
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.155 * s, 0.28 * s, 0.22 * s, 24), botM);
    sk.position.set(0, 0.86 * s, 0); sk.castShadow = true; sk.userData.colorable = true; g.add(sk);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.275 * s, 0.018 * s, 8, 24), mat(shade(topCol, 0.85), 0.7));
    hem.rotation.x = Math.PI / 2; hem.position.y = 0.755 * s; g.add(hem);   // 水平の裾ライン
  }
  // ---- 腕 (上腕=袖 / 前腕=素肌or長袖 + 手/軍手)。肩から少し外向きに自然に下ろす ----
  [-1, 1].forEach(sgn => {
    const upper = cap(0.043 * s, 0.17 * s, topM, sgn * 0.178 * s, 1.18 * s, sgn * 0.05);   // upper (sleeve)
    if (jacket) upper.userData.colorable = true; g.add(upper);
    const foreM = jacket ? topM : skinM;                                                   // 長袖なら前腕も袖
    g.add(sph(0.04 * s, foreM, sgn * 0.188 * s, 1.0 * s));                                 // elbow
    const fore = cap(0.037 * s, 0.17 * s, foreM, sgn * 0.193 * s, 0.85 * s, sgn * 0.03);   // forearm
    if (jacket) fore.userData.colorable = true; g.add(fore);
    if (jacket) { const cf = cap(0.041 * s, 0.018 * s, topM, sgn * 0.196 * s, 0.762 * s, sgn * 0.03); cf.userData.colorable = true; g.add(cf); } // 袖口
    const hmat = gloveM || skinM;
    const hand = sph(0.046 * s, hmat, sgn * 0.197 * s, 0.71 * s); hand.scale.set(0.9, 1.15, 0.72); g.add(hand);
    if (gloveM) {                                                                          // 軍手 (手首リブ + 親指)
      g.add(cap(0.044 * s, 0.022 * s, gloveM, sgn * 0.197 * s, 0.745 * s, sgn * 0.03));
      const th = sph(0.026 * s, gloveM, sgn * 0.18 * s, 0.705 * s, 0.04 * s); th.scale.set(0.8, 1.2, 0.8); g.add(th);
    }
  });
  // ---- 首・頭 ----
  g.add(cap(0.046 * s, 0.05 * s, skinM, 0, 1.42 * s));
  const head = sph(hr, skinM, 0, headY); head.scale.set(0.97, 1.06, 1.0); g.add(head);
  [-1, 1].forEach(sgn => { const ear = sph(0.03 * s, skinM, sgn * hr * 0.97, headY - 0.005 * s); ear.scale.set(0.55, 1, 0.8); g.add(ear); });
  // ---- 顔 ----
  [-1, 1].forEach(sgn => {
    const ex = sgn * 0.052 * s;
    const w = sph(0.03 * s * eS, mat('#fbfbf8', 0.3), ex, headY + 0.004 * s, hr * 0.82); w.scale.set(adult ? 0.92 : 1.0, adult ? 1.02 : 1.25, 0.55); g.add(w);
    g.add(sph(0.02 * s * eS, mat(eye, 0.35), ex, headY + 0.002 * s, hr * 0.9));         // iris
    g.add(sph(0.011 * s * eS, mat('#15100e', 0.4), ex, headY + 0.002 * s, hr * 0.95));  // pupil
    g.add(sph((adult ? 0.005 : 0.007) * s, mat('#ffffff', 0.2), ex - 0.012 * s, headY + (adult ? 0.016 : 0.022) * s, hr * 0.97)); // highlight
    const brow = box((adult ? 0.056 : 0.05) * s, (adult ? 0.014 : 0.01) * s, 0.012 * s, hairM, ex, headY + (adult ? 0.066 : 0.072) * s, hr * 0.84); brow.rotation.z = sgn * (adult ? 0.02 : 0.06); g.add(brow);
    if (!adult) { const blush = sph(0.016 * s, mat('#ffb1bd', 0.6), sgn * 0.086 * s, headY - 0.042 * s, hr * 0.82); blush.scale.set(1.1, 0.62, 0.32); g.add(blush); }
  });
  const nose = sph(0.016 * s, noseM, 0, headY - 0.018 * s, hr * 0.98); nose.scale.set(0.8, 0.85, 1); g.add(nose);
  const smile = new THREE.Mesh(new THREE.TorusGeometry((adult ? 0.018 : 0.024) * s * eS, (adult ? 0.0042 : 0.005) * s, 6, 14, Math.PI), mat(adult ? '#b06a64' : '#c8627a', 0.5));
  smile.position.set(0, headY - (adult ? 0.052 : 0.062) * s, hr * 0.92); smile.rotation.x = Math.PI; g.add(smile);
  // ---- 髪 (背側へずらした帽子状 + 前髪) ----
  if (!helmet) { const cap0 = sph(hr * 1.06, hairM, 0, headY + 0.014 * s, -0.022 * s); cap0.scale.set(1.06, 1.05, 1.07); g.add(cap0); }
  [-0.07, 0, 0.07].forEach((fx, i) => { const f = sph(0.05 * s, hairM, fx * s, headY + hr * (helmet ? 0.36 : 0.52), hr * 0.72); f.scale.set(1, 0.62, 0.6); g.add(f); }); // bangs
  if (style === 'twin') {                 // ツインテール
    [-1, 1].forEach(sgn => {
      g.add(sph(0.045 * s, hairM, sgn * (hr + 0.01 * s), headY + 0.04 * s, -0.01 * s));                        // side puff
      g.add(sph(0.04 * s, mat(ribbon, 0.55), sgn * (hr + 0.02 * s), headY + 0.05 * s, 0.04 * s));              // ribbon
      g.add(cap(0.058 * s, 0.2 * s, hairM, sgn * (hr + 0.06 * s), headY - 0.16 * s, -0.03 * s, sgn * 0.22));    // tail
      g.add(sph(0.055 * s, hairM, sgn * (hr + 0.095 * s), headY - 0.3 * s, -0.05 * s));                        // tail tip
    });
  } else if (style === 'pony') {          // ポニーテール
    g.add(sph(0.05 * s, mat(ribbon, 0.55), 0, headY + 0.05 * s, -hr * 0.72));
    g.add(cap(0.055 * s, 0.24 * s, hairM, 0, headY - 0.16 * s, -hr * 0.85, 0, 0.22));
  } else if (style === 'bun') {           // お団子
    g.add(sph(0.075 * s, hairM, 0, headY + hr * 0.98, -hr * 0.15));
    g.add(new THREE.Mesh(new THREE.TorusGeometry(0.055 * s, 0.018 * s, 6, 16), mat(ribbon, 0.55)).translateY(headY + hr * 0.98).translateZ(-hr * 0.15));
  } else if (style === 'long') {          // ロング
    const back = cap(0.135 * s, 0.30 * s, hairM, 0, headY - 0.2 * s, -hr * 0.5, 0, 0.06); back.scale.set(1.1, 1, 0.5); g.add(back);
  }
  // ---- ヘルメット (白) + 顎紐 ----
  if (helmet) {
    const helmM = mat(helmet, 0.34, 0.04);
    const by = headY + 0.34 * hr;                        // ヘルメット下端 (額の上)
    const dome = new THREE.Mesh(new THREE.SphereGeometry(hr * 1.16, 22, 12, 0, Math.PI * 2, 0, Math.PI / 2), helmM);
    dome.position.set(0, by, 0); dome.scale.set(1.04, 1.12, 1.14); dome.castShadow = true; g.add(dome);
    g.add(box(0.02 * s, 0.035 * s, hr * 1.7, helmM, 0, by + hr * 0.66, 0));           // 中央リブ(クラウン)
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(hr * 1.32, hr * 1.26, 0.028 * s, 24), helmM);
    brim.position.set(0, by + 0.006 * s, 0.012 * s); brim.scale.set(1.0, 1, 1.22); brim.castShadow = true; g.add(brim);
    [-1, 1].forEach(sgn => g.add(cap(0.006 * s, hr * 0.85, darkM, sgn * hr * 0.86, headY - hr * 0.16, hr * 0.34, sgn * 0.18, -0.3)));  // 顎紐
    g.add(box(0.034 * s, 0.02 * s, 0.014 * s, darkM, 0, headY - hr * 0.9, hr * 0.52));   // 顎バックル
  }
  // ---- ランドセル / リュック ----
  if (bag === 'randoseru') {
    const col = mat(skirt ? '#e0466a' : '#2f5fb0', 0.45, 0.1);
    const body = new THREE.Mesh(roundedBoxGeom(0.25 * s, 0.3 * s, 0.12 * s, 0.05 * s, 3), col);
    body.position.set(0, 1.12 * s, -0.16 * s); body.castShadow = true; g.add(body);
    g.add(new THREE.Mesh(roundedBoxGeom(0.24 * s, 0.16 * s, 0.04 * s, 0.03 * s, 3), mat(skirt ? '#c83a5c' : '#27509a', 0.45)).translateY(1.18 * s).translateZ(-0.22 * s)); // flap
    g.add(box(0.05 * s, 0.04 * s, 0.02 * s, mat('#d8d8d0', 0.4, 0.4), 0, 1.12 * s, -0.225 * s)); // clasp
    [-1, 1].forEach(sgn => g.add(cap(0.022 * s, 0.26 * s, col, sgn * 0.12 * s, 1.14 * s, 0.06 * s, sgn * 0.05))); // straps
  } else if (bag === 'backpack') {
    const body = new THREE.Mesh(roundedBoxGeom(0.25 * s, 0.32 * s, 0.14 * s, 0.06 * s, 3), mat(PASTEL.mint, 0.6));
    body.position.set(0, 1.12 * s, -0.17 * s); body.userData.colorable = true; body.castShadow = true; g.add(body);
    [-1, 1].forEach(sgn => g.add(cap(0.022 * s, 0.26 * s, mat(PASTEL.mint, 0.6), sgn * 0.12 * s, 1.14 * s, 0.06 * s, sgn * 0.05)));
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
