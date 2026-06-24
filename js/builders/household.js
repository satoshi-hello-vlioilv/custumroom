import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

function buildShoeCabinet({ color='#f3ece0', w=0.9, d=0.35, h=1.1 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.65), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const body = box(w, h-0.06, d, wood, 0, (h-0.06)/2, 0); body.userData.colorable = true; g.add(body);
  g.add(box(w+0.04, 0.04, d+0.03, mat(shade(color,0.92), 0.55), 0, h-0.02, 0)); // top surface
  const dw = w/2 - 0.02;
  [-dw/2-0.01, dw/2+0.01].forEach(dx => {
    const door = box(dw, h-0.16, 0.03, mat(shade(color,1.08), 0.6), dx, (h-0.06)/2, d/2+0.005); door.userData.colorable = true; g.add(door);
    const hdl = cyl(0.008,0.008,0.14,8,metal); hdl.rotation.y = Math.PI/2; hdl.position.set(dx, (h-0.06)/2, d/2+0.03); g.add(hdl);
  });
  return g;
}
function buildToilet({ color='#e8e2d6', w=0.5, d=0.7, h=0.8 } = {}) {
  const g = new THREE.Group(); const white = mat('#f5f3ee', 0.25, 0.05, { env: 0.5 });
  // bowl
  const bowl = cylAt(0.2, 0.16, 0.32, 24, white, 0, 0.2, 0.12); bowl.scale.z = 0.85; g.add(bowl);
  g.add(box(0.34, 0.06, 0.4, white, 0, 0.4, 0.12)); // seat ring base
  g.add(box(0.36, 0.04, 0.42, mat('#fbfaf6', 0.3), 0, 0.45, 0.12)); // lid (closed)
  // tank
  const tank = box(0.42, 0.42, 0.18, white, 0, 0.6, -d/2+0.11); g.add(tank);
  g.add(box(0.2, 0.02, 0.04, mat('#cfd3d6', 0.3, 0.6, { env: 0.8 }), 0, 0.83, -d/2+0.13)); // flush button strip
  g.add(cylAt(0.17, 0.19, 0.06, 16, white, 0, 0.03, 0.12)); // base foot
  return g;
}
function buildHandBasin({ color='#e8e2d6', w=0.4, d=0.3, h=0.85 } = {}) {
  const g = new THREE.Group(); const white = mat('#f5f3ee', 0.25, 0.05, { env: 0.5 }), metal = mat('#cfd3d6', 0.2, 0.85, { env: 1.0 });
  g.add(box(0.08, h-0.12, 0.1, white, 0, (h-0.12)/2, -d/2+0.05)); // bracket
  const bowl = cylAt(w/2-0.02, w/2-0.08, 0.13, 20, white, 0, h-0.06, 0.02); g.add(bowl);
  g.add(cylAt(w/2-0.05, w/2-0.05, 0.02, 20, mat('#0d1117', 0.3, 0.2), 0, h-0.01, 0.02)); // drain hint
  // faucet
  const spout = box(0.04, 0.12, 0.04, metal, 0, h+0.05, -d/2+0.06); g.add(spout);
  g.add(box(0.04, 0.04, 0.08, metal, 0, h+0.1, -d/2+0.1));
  return g;
}
function buildVanity({ color='#e8e2d6', w=0.75, d=0.5, h=1.85 } = {}) {
  const g = new THREE.Group(); const white = mat('#f3f0ea', 0.3, 0.05), wood = mat(color, 0.6), metal = mat('#cfd3d6', 0.2, 0.85, { env: 1.0 });
  const counterH = 0.82;
  const cab = box(w, counterH-0.06, d, wood, 0, (counterH-0.06)/2, 0); cab.userData.colorable = true; g.add(cab);
  [-w/4, w/4].forEach(dx => { g.add(box(w/2-0.04, counterH-0.18, 0.02, mat(shade(color,1.08), 0.6), dx, (counterH-0.06)/2, d/2+0.005)); const hd=cyl(0.007,0.007,0.1,8,metal); hd.rotation.x=Math.PI/2; hd.position.set(dx,(counterH-0.06)/2,d/2+0.02); g.add(hd); });
  // counter + inset basin
  g.add(box(w+0.02, 0.05, d+0.02, white, 0, counterH, 0));
  g.add(box(w*0.45, 0.04, d*0.55, mat('#dcdedf', 0.25, 0.1), 0, counterH+0.005, 0.03)); // basin recess
  g.add(box(0.04, 0.14, 0.04, metal, 0, counterH+0.09, -d/2+0.07)); // faucet
  g.add(box(0.04, 0.04, 0.08, metal, 0, counterH+0.15, -d/2+0.1));
  // mirror above
  const mirror = box(w-0.06, 0.7, 0.03, mat('#cfe0e8', 0.04, 0.9, { env: 1.2 }), 0, h-0.4, -d/2+0.03); g.add(mirror);
  g.add(box(w+0.02, 0.74, 0.05, mat(shade(color,0.9), 0.5), 0, h-0.4, -d/2+0.01)); // mirror frame
  return g;
}
function buildWasher({ color='#e8e2d6', w=0.6, d=0.6, h=0.9 } = {}) {
  const g = new THREE.Group(); const body = mat('#eceef0', 0.4, 0.1, { env: 0.4 }), dark = mat('#2a2f33', 0.2, 0.3), glass = new THREE.MeshStandardMaterial({ color: 0x223044, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.6 });
  const b = box(w, h-0.04, d, body, 0, (h-0.04)/2, 0); b.userData.colorable = true; g.add(b);
  g.add(box(w-0.02, 0.06, d-0.02, mat('#d6d9db', 0.4), 0, h-0.02, 0)); // top
  g.add(box(w*0.55, 0.07, 0.04, dark, -0.04, h-0.05, d/2-0.01)); // control strip
  g.add(cylAt(0.04, 0.04, 0.02, 14, mat('#7fd4ff', 0.3, 0.2), w/2-0.1, h-0.05, d/2+0.005)); // dial
  // round door
  const ring = cylAt(0.17, 0.17, 0.04, 24, dark, 0, h/2-0.05, d/2-0.02); ring.rotation.x = Math.PI/2; g.add(ring);
  const win = cylAt(0.13, 0.13, 0.05, 24, glass, 0, h/2-0.05, d/2+0.005); win.rotation.x = Math.PI/2; g.add(win);
  return g;
}
function buildBathtub({ color='#b9714a', w=0.8, d=1.6, h=0.6 } = {}) {
  const g = new THREE.Group(); const shell = mat('#f3f0ea', 0.25, 0.05, { env: 0.5 }), water = new THREE.MeshStandardMaterial({ color: 0x9ad3e6, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.5 });
  const outer = box(w, h, d, shell, 0, h/2, 0); outer.userData.colorable = true; g.add(outer);
  g.add(box(w-0.12, 0.4, d-0.12, mat('#dfe6e6', 0.2, 0.1), 0, h/2+0.06, 0)); // inner well
  const surf = box(w-0.16, 0.02, d-0.16, water, 0, h-0.1, 0); g.add(surf); // water surface
  g.add(box(w+0.02, 0.05, d+0.02, mat('#fbfaf6', 0.2), 0, h, 0)); // rim
  return g;
}
function buildBathSet({ color='#e8e2d6', w=1.6, d=1.6, h=2.2 } = {}) {
  const g = new THREE.Group();
  const panel = mat('#eef0f1', 0.35, 0.05, { env: 0.4 }), metal = mat('#cfd3d6', 0.2, 0.85, { env: 1.0 });
  // shower walls (two sides of the unit)
  g.add(box(0.04, h, d, panel, -w/2+0.02, h/2, 0));
  g.add(box(w, h, 0.04, panel, 0, h/2, -d/2+0.02));
  // bathtub along one side
  const tub = buildBathtub({ color: '#cfe0e8', w: 0.75, d: d-0.3, h: 0.55 }); tub.position.set(w/2-0.42, 0, 0); g.add(tub);
  // shower head + bar on the back wall
  g.add(box(0.05, 0.9, 0.05, metal, -w/2+0.16, 1.4, -d/2+0.08));
  const head = cylAt(0.08, 0.06, 0.04, 16, metal, -w/2+0.16, 1.85, -d/2+0.12); g.add(head);
  // mirror on side wall
  g.add(box(0.02, 0.5, 0.4, mat('#cfe0e8', 0.04, 0.9, { env: 1.2 }), -w/2+0.05, 1.2, d/2-0.45));
  // stool
  g.add(box(0.32, 0.04, 0.26, mat('#dcdee0', 0.4), -w/2+0.45, 0.24, d/2-0.4));
  [[-w/2+0.32,d/2-0.5],[-w/2+0.58,d/2-0.5],[-w/2+0.32,d/2-0.3],[-w/2+0.58,d/2-0.3]].forEach(([lx,lz])=>g.add(box(0.03,0.24,0.03,mat('#cfd3d6',0.4),lx,0.12,lz)));
  return g;
}
function buildCloset({ color='#f3ece0', w=1.6, d=0.6, h=2.2 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.65), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const body = box(w, h, d, wood, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  g.add(box(w+0.06, 0.08, d+0.04, mat(shade(color,0.85), 0.6), 0, h-0.04, 0)); // top frame
  // two sliding doors, offset in depth and shade — stored for animation
  const dw = w/2 - 0.02;
  const slideL = box(dw, h-0.16, 0.04, mat(shade(color,1.05), 0.6), -dw/2, h/2-0.04, d/2-0.01); slideL.userData.colorable = true; g.add(slideL);
  const slideR = box(dw, h-0.16, 0.04, mat(shade(color,0.88), 0.6), dw/2, h/2-0.04, d/2+0.025); slideR.userData.colorable = true; g.add(slideR);
  [[-dw/2,d/2+0.01],[dw/2,d/2+0.045]].forEach(([dx,dz],i)=>{ const hd=cyl(0.01,0.01,0.5,10,metal); hd.position.set(dx + (i?-dw/2+0.06:dw/2-0.06), h/2, dz); g.add(hd); });
  g.userData.parts = { slideL, slideR, slideRange: dw * 0.82 };
  return g;
}
function buildCupboard({ color='#f3ece0', w=0.9, d=0.45, h=1.9 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.65), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xbcd3dc, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.35 });
  const body = box(w, h, d, wood, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  const mid = h*0.45;
  const ldw = w/2-0.04, udw = w/2-0.05;
  // shelves
  for (let i=0;i<2;i++) g.add(box(w-0.1, 0.02, d-0.08, mat(shade(color,0.85),0.7), 0, mid+0.1+i*0.45, 0));
  // lower left door: pivot at left hinge edge
  const lowerL = new THREE.Group(); lowerL.position.set(-w/2+0.02, mid/2, d/2+0.005);
  { const m = box(ldw, mid-0.1, 0.03, mat(shade(color,1.08), 0.6), ldw/2, 0, 0); m.userData.colorable=true; lowerL.add(m); }
  { const hd=cyl(0.008,0.008,0.12,8,metal); hd.rotation.x=Math.PI/2; hd.position.set(ldw-0.05, mid/2-0.18, 0.02); lowerL.add(hd); }
  g.add(lowerL);
  // lower right door: pivot at right hinge edge
  const lowerR = new THREE.Group(); lowerR.position.set(w/2-0.02, mid/2, d/2+0.005);
  { const m = box(ldw, mid-0.1, 0.03, mat(shade(color,1.08), 0.6), -ldw/2, 0, 0); m.userData.colorable=true; lowerR.add(m); }
  { const hd=cyl(0.008,0.008,0.12,8,metal); hd.rotation.x=Math.PI/2; hd.position.set(-ldw+0.05, mid/2-0.18, 0.02); lowerR.add(hd); }
  g.add(lowerR);
  // upper left glass door: pivot at left hinge edge
  const upy = mid+(h-mid)/2-0.02;
  const upperL = new THREE.Group(); upperL.position.set(-w/2+0.02, upy, d/2+0.01);
  upperL.add(box(udw, h-mid-0.12, 0.02, glass, udw/2, 0, 0));
  { const hd=cyl(0.008,0.008,0.12,8,metal); hd.rotation.x=Math.PI/2; hd.position.set(udw-0.05, 0.17-(h-mid)/2, 0.015); upperL.add(hd); }
  g.add(upperL);
  // upper right glass door: pivot at right hinge edge
  const upperR = new THREE.Group(); upperR.position.set(w/2-0.02, upy, d/2+0.01);
  upperR.add(box(udw, h-mid-0.12, 0.02, glass, -udw/2, 0, 0));
  { const hd=cyl(0.008,0.008,0.12,8,metal); hd.rotation.x=Math.PI/2; hd.position.set(-udw+0.05, 0.17-(h-mid)/2, 0.015); upperR.add(hd); }
  g.add(upperR);
  g.userData.parts = { lowerL, lowerR, upperL, upperR };
  return g;
}
function buildKitchenCounter({ color='#e8e2d6', w=2.4, d=0.65, h=0.9 } = {}) {
  const g = new THREE.Group(); const wood = mat(color, 0.6), steel = mat('#c2c7cb', 0.2, 0.85, { env: 1.0 }), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const cab = box(w, h-0.06, d, wood, 0, (h-0.06)/2, 0); cab.userData.colorable = true; g.add(cab);
  g.add(box(w+0.02, 0.06, d+0.02, steel, 0, h-0.03, 0)); // stainless top
  // inset sink (left third)
  g.add(box(0.5, 0.05, 0.4, mat('#0d1117', 0.2, 0.3), -w/2+0.55, h-0.025, 0));
  g.add(box(0.04, 0.18, 0.04, steel, -w/2+0.55, h+0.07, -d/2+0.1)); // faucet
  g.add(box(0.04, 0.04, 0.12, steel, -w/2+0.55, h+0.15, -d/2+0.16));
  // doors + drawers
  const dn = 4;
  for (let i=0;i<dn;i++){ const dx=-w/2+w/(dn)*(i+0.5); const door=box(w/dn-0.05, h-0.22, 0.03, mat(shade(color,1.07),0.6), dx, (h-0.06)/2, d/2+0.005); door.userData.colorable=true; g.add(door); const hd=cyl(0.008,0.008,0.14,8,metal); hd.rotation.y=Math.PI/2; hd.position.set(dx,h-0.18,d/2+0.025); g.add(hd); }
  return g;
}
function buildGasStove({ color='#3a332b', w=0.6, d=0.55, h=0.85 } = {}) {
  const g = new THREE.Group(); const body = mat(color, 0.4, 0.3), glass = mat('#15171a', 0.1, 0.4), metal = mat('#7a8088', 0.3, 0.8, { env: 0.9 });
  const b = box(w, h-0.04, d, body, 0, (h-0.04)/2, 0); b.userData.colorable = true; g.add(b);
  g.add(box(w-0.02, 0.04, d-0.02, glass, 0, h-0.02, 0)); // black glass top
  // 3 burner rings + grates
  [[-0.13,0.1,0.07],[0.13,0.1,0.07],[0,-0.13,0.05]].forEach(([x,z,r])=>{ g.add(cylAt(r,r,0.015,16,mat('#0a0c0e',0.3),x,h+0.005,z)); g.add(cylAt(0.025,0.025,0.025,8,metal,x,h+0.015,z)); });
  // oven door
  g.add(box(w-0.08, h*0.5, 0.02, mat(shade(color,1.3),0.3,0.4), 0, h*0.32, d/2-0.01));
  g.add(box(w-0.16, 0.05, 0.03, metal, 0, h*0.55, d/2+0.005)); // oven handle
  // knobs
  [-0.12, 0, 0.12].forEach(x=>g.add(cylAt(0.025,0.025,0.03,12,metal,x,0.1,d/2-0.005)));
  [[-w/2+0.04,d/2-0.04],[-w/2+0.04,-d/2+0.04],[w/2-0.04,d/2-0.04],[w/2-0.04,-d/2+0.04]].forEach(([lx,lz])=>g.add(box(0.04,0.06,0.04,mat('#222',0.5),lx,0.03,lz)));
  return g;
}
function buildMicrowave({ color='#3a332b', w=0.5, d=0.4, h=0.3 } = {}) {
  const g = new THREE.Group(); const body = mat(color, 0.4, 0.2), glass = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.75 }), metal = mat('#9aa0a4', 0.3, 0.8, { env: 0.9 });
  const b = box(w, h, d, body, 0, h/2, 0); b.userData.colorable = true; g.add(b);
  g.add(box(w*0.6, h-0.05, 0.02, glass, -w*0.08, h/2, d/2+0.005)); // door window
  g.add(box(0.015, h-0.08, 0.02, metal, w*0.22, h/2, d/2+0.02)); // handle
  // control panel strip on right
  g.add(box(w*0.22, h-0.06, 0.015, mat('#1c1f22', 0.4), w/2-0.08, h/2, d/2+0.005));
  for(let i=0;i<3;i++)for(let j=0;j<2;j++) g.add(box(0.03,0.025,0.01,mat('#444',0.5),w/2-0.13+j*0.07,h*0.35+i*0.07,d/2+0.012));
  return g;
}
function buildRiceCooker({ color='#e8e2d6', w=0.3, d=0.35, h=0.28 } = {}) {
  const g = new THREE.Group(); const body = mat('#f0eee9', 0.4, 0.15, { env: 0.4 }), dark = mat('#2a2f33', 0.3, 0.2), metal = mat('#9aa0a4', 0.3, 0.8, { env: 0.9 });
  const b = cylAt(w/2, w/2-0.02, h-0.06, 24, body, 0, (h-0.06)/2, 0); b.scale.z = d/w; b.userData.colorable = true; g.add(b);
  const lid = cylAt(w/2+0.01, w/2-0.01, 0.06, 24, body, 0, h-0.03, 0); lid.scale.z = d/w; g.add(lid);
  g.add(cylAt(0.025, 0.025, 0.03, 12, metal, 0, h+0.005, -0.06)); // steam vent
  g.add(box(w*0.6, 0.05, 0.01, dark, 0, h*0.4, d/2-0.02)); // front display
  return g;
}
function buildFridge({ color='#e8e2d6', w=0.7, d=0.7, h=1.8 } = {}) {
  const g = new THREE.Group(); const body = mat('#dde0e2', 0.35, 0.3, { env: 0.6 }), metal = mat('#9aa0a4', 0.25, 0.85, { env: 1.0 });
  const b = box(w, h, d, body, 0, h/2, 0); b.userData.colorable = true; g.add(b);
  const split = h*0.62;
  g.add(box(w-0.04, 0.02, d-0.04, mat('#b8bcbf', 0.4), 0, split, 0)); // door split line
  // upper door
  g.add(box(w-0.06, split-0.06, 0.02, mat(shade(color,1.03),0.35,0.3), 0, split/2+0.02, d/2+0.005));
  g.add(cylAt(0.015,0.015,split-0.3,10,metal,-w/2+0.08,split/2+0.02,d/2+0.03)); // handle
  // lower freezer
  g.add(box(w-0.06, h-split-0.06, 0.02, mat(shade(color,1.03),0.35,0.3), 0, split+(h-split)/2, d/2+0.005));
  g.add(cylAt(0.015,0.015,h-split-0.3,10,metal,-w/2+0.08,split+(h-split)/2,d/2+0.03));
  return g;
}
function buildWallTV({ color='#1c1c1f', w=1.3, d=0.08, h=0.8 } = {}) {
  const g = new THREE.Group(); const frame = mat(color, 0.3, 0.5, { env: 0.7 }), screen = mat('#08090c', 0.08, 0.25), metal = mat('#444', 0.4, 0.6);
  const cy = 1.35; // mounted height above floor
  // VESA wall mount
  g.add(box(0.22, 0.22, 0.04, metal, 0, cy, -0.02));
  g.add(box(0.04, 0.18, 0.03, metal, 0, cy, 0.0));
  // ultra-thin panel
  const body = box(w, h, 0.035, frame, 0, cy, 0.04); body.userData.colorable = true; g.add(body);
  g.add(box(w-0.025, h-0.025, 0.012, screen, 0, cy, 0.06));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w-0.04, h-0.04), new THREE.MeshBasicMaterial({ color: 0x2c4a6a, transparent: true, opacity: 0.6 })); glow.position.set(0, cy, 0.067); g.add(glow);
  const glow2 = new THREE.Mesh(new THREE.PlaneGeometry((w-0.04)*0.45, (h-0.04)*0.55), new THREE.MeshBasicMaterial({ color: 0x6a90c0, transparent: true, opacity: 0.32 })); glow2.position.set(-w*0.14, cy+0.05, 0.069); g.add(glow2);
  // soundbar below
  g.add(box(w*0.7, 0.05, 0.06, mat('#2a2a2e', 0.5, 0.2), 0, cy - h/2 - 0.08, 0.04));
  return g;
}


function buildWallAC({ color='#f2f2f0', w=0.9, d=0.2, h=0.28 } = {}) {
  const g = new THREE.Group();
  const cy = 1.97;
  // Body
  const bodyMesh = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.022, 3), mat(color, 0.45, 0.05));
  bodyMesh.position.set(0, cy, 0); bodyMesh.castShadow = true; bodyMesh.receiveShadow = true; bodyMesh.userData.colorable = true; g.add(bodyMesh);
  // Front-face horizontal intake slats (7)
  const slatMat = mat(shade(color, 0.78), 0.55);
  for (let i = 0; i < 7; i++) {
    g.add(box(w - 0.06, 0.009, 0.006, slatMat, 0, cy + h * 0.22 - i * 0.023, d / 2 + 0.002));
  }
  // Bottom output louver
  const louver = box(w - 0.04, 0.022, 0.09, mat(shade(color, 0.82), 0.5), 0, cy - h * 0.38, d / 2 - 0.015);
  louver.rotation.x = 0.42; g.add(louver);
  // Top intake grille (4 boxes evenly spaced in z)
  const grilleMat = mat(shade(color, 0.88), 0.5);
  const grilleZStart = -d / 2 + 0.012;
  const grilleZStep = (d - 0.024) / 3;
  for (let i = 0; i < 4; i++) {
    g.add(box(w - 0.1, 0.007, 0.016, grilleMat, 0, cy + h / 2 + 0.003, grilleZStart + i * grilleZStep));
  }
  // LED display strip (right side)
  g.add(box(0.14, 0.014, 0.005, mat('#18283c', 0.6, 0.1), w * 0.27, cy + h * 0.1, d / 2 + 0.003));
  // Glow box
  g.add(box(0.07, 0.009, 0.007, mat('#0099dd', 0.3, 0.5), w * 0.27, cy + h * 0.1, d / 2 + 0.004));
  // IR sensor
  const sensor = cyl(0.007, 0.007, 0.006, 8, mat('#0a0e14', 0.6));
  sensor.rotation.x = Math.PI / 2; sensor.position.set(-w * 0.4, cy, d / 2 + 0.003); g.add(sensor);
  return g;
}

function buildEspressoMachine({ color='#2a2a2e', w=0.3, d=0.38, h=0.42 } = {}) {
  const g = new THREE.Group();
  const bodyMat = mat(color, 0.3, 0.65, { env: 0.9 });
  const chromeMat = mat('#c8ccd0', 0.15, 0.85, { env: 1.1 });
  // Drip tray
  g.add(box(w-0.02, 0.022, d-0.06, mat('#2a2a2e', 0.45, 0.5), 0, 0.011, 0.02));
  // Tray grate
  g.add(box(w-0.06, 0.008, d-0.12, mat('#3a3a3e', 0.5, 0.6), 0, 0.024, 0.02));
  // Main body
  const body = new THREE.Mesh(roundedBoxGeom(w-0.02, h-0.06, d-0.04, 0.022, 3), bodyMat);
  body.position.set(0, 0.03+(h-0.06)/2, 0); body.castShadow = true; body.userData.colorable = true; g.add(body);
  // Water reservoir (rear)
  g.add(box(w-0.08, h*0.62, 0.06, mat(shade(color,1.4), 0.35, 0.4), 0, 0.06+h*0.31, -d/2+0.04));
  // Front panel area (buttons)
  g.add(box(w-0.08, h*0.22, 0.012, mat('#1a1a1e', 0.5, 0.3), 0, 0.03+h-0.06-h*0.12, d/2-0.06-0.008));
  const btn1 = cylAt(0.012,0.012,0.014,10,chromeMat, -0.055, 0.03+h-0.07, d/2-0.055); btn1.rotation.x = Math.PI/2; g.add(btn1);
  const btn2 = cylAt(0.012,0.012,0.014,10,chromeMat,  0.055, 0.03+h-0.07, d/2-0.055); btn2.rotation.x = Math.PI/2; g.add(btn2);
  // Group head barrel
  const barrel = cylAt(0.032,0.032,0.055,14,chromeMat, 0, 0.14, d/2-0.04); barrel.rotation.x = Math.PI/2; g.add(barrel);
  // Diffuser disk
  const diffuser = cylAt(0.028,0.028,0.01,14,mat('#1a1a1e',0.5,0.4), 0, 0.14, d/2); diffuser.rotation.x = Math.PI/2; g.add(diffuser);
  // Portafilter handle
  g.add(box(0.045, 0.018, 0.18, mat('#4a3020', 0.7), 0, 0.1, d/2+0.06));
  const pfl1 = cylAt(0.01,0.01,0.04,8,chromeMat, -0.02, 0.085, d/2+0.0); g.add(pfl1);
  const pfl2 = cylAt(0.01,0.01,0.04,8,chromeMat,  0.02, 0.085, d/2+0.0); g.add(pfl2);
  // Steam wand base joint
  const swBase = cylAt(0.012,0.012,0.025,8,chromeMat, w/2-0.04, 0.25, 0.04); g.add(swBase);
  // Steam wand
  const wand = box(0.012, 0.12, 0.012, chromeMat, w/2+0.02, 0.18, 0.06); wand.rotation.z = 0.45; g.add(wand);
  // Steam wand tip
  g.add(cylAt(0.008,0.006,0.025,8,chromeMat, w/2+0.04, 0.11, 0.09));
  // Pressure gauge face
  const gauge = cylAt(0.024,0.024,0.008,16,mat('#f0f0e8',0.6), -w*0.28, 0.03+h*0.62, d/2-0.055); gauge.rotation.x = Math.PI/2; g.add(gauge);
  // Gauge inner dial
  const dial = cylAt(0.018,0.018,0.01,16,mat('#1a3060',0.4), -w*0.28, 0.03+h*0.62, d/2-0.055); dial.rotation.x = Math.PI/2; dial.position.z += 0.005; g.add(dial);
  return g;
}

function buildDishwasher({ color='#e0e0dc', w=0.6, d=0.6, h=0.85 } = {}) {
  const g = new THREE.Group();
  const steelMat = mat('#c4c8cc', 0.22, 0.72, { env: 0.8 });
  const bodyMat = mat(color, 0.5, 0.06);
  // Main cabinet
  const cab = box(w, h, d, bodyMat, 0, h/2, 0); cab.userData.colorable = true; g.add(cab);
  // Front door panel
  g.add(box(w-0.02, h-0.08, 0.04, steelMat, 0, (h-0.08)/2, d/2-0.01));
  // Door handle bar
  g.add(box(w-0.1, 0.03, 0.04, mat('#9aa0a4',0.25,0.8,{env:0.9}), 0, h-0.07, d/2+0.01));
  // Control panel strip (top of door)
  g.add(box(w-0.02, 0.06, 0.045, mat('#2a2a2f', 0.4, 0.2), 0, h-0.04, d/2-0.008));
  // Status LED row
  const ledColors = [0x00cc44, 0xff8800, 0x0088ff];
  const ledXPos = [-0.05, 0, 0.05];
  ledColors.forEach((lc, i) => {
    const led = cylAt(0.005,0.005,0.006,6,new THREE.MeshStandardMaterial({color:lc,roughness:0.4,metalness:0.1,emissive:lc,emissiveIntensity:0.5}), ledXPos[i], h-0.04, d/2);
    led.rotation.x = Math.PI/2; g.add(led);
  });
  // Bottom vent
  g.add(box(w-0.04, 0.02, 0.035, mat('#1a1a1e',0.6), 0, 0.013, d/2+0.005));
  // Top cap
  g.add(box(w, 0.02, d, mat(shade(color,0.88),0.45), 0, h-0.01, 0));
  return g;
}

function buildLockerUnit({ color='#8a9a9e', w=1.2, d=0.45, h=1.85 } = {}) {
  const g = new THREE.Group();
  const metalMat = mat(color, 0.38, 0.55, { env: 0.7 });
  const darkMat = mat('#2a2a2e', 0.5, 0.3);
  // Body
  const body = box(w, h, d, metalMat, 0, h/2, 0); body.userData.colorable = true; g.add(body);
  // Base plinth
  g.add(box(w, 0.05, d+0.02, mat(shade(color,0.72),0.45,0.4), 0, 0.025, 0));
  // Top cap
  g.add(box(w+0.02, 0.03, d+0.02, mat(shade(color,0.8),0.4,0.5), 0, h+0.015, 0));
  // 3 door panels
  for (let i = 0; i < 3; i++) {
    const lockerX = -w/3 + (i+0.5)*w/3;
    const door = box(w/3-0.025, h-0.14, 0.03, mat(shade(color,1.12),0.42,0.5), lockerX, h/2, d/2+0.005);
    door.userData.colorable = true; g.add(door);
    // Ventilation slots
    for (let j = 0; j < 3; j++) {
      g.add(box(w/3-0.1, 0.018, 0.035, darkMat, lockerX, h-0.12-j*0.04, d/2+0.006));
    }
    // Handle
    g.add(box(0.06, 0.025, 0.04, mat('#9aa0a4',0.25,0.8,{env:0.9}), lockerX+0.09, h/2, d/2+0.028));
    // Number plate
    g.add(box(0.06, 0.04, 0.004, mat('#f5f0e0',0.8), lockerX-0.06, h-0.07, d/2+0.022));
  }
  // Vertical dividers
  [-w/6, w/6].forEach(dx => {
    g.add(box(0.012, h, 0.035, mat(shade(color,0.72),0.4), dx, h/2, d/2+0.002));
  });
  // Floor channel drain hint
  g.add(box(w-0.08, 0.005, d-0.08, mat('#1a1a1e',0.7), 0, 0.052, 0));
  return g;
}

function buildVendingMachine({ color='#e8e0d8', w=0.75, d=0.35, h=1.85 } = {}) {
  const g = new THREE.Group();
  const bodyMat = mat(color, 0.45, 0.1, { env: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xb8d4e0, roughness: 0.06, metalness: 0.1, transparent: true, opacity: 0.35 });
  const darkMat = mat('#1a1a1e', 0.5, 0.2);
  // Cabinet body
  const cab = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.025, 3), bodyMat);
  cab.position.set(0, h/2, 0); cab.castShadow = true; cab.userData.colorable = true; g.add(cab);
  // Display window
  g.add(plainBox(w-0.14, h*0.52, 0.016, glassMat, 0, h*0.64, d/2-0.005));
  // Product rows behind glass
  const productColors = ['#e8242a','#f5a623','#4a90e2','#7ed321','#d0021b'];
  for (let j = 0; j < 4; j++) {
    g.add(box(w-0.22, 0.08, 0.04, mat(productColors[j%5], 0.7), 0, h*0.42+j*0.1, d/2-0.04));
  }
  // Interior glow
  const glow = new THREE.Mesh(new THREE.BoxGeometry(w-0.2, h*0.48, 0.01), new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.3 }));
  glow.position.set(0, h*0.62, d/2-0.06); g.add(glow);
  // Payment panel
  g.add(box(0.18, h*0.22, 0.04, mat('#1a1a1e',0.4), w*0.28, h*0.28, d/2-0.002));
  // Panel screen
  g.add(box(0.12, 0.08, 0.008, mat('#0a1828',0.3,0.15), w*0.28, h*0.34, d/2+0.022));
  // Coin slot
  g.add(box(0.06, 0.012, 0.012, darkMat, w*0.28, h*0.26, d/2+0.022));
  // Bill slot
  g.add(box(0.09, 0.018, 0.012, darkMat, w*0.28, h*0.22, d/2+0.022));
  // Dispense slot
  g.add(box(w-0.16, 0.05, 0.06, mat(shade(color,0.7),0.5), 0, 0.16, d/2-0.01));
  g.add(box(w-0.24, 0.04, 0.04, darkMat, 0, 0.16, d/2+0.006));
  // Coin return
  g.add(box(0.055, 0.04, 0.04, darkMat, -w*0.32, h*0.16, d/2-0.002));
  // Decorative stripe
  g.add(box(0.06, h-0.1, 0.025, mat('#e8242a', 0.6), -w/2+0.06, h/2, d/2-0.003));
  return g;
}

export { buildBathSet, buildBathtub, buildCloset, buildCupboard, buildDishwasher, buildEspressoMachine, buildFridge, buildGasStove, buildHandBasin, buildKitchenCounter, buildLockerUnit, buildMicrowave, buildRiceCooker, buildShoeCabinet, buildToilet, buildVanity, buildVendingMachine, buildWallAC, buildWallTV, buildWasher };
