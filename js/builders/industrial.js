import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';
import { buildPerson } from './kawaii.js';

function buildWorkbench({ color='#6b7280', w=1.5, d=0.75, h=0.9 } = {}) {
  const g = new THREE.Group();
  const steel = mat('#5a6474', 0.28, 0.72);
  const darkM = mat('#3a4252', 0.32, 0.65);

  // Thick steel work surface
  const top = box(w, 0.07, d, mat(color, 0.35, 0.5), 0, h - 0.035, 0);
  top.userData.colorable = true; g.add(top);

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

  // Lower shelf
  g.add(box(w - 0.16, 0.04, d - 0.16, mat(shade(color, 0.72), 0.55, 0.35), 0, sY + 0.045, 0));

  // Back pegboard panel
  const pbH = 0.62, pbZ = d / 2 - 0.011;
  const pbY = h + pbH / 2 - 0.02;
  g.add(box(w - 0.1, pbH, 0.022, mat('#8a9aaa', 0.65, 0.15), 0, pbY, pbZ));
  for (let px = -(w / 2 - 0.16); px <= (w / 2 - 0.16); px += 0.095) {
    for (let py = h + 0.06; py <= h + pbH - 0.09; py += 0.095) {
      g.add(box(0.018, 0.018, 0.009, mat('#2a3038', 0.9, 0), px, py, pbZ + 0.012));
    }
  }
  [-0.45, -0.15, 0.18, 0.42].forEach((px, i) => {
    g.add(box(0.014, 0.038, 0.09, mat('#b8c0ca', 0.22, 0.88), px, h + 0.1 + i * 0.09, pbZ + 0.055));
  });

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

function buildToolCabinet({ color='#d4690a', w=0.7, d=0.45, h=1.12 } = {}) {
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

  // 7 drawers with recessed panels and bar handles
  const numDr = 7;
  const drH = (bodyH - 0.06) / numDr;
  const drGap = 0.011;
  for (let i = 0; i < numDr; i++) {
    const dy = bodyBase + 0.03 + drH * (i + 0.5);
    const drFront = box(w - 0.04, drH - drGap, 0.03, mat(shade(color, 1.06), 0.38, 0.52), 0, dy, d / 2 + 0.001);
    drFront.userData.colorable = true; g.add(drFront);
    // Recessed inset
    g.add(box(w - 0.1, drH - drGap - 0.03, 0.01, mat(shade(color, 0.84), 0.44, 0.48), 0, dy, d / 2 + 0.008));
    // Bar handle
    const bar = cyl(0.007, 0.007, w - 0.22, 10, chrM);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, dy, d / 2 + 0.03); g.add(bar);
    // Handle bracket posts + end knobs
    [-(w / 2 - 0.15), (w / 2 - 0.15)].forEach(hx => {
      g.add(box(0.01, 0.016, 0.022, chrM, hx, dy, d / 2 + 0.021));
      const knb = cyl(0.011, 0.011, 0.01, 8, chrM);
      knb.rotation.z = Math.PI / 2; knb.position.set(hx, dy, d / 2 + 0.031); g.add(knb);
    });
  }

  // Vertical lock bar (right side)
  g.add(box(0.015, bodyH - 0.06, 0.015, chrM, w / 2 - 0.015, bCY, d / 2 + 0.008));
  g.add(box(0.022, 0.036, 0.022, darkM, w / 2 - 0.015, bodyBase + bodyH * 0.52, d / 2 + 0.018));

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

function buildCNCMachine({ color='#3d6b7a', w=1.2, d=1.0, h=1.54 } = {}) {
  const g = new THREE.Group();
  const bM  = mat(color, 0.4, 0.25);
  const dkM = mat('#2a3038', 0.5, 0.2);
  const glM = new THREE.MeshStandardMaterial({
    color: 0x88aacc, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32
  });

  // Base chip/coolant tray (lowest plinth)
  g.add(box(w + 0.04, 0.1, d + 0.04, dkM, 0, 0.05, 0));
  [[-w/2+0.14,-d/2+0.14],[w/2-0.14,-d/2+0.14],[-w/2+0.14,d/2-0.14],[w/2-0.14,d/2-0.14]].forEach(([fx,fz]) => {
    g.add(box(0.07, 0.04, 0.07, dkM, fx, 0.02, fz));
  });

  // Main enclosure body
  const body = box(w, h - 0.1, d, bM, 0, (h - 0.1) / 2 + 0.05, 0);
  body.userData.colorable = true; g.add(body);

  // Top cover
  g.add(box(w + 0.02, 0.09, d + 0.02, dkM, 0, h - 0.045, 0));

  // Front door frame + glass window (left-center position, panel to right)
  const dW = w * 0.58, dH = h * 0.5, dY = h * 0.44, dZ = d / 2 + 0.012;
  const dX = -w * 0.08;
  g.add(box(dW + 0.06, dH + 0.06, 0.028, mat('#2e3848', 0.4, 0.35), dX, dY, dZ));
  g.add(box(dW, dH, 0.016, glM, dX, dY, dZ + 0.022));

  // Inside: work table + spindle (visible through window)
  g.add(box(0.5, 0.05, 0.38, mat('#4a5460', 0.45, 0.4), dX, 0.38, 0.06));
  const sp = cyl(0.04, 0.06, 0.26, 12, mat('#aab4c0', 0.2, 0.72));
  sp.position.set(dX, 1.0, 0.04); g.add(sp);
  g.add(box(0.1, 0.18, 0.1, mat('#5a6474', 0.35, 0.5), dX, 1.15, 0.04));

  // Control pendant (front-right, on machine face)
  const pX = w * 0.32;
  g.add(box(0.24, 0.48, 0.07, dkM, pX, dY, dZ + 0.005));
  // Pendant screen
  g.add(box(0.18, 0.2, 0.014, mat('#0a1420', 0.08, 0.1), pX, dY + 0.06, dZ + 0.044));
  // Pendant buttons
  [[0, -0.1], [-0.06, -0.02], [0.06, -0.02], [0, 0.1]].forEach(([bx, by]) => {
    const col = by > 0.06 ? '#22c55e' : by < -0.06 ? '#ef4444' : '#3b82f6';
    g.add(cylAt(0.015, 0.015, 0.018, 8, mat(col, 0.5, 0.1), pX + bx, dY + by, dZ + 0.05));
  });
  // Emergency stop (large red mushroom button)
  g.add(cylAt(0.038, 0.038, 0.032, 12, mat('#ef4444', 0.38, 0.08), pX, dY - 0.2, dZ + 0.05));

  // Status light bar (across top of door frame)
  g.add(box(dW + 0.02, 0.028, 0.042, mat('#22c55e', 0.3, 0.1), dX, dY + dH / 2 + 0.04, dZ + 0.01));

  // Coolant nozzle (lower-left front)
  const cn = cyl(0.014, 0.02, 0.12, 8, mat('#7a8898', 0.3, 0.6));
  cn.rotation.x = -Math.PI / 4; cn.position.set(-w / 2 + 0.12, 0.55, d / 2 - 0.04); g.add(cn);

  return g;
}

function buildPalletRack({ color='#e06010', w=1.7, d=0.5, h=2.46 } = {}) {
  const g = new THREE.Group();
  const steelM = mat('#7a8898', 0.28, 0.68);
  const beamM  = mat(color, 0.38, 0.45);

  const upW = 0.07;
  const lx  = w / 2 - upW / 2;   // ±X of left/right post pairs
  const fz  = -d / 2 + upW / 2;  // front Z
  const bz  =  d / 2 - upW / 2;  // back Z
  const innerW = w - upW;         // clear span between post faces

  // 4 upright posts (front+back on each side)
  [[-lx, fz], [-lx, bz], [lx, fz], [lx, bz]].forEach(([x, z]) => {
    g.add(box(upW, h, upW, steelM, x, h / 2, z));
  });

  // X-bracing within each side frame (left frame and right frame)
  const frameD = bz - fz;
  const nSect  = 3;
  const sH     = h / nSect;
  const diagLen = Math.sqrt(frameD * frameD + sH * sH);
  const angle   = Math.atan2(frameD, sH);

  [-lx, lx].forEach(x => {
    for (let s = 0; s < nSect; s++) {
      const cy = s * sH + sH / 2;
      const b1 = box(0.022, diagLen, 0.022, steelM, x, cy, 0);
      b1.rotation.x = angle; g.add(b1);
      const b2 = box(0.022, diagLen, 0.022, steelM, x, cy, 0);
      b2.rotation.x = -angle; g.add(b2);
    }
  });

  // Horizontal top ties connecting left/right and front/back
  [fz, bz].forEach(z => g.add(box(w - upW, 0.04, 0.04, steelM, 0, h - 0.02, z)));
  [-lx, lx].forEach(x => g.add(box(0.04, 0.04, d - upW, steelM, x, h - 0.02, 0)));

  // Step beams + wire decking at 3 storage levels
  [0.45, 1.24, 2.02].forEach(sy => {
    [fz, bz].forEach(z => {
      // C-section step beam: web face + top lip
      const bw = box(innerW, 0.1, 0.022, beamM, 0, sy + 0.05, z);
      bw.userData.colorable = true; g.add(bw);
      g.add(box(innerW, 0.018, 0.052, beamM, 0, sy + 0.1, z));
      // Connector hook plates at each end
      [-innerW / 2, innerW / 2].forEach(bx => {
        g.add(box(0.028, 0.088, 0.026, mat('#4a5868', 0.3, 0.68), bx, sy + 0.044, z));
      });
    });

    // Wire deck (thin slab + longitudinal wires)
    const deckY = sy + 0.108;
    g.add(box(innerW, 0.01, d - upW, mat('#7a8898', 0.52, 0.42), 0, deckY, 0));
    for (let wx = -innerW / 2 + 0.08; wx < innerW / 2; wx += 0.1) {
      g.add(plainBox(0.007, 0.013, d - upW, mat('#5a6878', 0.45, 0.5), wx, deckY + 0.009, 0));
    }
    for (let wz = fz + 0.05; wz < bz; wz += 0.07) {
      g.add(plainBox(innerW, 0.013, 0.007, mat('#5a6878', 0.45, 0.5), 0, deckY + 0.009, wz));
    }

    // Pallet suggestion (semi-transparent wood-colored block)
    g.add(box(innerW - 0.08, 0.1, d - upW - 0.06, mat('#b89858', 0.82, 0), 0, deckY + 0.06, 0));
  });

  return g;
}

function buildControlPanel(color) {
  const g = new THREE.Group();
  const cabinet = box(0.8, 1.8, 0.45, mat(color, 0.4, 0.3), 0, 0.9, 0); cabinet.userData.colorable = true; g.add(cabinet);
  const top = box(0.82, 0.06, 0.47, mat('#222', 0.5, 0.3), 0, 1.83, 0); g.add(top);
  const door = box(0.68, 1.5, 0.02, mat('#d4dae0', 0.3, 0.4), 0, 0.85, 0.235); g.add(door);
  // indicators
  const colors = ['#22c55e','#22c55e','#f59e0b','#ef4444','#3b82f6'];
  colors.forEach((cl, i) => {
    const ind = cyl(0.022, 0.022, 0.04, 8, mat(cl, 0.3, 0.2));
    ind.rotation.z = Math.PI/2; ind.position.set(0.25 - i*0.1, 1.35, 0.248); g.add(ind);
  });
  // switches
  for (let i = 0; i < 6; i++) {
    const sw = box(0.04, 0.08, 0.03, mat('#555', 0.5, 0.3), -0.25 + (i%3)*0.24, 0.9 + Math.floor(i/3)*0.18, 0.248); g.add(sw);
  }
  // display screen
  const screen = box(0.5, 0.26, 0.015, mat('#001a1a', 0.9, 0.1), 0, 1.1, 0.24);
  g.add(screen);
  // base
  const base = box(0.82, 0.06, 0.47, mat('#222', 0.5, 0.2), 0, 0.03, 0); g.add(base);
  return g;
}

function buildCNCMachiningCenter({ color='#e8e2d6', w=3.0, d=2.2, h=2.8 } = {}) {
  const g = new THREE.Group();
  // ---- materials (off-white sheet-metal body + charcoal base, per VC-850 reference) ----
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
  const baseH = 0.78, encTop = 2.0;
  const encH = encTop - baseH, encY = baseH + encH / 2;             // cream cabinet band
  const leftW = 1.0, rightW = 1.1;
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
  // nameplate (VC-850) via canvas texture
  const nameCv = document.createElement('canvas'); nameCv.width = 384; nameCv.height = 128;
  const nctx = nameCv.getContext('2d');
  nctx.fillStyle = '#e8e2d6'; nctx.fillRect(0,0,384,128);
  nctx.fillStyle = '#1c1c1c'; nctx.font = 'bold 76px Arial'; nctx.fillText('VC-850', 14, 70);
  nctx.font = 'bold 26px Arial'; nctx.fillStyle = '#3a3a3a'; nctx.fillText('CNC MACHINING CENTER', 16, 108);
  const nameTex = new THREE.CanvasTexture(nameCv); nameTex.anisotropy = 4;
  const namePlane = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.24), new THREE.MeshBasicMaterial({ map: nameTex }));
  namePlane.position.set(leftX - 0.1, encY + 0.40, fz + 0.012); g.add(namePlane);
  // viewing window (dark frame + glass)
  g.add(box(0.36, 0.30, 0.03, dark, leftX - 0.2, encY + 0.02, fz + 0.006));
  const lwin = plainBox(0.30, 0.24, 0.01, glass, leftX - 0.2, encY + 0.02, fz + 0.02);
  lwin.castShadow = false; g.add(lwin);
  // warning label cluster (orange stickers with header bar)
  [0.16, -0.02, -0.20].forEach((ly, i) => {
    g.add(box(0.16, 0.14, 0.008, mat('#f0f0ea',0.6), leftX + 0.32, encY + ly, fz + 0.006));
    g.add(box(0.16, 0.03, 0.009, mat('#e08a10',0.5), leftX + 0.32, encY + ly + 0.055, fz + 0.007));
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
  // machine vise on the table
  const viseY = tableY + 0.05;
  g.add(box(0.46, 0.13, 0.30, grayL, openCx, viseY + 0.065, 0.04));               // vise base
  g.add(box(0.12, 0.18, 0.32, grayC, openCx - 0.15, viseY + 0.13, 0.04));          // fixed jaw
  g.add(box(0.12, 0.18, 0.32, grayC, openCx + 0.07, viseY + 0.13, 0.04));          // movable jaw
  g.add(box(0.14, 0.10, 0.20, steel, openCx - 0.04, viseY + 0.155, 0.04));         // workpiece

  // spindle head (Z-axis) + cross rail
  const headY = 1.42;
  g.add(box(openW - 0.16, 0.20, 0.42, grayC, openCx, openTopY - 0.02, -d/2 + 0.34)); // Z-slide on column
  g.add(box(0.52, 0.46, 0.46, grayL, openCx, headY, -0.02));                          // spindle head box
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

  // ---- top spindle-drive column housing (gray, rear-center) ----
  g.add(box(0.92, 0.62, 0.72, grayC, openCx, encTop + 0.27, -0.18));
  g.add(box(0.6, 0.22, 0.56, grayL, openCx, encTop + 0.66, -0.18));   // top cap

  // ---- ATC tool carousel (dark drum with yellow tool pockets) ----
  const atc = new THREE.Group(); atc.position.set(openR + 0.42, encTop + 0.18, -0.05); atc.rotation.x = -0.5;
  atc.add(cyl(0.38, 0.38, 0.12, 30, dark));
  atc.add(cyl(0.12, 0.12, 0.16, 16, grayL));
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2;
    atc.add(cylAt(0.03, 0.03, 0.1, 8, yellow, Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32));
  }
  g.add(atc);

  // ---- tri-color signal stack light on chrome pole (top-right) ----
  const lx = w/2 - 0.28, lz = d/2 - 0.32;
  g.add(cylAt(0.022, 0.022, 0.46, 12, chrome, lx, encTop + 0.23, lz));
  let ly = encTop + 0.5;
  [['#ef4444', 0.9], ['#f5b800', 0.85], ['#22c55e', 0.85]].forEach(([c, ei]) => {
    g.add(cylAt(0.05, 0.05, 0.12, 16, mat(c, 0.3, 0.1, { emissive: c, emissiveIntensity: ei }), lx, ly, lz));
    ly += 0.13;
  });
  g.add(cylAt(0.04, 0.04, 0.04, 12, dark, lx, ly + 0.01, lz));        // top cap

  // ---- CNC control panel (right side, angled toward operator) ----
  const pan = new THREE.Group(); pan.position.set(rightX - 0.05, encY + 0.06, fz + 0.05); pan.rotation.y = -0.16; g.add(pan);
  pan.add(box(0.92, 1.06, 0.09, dark, 0, 0, 0));                      // panel housing
  pan.add(box(0.84, 0.98, 0.02, mat('#23272c', 0.5), 0, 0, 0.055));   // bezel
  // display screen (canvas texture: X/Y/Z readout)
  const sCv = document.createElement('canvas'); sCv.width = 256; sCv.height = 192;
  const sctx = sCv.getContext('2d');
  sctx.fillStyle = '#0a161e'; sctx.fillRect(0, 0, 256, 192);
  sctx.fillStyle = '#163a2a'; sctx.fillRect(8, 8, 240, 30);
  sctx.fillStyle = '#7fd6a8'; sctx.font = '16px monospace'; sctx.fillText('VC-850  AUTO', 16, 30);
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

  // ---- handheld pendant on cable (right) ----
  const pcable = cyl(0.012, 0.012, 0.42, 8, dark); pcable.position.set(rightX + 0.32, encY - 0.36, fz + 0.04); g.add(pcable);
  g.add(box(0.1, 0.2, 0.05, mat('#2a2e33', 0.5), rightX + 0.34, encY - 0.66, fz + 0.07));
  g.add(box(0.07, 0.07, 0.01, screenMat, rightX + 0.34, encY - 0.61, fz + 0.1));

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
function buildLargeHydraulicPress({ color='#c2c4be', w=3.2, d=2.6, h=5.5 } = {}) {
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
  const cabX = w/2 + 0.82, cabH = 2.4;
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
function buildIndustrialFurnace({ color='#2a2a2a', w=2.0, d=1.5, h=2.2 } = {}) {
  const g = new THREE.Group();
  const shell = mat(color, 0.55, 0.15);
  const insul = mat('#c86820', 0.9, 0.0);  // refractory brick orange-red
  const steel = mat('#8a9aa8', 0.3, 0.6);
  const glow  = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: new THREE.Color(0xff4400), emissiveIntensity: 0.8, roughness: 0.9 });
  const dark  = mat('#111316', 0.8, 0.1);
  // outer shell
  const outer = box(w, h, d, shell, 0, h/2, 0); outer.userData.colorable=true; g.add(outer);
  // ---- front opening with VISIBLE glowing furnace interior ----
  const openW = w * 0.62, openH = h * 0.5, openY = h * 0.4;
  // recessed steel frame around the opening
  g.add(box(openW + 0.1, openH + 0.1, 0.05, dark, 0, openY, d/2 - 0.005));
  // refractory-lined throat (orange brick) receding into the body
  g.add(box(openW + 0.02, openH + 0.02, d * 0.5, insul, 0, openY, d * 0.18));
  // glowing chamber face flush at the opening (this is what reads as "the fire")
  const chamberFace = box(openW, openH, 0.05, glow, 0, openY, d/2 - 0.04); g.add(chamberFace);
  // glowing molten depth behind the face
  const chamber = box(openW * 0.88, openH * 0.88, d * 0.45, glow, 0, openY, d * 0.12); g.add(chamber);
  // ---- door swung open on a left-side hinge, revealing the glow ----
  const doorGroup = new THREE.Group();
  doorGroup.position.set(-openW/2 - 0.05, openY, d/2 + 0.04);
  const doorPanel = box(openW, openH + 0.08, 0.07, mat('#1a1a1a',0.6,0.2), openW/2, 0, 0); doorGroup.add(doorPanel);
  // refractory lining on the door's inner face (faces the chamber when shut)
  doorGroup.add(box(openW * 0.9, openH * 0.86, 0.035, insul, openW/2, 0, -0.05));
  // door handle on the outer face
  doorGroup.add(box(0.04, 0.04, 0.16, steel, openW - 0.05, 0, 0.07));
  doorGroup.rotation.y = -0.95; // swung outward ~54°
  g.add(doorGroup);
  // exhaust duct on top
  g.add(box(0.3, 0.55, 0.22, dark, w*0.35, h + 0.27, 0));
  const chimney = cyl(0.1, 0.1, 0.4, 14, dark); chimney.position.set(w*0.35, h+0.58, 0); g.add(chimney);
  // thermocouple port (right side, upper zone)
  g.add(cylAt(0.016,0.016,0.1,8,steel,w/2,h*0.72,0.18).rotateZ(Math.PI/2));
  // gas/electric inlet fitting (rear lower)
  g.add(cylAt(0.020,0.020,0.09,10,steel,0.2,h*0.22,-d/2).rotateX(Math.PI/2));
  // temperature controller panel (right side)
  const ctrl = box(0.35, 0.65, 0.06, dark, w/2 - 0.02, h*0.68, -0.3); g.add(ctrl);
  g.add(box(0.26, 0.3, 0.04, mat('#0d1520',0.3), w/2-0.02, h*0.75, -0.26));
  ['#ef4444','#f59e0b','#22c55e'].forEach((cl,i)=>g.add(cylAt(0.015,0.015,0.025,8,mat(cl,0.2),w/2-0.02,h*0.6-i*0.05,-0.24).rotateX(Math.PI/2)));
  // cooling water pipes
  [-0.3, 0.3].forEach(z => {
    g.add(cylAt(0.025,0.025,h-0.1,12,steel, -w/2-0.02, (h-0.1)/2, z).rotateX(0));
    g.add(cylAt(0.025,0.025,0.25,8,steel,-w/2-0.02,h-0.18,z).rotateZ(Math.PI/2));
  });
  // base frame / legs
  [[-w/2+0.12,d/2-0.1],[w/2-0.12,d/2-0.1],[-w/2+0.12,-d/2+0.1],[w/2-0.12,-d/2+0.1]].forEach(([x,z])=>g.add(box(0.1,0.12,0.1,dark,x,0.06,z)));
  g.userData.parts = { door: doorGroup };
  return g;
}
function buildInjectionMolder({ color='#e8e4dc', w=3.5, d=1.5, h=2.2 } = {}) {
  const g = new THREE.Group();
  // horizontal injection molding machine (TOYO Si-180 style): off-white shrouds,
  // blue safety guard, charcoal machine bed, stainless hopper. Clamp LEFT, injection RIGHT.
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
  // nameplate "Si-180-6 / TOYO PLASTAR"
  const nCv = document.createElement('canvas'); nCv.width = 384; nCv.height = 192;
  const nx = nCv.getContext('2d'); nx.fillStyle = '#e8e4dc'; nx.fillRect(0,0,384,192);
  nx.fillStyle = '#23262b'; nx.font = 'bold 64px Arial'; nx.fillText('Si-180-6', 20, 78);
  nx.fillStyle = '#2c4fa0'; nx.font = 'bold 40px Arial'; nx.fillText('TOYO', 20, 132);
  nx.fillStyle = '#23262b'; nx.font = 'bold 30px Arial'; nx.fillText('PLASTAR', 20, 168);
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
  // 4 chrome tie bars running along x
  [[0.32,0.32],[0.32,-0.32],[-0.32,0.32],[-0.32,-0.32]].forEach(([dy,tz]) => {
    const tb = cyl(0.045, 0.045, 1.5, 14, chrome); tb.rotation.z = Math.PI/2; tb.position.set(-0.55, moldY + dy, tz); g.add(tb);
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
  sc.fillStyle = '#ffffff'; sc.font = '12px Arial'; sc.fillText('TOYO Si-180', 6, 16);
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
  // injection unit base / tilt cradle (dark)
  g.add(box(1.1, 0.18, d - 0.2, charc, 1.05, deckY + 0.08, 0));
  g.add(box(0.5, 0.16, d - 0.34, charc2, 1.05, deckY + 0.2, 0));
  // off-white barrel shroud
  const injCx = 1.1;
  const injShroud = new THREE.Mesh(roundedBoxGeom(1.0, 0.6, d - 0.16, 0.1, 4), body);
  injShroud.position.set(injCx, deckY + 0.5, 0); injShroud.castShadow = true; g.add(injShroud);
  // "180 / TOYO PLASTAR" label
  const iCv = document.createElement('canvas'); iCv.width = 256; iCv.height = 160;
  const ix = iCv.getContext('2d'); ix.fillStyle = '#e8e4dc'; ix.fillRect(0,0,256,160);
  ix.fillStyle = '#23262b'; ix.font = 'bold 80px Arial'; ix.fillText('180', 16, 80);
  ix.fillStyle = '#2c4fa0'; ix.font = 'bold 34px Arial'; ix.fillText('TOYO', 18, 120);
  ix.fillStyle = '#23262b'; ix.font = 'bold 24px Arial'; ix.fillText('PLASTAR', 18, 148);
  const iTex = new THREE.CanvasTexture(iCv); iTex.anisotropy = 4;
  const iPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.31), new THREE.MeshBasicMaterial({ map: iTex }));
  iPlane.position.set(injCx + 0.05, deckY + 0.5, fz - 0.08); g.add(iPlane);
  // drive/motor housing at far right
  g.add(box(0.42, 0.56, d - 0.24, charc, w/2 - 0.12, deckY + 0.42, 0));
  g.add(cylAt(0.03,0.03,0.02,10, mat('#ef4444',0.3,0.1,{emissive:'#cc0000',emissiveIntensity:0.5}), w/2 - 0.12, deckY + 0.62, fz - 0.16).rotateX(Math.PI/2));

  // ===== stainless steel hopper on top of the injection unit =====
  const hX = injCx - 0.05, hBaseY = deckY + 0.8;
  g.add(cylAt(0.05, 0.05, 0.12, 14, stain, hX, hBaseY, 0));                       // throat onto barrel
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.05, 0.26, 18), stain);
  funnel.position.set(hX, hBaseY + 0.19, 0); funnel.castShadow = true; g.add(funnel); // cone
  g.add(cylAt(0.2, 0.2, 0.22, 18, stain, hX, hBaseY + 0.43, 0));                  // cylindrical bin
  g.add(cylAt(0.21, 0.21, 0.02, 18, mat('#a8b0b6',0.2,0.85), hX, hBaseY + 0.55, 0)); // rim
  g.add(cylAt(0.14, 0.14, 0.03, 16, stain, hX, hBaseY + 0.58, 0));                // lid
  g.add(box(0.16, 0.012, 0.012, dark, hX, hBaseY + 0.3, 0.2));                    // sight-glass strip

  // mark off-white shrouds colorable
  g.traverse(o => { if (o.isMesh && o.material === body) o.userData.colorable = true; });
  return g;
}

function buildForklift({ color='#f5c020', w=1.45, d=4.0, h=2.25 } = {}) {
  // 3.5t-class counterbalance forklift. Built at native (real-machine) scale into
  // `lift`, then uniformly scaled and recentred to fit the catalogue footprint.
  // Front faces -z. Fork blades: 1.09 m long, 0.59 m centres — sized to standard
  // 1100 mm pallets / stillages so the loads are actually carryable.
  const g = new THREE.Group();
  const SCALE = 0.64;
  const lift = new THREE.Group();
  lift.scale.setScalar(SCALE);
  lift.position.z = 0.8 * SCALE;   // recentre native z-extent (-3.94..+2.34) on origin
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
  const lblT = labelTexture('3.5t');
  [-1, 1].forEach(s => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.42), new THREE.MeshStandardMaterial({ map: lblT, roughness:.6 }));
    p.position.set(s*1.105, 1.15, 1.62); p.rotation.y = s*Math.PI/2; bodyG.add(p);
  });

  // ---------- overhead guard ----------
  const guard = new THREE.Group(); lift.add(guard);
  const postGeoF = new THREE.CylinderGeometry(.05, .05, 1.62, 12);
  const postGeoR = new THREE.CylinderGeometry(.05, .05, 1.35, 12);
  [-1, 1].forEach(s => {
    const pf = new THREE.Mesh(postGeoF, MAT.steel); pf.position.set(s*0.92, 1.95, -0.86); pf.rotation.x = 0.13; pf.castShadow = true; guard.add(pf);
    const pr = new THREE.Mesh(postGeoR, MAT.steel); pr.position.set(s*0.92, 2.06, 0.92); pr.rotation.x = -0.08; pr.castShadow = true; guard.add(pr);
  });
  lbox(1.94, 0.07, 1.9, MAT.steel, 0, 2.75, 0.03, guard);
  for (let i = 0; i < 5; i++) lbox(0.06, 0.05, 1.78, MAT.steelLite, -0.7 + i*0.35, 2.80, 0.03, guard);
  lcyl(.07, .09, .16, MAT.beacon, 0.72, 2.87, 0.75, guard, 14);   // beacon
  lcyl(.1, .1, .04, MAT.steel, 0.72, 2.78, 0.75, guard, 14);
  lcyl(.06, .06, 1.1, MAT.steel, -0.92, 2.2, 1.08, guard, 12);    // exhaust pipe

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
  // single drive wheel per side (3.5t class), not the 8t's dual tyres
  [-1, 1].forEach(s => { const sp = new THREE.Group(); sp.position.set(s*0.9, frontWheelR, -1.45); sp.add(makeWheel(frontWheelR, 0.42)); lift.add(sp); });
  const rearSteer = [];
  [-1, 1].forEach(s => { const st = new THREE.Group(); st.position.set(s*0.78, rearWheelR, 1.05); st.add(makeWheel(rearWheelR, 0.34)); lift.add(st); rearSteer.push(st); });

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

function buildAluminumCoil({ color='#c8c8cc', w=1.0, d=0.8, h=0.8 } = {}) {
  const g = new THREE.Group();
  const alum = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.2, metalness: 0.85, envMapIntensity: 0.9, side: THREE.DoubleSide });
  const core_m = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.4, metalness: 0.5, side: THREE.DoubleSide });

  // main coil body — open-ended so the hollow center is visible through the core
  const coilR = Math.min(w, h) / 2;
  const coil = new THREE.Mesh(new THREE.CylinderGeometry(coilR, coilR, d, 32, 1, true), alum);
  coil.rotation.x = Math.PI / 2; coil.position.set(0, coilR, 0); coil.castShadow = true; coil.receiveShadow = true; coil.userData.colorable = true; g.add(coil);

  // inner steel core tube — open-ended and double-sided so the hollow bore is visible
  const coreR = coilR * 0.28;
  const core = new THREE.Mesh(new THREE.CylinderGeometry(coreR, coreR, d + 0.02, 16, 1, true), core_m);
  core.rotation.x = Math.PI / 2; core.position.set(0, coilR, 0); g.add(core);

  // end faces — RingGeometry shows the annular wound cross-section (hollow center exposed)
  [-(d / 2), d / 2].forEach(fz => {
    for (let r = coreR + 0.03; r < coilR - 0.01; r += 0.06) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 4, 28), alum);
      ring.position.set(0, coilR, fz); g.add(ring);
    }
    const face = new THREE.Mesh(new THREE.RingGeometry(coreR, coilR, 32), alum);
    face.position.set(0, coilR, fz + (fz < 0 ? -0.005 : 0.005));
    if (fz < 0) face.rotation.y = Math.PI;
    g.add(face);
  });

  return g;
}

function buildTensileTestMachine({ color='#d8d8d8', w=0.8, d=0.7, h=2.0 } = {}) {
  const g = new THREE.Group();
  const frame_m = mat(color, 0.45, 0.1), metal = mat('#888', 0.25, 0.6, { env: 0.6 }), dark = mat('#1a1a1a', 0.7), accent = mat('#2255aa', 0.4, 0.1);

  // base plate
  const base = new THREE.Mesh(roundedBoxGeom(w, 0.07, d, 0.02, 4), frame_m); base.position.set(0, 0.035, 0); base.castShadow = true; base.userData.colorable = true; g.add(base);

  // two vertical columns
  const colW = 0.07;
  [- w / 2 + colW / 2 + 0.04, w / 2 - colW / 2 - 0.04].forEach(cx => {
    const col = new THREE.Mesh(roundedBoxGeom(colW, h - 0.07, colW, 0.02, 4), frame_m); col.position.set(cx, 0.07 + (h - 0.07) / 2, 0); col.castShadow = true; g.add(col);
  });

  // top crosshead (fixed)
  const topCross = new THREE.Mesh(roundedBoxGeom(w, 0.1, d * 0.6, 0.02, 4), frame_m); topCross.position.set(0, h - 0.05, 0); topCross.castShadow = true; g.add(topCross);

  // movable crosshead (about 60% up)
  const movCross = new THREE.Mesh(roundedBoxGeom(w - 0.02, 0.08, d * 0.55, 0.02, 4), metal); movCross.position.set(0, h * 0.58, 0); movCross.castShadow = true; g.add(movCross);

  // load cell (cylinder between crossheads)
  const loadCell = cylAt(0.04, 0.04, 0.14, 14, mat('#aaa', 0.2, 0.7, { env: 0.8 }), 0, h - 0.18, 0); g.add(loadCell);

  // upper grip (hangs directly under the load cell)
  const upGrip = new THREE.Mesh(roundedBoxGeom(0.06, 0.18, 0.06, 0.015, 4), metal); upGrip.position.set(0, h * 0.82, 0); g.add(upGrip);

  // lower grip (rises from the movable crosshead)
  const loGrip = new THREE.Mesh(roundedBoxGeom(0.06, 0.18, 0.06, 0.015, 4), metal); loGrip.position.set(0, h * 0.62, 0); g.add(loGrip);

  // test specimen (thin strip clamped between the two grips)
  const specimen = new THREE.Mesh(new THREE.BoxGeometry(0.018, h * 0.11, 0.012), mat('#c8c8a0', 0.5, 0.3)); specimen.position.set(0, h * 0.72, 0); g.add(specimen);

  // control panel (side)
  const panel = new THREE.Mesh(roundedBoxGeom(0.32, 0.44, 0.22, 0.02, 4), dark); panel.position.set(w / 2 + 0.16 + 0.11, h * 0.55, 0); panel.castShadow = true; g.add(panel);
  const screen = plainBox(0.22, 0.28, 0.01, mat('#001020', 0.7, 0, { emissive: '#1a5a8a', emissiveIntensity: 0.6 }), w / 2 + 0.28, h * 0.58, d * 0.08); g.add(screen);
  const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.018, 12), mat('#e0c060', 0.3, 0.6)); dial.rotation.x = Math.PI / 2; dial.position.set(w / 2 + 0.28, h * 0.44, d * 0.09); g.add(dial);

  // lead screw (vertical rod in frame center)
  const screw = cylAt(0.016, 0.016, h * 0.6, 8, mat('#bbb', 0.2, 0.8, { env: 0.8 }), 0, h * 0.42, 0); g.add(screw);

  // strain gauge strip on specimen
  const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.04, 0.005), accent); gauge.position.set(0, h * 0.72, 0.012); g.add(gauge);

  return g;
}

function buildScrapBucket({ color='#4a4f54', w=1.0, d=1.0, h=0.7 } = {}) {
  const g = new THREE.Group();
  // rectangular steel stillage / pallet box container (open top, fork pockets, lifting eyes)
  const panel  = mat(color, 0.55, 0.35, { env: 0.4 });               // sheet-metal walls (colorable)
  const frame  = mat(shade(color, 0.82), 0.5, 0.45, { env: 0.5 });   // posts / frame / feet
  const steelA = mat('#bcc0c6', 0.3, 0.85, { env: 0.9 });            // bright steel scrap
  const steelB = mat('#9aa0a8', 0.35, 0.8, { env: 0.8 });            // duller scrap

  const footH = 0.11;
  const wallBot = footH + 0.02, wallTop = h - 0.1;
  const wallH = wallTop - wallBot, wallY = (wallBot + wallTop) / 2;
  const cx = w/2 - 0.045, cz = d/2 - 0.045;                          // corner-post centres

  // ---- pallet base: 3 runner feet (fork tunnels run front-to-back) + deck ----
  [-w/2 + 0.06, 0, w/2 - 0.06].forEach(fx => g.add(box(0.1, footH, d - 0.02, frame, fx, footH/2, 0)));
  [-d/2 + 0.07, d/2 - 0.07].forEach(fz => g.add(box(w - 0.04, 0.03, 0.12, frame, 0, footH - 0.012, fz)));
  g.add(box(w - 0.05, 0.03, d - 0.05, panel, 0, footH + 0.015, 0));   // container floor

  // ---- corner posts (4) ----
  [[cx,cz],[-cx,cz],[cx,-cz],[-cx,-cz]].forEach(([px,pz]) =>
    g.add(box(0.07, wallTop - 0.02, 0.07, frame, px, (wallTop)/2, pz)));

  // ---- side wall panels (inset between posts) ----
  const wThk = 0.02;
  [d/2 - 0.012, -(d/2 - 0.012)].forEach(pz => g.add(box(w - 0.14, wallH, wThk, panel, 0, wallY, pz)));   // front/back
  [w/2 - 0.012, -(w/2 - 0.012)].forEach(px => g.add(box(wThk, wallH, d - 0.14, panel, px, wallY, 0)));   // left/right

  // ---- central vertical reinforcement ribs on each face ----
  [d/2, -(d/2)].forEach(pz => g.add(box(0.07, wallH, 0.025, frame, 0, wallY, pz + Math.sign(pz)*0.006)));
  [w/2, -(w/2)].forEach(px => g.add(box(0.025, wallH, 0.07, frame, px + Math.sign(px)*0.006, wallY, 0)));

  // ---- top & bottom rim frames tying the posts ----
  [d/2 - 0.03, -(d/2 - 0.03)].forEach(pz => g.add(box(w, 0.05, 0.05, frame, 0, wallTop, pz)));
  [w/2 - 0.03, -(w/2 - 0.03)].forEach(px => g.add(box(0.05, 0.05, d, frame, px, wallTop, 0)));
  [d/2 - 0.03, -(d/2 - 0.03)].forEach(pz => g.add(box(w - 0.02, 0.045, 0.045, frame, 0, wallBot, pz)));
  [w/2 - 0.03, -(w/2 - 0.03)].forEach(px => g.add(box(0.045, 0.045, d - 0.02, frame, px, wallBot, 0)));

  // ---- lifting eyes on top of each corner post ----
  [[cx,cz],[-cx,cz],[cx,-cz],[-cx,-cz]].forEach(([px,pz]) => {
    g.add(box(0.045, 0.05, 0.045, frame, px, wallTop + 0.035, pz));               // stem
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.012, 8, 16), frame);
    eye.position.set(px, wallTop + 0.085, pz); eye.rotation.y = Math.atan2(pz, px);
    eye.castShadow = true; g.add(eye);
  });

  // ---- scrap fill: bright steel turnings/chips piled near the top ----
  const seed = [0.38,0.81,0.14,0.57,0.93,0.26,0.72,0.45,0.18,0.64,0.33,0.87,0.09,0.52,0.77,0.31,0.68,0.22,0.55,0.89,0.11,0.44,0.66,0.05,0.97,0.41,0.73,0.28];
  const fillX = w/2 - 0.12, fillZ = d/2 - 0.12, fillY = wallTop - 0.07;
  for (let i = 0; i < 46; i++) {
    const s = seed[i % seed.length], s2 = seed[(i+7) % seed.length], s3 = seed[(i+13) % seed.length];
    const px = (s - 0.5) * 2 * fillX, pz = (s2 - 0.5) * 2 * fillZ, py = fillY + s3 * 0.05;
    const m = (i % 4 === 0) ? steelB : steelA;
    let scrap;
    const t = i % 3;
    if (t === 0)      scrap = new THREE.Mesh(new THREE.TorusGeometry(0.018 + s*0.014, 0.005, 4, 8, Math.PI*(0.7 + s*0.9)), m);
    else if (t === 1) scrap = new THREE.Mesh(new THREE.BoxGeometry(0.05 + s*0.04, 0.006, 0.012 + s2*0.012), m);
    else              scrap = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.04 + s*0.05, 5), m);
    scrap.position.set(px, py, pz);
    scrap.rotation.set(s*Math.PI*2, s2*Math.PI*2, s3*Math.PI*2);
    scrap.castShadow = true; g.add(scrap);
  }

  // mark colorable
  g.traverse(o => { if (o.isMesh && o.material === panel) o.userData.colorable = true; });
  return g;
}

function buildSteelPallet({ color='#8a8a92', w=1.1, d=1.1, h=0.15 } = {}) {
  const g = new THREE.Group();
  const m  = mat(color, 0.6, 0.5);
  const m2 = mat(shade(color, 0.82), 0.6, 0.5);
  // top deck
  const deck = box(w, 0.02, d, m, 0, h - 0.01, 0); deck.userData.colorable = true; g.add(deck);
  // three cross-stringers under deck (proportional to depth)
  [-(d/2 - 0.11), 0, d/2 - 0.11].forEach(z => g.add(box(w, 0.04, 0.07, m2, 0, h - 0.04, z)));
  // three bottom skid runners (proportional to width)
  [-(w/2 - 0.11), 0, w/2 - 0.11].forEach(x => g.add(box(0.09, 0.06, d, m2, x, 0.03, 0)));
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

function buildWoodPallet({ color='#c9a26a', w=1.1, d=1.1, h=0.145 } = {}) {
  // Standard wooden block pallet (ISPM-15 / HT marked), matching the reference photo:
  // 6 top deck boards (run along depth), 3 bottom boards, 9 blocks (3×3) with
  // 4-way fork entry. Fork openings line up with the 3.5t forklift's 0.59 m forks.
  const g = new THREE.Group();
  const wt = woodTex.clone(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(1.2, 1.2); wt.needsUpdate = true;
  const woodM = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.8, metalness: 0.0, map: wt });
  const woodD = new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(color, 0.88)), roughness: 0.82, metalness: 0.0, map: wt });
  const blockM = new THREE.MeshStandardMaterial({ color: new THREE.Color(shade(color, 0.74)), roughness: 0.85, metalness: 0.0 });

  const deckT  = 0.022;            // deck-board thickness
  const blockH = h - deckT * 2;    // block height between top & bottom decks
  const blockY = deckT + blockH / 2;
  const blockS = 0.135;            // block footprint

  // ---- 9 blocks (3×3), 4-way entry ----
  const bx = w / 2 - blockS / 2 - 0.012, bz = d / 2 - blockS / 2 - 0.012;
  [-bx, 0, bx].forEach(px => [-bz, 0, bz].forEach(pz =>
    g.add(box(blockS, blockH, blockS, blockM, px, blockY, pz))));

  // ---- bottom deck: 3 boards running across the width ----
  const botY = deckT / 2;
  [-bz, 0, bz].forEach(pz => g.add(box(w, deckT, 0.16, woodD, 0, botY, pz)));

  // ---- top deck: 6 boards running along the depth, with gaps ----
  const topY = h - deckT / 2;
  const nBoards = 6, bw = 0.135, gap = (w - nBoards * bw) / (nBoards - 1);
  for (let i = 0; i < nBoards; i++) {
    const px = -w / 2 + bw / 2 + i * (bw + gap);
    g.add(box(bw, deckT, d, woodM, px, topY, 0));
  }

  // ---- ISPM-15 burn stamp (wheat + HT / JP) on the front-centre block ----
  const sc = document.createElement('canvas'); sc.width = 128; sc.height = 96;
  const sx = sc.getContext('2d');
  sx.clearRect(0, 0, 128, 96);
  sx.strokeStyle = '#3a2410'; sx.lineWidth = 4; sx.strokeRect(8, 8, 112, 80);
  sx.strokeStyle = '#4a3018'; sx.lineWidth = 3;
  // wheat sheaf glyph
  sx.beginPath(); sx.moveTo(34, 78); sx.lineTo(34, 40); sx.stroke();
  for (let k = 0; k < 4; k++) { const yy = 44 + k * 9; sx.beginPath(); sx.moveTo(34, yy); sx.lineTo(26, yy - 6); sx.moveTo(34, yy); sx.lineTo(42, yy - 6); sx.stroke(); }
  sx.fillStyle = '#3a2410'; sx.font = "700 26px 'Arial'"; sx.textBaseline = 'middle';
  sx.fillText('HT', 58, 36); sx.font = "700 18px 'Arial'"; sx.fillText('JP-000', 52, 66);
  const stampTex = new THREE.CanvasTexture(sc); stampTex.colorSpace = THREE.SRGBColorSpace;
  const stampMat = new THREE.MeshStandardMaterial({ map: stampTex, transparent: true, roughness: 0.9 });
  const stamp = new THREE.Mesh(new THREE.PlaneGeometry(blockS * 0.82, blockS * 0.62), stampMat);
  stamp.position.set(0, blockY + 0.005, d / 2 - 0.012 + blockS / 2 + 0.001); g.add(stamp);

  g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  g.traverse(c => { if (c.isMesh && (c.material === woodM || c.material === woodD)) c.userData.colorable = true; });
  return g;
}

function buildDrum({ color='#1a4a9a', w=0.58, d=0.58, h=0.88 } = {}) {
  const g = new THREE.Group();
  const r = Math.min(w, d) / 2;
  const bodyM = mat(color, 0.45, 0.35);
  const capM  = mat(shade(color, 1.15), 0.4, 0.55);
  const ribM  = mat(shade(color, 0.75), 0.5, 0.6);
  // body
  const drumBody = cylAt(r, r, h - 0.04, 24, bodyM, 0, h / 2, 0); drumBody.userData.colorable = true; g.add(drumBody);
  // top/bottom caps
  g.add(cylAt(r, r, 0.022, 24, capM, 0, h - 0.011, 0));
  g.add(cylAt(r, r, 0.022, 24, capM, 0, 0.011, 0));
  // rolling ribs (symmetric about mid-height, per standard steel drum)
  [0.24, 0.5, 0.76].forEach(t => g.add(cylAt(r + 0.016, r + 0.016, 0.032, 24, ribM, 0, h * t, 0)));
  // bung plug on top
  g.add(cylAt(0.028, 0.028, 0.03, 12, mat('#787878', 0.4, 0.7), r * 0.5, h - 0.005, 0));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildJibCrane({ color='#e8b820', w=2.2, d=0.5, h=4.2 } = {}) {
  const g = new THREE.Group();
  const yellow = mat(color, 0.5, 0.12);
  const dark   = mat('#1e2228', 0.7, 0.3);
  const silver = mat('#a8b0b8', 0.3, 0.65);
  const base_m = mat('#3a3f48', 0.6, 0.35);
  const armLen = w * 0.92;
  // Base plate (octagonal)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.42, 0.12, 8), base_m);
  base.position.set(0, 0.06, 0); base.receiveShadow = true; g.add(base);
  // Anchor bolts
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6), silver);
    bolt.position.set(Math.cos(a)*0.29, 0.07, Math.sin(a)*0.29); g.add(bolt);
  }
  // Vertical mast
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.09, h * 0.92, 10), yellow);
  mast.position.set(0, h * 0.46 + 0.12, 0); mast.userData.colorable = true; g.add(mast);
  // Jib arm (+x direction)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.09, 0.09), yellow);
  arm.position.set(armLen / 2, h * 0.91 + 0.12, 0); arm.userData.colorable = true; g.add(arm);
  // Counter-jib arm (-x side, shorter)
  const cjLen = 0.36;
  g.add(box(cjLen, 0.09, 0.09, yellow, -cjLen/2 - 0.04, h * 0.91 + 0.12, 0));
  // Counterweight
  g.add(box(0.22, 0.18, 0.14, mat('#2a2e38', 0.65, 0.2), -cjLen - 0.11, h * 0.91 + 0.03, 0));
  // King post (short vertical post above the arm at the mast) — anchors the tie rod
  const armY = h * 0.91 + 0.12;
  const kpH = h * 0.20;
  g.add(box(0.06, kpH, 0.06, yellow, 0, armY + kpH/2, 0));
  // Diagonal tie rod: king-post top → arm at ~60% (gives a ~32° brace, not a flat bar)
  const brX = armLen * 0.6, brY = kpH;
  const brLen = Math.hypot(brX, brY);
  const brace = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, brLen, 6), silver);
  brace.position.set(brX/2, armY + kpH - brY/2, 0);
  brace.rotation.z = -Math.atan2(brY, brX); g.add(brace);
  // Trolley on arm
  g.add(box(0.20, 0.11, 0.16, mat('#3a4250', 0.5, 0.3), armLen * 0.72, h * 0.895 + 0.12, 0));
  // Hoist rope
  const ropeH = h * 0.40;
  const rope = cyl(0.013, 0.013, ropeH, 4, dark);
  rope.position.set(armLen * 0.72, h * 0.895 + 0.12 - ropeH/2 - 0.06, 0); g.add(rope);
  // Hook block
  g.add(box(0.12, 0.11, 0.09, silver, armLen * 0.72, h * 0.895 + 0.12 - ropeH - 0.11, 0));
  // Hook (half-torus)
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.018, 6, 10, Math.PI), silver);
  hook.rotation.z = Math.PI/2;
  hook.position.set(armLen * 0.72 + 0.02, h * 0.895 + 0.12 - ropeH - 0.20, 0); g.add(hook);
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildFireExtinguisher({ color='#cc1818', w=0.2, d=0.2, h=0.65 } = {}) {
  const g = new THREE.Group();
  const r      = Math.min(w, d) / 2 * 0.88;
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
    const hx = -r * 0.28 - r * 1.05 * Math.pow(t, 1.4);
    const hy = (h * 0.84 - (h * 0.84 - h * 0.44) * t) + 0.04;
    hosePts.push({ x: hx, y: hy });
  }
  for (let i = 0; i < hN - 1; i++) {
    const a = hosePts[i], b = hosePts[i + 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, len * 1.05, 6), blackM);
    s.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0);
    s.rotation.z = Math.atan2(dy, dx) - Math.PI / 2; g.add(s);
  }
  // Nozzle
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.12, 8), blackM);
  nz.rotation.z = Math.PI/2; nz.position.set(-r * 1.38, h * 0.38 + 0.04, 0); g.add(nz);
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildBandedAlumCoil({ color='#c8c8cc', w=1.0, d=0.8, h=0.8 } = {}) {
  const g = new THREE.Group();
  const alum  = mat(color, 0.2, 0.85, { env: 0.9 }); alum.side = THREE.DoubleSide;
  const core_m= mat('#888', 0.4, 0.5); core_m.side = THREE.DoubleSide;
  const bandM = mat('#6a7080', 0.35, 0.55);
  const claspM= mat('#8a9098', 0.3, 0.65);
  const coilR = Math.min(w, h) / 2, coreR = coilR * 0.28;
  // 本体コイル(軸=Z, 開口端なので中空のボアが見える)
  const coil = new THREE.Mesh(new THREE.CylinderGeometry(coilR, coilR, d, 32, 1, true), alum);
  coil.rotation.x = Math.PI/2; coil.position.set(0, coilR, 0);
  coil.castShadow = true; coil.receiveShadow = true; coil.userData.colorable = true; g.add(coil);
  // 内側スチールコア(開口端)
  const core = new THREE.Mesh(new THREE.CylinderGeometry(coreR, coreR, d + 0.02, 16, 1, true), core_m);
  core.rotation.x = Math.PI/2; core.position.set(0, coilR, 0); g.add(core);
  // 端面(±Z) — 軸=コイル軸=Z に揃えた同心の巻きリング + 環状断面(回転なし)
  [-(d/2), d/2].forEach(fz => {
    for (let r = coreR + 0.03; r < coilR - 0.01; r += 0.06) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 4, 28), alum);
      ring.position.set(0, coilR, fz); g.add(ring);
    }
    const face = new THREE.Mesh(new THREE.RingGeometry(coreR, coilR, 32), alum);
    face.position.set(0, coilR, fz + (fz < 0 ? -0.005 : 0.005));
    if (fz < 0) face.rotation.y = Math.PI; g.add(face);
  });
  // Steel strapping bands (3 circumferential rings on OD)
  [-0.21, 0, 0.21].map(t => t * d).forEach(bz => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(coilR + 0.016, 0.018, 6, 32), bandM);
    band.position.set(0, coilR, bz); g.add(band);
    // Buckle/clasp block
    g.add(box(0.07, 0.05, 0.04, claspM, coilR + 0.032, coilR, bz));
  });
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildPackagedAlumCoil({ color='#b4a478', w=1.0, d=0.8, h=0.8 } = {}) {
  const g = new THREE.Group();
  const coilR = Math.min(w, h) / 2, coreR = coilR * 0.28;
  const packM = mat(color, 0.9, 0.0);      // kraft/VCI paper
  const edgeM = mat('#d0c8a0', 0.85);      // edge protector
  const bandM = mat('#4a5058', 0.35, 0.55); // steel strap
  const alumM = mat('#c8c8cc', 0.2, 0.85, { env: 0.9 });
  // Paper wrapping (full outer cylinder)
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(coilR + 0.012, coilR + 0.012, d + 0.02, 28), packM);
  wrap.rotation.x = Math.PI/2; wrap.position.set(0, coilR, 0);
  wrap.castShadow = true; wrap.receiveShadow = true; wrap.userData.colorable = true; g.add(wrap);
  // アイ(露出した中心穴) — ±Z 端面に正立(軸=Z)
  [-(d/2 + 0.02), (d/2 + 0.02)].forEach(fz => {
    const eye = new THREE.Mesh(new THREE.RingGeometry(coreR, coilR * 0.42, 24), alumM);
    eye.position.set(0, coilR, fz);
    if (fz < 0) eye.rotation.y = Math.PI; g.add(eye);
    // ボア(中心の穴)
    const hole = new THREE.Mesh(new THREE.CircleGeometry(coreR, 18), mat('#363639', 0.6));
    hole.position.set(0, coilR, fz + (fz < 0 ? -0.004 : 0.004)); if (fz < 0) hole.rotation.y = Math.PI; g.add(hole);
    // エッジプロテクター
    const ep = new THREE.Mesh(new THREE.TorusGeometry(coilR * 0.72, 0.025, 6, 24), edgeM);
    ep.position.set(0, coilR, fz); g.add(ep);
  });
  // Steel strapping bands × 2
  [-0.18, 0.18].map(t => t * d).forEach(bz => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(coilR + 0.022, 0.018, 6, 32), bandM);
    band.position.set(0, coilR, bz); g.add(band);
    g.add(box(0.07, 0.04, 0.03, mat('#5a6068', 0.4, 0.5), coilR + 0.038, coilR, bz));
  });
  // Shipping label
  const lbl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.01), mat('#f8f4e8', 0.88));
  lbl.position.set(coilR + 0.014, coilR, 0); lbl.rotation.y = Math.PI/2; g.add(lbl);
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildExportAlumCoil({ color='#c0a870', w=1.2, d=1.2, h=1.0 } = {}) {
  const g = new THREE.Group();
  const woodM  = mat(color, 0.85, 0.0);
  const slatM  = mat(shade(color, 0.72), 0.9, 0.0);
  const metalM = mat('#6a7278', 0.4, 0.45);
  const alumM  = mat('#c8c8cc', 0.2, 0.85, { env: 0.9 });
  const pw = w, pd = d, ph = h * 0.82;
  const coilR = Math.min(pw, pd) / 2 * 0.86;
  // Wooden pallet base
  const pallet = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.11, pd), mat(shade(color, 0.72), 0.88, 0));
  pallet.position.set(0, 0.055, 0); pallet.receiveShadow = true; g.add(pallet);
  // Pallet runner blocks (3 runners)
  [-1,0,1].forEach(t => {
    const runner = new THREE.Mesh(new THREE.BoxGeometry(pw, 0.08, 0.12), mat(shade(color, 0.6), 0.9));
    runner.position.set(0, 0.04, t * pd * 0.36); g.add(runner);
  });
  // Main box body (plywood crate)
  const crateBox = new THREE.Mesh(new THREE.BoxGeometry(pw - 0.02, ph, pd - 0.02), woodM);
  crateBox.position.set(0, 0.11 + ph/2, 0);
  crateBox.castShadow = true; crateBox.receiveShadow = true; crateBox.userData.colorable = true; g.add(crateBox);
  // Vertical slat overlays (front, back, sides)
  [-(pd/2 - 0.005), (pd/2 - 0.005)].forEach(zf => {
    [-0.3, 0, 0.3].forEach(xo => {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.065, ph * 1.02, 0.03), slatM);
      slat.position.set(xo * pw * 0.72, 0.11 + ph/2, zf); g.add(slat);
    });
  });
  [-(pw/2 - 0.005), (pw/2 - 0.005)].forEach(xf => {
    [-0.25, 0.25].forEach(zo => {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.03, ph * 1.02, 0.065), slatM);
      slat.position.set(xf, 0.11 + ph/2, zo * pd * 0.72); g.add(slat);
    });
  });
  // Metal corner brackets
  [[1,1],[-1,1],[1,-1],[-1,-1]].forEach(([sx,sz]) => {
    const cb = new THREE.Mesh(new THREE.BoxGeometry(0.055, ph * 1.02, 0.055), metalM);
    cb.position.set(sx*(pw/2-0.027), 0.11 + ph/2, sz*(pd/2-0.027)); g.add(cb);
  });
  // コイルのアイは天面(上向き=Eye-to-Sky)に — 軸=鉛直で梱包
  const eyeTopY = 0.11 + ph + 0.004;
  const mkTop = (mesh) => { mesh.rotation.x = -Math.PI/2; mesh.position.set(0, eyeTopY, 0); return mesh; };
  g.add(mkTop(new THREE.Mesh(new THREE.RingGeometry(coilR*0.26, coilR*0.56, 24), alumM)));
  for (let r = coilR*0.32; r < coilR*0.55; r += 0.055) g.add(mkTop(new THREE.Mesh(new THREE.TorusGeometry(r, 0.01, 4, 24), alumM)));
  { const hole = new THREE.Mesh(new THREE.CircleGeometry(coilR*0.26, 18), mat('#363639', 0.6)); hole.rotation.x = -Math.PI/2; hole.position.set(0, eyeTopY - 0.004, 0); g.add(hole); }
  // Steel strapping bands (2 bands at 1/3 and 2/3 height)
  [-0.2, 0.2].forEach(t => {
    const by = 0.11 + ph * (0.5 + t * 0.85);
    const bx = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.04, 0.038, 0.038), metalM);
    bx.position.set(0, by, pd/2); g.add(bx);
    const bz = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.038, pd + 0.04), metalM);
    bz.position.set(pw/2, by, 0); g.add(bz);
  });
  // 輸出ラベル(前面 +Z)
  const lbl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.008), mat('#f0eedc', 0.9));
  lbl.position.set(0, 0.11 + ph * 0.5, pd/2 - 0.006); g.add(lbl);
  g.add(box(0.28, 0.03, 0.009, mat('#cc2020', 0.7), 0, 0.11 + ph * 0.5 + 0.07, pd/2 - 0.005));
  g.add(box(0.28, 0.03, 0.009, mat('#2060cc', 0.7), 0, 0.11 + ph * 0.5 - 0.07, pd/2 - 0.005));
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

function buildAlumCoilSide({ color='#c8c8cc', w=0.8, d=1.0, h=0.8 } = {}) {
  const g = new THREE.Group();
  const alum   = mat(color, 0.2, 0.85, { env: 0.9 }); alum.side = THREE.DoubleSide;
  const core_m = mat('#888', 0.4, 0.5); core_m.side = THREE.DoubleSide;
  const cradleM= mat('#5a5048', 0.7, 0.1);
  const bandM  = mat('#6a7080', 0.35, 0.55);
  // 横倒し: コイル軸は水平 = X 方向。端面(アイ)は ±X を向く。
  const coilR = h / 2, coreR = coilR * 0.28, coilDepth = d;
  // 本体コイル(軸=X, 湾曲面を下に接地, 開口端)
  const coil = new THREE.Mesh(new THREE.CylinderGeometry(coilR, coilR, coilDepth, 32, 1, true), alum);
  coil.rotation.z = Math.PI/2; coil.position.set(0, coilR, 0);
  coil.castShadow = true; coil.receiveShadow = true; coil.userData.colorable = true; g.add(coil);
  // 内側コア(開口端)
  const core = new THREE.Mesh(new THREE.CylinderGeometry(coreR, coreR, coilDepth + 0.02, 16, 1, true), core_m);
  core.rotation.z = Math.PI/2; core.position.set(0, coilR, 0); g.add(core);
  // 端面(±X) — 軸=コイル軸=X に揃えた同心の巻きリング + 環状断面(rotation.y)
  [-(coilDepth/2), coilDepth/2].forEach(fx => {
    for (let r = coreR + 0.03; r < coilR - 0.01; r += 0.06) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.012, 4, 28), alum);
      ring.rotation.y = Math.PI/2; ring.position.set(fx, coilR, 0); g.add(ring);
    }
    const face = new THREE.Mesh(new THREE.RingGeometry(coreR, coilR, 32), alum);
    face.rotation.y = (fx < 0 ? -Math.PI/2 : Math.PI/2); face.position.set(fx + (fx < 0 ? -0.005 : 0.005), coilR, 0); g.add(face);
  });
  // スチールバンド(2本, X軸まわりにOD外周を締める → rotation.y)
  [-0.18, 0.18].map(t => t * coilDepth).forEach(bx => {
    const band = new THREE.Mesh(new THREE.TorusGeometry(coilR + 0.016, 0.018, 6, 32), bandM);
    band.rotation.y = Math.PI/2; band.position.set(bx, coilR, 0); g.add(band);
    g.add(box(0.04, 0.05, 0.07, mat('#8a9098', 0.3, 0.65), bx, coilR * 1.62, 0));
  });
  // Cradle chocks (prevent rolling)
  [-0.32, 0.32].map(t => t * coilDepth).forEach(bx => {
    const chock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, coilR * 1.1), cradleM);
    chock.position.set(bx, 0.05, -coilR * 0.55); g.add(chock);
    const chock2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, coilR * 1.1), cradleM);
    chock2.position.set(bx, 0.05, coilR * 0.55); g.add(chock2);
  });
  g.traverse(c => { if (c.isMesh) c.castShadow = true; });
  return g;
}

// 作業員 — 高品質な人物ベース(buildPerson)に作業着装備を載せる。
// 白ヘルメット+顎紐 / 開襟ジャケット(胸ポケット・ファスナー) / カーゴ作業ズボン(上下同色) / 白軍手 / 安全靴。
// color はカラーピッカー対応(作業着の上下が連動して色替え)。既定はライトブルーグレー。
function buildWorker({ color, w=0.5, d=0.5, h=1.8 } = {}) {
  return buildPerson({
    h, adult: true, style: 'short',
    skin: '#e7b48a', hair: '#1b1410', eye: '#3a2c22',
    color: color || '#aebccc',        // 作業着(上下colorable)
    bottom: '#aebccc',
    helmet: '#f1f3f6', jacket: true, cargo: true, gloves: '#fbfaf6', boots: true, suit: true
  });
}


export { buildAlumCoilSide, buildAluminumCoil, buildBandedAlumCoil, buildCNCMachine, buildCNCMachiningCenter, buildControlPanel, buildConveyor, buildDrum, buildExportAlumCoil, buildFireExtinguisher, buildForklift, buildIndustrialFurnace, buildIndustrialRobot, buildIndustrialRobotLg, buildInjectionMolder, buildJibCrane, buildLargeHydraulicPress, buildPackagedAlumCoil, buildPalletRack, buildResinPallet, buildScrapBucket, buildSteelPallet, buildTensileTestMachine, buildToolCabinet, buildWoodPallet, buildWorkbench, buildWorker };
