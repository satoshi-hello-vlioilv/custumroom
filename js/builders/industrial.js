import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';
import { buildPerson } from './kawaii.js';
import { envBright } from '../core/scene.js';

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
// 黄黒の斜めストライプ (危険表示)。rep = 横方向の繰り返し数
function _hazardMat(rep) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 32;
  const c = cv.getContext('2d');
  c.fillStyle = '#f2c200'; c.fillRect(0, 0, 128, 32);
  c.fillStyle = '#1a1a1a';
  for (let x = -32; x < 160; x += 32) { c.beginPath(); c.moveTo(x, 32); c.lineTo(x + 16, 32); c.lineTo(x + 48, 0); c.lineTo(x + 32, 0); c.closePath(); c.fill(); }
  const t = new THREE.CanvasTexture(cv); t.wrapS = THREE.RepeatWrapping; t.repeat.set(rep, 1); t.anisotropy = 4;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.6 });
}
// 大型油圧プレス: Nantong Yijie Machinery Y32-315 (三梁四柱, 公称力3150kN)。公表外形 左右4200×前後4200×地上高5600mm,
// 開口高さ1250・ストローク800mm。本体 (下梁・スライド・上梁を4本のクロム柱で結ぶ) を中央やや左奥に置き、
// 右奥に油圧ユニット (タンク+モーターポンプ2組+バルブブロック, 上梁へ立ち上がる配管)、左奥に制御盤、右手前に操作盤、
// 前方に金型交換用ムービングボルスタのランアウトレール、上梁の上に主シリンダ・プレフィルタンク・点検用手すり、
// 左側面に昇降はしごを置いて公表外形に収める。作図は 4.2×4.2×5.6m で行い、w/d/h が異なるときは全体を拡縮する。
function buildLargeHydraulicPress({ color='#c2b6a3', w=4.2, d=4.2, h=5.6 } = {}) {
  const g = new THREE.Group();
  const frame  = mat(color, 0.5, 0.15, { env: 0.35 });                 // 本体・油圧タンクの塗装 (色変更対象)
  const frameD = mat(shade(color, 0.82), 0.55, 0.15);                  // リブ・支柱
  const chrome = mat('#d4dae0', 0.1, 0.95, { env: 1.3 });              // 柱・ラム
  const steel  = mat('#8d969e', 0.35, 0.7, { env: 0.8 });              // ボルスタ・レール
  const dieM   = mat('#5d666e', 0.4, 0.65, { env: 0.7 });              // 金型
  const dark   = mat('#23272b', 0.6, 0.3);
  const yellow = mat('#f2c200', 0.5, 0.1);
  const cabM   = mat('#d9dbd7', 0.5, 0.1);                             // 制御盤・操作盤 (ライトグレー)
  const pipeM  = mat('#737d86', 0.35, 0.7, { env: 0.7 });
  const motorM = mat('#44607a', 0.45, 0.35);

  // ---- 本体の基準寸法 ----
  const FX = -0.25, FZ = -0.35;                 // 本体 (柱4本) の中心
  const BW = 2.3, BD = 1.7;                     // 下梁・上梁の平面寸法
  const BED = 0.95, TT = 1.05;                  // 下梁上面・ボルスタ上面
  const SB = TT + 1.25, ST = SB + 0.55;         // スライド下面 (上死点: 開口高さ1250) ・上面
  const CB = 3.05, CT = 4.25;                   // 上梁の下面・上面
  const CX = [FX - 0.85, FX + 0.85], CZ = [FZ - 0.55, FZ + 0.55], CR = 0.12;   // 柱 φ240
  const FF = FZ + BD / 2;                       // 下梁・上梁の前面 z

  // ==== 下梁 (ベッド) ====
  g.add(plainBox(BW - 0.04, 0.08, BD - 0.04, dark, FX, 0.04, FZ));                   // 据付けベース (床下のピットへ続く)
  g.add(box(BW, BED - 0.08, BD, frame, FX, 0.08 + (BED - 0.08) / 2, FZ));
  [-0.95, 0.95].forEach(dx => g.add(box(0.14, 0.66, 0.04, frameD, FX + dx, 0.12 + 0.33, FF + 0.01)));   // 前面リブ
  g.add(plainBox(BW - 0.1, 0.08, 0.004, _hazardMat(9), FX, BED - 0.07, FF + 0.002));   // 前縁の危険表示

  // ==== ボルスタ (1300×1200, T溝) — 前方のランアウトレールへ引き出せるムービングボルスタ ====
  g.add(plainBox(1.3, TT - BED, 1.2, steel, FX, (BED + TT) / 2, FZ));
  [-0.4, 0, 0.4].forEach(dz => g.add(plainBox(1.3, 0.004, 0.036, dark, FX, TT + 0.002, FZ + dz)));

  // ==== ランアウトレール (下梁前面 → 前端): 上面 = 下梁上面 ====
  const RZ0 = FF, RZ1 = 2.08;
  [-0.5, 0.5].forEach(dx => {
    const rx = FX + dx;
    g.add(plainBox(0.1, 0.1, RZ1 - RZ0, steel, rx, BED - 0.05, (RZ0 + RZ1) / 2));
    [RZ0 + 0.55, RZ1 - 0.12].forEach(lz => g.add(plainBox(0.12, BED - 0.1, 0.12, frameD, rx, (BED - 0.1) / 2, lz)));
    g.add(box(0.16, 0.16, 0.08, yellow, rx, BED + 0.08, RZ1 - 0.04));                 // 端末ストッパ
  });
  g.add(plainBox(0.9, 0.08, 0.08, frameD, FX, 0.3, RZ1 - 0.12));                      // 支柱のつなぎ
  g.add(plainBox(0.9, 0.08, 0.08, frameD, FX, 0.3, RZ0 + 0.55));

  // ==== 4本の柱 (クロム) + 上下のロックナット ====
  CX.forEach(x => CZ.forEach(z => {
    g.add(cylAt(CR, CR, CT + 0.19 - BED, 20, chrome, x, (BED + CT + 0.19) / 2, z));
    [BED + 0.08, CB - 0.08, CT + 0.08].forEach(y => g.add(cylAt(0.2, 0.2, 0.16, 6, dark, x, y, z)));
    g.add(cylAt(0.09, 0.12, 0.06, 16, chrome, x, CT + 0.19, z));                      // 柱頭
  }));

  // ==== 金型 (鍛造型: 下型をボルスタ、上型をスライドに青いクランプで固定) ====
  const clampM = mat('#2f5fa8', 0.45, 0.3);
  g.add(box(0.9, 0.26, 0.75, dieM, FX, TT + 0.13, FZ));
  g.add(box(0.9, 0.26, 0.75, dieM, FX, SB - 0.13, FZ));
  g.add(plainBox(0.44, 0.012, 0.3, dark, FX, TT + 0.262, FZ));                       // 下型の彫り込み
  [-1, 1].forEach(s => [TT + 0.2, SB - 0.2].forEach(cy => g.add(box(0.12, 0.08, 0.2, clampM, FX + s * 0.52, cy, FZ))));

  // ==== スライド (上死点) + 柱ガイドのボス + 金型取付面 ====
  g.add(plainBox(1.3, 0.05, 1.2, steel, FX, SB + 0.025, FZ));
  g.add(box(2.1, ST - SB - 0.05, 1.5, frame, FX, (SB + 0.05 + ST) / 2, FZ));
  CX.forEach(x => CZ.forEach(z => g.add(cylAt(0.2, 0.2, ST - SB + 0.06, 20, frameD, x, (SB + ST) / 2 + 0.005, z))));
  g.add(plainBox(1.62, 0.1, 0.004, _hazardMat(7), FX, SB + 0.12, FZ + 0.752));

  // ==== 主ラム (φ440) ・シリンダ下部のグランド ====
  g.add(cylAt(0.22, 0.22, CB - ST + 0.02, 24, chrome, FX, (ST + CB) / 2, FZ));
  g.add(cylAt(0.3, 0.3, 0.06, 24, dark, FX, CB - 0.03, FZ));

  // ==== 上梁 (クラウン) + 銘板 + 圧力計 ====
  g.add(box(BW, CT - CB, BD, frame, FX, (CB + CT) / 2, FZ));
  [-0.95, 0.95].forEach(dx => g.add(box(0.12, CT - CB - 0.2, 0.04, frameD, FX + dx, (CB + CT) / 2, FF + 0.01)));
  const npCv = document.createElement('canvas'); npCv.width = 512; npCv.height = 192;
  const np = npCv.getContext('2d');
  np.fillStyle = '#e9ecef'; np.fillRect(0, 0, 512, 192);
  np.fillStyle = '#1f3f7a'; np.fillRect(0, 0, 512, 14); np.fillRect(0, 178, 512, 14);
  np.fillStyle = '#1b1f24'; np.font = 'bold 96px Arial'; np.fillText('Y32-315', 24, 112);
  np.font = 'bold 30px Arial'; np.fillText('HYDRAULIC PRESS   3150 kN', 26, 158);
  const npTex = new THREE.CanvasTexture(npCv); npTex.anisotropy = 4;
  const npPl = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.41), new THREE.MeshStandardMaterial({ map: npTex, roughness: 0.5, metalness: 0.2 }));
  npPl.position.set(FX, (CB + CT) / 2 + 0.12, FF + 0.012); g.add(npPl);
  const gx = FX + 0.72, gy = CB + 0.32;
  g.add(cylAt(0.1, 0.1, 0.03, 24, dark, gx, gy, FF + 0.015).rotateX(Math.PI / 2));
  g.add(cylAt(0.085, 0.085, 0.005, 24, mat('#f4f4f0', 0.3), gx, gy, FF + 0.032).rotateX(Math.PI / 2));
  const ndl = plainBox(0.006, 0.07, 0.003, mat('#c0392b', 0.4), gx + 0.012, gy + 0.03, FF + 0.036); ndl.rotation.z = -0.5; g.add(ndl);

  // ==== 主シリンダ上部 + プレフィル弁 + プレフィルタンク (エアブリーザの上端 = 5.6m) ====
  g.add(cylAt(0.42, 0.42, 0.08, 28, frameD, FX, CT + 0.04, FZ));                      // 取付フランジ
  g.add(cylAt(0.31, 0.31, 0.55, 28, dark, FX, CT + 0.08 + 0.275, FZ));                // シリンダ
  g.add(cylAt(0.35, 0.35, 0.07, 28, frameD, FX, CT + 0.66, FZ));                      // ヘッドカバー
  g.add(cylAt(0.14, 0.16, 0.2, 18, steel, FX, CT + 0.79, FZ));                        // プレフィル弁
  const TB = 5.05, TH = 0.5, TZ = FZ - 0.1;                                           // タンク下面・高さ・中心z
  g.add(box(1.4, TH, 0.85, frame, FX, TB + TH / 2, TZ));
  [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]].forEach(([dx, dz]) =>
    g.add(plainBox(0.07, TB - CT, 0.07, frameD, FX + dx, (CT + TB) / 2, TZ + dz)));
  g.add(plainBox(0.035, 0.3, 0.02, mat('#6a5510', 0.2, 0.1), FX + 0.45, TB + 0.25, TZ + 0.43));   // 油面計
  g.add(cylAt(0.06, 0.06, 0.05, 14, dark, FX - 0.45, TB + TH + 0.025, TZ - 0.15));   // エアブリーザ

  // ==== 上梁上の点検用手すり (黄) — 左側 (はしご側) は中央を開ける ====
  const hx = BW / 2 - 0.05, hz = BD / 2 - 0.05, RH = 1.05;
  [[-hx, -hz], [hx, -hz], [hx, hz], [-hx, hz]].forEach(([dx, dz]) => g.add(cylAt(0.024, 0.024, RH, 8, yellow, FX + dx, CT + RH / 2, FZ + dz)));
  [0.5, RH].forEach(ry => {
    g.add(cylAt(0.02, 0.02, 2 * hx, 8, yellow, FX, CT + ry, FZ - hz).rotateZ(Math.PI / 2));
    g.add(cylAt(0.02, 0.02, 2 * hx, 8, yellow, FX, CT + ry, FZ + hz).rotateZ(Math.PI / 2));
    g.add(cylAt(0.02, 0.02, 2 * hz, 8, yellow, FX + hx, CT + ry, FZ).rotateX(Math.PI / 2));
    [-1, 1].forEach(s => g.add(cylAt(0.02, 0.02, hz - 0.25, 8, yellow, FX - hx, CT + ry, FZ + s * (0.25 + (hz - 0.25) / 2)).rotateX(Math.PI / 2)));
  });
  g.add(plainBox(2 * hx, 0.1, 0.012, yellow, FX, CT + 0.05, FZ + hz));                // 幅木 (手前)

  // ==== 昇降はしご (左側面: 床 → 上梁上面 +1.0m) ====
  const LX = FX - BW / 2 - 0.13, LT = CT + 1.0;
  [-0.21, 0.21].forEach(dz => g.add(plainBox(0.05, LT, 0.06, yellow, LX, LT / 2, FZ + dz)));
  for (let ry = 0.3; ry < CT; ry += 0.3) g.add(cylAt(0.016, 0.016, 0.42, 6, pipeM, LX, ry, FZ).rotateX(Math.PI / 2));
  [0.55, CB + 0.3, CT - 0.3].forEach(by => [-0.21, 0.21].forEach(dz => g.add(plainBox(0.12, 0.04, 0.04, frameD, LX + 0.075, by, FZ + dz))));

  // ==== 光線式安全装置 (前側の柱に取り付けた投光器・受光器) ====
  const lcz = CZ[1] + 0.24, lcy0 = TT + 0.08, lcy1 = SB - 0.05;
  [[CX[0] + 0.14, 1], [CX[1] - 0.14, -1]].forEach(([x, s]) => {
    g.add(plainBox(0.045, lcy1 - lcy0, 0.045, yellow, x, (lcy0 + lcy1) / 2, lcz));
    g.add(plainBox(0.004, lcy1 - lcy0 - 0.08, 0.026, dark, x + s * 0.024, (lcy0 + lcy1) / 2, lcz));
    [lcy0 + 0.12, lcy1 - 0.12].forEach(by => g.add(plainBox(0.05, 0.04, 0.22, dark, x - s * 0.03, by, lcz - 0.12)));
  });

  // ==== 制御盤 (左奥・扉は左 (-X) 向き) + 信号灯 ====
  const KX0 = -2.075, KX1 = -1.55, KZ0 = -2.1, KZ1 = -0.95, KH = 2.0;
  const kx = (KX0 + KX1) / 2, kz = (KZ0 + KZ1) / 2, kw = KZ1 - KZ0;
  g.add(plainBox(KX1 - KX0 - 0.02, 0.1, kw - 0.02, dark, kx, 0.05, kz));             // 台座
  g.add(box(KX1 - KX0, KH, kw, cabM, kx, 0.1 + KH / 2, kz));
  g.add(plainBox(0.006, KH - 0.1, 0.012, dark, KX0 - 0.002, 0.1 + KH / 2, kz));      // 扉の合わせ目
  [-1, 1].forEach(s => {
    g.add(plainBox(0.02, 0.2, 0.03, dark, KX0 - 0.004, 1.15, kz + s * 0.08));         // ハンドル
    for (let i = 0; i < 5; i++) g.add(plainBox(0.004, 0.012, 0.3, dark, KX0 - 0.002, 0.3 + i * 0.04, kz + s * 0.28));   // ルーバー
  });
  g.add(plainBox(0.01, 0.13, 0.13, yellow, KX0 - 0.002, 1.62, kz - 0.28));           // 主電源ハンドルの台座
  g.add(plainBox(0.02, 0.025, 0.1, mat('#c0392b', 0.4), KX0 - 0.012, 1.62, kz - 0.28));
  const lx = kx, lz = kz + 0.3;                                                       // 信号灯
  g.add(cylAt(0.018, 0.018, 0.2, 10, chrome, lx, 0.1 + KH + 0.1, lz));
  let sy = 0.1 + KH + 0.24;
  [['#ef4444', 0.9], ['#f5b800', 0.85], ['#22c55e', 0.85]].forEach(([c, e]) => {
    g.add(cylAt(0.04, 0.04, 0.08, 14, mat(c, 0.3, 0.1, { emissive: c, emissiveIntensity: e }), lx, sy, lz)); sy += 0.09;
  });

  // ==== 油圧ユニット (右奥): タンク + モーターポンプ2組 + バルブブロック + 圧力計 ====
  const UX0 = 1.1, UX1 = 2.1, UZ0 = -2.1, UZ1 = -0.4, UH = 0.8;
  const ux = (UX0 + UX1) / 2, uz = (UZ0 + UZ1) / 2, UT = 0.1 + UH;
  [UZ0 + 0.15, UZ1 - 0.15].forEach(z => g.add(plainBox(UX1 - UX0, 0.1, 0.12, dark, ux, 0.05, z)));   // スキッド
  g.add(box(UX1 - UX0, UH, UZ1 - UZ0, frame, ux, 0.1 + UH / 2, uz));
  g.add(plainBox(0.04, 0.34, 0.012, mat('#6a5510', 0.2, 0.1), UX1 - 0.18, 0.55, UZ1 + 0.006));   // 油面計
  [UX0 + 0.27, UX1 - 0.27].forEach(mx => {
    g.add(plainBox(0.3, 0.08, 0.84, frameD, mx, UT + 0.04, UZ0 + 0.58));
    g.add(cylAt(0.16, 0.16, 0.5, 20, motorM, mx, UT + 0.25, UZ0 + 0.42).rotateX(Math.PI / 2));   // モーター
    g.add(cylAt(0.15, 0.15, 0.04, 20, dark, mx, UT + 0.25, UZ0 + 0.15).rotateX(Math.PI / 2));    // ファンカバー
    g.add(box(0.14, 0.1, 0.14, motorM, mx, UT + 0.44, UZ0 + 0.42));                             // 端子箱
    g.add(cylAt(0.12, 0.12, 0.16, 16, frameD, mx, UT + 0.25, UZ0 + 0.75).rotateX(Math.PI / 2));  // ベルハウジング
    g.add(cylAt(0.09, 0.09, 0.16, 14, steel, mx, UT + 0.25, UZ0 + 0.91).rotateX(Math.PI / 2));   // ポンプ
    g.add(cylAt(0.03, 0.03, 0.4, 8, pipeM, mx, UT + 0.12, UZ0 + 1.18).rotateX(Math.PI / 2));     // 吐出配管
  });
  g.add(box(0.6, 0.35, 0.28, steel, ux, UT + 0.175, UZ1 - 0.2));                      // バルブブロック
  for (let i = 0; i < 4; i++) g.add(plainBox(0.07, 0.07, 0.1, dark, ux - 0.21 + i * 0.14, UT + 0.2, UZ1 - 0.02));   // 電磁弁コイル
  [ux + 0.05, ux + 0.22].forEach(px => {                                               // 圧力計
    g.add(cylAt(0.018, 0.018, 0.1, 8, steel, px, UT + 0.4, UZ1 - 0.2));
    g.add(cylAt(0.065, 0.065, 0.025, 20, dark, px, UT + 0.5, UZ1 - 0.2).rotateX(Math.PI / 2));
    g.add(cylAt(0.055, 0.055, 0.004, 20, mat('#f4f4f0', 0.3), px, UT + 0.5, UZ1 - 0.186).rotateX(Math.PI / 2));
  });
  // 上梁への配管 (バルブブロック上面 → 右側を立ち上がり → 上梁の右側面) + 支柱と配管クランプ
  const RX = FX + BW / 2, PZ = UZ1 - 0.2;
  [[1.34, 3.55], [1.44, 3.75], [1.54, 3.95]].forEach(([px, py]) => {
    g.add(cylAt(0.032, 0.032, py - (UT + 0.35), 10, pipeM, px, (UT + 0.35 + py) / 2, PZ));
    const el = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), pipeM); el.position.set(px, py, PZ); g.add(el);
    g.add(cylAt(0.032, 0.032, px - RX, 10, pipeM, (px + RX) / 2, py, PZ).rotateZ(Math.PI / 2));
    g.add(cylAt(0.055, 0.055, 0.03, 12, dark, RX + 0.015, py, PZ).rotateZ(Math.PI / 2));   // フランジ
  });
  g.add(plainBox(0.05, 3.1, 0.05, frameD, 1.44, UT + 1.55, PZ - 0.08));                 // 配管の支柱
  [1.7, 2.6, 3.35].forEach(cy => g.add(plainBox(0.3, 0.035, 0.12, dark, 1.44, cy, PZ - 0.03)));   // 配管クランプ

  // ==== 操作盤 (右手前: タッチパネル・両手押しボタン・非常停止) ====
  const OX = 1.45, OZ = 0.95;
  g.add(plainBox(0.36, 0.06, 0.3, dark, OX, 0.03, OZ));
  g.add(box(0.1, 0.9, 0.1, cabM, OX, 0.51, OZ));
  const op = new THREE.Group(); op.position.set(OX, 1.12, OZ); op.rotation.x = -0.45;
  op.add(box(0.62, 0.34, 0.2, cabM, 0, 0, 0));
  const hCv = document.createElement('canvas'); hCv.width = 256; hCv.height = 176;
  const hc = hCv.getContext('2d');
  hc.fillStyle = '#0e2238'; hc.fillRect(0, 0, 256, 176);
  hc.fillStyle = '#e8f0f8'; hc.font = 'bold 18px Arial'; hc.fillText('Y32-315   AUTO', 10, 26);
  hc.fillStyle = '#5ad1ff'; hc.font = 'bold 36px Arial'; hc.fillText('2450 kN', 10, 74);
  hc.fillStyle = '#9fb3c8'; hc.font = '17px Arial'; hc.fillText('POS   412.5 mm', 10, 106); hc.fillText('PRES  19.4 MPa', 10, 130);
  hc.fillStyle = '#3fbf5f'; hc.fillRect(10, 144, 72, 24); hc.fillStyle = '#c0392b'; hc.fillRect(92, 144, 72, 24);
  const hTex = new THREE.CanvasTexture(hCv); hTex.anisotropy = 4;
  const hmi = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.165), new THREE.MeshBasicMaterial({ map: hTex }));
  hmi.position.set(0, 0.04, 0.101); op.add(hmi);
  op.add(plainBox(0.27, 0.19, 0.004, dark, 0, 0.04, 0.099));
  [-0.23, 0.23].forEach(bx => {                                                        // 両手押しボタン (緑)
    op.add(cylAt(0.045, 0.045, 0.02, 16, dark, bx, -0.06, 0.105).rotateX(Math.PI / 2));
    op.add(cylAt(0.036, 0.036, 0.03, 16, mat('#1f9d4a', 0.35, 0.1), bx, -0.06, 0.12).rotateX(Math.PI / 2));
  });
  op.add(plainBox(0.1, 0.1, 0.01, yellow, 0.23, 0.09, 0.104));                         // 非常停止 (黄台座+赤キノコ)
  op.add(cylAt(0.035, 0.03, 0.04, 16, mat('#d0211c', 0.35, 0.1), 0.23, 0.09, 0.125).rotateX(Math.PI / 2));
  g.add(op);

  g.traverse(o => { if (o.isMesh && o.material === frame) o.userData.colorable = true; });
  g.scale.set(w / 4.2, h / 5.6, d / 4.2);
  return g;
}
// 工業炉: Nabertherm NA 500/65 (電気加熱の強制対流式チャンバー炉, 最高650℃, 炉内 幅750×奥行1000×高さ750mm = 500L)。
// 公表外形 幅1290×奥行1890×高さ1825mm。スイッチギアを収めた架台 (ルーバー・主電源スイッチ) の上に炉体、
// 前面に右ヒンジの断熱扉 (クリックで開閉, 初期は閉) と右側の操作部 (コントローラ B500・ランプ・キースイッチ)、
// 背面に循環ファンのモーターカバーと端子箱、上面に排気口・給気フラップ・熱電対。扉を開けると
// ステンレスの内張り・左右の整流板・棚板2段と予熱中のアルミビレットが見える。作図は外形寸法で行い、w/d/h に合わせて拡縮する。
function buildIndustrialFurnace({ color='#cfd3d0', w=1.29, d=1.89, h=1.825 } = {}) {
  const g = new THREE.Group();
  const body  = mat(color, 0.5, 0.2, { env: 0.45 });              // 炉体・扉 (色変更対象)
  const bodyD = mat(shade(color, 0.84), 0.55, 0.2);
  const base  = mat('#3b4046', 0.55, 0.3);                        // 架台 (アンスラサイト)
  const dark  = mat('#1c1f23', 0.6, 0.3);
  const steel = mat('#a9b1b8', 0.3, 0.8, { env: 0.9 });
  const hot   = { emissive: new THREE.Color(0xff6a10), emissiveIntensity: 0.07 };   // 加熱中のほのかな赤熱
  const liner = new THREE.MeshStandardMaterial({ color: 0xb9bdc0, roughness: 0.45, metalness: 0.7, ...hot });   // 炉内 (ステンレス・加熱中)
  const insul = mat('#e9dfc9', 0.95, 0);                          // 扉裏の断熱材 (セラミックファイバー)
  const alu   = new THREE.MeshStandardMaterial({ color: 0xd2d5d9, roughness: 0.3, metalness: 0.85, emissive: new THREE.Color(0xff5a00), emissiveIntensity: 0.035 });

  const H0 = 1.825, HW = 0.645, ZB = -0.62, ZF = 0.72;                        // 炉体: 半幅・背面 (モーターカバーの前) ・前面 (扉の後ろ)
  const Y0 = 0.6, Y1 = 1.74;                                      // 架台上面・炉体上面
  const OX0 = -0.505, OX1 = 0.245, OY0 = 0.82, OY1 = 1.57, OZB = ZF - 1.0;   // 炉室 (幅750×高さ750×奥行1000)
  const cx = (OX0 + OX1) / 2, cy = (OY0 + OY1) / 2, CW = OX1 - OX0, CH = OY1 - OY0, CD = ZF - OZB, cz = (OZB + ZF) / 2;

  // ---- 架台 (スイッチギア内蔵): アジャスタ・ルーバー・主電源スイッチ ----
  const BZ0 = -0.6, BZ1 = 0.68;
  g.add(box(2 * HW - 0.04, Y0 - 0.05, BZ1 - BZ0, base, 0, 0.05 + (Y0 - 0.05) / 2, (BZ0 + BZ1) / 2));
  [[-HW + 0.08, BZ0 + 0.08], [HW - 0.08, BZ0 + 0.08], [-HW + 0.08, BZ1 - 0.08], [HW - 0.08, BZ1 - 0.08]].forEach(([x, z]) => g.add(cylAt(0.035, 0.04, 0.05, 10, dark, x, 0.025, z)));
  for (let i = 0; i < 6; i++) g.add(plainBox(0.5, 0.014, 0.008, dark, -0.22, 0.2 + i * 0.05, BZ1 + 0.004));
  g.add(plainBox(0.12, 0.12, 0.01, mat('#f2c200', 0.5, 0.1), 0.42, 0.42, BZ1 + 0.005));
  g.add(plainBox(0.09, 0.024, 0.035, mat('#c0392b', 0.4), 0.42, 0.42, BZ1 + 0.02));

  // ---- 炉体 (炉室の開口を囲む5ブロック) ----
  [[-HW, HW, Y0, Y1, ZB, OZB], [-HW, OX0, Y0, Y1, OZB, ZF], [OX1, HW, Y0, Y1, OZB, ZF], [OX0, OX1, Y0, OY0, OZB, ZF], [OX0, OX1, OY1, Y1, OZB, ZF]]
    .forEach(([x0, x1, y0, y1, z0, z1]) => g.add(plainBox(x1 - x0, y1 - y0, z1 - z0, body, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)));

  // ---- 炉室: ステンレス内張り・左右の整流板 (スリット)・ファン吸込口・棚板2段・アルミビレット ----
  g.add(plainBox(CW, CH, 0.01, liner, cx, cy, OZB + 0.005));
  g.add(plainBox(CW, 0.01, CD, liner, cx, OY0 + 0.005, cz));
  g.add(plainBox(CW, 0.01, CD, liner, cx, OY1 - 0.005, cz));
  [OX0 + 0.005, OX1 - 0.005].forEach(x => g.add(plainBox(0.01, CH, CD, liner, x, cy, cz)));
  const slCv = document.createElement('canvas'); slCv.width = 256; slCv.height = 128;
  const sl = slCv.getContext('2d');
  sl.fillStyle = '#b9bdc0'; sl.fillRect(0, 0, 256, 128);
  sl.fillStyle = '#2a1a14';
  for (let c = 0; c < 8; c++) for (let r = 0; r < 3; r++) sl.fillRect(14 + c * 30, 10 + r * 40, 8, 30);
  const slTex = new THREE.CanvasTexture(slCv); slTex.anisotropy = 4;
  const baffle = new THREE.MeshStandardMaterial({ color: 0xffffff, map: slTex, roughness: 0.45, metalness: 0.6, ...hot });
  [OX0 + 0.04, OX1 - 0.04].forEach(x => g.add(plainBox(0.012, CH - 0.08, CD - 0.14, baffle, x, cy, cz - 0.03)));
  g.add(cylAt(0.17, 0.17, 0.012, 28, dark, cx, cy, OZB + 0.016).rotateX(Math.PI / 2));
  g.add(cylAt(0.12, 0.12, 0.014, 28, liner, cx, cy, OZB + 0.018).rotateX(Math.PI / 2));
  [OY0 + 0.2, OY0 + 0.47].forEach(syy => {
    g.add(plainBox(CW - 0.1, 0.012, CD - 0.16, steel, cx, syy, cz - 0.03));
    for (let i = 0; i < 7; i++) g.add(plainBox(CW - 0.1, 0.008, 0.012, dark, cx, syy + 0.01, OZB + 0.12 + i * (CD - 0.3) / 6));
    [OX0 + 0.06, OX1 - 0.06].forEach(x => g.add(plainBox(0.03, 0.02, CD - 0.16, steel, x, syy - 0.016, cz - 0.03)));
  });
  for (let i = 0; i < 5; i++) g.add(cylAt(0.055, 0.055, 0.62, 18, alu, cx - 0.26 + i * 0.13, OY0 + 0.2 + 0.061, cz - 0.05).rotateX(Math.PI / 2));
  [0, 1, 2].forEach(i => g.add(plainBox(0.5, 0.02, 0.62, alu, cx, OY0 + 0.47 + 0.017 + i * 0.021, cz - 0.05)));

  // ---- 断熱扉 (右ヒンジ・外開き): 回転軸 = 扉前面の右端。取っ手の前端 = 外形の前端 ----
  const DX0 = -0.62, DX1 = 0.36, DY0 = 0.66, DY1 = 1.70, DT = 0.195;
  const dw = DX1 - DX0, dh = DY1 - DY0, dy = (DY0 + DY1) / 2;
  const door = new THREE.Group(); door.position.set(DX1, dy, ZF + DT);
  door.add(box(dw, dh, DT, body, -dw / 2, 0, -DT / 2));
  door.add(plainBox(dw - 0.14, dh - 0.14, 0.006, bodyD, -dw / 2, 0, 0.002));
  door.add(plainBox(CW - 0.02, CH - 0.02, 0.06, insul, cx - DX1, cy - dy, -DT - 0.03));   // 扉裏のプラグ (断熱材)
  const gsk = mat('#f4f1ea', 0.9);                                                       // ガスケット
  [[CW + 0.06, 0.03, 0, (CH + 0.03) / 2], [CW + 0.06, 0.03, 0, -(CH + 0.03) / 2], [0.03, CH, (CW + 0.03) / 2, 0], [0.03, CH, -(CW + 0.03) / 2, 0]]
    .forEach(([bw, bh, ox, oy]) => door.add(plainBox(bw, bh, 0.02, gsk, cx - DX1 + ox, cy - dy + oy, -DT - 0.01)));
  const hx = -dw + 0.07;                                                                  // 取っ手 (左端)
  [-0.15, 0.15].forEach(oy => door.add(cylAt(0.01, 0.01, 0.016, 8, steel, hx, oy, 0.008).rotateX(Math.PI / 2)));
  door.add(cylAt(0.014, 0.014, 0.36, 12, steel, hx, 0, 0.016));
  door.add(plainBox(0.12, 0.03, 0.02, steel, hx + 0.08, 0.26, 0.01));                    // クイックロックのレバー
  [-0.35, 0.35].forEach(oy => door.add(cylAt(0.022, 0.022, 0.14, 12, steel, 0, oy, 0)));  // ヒンジ
  const mpCv = document.createElement('canvas'); mpCv.width = 256; mpCv.height = 64;
  const mp = mpCv.getContext('2d');
  mp.fillStyle = '#e4e7ea'; mp.fillRect(0, 0, 256, 64);
  mp.fillStyle = '#1d3f73'; mp.font = 'bold 34px Arial'; mp.fillText('NA 500/65', 18, 44);
  const mpTex = new THREE.CanvasTexture(mpCv); mpTex.anisotropy = 4;
  const mpl = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.065), new THREE.MeshStandardMaterial({ map: mpTex, roughness: 0.4, metalness: 0.3 }));
  mpl.position.set(-dw / 2, dh / 2 - 0.12, 0.007); door.add(mpl);
  const wnCv = document.createElement('canvas'); wnCv.width = 128; wnCv.height = 128;
  const wn = wnCv.getContext('2d');
  wn.fillStyle = '#f2c200'; wn.beginPath(); wn.moveTo(64, 8); wn.lineTo(122, 116); wn.lineTo(6, 116); wn.closePath(); wn.fill();
  wn.strokeStyle = '#111'; wn.lineWidth = 8; wn.stroke();
  wn.fillStyle = '#111'; wn.font = 'bold 30px Arial'; wn.fillText('高温', 34, 98);
  const wnTex = new THREE.CanvasTexture(wnCv); wnTex.anisotropy = 4;
  const wnl = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12), new THREE.MeshBasicMaterial({ map: wnTex, transparent: true }));
  wnl.position.set(-dw + 0.2, dh / 2 - 0.14, 0.007); door.add(wnl);
  g.add(door);

  // ---- 操作部 (右): コントローラ B500 + ランプ + キースイッチ ----
  const PX = (DX1 + HW) / 2 + 0.01;
  g.add(plainBox(0.2, 0.3, 0.035, dark, PX, 1.4, ZF + 0.0175));
  const cCv = document.createElement('canvas'); cCv.width = 192; cCv.height = 144;
  const cc = cCv.getContext('2d');
  cc.fillStyle = '#0b1622'; cc.fillRect(0, 0, 192, 144);
  cc.fillStyle = '#e8eef5'; cc.font = 'bold 44px Arial'; cc.fillText('500°C', 14, 62);
  cc.fillStyle = '#7fc4ff'; cc.font = '16px Arial'; cc.fillText('SP 520°C   SEG 2/4', 14, 92);
  cc.strokeStyle = '#ff8a3d'; cc.lineWidth = 3; cc.beginPath(); cc.moveTo(14, 132); cc.lineTo(70, 108); cc.lineTo(120, 108); cc.lineTo(178, 104); cc.stroke();
  const cTex = new THREE.CanvasTexture(cCv); cTex.anisotropy = 4;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshBasicMaterial({ map: cTex }));
  scr.position.set(PX, 1.44, ZF + 0.0355); g.add(scr);
  for (let i = 0; i < 3; i++) g.add(plainBox(0.035, 0.022, 0.01, mat('#5b6570', 0.5), PX - 0.05 + i * 0.05, 1.32, ZF + 0.04));
  [['#22c55e', 1.18], ['#f4f4f0', 1.12]].forEach(([c, y]) => g.add(cylAt(0.018, 0.018, 0.02, 12, mat(c, 0.3, 0.1, { emissive: c, emissiveIntensity: 0.7 }), PX, y, ZF + 0.01).rotateX(Math.PI / 2)));
  g.add(cylAt(0.024, 0.024, 0.02, 12, steel, PX, 1.04, ZF + 0.01).rotateX(Math.PI / 2));   // キースイッチ

  // ---- 背面: 循環ファンのモーターカバー (通気スリット) + 端子箱 + 配線管 ----
  const RZ = -0.945 + 0.006;                                                            // カバー背面 (スリットの厚みぶん内側)
  g.add(box(0.56, 0.5, ZB - RZ, bodyD, cx, cy, (ZB + RZ) / 2));
  for (let i = 0; i < 6; i++) g.add(plainBox(0.4, 0.014, 0.006, dark, cx, cy - 0.15 + i * 0.06, RZ - 0.003));
  g.add(box(0.3, 0.3, 0.12, dark, 0.4, 0.9, ZB - 0.06));
  g.add(cylAt(0.02, 0.02, 0.22, 8, dark, 0.4, Y0 + 0.07, ZB - 0.05));

  // ---- 上面: 排気口 (上端 = 外形の高さ) ・排気フラップのレバー・給気フラップ・熱電対ヘッド ----
  g.add(cylAt(0.05, 0.05, H0 - Y1, 16, steel, -0.4, (Y1 + H0) / 2, -0.35));
  g.add(plainBox(0.12, 0.012, 0.02, dark, -0.4, Y1 + 0.06, -0.27));
  g.add(box(0.14, 0.05, 0.1, bodyD, 0.2, Y1 + 0.025, -0.35));
  g.add(plainBox(0.07, 0.05, 0.07, dark, cx, Y1 + 0.025, 0.25));

  g.traverse(o => { if (o.isMesh && o.material === body) o.userData.colorable = true; });
  g.userData.parts = { door, doorAngle: 1.62, doorOpen: false };
  g.scale.set(w / 1.29, h / 1.825, d / 1.89);
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

// ---- アルミコイル (パラメトリック・共通) ------------------------------------------------------------------------
// 寸法とテールの形をパラメータ (mm・度) で与え、最外周の1巻 (らせん: 巻き始めより板厚ぶん外で終わる)・浮いたテールと
// その下の巻きの露出面・舌状に切れたテール端 (角部R・板厚方向の丸み)・内径・両端面 (巻き目のらせんを描いた平面テクスチャ
// + 円周方向の異方性反射) を作る。コイル軸 = ローカル X、中心 = 原点。角度はテール端を基準に +Y → +Z 方向へ測る。
//   id/od/w/t: 内径・外径・板幅・板厚   lift/liftDeg/tailDeg: テールの浮き量・浮き範囲・テール位置
//   cornerR/edgeRound/tongueDeg: テール端の角部R・板厚方向の丸み(%)・舌状の切れ込み (板幅の中央に対する両端の遅れ角)
// 既定はホットコイル (熱延上がり 板厚8mm・テールが浮いた状態)。製品コイルは板厚を薄くし、テールを真っすぐ切りそろえて浮かせない。
const COIL_HOT  = { id: 508, od: 1250, w: 1100, t: 8.0, lift: 159, liftDeg: 90, tailDeg: -93, cornerR: 150, edgeRound: 100, tongueDeg: 14 };
const COIL_PROD = { id: 508, od: 1250, w: 1100, t: 1.0, lift: 0, liftDeg: 90, tailDeg: 38, cornerR: 0, edgeRound: 0, tongueDeg: 0 };
const _cFract = x => x - Math.floor(x);
const _cHash = k => _cFract(Math.sin(k * 127.1 + 311.7) * 43758.5453);
const _cNoise = x => { const i = Math.floor(x), f = x - i, s = f * f * (3 - 2 * f); return _cHash(i) * (1 - s) + _cHash(i + 1) * s; };
// 外周: ほぼ鏡面に近いアルミ (圧延方向 = 円周方向の淡い筋)。全コイルで共用
let _coilBrushTex = null;
function coilBrushTextures() {
  if (_coilBrushTex) return _coilBrushTex;
  const W = 1024, H = 256;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = 'rgb(224,227,230)'; g.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x++) {
    const v = (_cNoise(x / 150) - 0.5) * 4;
    g.fillStyle = v > 0 ? `rgba(255,255,255,${v / 255})` : `rgba(0,0,0,${-v / 255})`;
    g.fillRect(x, 0, 1, H);
  }
  for (let i = 0; i < 180; i++) {
    const y = rnd() * H, x = rnd() * W, len = 100 + rnd() * 700;
    g.strokeStyle = `rgba(255,255,255,${0.008 + rnd() * 0.018})`;
    g.lineWidth = 0.35 + rnd() * 0.35;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
  }
  const color = new THREE.CanvasTexture(c); color.colorSpace = THREE.SRGBColorSpace;
  const r = document.createElement('canvas'); r.width = W; r.height = H;
  const q = r.getContext('2d');
  q.fillStyle = 'rgb(0,42,0)'; q.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x++) {
    const v = Math.round((_cNoise(x / 180 + 9) - 0.5) * 8);
    q.fillStyle = `rgb(0,${Math.max(34, Math.min(50, 42 + v))},0)`;
    q.fillRect(x, 0, 1, H);
  }
  const rough = new THREE.CanvasTexture(r);
  for (const tex of [color, rough]) { tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 8; }
  return (_coilBrushTex = { color, rough });
}
// 端面: 巻き目のらせん (巻きの境目を暗く) + 円周方向の異方性マップ。寸法ごとにキャッシュ。
// 板厚が画素より薄い製品コイルは境目を描かず、半径方向の縞 (細かい巻き目) だけにして模様のちらつきを防ぐ
const _coilEndTex = new Map();
function coilEndTextures(ri, t, th0, Rm) {
  const key = [ri, t, th0, Rm].map(v => v.toFixed(5)).join('|');
  if (_coilEndTex.has(key)) return _coilEndTex.get(key);
  const S = 768, TAU = Math.PI * 2, pix = 2 * Rm / S;
  const tv = Math.max(t, 1.6 * pix), gap = Math.max(0, Math.min(1, (t / pix - 1.5) / 2));
  const c1 = document.createElement('canvas'); c1.width = c1.height = S;
  const c2 = document.createElement('canvas'); c2.width = c2.height = S;
  const g1 = c1.getContext('2d'), g2 = c2.getContext('2d');
  const im1 = g1.createImageData(S, S), im2 = g2.createImageData(S, S);
  const d1 = im1.data, d2 = im2.data;
  for (let py = 0; py < S; py++) {
    const v = 1 - (py + 0.5) / S, z = (v - 0.5) * 2 * Rm;
    for (let px = 0; px < S; px++) {
      const u = (px + 0.5) / S, y = (u - 0.5) * 2 * Rm, o = (py * S + px) * 4;
      const tx = -(v - 0.5), ty = u - 0.5, Ln = Math.hypot(tx, ty) || 1;
      d2[o] = (tx / Ln * 0.5 + 0.5) * 255; d2[o + 1] = (ty / Ln * 0.5 + 0.5) * 255; d2[o + 2] = 210; d2[o + 3] = 255;
      const r = Math.hypot(y, z);
      if (r < ri - 2 * pix || r > Rm) { d1[o] = d1[o + 1] = d1[o + 2] = 170; d1[o + 3] = 255; continue; }   // 端面の外 (描かれない)
      const al = Math.atan2(z, y), rho = (r - ri) / tv;
      let b = 0.70 + 0.12 * (_cNoise(rho / 31 + 3.1) - 0.5) + 0.10 * (_cNoise(rho / 7) - 0.5) + 0.07 * (_cNoise(rho * 0.9 + 5.3) - 0.5)
        + 0.025 * Math.sin(al * 2 + _cNoise(rho / 40) * 6);
      if (gap > 0) {
        let th = (th0 - al) % TAU; if (th < 0) th += TAU;
        const s = (r - ri) / t - th / TAU, f = s - Math.floor(s), dd = Math.min(f, 1 - f);
        b -= gap * Math.exp(-((dd / 0.18) ** 2)) * (0.08 + 0.16 * _cNoise(rho * 0.8 + 13.7));
      }
      b = Math.max(0, Math.min(1, b));
      d1[o] = b * 247; d1[o + 1] = b * 250; d1[o + 2] = b * 255; d1[o + 3] = 255;
    }
  }
  g1.putImageData(im1, 0, 0); g2.putImageData(im2, 0, 0);
  const color = new THREE.CanvasTexture(c1); color.colorSpace = THREE.SRGBColorSpace;
  const aniso = new THREE.CanvasTexture(c2);
  color.anisotropy = aniso.anisotropy = 8;
  const res = { color, aniso }; _coilEndTex.set(key, res); return res;
}
// (u,v) ∈ [0,1]² の格子面。ext があれば頂点の範囲を記録する
function _coilGrid(nu, nv, fn, ext) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3), uv = new Float32Array((nu + 1) * (nv + 1) * 2), idx = [];
  let k = 0, m = 0;
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const o = fn(i / nu, j / nv);
    pos[k++] = o.p[0]; pos[k++] = o.p[1]; pos[k++] = o.p[2]; uv[m++] = o.uv[0]; uv[m++] = o.uv[1];
    if (ext) for (let a = 0; a < 3; a++) { if (o.p[a] < ext.min[a]) ext.min[a] = o.p[a]; if (o.p[a] > ext.max[a]) ext.max[a] = o.p[a]; }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * (nv + 1) + j, b = (i + 1) * (nv + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}
function _extBox(ext, x0, y0, z0, x1, y1, z1) {
  ext.min[0] = Math.min(ext.min[0], x0); ext.min[1] = Math.min(ext.min[1], y0); ext.min[2] = Math.min(ext.min[2], z0);
  ext.max[0] = Math.max(ext.max[0], x1); ext.max[1] = Math.max(ext.max[1], y1); ext.max[2] = Math.max(ext.max[2], z1);
}
function _coilMesh(geo, m) { const me = new THREE.Mesh(geo, m); me.castShadow = me.receiveShadow = true; return me; }
// コイル本体。返す Group の userData.coil に寸法・形状関数・頂点範囲 (ext)・質量 (kg, 比重2.70) を持たせる
function coilModel(P, { color = '#f3f5f6', nt = 240, colorable = true } = {}) {
  const MM = 0.001, TAU = Math.PI * 2, DEG = Math.PI / 180;
  const g = new THREE.Group(), ext = { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
  const ri = P.id / 2 * MM, t = P.t * MM, W = P.w * MM;
  const odR = Math.max(P.od / 2 * MM, ri + 4 * t);
  const n = Math.max(1, Math.round((odR - 2 * t - ri) / t));
  const Rc = ri + n * t, Ro = Rc + 2 * t;                                  // 最外周の1巻の下面 (巻き始め) ・実際の外半径
  const th0 = P.tailDeg * DEG, phi = Math.min(P.liftDeg * DEG, TAU * 0.9), L = P.lift * MM;
  const Rm = Ro + L + 0.05;                                                // 端面テクスチャの範囲
  const PA = (r, a, x) => [x, r * Math.cos(a), r * Math.sin(a)];            // 角度 a: +Y → +Z
  const P3 = (r, th, x) => PA(r, th0 - th, x);                             // th: 最外周の1巻の巻き角 (0 → 2π でテール端)
  const pUV = p => [p[1] / (2 * Rm) + 0.5, p[2] / (2 * Rm) + 0.5];
  const rb = th => Rc + t * th / TAU;                                      // 最外周の1巻の下 (1つ内側の巻きの外面)
  const lift = th => th > TAU - phi ? L * ((th - (TAU - phi)) / phi) ** 2 : 0;
  const ain = th => rb(th) + lift(th), aout = th => ain(th) + t;
  const tongue = (P.tongueDeg ?? 14) * DEG, Rref = Ro + L, rc = Math.min((P.cornerR || 0) * MM, W / 2);
  const shaped = tongue > 0 || rc > 0, NT = nt, NX = shaped ? 24 : 1;
  const XV = v => shaped ? 0.5 - 0.5 * Math.cos(Math.PI * v) : v;          // 板幅方向: 両端ほど細かく分割
  const tailTheta = v => {                                                 // テール端の巻き角: 中央が 2π、両端は tongue 手前 + 角部R
    const q = XV(v), dd = Math.min(q, 1 - q) * W;
    let th = TAU - tongue * (2 * q - 1) ** 2;
    if (rc > 0 && dd < rc) th -= (rc - Math.sqrt(Math.max(0, rc * rc - (rc - dd) ** 2))) / Rref;
    return th;
  };
  const XW = v => (XV(v) - 0.5) * W, thEdge = tailTheta(0);
  const brush = coilBrushTextures(), endT = coilEndTextures(ri, t, th0, Rm);
  const outerM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 1.0, roughness: 0.16, map: brush.color, roughnessMap: brush.rough,
    anisotropy: 0.18, clearcoat: 0.25, clearcoatRoughness: 0.08, side: THREE.DoubleSide });
  const edgeM = new THREE.MeshPhysicalMaterial({ color: 0xb9bdc2, metalness: 0.9, roughness: 0.5, side: THREE.DoubleSide });
  const endM = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 0.85, roughness: 0.42, map: endT.color, anisotropy: 0.6, anisotropyMap: endT.aniso, side: THREE.DoubleSide });
  const env = envBright(); outerM.envMap = edgeM.envMap = endM.envMap = env;   // 明るい室内を映す (元モデルの見え方)
  const add = (geo, m, col = true) => { const me = _coilMesh(geo, m); if (col && colorable) me.userData.colorable = true; g.add(me); return me; };
  // 最外周の1巻 (外面)
  add(_coilGrid(NT, NX, (u, v) => { const th = u * tailTheta(v); return { p: P3(aout(th), th, XW(v)), uv: [u, XV(v)] }; }, ext), outerM);
  // テール付近: 浮いた巻きの下面と、1つ内側の巻きの露出面 (浮きが無くても舌状・角部Rの切れ込みの下は見える)
  const t1 = L > 0 ? TAU - phi : Math.max(0, thEdge - 0.02), NL = Math.max(12, Math.round(NT * (TAU - t1) / TAU));
  if (L > 0) add(_coilGrid(NL, NX, (u, v) => { const th = t1 + u * Math.max(0, tailTheta(v) - t1); return { p: P3(ain(th), th, XW(v)), uv: [th / TAU, XV(v)] }; }, ext), outerM);
  add(_coilGrid(NL, 1, (u, v) => { const th = t1 + u * (TAU - t1); return { p: P3(rb(th), th, (v - 0.5) * W), uv: [th / TAU, v] }; }, ext), outerM);
  // テール端 (せん断面): 板厚方向に丸め、角部Rが板の側面に接する所では丸みを 0 に
  const NB = t > 0.003 ? 12 : 2, eR = t / 2 * (P.edgeRound || 0) / 100, hh = 1e-3;
  add(_coilGrid(NB, NX, (u, v) => {
    const th = tailTheta(v), a = u * Math.PI, rmid = ain(th) + t / 2;
    const v1 = Math.max(0, v - hh), v2 = Math.min(1, v + hh);
    const ds = (tailTheta(v2) - tailTheta(v1)) * Rref, dx = XW(v2) - XW(v1);
    const ns = Math.abs(dx) / (Math.hypot(ds, dx) || 1);                   // テール端の平面法線の周方向成分
    const r = rmid - (t / 2) * Math.cos(a), dth = eR * Math.sin(a) * ns / rmid;
    return { p: P3(r, th + dth, XW(v)), uv: [u, v] };
  }, ext), edgeM, false);
  // 内径
  add(_coilGrid(Math.round(NT / 2), 1, (u, v) => ({ p: P3(ri, u * TAU, (v - 0.5) * W), uv: [u, v] }), ext), outerM);
  // 両端面: 本体の円環 + 最外周の1巻の帯
  for (const x of [W / 2, -W / 2]) {
    add(_coilGrid(NT, 1, (u, v) => { const th = u * TAU, p = P3(ri + v * (rb(th) - ri), th, x); return { p, uv: pUV(p) }; }, ext), endM);
    add(_coilGrid(NT, 1, (u, v) => { const th = u * thEdge, p = P3(ain(th) + v * t, th, x); return { p, uv: pUV(p) }; }, ext), endM);
  }
  const mass = Math.PI * (Ro * Ro - ri * ri) * W * 2700;
  g.userData.coil = { ri, t, W, Ro, n, L, th0, ext, mass, PA };
  return g;
}
// 巻き終わりを留めるテープ (幅50mm, テール端をまたぐ)。n 本を板幅に均等配置
function coilTape(cg, { n = 3, tw = 0.05, span = 0.2, color = '#2f6fc0' } = {}) {
  const c = cg.userData.coil, M = mat(color, 0.6); M.side = THREE.DoubleSide;
  for (let i = 0; i < n; i++) {
    const x0 = (i - (n - 1) / 2) * c.W / n;
    cg.add(_coilMesh(_coilGrid(10, 1, (u, v) => ({ p: c.PA(c.Ro + 0.0006, c.th0 + (u - 0.5) * span, x0 + (v - 0.5) * tw), uv: [u, v] }), c.ext), M));
  }
}
// 端面の識別ラベル (合金・質別・寸法を印字した白ラベル)。a = 貼る角度, side = +1 / -1 (端面)
let _coilLabelTex = null;
function coilLabel(cg, { a = 0.55, side = 1 } = {}) {
  const c = cg.userData.coil;
  if (!_coilLabelTex) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160;
    const x = cv.getContext('2d');
    x.fillStyle = '#f6f4ee'; x.fillRect(0, 0, 256, 160);
    x.fillStyle = '#1d2733'; x.font = 'bold 30px Arial'; x.fillText('A1100-H14', 14, 40);
    x.font = '22px Arial'; x.fillText('1.0 × 1100 × C', 14, 74); x.fillText('NET 3,040 kg', 14, 102);
    for (let i = 0; i < 40; i++) x.fillRect(14 + i * 5.6, 118, (i * 7) % 3 + 1, 30);
    _coilLabelTex = new THREE.CanvasTexture(cv); _coilLabelTex.colorSpace = THREE.SRGBColorSpace; _coilLabelTex.anisotropy = 4;
  }
  const r = (c.ri + c.Ro) / 2, p = c.PA(r, a, side * (c.W / 2 + 0.0006));
  const lb = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.1), new THREE.MeshStandardMaterial({ map: _coilLabelTex, roughness: 0.8, side: THREE.DoubleSide }));
  lb.rotation.set(a, side * Math.PI / 2, 0);                                // Rx(a)·Ry(±90°): 法線 = ±X, 短辺 = 半径方向 (文字の上が外周側)
  lb.position.set(p[0], p[1], p[2]); cg.add(lb);
  _extBox(c.ext, p[0] - 0.001, p[1], p[2], p[0] + 0.001, p[1], p[2]);
}
// 帯鋼 (幅32mm・塗装): 外周を一周する輪 (x = 板幅方向の位置, 上でシール留め) と、内径を通して外周・両端面へ回すバンド
function _bandMat() { const m = mat('#3e434a', 0.4, 0.6, { env: 0.6 }); m.side = THREE.DoubleSide; return m; }
function coilBandRing(cg, x, M, bw = 0.032) {
  const c = cg.userData.coil, R = c.Ro + 0.0015;
  cg.add(_coilMesh(_coilGrid(120, 1, (u, v) => ({ p: c.PA(R, u * Math.PI * 2, x + (v - 0.5) * bw), uv: [u, v] }), c.ext), M));
  cg.add(plainBox(bw + 0.006, 0.004, 0.06, M, x, R + 0.002, 0));
  _extBox(c.ext, x - bw / 2 - 0.003, R, -0.03, x + bw / 2 + 0.003, R + 0.004, 0.03);
}
function coilBandEye(cg, a, M, bw = 0.032) {
  const c = cg.userData.coil, R = c.Ro + 0.0015, r = c.ri - 0.0015, xe = c.W / 2 + 0.0015;
  [R, r].forEach(rr => cg.add(_coilMesh(_coilGrid(1, 1, (u, v) => ({ p: c.PA(rr, a + (u - 0.5) * bw / rr, -xe + v * 2 * xe), uv: [u, v] }), c.ext), M)));
  [-xe, xe].forEach(x => cg.add(_coilMesh(_coilGrid(1, 1, (u, v) => { const rr = r + v * (R - r); return { p: c.PA(rr, a + (u - 0.5) * bw / rr, x), uv: [u, v] }; }, c.ext), M)));
}
// コイル (ローカル X 軸) を外形の中心に置いて最下点を床に合わせ、外形 w×d×h に収まるよう拡縮した Group を返す
function _coilPlaced(cg, w, d, h) {
  const e = cg.userData.coil.ext, out = new THREE.Group(), inner = new THREE.Group();
  inner.position.set(-(e.min[0] + e.max[0]) / 2, -e.min[1], -(e.min[2] + e.max[2]) / 2);
  inner.add(cg); out.add(inner);
  out.scale.set(w / (e.max[0] - e.min[0]), h / (e.max[1] - e.min[1]), d / (e.max[2] - e.min[2]));
  return out;
}
// アルミコイル (ホットコイル): 熱間圧延で巻き取った 内径508×外径1250×幅1100×板厚8mm (45巻・約3.0t, 整数巻きのため外径1244)。
// 巻き終わりが最後の90°で最大159mm浮き、テール端は舌状 (角部R150・板厚方向に丸い)。軸を左右 (X) にして床に置いた状態。
// 外形の奥行はテールの浮きを含む
function buildAluminumCoil({ color='#f3f5f6', w=1.1, d=1.403, h=1.244 } = {}) {
  return _coilPlaced(coilModel(COIL_HOT, { color }), w, d, h);
}
// アルミ製品コイル: ホットコイルを冷間圧延で板厚1.0mmにして巻き直したもの (370巻・板の長さ約1024m・約3.0t)。
// テールは真っすぐ切りそろえて浮かせず 3 か所をテープで留め、端面に識別ラベル
function buildProductCoil({ color='#f3f5f6', w=1.1, d=1.25, h=1.25 } = {}) {
  const cg = coilModel(COIL_PROD, { color });
  coilTape(cg); coilLabel(cg);
  return _coilPlaced(cg, w, d, h);
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

// バンド掛けアルミコイル: 製品コイル (テープ留め) に帯鋼 (幅32mm) を外周3本 (上でシール留め) + 内径を通して前後2本掛けた出荷前の状態
function buildBandedAlumCoil({ color='#f3f5f6', w=1.103, d=1.253, h=1.2555 } = {}) {
  const cg = coilModel(COIL_PROD, { color });
  coilTape(cg); coilLabel(cg, { a: 0.3 });
  const M = _bandMat();
  [-0.38, 0, 0.38].forEach(x => coilBandRing(cg, x, M));
  [Math.PI * 0.42, Math.PI * 1.42].forEach(a => coilBandEye(cg, a, M));
  return _coilPlaced(cg, w, d, h);
}

// 梱包済みアルミコイル: 製品コイル (内径508×外径1250×幅1100) を防錆紙 (VCI) で外周・端面・内径まで包み, 角に紙製のエッジプロテクター,
// 外周バンド 2 本 + 内径を通すバンド 2 本。軸を左右 (X) にして前後 2 本の枕木に載せた出荷形態 (外形は包装・枕木を含む)
function _bandRingY(cg, R, y, M) {                                   // ローカル Y = コイル軸 の円筒に掛ける輪 + シール
  const b = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.032, 72, 1, true), M); b.position.y = y; cg.add(b);
  cg.add(plainBox(0.006, 0.036, 0.05, M, R + 0.003, y, 0));
}
function _bandEyeY(cg, R, r, L, ang, M) {                            // 内径を通して外周・端面へ回すバンド
  const hold = new THREE.Group(); hold.rotation.y = ang; cg.add(hold);
  hold.add(plainBox(0.032, L + 0.004, 0.0025, M, 0, 0, R + 0.0015));
  hold.add(plainBox(0.032, L + 0.004, 0.0025, M, 0, 0, r - 0.0015));
  [-1, 1].forEach(s => hold.add(plainBox(0.032, 0.0025, R - r + 0.003, M, 0, s * (L / 2 + 0.0015), (R + r) / 2)));
}
function buildPackagedAlumCoil({ color='#b4a478', w=1.14, d=1.286, h=1.308 } = {}) {
  const g = new THREE.Group();
  const Ro = COIL_PROD.od / 2000, r = COIL_PROD.id / 2000, L = COIL_PROD.w / 1000, pk = 0.012, Rp = Ro + pk;
  const z0 = 0.28, SH = 0.09, cy = SH + Math.sqrt(Rp * Rp - z0 * z0);          // 枕木 (z = ±z0) の上に載る高さ
  const paper = mat(color, 0.92, 0), edgeM = mat('#8a7a5a', 0.85), woodM = mat('#b88a58', 0.85), bandM = _bandMat(); paper.side = THREE.DoubleSide;
  const cg = new THREE.Group(); cg.position.set(0, cy, 0); cg.rotation.z = Math.PI / 2; g.add(cg);   // ローカル Y (= コイル軸) → X
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(Rp, Rp, L + 2 * pk, 72, 1, true), paper); wrap.castShadow = wrap.receiveShadow = true; wrap.userData.colorable = true; cg.add(wrap);
  cg.add(new THREE.Mesh(new THREE.CylinderGeometry(r - 0.004, r - 0.004, L + 2 * pk, 40, 1, true), paper));
  [-1, 1].forEach(s => {
    const f = new THREE.Mesh(new THREE.RingGeometry(r - 0.004, Rp, 72, 1), paper); f.rotation.x = -s * Math.PI / 2; f.position.y = s * (L / 2 + pk); f.userData.colorable = true; cg.add(f);
    const e = new THREE.Mesh(new THREE.TorusGeometry(Rp - 0.01, 0.016, 4, 72), edgeM); e.rotation.x = Math.PI / 2; e.position.y = s * (L / 2 + pk - 0.008); cg.add(e);   // エッジプロテクター
    const ei = new THREE.Mesh(new THREE.TorusGeometry(r + 0.006, 0.012, 4, 40), edgeM); ei.rotation.x = Math.PI / 2; ei.position.y = s * (L / 2 + pk - 0.006); cg.add(ei);
  });
  [-0.3, 0.3].forEach(k => _bandRingY(cg, Rp + 0.003, k * L, bandM));
  [0.35, 0.35 + Math.PI].forEach(a => _bandEyeY(cg, Rp + 0.001, r - 0.004, L + 2 * pk, a, bandM));
  g.add(plainBox(0.004, 0.1, 0.16, mat('#f8f4e8', 0.88), L / 2 + pk + 0.003, cy + (Rp + r) / 2, 0));   // 出荷ラベル (端面の上側)
  [-1, 1].forEach(s => g.add(plainBox(L + 2 * pk, SH, 0.09, woodM, 0, SH / 2, s * z0)));              // 枕木 (軸方向)
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  const W0 = L + 2 * pk + 0.016, D0 = 2 * (Rp + 0.006), H0 = cy + Rp + 0.009;             // 包装・エッジプロテクター・シールを含む外形
  g.scale.set(w / W0, h / H0, d / D0);
  return g;
}

// 輸出梱包アルミコイル (タカムラ産業 2006: コイル 径650〜1080・幅170〜260mm・1巻160〜230kg を 3〜4 巻, 梱包外寸 1100×1100×710〜1220mm):
// アイトゥスカイ (軸を鉛直) に 3 巻 (内径508×外径800×幅250mm・板厚1.0mm, 1巻約200kg) を重ね, 上下を木製パレットで挟み,
// 外周をハードボードで巻いて帯鋼で締めた梱包。上のパレットは板の隙間からコイルの上面 (巻き目の端面) が見える
const COIL_EXPORT = { id: 508, od: 800, w: 250, t: 1.0, lift: 0, liftDeg: 90, tailDeg: 30, cornerR: 0, edgeRound: 0, tongueDeg: 0 };
function buildExportAlumCoil({ color='#c0a870', w=1.1, d=1.1, h=1.0 } = {}) {
  const g = new THREE.Group();
  const woodM = mat(color, 0.85, 0), woodD = mat(shade(color, 0.78), 0.9, 0), hb = mat('#7a5a3c', 0.8, 0), bandM = mat('#3e434a', 0.4, 0.6, { env: 0.6 });
  hb.side = THREE.DoubleSide;
  const pb = 0.12, pt = 0.1, R = COIL_EXPORT.od / 2000, cw = COIL_EXPORT.w / 1000, sep = 0.005;
  // 下パレット: デッキボード 7 枚 + 桁 3 本 + 下板
  const deck = (y, n, bw, M) => { for (let i = 0; i < n; i++) g.add(plainBox(bw, 0.02, d, M, -w / 2 + bw / 2 + i * (w - bw) / (n - 1), y, 0)); };
  deck(pb - 0.01, 7, 0.1, woodM);
  [-1, 0, 1].forEach(k => g.add(plainBox(w, pb - 0.04, 0.09, woodD, 0, 0.02 + (pb - 0.04) / 2, k * (d / 2 - 0.045))));
  deck(0.01, 3, 0.1, woodM);
  // コイル 3 巻 (アイトゥスカイ: コイル軸 X を鉛直に) + 間の当て板。最上段は巻き終わりをテープで留める
  let y = pb;
  for (let i = 0; i < 3; i++) {
    y += sep;
    const cg = coilModel(COIL_EXPORT, { color: '#f3f5f6', nt: 160, colorable: false });
    if (i === 2) coilTape(cg, { n: 1, tw: 0.04 });
    cg.rotation.z = Math.PI / 2; cg.position.set(0, y + cw / 2, 0); g.add(cg); y += cw;
    g.add(new THREE.Mesh(new THREE.RingGeometry(COIL_EXPORT.id / 2000, R, 48, 1), hb).rotateX(-Math.PI / 2).translateZ(y + sep / 2));
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

// 横倒しアルミコイル: バンド掛けした製品コイルを横倒し (目を上に向け, 端面を下にして置く) にし, 1300角の木製パレットに載せた状態。
// 内径を通す帯鋼 4 本 + 外周 1 本で締め, 上面 (端面) に識別ラベル。外形はパレットを含む
function buildAlumCoilSide({ color='#f3f5f6', w=1.3, d=1.3, h=1.243 } = {}) {
  const g = new THREE.Group();
  const PW = 1.3, PH = 0.14, woodM = mat('#c9a26a', 0.85), woodD = mat(shade('#c9a26a', 0.78), 0.9);
  for (let i = 0; i < 9; i++) g.add(plainBox(0.1, 0.022, PW, woodM, -PW / 2 + 0.05 + i * (PW - 0.1) / 8, PH - 0.011, 0));     // 上面デッキ
  [-1, 0, 1].forEach(k => g.add(plainBox(PW, PH - 0.044, 0.09, woodD, 0, 0.022 + (PH - 0.044) / 2, k * (PW / 2 - 0.045))));     // 桁
  [-1, 0, 1].forEach(k => g.add(plainBox(0.12, 0.022, PW, woodM, k * (PW / 2 - 0.06), 0.011, 0)));                             // 下板
  const cg = coilModel(COIL_PROD, { color });
  coilTape(cg); coilLabel(cg, { a: 2.2 });
  const M = _bandMat();
  coilBandRing(cg, 0.15, M);
  [0.3, 0.3 + Math.PI / 2, 0.3 + Math.PI, 0.3 + Math.PI * 1.5].forEach(a => coilBandEye(cg, a, M));
  const c = cg.userData.coil;
  cg.rotation.z = Math.PI / 2;                                             // コイル軸 X → 鉛直。端面 +X が上面になる
  cg.position.set(0, PH + 0.0015 + c.W / 2, 0); g.add(cg);
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  const H0 = PH + c.W + 0.003;                                             // パレット + コイル + 上下の帯鋼
  g.scale.set(w / PW, h / H0, d / PW);
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

export { buildAlumCoilSide, buildAluminumCoil, buildBandedAlumCoil, buildProductCoil, buildCNCMachine, buildCNCMachiningCenter, buildControlPanel, buildConveyor, buildDrum, buildExportAlumCoil, buildFireExtinguisher, buildForklift, buildIndustrialFurnace, buildIndustrialRobot, buildIndustrialRobotLg, buildInjectionMolder, buildJibCrane, buildLargeHydraulicPress, buildPackagedAlumCoil, buildPalletRack, buildResinPallet, buildScrapBucket, buildSteelPallet, buildTensileTestMachine, buildToolCabinet, buildWoodPallet, buildWorkbench, buildWorker };
