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
// 顔は +Z 向き。s=h/1.7 で全身をスケール。headBig で子供体型(大きめの頭)。
function buildPerson({ h = 1.6, skin = '#f4cba0', hair = '#4a3526', style = 'short',
  color, top, bottom = '#5b7fb0', skirt = false, bag = null, headBig = false, shoe = '#e2607a',
  ribbon = '#ef7fa6', eye = '#5a4636' } = {}) {
  const g = new THREE.Group();
  const s = h / 1.7;
  const topCol = color || top || '#ff9aa2';   // 服(colorable)はカラーピッカー対応
  const skinM = mat(skin, 0.66, 0.02), topM = mat(topCol, 0.72), botM = mat(bottom, 0.76),
        hairM = mat(hair, 0.5, 0.06), shoeM = mat(shoe, 0.4, 0.12), soleM = mat('#2c2c2e', 0.85),
        noseM = mat(shade(skin, 0.95), 0.7);
  const legM = skirt ? skinM : botM;                  // スカートなら脚は素肌
  const hr = (headBig ? 0.155 : 0.125) * s;           // head radius
  const headY = 1.45 * s + hr;                         // 頭中心 (首の上)
  const eS = headBig ? 1.18 : 1;                       // 目の拡大(子供は大きめ)

  // ---- 脚 (太もも+膝+すね+靴) ----
  [-1, 1].forEach(sgn => {
    const x = sgn * 0.085 * s;
    g.add(cap(0.073 * s, 0.20 * s, legM, x, 0.70 * s));            // thigh
    g.add(sph(0.062 * s, legM, x, 0.50 * s));                      // knee
    g.add(cap(0.057 * s, 0.20 * s, legM, x, 0.30 * s));            // shin
    g.add(sph(0.05 * s, soleM, x, 0.013 * s, 0.035 * s));          // ankle/heel
    const sh = new THREE.Mesh(roundedBoxGeom(0.105 * s, 0.075 * s, 0.215 * s, 0.04 * s, 3), shoeM);
    sh.position.set(x, 0.05 * s, 0.045 * s); sh.castShadow = true; g.add(sh);
    g.add(box(0.115 * s, 0.022 * s, 0.225 * s, soleM, x, 0.012 * s, 0.045 * s));   // sole
  });
  // ---- 腰 ----
  const pelvis = sph(0.13 * s, legM, 0, 0.9 * s); pelvis.scale.set(1.32, 0.72, 0.9); g.add(pelvis);
  // ---- 胴 (テーパー: 肩広め・薄め) ----
  const torso = cap(0.135 * s, 0.20 * s, topM, 0, 1.15 * s); torso.scale.set(1.18, 1.0, 0.66);
  torso.userData.colorable = true; g.add(torso);
  [-1, 1].forEach(sgn => { const sh = sph(0.06 * s, topM, sgn * 0.148 * s, 1.34 * s); sh.scale.set(1, 0.92, 0.85); sh.userData.colorable = true; g.add(sh); });
  // ---- スカート ----
  if (skirt) {
    const sk = new THREE.Mesh(new THREE.CylinderGeometry(0.155 * s, 0.28 * s, 0.22 * s, 24), botM);
    sk.position.set(0, 0.86 * s, 0); sk.castShadow = true; sk.userData.colorable = true; g.add(sk);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.275 * s, 0.018 * s, 8, 24), mat(shade(topCol, 0.85), 0.7));
    hem.rotation.x = Math.PI / 2; hem.position.y = 0.755 * s; g.add(hem);   // 水平の裾ライン
  }
  // ---- 腕 (上腕=袖 / 前腕=素肌 + 手)。肩から少し外向きに自然に下ろす ----
  [-1, 1].forEach(sgn => {
    g.add(cap(0.043 * s, 0.17 * s, topM, sgn * 0.178 * s, 1.18 * s, sgn * 0.05));   // upper (sleeve)
    g.add(sph(0.04 * s, skinM, sgn * 0.188 * s, 1.0 * s));                          // elbow
    g.add(cap(0.037 * s, 0.17 * s, skinM, sgn * 0.193 * s, 0.85 * s, sgn * 0.03));  // forearm
    const hand = sph(0.046 * s, skinM, sgn * 0.197 * s, 0.71 * s); hand.scale.set(0.9, 1.15, 0.72); g.add(hand);
  });
  // ---- 首・頭 ----
  g.add(cap(0.046 * s, 0.05 * s, skinM, 0, 1.42 * s));
  const head = sph(hr, skinM, 0, headY); head.scale.set(0.97, 1.06, 1.0); g.add(head);
  [-1, 1].forEach(sgn => { const ear = sph(0.03 * s, skinM, sgn * hr * 0.97, headY - 0.005 * s); ear.scale.set(0.55, 1, 0.8); g.add(ear); });
  // ---- 顔 ----
  [-1, 1].forEach(sgn => {
    const ex = sgn * 0.052 * s;
    const w = sph(0.03 * s * eS, mat('#fbfbf8', 0.3), ex, headY + 0.004 * s, hr * 0.82); w.scale.set(1.0, 1.25, 0.55); g.add(w);
    g.add(sph(0.02 * s * eS, mat(eye, 0.35), ex, headY + 0.002 * s, hr * 0.9));         // iris
    g.add(sph(0.011 * s * eS, mat('#15100e', 0.4), ex, headY + 0.002 * s, hr * 0.95));  // pupil
    g.add(sph(0.007 * s, mat('#ffffff', 0.2), ex - 0.012 * s, headY + 0.022 * s, hr * 0.97)); // highlight
    const brow = box(0.05 * s, 0.01 * s, 0.012 * s, hairM, ex, headY + 0.072 * s, hr * 0.84); brow.rotation.z = sgn * 0.06; g.add(brow);
    const blush = sph(0.016 * s, mat('#ffb1bd', 0.6), sgn * 0.086 * s, headY - 0.042 * s, hr * 0.82); blush.scale.set(1.1, 0.62, 0.32); g.add(blush);
  });
  const nose = sph(0.016 * s, noseM, 0, headY - 0.018 * s, hr * 0.98); nose.scale.set(0.8, 0.85, 1); g.add(nose);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.024 * s * eS, 0.005 * s, 6, 14, Math.PI), mat('#c8627a', 0.5));
  smile.position.set(0, headY - 0.062 * s, hr * 0.9); smile.rotation.x = Math.PI; g.add(smile);
  // ---- 髪 (背側へずらした帽子状 + 前髪) ----
  const cap0 = sph(hr * 1.06, hairM, 0, headY + 0.014 * s, -0.022 * s); cap0.scale.set(1.06, 1.05, 1.07); g.add(cap0);
  [-0.07, 0, 0.07].forEach((fx, i) => { const f = sph(0.05 * s, hairM, fx * s, headY + hr * 0.52, hr * 0.72); f.scale.set(1, 0.62, 0.6); g.add(f); }); // bangs
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
function buildTeddyBear({ color = '#c79a6a', w = 0.36, d = 0.32, h = 0.46 } = {}) {
  const g = new THREE.Group();
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
function buildBunnyPlush({ color = '#fbf4f6', w = 0.3, d = 0.3, h = 0.52 } = {}) {
  const g = new THREE.Group();
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
function buildUnicornToy({ color = '#f3e3f7', w = 0.5, d = 0.26, h = 0.6 } = {}) {
  const g = new THREE.Group();
  const bodyM = mat(color, 0.85), maneM = mat('#b9a0ec', 0.7), horn = mat('#ffe08a', 0.4, 0.3);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.18, 6, 12), bodyM); body.rotation.z = Math.PI / 2; body.position.set(0, 0.28, 0); body.userData.colorable = true; g.add(body);
  [[-0.13, -0.07], [0.13, -0.07], [-0.13, 0.07], [0.13, 0.07]].forEach(([x, z]) => g.add(box(0.05, 0.18, 0.05, bodyM, x, 0.09, z)));
  const head = sph(0.1, bodyM, 0.2, 0.4, 0); head.scale.set(1.1, 1, 0.9); head.userData.colorable = true; g.add(head);
  g.add(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.12, 10), horn).translateX(0.27).translateY(0.5)); // horn
  [-1, 1].forEach(sgn => g.add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 8), bodyM).translateX(0.16).translateY(0.49).translateZ(sgn * 0.05))); // ears
  g.add(sph(0.012, mat('#5a4a55', 0.4), 0.28, 0.41, 0.08, 8)); // eye
  // mane + tail
  [0.06, 0.12, 0.0, -0.06].forEach((zx, i) => g.add(sph(0.05, maneM, 0.08 - i * 0.04, 0.46 - i * 0.02, 0)));
  g.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.16, 4, 8), maneM).translateX(-0.22).translateY(0.28));
  return g;
}
function buildBalloon({ color = '#ff7d9c', w = 0.3, d = 0.3, h = 1.5 } = {}) {
  const g = new THREE.Group();
  const balloonM = mat(color, 0.35, 0.05), stringM = mat('#cfcfcf', 0.7);
  const top = 1.32;
  const b = sph(0.17, balloonM, 0, top, 0); b.scale.set(1, 1.18, 1); b.userData.colorable = true; g.add(b);
  g.add(new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.05, 8), balloonM).translateY(top - 0.2)); // knot
  g.add(cylAt(0.004, 0.004, top - 0.25, 5, stringM, 0, (top - 0.25) / 2 + 0.03, 0)); // string
  g.add(cylAt(0.05, 0.06, 0.04, 12, mat('#caa46d', 0.6), 0, 0.02, 0)); // little weight
  // highlight
  g.add(sph(0.04, mat('#ffffff', 0.2), -0.06, top + 0.05, 0.12, 8));
  return g;
}
function buildHeartCushion({ color = '#ff8fab', w = 0.5, d = 0.5, h = 0.18 } = {}) {
  const g = new THREE.Group();
  const fab = fabricMat(color);
  const lobe = (sgn) => { const m = sph(0.14, fab, sgn * 0.1, 0.12, 0.02); m.scale.set(1, 0.6, 1); m.userData.colorable = true; return m; };
  g.add(lobe(-1)); g.add(lobe(1));
  const bottom = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.26, 4), fab); bottom.position.set(0, 0.04, 0.02); bottom.rotation.y = Math.PI / 4; bottom.scale.set(1, 0.45, 1); bottom.userData.colorable = true; g.add(bottom);
  g.add(sph(0.02, mat(shade(color, 0.8), 0.9), 0, 0.13, 0.12, 8)); // center button
  return g;
}
function buildBuildingBlocks({ color = '#ff9aa2', w = 0.3, d = 0.3, h = 0.3 } = {}) {
  const g = new THREE.Group();
  const cols = ['#ff9aa2', '#ffd382', '#a9e7cf', '#a9d8f0', '#c9b3ec', '#ffb3c6'];
  const place = [[-0.08, 0.05, 0, 0.1], [0.06, 0.05, -0.05, 0.1], [0.0, 0.05, 0.07, 0.09],
                 [-0.03, 0.16, 0.0, 0.1], [0.08, 0.17, 0.05, 0.08]];
  place.forEach((p, i) => {
    const sz = p[3];
    const b = new THREE.Mesh(roundedBoxGeom(sz, sz, sz, 0.012, 2), mat(cols[i % cols.length], 0.65));
    b.position.set(p[0], p[1], p[2]); b.rotation.y = (i * 0.5); b.castShadow = true; g.add(b);
    // letter dot
    g.add(box(sz * 0.4, sz * 0.4, 0.004, mat('#fff', 0.7), p[0], p[1], p[2] + sz / 2 + 0.002));
  });
  return g;
}
function buildToyBox({ color = '#9ad0ec', w = 0.6, d = 0.42, h = 0.4 } = {}) {
  const g = new THREE.Group();
  const boxM = mat(color, 0.6), rimM = mat(shade(color, 0.82), 0.6);
  const bodyH = 0.34;
  [[0, -d / 2 + 0.02, w, 0.04], [0, d / 2 - 0.02, w, 0.04]].forEach(([x, z, ww, t]) => g.add(box(ww, bodyH, t, boxM, x, bodyH / 2, z)));
  [[-w / 2 + 0.02, 0, 0.04, d], [w / 2 - 0.02, 0, 0.04, d]].forEach(([x, z, t, dd]) => g.add(box(t, bodyH, dd, boxM, x, bodyH / 2, z)));
  g.add(box(w - 0.02, 0.03, d - 0.02, rimM, 0, bodyH, 0)); // top rim
  g.add(box(w - 0.06, 0.02, d - 0.06, mat(shade(color, 0.7), 0.7), 0, 0.02, 0)); // floor
  // spilling toys
  g.add(sph(0.06, mat('#ff9aa2', 0.6), -0.12, bodyH + 0.04, 0.05));
  g.add(new THREE.Mesh(roundedBoxGeom(0.09, 0.09, 0.09, 0.012, 2), mat('#ffd382', 0.65)).translateX(0.08).translateY(bodyH + 0.05).translateZ(-0.04));
  g.add(sph(0.05, mat('#a9e7cf', 0.6), 0.16, bodyH + 0.02, 0.08));
  g.add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 10), mat('#c9b3ec', 0.6)).translateX(-0.02).translateY(bodyH + 0.06));
  // label heart
  g.add(box(0.1, 0.1, 0.01, mat('#ff8fab', 0.6), 0, bodyH * 0.55, d / 2 + 0.005));
  return g;
}
function buildDollhouse({ color = '#ffd1e0', w = 0.6, d = 0.42, h = 0.7 } = {}) {
  const g = new THREE.Group();
  const wallM = mat(color, 0.7), roofM = mat('#f29bb6', 0.65), doorM = mat('#caa46d', 0.6), winM = mat('#bfe3f5', 0.3, 0.2);
  const bodyH = 0.46;
  const body = new THREE.Mesh(roundedBoxGeom(w, bodyH, d, 0.02, 2), wallM); body.position.set(0, bodyH / 2 + 0.02, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  // gable roof
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.001, w * 0.62, 0.22, 4), roofM); roof.rotation.y = Math.PI / 4; roof.position.set(0, bodyH + 0.13, 0); roof.scale.set(1, 1, d / w); roof.castShadow = true; g.add(roof);
  // door + heart window + side windows
  g.add(box(0.13, 0.22, 0.02, doorM, 0, 0.15, d / 2 + 0.005));
  g.add(sph(0.018, mat('#ffe08a', 0.4), 0.04, 0.16, d / 2 + 0.02, 8)); // knob
  g.add(box(0.1, 0.1, 0.02, winM, -0.17, 0.3, d / 2 + 0.005));
  g.add(box(0.1, 0.1, 0.02, winM, 0.17, 0.3, d / 2 + 0.005));
  g.add(box(0.012, 0.1, 0.022, mat('#fff', 0.6), -0.17, 0.3, d / 2 + 0.008));
  g.add(box(0.1, 0.012, 0.022, mat('#fff', 0.6), -0.17, 0.3, d / 2 + 0.008));
  // chimney
  g.add(box(0.06, 0.12, 0.06, wallM, w * 0.28, bodyH + 0.16, 0));
  return g;
}
function buildCake({ color = '#fff3ea', w = 0.32, d = 0.32, h = 0.2 } = {}) {
  const g = new THREE.Group();
  const sponge = mat('#f3d9b8', 0.8), cream = mat(color, 0.7), berry = mat('#e2425a', 0.5);
  g.add(cylAt(0.15, 0.15, 0.07, 28, sponge, 0, 0.035, 0));   // sponge
  g.add(cylAt(0.155, 0.155, 0.035, 28, cream, 0, 0.09, 0));  // cream layer
  const topCream = cylAt(0.15, 0.152, 0.05, 28, cream, 0, 0.13, 0); topCream.userData.colorable = true; g.add(topCream);
  // strawberries around top
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; g.add(new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.04, 8), berry).translateX(Math.cos(a) * 0.1).translateY(0.17).translateZ(Math.sin(a) * 0.1)); }
  // candles
  ['#ff9aa2', '#a9d8f0', '#ffd382'].forEach((c, i) => {
    const cx = (i - 1) * 0.05; g.add(cylAt(0.006, 0.006, 0.08, 6, mat(c, 0.6), cx, 0.2, 0));
    g.add(sph(0.012, mat('#ffcf6a', 0.2, 0.0, { emissive: '#ffb030', emissiveIntensity: 1.2 }), cx, 0.25, 0, 6));
  });
  return g;
}
function buildCupcake({ color = '#ffb3c6', w = 0.14, d = 0.14, h = 0.16 } = {}) {
  const g = new THREE.Group();
  const wrap = mat('#f2c14e', 0.6), cream = mat(color, 0.7);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.038, 0.06, 16), wrap).translateY(0.03));
  for (let i = 0; i < 3; i++) g.add(cylAt(0.05 - i * 0.012, 0.045 - i * 0.012, 0.03, 16, cream, 0, 0.075 + i * 0.025, 0));
  const sw = cylAt(0.018, 0.0, 0.03, 12, cream, 0, 0.15, 0); sw.userData.colorable = true; g.add(sw);
  g.add(sph(0.013, mat('#e2425a', 0.5), 0, 0.16, 0, 8)); // cherry
  return g;
}
function buildKidsBed({ color = '#fbe3ec', w = 1.05, d = 1.9, h = 1.7 } = {}) {
  const g = new THREE.Group();
  const frame = mat('#f4b9cf', 0.6), heartM = mat('#ff8fab', 0.55);
  // ---- ベース (脚 + 台座) ----
  [[-w/2+0.08,-d/2+0.1],[w/2-0.08,-d/2+0.1],[-w/2+0.08,d/2-0.1],[w/2-0.08,d/2-0.1]].forEach(([lx,lz]) => g.add(cylAt(0.035, 0.025, 0.18, 10, frame, lx, 0.09, lz)));
  g.add(box(w-0.03, 0.13, d-0.03, frame, 0, 0.25, 0));
  // ---- 寝具一式 (共通 bedding) ----
  g.add(bedding(w-0.06, d-0.06, 0.42, { duvet: color, mattH: 0.14, accent: true, fold: true, throwFoot: false, pillowZ: 0.32 }));
  // ---- ハート付きヘッドボード + フットボード ----
  const hb = new THREE.Mesh(roundedBoxGeom(w, 0.52, 0.09, 0.08, 4), frame); hb.position.set(0, 0.56, -d/2 + 0.05); hb.castShadow = true; g.add(hb);
  // ハート(2球+回転キューブ)
  [-1, 1].forEach(sgn => g.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), heartM).translateX(sgn*0.05).translateY(0.72).translateZ(-d/2 + 0.1)));
  const hc = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.05), heartM); hc.position.set(0, 0.66, -d/2 + 0.1); hc.rotation.z = Math.PI/4; g.add(hc);
  g.add(new THREE.Mesh(roundedBoxGeom(w, 0.26, 0.09, 0.06, 4), frame).translateY(0.34).translateZ(d/2 - 0.05)); // footboard
  // ---- 天蓋 (4本柱 + コーン屋根 + シアーのドレープ) ----
  [[-w/2+0.06,-d/2+0.06],[w/2-0.06,-d/2+0.06],[-w/2+0.06,d/2-0.06],[w/2-0.06,d/2-0.06]].forEach(([x,z]) => {
    g.add(cylAt(0.028, 0.028, h, 12, frame, x, h/2, z));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 10), frame).translateX(x).translateY(h+0.02).translateZ(z));
  });
  const canopy = new THREE.Mesh(new THREE.ConeGeometry(w*0.82, 0.34, 16), fabricMat(shade(color, 1.05)));
  canopy.position.set(0, h + 0.14, 0); canopy.castShadow = true; g.add(canopy);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.014, 8, 14), mat('#ffd86a', 0.4, 0.3)).translateY(h+0.32)); // 天蓋トップ飾り
  // 四隅から流れるシアー (前2本のみ・透け感)
  [[-1, d/2-0.06],[1, d/2-0.06]].forEach(([sgn, z]) => {
    const dr = new THREE.Mesh(roundedBoxGeom(0.03, h*0.62, 0.42, 0.01, 2), fabricMat('#fff'));
    dr.position.set(sgn*(w/2-0.07), h*0.55, z); dr.material.transparent = true; dr.material.opacity = 0.42; g.add(dr);
  });
  [[-1, -d/2+0.06],[1, -d/2+0.06]].forEach(([sgn, z]) => {
    const dr = new THREE.Mesh(roundedBoxGeom(0.03, h*0.62, 0.42, 0.01, 2), fabricMat('#fff'));
    dr.position.set(sgn*(w/2-0.07), h*0.55, z); dr.material.transparent = true; dr.material.opacity = 0.42; g.add(dr);
  });
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}
function buildKidsDesk({ color = '#bfe3f5', w = 0.8, d = 0.5, h = 0.56 } = {}) {
  const g = new THREE.Group();
  const woodM = mat(color, 0.6), legM = mat('#f4b9cf', 0.6);
  const top = new THREE.Mesh(roundedBoxGeom(w, 0.04, d, 0.02, 2), woodM); top.position.set(0, h - 0.02, 0); top.castShadow = true; top.userData.colorable = true; g.add(top);
  [[-w / 2 + 0.06, d / 2 - 0.06], [w / 2 - 0.06, d / 2 - 0.06], [-w / 2 + 0.06, -(d / 2 - 0.06)], [w / 2 - 0.06, -(d / 2 - 0.06)]].forEach(([x, z]) => g.add(cylAt(0.03, 0.03, h - 0.04, 8, legM, x, (h - 0.04) / 2, z)));
  g.add(box(w - 0.12, 0.12, 0.03, woodM, 0, h - 0.12, -(d / 2 - 0.05))); // back panel
  g.add(box(0.16, 0.1, 0.012, mat('#ff8fab', 0.6), 0, h - 0.12, -(d / 2 - 0.066))); // heart deco
  return g;
}
function buildKidsChair({ color = '#ffd382', w = 0.34, d = 0.34, h = 0.6 } = {}) {
  const g = new THREE.Group();
  const seatM = mat(color, 0.6), legM = mat('#a9e7cf', 0.6);
  const seat = new THREE.Mesh(roundedBoxGeom(w, 0.04, d, 0.02, 2), seatM); seat.position.set(0, 0.32, 0); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  const back = new THREE.Mesh(roundedBoxGeom(w, 0.24, 0.04, 0.04, 3), seatM); back.position.set(0, 0.48, -(d / 2 - 0.03)); back.userData.colorable = true; g.add(back);
  g.add(box(0.1, 0.09, 0.012, mat('#ff8fab', 0.6), 0, 0.49, -(d / 2 - 0.045))); // heart on back
  [[-w / 2 + 0.04, d / 2 - 0.04], [w / 2 - 0.04, d / 2 - 0.04], [-w / 2 + 0.04, -(d / 2 - 0.04)], [w / 2 - 0.04, -(d / 2 - 0.04)]].forEach(([x, z]) => g.add(cylAt(0.022, 0.022, 0.32, 8, legM, x, 0.16, z)));
  return g;
}
// 壁飾り: 顔(柄)を +Z に向ける壁掛け
function buildGarland({ color = '#ff9aa2', w = 1.3, d = 0.04, h = 0.4 } = {}) {
  const g = new THREE.Group(); const cy = 1.9;
  const cols = ['#ff9aa2', '#ffd382', '#a9e7cf', '#a9d8f0', '#c9b3ec'];
  // string
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = -w / 2 + t * w, y = cy + Math.sin(t * Math.PI) * 0.06;
    if (i < n) { const flag = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.13, 3), mat(cols[i % cols.length], 0.6)); flag.position.set(x + w / n / 2, y - 0.09, 0.005); flag.rotation.x = Math.PI; g.add(flag); }
    g.add(sph(0.008, mat('#caa46d', 0.7), x, y, 0, 6));
  }
  return g;
}
function buildStarWall({ color = '#ffe08a', w = 0.6, d = 0.04, h = 0.55 } = {}) {
  const g = new THREE.Group(); const cy = 1.6;
  const star = (x, y, r, c) => { const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 5), mat(c, 0.5, 0.1)); s.rotation.x = Math.PI / 2; s.position.set(x, cy + y, 0.01); s.castShadow = true; if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) s.userData.colorable = true; return s; };
  g.add(star(0, 0.05, 0.12, color));
  g.add(star(-0.22, -0.12, 0.06, '#a9d8f0'));
  g.add(star(0.22, 0.16, 0.05, '#ff9aa2'));
  // crescent moon
  const moon = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.04, 8, 16, Math.PI * 1.3), mat('#ffe9a8', 0.5)); moon.position.set(0.2, cy - 0.16, 0.01); g.add(moon);
  // little cloud
  [-0.04, 0.02, 0.08].forEach((dx, i) => g.add(sph(0.05 - Math.abs(i - 1) * 0.012, mat('#fff', 0.8), -0.22 + dx, cy + 0.18, 0.01)));
  return g;
}

export {
  buildPerson, buildTeddyBear, buildBunnyPlush, buildUnicornToy, buildBalloon, buildHeartCushion,
  buildBuildingBlocks, buildToyBox, buildDollhouse, buildCake, buildCupcake,
  buildKidsBed, buildKidsDesk, buildKidsChair, buildGarland, buildStarWall,
};
