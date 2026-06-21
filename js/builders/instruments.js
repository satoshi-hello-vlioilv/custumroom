import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

function buildHPLC({ color='#e8e8e8', w=0.5, d=0.55, h=1.6 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.5, 0.05), module_m = mat(shade(color, 0.88), 0.5, 0.05), accent = mat('#2255aa', 0.4, 0.1);
  const numModules = 5;
  const modH = (h - 0.06) / numModules;
  for (let i = 0; i < numModules; i++) {
    const m = new THREE.Mesh(roundedBoxGeom(w, modH - 0.01, d, 0.02, 4), i % 2 === 0 ? body : module_m); m.position.set(0, modH / 2 + i * modH + 0.01, 0); m.castShadow = true; m.userData.colorable = (i === 0); g.add(m);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.85, 0.012, 0.01), accent); strip.position.set(0, modH / 2 + i * modH + 0.01 + modH * 0.35, d / 2 + 0.001); g.add(strip);
  }
  const screen = plainBox(w * 0.5, modH * 0.55, 0.01, mat('#0a1a3a', 0.6, 0, { emissive: '#1a5a8a', emissiveIntensity: 0.5 }), -w * 0.1, modH * 0.5 + (numModules - 1) * modH * 0.4, d / 2 + 0.008); g.add(screen);
  const tubeColors = ['#c8c800', '#00c8c8', '#c80000'];
  tubeColors.forEach((tc, i) => {
    const tube = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.006, 6, 14, Math.PI * 0.7), mat(tc, 0.5)); tube.position.set(-w * 0.35 + i * 0.06, h * 0.55, d * 0.38); tube.rotation.y = 0.5; g.add(tube);
  });
  return g;
}
function buildSpectrophotometer({ color='#d8d8d8', w=0.55, d=0.4, h=0.35 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.5, 0.05), dark = mat('#1a1a1a', 0.7);
  const base = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.025, 4), body); base.position.set(0, h / 2, 0); base.castShadow = true; base.userData.colorable = true; g.add(base);
  const samplePort = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 14), dark); samplePort.position.set(0, h * 0.75, 0); samplePort.castShadow = true; g.add(samplePort);
  const lid = new THREE.Mesh(roundedBoxGeom(0.12, 0.04, 0.12, 0.01, 4), mat('#888', 0.4, 0.2)); lid.position.set(0, h * 0.8, 0); g.add(lid);
  const screen = plainBox(0.18, 0.1, 0.01, mat('#0a1a3a', 0.6, 0, { emissive: '#22aa55', emissiveIntensity: 0.6 }), w * 0.2, h * 0.6, d / 2 + 0.008); g.add(screen);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.025, 12), mat('#666', 0.4, 0.3)); knob.rotation.x = Math.PI / 2; knob.position.set(-w * 0.3, h * 0.55, d / 2 + 0.012); g.add(knob);
  return g;
}
function buildLabOven({ color='#c8c8c0', w=0.6, d=0.5, h=0.6 } = {}) {
  const g = new THREE.Group();
  const outer = mat(color, 0.45, 0.1), inner = mat('#cccccc', 0.35, 0.2), glass_m = new THREE.MeshStandardMaterial({ color: 0xd8e8f0, transparent: true, opacity: 0.3, roughness: 0.05 });
  const body = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.02, 4), outer); body.position.set(0, h / 2, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  const doorFrame = new THREE.Mesh(roundedBoxGeom(w * 0.6, h * 0.72, 0.03, 0.01, 4), mat('#999', 0.3, 0.4)); doorFrame.position.set(0, h * 0.5, d / 2 + 0.005); g.add(doorFrame);
  const doorGlass = plainBox(w * 0.5, h * 0.6, 0.015, glass_m, 0, h * 0.5, d / 2 + 0.018); g.add(doorGlass);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, w * 0.35, 8), mat('#888', 0.25, 0.7)); handle.rotation.z = Math.PI / 2; handle.position.set(0, h * 0.28, d / 2 + 0.04); g.add(handle);
  const panel = plainBox(w * 0.38, h * 0.18, 0.01, mat('#1a1a1a', 0.7), w * 0.26, h * 0.88, d / 2 + 0.005); g.add(panel);
  const display = plainBox(0.12, 0.07, 0.01, mat('#001a00', 0.7, 0, { emissive: '#00cc44', emissiveIntensity: 0.7 }), w * 0.22, h * 0.88, d / 2 + 0.01); g.add(display);
  return g;
}
function buildIncubator({ color='#e0e0d8', w=0.7, d=0.65, h=0.85 } = {}) {
  const g = new THREE.Group();
  const outer = mat(color, 0.45, 0.05), glass_m = new THREE.MeshStandardMaterial({ color: 0xd0eaf8, transparent: true, opacity: 0.2, roughness: 0.05 });
  const body = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.025, 4), outer); body.position.set(0, h / 2, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  const doorL = plainBox((w - 0.06) / 2, h * 0.76, 0.015, glass_m, -w / 4 - 0.01, h * 0.48, d / 2 + 0.004); g.add(doorL);
  const doorR = plainBox((w - 0.06) / 2, h * 0.76, 0.015, glass_m, w / 4 + 0.01, h * 0.48, d / 2 + 0.004); g.add(doorR);
  const divider = new THREE.Mesh(roundedBoxGeom(0.025, h * 0.78, 0.02, 0.005, 4), mat('#bbb', 0.4, 0.2)); divider.position.set(0, h * 0.48, d / 2 + 0.007); g.add(divider);
  [h * 0.28, h * 0.52, h * 0.68].forEach(sy => {
    const shelf = new THREE.Mesh(roundedBoxGeom(w - 0.08, 0.015, d - 0.08, 0.004, 4), mat('#bbb', 0.3, 0.4)); shelf.position.set(0, sy, 0); g.add(shelf);
  });
  const panel = plainBox(w * 0.5, h * 0.12, 0.01, mat('#111', 0.7), 0, h * 0.94, d / 2 + 0.005); g.add(panel);
  const display = plainBox(0.14, 0.07, 0.01, mat('#001a00', 0.7, 0, { emissive: '#00cc44', emissiveIntensity: 0.7 }), -0.08, h * 0.94, d / 2 + 0.01); g.add(display);
  return g;
}
function buildUltrasonicCleaner({ color='#c0c8cc', w=0.35, d=0.28, h=0.28 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.35, 0.3, { env: 0.5 }), tank_m = mat('#d0d8dc', 0.25, 0.4, { env: 0.6 }), water_m = new THREE.MeshStandardMaterial({ color: 0xb0d0e8, transparent: true, opacity: 0.45, roughness: 0.05 });
  const outer = new THREE.Mesh(roundedBoxGeom(w, h * 0.72, d, 0.02, 4), body); outer.position.set(0, h * 0.36, 0); outer.castShadow = true; outer.userData.colorable = true; g.add(outer);
  const tankInner = new THREE.Mesh(roundedBoxGeom(w - 0.06, h * 0.52, d - 0.06, 0.01, 4), tank_m); tankInner.position.set(0, h * 0.3, 0); g.add(tankInner);
  const waterSurf = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.08, d - 0.08), water_m); waterSurf.rotation.x = -Math.PI / 2; waterSurf.position.set(0, h * 0.52, 0); g.add(waterSurf);
  const lid = new THREE.Mesh(roundedBoxGeom(w, 0.025, d, 0.01, 4), mat(shade(color, 0.9), 0.35, 0.3)); lid.position.set(0, h * 0.73, 0); g.add(lid);
  const ctrlBox = new THREE.Mesh(roundedBoxGeom(w * 0.55, h * 0.25, d * 0.3, 0.01, 4), mat('#2a2a2a', 0.7)); ctrlBox.position.set(w * 0.2, h * 0.88, 0); ctrlBox.castShadow = true; g.add(ctrlBox);
  const display = plainBox(0.08, 0.04, 0.008, mat('#001800', 0.7, 0, { emissive: '#00cc44', emissiveIntensity: 0.7 }), w * 0.18, h * 0.9, d * 0.15 + 0.005); g.add(display);
  return g;
}
function buildVacuumPump({ color='#4a4a4a', w=0.4, d=0.3, h=0.4 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.45, 0.2, { env: 0.4 }), metal = mat('#888', 0.25, 0.7, { env: 0.7 }), oil_m = mat('#c8a020', 0.3, 0.1);
  const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, w * 0.62, 20), body); motorBody.rotation.z = Math.PI / 2; motorBody.position.set(-w * 0.1, h * 0.52, 0); motorBody.castShadow = true; motorBody.userData.colorable = true; g.add(motorBody);
  const pumpBody = new THREE.Mesh(new THREE.CylinderGeometry(d * 0.38, d * 0.38, w * 0.32, 16), mat(shade(color, 1.2), 0.35, 0.3)); pumpBody.rotation.z = Math.PI / 2; pumpBody.position.set(w * 0.28, h * 0.52, 0); pumpBody.castShadow = true; g.add(pumpBody);
  const base = new THREE.Mesh(roundedBoxGeom(w, 0.06, d, 0.015, 4), mat('#333', 0.6)); base.position.set(0, 0.03, 0); base.castShadow = true; g.add(base);
  const oilReservoir = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.12, 12), oil_m); oilReservoir.position.set(w * 0.3, h * 0.3, d * 0.3); oilReservoir.castShadow = true; g.add(oilReservoir);
  const oilCap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 12), metal); oilCap.position.set(w * 0.3, h * 0.36, d * 0.3); g.add(oilCap);
  const inletPort = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.06, 10), metal); inletPort.rotation.x = Math.PI / 2; inletPort.position.set(w * 0.3, h * 0.58, d / 2 + 0.03); g.add(inletPort);
  const exhaustPort = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 10), metal); exhaustPort.rotation.z = Math.PI / 2; exhaustPort.position.set(w / 2 + 0.025, h * 0.62, 0); g.add(exhaustPort);
  return g;
}


export { buildHPLC, buildIncubator, buildLabOven, buildSpectrophotometer, buildUltrasonicCleaner, buildVacuumPump };
