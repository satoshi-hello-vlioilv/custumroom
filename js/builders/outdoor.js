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

// ============================================================ CAMP CHAIR (Helinox チェアワン 52.5×51×65, 座面高33.5)
// 左右のハブから4本の脚と4本の支柱(前2本=座面前隅, 後2本=背もたれ上端)が伸びるポールフレーム + 吊り布シート
function buildCampChair({ color='#2f5fa0', w=0.525, d=0.51, h=0.65 } = {}) {
  const g = new THREE.Group();
  const pole = mat('#3a3d42', 0.35, 0.6, { env: 0.7 });
  const hubM = mat('#1e2024', 0.6, 0.2);
  const fabric = fabricMat(color);
  const seatY = 0.335, hubY = 0.2, hubX = w / 2 - 0.05;
  const UP = new THREE.Vector3(0, 1, 0);
  const seg = (p0, p1, r, m) => {
    const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1);
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
    c.position.copy(a).addScaledVector(dir, 0.5); c.quaternion.setFromUnitVectors(UP, dir.normalize()); c.castShadow = true; return c;
  };
  [-1, 1].forEach(s => {
    const hub = [s * hubX, hubY, 0];
    const hb = cylAt(0.022, 0.022, 0.06, 10, hubM, s * hubX, hubY, 0); hb.rotation.z = Math.PI / 2; g.add(hb);
    g.add(seg(hub, [s * (w / 2), 0.01, d / 2 - 0.02], 0.007, pole));            // 前脚
    g.add(seg(hub, [s * (w / 2), 0.01, -d / 2 + 0.02], 0.007, pole));           // 後脚
    g.add(seg(hub, [s * (w / 2 - 0.03), seatY + 0.02, d / 2 - 0.08], 0.007, pole)); // 前支柱
    g.add(seg(hub, [s * (w / 2 - 0.02), h, -d / 2 + 0.1], 0.007, pole));        // 後支柱
    [d / 2 - 0.02, -d / 2 + 0.02].forEach(z => g.add(cylAt(0.014, 0.012, 0.02, 8, hubM, s * (w / 2), 0.01, z))); // 脚キャップ
  });
  g.add(seg([-hubX, hubY, 0], [hubX, hubY, 0], 0.007, pole));                     // ハブ間の横ポール
  // 吊り布シート (前が高く, 後ろに沈む)
  const seat = new THREE.Mesh(roundedBoxGeom(w - 0.08, 0.02, d - 0.16, 0.01, 2), fabric);
  seat.position.set(0, seatY - 0.02, 0.02); seat.rotation.x = -0.15; seat.castShadow = true; seat.userData.colorable = true; g.add(seat);
  // 背もたれ (後傾, 後支柱の先端まで)
  const back = new THREE.Mesh(roundedBoxGeom(w - 0.06, h - seatY + 0.03, 0.02, 0.02, 2), fabric);
  back.position.set(0, seatY + (h - seatY) / 2 - 0.03, -d / 2 + 0.14); back.rotation.x = -0.28; back.castShadow = true; back.userData.colorable = true; g.add(back);
  // 側面のメッシュ布
  [-1, 1].forEach(s => {
    const side = new THREE.Mesh(roundedBoxGeom(0.012, 0.16, d * 0.45, 0.005, 2), fabricMat(shade(color, 0.9)));
    side.position.set(s * (w / 2 - 0.045), seatY + 0.07, -d / 2 + 0.2); side.rotation.x = -0.28;
    side.material.transparent = true; side.material.opacity = 0.85; g.add(side);
  });
  return g;
}

// ============================================================ CAMPFIRE (コールマン ファイアーディスク φ45×H23 + 薪・炎)
function buildCampfire({ color='#c8ccd0', w=0.45, d=0.45, h=0.45 } = {}) {
  const g = new THREE.Group();
  const steel = mat(color, 0.3, 0.8, { env: 1.0 }); steel.side = THREE.DoubleSide;
  const legM = mat('#3a3d42', 0.4, 0.6);
  const R = Math.min(w, d) / 2, rimY = 0.23, dishH = 0.09;
  // ステンレスの皿 (浅い円錐台, 内外両面) + 底 + 縁
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(R, R * 0.55, dishH, 32, 1, true), steel);
  dish.position.y = rimY - dishH / 2; dish.castShadow = true; dish.userData.colorable = true; g.add(dish);
  g.add(cylAt(R * 0.55, R * 0.55, 0.01, 32, steel, 0, rimY - dishH, 0));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.008, 8, 40), steel); rim.rotation.x = Math.PI / 2; rim.position.y = rimY; g.add(rim);
  // 折りたたみ脚 3本 (皿底から外側斜め下へ)
  const UP = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * Math.PI * 2 + Math.PI / 6;
    const top = new THREE.Vector3(Math.cos(a) * R * 0.45, rimY - dishH, Math.sin(a) * R * 0.45);
    const foot = new THREE.Vector3(Math.cos(a) * R * 0.85, 0.01, Math.sin(a) * R * 0.85);
    const dir = new THREE.Vector3().subVectors(foot, top), len = dir.length();
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, len, 8), legM);
    leg.position.copy(top).addScaledVector(dir, 0.5); leg.quaternion.setFromUnitVectors(UP, dir.normalize()); leg.castShadow = true; g.add(leg);
    g.add(cylAt(0.014, 0.012, 0.015, 8, mat('#222', 0.7), foot.x, 0.008, foot.z));
  }
  // 灰 + 薪 (皿の中)
  g.add(cylAt(R * 0.5, R * 0.5, 0.015, 24, mat('#3a3632', 0.95), 0, rimY - dishH + 0.012, 0));
  const logMat = mat('#5a3a24', 0.8, 0.02), logBurnt = mat('#2a201a', 0.85);
  [[0, 0.03], [Math.PI / 3, -0.02], [-Math.PI / 3, 0.02]].forEach(([rot, off], i) => {
    const log = cylAt(0.025, 0.03, R * 1.1, 8, i === 0 ? logBurnt : logMat, 0, rimY - dishH + 0.04 + i * 0.012, off);
    log.rotation.z = Math.PI / 2; log.rotation.y = rot; g.add(log);
  });
  // 熾火 + 炎 (3つの半透明コーン)
  g.add(cylAt(0.08, 0.1, 0.02, 12, new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.85 }), 0, rimY - dishH + 0.05, 0));
  const flameColors = [0xff8a1a, 0xffb840, 0xff5a1a];
  const flameH = [h - rimY + 0.06, 0.16, 0.13];
  const flamePos = [[0, 0], [-0.05, 0.04], [0.06, -0.03]];
  for (let i = 0; i < 3; i++) {
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.06 - i * 0.012, flameH[i], 10),
      new THREE.MeshBasicMaterial({ color: flameColors[i], transparent: true, opacity: 0.6 }));
    flame.position.set(flamePos[i][0], rimY - 0.03 + flameH[i] / 2, flamePos[i][1]); g.add(flame);
  }
  return g;
}

// ============================================================ COOLER BOX
// コールマン 54QT スチールベルトクーラー (62×42×41cm): 塗装スチールのボディにステンレスの帯(ベルト)・クロームのラッチと側面ハンドル
function buildCoolerBox({ color='#d83a3a', w=0.62, d=0.42, h=0.41 } = {}) {
  const g = new THREE.Group();
  const bodyMat = mat(color, 0.35, 0.35, { env: 0.7 });
  const lidMat = mat(shade(color, 1.08), 0.35, 0.35, { env: 0.7 });
  const trim = mat('#d8dde2', 0.2, 0.85, { env: 1.0 });   // ステンレスベルト
  const metal = mat('#b9c2cb', 0.25, 0.9, { env: 1.0 });  // クローム金具
  // Body
  const body = new THREE.Mesh(roundedBoxGeom(w, h * 0.72, d, 0.02, 3), bodyMat);
  body.position.set(0, h * 0.36, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  // Stainless belts: base band + upper band (just under the lid)
  g.add(box(w + 0.006, 0.04, d + 0.006, trim, 0, 0.03, 0));
  g.add(box(w + 0.006, 0.035, d + 0.006, trim, 0, h * 0.72 - 0.025, 0));
  // Lid (overhanging, with stainless edge band)
  const lid = new THREE.Mesh(roundedBoxGeom(w + 0.02, h * 0.22, d + 0.02, 0.02, 3), lidMat);
  lid.position.set(0, h * 0.72 + h * 0.11, 0); lid.castShadow = true; lid.userData.colorable = true; g.add(lid);
  g.add(box(w + 0.026, 0.02, d + 0.026, trim, 0, h * 0.72 + 0.012, 0));
  // Lid top recessed panel
  g.add(box(w - 0.1, 0.012, d - 0.1, mat(shade(color, 0.95), 0.4, 0.3), 0, h * 0.72 + h * 0.22, 0));
  // Hinges (back, 2)
  [-w * 0.3, w * 0.3].forEach(hx => g.add(box(0.05, 0.03, 0.02, metal, hx, h * 0.72 + 0.01, -d / 2 - 0.005)));
  // Front chrome latch
  g.add(box(0.05, 0.06, 0.015, metal, 0, h * 0.72, d / 2 + 0.008));
  g.add(box(0.03, 0.025, 0.02, metal, 0, h * 0.68, d / 2 + 0.018));
  // Side handles (chrome loop, 2)
  [-w / 2 - 0.005, w / 2 + 0.005].forEach(hx => {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 12, Math.PI), metal);
    handle.rotation.y = Math.PI / 2; handle.rotation.z = hx > 0 ? Math.PI : 0;
    handle.position.set(hx, h * 0.4, 0); g.add(handle);
  });
  // Drain plug (side)
  g.add(cylAt(0.018, 0.018, 0.02, 10, metal, -w / 2 - 0.005, 0.07, d / 4));
  return g;
}

// ============================================================ CAMPING LANTERN
// コールマン ワンマントルランタン 286A (φ16×H31cm): 形状は φ0.18×0.32 で作成し w/d/h にスケール
function buildLantern({ color='#2f6f4a', w=0.16, d=0.16, h=0.31 } = {}) {
  const g = new THREE.Group();
  g.scale.set(w / 0.18, h / 0.32, d / 0.18);
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
