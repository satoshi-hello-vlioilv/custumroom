import * as THREE from 'three';
import { shade } from '../core/util.js';
import { roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt } from '../core/helpers.js';

// ============================================================ TENT (dome)
function buildTent({ color='#3f7a4a', w=2.2, d=2.4, h=1.35 } = {}) {
  const g = new THREE.Group();
  const fly = fabricMat(color);
  const flyDark = fabricMat(shade(color, 0.78));
  const poleMat = mat('#3a3d42', 0.4, 0.6, { env: 0.7 });
  // Groundsheet
  const ground = new THREE.Mesh(roundedBoxGeom(w, 0.03, d, 0.12, 3), mat('#2a2e30', 0.85, 0.05));
  ground.position.set(0, 0.015, 0); ground.receiveShadow = true; g.add(ground);
  // Dome body — upper half of a scaled sphere
  const domeGeo = new THREE.SphereGeometry(1, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2);
  const dome = new THREE.Mesh(domeGeo, fly);
  dome.scale.set(w / 2, h - 0.03, d / 2);
  dome.position.y = 0.03; dome.castShadow = true; dome.receiveShadow = true; dome.userData.colorable = true; g.add(dome);
  // Rainfly seam ridges (longitudinal arcs)
  [-0.5, 0, 0.5].forEach(rot => {
    const seam = new THREE.Mesh(new THREE.TorusGeometry((w / 2) * 0.99, 0.012, 6, 24, Math.PI), flyDark);
    seam.rotation.y = rot; seam.position.y = 0.03; seam.scale.set(1, (h - 0.03) / (w / 2), 1);
    g.add(seam);
  });
  // Crossing support poles (two arches)
  const arch1 = new THREE.Mesh(new THREE.TorusGeometry((w / 2) * 1.0, 0.018, 8, 28, Math.PI), poleMat);
  arch1.position.y = 0.03; arch1.scale.set(1, (h - 0.03) / (w / 2), 1); g.add(arch1);
  const arch2 = new THREE.Mesh(new THREE.TorusGeometry((d / 2) * 1.0, 0.018, 8, 28, Math.PI), poleMat);
  arch2.rotation.y = Math.PI / 2; arch2.position.y = 0.03; arch2.scale.set(1, (h - 0.03) / (d / 2), 1); g.add(arch2);
  // Door panel (front -Z): darker D-shaped flap, slightly unzipped
  const doorMat = fabricMat(shade(color, 0.6));
  const door = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.92, 16, 1, false, -Math.PI / 2.6, Math.PI / 1.3), doorMat);
  door.rotation.x = Math.PI / 2; door.rotation.z = Math.PI;
  door.position.set(0, 0.48, -d / 2 + 0.05); door.scale.set(1, 0.55, 1); g.add(door);
  // Rolled-up flap above the door
  const flap = cylAt(0.05, 0.05, 0.5, 12, doorMat, 0, 0.9, -d / 2 + 0.12); flap.rotation.z = Math.PI / 2; g.add(flap);
  // Zipper highlight
  g.add(box(0.008, 0.78, 0.008, mat('#cfcfcf', 0.4, 0.6), 0.13, 0.5, -d / 2 + 0.02));
  // Guy lines + pegs (4 corners)
  const lineMat = mat('#d8d0b0', 0.8);
  const pegMat = mat('#c8a030', 0.5, 0.4);
  [[w / 2 + 0.25, d / 2 + 0.3], [w / 2 + 0.25, -(d / 2 + 0.3)], [-(w / 2 + 0.25), d / 2 + 0.3], [-(w / 2 + 0.25), -(d / 2 + 0.3)]].forEach(([px, pz]) => {
    const ax = px * 0.55, az = pz * 0.55;   // anchor point on dome edge
    const dx = px - ax, dz = pz - az, len = Math.hypot(dx, dz, 0.7);
    const line = box(0.006, 0.006, len, lineMat, (px + ax) / 2, 0.35, (pz + az) / 2);
    line.lookAt(new THREE.Vector3(px, 0.02, pz)); g.add(line);
    g.add(box(0.02, 0.12, 0.02, pegMat, px, 0.04, pz));
  });
  return g;
}

// ============================================================ CAMP CHAIR (folding)
function buildCampChair({ color='#2f5fa0', w=0.6, d=0.62, h=0.85 } = {}) {
  const g = new THREE.Group();
  const frame = mat('#9aa0a6', 0.35, 0.7, { env: 0.8 });
  const fabric = fabricMat(color);
  const seatY = 0.42;
  // Front legs (toward +Z), splayed
  g.add((() => { const c = cylAt(0.016, 0.016, 0.5, 10, frame, -w / 2 + 0.06, 0.2, d / 2 - 0.12); c.rotation.x = 0.25; return c; })());
  g.add((() => { const c = cylAt(0.016, 0.016, 0.5, 10, frame,  w / 2 - 0.06, 0.2, d / 2 - 0.12); c.rotation.x = 0.25; return c; })());
  // Back legs (toward -Z), taller, splayed
  g.add((() => { const c = cylAt(0.016, 0.016, 0.86, 10, frame, -w / 2 + 0.06, 0.43, -d / 2 + 0.16); c.rotation.x = -0.18; return c; })());
  g.add((() => { const c = cylAt(0.016, 0.016, 0.86, 10, frame,  w / 2 - 0.06, 0.43, -d / 2 + 0.16); c.rotation.x = -0.18; return c; })());
  // Cross brace under seat (X)
  const br1 = cylAt(0.012, 0.012, w - 0.08, 10, frame, 0, 0.22, 0); br1.rotation.z = Math.PI / 2; g.add(br1);
  // Armrest tubes
  [-w / 2 + 0.06, w / 2 - 0.06].forEach(ax => {
    const arm = cylAt(0.014, 0.014, d - 0.12, 10, frame, ax, h - 0.18, 0.02); arm.rotation.x = Math.PI / 2; g.add(arm);
  });
  // Seat fabric (slung, slight dip)
  const seat = new THREE.Mesh(roundedBoxGeom(w - 0.06, 0.05, d - 0.16, 0.03, 3), fabric);
  seat.position.set(0, seatY, 0.04); seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  // Backrest fabric (tilted)
  const backrest = new THREE.Mesh(roundedBoxGeom(w - 0.06, 0.42, 0.05, 0.03, 3), fabric);
  backrest.position.set(0, h - 0.06, -d / 2 + 0.18); backrest.rotation.x = -0.16; backrest.castShadow = true; backrest.userData.colorable = true; g.add(backrest);
  // Cup holder ring on right armrest
  const holder = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 14), frame);
  holder.rotation.x = Math.PI / 2; holder.position.set(w / 2 - 0.06, h - 0.18, d / 2 - 0.16); g.add(holder);
  return g;
}

// ============================================================ CAMPFIRE
function buildCampfire({ color='#7a7a78', w=0.7, d=0.7, h=0.45 } = {}) {
  const g = new THREE.Group();
  const stoneMat = mat(color, 0.95, 0.0);
  // Stone ring (9 stones)
  const N = 9, R = 0.3;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const s = new THREE.Mesh(roundedBoxGeom(0.13, 0.1, 0.11, 0.04, 2), mat(shade(color, 0.85 + (i % 3) * 0.1), 0.95));
    s.position.set(Math.cos(a) * R, 0.05, Math.sin(a) * R);
    s.rotation.y = a + 0.3; s.castShadow = true; g.add(s);
  }
  // Ash bed
  g.add(cylAt(0.26, 0.28, 0.03, 16, mat('#3a3632', 0.95), 0, 0.015, 0));
  // Crossed logs
  const logMat = mat('#5a3a24', 0.8, 0.02);
  const logBurnt = mat('#2a201a', 0.85);
  [[0, 0.2], [Math.PI / 3, -0.05], [-Math.PI / 3, 0.08]].forEach(([rot, off], i) => {
    const log = cylAt(0.035, 0.04, 0.42, 8, i === 0 ? logBurnt : logMat, 0, 0.08 + i * 0.015, off);
    log.rotation.z = Math.PI / 2; log.rotation.y = rot; g.add(log);
  });
  // Glowing embers
  g.add(cylAt(0.12, 0.14, 0.025, 12, new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.85 }), 0, 0.05, 0));
  // Flames (3 cones, emissive, translucent)
  const flameColors = [0xff8a1a, 0xffb840, 0xff5a1a];
  const flameH = [0.34, 0.26, 0.22];
  const flamePos = [[0, 0], [-0.07, 0.05], [0.08, -0.04]];
  for (let i = 0; i < 3; i++) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08 - i * 0.015, flameH[i], 10),
      new THREE.MeshBasicMaterial({ color: flameColors[i], transparent: true, opacity: 0.6 }));
    flame.position.set(flamePos[i][0], 0.1 + flameH[i] / 2, flamePos[i][1]); g.add(flame);
  }
  return g;
}

// ============================================================ COOLER BOX
function buildCoolerBox({ color='#d83a3a', w=0.6, d=0.4, h=0.42 } = {}) {
  const g = new THREE.Group();
  const bodyMat = mat(color, 0.5, 0.08);
  const lidMat = mat(shade(color, 1.1), 0.5, 0.08);
  const trim = mat('#e8e8e4', 0.55, 0.05);
  const metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  // Body
  const body = new THREE.Mesh(roundedBoxGeom(w, h * 0.72, d, 0.03, 3), bodyMat);
  body.position.set(0, h * 0.36, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  // Base feet rail
  g.add(box(w - 0.04, 0.03, d - 0.04, mat(shade(color, 0.7), 0.6), 0, 0.015, 0));
  // Lid (overhanging)
  const lid = new THREE.Mesh(roundedBoxGeom(w + 0.02, h * 0.22, d + 0.02, 0.025, 3), lidMat);
  lid.position.set(0, h * 0.72 + h * 0.11, 0); lid.castShadow = true; lid.userData.colorable = true; g.add(lid);
  // Lid top recessed panel
  g.add(box(w - 0.1, 0.012, d - 0.1, mat(shade(color, 0.95), 0.55), 0, h * 0.72 + h * 0.22, 0));
  // Hinge bar (back)
  g.add(box(w - 0.08, 0.02, 0.02, metal, 0, h * 0.72 + 0.01, -d / 2 + 0.02));
  // Front latch
  g.add(box(0.07, 0.05, 0.025, trim, 0, h * 0.7, d / 2 + 0.005));
  g.add(box(0.04, 0.025, 0.02, metal, 0, h * 0.69, d / 2 + 0.018));
  // Side handles (fold-down, 2)
  [-w / 2 - 0.005, w / 2 + 0.005].forEach(hx => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), trim);
    handle.rotation.y = Math.PI / 2; handle.rotation.z = hx > 0 ? Math.PI : 0;
    handle.position.set(hx, h * 0.4, 0); g.add(handle);
  });
  // Drain plug (side)
  g.add(cylAt(0.018, 0.018, 0.02, 10, metal, -w / 2 - 0.005, 0.07, d / 4));
  return g;
}

// ============================================================ CAMPING LANTERN
function buildLantern({ color='#2f6f4a', w=0.18, d=0.18, h=0.32 } = {}) {
  const g = new THREE.Group();
  const metalMat = mat(color, 0.4, 0.5, { env: 0.7 });
  const steelMat = mat('#b8bcc0', 0.3, 0.75, { env: 0.9 });
  // Fuel tank base
  const tank = cylAt(0.075, 0.085, 0.09, 18, metalMat, 0, 0.045, 0); tank.castShadow = true; tank.userData.colorable = true; g.add(tank);
  // Base rim
  g.add(cylAt(0.088, 0.088, 0.012, 18, steelMat, 0, 0.012, 0));
  // Pump knob on tank side
  const knob = cylAt(0.014, 0.014, 0.04, 8, mat('#c02a2a', 0.5), 0.085, 0.05, 0); knob.rotation.z = Math.PI / 2; g.add(knob);
  // Lower frame posts (3)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(cylAt(0.006, 0.006, 0.13, 6, steelMat, Math.cos(a) * 0.06, 0.155, Math.sin(a) * 0.06));
  }
  // Glass globe (emissive warm glow)
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xfff0c0, roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.55, emissive: 0xffcf70, emissiveIntensity: 0.9 });
  const globe = cylAt(0.062, 0.062, 0.12, 18, glassMat, 0, 0.155, 0); g.add(globe);
  // Inner mantle glow
  const mantle = cylAt(0.025, 0.02, 0.05, 10, new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.95 }), 0, 0.155, 0); g.add(mantle);
  // Top vent cap (ventilator cone)
  g.add(cylAt(0.06, 0.075, 0.03, 18, metalMat, 0, 0.235, 0));
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.05, 18), metalMat);
  cap.position.y = 0.27; cap.userData.colorable = true; g.add(cap);
  g.add(cylAt(0.01, 0.01, 0.02, 8, steelMat, 0, 0.3, 0));
  // Wire bail handle (arc)
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.005, 6, 16, Math.PI), steelMat);
  handle.position.y = 0.3; g.add(handle);
  return g;
}

export { buildTent, buildCampChair, buildCampfire, buildCoolerBox, buildLantern };
