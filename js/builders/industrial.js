import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';
import { buildPerson } from './kawaii.js';

// TRUSCO 軽量作業台 AE型 (W1500×D750×H740, 均等荷重300kg): 角パイプ脚(緑)・ポリ化粧天板・下棚。万力は表現用の付属品。
function buildWorkbench({ color='#6b7280', w=1.5, d=0.75, h=0.74 } = {}) {
  const g = new THREE.Group();
  const steel = mat('#4e8d69', 0.45, 0.35);   // TRUSCO グリーン塗装フレーム
  const darkM = mat('#3a4252', 0.32, 0.65);

  // ポリ化粧天板 (厚さ約30mm) — 色変更対象
  const top = box(w, 0.03, d, mat(color, 0.5, 0.05), 0, h - 0.015, 0);
  top.userData.colorable = true; g.add(top);
  g.add(box(w, 0.04, d, mat('#3f4a44', 0.6, 0.2), 0, h - 0.05, 0));   // 天板下の受け枠

  // 4 square-tube legs with leveling feet
  const lx = w / 2 - 0.06, lz = d / 2 - 0.06;
  [[lx, lz], [lx, -lz], [-lx, lz], [-lx, -lz]].forEach(([x, z]) => {
    g.add(box(0.065, h - 0.07, 0.065, steel, x, (h - 0.07) / 2, z));
    const foot = cyl(0.042, 0.05, 0.04, 8, darkM); foot.position.set(x, 0.02, z); g.add(foot);
  });

  // Aprons (rails directly under tabletop, front/back/sides)
  const aY = h - 0.07 - 0.05;
  g.add(box(w - 0.12, 0.09, 0.05, steel, 0, aY, -d / 2 + 0.025));
  g.add(box(w - 0.12, 0.09, 0.05, steel, 0, aY,  d / 2 - 0.025));
  g.add(box(0.05, 0.09, d - 0.12, steel, -w / 2 + 0.025, aY, 0));
  g.add(box(0.05, 0.09, d - 0.12, steel,  w / 2 - 0.025, aY, 0));

  // Lower cross-stretchers
  const sY = 0.22;
  g.add(box(w - 0.12, 0.05, 0.05, steel, 0, sY, -lz));
  g.add(box(w - 0.12, 0.05, 0.05, steel, 0, sY,  lz));
  g.add(box(0.05, 0.05, d - 0.12, steel, -lx, sY, 0));
  g.add(box(0.05, 0.05, d - 0.12, steel,  lx, sY, 0));

  // 下棚 (AE型付属の中棚)
  g.add(box(w - 0.16, 0.02, d - 0.16, mat('#4e8d69', 0.5, 0.3), 0, sY + 0.035, 0));

  // Machinist bench vise (front-left corner)
  const vx = -w / 2 + 0.22, vz = -d / 2 + 0.01;
  const vm = mat('#2c3344', 0.32, 0.72);
  g.add(box(0.2, 0.04, 0.14, vm, vx, h - 0.02, vz + 0.07));
  g.add(box(0.2, 0.11, 0.04, vm, vx, h + 0.055, vz + 0.02));
  g.add(box(0.2, 0.11, 0.04, vm, vx, h + 0.055, vz + 0.11));
  g.add(box(0.18, 0.09, 0.008, mat('#5a6474', 0.38, 0.62), vx, h + 0.055, vz + 0.024));
  g.add(box(0.18, 0.09, 0.008, mat('#5a6474', 0.38, 0.62), vx, h + 0.055, vz + 0.106));
  const screw = cyl(0.016, 0.016, 0.14, 10, mat('#8a94a2', 0.22, 0.84));
  screw.rotation.x = Math.PI / 2; screw.position.set(vx, h + 0.033, vz + 0.07); g.add(screw);
  const tbar = cyl(0.012, 0.012, 0.24, 8, mat('#6a7482', 0.28, 0.72));
  tbar.rotation.z = Math.PI / 2; tbar.position.set(vx, h + 0.033, vz - 0.04); g.add(tbar);
  [-0.1, 0.1].forEach(dx => {
    const knb = cyl(0.022, 0.022, 0.04, 8, mat('#5a6474', 0.3, 0.7));
    knb.rotation.z = Math.PI / 2; knb.position.set(vx + dx, h + 0.033, vz - 0.04); g.add(knb);
  });

  return g;
}

// KTC ローラーキャビネット SKX3805 (W680×D460×H975): 5段引出し(浅3+深2)・キャスター・側面ハンドル
function buildToolCabinet({ color='#c8102e', w=0.68, d=0.46, h=0.975 } = {}) {
  const g = new THREE.Group();
  const darkM = mat('#28303a', 0.32, 0.72);
  const chrM  = mat('#b0bac8', 0.14, 0.88);

  // Caster wheels (support cabinet from below)
  const castR = 0.052;
  const bodyBase = castR * 2 + 0.05; // cabinet bottom height ≈ 0.154
  const bodyH = h - bodyBase;

  [[-w/2+0.1, d/2-0.08], [w/2-0.1, d/2-0.08],
   [-w/2+0.1, -d/2+0.08], [w/2-0.1, -d/2+0.08]].forEach(([cx, cz]) => {
    g.add(box(0.038, 0.05, 0.038, darkM, cx, castR * 2 + 0.025, cz));  // mounting bracket
    const tire = cyl(castR, castR, 0.036, 14, mat('#181c22', 0.9, 0.05));
    tire.rotation.x = Math.PI / 2; tire.position.set(cx, castR, cz); g.add(tire);
    const hub = cyl(castR * 0.46, castR * 0.46, 0.038, 10, mat('#8a94a8', 0.22, 0.78));
    hub.rotation.x = Math.PI / 2; hub.position.set(cx, castR, cz); g.add(hub);
    for (let a = 0; a < 4; a++) {
      const ba = a * Math.PI / 2;
      const blt = cyl(0.005, 0.005, 0.04, 6, darkM);
      blt.rotation.x = Math.PI / 2;
      blt.position.set(cx + Math.cos(ba) * 0.016, castR + Math.sin(ba) * 0.016, cz);
      g.add(blt);
    }
  });

  // Cabinet body
  const bCY = bodyBase + bodyH / 2;
  const body = box(w, bodyH, d, mat(color, 0.35, 0.55), 0, bCY, 0);
  body.userData.colorable = true; g.add(body);

  // Top rubber mat
  g.add(box(w - 0.04, 0.026, d - 0.04, mat('#1a1e26', 0.88, 0.04), 0, bodyBase + bodyH + 0.013, 0));

  // 5 drawers (KTC: shallow ×3 on top, deep ×2 below) with recessed panels and bar handles
  const weights = [0.8, 0.8, 1.0, 1.45, 1.95];
  const sumW = weights.reduce((a, b) => a + b, 0);
  const drArea = bodyH - 0.06;
  const drGap = 0.011;
  let dy0 = bodyBase + 0.03;
  weights.forEach(wt => {
    const drH = drArea * wt / sumW;
    const dy = dy0 + drH / 2; dy0 += drH;
    const drFront = box(w - 0.04, drH - drGap, 0.03, mat(shade(color, 1.06), 0.38, 0.52), 0, dy, d / 2 + 0.001);
    drFront.userData.colorable = true; g.add(drFront);
    // Recessed inset
    g.add(box(w - 0.1, drH - drGap - 0.03, 0.01, mat(shade(color, 0.84), 0.44, 0.48), 0, dy, d / 2 + 0.008));
    // Bar handle (full-width aluminium pull, KTC style)
    const bar = cyl(0.007, 0.007, w - 0.22, 10, chrM);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, dy + drH * 0.28, d / 2 + 0.03); g.add(bar);
    // Handle bracket posts + end knobs
    [-(w / 2 - 0.15), (w / 2 - 0.15)].forEach(hx => {
      g.add(box(0.01, 0.016, 0.022, chrM, hx, dy + drH * 0.28, d / 2 + 0.021));
      const knb = cyl(0.011, 0.011, 0.01, 8, chrM);
      knb.rotation.z = Math.PI / 2; knb.position.set(hx, dy + drH * 0.28, d / 2 + 0.031); g.add(knb);
    });
  });

  // Central key lock (top rail)
  g.add(cylAt(0.012, 0.012, 0.01, 10, chrM, 0, bodyBase + bodyH - 0.02, d / 2 + 0.005).rotateX(Math.PI / 2));

  // Side push handle (right side, tubular)
  const hy = bodyBase + bodyH - 0.06;
  const hbar = cyl(0.012, 0.012, d * 0.7, 10, chrM); hbar.rotation.x = Math.PI / 2; hbar.position.set(w / 2 + 0.045, hy, 0); g.add(hbar);
  [-d * 0.3, d * 0.3].forEach(hz => { const post = cyl(0.01, 0.01, 0.05, 8, chrM); post.rotation.z = Math.PI / 2; post.position.set(w / 2 + 0.022, hy, hz); g.add(post); });

  // Nameplate (front top rail)
  g.add(box(0.12, 0.022, 0.004, mat('#f0eee8', 0.6), -w / 2 + 0.12, bodyBase + bodyH - 0.02, d / 2 + 0.004));

  return g;
}

function buildConveyor({ color='#34543f', w=2.4, d=0.5, h=0.82 } = {}) {
  const g = new THREE.Group();
  // aluminium-extrusion flat-belt conveyor: bright alu frame/legs, green PVC belt, geared motor
  const alu    = mat('#c4c8cc', 0.3, 0.85, { env: 1.1 });    // aluminium extrusion (frame/legs/pulleys)
  const aluD   = mat('#a6abb0', 0.35, 0.75, { env: 0.9 });   // shaded aluminium / plates
  const belt   = mat(color, 0.6, 0.04, { env: 0.2 });        // PVC belt (colorable)
  const rubber = mat('#1a1a1a', 0.92, 0.0);                  // foot pads
  const gearA  = mat('#b6bbc0', 0.35, 0.7, { env: 0.9 });    // gearbox aluminium
  const motorM = mat('#3a3f45', 0.5, 0.4);                   // motor body
  const bolt   = mat('#80868c', 0.4, 0.7);

  const beltW = 0.34, fZ = 0.2, topY = h;
  const rP = 0.075, pulleyY = topY - rP;
  const headX = w/2 - 0.09, tailX = -w/2 + 0.09;
  const railCY = topY - 0.07, railH = 0.1, railThk = 0.045;

  // ---- side aluminium extrusion rails (T-slot look) ----
  [-fZ, fZ].forEach(z => {
    g.add(box(w, railH, railThk, alu, 0, railCY, z));
    g.add(box(w, 0.012, railThk + 0.004, aluD, 0, railCY, z));                  // centre groove line
    g.add(box(w, 0.02, railThk + 0.01, alu, 0, railCY + railH/2 - 0.01, z));    // top flange
  });
  // slider bed under the belt
  g.add(box(headX - tailX, 0.02, beltW + 0.03, aluD, 0, topY - 0.035, 0));
  // cross members tying the two rails
  for (let x = tailX + 0.4; x < headX - 0.1; x += 0.5) g.add(box(0.04, 0.04, fZ*2 - 0.02, alu, x, railCY - 0.03, 0));

  // ---- end pulleys (silver core + green belt wrap; spun by interactor) ----
  const makePulley = (x) => {
    const grp = new THREE.Group(); grp.position.set(x, pulleyY, 0);
    const core = cyl(rP, rP, beltW + 0.05, 20, alu); core.rotation.x = Math.PI/2; grp.add(core);
    const wrap = cyl(rP + 0.005, rP + 0.005, beltW, 20, belt); wrap.rotation.x = Math.PI/2; grp.add(wrap);
    [beltW/2 + 0.026, -(beltW/2 + 0.026)].forEach(cz => {            // end-cap detail so spin reads
      grp.add(cylAt(rP*0.55, rP*0.55, 0.006, 14, aluD, 0, 0, cz).rotateX(Math.PI/2));
      grp.add(cylAt(0.012, 0.012, 0.012, 8, bolt, 0, rP*0.3, cz + Math.sign(cz)*0.004).rotateX(Math.PI/2));
    });
    g.add(grp); return grp;
  };
  const drumH = makePulley(headX), drumT = makePulley(tailX);

  // ---- belt: smooth green top run + lower return strand ----
  g.add(box(headX - tailX, 0.014, beltW, belt, 0, topY, 0));
  g.add(box(headX - tailX, 0.012, beltW, belt, 0, pulleyY - rP, 0));

  // ---- support legs (2 stations) with H-frame bracing + adjustable feet ----
  const lx0 = w*0.28;
  const legTopY = railCY - railH/2;
  const footY = 0.055, legBotY = footY + 0.02;
  const legH = legTopY - legBotY, legCY = (legTopY + legBotY)/2;
  const lowY = legBotY + 0.16;
  [-lx0, lx0].forEach(lx => {
    [-fZ, fZ].forEach(lz => {
      g.add(box(0.05, legH, 0.05, alu, lx, legCY, lz));                          // leg extrusion
      // adjustable foot (threaded stem + rubber pad)
      g.add(cylAt(0.018, 0.018, 0.08, 8, bolt, lx, footY, lz));
      g.add(cylAt(0.055, 0.06, 0.025, 14, rubber, lx, footY - 0.04, lz));
      // top mounting gusset plate + bolts
      g.add(box(0.14, 0.13, 0.012, aluD, lx, legTopY - 0.02, lz + Math.sign(lz)*0.032));
      [[-0.04,-0.03],[0.04,-0.03],[0,0.04]].forEach(([bx,by]) =>
        g.add(cylAt(0.008,0.008,0.02,6, bolt, lx+bx, legTopY-0.02+by, lz + Math.sign(lz)*0.042).rotateX(Math.PI/2)));
      // diagonal gusset brace (leg-top → lower member, in the x–y plane)
      const dx = -Math.sign(lx)*0.17, dy = lowY - (legTopY - 0.08), L = Math.hypot(dx, dy);
      const br = box(0.035, L, 0.035, alu, lx + dx/2, (legTopY - 0.08) + dy/2, lz);
      br.rotation.z = Math.atan2(-dx, dy); g.add(br);
    });
    // cross member (z) at this station
    g.add(box(0.04, 0.04, fZ*2 - 0.02, alu, lx, lowY, 0));
  });
  // long members along the length connecting the two leg stations (front & back, two heights)
  [-fZ, fZ].forEach(lz => { g.add(box(lx0*2, 0.04, 0.04, alu, 0, lowY, lz)); g.add(box(lx0*2, 0.04, 0.04, alu, 0, lowY + 0.22, lz)); });

  // ---- drive gearmotor at head end (right, front side) ----
  const gx = headX - 0.02, gz = fZ + 0.1, gy = railCY;
  g.add(box(0.18, 0.2, 0.16, gearA, gx, gy, gz));                                // right-angle gearbox
  g.add(cylAt(0.05, 0.05, 0.08, 14, gearA, gx, gy, fZ + 0.02).rotateX(Math.PI/2)); // output toward drum
  const motorZ = gz + 0.18;
  g.add(cylAt(0.07, 0.07, 0.18, 16, motorM, gx, gy - 0.02, motorZ).rotateX(Math.PI/2));   // motor body
  for (let i = 0; i < 4; i++) g.add(cylAt(0.078, 0.078, 0.008, 16, motorM, gx, gy - 0.02, motorZ - 0.06 + i*0.04).rotateX(Math.PI/2)); // cooling fins
  g.add(cylAt(0.05, 0.05, 0.03, 14, mat('#2a2e33',0.5), gx, gy - 0.02, motorZ + 0.1).rotateX(Math.PI/2));  // fan cover
  g.add(box(0.07, 0.06, 0.07, mat('#2a2e33',0.5), gx, gy + 0.07, motorZ - 0.02));          // terminal box

  // colorable belt parts
  g.traverse(o => { if (o.isMesh && o.material === belt) o.userData.colorable = true; });
  g.userData.parts = { drumH, drumT };
  return g;
}

function buildIndustrialRobot({ color='#e8e0d0', w=0.65, d=0.65, h=1.65 } = {}) {
  const g = new THREE.Group();
  const bM  = mat(color, 0.44, 0.12);
  const jM  = mat('#a8a4a0', 0.28, 0.45);
  const dkM = mat('#3a3f4a', 0.35, 0.55);

  // Base casting with 8 floor mounting bolts
  g.add(cylAt(0.3, 0.32, 0.24, 20, dkM, 0, 0.12, 0));
  g.add(cylAt(0.22, 0.24, 0.05, 16, jM,  0, 0.265, 0));  // J1 rotation ring
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    g.add(cylAt(0.016, 0.016, 0.022, 6, dkM, Math.cos(a)*0.26, 0.011, Math.sin(a)*0.26));
  }

  // J1 shoulder housing (rotary body)
  const sh = box(0.22, 0.26, 0.2, bM, 0, 0.43, 0); sh.userData.colorable = true; g.add(sh);
  // J2 shoulder pivot axis (horizontal)
  const j2ax = cyl(0.1, 0.1, 0.28, 14, jM); j2ax.rotation.z = Math.PI/2; j2ax.position.set(0, 0.56, 0); g.add(j2ax);

  // Upper arm + servo cover bulge
  const ua = box(0.13, 0.42, 0.13, bM, 0, 0.8, 0); ua.userData.colorable = true; g.add(ua);
  const sv2 = box(0.22, 0.15, 0.12, bM, 0, 0.67, 0); sv2.userData.colorable = true; g.add(sv2);

  // J3 elbow pivot
  const j3ax = cyl(0.09, 0.09, 0.22, 12, jM); j3ax.rotation.z = Math.PI/2; j3ax.position.set(0, 1.02, 0); g.add(j3ax);

  // Forearm (angled forward) + J4 servo cover
  const fm = new THREE.Mesh(roundedBoxGeom(0.11, 0.37, 0.11, 0.02, 3), bM.clone());
  fm.position.set(0, 1.22, 0.1); fm.rotation.x = -0.3;
  fm.castShadow = true; fm.receiveShadow = true; fm.userData.colorable = true; g.add(fm);
  const sv4 = box(0.18, 0.12, 0.13, bM, 0, 1.1, 0.04); sv4.userData.colorable = true; g.add(sv4);

  // J4 wrist roll tube
  g.add(cylAt(0.076, 0.076, 0.1, 12, jM, 0, 1.42, 0.23));

  // J5 wrist pitch housing + axis
  const j5b = box(0.13, 0.1, 0.12, bM, 0, 1.52, 0.27); j5b.userData.colorable = true; g.add(j5b);
  const j5ax = cyl(0.065, 0.065, 0.18, 10, jM); j5ax.rotation.z = Math.PI/2; j5ax.position.set(0, 1.52, 0.27); g.add(j5ax);

  // J6 tool flange with 4 mounting bolts
  g.add(cylAt(0.058, 0.058, 0.054, 12, jM, 0, 1.606, 0.31));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    g.add(cylAt(0.007, 0.007, 0.018, 6, mat('#808898', 0.3, 0.6),
      Math.cos(a) * 0.042, 1.62, 0.31 + Math.sin(a) * 0.042));
  }

  // Cable bundle running along the arm exterior
  const cab = cyl(0.026, 0.026, 0.5, 8, mat('#1c2028', 0.9, 0.04));
  cab.rotation.x = Math.PI / 4; cab.position.set(-0.12, 0.88, -0.07); g.add(cab);

  // Status indicator LED (green = ready)
  g.add(cylAt(0.022, 0.022, 0.036, 8, mat('#22c55e', 0.3, 0.1), 0.17, 0.32, 0.13));

  // Respect w/d/h: geometry authored at 0.65×0.65×1.65 → scale group to requested size
  g.scale.set(w / 0.65, h / 1.65, d / 0.65);
  return g;
}

// DATRON neo (W800×D1300×H1900, 約700kg, 作業域 520×420×220mm, 24型タッチパネル, 24本工具マガジン):
// 標準ドアを通れる幅80cmの縦長筐体。前面は 上: 24型タッチパネル(目線の高さでやや下向き) / 中: 大きな窓付き扉 / 下: 切粉トレイと電装扉。
// 窓の奥に真空テーブル・高速スピンドル・工具マガジン。扉枠・ハンドル・パネルを含めて外形 w×d×h に収める。
function buildCNCMachine({ color='#e8e2d6', w=0.8, d=1.3, h=1.9 } = {}) {
  const g = new THREE.Group();
  const panel = mat(color, 0.42, 0.12, { env: 0.5 }), dark = mat('#23262a', 0.45, 0.3), black = mat('#141517', 0.5, 0.2);
  const steel = mat('#a8b0b8', 0.25, 0.8, { env: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x3a4a55, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 });
  const bd = d - 0.05, bz = -0.025, fz = bz + bd / 2;          // 本体の奥行と前面 (前面から扉枠・ハンドル・パネルが最大 5cm 出る)
  // 台座 + 本体 + 上部の帯
  g.add(box(w - 0.04, 0.08, bd - 0.04, black, 0, 0.04, bz));
  const body = box(w, h - 0.08, bd, panel, 0, 0.08 + (h - 0.08) / 2, bz); body.userData.colorable = true; g.add(body);
  g.add(box(w, 0.05, bd, dark, 0, h - 0.1, bz));
  // 状態表示ライン (前面最上部)
  const ledM = new THREE.MeshStandardMaterial({ color: 0x4fb3ff, emissive: new THREE.Color('#2f8fe0'), emissiveIntensity: 0.9, roughness: 0.3 });
  g.add(plainBox(w - 0.16, 0.012, 0.006, ledM, 0, h - 0.1, fz + 0.003));
  // 24型タッチパネル (扉の上。中心高さ約1.6m、上端を手前に倒して操作者へ向ける)
  const scM = new THREE.MeshStandardMaterial({ color: 0x0e1c2a, emissive: new THREE.Color('#1b4a72'), emissiveIntensity: 0.55, roughness: 0.2 });
  g.add(box(0.14, 0.1, 0.02, dark, 0.07, 1.6, fz + 0.008));                                     // 取付ブラケット
  const scr = new THREE.Group(); scr.position.set(0.07, 1.6, fz + 0.012); scr.rotation.x = 0.14; g.add(scr);
  scr.add(box(0.57, 0.35, 0.03, black, 0, 0, 0));
  scr.add(plainBox(0.53, 0.3, 0.004, scM, 0, 0, 0.016));
  // UI の表示 (左に 3D ビュー、右にボタン列)
  scr.add(plainBox(0.3, 0.2, 0.002, new THREE.MeshBasicMaterial({ color: 0x2c5f8a }), -0.08, 0.02, 0.019));
  for (let i = 0; i < 4; i++) scr.add(plainBox(0.12, 0.035, 0.002, new THREE.MeshBasicMaterial({ color: i === 0 ? 0x3aa0ff : 0x7a8a98 }), 0.17, 0.09 - i * 0.055, 0.019));
  // 窓付き扉 (枠 + 濃色ガラス + 縦ハンドル)
  const dW = w - 0.14, dH = 0.62, dY = 1.1;
  g.add(box(dW + 0.04, dH + 0.04, 0.03, dark, 0, dY, fz + 0.01));
  g.add(plainBox(dW - 0.04, dH - 0.06, 0.008, glass, 0, dY + 0.01, fz + 0.026));
  g.add(box(0.025, 0.24, 0.03, steel, dW / 2 - 0.05, dY, fz + 0.034));
  // 内部 (窓から見える): 真空テーブル・加工中の板・Z軸ユニットとスピンドル・X軸ガントリー・工具マガジン(24本)
  const inZ = fz - 0.45;
  g.add(box(w - 0.24, 0.05, 0.5, mat('#5a6168', 0.4, 0.6), 0, dY - 0.25, inZ));
  g.add(box(w - 0.3, 0.012, 0.44, mat('#8a9098', 0.3, 0.6), 0, dY - 0.219, inZ));             // 真空プレート
  g.add(box(0.36, 0.01, 0.26, mat('#c9c2b4', 0.35, 0.7), -0.04, dY - 0.208, inZ + 0.04));       // 加工中のアルミ板
  g.add(box(0.12, 0.26, 0.14, black, 0.05, dY + 0.1, inZ - 0.05));                              // Z軸ユニット
  g.add(cylAt(0.035, 0.035, 0.14, 16, steel, 0.05, dY - 0.1, inZ - 0.02));                      // スピンドル (2kW / 40,000min⁻¹)
  g.add(cylAt(0.004, 0.004, 0.04, 8, mat('#d4af37', 0.4, 0.6), 0.05, dY - 0.19, inZ - 0.02));
  g.add(box(w - 0.24, 0.06, 0.08, mat('#3a3f45', 0.4, 0.4), 0, dY + 0.24, inZ - 0.2));          // X軸ガントリー
  for (let r = 0; r < 2; r++) for (let i = 0; i < 12; i++) g.add(cylAt(0.01, 0.01, 0.045, 8, steel, -0.25 + i * 0.045, dY - 0.19, inZ - 0.23 - r * 0.04));
  // 下部: 切粉トレイ(前面引出し) + 電装扉 2枚 + 左側面の通風スリット
  g.add(box(w - 0.2, 0.08, 0.02, dark, 0, 0.72, fz + 0.006));
  g.add(box(0.2, 0.02, 0.02, steel, 0, 0.72, fz + 0.022));
  [-1, 1].forEach(s => { g.add(box(w / 2 - 0.05, 0.54, 0.012, mat(shade(color, 0.95), 0.45, 0.1), s * (w / 4 - 0.005), 0.39, fz + 0.004)); g.add(box(0.02, 0.12, 0.02, steel, s * 0.06, 0.46, fz + 0.018)); });
  for (let i = 0; i < 8; i++) g.add(box(0.004, 0.014, 0.5, dark, -w / 2 - 0.001, 0.25 + i * 0.03, bz - 0.2));
  return g;
}

// TRUSCO 重量パレットラック 1トン 1D-25B23-11-2 (有効間口2300×奥行1100×H2500, ビーム2段, ネオグレー):
// 両端の支柱フレーム(前後2本の穴あき支柱 + 水平/斜めの筋かい) + 箱形ビーム(前後) + ベースプレート。
// 床置き・1段目・2段目に T11 パレット(1100角)を 2 枚ずつ。w は支柱を含む外形。
function buildPalletRack({ color='#a3aba6', w=2.45, d=1.1, h=2.5 } = {}) {
  const g = new THREE.Group();
  const steel = mat(color, 0.42, 0.35, { env: 0.5 }), steelD = mat(shade(color, 0.72), 0.5, 0.3), slotM = mat('#3a3e42', 0.7, 0.2);
  const uw = 0.075, ud = 0.06, clear = w - 2 * uw;
  const xs = [-(w / 2 - uw / 2), w / 2 - uw / 2], zs = [d / 2 - ud / 2, -(d / 2 - ud / 2)];
  const tag = (m) => { m.userData.colorable = true; return m; };
  xs.forEach(x => {
    zs.forEach(z => {
      g.add(tag(box(uw, h, ud, steel, x, h / 2, z)));
      g.add(plainBox(0.012, h - 0.1, 0.004, slotM, x - Math.sign(x) * uw * 0.28, h / 2, z + Math.sign(z) * (ud / 2 + 0.001)));   // 前面の穴列
      g.add(box(0.12, 0.008, 0.12, steelD, x, 0.004, z));                                                                 // ベースプレート
      [-1, 1].forEach(s => g.add(cylAt(0.008, 0.008, 0.02, 8, steelD, x + s * 0.04, 0.012, z)));                             // アンカー
    });
    // 筋かい (フレーム面 = x 一定の面)
    const zf = d / 2 - ud, zb = -(d / 2 - ud), ys = [0.18, 0.95, 1.72, 2.42];
    ys.forEach(y => g.add(tag(box(0.03, 0.03, zf - zb, steel, x, y, 0))));
    for (let i = 0; i < ys.length - 1; i++) g.add(tag(_bar([x, ys[i], i % 2 ? zb : zf], [x, ys[i + 1], i % 2 ? zf : zb], 0.026, steel)));
  });
  // ビーム (前後, 上面高さ = 載荷面)
  const beamTops = [1.25, 2.35];
  beamTops.forEach(yt => {
    zs.forEach(z => {
      g.add(tag(box(clear, 0.1, 0.05, steel, 0, yt - 0.05, z)));
      [-1, 1].forEach(s => g.add(box(0.012, 0.15, 0.05, steelD, s * (clear / 2 - 0.006), yt - 0.06, z)));   // ビーム受け金具
    });
  });
  // パレット + 荷 (段ボール) を床・1段・2段に 2 枚ずつ
  const woodM = mat('#c9a26a', 0.85), woodD = mat('#a8844f', 0.88), kraft = mat('#b98f5c', 0.9), tape = mat('#d9c29a', 0.7);
  const pallet = (cx, y0, loadH) => {
    [-0.5, 0, 0.5].forEach(sx => g.add(plainBox(0.07, 0.1, 1.1, woodD, cx + sx, y0 + 0.072, 0)));            // 桁
    for (let i = 0; i < 9; i++) g.add(plainBox(1.1, 0.022, 0.1, woodM, cx, y0 + 0.133, -0.5 + i * 0.125));     // 上面デッキ
    [-0.5, 0, 0.5].forEach(sz => g.add(plainBox(1.1, 0.022, 0.1, woodM, cx, y0 + 0.011, sz)));                 // 下面デッキ
    if (loadH <= 0) return;
    const lb = box(1.04, loadH, 1.04, kraft, cx, y0 + 0.144 + loadH / 2, 0); g.add(lb);
    g.add(plainBox(1.045, 0.05, 1.045, tape, cx, y0 + 0.144 + loadH - 0.12, 0));
  };
  // 天井高(2.6m)に収まるよう 2段目は空パレット
  [-(clear / 4), clear / 4].forEach(cx => { pallet(cx, 0, 0.95); pallet(cx, beamTops[0], 0.8); pallet(cx, beamTops[1], 0); });
  return g;
}

// 日東工業 自立制御盤キャビネット E-A (W800×D500×H1800 相当): 基台100mm・片開き扉・表示灯・HMI・押ボタン・非常停止
function buildControlPanel({ color='#e8e2d6', w=0.8, d=0.5, h=1.8 } = {}) {
  const g = new THREE.Group();
  const bodyM = mat(color, 0.45, 0.25, { env: 0.4 });
  const doorM = mat(shade(color, 1.03), 0.42, 0.25, { env: 0.4 });
  const darkM = mat('#2a2d31', 0.5, 0.3);
  const chrM  = mat('#b8bec6', 0.25, 0.8, { env: 0.9 });
  const baseH = 0.1;                         // チャンネルベース(基台) 100mm
  const capH  = 0.02;
  const bodyH = h - baseH - capH;
  const bodyCY = baseH + bodyH / 2;
  const fz = d / 2;

  // 基台 (黒, 少し内側に引っ込む)
  g.add(box(w - 0.04, baseH, d - 0.04, darkM, 0, baseH / 2, 0));
  // 本体箱 + 天板 (雨水よけの縁付き)
  const body = box(w, bodyH, d, bodyM, 0, bodyCY, 0); body.userData.colorable = true; g.add(body);
  const cap = box(w + 0.02, capH, d + 0.02, mat(shade(color, 0.85), 0.45, 0.25), 0, h - capH / 2, 0); cap.userData.colorable = true; g.add(cap);
  // 吊り用アイボルト
  [-w / 2 + 0.08, w / 2 - 0.08].forEach(x => { const eb = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.006, 6, 12), chrM); eb.position.set(x, h + 0.02, 0); g.add(eb); });

  // 前面 片開き扉 (右ハンドル / 左ヒンジ)
  const door = box(w - 0.06, bodyH - 0.06, 0.02, doorM, 0, bodyCY, fz + 0.005); door.userData.colorable = true; g.add(door);
  g.add(box(0.03, 0.16, 0.02, chrM, w / 2 - 0.09, bodyCY, fz + 0.026));                       // 平面ハンドル
  g.add(box(0.045, 0.045, 0.03, darkM, w / 2 - 0.09, bodyCY + 0.13, fz + 0.02));              // 錠
  [0.15, 0.5, 0.85].forEach(t => { const hg = cyl(0.011, 0.011, 0.08, 8, chrM); hg.position.set(-w / 2 + 0.012, baseH + bodyH * t, fz + 0.012); g.add(hg); }); // ヒンジ

  // 表示灯 (電源=緑 / 運転=橙 / 異常=赤)
  const lampY = h - 0.32;
  [['#22c55e', -0.16], ['#f59e0b', -0.05], ['#ef4444', 0.06]].forEach(([c, dx]) => {
    const lm = mat(c, 0.3, 0.1); lm.emissive = new THREE.Color(c); lm.emissiveIntensity = 0.55;
    const ind = cyl(0.016, 0.016, 0.03, 10, lm); ind.rotation.x = Math.PI / 2; ind.position.set(dx, lampY, fz + 0.03); g.add(ind);
    const ring = cyl(0.021, 0.021, 0.012, 10, darkM); ring.rotation.x = Math.PI / 2; ring.position.set(dx, lampY, fz + 0.02); g.add(ring);
  });
  // 電力計 (アナログメーター)
  g.add(box(0.09, 0.09, 0.02, darkM, 0.22, lampY, fz + 0.02));
  g.add(plainBox(0.07, 0.07, 0.006, mat('#f2f0ea', 0.6), 0.22, lampY, fz + 0.033));
  g.add(box(0.003, 0.03, 0.004, mat('#c0392b', 0.5), 0.225, lampY + 0.008, fz + 0.037));

  // HMI タッチパネル
  const hmiY = h - 0.62;
  g.add(box(0.30, 0.22, 0.02, darkM, -0.05, hmiY, fz + 0.02));
  const scrM = new THREE.MeshStandardMaterial({ color: 0x0c1a26, roughness: 0.25, metalness: 0.1, emissive: new THREE.Color('#1a4a6a'), emissiveIntensity: 0.5 });
  g.add(plainBox(0.26, 0.17, 0.006, scrM, -0.05, hmiY, fz + 0.033));
  // 押ボタン (運転/停止/リセット ×2列) + セレクタ
  for (let i = 0; i < 6; i++) {
    const bx = -0.22 + (i % 3) * 0.1, by = h - 0.92 - Math.floor(i / 3) * 0.1;
    const c = ['#22c55e', '#ef4444', '#2b2b2b'][i % 3];
    const ring = cyl(0.02, 0.02, 0.012, 12, darkM); ring.rotation.x = Math.PI / 2; ring.position.set(bx, by, fz + 0.02); g.add(ring);
    const btn = cyl(0.014, 0.014, 0.022, 12, mat(c, 0.4, 0.1)); btn.rotation.x = Math.PI / 2; btn.position.set(bx, by, fz + 0.032); g.add(btn);
  }
  // 非常停止 (黄色台座 + 赤キノコ)
  g.add(box(0.08, 0.08, 0.012, mat('#f2c200', 0.5, 0.1), 0.2, h - 0.97, fz + 0.02));
  const es = cyl(0.024, 0.02, 0.03, 14, mat('#ef4444', 0.4, 0.1)); es.rotation.x = Math.PI / 2; es.position.set(0.2, h - 0.97, fz + 0.04); g.add(es);
  // 銘板
  g.add(box(0.14, 0.05, 0.004, mat('#d8d4c8', 0.6), 0, baseH + bodyH - 0.08, fz + 0.027));
  // 側面ルーバー (放熱)
  for (let i = 0; i < 6; i++) g.add(box(0.006, 0.01, 0.16, darkM, w / 2 + 0.001, baseH + 0.25 + i * 0.03, -d * 0.15));
  return g;
}

// ブラザー SPEEDIO S500Xd1 (W1560×D2223×H2498) を基準にしたコンパクト立形マシニングセンタ。
// 左右キャビネット幅・操作盤・工具マガジンは w に比例して収まるよう配置する。
// 本体は奥行 d から前面の操作盤の張り出し分 (OP_OUT) を除いた寸法で組み、全体を後ろへずらして操作盤まで含めて奥行 d に収める。
const OP_OUT = 0.19;
function buildCNCMachiningCenter({ color='#e8e2d6', w=1.56, d=2.223, h=2.498 } = {}) {
  const g = _cncCenterBody({ color, w, d: d - OP_OUT, h });
  g.children.forEach(c => { c.position.z -= OP_OUT / 2; });
  return g;
}
function _cncCenterBody({ color, w, d, h }) {
  const g = new THREE.Group();
  // ---- materials (off-white sheet-metal body + charcoal base) ----
  const cream  = mat(color, 0.5, 0.06, { env: 0.3 });               // body panels (colorable)
  const creamD = mat(shade(color, 0.9), 0.5, 0.06);                 // shaded panel insets
  const charc  = mat('#34383c', 0.6, 0.2);                          // base plinth
  const charc2 = mat('#272a2d', 0.65, 0.15);                        // recessed access panels
  const grayC  = mat('#565c62', 0.5, 0.4, { env: 0.4 });            // machine castings / columns
  const grayL  = mat('#787f87', 0.45, 0.45, { env: 0.4 });          // lighter cast parts
  const steel  = mat('#9aa6b0', 0.25, 0.8, { env: 1.0 });           // table / spindle
  const dark   = mat('#15181b', 0.55, 0.25);                        // screens, handles, hoses
  const glass  = new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.4 });
  const yellow = mat('#f2c200', 0.5, 0.1);
  const chrome = mat('#cdd4da', 0.15, 0.95, { env: 1.2 });
  const screenMat = new THREE.MeshStandardMaterial({ color: 0x0c1620, roughness: 0.2, metalness: 0.1, emissive: new THREE.Color('#0a1e2c'), emissiveIntensity: 0.4 });

  // ---- key layout dimensions ----
  const baseH = 0.78, encTop = h - 0.5;
  const encH = encTop - baseH, encY = baseH + encH / 2;             // cream cabinet band
  const leftW = w * 0.32, rightW = w * 0.37;                        // 1.56m 機で 0.50 / 0.58
  const leftX = -w/2 + leftW/2, rightX = w/2 - rightW/2;
  const openL = -w/2 + leftW, openR = w/2 - rightW;                 // central work opening
  const openW = openR - openL, openCx = (openL + openR) / 2;
  const fz = d/2;                                                   // front face plane
  const openTopY = 1.6;                                             // top of work opening

  // ---- base plinth (charcoal) ----
  g.add(box(w, baseH, d, charc, 0, baseH/2, 0));
  g.add(box(w*0.96, 0.1, 0.02, charc2, 0, 0.07, fz + 0.004));       // toe kick recess
  [-w*0.27, w*0.27].forEach(px => g.add(box(0.5, 0.42, 0.02, charc2, px, 0.42, fz + 0.005)));
  [-w*0.27, w*0.27].forEach(px => g.add(cylAt(0.012,0.012,0.02,8, grayL, px, 0.62, fz+0.012).rotateX(Math.PI/2)));

  // ---- cream cabinets (left enclosure + right electrical cabinet) ----
  g.add(box(leftW, encH, d, cream, leftX, encY, 0));               // left enclosure
  g.add(box(rightW, encH, d, cream, rightX, encY, 0));             // right cabinet
  g.add(box(openW, encTop - openTopY, d, cream, openCx, (openTopY + encTop)/2, 0)); // top band over opening
  g.add(box(w, 0.05, 0.01, yellow, 0, baseH + 0.03, fz + 0.006));  // warning stripe at base of cabinets

  // ---- left enclosure front detail: nameplate, window, warning labels, handle ----
  // nameplate (SPEEDIO S500Xd1) via canvas texture
  const nameCv = document.createElement('canvas'); nameCv.width = 384; nameCv.height = 128;
  const nctx = nameCv.getContext('2d');
  nctx.fillStyle = '#e8e2d6'; nctx.fillRect(0,0,384,128);
  nctx.fillStyle = '#1c1c1c'; nctx.font = 'bold 70px Arial'; nctx.fillText('SPEEDIO', 14, 70);
  nctx.font = 'bold 24px Arial'; nctx.fillStyle = '#3a3a3a'; nctx.fillText('S500Xd1  MACHINING CENTER', 16, 108);
  const nameTex = new THREE.CanvasTexture(nameCv); nameTex.anisotropy = 4;
  const npW = Math.min(0.72, leftW * 0.9);
  const namePlane = new THREE.Mesh(new THREE.PlaneGeometry(npW, npW / 3), new THREE.MeshBasicMaterial({ map: nameTex }));
  namePlane.position.set(leftX, encY + 0.40, fz + 0.012); g.add(namePlane);
  // viewing window (dark frame + glass)
  const winW = Math.min(0.36, leftW * 0.72);
  g.add(box(winW, 0.30, 0.03, dark, leftX, encY + 0.05, fz + 0.006));
  const lwin = plainBox(winW - 0.06, 0.24, 0.01, glass, leftX, encY + 0.05, fz + 0.02);
  lwin.castShadow = false; g.add(lwin);
  // warning label cluster (orange stickers with header bar), below the window
  [-0.1, 0.1].forEach((lx, i) => {
    g.add(box(0.16, 0.14, 0.008, mat('#f0f0ea',0.6), leftX + lx, encY - 0.30, fz + 0.006));
    g.add(box(0.16, 0.03, 0.009, mat(i ? '#e08a10' : '#d83a3a',0.5), leftX + lx, encY - 0.30 + 0.055, fz + 0.007));
  });

  // ---- door handles (black vertical tubes) ----
  const addHandle = (hx) => {
    g.add(cylAt(0.018, 0.018, 0.66, 12, dark, hx, encY - 0.02, fz + 0.07).rotateX(0));
    [0.32, -0.32].forEach(o => g.add(box(0.04, 0.05, 0.07, dark, hx, encY - 0.02 + o, fz + 0.04)));
  };
  addHandle(openL - 0.08);     // on left door, beside opening
  addHandle(openR + 0.10);     // on the door before the control panel

  // ---- central work enclosure interior ----
  g.add(box(openW, openTopY - baseH, 0.08, charc, openCx, (baseH + openTopY)/2, -d/2 + 0.05)); // back wall
  g.add(box(0.07, openTopY - baseH, d - 0.18, grayC, openL + 0.035, (baseH + openTopY)/2, 0)); // left inner column
  g.add(box(0.07, openTopY - baseH, d - 0.18, grayC, openR - 0.035, (baseH + openTopY)/2, 0)); // right inner column

  // worktable (T-slotted steel) on cross slide
  const tableY = 0.96, tblW = openW - 0.16, tblD = d - 0.55;
  g.add(box(tblW + 0.22, 0.14, tblD - 0.1, grayL, openCx, tableY - 0.11, 0.04)); // saddle / cross slide
  g.add(box(tblW, 0.1, tblD, steel, openCx, tableY, 0.04));                       // table top
  for (let tx = -tblW/2 + 0.09; tx < tblW/2 - 0.02; tx += 0.13)
    g.add(box(0.022, 0.045, tblD - 0.04, dark, openCx + tx, tableY + 0.055, 0.04)); // T-slots
  // machine vise on the table (scaled to the table width)
  const viseY = tableY + 0.05, vw = Math.min(0.46, tblW * 0.95);
  g.add(box(vw, 0.13, 0.30, grayL, openCx, viseY + 0.065, 0.04));                          // vise base
  g.add(box(vw * 0.26, 0.18, 0.32, grayC, openCx - vw * 0.33, viseY + 0.13, 0.04));       // fixed jaw
  g.add(box(vw * 0.26, 0.18, 0.32, grayC, openCx + vw * 0.15, viseY + 0.13, 0.04));       // movable jaw
  g.add(box(vw * 0.3, 0.10, 0.20, steel, openCx - vw * 0.09, viseY + 0.155, 0.04));      // workpiece

  // spindle head (Z-axis) + cross rail
  const headY = 1.42;
  g.add(box(openW - 0.16, 0.20, 0.42, grayC, openCx, openTopY - 0.02, -d/2 + 0.34)); // Z-slide on column
  g.add(box(Math.min(0.52, openW - 0.02), 0.46, 0.46, grayL, openCx, headY, -0.02));   // spindle head box
  g.add(box(0.30, 0.12, 0.30, dark, openCx, headY - 0.27, -0.02));                    // spindle housing nose
  g.add(cylAt(0.085, 0.07, 0.16, 18, steel, openCx, headY - 0.40, -0.02));            // spindle nose
  g.add(cylAt(0.07, 0.038, 0.13, 16, chrome, openCx, headY - 0.53, -0.02));           // tool taper holder
  g.add(cylAt(0.022, 0.012, 0.13, 12, dark, openCx, headY - 0.65, -0.02));            // cutting tool
  // blue coolant hoses with orange nozzles, arcing toward the tool
  const coolant = mat('#2a6fc0', 0.5, 0.25), nozzle = mat('#e0601a', 0.5, 0.2);
  [-0.14, 0.14].forEach(cx => {
    for (let s = 0; s < 6; s++)
      g.add(box(0.04, 0.045, 0.045, coolant, openCx + cx - cx*0.12*s, headY - 0.14 - s*0.06, -0.02 + 0.04 + s*0.012));
    g.add(box(0.03, 0.03, 0.06, nozzle, openCx + cx*0.3, headY - 0.52, 0.06));
  });

  // ---- top spindle-drive column housing (gray, rear-center); top cap reaches h ----
  g.add(box(Math.min(0.92, w * 0.6), 0.5, 0.72, grayC, openCx, encTop + 0.25, -0.18));
  g.add(box(Math.min(0.6, w * 0.4), 0.14, 0.56, grayL, openCx, encTop + 0.43, -0.18));   // top cap

  // ---- ATC tool carousel (dark drum with yellow tool pockets) ----
  const atc = new THREE.Group(); atc.position.set(Math.min(openR + 0.42, w/2 - 0.42), encTop + 0.18, -0.05); atc.rotation.x = -0.5;
  atc.add(cyl(0.38, 0.38, 0.12, 30, dark));
  atc.add(cyl(0.12, 0.12, 0.16, 16, grayL));
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2;
    atc.add(cylAt(0.03, 0.03, 0.1, 8, yellow, Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32));
  }
  g.add(atc);

  // ---- tri-color signal stack light (top-right; 下から 緑・黄・赤。上端は機械高さ h 以内) ----
  const lx = w/2 - 0.28, lz = d/2 - 0.32;
  g.add(cylAt(0.03, 0.03, 0.03, 12, chrome, lx, encTop + 0.015, lz));
  let ly = encTop + 0.09;
  [['#22c55e', 0.85], ['#f5b800', 0.85], ['#ef4444', 0.9]].forEach(([c, ei]) => {
    g.add(cylAt(0.05, 0.05, 0.12, 16, mat(c, 0.3, 0.1, { emissive: c, emissiveIntensity: ei }), lx, ly, lz));
    ly += 0.13;
  });
  g.add(cylAt(0.04, 0.04, 0.04, 12, dark, lx, ly - 0.045, lz));       // top cap

  // ---- CNC control panel (right side, angled toward operator; scaled to the right cabinet width) ----
  const pan = new THREE.Group(); pan.position.set(rightX - 0.03, encY + 0.06, fz + 0.05); pan.rotation.y = -0.16; g.add(pan);
  const pk = Math.min(1, (rightW - 0.06) / 0.92); pan.scale.set(pk, pk, 1);
  pan.add(box(0.92, 1.06, 0.09, dark, 0, 0, 0));                      // panel housing
  pan.add(box(0.84, 0.98, 0.02, mat('#23272c', 0.5), 0, 0, 0.055));   // bezel
  // display screen (canvas texture: X/Y/Z readout)
  const sCv = document.createElement('canvas'); sCv.width = 256; sCv.height = 192;
  const sctx = sCv.getContext('2d');
  sctx.fillStyle = '#0a161e'; sctx.fillRect(0, 0, 256, 192);
  sctx.fillStyle = '#163a2a'; sctx.fillRect(8, 8, 240, 30);
  sctx.fillStyle = '#7fd6a8'; sctx.font = '16px monospace'; sctx.fillText('S500Xd1  AUTO', 16, 30);
  sctx.font = 'bold 28px monospace'; sctx.fillStyle = '#bdeed0';
  sctx.fillText('X  123.456', 18, 88);
  sctx.fillText('Y  654.321', 18, 126);
  sctx.fillText('Z  -98.765', 18, 164);
  const sTex = new THREE.CanvasTexture(sCv); sTex.anisotropy = 4;
  const scrFace = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.37), new THREE.MeshBasicMaterial({ map: sTex }));
  scrFace.position.set(-0.07, 0.27, 0.066); pan.add(scrFace);
  pan.add(box(0.54, 0.41, 0.02, screenMat, -0.07, 0.27, 0.05));       // screen housing
  // soft-key buttons flanking screen
  for (let i = 0; i < 7; i++) pan.add(box(0.04, 0.03, 0.015, mat('#cfcbc3',0.6), -0.30 + i*0.075, 0.045, 0.065));
  // keypad grid
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++)
    pan.add(box(0.045, 0.045, 0.015, mat('#d4d0c8', 0.6), -0.30 + c*0.075, -0.04 - r*0.062, 0.065));
  // bottom control row: E-stop, start/stop, handwheel (MPG)
  pan.add(cylAt(0.045, 0.045, 0.035, 16, mat('#ef4444',0.4,0.1,{emissive:'#aa0000',emissiveIntensity:0.4}), -0.30, -0.40, 0.07).rotateX(Math.PI/2));
  pan.add(cylAt(0.03, 0.03, 0.03, 14, mat('#22c55e',0.4), -0.16, -0.38, 0.07).rotateX(Math.PI/2));
  pan.add(cylAt(0.03, 0.03, 0.03, 14, mat('#f59e0b',0.4), -0.16, -0.46, 0.07).rotateX(Math.PI/2));
  const mpg = cyl(0.085, 0.085, 0.04, 22, mat('#2a2e33', 0.45)); mpg.rotation.x = Math.PI/2; mpg.position.set(0.22, -0.40, 0.075); pan.add(mpg);
  pan.add(box(0.03, 0.03, 0.045, chrome, 0.22, -0.32, 0.1));          // handwheel knob

  // ---- handheld pendant on cable (right edge) ----
  const pdx = Math.min(rightX + 0.34, w/2 - 0.08);
  const pcable = cyl(0.012, 0.012, 0.42, 8, dark); pcable.position.set(pdx - 0.02, encY - 0.36, fz + 0.04); g.add(pcable);
  g.add(box(0.1, 0.2, 0.05, mat('#2a2e33', 0.5), pdx, encY - 0.66, fz + 0.07));
  g.add(box(0.07, 0.07, 0.01, screenMat, pdx, encY - 0.61, fz + 0.1));

  // ---- mark body panels colorable ----
  g.traverse(o => { if (o.isMesh && o.material === cream) o.userData.colorable = true; });
  return g;
}
function buildIndustrialRobotLg({ color='#e8e4dc', w=1.2, d=1.2, h=2.4 } = {}) {
  const g = new THREE.Group();
  // 6-axis heavy handling robot — off-white castings, charcoal joints/motors/base, black dresspack + gripper
  const body  = mat(color, 0.45, 0.18, { env: 0.45 });               // arm castings (colorable)
  const bodyD = mat(shade(color, 0.9), 0.45, 0.18, { env: 0.4 });    // shaded body insets
  const dark  = mat('#2c3035', 0.5, 0.45, { env: 0.5 });             // joint hubs / base
  const motor = mat('#34383d', 0.45, 0.5, { env: 0.5 });             // servo motor housings
  const blk   = mat('#141619', 0.6, 0.18);                           // cable dresspack / gripper
  const steel = mat('#9aa6b0', 0.3, 0.8, { env: 1.0 });              // flanges / wrist
  const bolt  = mat('#50545a', 0.4, 0.7);
  const rbox  = (bw, bh, bd, m, x, y, z) => { const me = new THREE.Mesh(roundedBoxGeom(bw, bh, bd, 0.04, 3), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me; };
  // bolt ring helper around an axis-aligned circular flange
  const boltRing = (parent, R, n, axis, px, py, pz) => {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, c = Math.cos(a) * R, s = Math.sin(a) * R;
      const b = cyl(0.011, 0.011, 0.03, 6, bolt);
      if (axis === 'y') { b.position.set(px + c, py, pz + s); }
      else if (axis === 'z') { b.rotation.x = Math.PI/2; b.position.set(px + c, py + s, pz); }
      else { b.rotation.z = Math.PI/2; b.position.set(px, py + c, pz + s); }
      parent.add(b);
    }
  };

  // ===== BASE (charcoal cast pedestal) =====
  g.add(rbox(0.78, 0.06, 0.78, dark, 0, 0.03, 0));                   // foot plate
  [[-0.31,-0.31],[0.31,-0.31],[-0.31,0.31],[0.31,0.31]].forEach(([bx,bz]) => {
    g.add(cylAt(0.05, 0.05, 0.06, 12, dark, bx, 0.06, bz));
    g.add(cylAt(0.02, 0.02, 0.05, 8, bolt, bx, 0.1, bz));
  });
  g.add(rbox(0.6, 0.16, 0.6, dark, 0, 0.14, 0));
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.34, 24), dark); ped.position.set(0, 0.39, 0); ped.castShadow = true; g.add(ped);
  g.add(cylAt(0.28, 0.28, 0.05, 28, bolt, 0, 0.58, 0));
  boltRing(g, 0.24, 12, 'y', 0, 0.605, 0);

  // ===== J1 SWIVEL (yaw) =====
  const j1 = new THREE.Group(); j1.position.set(0, 0.6, 0); j1.rotation.y = -0.4; g.add(j1);
  const sw = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.31, 0.2, 24), body); sw.position.y = 0.1; sw.castShadow = true; j1.add(sw);
  const shoulder = rbox(0.36, 0.5, 0.46, body, 0, 0.46, 0); j1.add(shoulder);   // shoulder housing
  j1.add(rbox(0.06, 0.42, 0.4, bodyD, 0.18, 0.46, 0));                          // side rib
  // J2 servo motor on +x side
  j1.add(rbox(0.2, 0.26, 0.26, motor, 0.3, 0.52, -0.02));
  j1.add(cylAt(0.075, 0.075, 0.12, 16, dark, 0.42, 0.52, -0.02).rotateZ(Math.PI/2));

  // ===== J2 SHOULDER (pitch) =====
  const j2 = new THREE.Group(); j2.position.set(0, 0.52, 0); j2.rotation.x = 0.5; j1.add(j2);
  j2.add(cylAt(0.16, 0.16, 0.44, 20, dark, 0, 0, 0).rotateZ(Math.PI/2));        // J2 axis hub
  boltRing(j2, 0.13, 10, 'x', 0.22, 0, 0);
  const lowH = 0.82;
  const lar = rbox(0.24, lowH, 0.26, body, 0, lowH/2, 0); j2.add(lar);          // lower arm
  j2.add(rbox(0.26, lowH*0.86, 0.05, bodyD, 0, lowH/2, 0.15));

  // ===== J3 ELBOW (pitch) =====
  const j3 = new THREE.Group(); j3.position.set(0, lowH, 0); j3.rotation.x = 1.05; j2.add(j3);
  j3.add(cylAt(0.15, 0.15, 0.42, 20, dark, 0, 0, 0).rotateZ(Math.PI/2));        // J3 axis hub
  j3.add(rbox(0.2, 0.22, 0.24, motor, 0, 0.02, -0.24));                          // J3 motor (rear)
  j3.add(cylAt(0.07, 0.07, 0.1, 14, dark, 0, 0.02, -0.38).rotateX(Math.PI/2));
  const foreH = 1.0;
  const far = rbox(0.2, foreH, 0.22, body, 0, foreH/2, 0); j3.add(far);          // forearm
  j3.add(cylAt(0.13, 0.13, 0.1, 20, bodyD, 0, 0.14, 0).rotateX(0));
  // counterbalance / drive rods along the top of the forearm
  [-0.07, 0.07].forEach(rx => j3.add(cylAt(0.022, 0.022, foreH*0.78, 10, blk, rx, foreH*0.5, 0.13)));
  [foreH*0.1, foreH*0.9].forEach(ry => j3.add(cylAt(0.03, 0.03, 0.2, 8, dark, 0, ry, 0.12).rotateZ(Math.PI/2)));
  // black cable dresspack running along the forearm side + loop near elbow
  j3.add(cylAt(0.03, 0.03, foreH*0.8, 8, blk, -0.12, foreH*0.45, -0.02));
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 8, 16, Math.PI*1.3), blk); loop.position.set(-0.12, 0.0, -0.05); loop.rotation.y = Math.PI/2; j3.add(loop);

  // ===== J4 WRIST ROLL (along forearm axis) =====
  const j4 = new THREE.Group(); j4.position.set(0, foreH, 0); j4.rotation.y = 0; j3.add(j4);
  const wr = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.26, 20), body); wr.position.y = 0.13; wr.castShadow = true; j4.add(wr);
  boltRing(j4, 0.1, 10, 'y', 0, 0.26, 0);

  // ===== J5 WRIST BEND (droop tool downward) =====
  const j5 = new THREE.Group(); j5.position.set(0, 0.26, 0); j5.rotation.x = 1.5; j4.add(j5);
  j5.add(cylAt(0.1, 0.1, 0.24, 18, dark, 0, 0, 0).rotateZ(Math.PI/2));          // J5 hub
  j5.add(rbox(0.18, 0.2, 0.2, body, 0, 0.12, 0));                                // wrist housing
  // ===== J6 TOOL FLANGE =====
  const j6 = new THREE.Group(); j6.position.set(0, 0.22, 0); j5.add(j6);
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 20), steel); flange.position.y = 0.03; flange.castShadow = true; j6.add(flange);
  boltRing(j6, 0.06, 8, 'y', 0, 0.05, 0);

  // ===== END EFFECTOR (black multi-jaw gripper) =====
  const grip = new THREE.Group(); grip.position.set(0, 0.06, 0); j6.add(grip);
  grip.add(rbox(0.22, 0.05, 0.22, steel, 0, 0.025, 0));                          // adapter plate
  grip.add(rbox(0.26, 0.18, 0.24, blk, 0, 0.14, 0));                             // gripper body
  grip.add(rbox(0.28, 0.06, 0.1, blk, 0, 0.24, 0));                              // cross bar
  // two clamp fingers angling down & inward
  [[-1, -0.11], [1, 0.11]].forEach(([sgn, fx]) => {
    const fG = new THREE.Group(); fG.position.set(fx, 0.22, 0); fG.rotation.z = sgn * 0.25; grip.add(fG);
    fG.add(rbox(0.05, 0.26, 0.16, blk, 0, 0.13, 0));                             // finger arm
    fG.add(rbox(0.06, 0.06, 0.2, dark, 0, 0.27, 0));                             // finger tip pad
  });

  // ===== shoulder cable dresspack (base → shoulder, attached to swivel) =====
  const c1 = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.032, 8, 18, Math.PI*1.1), blk); c1.position.set(-0.2, 0.5, -0.12); c1.rotation.set(0, Math.PI/2, 0.3); j1.add(c1);
  j1.add(cylAt(0.032, 0.032, 0.4, 8, blk, -0.26, 0.22, -0.05));

  // status light on shoulder
  j1.add(cylAt(0.02, 0.02, 0.03, 10, mat('#22c55e', 0.2, 0.1, { emissive:'#22c55e', emissiveIntensity:0.9 }), -0.17, 0.6, 0.18).rotateX(Math.PI/2));

  // mark body castings colorable
  g.traverse(o => { if (o.isMesh && o.material === body) o.userData.colorable = true; });
  // Respect w/d/h: geometry authored at 1.2×1.2×2.4 → scale proportionally
  g.scale.set(w / 1.2, h / 2.4, d / 1.2);
  return g;
}
// 大型4柱油圧プレス (汎用): 右隣の制御盤 (幅0.76m) ・左側の圧力計パネル・上部の作業床と油圧ユニット (約0.96m) まで含めて
// 外形 w×d×h に収まるよう、プレス本体は幅と高さを差し引いた寸法で組んでから左右位置を合わせる。
function buildLargeHydraulicPress({ color='#c2c4be', w=3.2, d=2.6, h=5.5 } = {}) {
  const SIDE_R = 0.78, SIDE_L = 0.07, TOP = 0.96;
  const g = _largePressBody({ color, w: w - SIDE_R - SIDE_L, d, h: h - TOP });
  g.children.forEach(c => { c.position.x -= (SIDE_R - SIDE_L) / 2; });
  return g;
}
function _largePressBody({ color, w, d, h }) {
  const g = new THREE.Group();
  // 4-post hydraulic press (HP-3000 style): light grey cast frame, chrome tie rods,
  // 3 hydraulic cylinders, hazard striped slider/bolster, top platform with yellow railing,
  // HPU tanks on top, separate control cabinet beside.
  const frame  = mat(color, 0.5, 0.12, { env: 0.3 });
  const frameD = mat(shade(color, 0.88), 0.5, 0.12);
  const chrome = mat('#c8d0d8', 0.12, 0.92, { env: 1.2 });
  const steel  = mat('#8a9aaa', 0.3, 0.65, { env: 0.8 });
  const dark   = mat('#22262a', 0.6, 0.2);
  const yellow = mat('#f2c200', 0.5, 0.1);

  const colW = 0.38, colD = 0.38;
  const boltY = h * 0.14;
  const sliderY = h * 0.48;
  const crossH = 0.55, topY = h - crossH / 2;

  // ==== BASE BED ====
  g.add(box(w, 0.72, d, frame, 0, 0.36, 0));
  for (let tx = -w/2+0.28; tx < w/2-0.18; tx += 0.26) g.add(box(0.04, 0.04, d-0.42, dark, tx, 0.75, 0));
  g.add(box(w-0.46, 0.20, d-0.46, steel, 0, boltY, 0));
  for (let tx = -w/2+0.38; tx < w/2-0.28; tx += 0.28) g.add(box(0.04, 0.06, d-0.6, dark, tx, boltY+0.13, 0));

  // hazard canvas stripe
  const hzCv = document.createElement('canvas'); hzCv.width = 256; hzCv.height = 32;
  const hzC = hzCv.getContext('2d');
  for (let xi = 0; xi < 16; xi++) { hzC.fillStyle = xi%2===0 ? '#f2c200' : '#1a1a1a'; hzC.fillRect(xi*16, 0, 16, 32); }
  const hzTex = new THREE.CanvasTexture(hzCv); hzTex.repeat.set(6, 1); hzTex.wrapS = THREE.RepeatWrapping; hzTex.anisotropy = 4;
  const hzMat = new THREE.MeshStandardMaterial({ map: hzTex, roughness: 0.6 });
  [d/2-0.01, -(d/2-0.01)].forEach(fz => g.add(plainBox(w-0.52, 0.06, 0.01, hzMat, 0, boltY+0.22, fz)));

  // gusset ribs on base bed front/rear
  [-d/2+0.025, d/2-0.025].forEach(fz =>
    [-w/2+0.62, 0, w/2-0.62].forEach(bx => g.add(box(0.26, 0.58, 0.04, frameD, bx, 0.30, fz))));

  // ==== FOUR CORNER COLUMNS ====
  const colXs = [-w/2+colW/2, w/2-colW/2];
  const colZs = [-d/2+colD/2, d/2-colD/2];
  colXs.forEach(cx => colZs.forEach(cz => {
    const col = box(colW, h, colD, frame, cx, h/2, cz); col.userData.colorable = true; g.add(col);
    g.add(box(0.07, h*0.78, 0.055, frameD, cx + Math.sign(cx) * (-colW/2 + 0.025), h/2, cz));
    g.add(box(0.055, h*0.78, 0.07, frameD, cx, h/2, cz + Math.sign(cz) * (-colD/2 + 0.025)));
  }));

  // ==== NAMEPLATE ====
  const npCv = document.createElement('canvas'); npCv.width = 512; npCv.height = 192;
  const np = npCv.getContext('2d');
  np.fillStyle = '#23262a'; np.fillRect(0, 0, 512, 192);
  np.fillStyle = '#dde0dc'; np.font = 'bold 88px Arial'; np.fillText('HP-3000', 24, 96);
  np.fillStyle = '#a0a4a0'; np.font = '30px Arial'; np.fillText('HYDRAULIC PRESS', 24, 140);
  const npTex = new THREE.CanvasTexture(npCv); npTex.anisotropy = 4;
  const npPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.42), new THREE.MeshBasicMaterial({ map: npTex }));
  npPlane.position.set(0, h * 0.65, d/2 + 0.01); g.add(npPlane);

  // ==== TOP CROSSHEAD ====
  g.add(box(w, crossH, d, frame, 0, topY, 0));
  g.add(box(w-0.86, crossH*0.6, 0.035, frameD, 0, topY, d/2 - 0.018));

  // ==== 4 CHROME TIE RODS ====
  const rodR = 0.07, rodH = h * 0.72, rodY = boltY + rodH / 2 + 0.18;
  colXs.forEach(cx => colZs.forEach(cz => {
    g.add(cylAt(rodR, rodR, rodH, 16, chrome, cx * 0.55, rodY, cz * 0.55));
    [boltY+0.25, boltY+0.33].forEach(sy => g.add(cylAt(rodR+0.022, rodR+0.022, 0.028, 14, dark, cx*0.55, sy, cz*0.55)));
  }));

  // ==== 3 HYDRAULIC CYLINDERS (black barrels + chrome piston rods) ====
  const cylBase = topY - crossH / 2;
  [[0, 0, 0.20, 0.72], [-0.65, 0, 0.14, 0.52], [0.65, 0, 0.14, 0.52]].forEach(([cx, cz, cR, cH]) => {
    g.add(cylAt(cR, cR, cH, 20, dark, cx, cylBase - cH/2, cz));
    g.add(cylAt(cR+0.04, cR+0.04, 0.08, 18, frame, cx, cylBase - 0.04, cz));
    g.add(cylAt(cR*0.65, cR*0.65, cH*1.1, 14, chrome, cx, cylBase - cH - cH*0.55 + 0.06, cz));
  });

  // ==== SLIDER / RAM HEAD ====
  g.add(box(w-0.48, 0.22, d-0.5, steel, 0, sliderY, 0));
  [d/2-0.25, -(d/2-0.25)].forEach(fz => g.add(plainBox(w-0.54, 0.06, 0.01, hzMat, 0, sliderY+0.13, fz)));
  colXs.forEach(cx => colZs.forEach(cz => g.add(cylAt(rodR+0.016, rodR+0.016, 0.24, 14, frameD, cx*0.55, sliderY, cz*0.55))));

  // ==== HYDRAULIC HOSES ====
  const hoseMat = mat('#141618', 0.8, 0.1);
  [[0.3,1.0,0.1],[-0.3,0.95,-0.05],[0.0,0.85,0.12],[0.55,0.78,-0.08],[-0.55,0.72,0.06]].forEach(([hr,hl,ha]) => {
    const ho = cyl(0.038, 0.038, hl, 8, hoseMat); ho.rotation.z = 0.4 + ha; ho.position.set(hr, topY - 0.28, 0.18); g.add(ho);
  });

  // ==== TOP PLATFORM ====
  g.add(box(w, 0.06, d, mat(shade(color, 0.82), 0.6, 0.3), 0, h + 0.03, 0));
  const railY = h + 0.06;
  // corner posts
  [[-w/2+0.14,-d/2+0.14],[w/2-0.14,-d/2+0.14],[-w/2+0.14,d/2-0.14],[w/2-0.14,d/2-0.14]].forEach(([rx,rz]) => {
    g.add(cylAt(0.032, 0.032, 0.9, 8, yellow, rx, railY + 0.45, rz));
  });
  // horizontal rails
  [0.3, 0.7].forEach(rh => {
    g.add(box(w-0.28, 0.028, 0.028, yellow, 0, railY + rh, -d/2+0.14));
    g.add(box(w-0.28, 0.028, 0.028, yellow, 0, railY + rh,  d/2-0.14));
    g.add(box(0.028, 0.028, d-0.28, yellow, -w/2+0.14, railY + rh, 0));
    g.add(box(0.028, 0.028, d-0.28, yellow,  w/2-0.14, railY + rh, 0));
  });
  // HPU tanks
  [-0.62, 0.62].forEach(tx => {
    g.add(cylAt(0.3, 0.3, 0.82, 20, steel, tx, h + 0.47, -0.18));
    g.add(cylAt(0.28, 0.28, 0.06, 16, frameD, tx, h + 0.9, -0.18));
    g.add(cylAt(0.04, 0.04, 0.2, 10, dark, tx + 0.26, h + 0.55, -0.18).rotateZ(Math.PI/2));
    g.add(cylAt(0.03, 0.03, 0.14, 8, dark, tx, h + 0.9, 0.1).rotateX(Math.PI/2));
  });
  g.add(box(0.38, 0.32, 0.32, dark, 0, h + 0.22, 0.52));
  g.add(cylAt(0.1, 0.1, 0.26, 14, mat('#3a3f45', 0.5), 0, h + 0.24, 0.52).rotateX(Math.PI/2));

  // ==== CONTROL CABINET (right side) ====
  const cabX = w/2 + 0.40, cabH = 2.4;                                 // 制御盤 (本体の右隣)
  g.add(box(0.76, cabH, 0.6, frame, cabX, cabH/2, 0));
  // screen
  const sCv = document.createElement('canvas'); sCv.width = 240; sCv.height = 180;
  const sc = sCv.getContext('2d');
  sc.fillStyle = '#d0d4d0'; sc.fillRect(0, 0, 240, 180);
  sc.fillStyle = '#1d3a60'; sc.fillRect(0, 0, 240, 24);
  sc.fillStyle = '#fff'; sc.font = '14px Arial'; sc.fillText('HP-3000 CONTROL', 8, 18);
  sc.fillStyle = '#2a6aaa';
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) sc.fillRect(8 + c*76, 32 + r*44, 68, 36);
  sc.fillStyle = '#fff'; sc.font = 'bold 11px Arial';
  ['CYCLE','SPEED','FORCE','POS','PRES','MODE','START','STOP','RESET'].forEach((t, i) =>
    sc.fillText(t, 12 + (i%3)*76, 56 + Math.floor(i/3)*44));
  const scTex = new THREE.CanvasTexture(sCv); scTex.anisotropy = 4;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), new THREE.MeshBasicMaterial({ map: scTex }));
  scr.position.set(cabX, cabH * 0.72, 0.31); g.add(scr);
  g.add(box(0.54, 0.42, 0.02, mat('#0c1218', 0.4), cabX, cabH * 0.72, 0.305));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++)
    g.add(box(0.05, 0.04, 0.016, mat('#ccc', 0.6), cabX - 0.16 + c*0.11, cabH*0.52 - r*0.06, 0.31));
  g.add(cylAt(0.044, 0.044, 0.03, 16, mat('#ef4444', 0.4, 0.1, { emissive: '#aa0000', emissiveIntensity: 0.5 }), cabX + 0.18, cabH*0.37, 0.32).rotateX(Math.PI/2));
  ['#22c55e','#f59e0b'].forEach((c, i) => g.add(cylAt(0.028, 0.028, 0.025, 12, mat(c, 0.4), cabX - 0.06 + i*0.1, cabH*0.3, 0.32).rotateX(Math.PI/2)));
  // HPU/pump cluster on cabinet top
  g.add(box(0.62, 0.58, 0.52, frameD, cabX, cabH + 0.31, 0));
  g.add(cylAt(0.1, 0.1, 0.28, 14, mat('#3a3f45', 0.5), cabX + 0.06, cabH + 0.42, 0.16).rotateX(Math.PI/2));
  g.add(cylAt(0.1, 0.1, 0.14, 14, mat('#3a3f45', 0.5), cabX, cabH + 0.48, 0.06));
  // signal tower
  const lx = cabX + 0.34, lz = 0.04, lly = cabH + 0.1;
  g.add(cylAt(0.018, 0.018, 0.22, 10, chrome, lx, lly, lz));
  let sly2 = lly + 0.16;
  [['#ef4444',0.9],['#f5b800',0.85],['#22c55e',0.85]].forEach(([c, e]) => {
    g.add(cylAt(0.04, 0.04, 0.09, 14, mat(c, 0.3, 0.1, { emissive: c, emissiveIntensity: e }), lx, sly2, lz));
    sly2 += 0.1;
  });

  // ==== LEFT-SIDE OPERATOR PANEL (gauges) ====
  g.add(box(0.06, 0.82, 0.56, frameD, -w/2 - 0.04, 2.1, 0));
  [0, 1, 2].forEach(i => {
    const pg = cyl(0.07, 0.07, 0.025, 16, mat('#ddd', 0.2, 0.1));
    pg.rotation.x = Math.PI/2; pg.position.set(-w/2 - 0.04, 2.42 - i*0.26, 0.26); g.add(pg);
    g.add(cylAt(0.04, 0.04, 0.02, 12, dark, -w/2 - 0.04, 2.42 - i*0.26, 0.274).rotateX(Math.PI/2));
  });

  g.traverse(o => { if (o.isMesh && o.material === frame) o.userData.colorable = true; });
  return g;
}
// 工業炉 (汎用の箱型熱処理炉): 黒い炉体 + 前面の開口 (耐火れんが・赤熱) + 左ヒンジの炉扉 (クリックで開閉, 初期は開),
// 上部の排気ダクトと煙突, 右側面の温度調節パネル, 左側面の冷却水配管。扉を閉じた状態で外形 w×d×h に収める。
function buildIndustrialFurnace({ color='#2a2a2a', w=2.0, d=1.5, h=2.2 } = {}) {
  const g = new THREE.Group();
  const shell = mat(color, 0.55, 0.15);
  const insul = mat('#c86820', 0.9, 0.0);  // refractory brick orange-red
  const steel = mat('#8a9aa8', 0.3, 0.6);
  const glow  = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: new THREE.Color(0xff4400), emissiveIntensity: 0.8, roughness: 0.9 });
  const dark  = mat('#111316', 0.8, 0.1);
  const sw = w - 0.12, sd = d - 0.1, sz = -0.05, fz = sz + sd / 2, bodyH = h - 0.5;   // 炉体 (側面の配管・パネル, 前面の扉ぶんを差し引く)
  const outer = box(sw, bodyH, sd, shell, 0, bodyH / 2, sz); outer.userData.colorable = true; g.add(outer);
  // ---- 前面開口: 鋼製の枠 (4辺) + 耐火れんがの内張り (4辺) + 赤熱した炉内 ----
  const openW = sw * 0.62, openH = bodyH * 0.55, openY = bodyH * 0.45, fo = 0.05, li = 0.06;
  [[openW + 2 * fo, fo, 0, openH / 2 + fo / 2], [openW + 2 * fo, fo, 0, -openH / 2 - fo / 2], [fo, openH, -openW / 2 - fo / 2, 0], [fo, openH, openW / 2 + fo / 2, 0]]
    .forEach(([bw, bh, x, y]) => g.add(box(bw, bh, 0.05, dark, x, openY + y, fz + 0.01)));
  [[openW, li, 0, openH / 2 - li / 2], [openW, li, 0, -openH / 2 + li / 2], [li, openH - 2 * li, -openW / 2 + li / 2, 0], [li, openH - 2 * li, openW / 2 - li / 2, 0]]
    .forEach(([bw, bh, x, y]) => g.add(plainBox(bw, bh, 0.02, insul, x, openY + y, fz + 0.012)));
  g.add(plainBox(openW - 2 * li, openH - 2 * li, 0.01, glow, 0, openY, fz + 0.006));
  g.add(plainBox(openW - 2 * li, 0.03, 0.02, mat('#ffb040', 0.6), 0, openY - openH / 2 + li + 0.02, fz + 0.012));   // 炉床で熱せられた材料
  // ---- 炉扉 (左ヒンジ, 外開き) ----
  const doorGroup = new THREE.Group();
  doorGroup.position.set(-openW / 2 - 0.05, openY, fz + 0.04);
  doorGroup.add(box(openW, openH + 0.08, 0.07, mat('#1a1a1a', 0.6, 0.2), openW / 2, 0, 0));
  doorGroup.add(box(openW * 0.9, openH * 0.86, 0.035, insul, openW / 2, 0, -0.05));
  doorGroup.add(box(0.04, 0.04, 0.03, steel, openW - 0.05, 0, 0.05));
  doorGroup.rotation.y = -0.95;
  g.add(doorGroup);
  // ---- 排気ダクト + 煙突 (上端 = h) ----
  g.add(box(0.3, 0.3, 0.22, dark, sw * 0.35, bodyH + 0.15, sz));
  g.add(cylAt(0.1, 0.1, 0.2, 14, dark, sw * 0.35, bodyH + 0.4, sz));
  g.add(cylAt(0.12, 0.12, 0.02, 14, steel, sw * 0.35, h - 0.01, sz));
  // ---- 右側面: 熱電対ポート + 温度調節パネル (表示器・ランプ) ----
  g.add(cylAt(0.016, 0.016, 0.06, 8, steel, sw / 2 + 0.03, bodyH * 0.72, sz + 0.23).rotateZ(Math.PI / 2));
  g.add(box(0.05, 0.65, 0.36, dark, sw / 2 + 0.025, bodyH * 0.68, sz - 0.25));
  g.add(plainBox(0.01, 0.28, 0.26, mat('#0d1520', 0.3), w / 2 - 0.005, bodyH * 0.74, sz - 0.25));
  ['#ef4444', '#f59e0b', '#22c55e'].forEach((cl, i) => g.add(cylAt(0.015, 0.015, 0.012, 8, mat(cl, 0.2), w / 2 - 0.006, bodyH * 0.56 - i * 0.05, sz - 0.25).rotateZ(Math.PI / 2)));
  // ---- 背面のガス/電源の取入口 ----
  g.add(cylAt(0.02, 0.02, 0.05, 10, steel, 0.2, bodyH * 0.22, sz - sd / 2 - 0.02).rotateX(Math.PI / 2));
  // ---- 左側面: 冷却水配管 (縦管 + 炉体へ入る曲がり) ----
  [-0.3, 0.3].forEach(z => {
    g.add(cylAt(0.025, 0.025, bodyH - 0.1, 12, steel, -sw / 2 - 0.03, (bodyH - 0.1) / 2, sz + z));
    g.add(cylAt(0.025, 0.025, 0.1, 8, steel, -sw / 2 + 0.01, bodyH - 0.12, sz + z).rotateZ(Math.PI / 2));
  });
  // ---- 脚 ----
  [[-sw / 2 + 0.12, fz - 0.1], [sw / 2 - 0.12, fz - 0.1], [-sw / 2 + 0.12, sz - sd / 2 + 0.1], [sw / 2 - 0.12, sz - sd / 2 + 0.1]].forEach(([x, z]) => g.add(box(0.1, 0.12, 0.1, dark, x, 0.06, z)));
  g.userData.parts = { door: doorGroup };
  return g;
}
function buildInjectionMolder({ color='#e8e4dc', w=5.133, d=1.365, h=1.923 } = {}) {
  const g = new THREE.Group();
  // horizontal all-electric injection molding machine (住友重機械 SE180EV-A, 5133×1365×1923):
  // off-white shrouds, blue safety guard, charcoal machine bed, stainless hopper. Clamp LEFT, injection RIGHT.
  // 型締ユニット/射出ユニットのシュラウドは w に応じて伸縮する。
  const body   = mat(color, 0.45, 0.12, { env: 0.4 });               // off-white shrouds (colorable)
  const bodyD  = mat(shade(color, 0.9), 0.45, 0.12);
  const charc  = mat('#34373b', 0.55, 0.3, { env: 0.4 });            // machine bed / cabinets
  const charc2 = mat('#26282b', 0.6, 0.2);                           // recessed door panels
  const blue   = mat('#2c4fa0', 0.4, 0.25, { env: 0.5 });            // safety guard
  const blueD  = mat('#213c80', 0.45, 0.25);
  const steel  = mat('#9aa6b0', 0.25, 0.75, { env: 0.9 });           // platens / rods
  const chrome = mat('#cdd4da', 0.12, 0.95, { env: 1.3 });           // tie bars / hopper / nozzle
  const stain  = mat('#c4ccd2', 0.18, 0.9, { env: 1.2 });            // stainless hopper
  const dark   = mat('#15181b', 0.55, 0.25);                         // screens / handles
  const yellow = mat('#f2c200', 0.5, 0.1);
  const glass  = new THREE.MeshStandardMaterial({ color: 0x8aa0ae, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.4 });
  const deckY = 0.92;
  const fz = d/2;

  // ===== machine bed (charcoal) =====
  // bottom perimeter rails on leveling feet
  [fz - 0.12, -(fz - 0.12)].forEach(z => g.add(box(w - 0.1, 0.14, 0.2, charc, 0, 0.21, z)));
  // leveling feet
  for (let i = 0; i < 6; i++) { const fx = -w/2 + 0.3 + i * (w - 0.6)/5;
    [fz - 0.12, -(fz - 0.12)].forEach(z => { g.add(cylAt(0.04, 0.05, 0.1, 10, dark, fx, 0.06, z)); g.add(cylAt(0.07, 0.07, 0.03, 12, charc2, fx, 0.015, z)); });
  }
  // left clamp pedestal block (leaves a recessed gap to its right, as in the photo)
  g.add(box(0.62, 0.74, d, charc, -w/2 + 0.31, 0.55, 0));
  // central + right cabinet block (doors / vents / labels)
  const cabX0 = -w/2 + 1.15, cabX1 = w/2;                 // x range of main cabinet
  const cabW = cabX1 - cabX0, cabCx = (cabX0 + cabX1)/2;
  g.add(box(cabW, 0.74, d, charc, cabCx, 0.55, 0));
  // checker-plate deck on top of the bed (center span)
  const deckTex = checkerTex.clone(); deckTex.repeat.set(6, 2); deckTex.needsUpdate = true;
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x9098a0, roughness: 0.5, metalness: 0.55, map: deckTex });
  g.add(box(w - 1.1, 0.04, d - 0.06, deckMat, 0.1, deckY + 0.02, 0));
  // front cabinet doors + handles + warning labels + louver vents
  [-0.15, 0.75].forEach(dx => {
    g.add(box(0.7, 0.56, 0.02, charc2, cabCx + dx, 0.54, fz + 0.006));            // door panel
    g.add(box(0.025, 0.22, 0.03, mat('#8a9098',0.4,0.6), cabCx + dx + 0.3, 0.54, fz + 0.02)); // handle
    g.add(box(0.1, 0.1, 0.008, yellow, cabCx + dx - 0.18, 0.66, fz + 0.012));     // warning label
  });
  for (let i = 0; i < 5; i++) g.add(box(0.34, 0.012, 0.01, charc2, cabX1 - 0.28, 0.42 + i*0.045, fz + 0.008)); // louvers
  // recessed opening frame (left gap)
  g.add(box(0.5, 0.06, d - 0.1, charc2, -w/2 + 0.85, 0.32, 0));

  // ===== clamping unit shroud (off-white rounded cover, far left) =====
  const clmpCx = -w/2 + 0.42;
  const clmp = new THREE.Mesh(roundedBoxGeom(0.78, 0.86, d - 0.1, 0.12, 4), body);
  clmp.position.set(clmpCx, deckY + 0.45, 0); clmp.castShadow = true; g.add(clmp);
  g.add(box(0.1, 0.7, d - 0.2, bodyD, clmpCx + 0.4, deckY + 0.42, 0));            // rear shading face
  // nameplate "SE180EV-A / SUMITOMO"
  const nCv = document.createElement('canvas'); nCv.width = 384; nCv.height = 192;
  const nx = nCv.getContext('2d'); nx.fillStyle = '#e8e4dc'; nx.fillRect(0,0,384,192);
  nx.fillStyle = '#23262b'; nx.font = 'bold 60px Arial'; nx.fillText('SE180EV-A', 20, 78);
  nx.fillStyle = '#2c4fa0'; nx.font = 'bold 40px Arial'; nx.fillText('SUMITOMO', 20, 132);
  nx.fillStyle = '#23262b'; nx.font = 'bold 28px Arial'; nx.fillText('ALL-ELECTRIC', 20, 168);
  const nTex = new THREE.CanvasTexture(nCv); nTex.anisotropy = 4;
  const nPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: nTex }));
  nPlane.position.set(clmpCx - 0.12, deckY + 0.5, fz - 0.04); g.add(nPlane);

  // signal tower on top-left of clamp shroud
  const sx = clmpCx - 0.2, sz = -0.2;
  g.add(cylAt(0.018, 0.018, 0.22, 10, chrome, sx, deckY + 0.92, sz));
  let sly = deckY + 1.06;
  [['#ef4444',0.9],['#f5b800',0.85],['#22c55e',0.85]].forEach(([c,e]) => { g.add(cylAt(0.04,0.04,0.08,14, mat(c,0.3,0.1,{emissive:c,emissiveIntensity:e}), sx, sly, sz)); sly += 0.09; });
  g.add(cylAt(0.032,0.032,0.03,12, dark, sx, sly, sz));

  // ===== mold area: platens + tie bars (visible behind the blue guard) =====
  const moldY = deckY + 0.42;
  // 4 chrome tie bars running along x (from inside the clamp shroud to the moving platen)
  const tbX0 = -w/2 + 0.6, tbX1 = 0.2;
  [[0.32,0.32],[0.32,-0.32],[-0.32,0.32],[-0.32,-0.32]].forEach(([dy,tz]) => {
    const tb = cyl(0.045, 0.045, tbX1 - tbX0, 14, chrome); tb.rotation.z = Math.PI/2; tb.position.set((tbX0 + tbX1)/2, moldY + dy, tz); g.add(tb);
  });
  // fixed platen (left) with bore-hole pattern, moving platen (right), mold block
  const platen = (px) => { const p = box(0.12, 0.62, d - 0.28, steel, px, moldY, 0); g.add(p);
    for (let a = 0; a < 4; a++) { const ang = a/4*Math.PI*2; g.add(cylAt(0.05,0.05,0.13,12, dark, px, moldY + Math.cos(ang)*0.18, Math.sin(ang)*0.22).rotateZ(Math.PI/2)); } };
  platen(-1.15); platen(-0.55);
  g.add(box(0.3, 0.5, d - 0.34, mat('#5a626c',0.4,0.4), -0.85, moldY, 0));        // mold block

  // ===== blue safety guard over the mold area =====
  const grdCx = -0.85, grdW = 0.92;
  g.add(box(grdW, 0.82, 0.04, blue, grdCx, deckY + 0.45, fz - 0.02));             // guard door
  g.add(box(grdW + 0.06, 0.1, 0.08, blueD, grdCx, deckY + 0.88, fz - 0.02));      // top rail
  g.add(box(grdW + 0.06, 0.08, 0.08, blueD, grdCx, deckY + 0.06, fz - 0.02));     // bottom rail
  const gwin = plainBox(grdW - 0.2, 0.5, 0.01, glass, grdCx, deckY + 0.5, fz + 0.005); gwin.castShadow = false; g.add(gwin);
  [grdCx - 0.18, grdCx + 0.18].forEach(hx => g.add(box(0.03, 0.5, 0.03, dark, hx, deckY + 0.48, fz + 0.03))); // handles
  g.add(box(0.34, 0.06, 0.01, yellow, grdCx, deckY + 0.08, fz + 0.01));           // warning stripe

  // ===== control panel (center, dark housing on swing arm) =====
  const pan = new THREE.Group(); pan.position.set(-0.05, deckY + 0.5, fz + 0.06); pan.rotation.y = -0.12; g.add(pan);
  g.add(box(0.06, 0.5, 0.06, dark, -0.18, deckY + 0.5, fz - 0.06));               // swing arm
  pan.add(box(0.5, 0.78, 0.08, dark, 0, 0, 0));                                   // housing
  // screen with GUI canvas
  const sCv = document.createElement('canvas'); sCv.width = 200; sCv.height = 160;
  const sc = sCv.getContext('2d'); sc.fillStyle = '#d8dde2'; sc.fillRect(0,0,200,160);
  sc.fillStyle = '#1f5fa8'; sc.fillRect(0,0,200,22);
  sc.fillStyle = '#ffffff'; sc.font = '12px Arial'; sc.fillText('SE180EV-A', 6, 16);
  const cols = ['#2f7fd0','#39b54a','#f0a020','#d04545'];
  for (let i=0;i<8;i++){ sc.fillStyle = cols[i%4]; sc.fillRect(8 + (i%4)*46, 32 + Math.floor(i/4)*40, 40, 32); }
  sc.fillStyle = '#222'; sc.font = '11px monospace'; sc.fillText('CYCLE 18.6s  OK', 8, 150);
  const sTex = new THREE.CanvasTexture(sCv); sTex.anisotropy = 4;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.27), new THREE.MeshBasicMaterial({ map: sTex }));
  scr.position.set(0, 0.17, 0.045); pan.add(scr);
  pan.add(box(0.4, 0.32, 0.02, mat('#0c1218',0.4), 0, 0.17, 0.04));               // screen housing
  // keypad
  for (let r=0;r<3;r++) for (let c=0;c<6;c++) pan.add(box(0.04,0.035,0.012, mat('#cfcbc3',0.6), -0.18 + c*0.072, -0.06 - r*0.055, 0.045));
  // buttons + E-stop
  pan.add(cylAt(0.035,0.035,0.03,16, mat('#ef4444',0.4,0.1,{emissive:'#aa0000',emissiveIntensity:0.4}), 0.16, -0.28, 0.05).rotateX(Math.PI/2));
  ['#22c55e','#f59e0b'].forEach((c,i)=>pan.add(cylAt(0.022,0.022,0.025,12, mat(c,0.4), -0.16 + i*0.06, -0.3, 0.05).rotateX(Math.PI/2)));

  // ===== injection unit (right): carriage rods, barrel shroud, hopper, drive =====
  // guide rods / ballscrew in the gap between control area and injection shroud
  [0.28, -0.28].forEach(tz => { const r = cyl(0.04,0.04,1.0,12, chrome); r.rotation.z = Math.PI/2; r.position.set(0.55, deckY + 0.32, tz); g.add(r); });
  const bscrew = cyl(0.05,0.05,0.9,14, mat('#aab2ba',0.3,0.7)); bscrew.rotation.z = Math.PI/2; bscrew.position.set(0.55, deckY + 0.32, 0); g.add(bscrew);
  // barrel + nozzle pointing left toward the platen
  const barrel = cyl(0.09,0.09,0.7,18, steel); barrel.rotation.z = Math.PI/2; barrel.position.set(0.62, deckY + 0.32, 0); g.add(barrel);
  for (let bx = 0.4; bx < 0.85; bx += 0.13) g.add(box(0.1, 0.21, 0.21, mat('#8a4a20',0.7), bx, deckY + 0.32, 0)); // band heaters
  const nozzle = cyl(0.045,0.03,0.16,12, chrome); nozzle.rotation.z = Math.PI/2; nozzle.position.set(0.18, deckY + 0.32, 0); g.add(nozzle);
  // injection unit span: from the control area to just before the drive housing (grows with w)
  const injX0 = 0.6, injX1 = w/2 - 0.36, injW = injX1 - injX0, injCx = (injX0 + injX1)/2;
  // injection unit base / tilt cradle (dark)
  g.add(box(injW + 0.1, 0.18, d - 0.2, charc, injCx, deckY + 0.08, 0));
  g.add(box(injW * 0.5, 0.16, d - 0.34, charc2, injCx, deckY + 0.2, 0));
  // off-white barrel shroud
  const injShroud = new THREE.Mesh(roundedBoxGeom(injW, 0.6, d - 0.16, 0.1, 4), body);
  injShroud.position.set(injCx, deckY + 0.5, 0); injShroud.castShadow = true; g.add(injShroud);
  // "180 / SUMITOMO SE-EV-A" label
  const iCv = document.createElement('canvas'); iCv.width = 256; iCv.height = 160;
  const ix = iCv.getContext('2d'); ix.fillStyle = '#e8e4dc'; ix.fillRect(0,0,256,160);
  ix.fillStyle = '#23262b'; ix.font = 'bold 80px Arial'; ix.fillText('180', 16, 80);
  ix.fillStyle = '#2c4fa0'; ix.font = 'bold 30px Arial'; ix.fillText('SUMITOMO', 18, 120);
  ix.fillStyle = '#23262b'; ix.font = 'bold 24px Arial'; ix.fillText('SE-EV-A', 18, 148);
  const iTex = new THREE.CanvasTexture(iCv); iTex.anisotropy = 4;
  const iPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.31), new THREE.MeshBasicMaterial({ map: iTex }));
  iPlane.position.set(injCx + 0.05, deckY + 0.5, fz - 0.08); g.add(iPlane);
  // drive/motor housing at far right
  g.add(box(0.42, 0.56, d - 0.24, charc, w/2 - 0.12, deckY + 0.42, 0));
  g.add(cylAt(0.03,0.03,0.02,10, mat('#ef4444',0.3,0.1,{emissive:'#cc0000',emissiveIntensity:0.5}), w/2 - 0.12, deckY + 0.62, fz - 0.16).rotateX(Math.PI/2));

  // ===== stainless steel hopper on top of the injection unit (top ≈ h, ホッパー付き全高) =====
  const hX = injCx - injW * 0.2, hBaseY = deckY + 0.74;
  g.add(cylAt(0.05, 0.05, 0.1, 14, stain, hX, hBaseY, 0));                        // throat onto barrel
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.05, 0.16, 18), stain);
  funnel.position.set(hX, hBaseY + 0.12, 0); funnel.castShadow = true; g.add(funnel); // cone
  g.add(cylAt(0.18, 0.18, 0.14, 18, stain, hX, hBaseY + 0.27, 0));                // cylindrical bin
  g.add(cylAt(0.19, 0.19, 0.02, 18, mat('#a8b0b6',0.2,0.85), hX, hBaseY + 0.35, 0)); // rim
  g.add(cylAt(0.13, 0.13, 0.03, 16, stain, hX, hBaseY + 0.37, 0));                // lid
  g.add(box(0.14, 0.012, 0.012, dark, hX, hBaseY + 0.2, 0.18));                   // sight-glass strip

  // mark off-white shrouds colorable
  g.traverse(o => { if (o.isMesh && o.material === body) o.userData.colorable = true; });
  return g;
}

function buildForklift({ color='#f5c020', w=1.15, d=3.0, h=2.1 } = {}) {
  // トヨタ 8FBE15 (1.5t 3輪バッテリーカウンター, 全長3.0×全幅1.15×全高2.1m) 基準。
  // Built at a native reference scale into `lift` (z-extent -3.94..+2.34 = 6.28,
  // width 2.2, mast top 3.5), then scaled per axis to the catalogue w/d/h and
  // recentred. Wheel groups are counter-scaled in y so tyres stay round.
  // Front faces -z. Fork blades: 1.7 native → 0.81 m at 8FBE15 scale (920 mm forks).
  const g = new THREE.Group();
  const NAT_W = 2.2, NAT_D = 6.28, NAT_H = 3.5;
  const sx = w / NAT_W, sy = h / NAT_H, sz = d / NAT_D;
  const kY = sz / sy;              // wheel y counter-scale (keeps tyres circular)
  const lift = new THREE.Group();
  lift.scale.set(sx, sy, sz);
  lift.position.z = 0.8 * sz;      // recentre native z-extent (-3.94..+2.34) on origin
  g.add(lift);

  // ---------- local helpers (match the reference model signatures) ----------
  const lbox = (bw, bh, bd, m, x=0, y=0, z=0, parent=null) => {
    const me = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
    me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
    if (parent) parent.add(me); return me;
  };
  const lcyl = (rt, rb, hh, m, x=0, y=0, z=0, parent=null, seg=20) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, hh, seg), m);
    me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true;
    if (parent) parent.add(me); return me;
  };

  // ---------- materials ----------
  const tt = rubberTex.clone(); tt.repeat.set(6, 2); tt.needsUpdate = true;
  const MAT = {
    body:      new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness:.45, metalness:.25 }),
    bodyDark:  new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(color, 0.78)), roughness:.5, metalness:.25 }),
    counter:   new THREE.MeshStandardMaterial({ color:0x394149, roughness:.6, metalness:.35 }),
    steel:     new THREE.MeshStandardMaterial({ color:0x23282e, roughness:.4, metalness:.65 }),
    steelLite: new THREE.MeshStandardMaterial({ color:0x4a545e, roughness:.45, metalness:.55 }),
    tire:      new THREE.MeshStandardMaterial({ color:0x16181a, roughness:.95, metalness:0, map: tt }),
    hub:       new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(color, 0.58)), roughness:.5, metalness:.4 }),
    seat:      new THREE.MeshStandardMaterial({ color:0x1c1f23, roughness:.85, metalness:0 }),
    chrome:    new THREE.MeshStandardMaterial({ color:0xb9c2cb, roughness:.25, metalness:.9 }),
    lightOn:   new THREE.MeshStandardMaterial({ color:0xfff6d8, emissive:0xfff1b8, emissiveIntensity:.9, roughness:.3 }),
    beacon:    new THREE.MeshStandardMaterial({ color:0xff8c1a, emissive:0xff7a1a, emissiveIntensity:.8, roughness:.3, transparent:true, opacity:.92 }),
  };

  // ---------- canvas textures (hazard plate + side tonnage label) ----------
  function hazardTexture() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = '#15181c'; x.fillRect(0, 0, 256, 64);
    x.fillStyle = '#f5c518';
    for (let i = -64; i < 256; i += 48) { x.beginPath(); x.moveTo(i, 64); x.lineTo(i + 24, 64); x.lineTo(i + 88, 0); x.lineTo(i + 64, 0); x.closePath(); x.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function labelTexture(text) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = '#394149'; x.fillRect(0, 0, 256, 128);
    x.fillStyle = '#f1f4f7'; x.font = "700 64px 'Segoe UI', sans-serif"; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 128, 60);
    x.fillStyle = '#f5c518'; x.fillRect(48, 96, 160, 8);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }

  // ---------- chassis / body ----------
  const bodyG = new THREE.Group(); lift.add(bodyG);
  lbox(2.0, 0.5, 3.2, MAT.bodyDark, 0, 0.72, -0.15, bodyG);   // lower frame
  lbox(2.06, 0.62, 1.5, MAT.body, 0, 1.28, 0.30, bodyG);      // engine hood
  lbox(2.06, 0.16, 0.9, MAT.body, 0, 1.05, -0.95, bodyG);     // front deck
  lbox(0.5, 0.45, 0.45, MAT.steel, 0, 1.22, -1.05, bodyG);    // steering column base
  [-1, 1].forEach(s => lbox(0.34, 0.14, 1.55, MAT.body, s*0.95, 1.42, -1.4, bodyG)); // front fenders

  // ---------- counterweight ----------
  lbox(2.2, 1.0, 1.15, MAT.counter, 0, 0.95, 1.62, bodyG);
  lbox(2.06, 0.46, 0.9, MAT.counter, 0, 1.66, 1.55, bodyG);
  lbox(1.7, 0.62, 0.32, MAT.counter, 0, 0.62, 2.18, bodyG);
  const hzMat = new THREE.MeshStandardMaterial({ map: hazardTexture(), roughness:.6 });
  lbox(1.9, 0.3, 0.03, hzMat, 0, 1.32, 2.215, bodyG);         // rear hazard plate
  const lblT = labelTexture('1.5t');
  [-1, 1].forEach(s => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), new THREE.MeshStandardMaterial({ map: lblT, roughness:.6 }));
    p.position.set(s*1.105, 1.15, 1.62); p.rotation.y = s*Math.PI/2; bodyG.add(p);
  });

  // ---------- overhead guard (ヘッドガード上面 ≈ 全高 = マスト格納高) ----------
  const guard = new THREE.Group(); lift.add(guard);
  const GT = 3.36;                                              // guard roof top (native)
  const postGeoF = new THREE.CylinderGeometry(.05, .05, GT - 1.14, 12);
  const postGeoR = new THREE.CylinderGeometry(.05, .05, GT - 1.4, 12);
  [-1, 1].forEach(s => {
    const pf = new THREE.Mesh(postGeoF, MAT.steel); pf.position.set(s*0.92, (GT + 1.14)/2, -0.86); pf.rotation.x = 0.1; pf.castShadow = true; guard.add(pf);
    const pr = new THREE.Mesh(postGeoR, MAT.steel); pr.position.set(s*0.92, (GT + 1.4)/2, 0.92); pr.rotation.x = -0.06; pr.castShadow = true; guard.add(pr);
  });
  lbox(1.94, 0.07, 1.9, MAT.steel, 0, GT - 0.035, 0.03, guard);
  for (let i = 0; i < 5; i++) lbox(0.06, 0.05, 1.78, MAT.steelLite, -0.7 + i*0.35, GT + 0.015, 0.03, guard);
  lcyl(.07, .09, .16, MAT.beacon, 0.72, GT + 0.1, 0.75, guard, 14);   // beacon
  lcyl(.1, .1, .04, MAT.steel, 0.72, GT + 0.01, 0.75, guard, 14);
  // (バッテリー車のため排気管なし) バッテリーカバー上のコネクタ
  lbox(0.16, 0.1, 0.12, MAT.steel, -0.75, 1.64, 0.75, lift);

  // ---------- seat / controls ----------
  lbox(0.62, 0.16, 0.6, MAT.seat, 0, 1.66, 0.32, lift);   // seat base
  lbox(0.6, 0.62, 0.14, MAT.seat, 0, 2.02, 0.62, lift);   // seat back
  const colG = new THREE.Group(); colG.position.set(0, 1.42, -1.0); colG.rotation.x = 0.55; lift.add(colG);
  lcyl(.04, .05, .62, MAT.steel, 0, .31, 0, colG, 12);
  const wheelG = new THREE.Group(); wheelG.position.y = 0.64; colG.add(wheelG);
  const sWheel = new THREE.Mesh(new THREE.TorusGeometry(.19, .025, 10, 28), MAT.seat); sWheel.rotation.x = Math.PI/2; sWheel.castShadow = true; wheelG.add(sWheel);
  for (let i = 0; i < 3; i++) { const sp = lbox(.025, .02, .18, MAT.steelLite, 0, 0, 0, wheelG); sp.rotation.y = i*Math.PI*2/3; sp.translateZ(.09); }
  lcyl(.03, .03, .05, MAT.hub, 0, 0, 0, wheelG, 10);
  for (let i = 0; i < 3; i++) { const lv = lcyl(.014, .014, .3, MAT.steelLite, 0.32 + i*0.1, 1.62, -0.78, lift, 8); lv.rotation.x = -0.5; lcyl(.026, .026, .04, MAT.seat, 0, 0, 0, lv, 8).position.y = .15; }
  [-1, 1].forEach(s => { lcyl(.07, .07, .06, MAT.lightOn, s*0.78, 1.5, -2.08, lift, 14).rotation.x = Math.PI/2; }); // headlights

  // ---------- wheels (front double drive + rear steer) ----------
  function makeWheel(r, ww) {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, ww, 28), MAT.tire); tire.rotation.z = Math.PI/2; tire.castShadow = true; tire.receiveShadow = true; wg.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r*0.42, r*0.42, ww+0.02, 18), MAT.hub); hub.rotation.z = Math.PI/2; wg.add(hub);
    for (let i = 0; i < 9; i++) { const lug = new THREE.Mesh(new THREE.BoxGeometry(ww+0.015, r*0.16, r*0.22), MAT.tire); lug.rotation.x = i*Math.PI*2/9; lug.translateY(r*0.93); wg.add(lug); }
    return wg;
  }
  const frontWheelR = 0.62, rearWheelR = 0.50;
  // single drive wheel per side; wheel groups counter-scaled in y (kY) so tyres stay round
  [-1, 1].forEach(s => { const sp = new THREE.Group(); sp.position.set(s*0.9, frontWheelR * kY, -1.45); sp.scale.y = kY; sp.add(makeWheel(frontWheelR, 0.42)); lift.add(sp); });
  // 3輪カウンター: 後輪は車体中央寄りのダブルタイヤ
  const rearSteer = [];
  [-1, 1].forEach(s => { const st = new THREE.Group(); st.position.set(s*0.22, rearWheelR * kY, 1.05); st.scale.y = kY; st.add(makeWheel(rearWheelR, 0.3)); lift.add(st); rearSteer.push(st); });

  // ---------- mast (tilt pivot) ----------
  const mast = new THREE.Group(); mast.position.set(0, 0.25, -1.95); lift.add(mast);
  const OUTER_H = 3.25;
  [-1, 1].forEach(s => lbox(0.14, OUTER_H, 0.28, MAT.steel, s*0.62, OUTER_H/2, 0, mast));
  lbox(1.22, 0.16, 0.2, MAT.steel, 0, 0.35, 0.05, mast);
  lbox(1.22, 0.14, 0.2, MAT.steel, 0, 2.6, 0.05, mast);
  const inner = new THREE.Group(); mast.add(inner);
  const INNER_H = 3.05;
  [-1, 1].forEach(s => lbox(0.11, INNER_H, 0.2, MAT.steelLite, s*0.45, INNER_H/2 + 0.1, -0.02, inner));
  lbox(0.84, 0.12, 0.16, MAT.steelLite, 0, INNER_H - 0.1, -0.02, inner);
  [-1, 1].forEach(s => lcyl(.065, .065, 0.95, MAT.chrome, s*0.28, 0.32 + 0.475, 0.22, mast, 14)); // lift cylinders

  // ---------- carriage + load backrest + forks (animatable) ----------
  const carriage = new THREE.Group(); mast.add(carriage);
  lbox(1.28, 0.62, 0.09, MAT.steel, 0, 0.46, -0.2, carriage);
  for (let i = 0; i < 5; i++) lbox(0.07, 1.05, 0.05, MAT.steel, -0.52 + i*0.26, 1.3, -0.22, carriage); // backrest bars
  lbox(1.28, 0.08, 0.05, MAT.steel, 0, 1.82, -0.22, carriage);
  [-1, 1].forEach(s => {
    lbox(0.21, 0.72, 0.085, MAT.body, s*0.46, 0.45, -0.255, carriage);   // shank (yellow)
    lbox(0.21, 0.075, 1.7, MAT.body, s*0.46, 0.125, -1.14, carriage);    // blade (1.09 m at 1:1)
  });

  // ---------- tilt struts (static, body ↔ mast) ----------
  const UP = new THREE.Vector3(0, 1, 0);
  [-1, 1].forEach(s => {
    const p1 = new THREE.Vector3(s*0.9, 0.95, -0.85);          // body anchor (lift-local)
    const p2 = new THREE.Vector3(s*0.66, 0.25 + 1.45, -1.95 + 0.1); // mast anchor (lift-local)
    const dir = new THREE.Vector3().subVectors(p2, p1); const len = dir.length();
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, len, 12), MAT.chrome);
    strut.position.copy(p1).addScaledVector(dir, 0.5);
    strut.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    strut.castShadow = true; lift.add(strut);
  });

  // tag every body-coloured mesh so the colour picker recolours them together
  lift.traverse(o => { if (o.isMesh && o.material === MAT.body) o.userData.colorable = true; });

  g.userData.parts = { forkAss: carriage };
  return g;
}

// ---- アルミコイル共通 (United Aluminum の製造範囲: 内径 406/508/610mm・外径 最大1981mm・幅 6〜940mm。内径は標準の 508mm) ----
// 端面は板の巻き目 (細かい同心円) をテクスチャで描き, 外周に巻き終わりの端と留めテープ。axis = コイル軸の向き ('x' | 'y' | 'z')
let _coilFaceTex = null;
function coilFaceTexture() {
  if (_coilFaceTex) return _coilFaceTex;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c4c8cd'; ctx.fillRect(0, 0, 512, 512);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let r = 2; r < 256; r += 1.4) {
    const light = rnd() < 0.5;
    ctx.strokeStyle = light ? `rgba(240,242,246,${0.12 + rnd() * 0.2})` : `rgba(70,74,80,${0.08 + rnd() * 0.2})`;
    ctx.lineWidth = 0.7 + rnd() * 0.6; ctx.beginPath(); ctx.arc(256, 256, r, 0, Math.PI * 2); ctx.stroke();
  }
  _coilFaceTex = new THREE.CanvasTexture(c); _coilFaceTex.colorSpace = THREE.SRGBColorSpace; _coilFaceTex.anisotropy = 4;
  return _coilFaceTex;
}
function alumCoil(g, { R, r = 0.254, L, axis = 'z', at = [0, 0, 0], color = '#c8c8cc', colorable = true, tape = true }) {
  const cg = new THREE.Group(); cg.position.set(at[0], at[1], at[2]);
  if (axis === 'z') cg.rotation.x = Math.PI / 2; else if (axis === 'x') cg.rotation.z = -Math.PI / 2;   // ローカル Y = コイル軸
  const alum = mat(color, 0.26, 0.85, { env: 0.95 }); alum.side = THREE.DoubleSide;
  const face = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), map: coilFaceTexture(), roughness: 0.34, metalness: 0.75, side: THREE.DoubleSide }); face.envMapIntensity = 0.8;
  const inner = mat(shade(color, 0.8), 0.35, 0.8, { env: 0.7 }); inner.side = THREE.DoubleSide;
  const od = new THREE.Mesh(new THREE.CylinderGeometry(R, R, L, 64, 1, true), alum); od.castShadow = od.receiveShadow = true; if (colorable) od.userData.colorable = true; cg.add(od);
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 40, 1, true), inner); cg.add(bore);
  [-1, 1].forEach(s => { const f = new THREE.Mesh(new THREE.RingGeometry(r, R, 64, 1), face); f.rotation.x = -s * Math.PI / 2; f.position.y = s * L / 2; f.receiveShadow = true; if (colorable) f.userData.colorable = true; cg.add(f); });
  if (tape) {                                                             // 巻き終わりの端 + 留めテープ 2 か所
    const a = -0.9, tail = plainBox(0.0025, L, 0.05, mat(shade(color, 0.9), 0.3, 0.8), Math.cos(a) * (R + 0.001), 0, Math.sin(a) * (R + 0.001)); tail.rotation.y = -a; cg.add(tail);
    [-0.3, 0.3].forEach(k => { const tp = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.0015, R + 0.0015, 0.05, 24, 1, true, Math.PI / 2 - a - 0.14, 0.28), mat('#2f6fc0', 0.6)); tp.material.side = THREE.DoubleSide; tp.position.y = k * L; cg.add(tp); });
  }
  g.add(cg); return cg;
}
// スチールバンド (帯鋼 幅32mm): 外周を一周する輪 (axis まわり) と, 内径を通して外周へ回す放射状のバンド
function coilBandRing(cg, R, y, bandM) { const b = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.032, 64, 1, true), bandM); b.position.y = y; cg.add(b); const seal = plainBox(0.006, 0.036, 0.05, bandM, R + 0.004, y, 0); cg.add(seal); }
function coilBandRadial(cg, R, r, L, ang, bandM) {
  const hold = new THREE.Group(); hold.rotation.y = ang; cg.add(hold);
  hold.add(plainBox(0.032, L + 0.004, 0.0025, bandM, 0, 0, R + 0.0015));        // 外周 (軸方向)
  hold.add(plainBox(0.032, L + 0.004, 0.0025, bandM, 0, 0, r - 0.0015));        // 内径 (軸方向)
  [-1, 1].forEach(s => hold.add(plainBox(0.032, 0.0025, R - r + 0.003, bandM, 0, s * (L / 2 + 0.0015), (R + r) / 2)));   // 端面 (半径方向)
}
// アルミコイル (内径508×外径800×幅800mm, A1100 で約650kg): ミル仕上げの板を巻いたコイルを, 軸を水平 (Z) にして床に置いた状態
function buildAluminumCoil({ color='#c8c8cc', w=0.8, d=0.8, h=0.8 } = {}) {
  const g = new THREE.Group();
  const R = Math.min(w, h) / 2;
  const cg = alumCoil(g, { R, L: d, axis: 'z', at: [0, R, 0], color });
  cg.add(plainBox(0.09, 0.06, 0.002, mat('#f6f4ee', 0.8), 0.12, 0.2, -(R + 0.002)));   // 識別ラベル (外周の上側。ローカル -Z = 上)
  return g;
}

// 島津 オートグラフ AGX-V2 50kN 床置形 (W975×D579×H1708, 410kg): チャコールの基台と上部ヨーク, 白いコラムカバー2本,
// 移動クロスヘッド + ロードセル + ウェッジ形つかみ具 + 試験片, 右コラムにスマートコントローラ。操作PCは別。
function buildTensileTestMachine({ color='#ecebe8', w=0.975, d=0.579, h=1.708 } = {}) {
  const g = new THREE.Group();
  const charc = mat('#2d3136', 0.45, 0.25, { env: 0.5 }), cover = mat(color, 0.4, 0.08, { env: 0.5 }), steel = mat('#b6bec6', 0.25, 0.8, { env: 0.9 }), dark = mat('#17191c', 0.5, 0.3);
  const baseH = 0.42, yokeH = 0.16, colW = 0.15, colD = 0.24, cx = w / 2 - colW / 2;
  // 基台 (前面に白い化粧パネル + 状態表示ライン)
  g.add(box(w, baseH, d, charc, 0, baseH / 2, 0));
  g.add(box(w - 0.08, baseH - 0.1, 0.01, cover, 0, baseH / 2, d / 2 + 0.002));
  const lamp = new THREE.MeshStandardMaterial({ color: 0x5fd07a, emissive: new THREE.Color('#2fae55'), emissiveIntensity: 0.7 });
  g.add(plainBox(w - 0.2, 0.01, 0.004, lamp, 0, baseH - 0.03, d / 2 + 0.008));
  [-1, 1].forEach(s => [-1, 1].forEach(t => g.add(cylAt(0.03, 0.035, 0.02, 12, dark, s * (w / 2 - 0.06), 0.01, t * (d / 2 - 0.06)))));
  // テーブル (試験空間の床) + 下つかみ具
  g.add(box(w - 2 * colW - 0.02, 0.05, colD, steel, 0, baseH + 0.025, 0));
  // コラム (白カバー) 2 本
  const colH = h - baseH - yokeH;
  [-1, 1].forEach(s => { const c = box(colW, colH, colD, cover, s * cx, baseH + colH / 2, 0); c.userData.colorable = true; g.add(c); g.add(plainBox(0.006, colH - 0.1, 0.004, lamp, s * (cx - colW / 2 + 0.02), baseH + colH / 2, colD / 2 + 0.002)); });
  // 上部ヨーク (チャコール) + ロゴ板
  g.add(box(w, yokeH, colD + 0.02, charc, 0, h - yokeH / 2, 0));
  g.add(plainBox(0.24, 0.04, 0.004, mat('#d8dde2', 0.4, 0.3), 0, h - yokeH / 2, colD / 2 + 0.012));
  // 移動クロスヘッド + ロードセル + 上つかみ具
  const chY = baseH + colH * 0.62;
  g.add(box(w - 2 * colW, 0.1, colD - 0.03, steel, 0, chY, 0));
  g.add(cylAt(0.045, 0.045, 0.08, 20, mat('#8a929a', 0.3, 0.7), 0, chY - 0.09, 0));
  const grip = (y, up) => { g.add(box(0.1, 0.13, 0.09, dark, 0, y, 0)); g.add(box(0.03, 0.06, 0.1, steel, 0.06, y + (up ? -0.02 : 0.02), 0)); };
  grip(chY - 0.2, true);
  grip(baseH + 0.12, false);
  g.add(box(0.012, 0.18, 0.004, mat('#c8c8b8', 0.5, 0.4), 0, (chY - 0.2 + baseH + 0.12) / 2, 0));   // 試験片 (ダンベル形の平板)
  // スマートコントローラ (右コラム前面)
  g.add(box(0.1, 0.16, 0.04, dark, cx, baseH + 0.62, colD / 2 + 0.02));
  g.add(plainBox(0.07, 0.05, 0.004, mat('#0d2a3a', 0.3, 0.1), cx, baseH + 0.67, colD / 2 + 0.042));
  return g;
}

// TRUSCO スクラップボックス“ミニカーゴ” 鉄板張型 600×600×H600 (VJ-603, 22kg, 均等荷重300kg): 山形鋼の枠に鉄板を張った上開きの箱
// (メラミン焼付塗装)。四隅の脚で底を約10cm 浮かせ, 脚の間にハンドリフターを差し込む。柱の上端に段積み用の受け。
// 中身はアルミの切粉 (カールした切りくず) の山
function buildScrapBucket({ color='#4a4f54', w=0.6, d=0.6, h=0.6 } = {}) {
  const g = new THREE.Group();
  const paint = mat(color, 0.5, 0.3, { env: 0.45 }), frameM = mat(shade(color, 0.82), 0.45, 0.35, { env: 0.5 });
  const legH = 0.1, a = 0.04, t = 0.004, top = h - 0.03;
  const tag = (m) => { m.userData.colorable = true; return m; };
  // 柱 (山形鋼 40×40: 2 枚の板で L 字) — 床から段積み受けの下まで
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
    const x = sx * (w / 2 - t / 2), z = sz * (d / 2 - t / 2);
    g.add(tag(plainBox(t, top, a, frameM, x, top / 2, z - sz * (a / 2 - t / 2))));
    g.add(tag(plainBox(a, top, t, frameM, x - sx * (a / 2 - t / 2), top / 2, z)));
    g.add(plainBox(0.034, h - top, 0.034, frameM, sx * (w / 2 - 0.019), top + (h - top) / 2, sz * (d / 2 - 0.019)));   // 段積み受け
    g.add(plainBox(0.05, 0.004, 0.05, frameM, sx * (w / 2 - 0.025), 0.002, sz * (d / 2 - 0.025)));                   // 脚の座板
  });
  // 底枠 + 底板 (脚の間を空ける)
  [-1, 1].forEach(s => { g.add(tag(plainBox(w - 2 * t, 0.03, t, frameM, 0, legH + 0.015, s * (d / 2 - t / 2)))); g.add(tag(plainBox(t, 0.03, d - 2 * t, frameM, s * (w / 2 - t / 2), legH + 0.015, 0))); });
  g.add(tag(plainBox(w - 2 * t, 0.003, d - 2 * t, paint, 0, legH + 0.0015, 0)));
  // 側面の鉄板 (4 面) + 中段の補強ビード + 上枠
  const wallH = top - legH;
  [-1, 1].forEach(s => {
    g.add(tag(plainBox(w - 2 * a + 0.004, wallH, 0.0016, paint, 0, legH + wallH / 2, s * (d / 2 - 0.002))));
    g.add(tag(plainBox(0.0016, wallH, d - 2 * a + 0.004, paint, s * (w / 2 - 0.002), legH + wallH / 2, 0)));
    g.add(tag(plainBox(w - 2 * a, 0.012, 0.006, paint, 0, legH + wallH * 0.5, s * (d / 2 - 0.001))));
    g.add(tag(plainBox(0.006, 0.012, d - 2 * a, paint, s * (w / 2 - 0.001), legH + wallH * 0.5, 0)));
    g.add(tag(plainBox(w, 0.03, t, frameM, 0, top - 0.015, s * (d / 2 - t / 2))));
    g.add(tag(plainBox(t, 0.03, d, frameM, s * (w / 2 - t / 2), top - 0.015, 0)));
  });
  g.add(plainBox(0.12, 0.06, 0.002, mat('#f2efe6', 0.8), 0, legH + wallH * 0.72, d / 2 + 0.001));   // 表示ラベル
  // 中身: 切粉の山 (土台の山 + カールした切りくずを 1 メッシュに)
  const heapTop = top - 0.02, inW = w - 0.02, inD = d - 0.02;
  const heap = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat('#a9aeb3', 0.55, 0.6, { env: 0.6 }));
  heap.scale.set(inW / 2, 0.09, inD / 2); heap.position.y = heapTop - 0.09; g.add(heap);
  g.add(plainBox(inW, heapTop - 0.09 - legH, inD, mat('#8f949a', 0.6, 0.5), 0, legH + (heapTop - 0.09 - legH) / 2, 0));
  const pos = []; let sd = 11; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 90; i++) {
    const cx = (rnd() - 0.5) * inW * 0.85, cz = (rnd() - 0.5) * inD * 0.85, rr = Math.hypot(cx / (inW / 2), cz / (inD / 2));
    const cy = heapTop - 0.09 + 0.09 * Math.sqrt(Math.max(0, 1 - rr * rr)) + 0.004;
    const u = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5], ul = Math.hypot(...u) || 1; u.forEach((v, k) => u[k] = v / ul);
    const tmp = Math.abs(u[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let v = [u[1] * tmp[2] - u[2] * tmp[1], u[2] * tmp[0] - u[0] * tmp[2], u[0] * tmp[1] - u[1] * tmp[0]]; const vl = Math.hypot(...v); v = v.map(x => x / vl);
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const rad = 0.007 + rnd() * 0.008, wid = 0.004, turns = 1 + rnd() * 1.5, pitch = 0.006, seg = 18;
    const P = (th, s) => [0, 1, 2].map(k => [cx, cy, cz][k] + rad * (Math.cos(th) * u[k] + Math.sin(th) * v[k]) + (s * wid + th / (Math.PI * 2) * pitch) * n[k]);
    for (let j = 0; j < seg; j++) {
      const t0 = j / seg * turns * Math.PI * 2, t1 = (j + 1) / seg * turns * Math.PI * 2;
      const A = P(t0, -0.5), B = P(t0, 0.5), C = P(t1, 0.5), D = P(t1, -0.5);
      pos.push(...A, ...B, ...C, ...A, ...C, ...D);
    }
  }
  const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.computeVertexNormals();
  const chipM = mat('#d7dbe0', 0.25, 0.9, { env: 1.0 }); chipM.side = THREE.DoubleSide;
  const chips = new THREE.Mesh(cg, chipM); chips.castShadow = true; g.add(chips);
  return g;
}

// ITC スチールパレット 片面四方差し 亜鉛メッキ (1100×1100×150, 静荷重1t): リブ付きのプレス鋼板デッキ + 補強チャンネル + 9 本の脚。
// 差込口: 間口側 W408×H127 / 奥行側 W407×H109 (チャンネルのぶん低い)
function buildSteelPallet({ color='#c3c9cd', w=1.1, d=1.1, h=0.15 } = {}) {
  const g = new THREE.Group();
  const zinc = mat(color, 0.35, 0.8, { env: 0.8 }), zincD = mat(shade(color, 0.85), 0.4, 0.75);
  const deckT = 0.004, leg = 0.095;
  const deck = plainBox(w, deckT, d, zinc, 0, h - deckT / 2, 0); deck.userData.colorable = true; g.add(deck);
  for (let i = -4; i <= 4; i++) { g.add(plainBox(w - 0.02, 0.006, 0.02, zinc, 0, h - deckT - 0.003, i * 0.12)); }                // デッキ裏のリブ
  [-(d / 2 - leg / 2), 0, d / 2 - leg / 2].forEach(z => g.add(plainBox(w, 0.018, leg, zincD, 0, h - deckT - 0.009, z)));       // 補強チャンネル (X方向)
  const xs = [-(w / 2 - leg / 2), 0, w / 2 - leg / 2], zs = [-(d / 2 - leg / 2), 0, d / 2 - leg / 2];
  xs.forEach(x => zs.forEach(z => { const lg = plainBox(leg, h - deckT - 0.018, leg, zinc, x, (h - deckT - 0.018) / 2, z); lg.userData.colorable = true; g.add(lg); }));
  g.add(plainBox(w, 0.006, 0.03, zincD, 0, h - 0.003, d / 2 - 0.015)); g.add(plainBox(w, 0.006, 0.03, zincD, 0, h - 0.003, -d / 2 + 0.015));   // 縁の折り返し
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildResinPallet({ color='#1a3f7a', w=1.1, d=1.1, h=0.15 } = {}) {
  const g = new THREE.Group();
  const m  = mat(color, 0.85, 0.0);
  const m2 = mat(shade(color, 0.88), 0.85, 0.0);
  // top surface
  const top = box(w, 0.025, d, m, 0, h - 0.0125, 0); top.userData.colorable = true; g.add(top);
  // 3×3 block feet (proportional to width/depth)
  for (let ix = -1; ix <= 1; ix++) {
    for (let iz = -1; iz <= 1; iz++) {
      g.add(box(0.13, h - 0.025, 0.13, m2, ix * (w/2 - 0.11), (h - 0.025) / 2, iz * (d/2 - 0.11)));
    }
  }
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// JPR 木製11型パレット (JIS T11: 1100×1100×144, 両面使用・2方差し, 積載1t): 上面デッキボード + 3 本の桁 + 下面デッキボード
function buildWoodPallet({ color='#c9a26a', w=1.1, d=1.1, h=0.144 } = {}) {
  const g = new THREE.Group();
  const wt = woodTex.clone(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(1.2, 0.3); wt.needsUpdate = true;
  const woodM = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.82, metalness: 0.0, map: wt });
  const woodD = new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(color, 0.84)), roughness: 0.85, metalness: 0.0, map: wt });
  const t = 0.022, sh = h - 2 * t, sw = 0.075;
  // 桁 (けた) 3 本 — Z 方向 (フォークは ±Z から差し込む)
  [-(w / 2 - sw / 2), 0, w / 2 - sw / 2].forEach(x => g.add(plainBox(sw, sh, d, woodD, x, t + sh / 2, 0)));
  // 上面デッキボード 9 枚 (両端は幅広)
  const nTop = 9, bwE = 0.13, bw = 0.1, gap = (d - 2 * bwE - (nTop - 2) * bw) / (nTop - 1);
  let z = -d / 2;
  for (let i = 0; i < nTop; i++) { const ww = (i === 0 || i === nTop - 1) ? bwE : bw; const b = plainBox(w, t, ww, woodM, 0, h - t / 2, z + ww / 2); b.userData.colorable = true; g.add(b); z += ww + gap; }
  // 下面デッキボード 5 枚
  [-(d / 2 - bwE / 2), -0.24, 0, 0.24, d / 2 - bwE / 2].forEach(zz => { const b = plainBox(w, t, Math.abs(zz) > 0.4 ? bwE : bw, woodM, 0, t / 2, zz); b.userData.colorable = true; g.add(b); });
  // 釘頭
  const nail = mat('#6a6a6a', 0.4, 0.7);
  [-(w / 2 - sw / 2), 0, w / 2 - sw / 2].forEach(x => [-0.49, 0.49].forEach(zz => g.add(cylAt(0.004, 0.004, 0.002, 6, nail, x, h + 0.001, zz))));
  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return g;
}

// JFE 鋼製ドラム缶 クローズタイプ 200L KD-200ST (φ580×H890, 21.5kg, JIS): 胴 + 天地の巻締め(チャイム) + 2 本の輪帯 + 天板の大栓/小栓
function buildDrum({ color='#1a4a9a', w=0.58, d=0.58, h=0.89 } = {}) {
  const g = new THREE.Group();
  const R = Math.min(w, d) / 2, rb = R - 0.004;
  const bodyM = mat(color, 0.4, 0.35), rimM = mat(shade(color, 0.85), 0.45, 0.45), capM = mat('#b8bcc0', 0.35, 0.75);
  const body = cylAt(rb, rb, h - 0.03, 40, bodyM, 0, h / 2, 0); body.userData.colorable = true; g.add(body);
  [0.012, h - 0.012].forEach(y => { const ch = new THREE.Mesh(new THREE.TorusGeometry(R - 0.006, 0.008, 8, 48), rimM); ch.rotation.x = Math.PI / 2; ch.position.y = y; g.add(ch); });
  const top = cylAt(rb - 0.008, rb - 0.008, 0.004, 40, bodyM, 0, h - 0.018, 0); top.userData.colorable = true; g.add(top);
  // 輪帯 (転がし用のビード) 2 本: 高さの約1/3と2/3
  [h * 0.345, h * 0.655].forEach(y => { const hoop = new THREE.Mesh(new THREE.TorusGeometry(rb, 0.006, 8, 48), rimM); hoop.rotation.x = Math.PI / 2; hoop.position.y = y; g.add(hoop); });
  // 天板の栓: 大栓 (2B) と 小栓 (3/4B)
  g.add(cylAt(0.032, 0.032, 0.012, 20, capM, R * 0.6, h - 0.012, 0));
  g.add(cylAt(0.016, 0.016, 0.012, 16, capM, -R * 0.64, h - 0.012, 0.02));
  return g;
}

// キトー ピラー形ジブクレーンパッケージ JP7L形 (定格0.25t, 全高3.5m, アーム3m, 有効高さ約2.86m) + 電気チェーンブロック EQSP形:
// ベースプレート(アンカー・リブ) + 鋼管ピラー + 旋回部 + I形鋼ジブ(方杖付き) + トロリ + チェーンブロック + 押しボタン。
// ピラーはフットプリントの -X 寄り, ジブは +X へ伸びる (w = ベース端〜アーム先端)。
function buildJibCrane({ color='#f5c020', w=3.3, d=0.6, h=3.5 } = {}) {
  const g = new THREE.Group();
  const paint = mat(color, 0.45, 0.15), dark = mat('#1e2226', 0.6, 0.3), steel = mat('#9aa2aa', 0.3, 0.7), bolt = mat('#c0c6cc', 0.3, 0.8);
  const orange = mat('#e87a1a', 0.45, 0.15), chainM = mat('#5b6168', 0.35, 0.75);
  const px = -w / 2 + d / 2, pr = 0.1335, armL = w - d / 2, beamTop = h - 0.01, bh = 0.2, bw = 0.1;
  // ベースプレート + リブ + アンカー
  g.add(box(d, 0.03, d, dark, px, 0.015, 0));
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; const rib = box(0.012, 0.16, 0.14, paint, px + Math.cos(a) * (pr + 0.07), 0.11, Math.sin(a) * (pr + 0.07)); rib.rotation.y = -a; g.add(rib); }
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; g.add(cylAt(0.014, 0.014, 0.05, 8, bolt, px + Math.cos(a) * (d / 2 - 0.05), 0.045, Math.sin(a) * (d / 2 - 0.05))); }
  // ピラー (鋼管 φ267) + 旋回部
  const pTop = beamTop - bh - 0.12;
  const pillar = cylAt(pr, pr, pTop - 0.03, 24, paint, px, (pTop + 0.03) / 2, 0); pillar.userData.colorable = true; g.add(pillar);
  g.add(cylAt(pr + 0.03, pr + 0.03, 0.12, 24, dark, px, beamTop - bh - 0.06, 0));
  g.add(cylAt(pr * 0.8, pr * 0.8, bh + 0.04, 20, paint, px, beamTop - bh / 2, 0));
  // I形鋼ジブ (上下フランジ + ウェブ)
  const ax = px + (armL - 0.05) / 2;
  [beamTop - 0.006, beamTop - bh + 0.006].forEach(y => { const f = box(armL + 0.05, 0.012, bw, paint, ax, y, 0); f.userData.colorable = true; g.add(f); });
  const web = box(armL + 0.05, bh - 0.024, 0.008, paint, ax, beamTop - bh / 2, 0); web.userData.colorable = true; g.add(web);
  g.add(box(0.012, bh, bw, paint, px + armL - 0.006, beamTop - bh / 2, 0));                             // 端部ストッパー
  // 方杖 (ピラー → ジブ下面)
  g.add(_bar([px + pr, beamTop - bh - 0.75, 0], [px + 0.95, beamTop - bh - 0.005, 0], 0.07, paint));
  // トロリ (下フランジ走行) + 電気チェーンブロック EQSP
  const tx = px + armL * 0.68, ty = beamTop - bh;
  g.add(box(0.2, 0.05, 0.16, dark, tx, ty - 0.03, 0));
  [-1, 1].forEach(s => [-1, 1].forEach(t => g.add(cylAt(0.028, 0.028, 0.02, 12, steel, tx + s * 0.07, ty + 0.01, t * 0.06).rotateX(Math.PI / 2))));
  const hb = new THREE.Group(); hb.position.set(tx, ty - 0.2, 0); g.add(hb);
  hb.add(box(0.28, 0.2, 0.2, orange, 0, 0, 0));                                                        // 本体
  hb.add(cylAt(0.075, 0.075, 0.16, 18, dark, -0.17, 0, 0).rotateZ(Math.PI / 2));                       // モーター
  hb.add(box(0.12, 0.14, 0.12, dark, 0.13, -0.08, 0.05));                                               // チェーンバケット
  const hookY = 1.55, chainTop = ty - 0.3;
  g.add(cylAt(0.005, 0.005, chainTop - hookY - 0.1, 6, chainM, tx - 0.03, (chainTop + hookY + 0.1) / 2, 0));
  g.add(box(0.08, 0.1, 0.06, orange, tx - 0.03, hookY + 0.05, 0));                                     // フックブロック
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 8, 14, Math.PI * 1.3), steel); hook.rotation.z = Math.PI * 1.15; hook.position.set(tx - 0.03, hookY - 0.03, 0); g.add(hook);
  // 押しボタンスイッチ (ペンダント)
  g.add(cylAt(0.004, 0.004, chainTop - 1.25, 6, dark, tx + 0.12, (chainTop + 1.25) / 2, 0.05));
  g.add(box(0.07, 0.2, 0.055, mat('#f2c230', 0.5), tx + 0.12, 1.15, 0.05));
  [1.2, 1.12].forEach((y, i) => g.add(cylAt(0.012, 0.012, 0.01, 10, dark, tx + 0.12, y, 0.08).rotateX(Math.PI / 2)));
  return g;
}

// ヤマトプロテック YA-10NX (10型 蓄圧式 ABC, 高さ490×幅180×奥行126mm): 胴径は奥行(約126mm), 幅はホース・ノズル込み
function buildFireExtinguisher({ color='#cc1818', w=0.18, d=0.126, h=0.49 } = {}) {
  const g = new THREE.Group();
  const r      = Math.min(w, d) / 2 * 0.98;
  const redM   = mat(color, 0.48, 0.08);
  const silverM= mat('#b0b8c0', 0.3, 0.65);
  const blackM = mat('#181818', 0.7, 0.1);
  const whiteM = mat('#f0f0f0', 0.85);
  // Stand ring
  g.add(cylAt(r * 1.05, r * 1.15, 0.04, 12, mat('#222', 0.7), 0, 0.02, 0));
  // Body
  g.add(cylAt(r, r * 1.02, h * 0.70, 14, redM, 0, h * 0.35 + 0.04, 0));
  // White label band
  g.add(cylAt(r * 1.01, r * 1.01, h * 0.20, 14, whiteM, 0, h * 0.28 + 0.04, 0));
  // Shoulder taper
  g.add(cylAt(r * 0.46, r, h * 0.08, 12, redM, 0, h * 0.73 + 0.04, 0));
  // Neck
  g.add(cylAt(r * 0.34, r * 0.46, h * 0.05, 10, silverM, 0, h * 0.79 + 0.04, 0));
  // Valve block
  g.add(cylAt(r * 0.28, r * 0.28, h * 0.06, 8, silverM, 0, h * 0.85 + 0.04, 0));
  // Pressure gauge (horizontal disk)
  const gauge = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.14, r * 0.14, 0.04, 8), silverM);
  gauge.rotation.z = Math.PI/2; gauge.position.set(r * 0.24, h * 0.82 + 0.04, 0); g.add(gauge);
  // Handle bar
  g.add(box(r * 1.2, 0.024, 0.024, silverM, 0, h * 0.91 + 0.04, 0));
  // Safety pin
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, r * 0.7, 4), mat('#f0a020', 0.5));
  pin.rotation.z = Math.PI/2; pin.position.set(0, h * 0.93 + 0.04, r * 0.15); g.add(pin);
  // Hose draped from the valve block down the side to the nozzle (connected chain)
  const hosePts = [], hN = 7;
  for (let i = 0; i < hN; i++) {
    const t = i / (hN - 1);
    const hx = -r * 0.28 - (r * 0.74 + 0.018) * Math.pow(t, 0.7);
    const hy = (h * 0.84 - (h * 0.84 - h * 0.39) * t) + 0.04;
    hosePts.push({ x: hx, y: hy });
  }
  for (let i = 0; i < hN - 1; i++) {
    const a = hosePts[i], b = hosePts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len * 1.05, 6), blackM);
    s.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
    s.rotation.z = Math.atan2(dy, dx) - Math.PI / 2; g.add(s);
  }
  // Nozzle (胴の側面に縦向きで掛ける)
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.013, 0.1, 10), blackM);
  nz.position.set(-(r + 0.018), h * 0.33, 0.012); g.add(nz);
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// バンド掛けアルミコイル (内径508×外径792×幅800mm, 約630kg): 外周に帯鋼 (幅32mm) を 3 本 (シールで留める) + 内径を通す放射状のバンド 2 本
function buildBandedAlumCoil({ color='#c8c8cc', w=0.8, d=0.8, h=0.8 } = {}) {
  const g = new THREE.Group();
  const bandT = 0.004, R = Math.min(w, h) / 2 - bandT, r = 0.254;
  const cg = alumCoil(g, { R, r, L: d - 0.004, axis: 'z', at: [0, R + bandT, 0], color, tape: false });
  const bandM = mat('#3e434a', 0.4, 0.6, { env: 0.6 }); bandM.side = THREE.DoubleSide;
  [-0.3, 0, 0.3].forEach(k => coilBandRing(cg, R + 0.002, k * d, bandM));
  [0.5, 0.5 + Math.PI].forEach(a => coilBandRadial(cg, R, r, d - 0.004, a, bandM));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// 梱包済みアルミコイル (内径508×外径740×幅800mm, 約490kg): 防錆紙 (VCI) で外周と端面を包み, 端の角に紙製のエッジプロテクター,
// 外周バンド 2 本 + 内径を通すバンド 2 本。木製の枕木 (スキッド) 2 本に載せた出荷形態 (外形は包装・スキッドを含む)
function buildPackagedAlumCoil({ color='#b4a478', w=0.82, d=0.84, h=0.82 } = {}) {
  const g = new THREE.Group();
  const R = 0.37, r = 0.254, L = 0.8, pk = 0.012, Rp = R + pk, cy = h - Rp - 0.004;
  const paper = mat(color, 0.92, 0), edgeM = mat('#8a7a5a', 0.85), woodM = mat('#b88a58', 0.85), bandM = mat('#3e434a', 0.4, 0.6, { env: 0.6 }); paper.side = bandM.side = THREE.DoubleSide;
  const cg = new THREE.Group(); cg.position.set(0, cy, 0); cg.rotation.x = Math.PI / 2; g.add(cg);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(Rp, Rp, L + 2 * pk, 56, 1, true), paper); wrap.castShadow = wrap.receiveShadow = true; wrap.userData.colorable = true; cg.add(wrap);
  cg.add(new THREE.Mesh(new THREE.CylinderGeometry(r - 0.004, r - 0.004, L + 2 * pk, 36, 1, true), paper));
  [-1, 1].forEach(s => {
    const f = new THREE.Mesh(new THREE.RingGeometry(r - 0.004, Rp, 56, 1), paper); f.rotation.x = -s * Math.PI / 2; f.position.y = s * (L / 2 + pk); f.userData.colorable = true; cg.add(f);
    const e = new THREE.Mesh(new THREE.TorusGeometry(Rp - 0.01, 0.016, 4, 56), edgeM); e.rotation.x = Math.PI / 2; e.position.y = s * (L / 2 + pk - 0.008); cg.add(e);   // エッジプロテクター
    const ei = new THREE.Mesh(new THREE.TorusGeometry(r + 0.006, 0.012, 4, 36), edgeM); ei.rotation.x = Math.PI / 2; ei.position.y = s * (L / 2 + pk - 0.006); cg.add(ei);
  });
  [-0.25, 0.25].forEach(k => coilBandRing(cg, Rp + 0.003, k * L, bandM));
  [0.35, 0.35 + Math.PI].forEach(a => coilBandRadial(cg, Rp + 0.001, r - 0.004, L + 2 * pk, a, bandM));
  const lbl = plainBox(0.16, 0.1, 0.004, mat('#f8f4e8', 0.88), 0, cy + (Rp + r) / 2, -(L / 2 + pk + 0.003)); g.add(lbl);   // 出荷ラベル (端面の上側)
  // 枕木 2 本 (コイルの下を軸方向に)
  const x0 = 0.2, top = cy - Math.sqrt(Rp * Rp - x0 * x0);
  [-1, 1].forEach(s => g.add(plainBox(0.09, top, d, woodM, s * x0, top / 2, 0)));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// 輸出梱包アルミコイル (タカムラ産業 2006: コイル 径650〜1080・幅170〜260mm・1巻160〜230kg を 3〜4 巻, 梱包外寸 1100×1100×710〜1220mm):
// アイトゥスカイ (軸を鉛直) に 3 巻 (外径800・幅250mm, 1巻約200kg) を重ね, 上下を木製パレットで挟み, 外周をハードボードで巻いて
// 帯鋼で締めた梱包。上のパレットは板の隙間からコイルの上面が見える
function buildExportAlumCoil({ color='#c0a870', w=1.1, d=1.1, h=1.0 } = {}) {
  const g = new THREE.Group();
  const woodM = mat(color, 0.85, 0), woodD = mat(shade(color, 0.78), 0.9, 0), hb = mat('#7a5a3c', 0.8, 0), bandM = mat('#3e434a', 0.4, 0.6, { env: 0.6 });
  hb.side = THREE.DoubleSide;
  const pb = 0.12, pt = 0.1, R = 0.4, cw = 0.25, sep = 0.005;
  // 下パレット: デッキボード 7 枚 + 桁 3 本 + 下板
  const deck = (y, n, bw, M) => { for (let i = 0; i < n; i++) g.add(plainBox(bw, 0.02, d, M, -w / 2 + bw / 2 + i * (w - bw) / (n - 1), y, 0)); };
  deck(pb - 0.01, 7, 0.1, woodM);
  [-1, 0, 1].forEach(k => g.add(plainBox(w, pb - 0.04, 0.09, woodD, 0, 0.02 + (pb - 0.04) / 2, k * (d / 2 - 0.045))));
  deck(0.01, 3, 0.1, woodM);
  // コイル 3 巻 (アイトゥスカイ) + 間の当て板
  let y = pb;
  for (let i = 0; i < 3; i++) {
    y += sep; alumCoil(g, { R, L: cw, axis: 'y', at: [0, y + cw / 2, 0], color: '#c8c8cc', colorable: false, tape: i === 2 }); y += cw;
    g.add(new THREE.Mesh(new THREE.RingGeometry(0.254, R, 48, 1), hb).rotateX(-Math.PI / 2).translateZ(y + sep / 2));
  }
  y += sep;
  // ハードボード巻き (コイルの外周)
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.008, R + 0.008, y - pb, 56, 1, true), hb); wrap.position.y = (pb + y) / 2; wrap.castShadow = wrap.receiveShadow = true; g.add(wrap);
  g.add(plainBox(0.22, 0.15, 0.004, mat('#f4f0e2', 0.88), 0, (pb + y) / 2, R + 0.012));   // 荷札
  // 上パレット (デッキを下向き): 板 5 枚 + 桁 3 本。隙間から中が見える
  const yt = h - pt;
  for (let i = 0; i < 5; i++) { const b = plainBox(0.12, 0.02, d, woodM, -w / 2 + 0.06 + i * (w - 0.12) / 4, yt + 0.01, 0); b.userData.colorable = true; g.add(b); }
  [-1, 0, 1].forEach(k => { const b = plainBox(w, pt - 0.02, 0.09, woodD, 0, yt + 0.02 + (pt - 0.02) / 2, k * (d / 2 - 0.045)); b.userData.colorable = true; g.add(b); });
  // 帯鋼: 前後方向・左右方向に 2 本ずつ, パレットごと縦に締める
  [-0.28, 0.28].forEach(k => {
    g.add(plainBox(0.032, h + 0.004, 0.003, bandM, k * w, h / 2, d / 2 + 0.002)); g.add(plainBox(0.032, h + 0.004, 0.003, bandM, k * w, h / 2, -d / 2 - 0.002));
    g.add(plainBox(0.003, h + 0.004, 0.032, bandM, w / 2 + 0.002, h / 2, k * d)); g.add(plainBox(0.003, h + 0.004, 0.032, bandM, -w / 2 - 0.002, h / 2, k * d));
    g.add(plainBox(0.032, 0.003, d, bandM, k * w, h + 0.001, 0)); g.add(plainBox(w, 0.003, 0.032, bandM, 0, h + 0.001, k * d));
  });
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// 横倒しアルミコイル (内径508×外径750×幅900mm, 約580kg): 軸を左右 (X) に向けて木製の枕木 2 本に載せ, 両側を楔形の輪止めで止め,
// 外周にバンド 2 本。外形は枕木・輪止めを含む
function buildAlumCoilSide({ color='#c8c8cc', w=0.9, d=0.8, h=0.8 } = {}) {
  const g = new THREE.Group();
  const lift = 0.05, R = h / 2 - lift / 2, cy = lift + R, L = w;
  const cg = alumCoil(g, { R, L, axis: 'x', at: [0, cy, 0], color });
  const bandM = mat('#3e434a', 0.4, 0.6, { env: 0.6 }); bandM.side = THREE.DoubleSide;
  [-0.3, 0.3].forEach(k => coilBandRing(cg, R + 0.002, k * L, bandM));
  const woodM = mat('#a87a4a', 0.85);
  [-0.3, 0.3].forEach(k => {
    g.add(plainBox(0.1, lift, d, woodM, k * L, lift / 2, 0));                               // 枕木 (前後方向)
    [-1, 1].forEach(s => {                                                                   // 楔形の輪止め (コイルに当たる面が斜め)
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(0.13, 0); sh.lineTo(0, 0.11); sh.closePath();
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.09, bevelEnabled: false }); geo.translate(0, 0, -0.045);
      const wd = new THREE.Mesh(geo, woodM); wd.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; wd.position.set(k * L, lift, s * (d / 2 - 0.13)); g.add(wd);
    });
  });
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// 作業員 — 高品質な人物ベース(buildPerson)に作業着装備を載せる。身長は成人男性(30代)の平均171.5cm。
// 白ヘルメット+顎紐 / 開襟ジャケット(胸ポケット・ファスナー) / カーゴ作業ズボン(上下同色) / 白軍手 / 安全靴。
// color はカラーピッカー対応(作業着の上下が連動して色替え)。既定はライトブルーグレー。
function buildWorker({ color, w=0.5, d=0.5, h=1.715 } = {}) {
  return buildPerson({
    h, adult: true, style: 'short',
    skin: '#e7b48a', hair: '#1b1410', eye: '#3a2c22',
    color: color || '#aebccc',        // 作業着(上下colorable)
    bottom: '#aebccc',
    helmet: '#f1f3f6', jacket: true, cargo: true, gloves: '#fbfaf6', boots: true, suit: true
  });
}


// 2点を結ぶ角材/丸棒 (筋かい・方杖・チェーン等)。a/b = [x,y,z]
function _bar(a, b, t, material, round = false) {
  const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], len = Math.hypot(dx, dy, dz);
  const m = round ? new THREE.Mesh(new THREE.CylinderGeometry(t / 2, t / 2, len, 8), material) : new THREE.Mesh(new THREE.BoxGeometry(t, len, t), material);
  m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, dy, dz).normalize());
  m.castShadow = true; m.receiveShadow = true; return m;
}

export { buildAlumCoilSide, buildAluminumCoil, buildBandedAlumCoil, buildCNCMachine, buildCNCMachiningCenter, buildControlPanel, buildConveyor, buildDrum, buildExportAlumCoil, buildFireExtinguisher, buildForklift, buildIndustrialFurnace, buildIndustrialRobot, buildIndustrialRobotLg, buildInjectionMolder, buildJibCrane, buildLargeHydraulicPress, buildPackagedAlumCoil, buildPalletRack, buildResinPallet, buildScrapBucket, buildSteelPallet, buildTensileTestMachine, buildToolCabinet, buildWoodPallet, buildWorkbench, buildWorker };
