import * as THREE from 'three';
import { clamp, shade } from '../core/util.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from '../core/helpers.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from '../core/textures.js';

function buildLabBench({ color='#f3ece0', w=2.0, d=0.75, h=0.85 } = {}) {
  const g = new THREE.Group();
  const cab = mat(shade(color, 0.92), 0.5), epoxy = mat('#2a2e2c', 0.4, 0.05), metal = mat('#9aa0a4', 0.25, 0.8, { env: 0.9 });
  const body = box(w, h - 0.1, d, cab, 0, (h - 0.1) / 2, 0); body.userData.colorable = true; g.add(body);
  g.add(box(w + 0.04, 0.04, d + 0.04, epoxy, 0, h - 0.02, 0)); // black epoxy worktop
  // reagent shelf rack above the bench
  [-w/2 + 0.05, w/2 - 0.05].forEach(x => g.add(box(0.04, 0.7, 0.04, metal, x, h + 0.35, -d/2 + 0.06)));
  g.add(box(w, 0.03, 0.2, mat(shade(color,1.05), 0.5), 0, h + 0.4, -d/2 + 0.1));
  g.add(box(w, 0.03, 0.2, mat(shade(color,1.05), 0.5), 0, h + 0.68, -d/2 + 0.1));
  // gooseneck faucet + sink at right
  g.add(box(0.34, 0.04, 0.3, mat('#0d1117', 0.3, 0.3), w/2 - 0.35, h, 0));
  g.add(box(0.03, 0.18, 0.03, metal, w/2 - 0.35, h + 0.1, -d/2 + 0.1));
  g.add(box(0.12, 0.03, 0.03, metal, w/2 - 0.30, h + 0.18, -d/2 + 0.14));
  // gas tap
  g.add(cylAt(0.02, 0.02, 0.1, 8, mat('#d9a23b', 0.5), -w/2 + 0.3, h + 0.07, -d/2 + 0.12));
  // drawers + door fronts
  const dn = 4;
  for (let i = 0; i < dn; i++) {
    const dx = -w/2 + w/dn * (i + 0.5);
    const fr = box(w/dn - 0.05, h - 0.24, 0.02, mat(shade(color, 1.06), 0.55), dx, (h - 0.1)/2, d/2 + 0.005); fr.userData.colorable = true; g.add(fr);
    g.add(box(0.16, 0.02, 0.02, metal, dx, h - 0.22, d/2 + 0.02));
  }
  [-w/2 + 0.04, w/2 - 0.04].forEach(x => g.add(box(0.05, 0.1, 0.05, mat('#555', 0.5), x, 0.05, d/2 - 0.06)));
  return g;
}
function buildFumeHood({ color='#e8e2d6', w=1.4, d=0.8, h=2.3 } = {}) {
  const g = new THREE.Group();
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbcd8e4, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.26, side: THREE.DoubleSide });
  const bodyMat = mat(color, 0.55, 0.05), metal = mat('#aab0b4', 0.3, 0.6, { env: 0.8 });
  const counterH = 0.9;
  // base cabinet
  const base = box(w, counterH, d, mat(shade(color, 0.9), 0.5), 0, counterH/2, 0); base.userData.colorable = true; g.add(base);
  g.add(box(w + 0.02, 0.04, d + 0.02, mat('#2a2e2c', 0.4), 0, counterH + 0.02, 0)); // worktop
  // hood enclosure (back + sides + top)
  const hoodY = counterH + 0.04;
  g.add(box(w, h - hoodY, 0.05, bodyMat, 0, hoodY + (h - hoodY)/2, -d/2 + 0.025)); // back
  [-w/2 + 0.025, w/2 - 0.025].forEach(x => g.add(box(0.05, h - hoodY, d, bodyMat, x, hoodY + (h - hoodY)/2, 0)));
  g.add(box(w, 0.12, d, bodyMat, 0, h - 0.06, 0)); // top
  // sliding glass sash (raised)
  g.add(plainBox(w - 0.12, 0.85, 0.02, glassMat, 0, hoodY + 0.7, d/2 - 0.05));
  g.add(box(w - 0.12, 0.04, 0.03, metal, 0, hoodY + 0.28, d/2 - 0.04)); // sash handle bar
  // side glass windows
  [-w/2 + 0.06, w/2 - 0.06].forEach(x => g.add(plainBox(0.015, h - hoodY - 0.2, d - 0.12, glassMat, x, hoodY + (h - hoodY)/2, 0.02)));
  // interior fixtures
  g.add(box(0.3, 0.04, 0.25, mat('#0d1117', 0.3), w/2 - 0.3, counterH + 0.06, -0.05)); // inner sink
  g.add(cylAt(0.02, 0.02, 0.12, 8, metal, -w/2 + 0.25, counterH + 0.12, -d/2 + 0.1)); // gas valve
  // exhaust duct on top
  g.add(cylAt(0.1, 0.1, 0.25, 12, metal, 0, h + 0.12, -d/2 + 0.2));
  // control panel
  g.add(box(0.2, 0.14, 0.02, mat('#1c1f22', 0.4), w/2 - 0.2, hoodY + 0.1, d/2 - 0.03));
  g.add(cylAt(0.015, 0.015, 0.01, 8, mat('#22c55e', 0.5), w/2 - 0.24, hoodY + 0.13, d/2 - 0.02));
  return g;
}
function buildMicroscope({ color='#3a3f47', w=0.3, d=0.4, h=0.45 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.4, 0.4, { env: 0.6 }), metal = mat('#c0c4c8', 0.25, 0.85, { env: 1.0 }), glass = mat('#8fbfd8', 0.05, 0.3);
  // foot base (horseshoe)
  const base = box(0.22, 0.04, 0.3, mat('#2a2e34', 0.45, 0.4), 0, 0.02, 0.02); base.userData.colorable = true; g.add(base);
  // arm rising and curving
  const arm = box(0.06, 0.32, 0.07, body, 0, 0.2, -0.1); g.add(arm);
  // stage
  g.add(box(0.16, 0.02, 0.14, mat('#1c1f22', 0.4), 0, 0.18, 0.02));
  g.add(cylAt(0.02, 0.02, 0.02, 12, glass, 0, 0.19, 0.02)); // slide hole / light
  // head + eyepiece (angled)
  const head = box(0.1, 0.08, 0.12, body, 0, 0.36, -0.04); g.add(head);
  const eye = cyl(0.022, 0.022, 0.1, 10, body); eye.rotation.x = -0.5; eye.position.set(0, 0.42, 0.06); g.add(eye);
  g.add(cylAt(0.018, 0.018, 0.015, 10, glass, 0, 0.465, 0.085)); // eyepiece lens
  // objective turret + lenses
  const turret = cyl(0.04, 0.04, 0.025, 12, mat('#222', 0.4, 0.3)); turret.position.set(0, 0.31, 0.02); g.add(turret);
  [[-0.02,0.01],[0.02,0.01],[0,0.04]].forEach(([x,z]) => g.add(cylAt(0.01, 0.008, 0.05, 8, metal, x, 0.275, 0.02 + z)));
  // focus knob
  g.add(cylAt(0.03, 0.03, 0.02, 12, mat('#444', 0.4), 0.05, 0.24, -0.1));
  return g;
}
function buildCentrifuge({ color='#e8e2d6', w=0.55, d=0.55, h=0.4 } = {}) {
  const g = new THREE.Group();
  const body = mat('#eef0f1', 0.4, 0.15, { env: 0.4 }), dark = mat('#2a2f33', 0.3, 0.2), metal = mat('#aab0b4', 0.3, 0.7);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(w/2, w/2 + 0.02, h - 0.08, 28), body);
  base.position.y = (h - 0.08)/2; base.castShadow = true; base.userData.colorable = true; g.add(base);
  // hinged lid (slightly domed)
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(w/2 - 0.01, w/2, 0.08, 28), mat(shade(color,0.95), 0.35, 0.2));
  lid.position.y = h - 0.04; lid.castShadow = true; g.add(lid);
  g.add(cylAt(0.05, 0.05, 0.02, 16, dark, 0, h, 0)); // lid knob
  // rotor hint visible at seam
  g.add(cylAt(w/2 - 0.06, w/2 - 0.06, 0.015, 24, metal, 0, h - 0.08, 0));
  // control display on front
  g.add(box(0.18, 0.1, 0.02, dark, 0, h - 0.18, w/2 - 0.01));
  g.add(box(0.14, 0.06, 0.01, mat('#0a2a2a', 0.5, 0.1), 0, h - 0.18, w/2 + 0.002));
  [[-0.08,0],[0.08,0]].forEach(([x]) => g.add(cylAt(0.018, 0.018, 0.015, 10, mat('#3b82f6', 0.5), x, h - 0.27, w/2 - 0.005)));
  return g;
}
function buildAnalyticalBalance({ color='#e8e2d6', w=0.3, d=0.4, h=0.32 } = {}) {
  const g = new THREE.Group();
  const body = mat('#f0eee9', 0.4, 0.1, { env: 0.4 }), glass = new THREE.MeshStandardMaterial({ color: 0xcfe0e8, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.22, side: THREE.DoubleSide }), metal = mat('#9aa0a4', 0.3, 0.8);
  // base unit with display
  const base = box(w, 0.1, d, body, 0, 0.05, 0.06); base.userData.colorable = true; g.add(base);
  g.add(box(w - 0.06, 0.05, 0.1, mat('#1c1f22', 0.4), 0, 0.08, d/2 - 0.02)); // display
  g.add(box(w - 0.1, 0.03, 0.01, mat('#0a2a2a', 0.5), 0, 0.085, d/2 + 0.04));
  // draft shield (glass box)
  const shY = 0.1, shH = h - 0.1, shW = w - 0.04, shD = d - 0.16;
  [-shW/2, shW/2].forEach(x => g.add(plainBox(0.01, shH, shD, glass, x, shY + shH/2, -0.02)));
  g.add(plainBox(shW, shH, 0.01, glass, 0, shY + shH/2, -shD/2 - 0.02));
  g.add(plainBox(shW, 0.01, shD, glass, 0, shY + shH, -0.02));
  // weighing pan
  g.add(cylAt(0.06, 0.06, 0.008, 20, metal, 0, shY + 0.02, -0.02));
  return g;
}
function buildChemShelf({ color='#f3ece0', w=1.0, d=0.4, h=1.9 } = {}) {
  const g = new THREE.Group();
  const wood = mat(color, 0.65), metal = mat('#9aa0a4', 0.3, 0.6);
  // frame
  [-w/2 + 0.02, w/2 - 0.02].forEach(x => g.add(box(0.04, h, d, wood, x, h/2, 0)));
  g.add(box(w, 0.04, d, wood, 0, h - 0.02, 0)); g.add(box(w, 0.04, d, wood, 0, 0.02, 0));
  g.add(box(w, h, 0.03, mat(shade(color,0.92),0.7), 0, h/2, -d/2 + 0.015)); // back
  const bottleCols = ['#5a8fc0','#c05a5a','#5ac07a','#c0a85a','#9a5ac0','#5ac0c0'];
  [0.42, 0.86, 1.3, 1.7].forEach((y, si) => {
    const shelf = box(w - 0.06, 0.025, d - 0.04, wood, 0, y, 0); shelf.userData.colorable = true; g.add(shelf);
    // anti-spill lip
    g.add(box(w - 0.06, 0.04, 0.015, metal, 0, y + 0.03, d/2 - 0.04));
    // reagent bottles
    for (let i = -0.36; i <= 0.36; i += 0.12) {
      const c = bottleCols[(Math.floor(Math.abs(i*20 + si*3))) % bottleCols.length];
      const bot = cylAt(0.035, 0.04, 0.13, 10, mat(c, 0.3, 0.1), i, y + 0.09, -0.02); g.add(bot);
      g.add(cylAt(0.018, 0.018, 0.03, 8, mat('#ddd', 0.5), i, y + 0.17, -0.02)); // cap
    }
  });
  return g;
}
function buildGlassware({ color='#cfe0e8', w=0.4, d=0.3, h=0.32 } = {}) {
  const g = new THREE.Group();
  const glass = new THREE.MeshStandardMaterial({ color: 0xdaf0f6, roughness: 0.05, metalness: 0.05, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
  const liquid = (c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c), roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.7 });
  // beaker
  const beaker = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.13, 18, 1, true), glass);
  beaker.position.set(-0.12, 0.065, 0); g.add(beaker);
  g.add(cylAt(0.044, 0.044, 0.05, 18, liquid('#5ac0e0'), -0.12, 0.025, 0));
  // erlenmeyer flask (cone)
  const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.07, 0.16, 18, 1, true), glass);
  flask.position.set(0.04, 0.08, 0.02); g.add(flask);
  g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.07, 12, 1, true), glass).translateY(0.195).translateX(0.04).translateZ(0.02));
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.05, 18), liquid('#e05a8a')); cone.position.set(0.04, 0.045, 0.02); g.add(cone);
  // graduated cylinder
  const cyltube = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 16, 1, true), glass);
  cyltube.position.set(0.16, 0.14, -0.04); g.add(cyltube);
  g.add(cylAt(0.04, 0.045, 0.02, 16, glass, 0.16, 0.01, -0.04)); // base
  g.add(cylAt(0.023, 0.023, 0.1, 16, liquid('#7ad05a'), 0.16, 0.06, -0.04));
  // test tube rack
  g.add(box(0.16, 0.03, 0.06, mat('#5a3d22', 0.6), -0.04, 0.015, -0.1));
  [-0.05, 0, 0.05].forEach(dx => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 10, 1, true), glass); t.position.set(-0.04 + dx, 0.06, -0.1); g.add(t); g.add(cylAt(0.011, 0.011, 0.04, 8, liquid(dx<0?'#e0c05a':dx>0?'#c05ae0':'#5ae0a0'), -0.04 + dx, 0.04, -0.1)); });
  return g;
}
function buildOscilloscope({ color='#3a3f47', w=0.42, d=0.4, h=0.3 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.45, 0.3, { env: 0.5 }), metal = mat('#888f98', 0.3, 0.6);
  const b = box(w, h, d, body, 0, h/2, 0); b.userData.colorable = true; g.add(b);
  // screen with grid glow
  g.add(box(w*0.55, h*0.7, 0.02, mat('#0a1a14', 0.3, 0.2), -w*0.12, h*0.55, d/2 + 0.002));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(w*0.5, h*0.6), new THREE.MeshBasicMaterial({ color: 0x1faa5a, transparent: true, opacity: 0.55 })); glow.position.set(-w*0.12, h*0.55, d/2 + 0.014); g.add(glow);
  // waveform line
  const wave = new THREE.Mesh(new THREE.PlaneGeometry(w*0.46, 0.012), new THREE.MeshBasicMaterial({ color: 0x6fffa0 })); wave.position.set(-w*0.12, h*0.55, d/2 + 0.016); g.add(wave);
  // control knobs
  for (let i = 0; i < 4; i++) g.add(cylAt(0.025, 0.025, 0.02, 12, metal, w*0.28, h*0.78 - i*0.06, d/2 + 0.005));
  for (let i = 0; i < 6; i++) g.add(box(0.03, 0.02, 0.01, mat('#222', 0.5), w*0.18 + (i%3)*0.05, h*0.2 + Math.floor(i/3)*0.05, d/2 + 0.005));
  // bnc connectors
  [-0.05, 0.05].forEach(x => g.add(cylAt(0.012, 0.012, 0.02, 10, metal, w*0.2 + x, h*0.12, d/2 + 0.005)));
  return g;
}
function buildTestBench({ color='#3a4250', w=0.9, d=0.7, h=1.6 } = {}) {
  const g = new THREE.Group();
  const darkM = mat('#1c1f22', 0.4);
  const metM  = mat('#888f98', 0.3, 0.6);

  // 19-inch instrument rack frame
  const frame = box(w, h, d, mat(shade(color, 0.85), 0.45, 0.4), 0, h/2, 0);
  frame.userData.colorable = true; g.add(frame);
  g.add(box(w + 0.02, 0.04, d + 0.02, mat('#222', 0.5), 0, h - 0.02, 0));

  // Rack mounting rails (19" standards, visible on front-left and front-right)
  [-w/2 + 0.022, w/2 - 0.022].forEach(rx => {
    g.add(box(0.022, h - 0.04, 0.02, mat('#4a5060', 0.3, 0.65), rx, h/2, d/2 + 0.008));
    for (let ry = 0.25; ry < h - 0.08; ry += 0.044) {
      g.add(box(0.012, 0.009, 0.006, darkM, rx, ry, d/2 + 0.018));
    }
  });

  // Stacked instruments (5 rack units)
  const units = [
    { y: 1.42, c: '#0a2a2a', kind: 'scope' },
    { y: 1.18, c: '#1c1f22', kind: 'meter' },
    { y: 0.94, c: '#1c1f22', kind: 'meter' },
    { y: 0.70, c: '#16202a', kind: 'gen'   },
    { y: 0.42, c: '#222',    kind: 'psu'   },
  ];
  units.forEach(u => {
    g.add(box(w - 0.06, 0.2, 0.04, mat(u.c, 0.4, 0.2), 0, u.y, d/2 - 0.01));
    if (u.kind === 'scope') {
      const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.14), new THREE.MeshBasicMaterial({ color: 0x1faa5a, transparent: true, opacity: 0.6 }));
      sc.position.set(-0.18, u.y, d/2 + 0.01); g.add(sc);
      g.add(box(0.08, 0.004, 0.004, mat('#00ff88', 0.1, 0), -0.2,  u.y + 0.02, d/2 + 0.015));
      g.add(box(0.07, 0.004, 0.004, mat('#00ff88', 0.1, 0), -0.14, u.y - 0.02, d/2 + 0.015));
    } else {
      const disp = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.08), new THREE.MeshBasicMaterial({ color: u.kind === 'psu' ? 0xff5544 : 0x44aaff, transparent: true, opacity: 0.7 }));
      disp.position.set(-0.2, u.y, d/2 + 0.01); g.add(disp);
    }
    // Control knobs with indicator dots
    for (let i = 0; i < 3; i++) {
      g.add(cylAt(0.018, 0.018, 0.015, 10, metM, 0.12 + i*0.07, u.y, d/2 + 0.005));
      g.add(box(0.003, 0.009, 0.003, mat('#ddd', 0.4, 0), 0.12 + i*0.07, u.y + 0.016, d/2 + 0.013));
    }
    // BNC connectors
    [0.29, 0.35].forEach(bx => g.add(cylAt(0.009, 0.009, 0.012, 8, metM, bx, u.y - 0.07, d/2 + 0.006)));
    // Banana binding posts (red + black)
    g.add(cylAt(0.007, 0.007, 0.012, 6, mat('#cc2020', 0.3, 0.5), 0.42, u.y - 0.07, d/2 + 0.006));
    g.add(cylAt(0.007, 0.007, 0.012, 6, mat('#111',    0.3, 0.5), 0.38, u.y - 0.07, d/2 + 0.006));
  });

  // Bottom cable management bar + power entry module
  g.add(box(w - 0.06, 0.13, 0.04, mat('#0e1014', 0.5), 0, 0.17, d/2 - 0.01));
  g.add(cylAt(0.018, 0.018, 0.025, 8, mat('#111', 0.8, 0), w/2 - 0.12, 0.1, d/2 + 0.004));

  // Base feet
  [[-w/2+0.05,d/2-0.05],[w/2-0.05,d/2-0.05],[-w/2+0.05,-d/2+0.05],[w/2-0.05,-d/2+0.05]].forEach(([x,z]) => {
    g.add(box(0.05, 0.04, 0.05, darkM, x, 0.02, z));
  });
  return g;
}
function buildLathe({ color='#4f7a52', w=1.8, d=0.8, h=1.35 } = {}) {
  const g = new THREE.Group();
  const machine = mat(color, 0.45, 0.35, { env: 0.5 });
  const steel   = mat('#9aa4ac', 0.3, 0.7, { env: 0.9 });
  const dark    = mat('#2a2f33', 0.5, 0.3);

  // Cabinet legs (two pedestals)
  [-w/2 + 0.3, w/2 - 0.3].forEach(x => {
    const leg = box(0.4, 0.85, d, machine, x, 0.425, 0); leg.userData.colorable = true; g.add(leg);
  });

  // Bed (ways) + polished way surface + way cover accordion
  g.add(box(w, 0.16, 0.4, dark, 0, 0.93, 0));
  g.add(box(w - 0.05, 0.04, 0.36, steel, 0, 1.02, 0));
  g.add(box(0.5, 0.035, 0.38, mat('#3a3a3a', 0.7, 0.3), -w/2 + 0.52, 1.035, 0));  // way cover

  // Headstock body + top cap
  const head = box(0.42, 0.42, d - 0.06, machine, -w/2 + 0.25, 1.22, 0);
  head.userData.colorable = true; g.add(head);
  g.add(box(0.44, 0.06, d - 0.04, mat(shade(color, 0.8), 0.5, 0.3), -w/2 + 0.25, 1.45, 0));

  // 3-jaw chuck: body + face plate + 3 jaws
  const chuck = cyl(0.16, 0.16, 0.12, 20, steel);
  chuck.rotation.z = Math.PI/2; chuck.position.set(-w/2 + 0.5, 1.16, 0); g.add(chuck);
  g.add(cylAt(0.154, 0.154, 0.02, 20, dark, -w/2 + 0.56, 1.16, 0).rotateZ(Math.PI/2));  // face
  [0, 1, 2].forEach(i => {
    const a = i * Math.PI * 2 / 3;
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.07, 0.04), dark.clone());
    jaw.position.set(-w/2 + 0.57, 1.16 + Math.cos(a)*0.08, Math.sin(a)*0.08);
    jaw.castShadow = true; g.add(jaw);
  });
  // Chuck key socket
  g.add(cylAt(0.01, 0.01, 0.032, 6, mat('#555', 0.4, 0.5), -w/2 + 0.5, 1.275, 0.16).rotateX(Math.PI/2));

  // Bar stock in chuck
  g.add(cylAt(0.04, 0.04, 0.6, 16, steel, -0.05, 1.16, 0).rotateZ(Math.PI/2));

  // Carriage + cross-slide + compound
  g.add(box(0.22, 0.15, 0.32, dark, 0, 1.1, 0.12));
  g.add(box(0.16, 0.06, 0.22, mat('#3a4048', 0.4, 0.35), 0, 1.18, 0.1));
  // 4-way tool post + cutting tool (carbide insert)
  g.add(box(0.09, 0.1, 0.09, mat('#5a6270', 0.3, 0.5), 0, 1.24, 0.1));
  g.add(box(0.015, 0.06, 0.03, mat('#d4af37', 0.35, 0.5), 0.04, 1.22, 0.06));

  // Coolant nozzle at tool post
  const cn = cyl(0.01, 0.014, 0.1, 8, mat('#7a8898', 0.3, 0.6));
  cn.rotation.x = Math.PI / 4; cn.position.set(0.07, 1.2, 0.04); g.add(cn);

  // Tailstock + dead center point + quill lock
  const tail = box(0.3, 0.3, 0.25, machine, w/2 - 0.3, 1.13, 0);
  tail.userData.colorable = true; g.add(tail);
  const center = cyl(0.018, 0.003, 0.1, 8, mat('#aab4c0', 0.2, 0.8));
  center.rotation.z = Math.PI/2; center.position.set(w/2 - 0.45, 1.13, 0); g.add(center);
  g.add(box(0.03, 0.12, 0.03, dark, w/2 - 0.3, 1.17, d/2 - 0.04));

  // Handwheels (tailstock, carriage, cross-slide)
  g.add(cylAt(0.1,  0.1,  0.03, 16, dark, w/2 - 0.15, 1.13, d/2 - 0.02).rotateX(Math.PI/2));
  g.add(cylAt(0.09, 0.09, 0.03, 16, dark, 0.25,         1.0,  d/2 + 0.02).rotateX(Math.PI/2));
  g.add(cylAt(0.07, 0.07, 0.025, 12, dark, 0,            1.08, d/2 + 0.02).rotateX(Math.PI/2));

  // Control panel (start/stop)
  g.add(box(0.18, 0.3, 0.06, dark, -w/2 + 0.05, 1.1, d/2 - 0.1));
  ['#22c55e', '#ef4444'].forEach((c, i) => {
    g.add(cylAt(0.025, 0.025, 0.02, 12, mat(c, 0.4), -w/2 + 0.05, 1.18 - i*0.08, d/2 - 0.06).rotateX(Math.PI/2));
  });

  // Chip tray base
  g.add(box(w + 0.1, 0.06, d + 0.05, dark, 0, 0.03, 0));
  return g;
}
function buildMillingMachine({ color='#4f7a52', w=1.2, d=1.1, h=1.95 } = {}) {
  const g = new THREE.Group();
  const machine = mat(color, 0.45, 0.35, { env: 0.5 });
  const steel   = mat('#9aa4ac', 0.3, 0.7, { env: 0.9 });
  const dark    = mat('#2a2f33', 0.5, 0.3);

  // Base casting
  g.add(box(w, 0.12, d, dark, 0, 0.06, 0));
  // Column (main vertical structure)
  const col = box(0.5, h - 0.12, 0.5, machine, 0, h/2, -d/2 + 0.3);
  col.userData.colorable = true; g.add(col);
  // Overarm brace (horizontal at top of column)
  g.add(box(0.5, 0.1, d - 0.1, mat(shade(color, 0.88), 0.45, 0.3), 0, h - 0.1, -d/2 + 0.65));

  // Knee + saddle assembly
  const knee = box(0.6, 0.5, 0.55, machine, 0, 0.55, 0.05);
  knee.userData.colorable = true; g.add(knee);

  // Work table with 5 T-slots
  g.add(box(0.9, 0.1, 0.3, steel, 0, 0.86, 0.1));
  for (let i = -0.34; i <= 0.34; i += 0.17) {
    g.add(box(0.015, 0.022, 0.3, dark, i, 0.92, 0.1));
  }

  // Milling vise on table
  g.add(box(0.22, 0.1, 0.16, dark, 0.1, 0.96, 0.1));
  // Workpiece in vise
  g.add(box(0.12, 0.08, 0.1, steel, 0.1, 1.05, 0.1));

  // Spindle head / ram
  const ram = box(0.4, 0.3, 0.6, machine, 0, h - 0.35, -d/2 + 0.45);
  ram.userData.colorable = true; g.add(ram);
  // Quill + lock collar
  const quill = cyl(0.07, 0.07, 0.3, 16, steel); quill.position.set(0, h - 0.62, 0.05); g.add(quill);
  g.add(cylAt(0.09, 0.09, 0.04, 12, dark, 0, h - 0.72, 0.05));  // quill lock collar
  // End mill (carbide, gold)
  g.add(cylAt(0.03, 0.03, 0.12, 12, mat('#d4af37', 0.4, 0.5), 0, h - 0.83, 0.05));

  // Handwheels (X, Y, knee)
  g.add(cylAt(0.1,  0.1,  0.03, 16, dark, w/2 - 0.05, 0.55, 0.15).rotateY(Math.PI/2));
  g.add(cylAt(0.1,  0.1,  0.03, 16, dark, 0.5,         0.4,  0.2) .rotateX(Math.PI/2));
  g.add(cylAt(0.08, 0.08, 0.025, 12, dark, -w/2 + 0.05, 0.55, 0.15).rotateY(Math.PI/2));

  // DRO (digital readout) display on column
  g.add(box(0.22, 0.32, 0.04, mat('#0a1420', 0.4, 0.2), -0.18, h*0.42, -d/2 + 0.058));
  g.add(plainBox(0.18, 0.12, 0.008,
    new THREE.MeshBasicMaterial({ color: 0x00ff44, transparent: true, opacity: 0.7 }),
    -0.18, h*0.45, -d/2 + 0.058));
  ['#ff4444','#44ff44','#4444ff'].forEach((c, i) => {
    g.add(box(0.14, 0.024, 0.006, mat(c, 0.4, 0), -0.18, h*0.38 + i*0.04, -d/2 + 0.062));
  });

  // Speed/coolant control box + E-stop
  g.add(box(0.16, 0.4, 0.06, dark, w/2 - 0.02, 1.2, -d/2 + 0.4));
  g.add(cylAt(0.028, 0.028, 0.025, 12, mat('#ef4444', 0.35, 0.08), w/2 - 0.02, 1.42, -d/2 + 0.435).rotateX(Math.PI/2));

  return g;
}
function buildDrillPress({ color='#4f7a52', w=0.6, d=0.7, h=1.75 } = {}) {
  const g = new THREE.Group();
  const machine = mat(color, 0.45, 0.35, { env: 0.5 });
  const steel   = mat('#9aa4ac', 0.3, 0.7, { env: 0.9 });
  const dark    = mat('#2a2f33', 0.5, 0.3);

  // Base casting
  g.add(box(0.5, 0.08, d, dark, 0, 0.04, 0.05));
  // Column (round post)
  const col = cyl(0.05, 0.05, h - 0.1, 16, steel); col.position.set(0, h/2, -d/2 + 0.15); g.add(col);

  // Work table + column clamp bracket
  const table = box(0.38, 0.05, 0.38, dark, 0, 0.7, 0.06); g.add(table);
  g.add(box(0.1, 0.1, 0.05, machine, 0, 0.7, -d/2 + 0.22));
  // Table T-slot (cross pattern)
  g.add(box(0.3, 0.012, 0.014, mat('#111', 0.7), 0, 0.725, 0.06));
  g.add(box(0.014, 0.012, 0.3, mat('#111', 0.7), 0, 0.725, 0.06));
  // Table height lock lever
  g.add(box(0.03, 0.04, 0.12, dark, 0.08, 0.72, -d/2 + 0.25));

  // Head casting
  const head = box(0.3, 0.35, 0.6, machine, 0, h - 0.3, 0.01);
  head.userData.colorable = true; g.add(head);
  // Motor (horizontal, drives V-belt inside)
  const motor = cyl(0.12, 0.12, 0.3, 18, machine);
  motor.rotation.z = Math.PI/2; motor.position.set(0, h - 0.22, -d/2 + 0.3);
  motor.userData.colorable = true; g.add(motor);
  // Belt/pulley safety cover on top of head
  g.add(box(0.32, 0.14, 0.5, mat(shade(color, 0.9), 0.5, 0.2), 0, h - 0.04, -d/2 + 0.3));

  // Quill + depth stop collar + keyless chuck + drill bit
  const quill = cyl(0.04, 0.04, 0.25, 12, steel); quill.position.set(0, h - 0.6, 0.08); g.add(quill);
  g.add(cylAt(0.055, 0.055, 0.03, 10, dark, 0, h - 0.52, 0.08));  // depth stop collar
  const chuck = cyl(0.05, 0.04, 0.1, 12, dark); chuck.position.set(0, h - 0.75, 0.08); g.add(chuck);
  g.add(cylAt(0.012, 0.012, 0.14, 8, mat('#ccc', 0.3, 0.6), 0, h - 0.87, 0.08));  // drill bit

  // Feed handle (3 spokes with ball-end knobs)
  [0, 2.1, 4.2].forEach(a => {
    g.add(box(0.022, 0.022, 0.2, dark, Math.cos(a)*0.1, h - 0.55, 0.12 + Math.sin(a)*0.1));
    g.add(cylAt(0.022, 0.022, 0.03, 10, mat('#3a3f47', 0.4, 0.2),
      Math.cos(a)*0.195, h - 0.55, 0.12 + Math.sin(a)*0.195));
  });
  g.add(cylAt(0.025, 0.025, 0.04, 10, dark, 0, h - 0.55, 0.12));  // hub

  // Power switch + indicator LED (side of column clamp)
  g.add(box(0.1, 0.08, 0.03, dark, 0.14, 0.95, -d/2 + 0.2));
  g.add(cylAt(0.022, 0.022, 0.02, 10, mat('#22c55e', 0.4, 0.1), 0.14, 0.98, -d/2 + 0.215).rotateX(Math.PI/2));

  return g;
}
function buildBenchGrinder({ color='#4f7a52', w=0.7, d=0.45, h=1.25 } = {}) {
  const g = new THREE.Group();
  const machine = mat(color, 0.45, 0.35, { env: 0.5 });
  const steel   = mat('#9aa4ac', 0.3, 0.7, { env: 0.9 });
  const dark    = mat('#2a2f33', 0.5, 0.3);
  const wheel   = mat('#9a8a78', 0.85, 0.05);

  // Foot plate with 4 mounting bolt holes
  g.add(box(0.4, 0.04, d, dark, 0, 0.02, 0));
  [[-0.16, d/2-0.06],[0.16, d/2-0.06],[-0.16,-d/2+0.06],[0.16,-d/2+0.06]].forEach(([x,z]) => {
    g.add(cylAt(0.012, 0.012, 0.02, 6, mat('#555', 0.4, 0.5), x, 0.03, z));
  });

  // Pedestal column
  const stand = box(0.12, 0.85, 0.12, mat(shade(color, 0.9), 0.5), 0, 0.45, 0);
  stand.userData.colorable = true; g.add(stand);

  // Motor body (horizontal cylinder)
  const motor = cyl(0.13, 0.13, 0.4, 20, machine);
  motor.rotation.z = Math.PI/2; motor.position.set(0, 0.95, 0);
  motor.userData.colorable = true; g.add(motor);
  // Motor end caps with vent rings
  [-0.22, 0.22].forEach(mx => {
    g.add(cylAt(0.128, 0.128, 0.016, 20, mat(shade(color, 0.78), 0.4, 0.3), mx, 0.95, 0).rotateZ(Math.PI/2));
    g.add(cylAt(0.085, 0.085, 0.018, 12, mat('#1a2028', 0.5, 0.2), mx, 0.95, 0).rotateZ(Math.PI/2));  // vent ring
  });

  // Grinding wheels + guards at both ends
  [-0.28, 0.28].forEach(x => {
    const wh = cyl(0.13, 0.13, 0.04, 24, wheel);
    wh.rotation.z = Math.PI/2; wh.position.set(x, 0.95, 0); g.add(wh);
    // Wheel hub (metal center)
    g.add(cylAt(0.03, 0.03, 0.042, 12, steel, x, 0.95, 0).rotateZ(Math.PI/2));
    // Wheel guard (partial arc shell)
    const guard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.07, 20, 1, false, 0, Math.PI * 1.3), dark);
    guard.rotation.z = Math.PI/2; guard.position.set(x, 0.95, 0); g.add(guard);
    // Tool rest platform + support bracket
    g.add(box(0.085, 0.05, 0.1, steel, x, 0.79, 0.1));
    g.add(box(0.012, 0.06, 0.012, steel, x, 0.74, 0.06));
  });

  // Eye shields on posts (transparent polycarbonate)
  [-0.28, 0.28].forEach(x => {
    g.add(box(0.012, 0.09, 0.012, steel, x, 1.09, 0.1));  // post
    g.add(plainBox(0.13, 0.09, 0.005,
      new THREE.MeshStandardMaterial({ color: 0xc8e0f0, roughness: 0.08, metalness: 0.08, transparent: true, opacity: 0.28 }),
      x, 1.12, 0.125));
  });

  // Power switch box + indicator
  g.add(box(0.1, 0.12, 0.04, dark, 0, 0.75, -d/2 + 0.04));
  g.add(cylAt(0.022, 0.022, 0.02, 10, mat('#22c55e', 0.38, 0.08), 0, 0.8, -d/2 + 0.06).rotateX(Math.PI/2));

  // Power cord (exits bottom of motor)
  const cord = cyl(0.016, 0.016, 0.4, 8, mat('#1a1a1a', 0.9, 0.02));
  cord.rotation.x = Math.PI/4; cord.position.set(0, 0.65, -0.16); g.add(cord);

  // Respect w/h (d already used directly): geometry authored at w=0.7, h=1.25
  g.scale.set(w / 0.7, h / 1.25, 1);
  return g;
}
function buildToolRack({ color='#3a3f47', w=1.0, d=0.12, h=1.2 } = {}) {
  const g = new THREE.Group();
  const board = mat(color, 0.6, 0.1);
  const metal = mat('#aab0b4', 0.3, 0.7, { env: 0.9 });

  // Wall-mount backing cleats
  [-w/2+0.06, w/2-0.06].forEach(rx => {
    g.add(box(0.04, 0.04, 0.06, mat('#555a60', 0.4, 0.5), rx, h*0.95 + 0.2, -0.02));
  });

  // Pegboard panel
  const pb = box(w, h, 0.03, mat(shade(color, 1.1), 0.7), 0, h/2 + 0.2, 0);
  pb.userData.colorable = true; g.add(pb);
  for (let yy = 0.4; yy < h + 0.05; yy += 0.12) {
    for (let xx = -w/2 + 0.1; xx < w/2; xx += 0.12) {
      g.add(cylAt(0.008, 0.008, 0.005, 6, mat('#222', 0.6), xx, yy, 0.016));
    }
  }

  // Front horizontal support rails
  [0.6, 1.0, h + 0.05].forEach(ry => {
    g.add(box(w - 0.06, 0.012, 0.018, metal, 0, ry + 0.2, 0.018));
  });

  // Hanging tools: wrenches (3 sizes)
  const hangTool = (x, len, wdt, c) => g.add(box(wdt, len, 0.02, mat(c, 0.4, 0.5), x, h*0.78 - len/2 + 0.2, 0.03));
  hangTool(-0.42, 0.34, 0.05, '#b8bcc0');
  hangTool(-0.34, 0.3, 0.045, '#b8bcc0');
  hangTool(-0.26, 0.26, 0.04, '#b8bcc0');

  // Hammer (T-head + handle) + shadow outline
  g.add(box(0.12, 0.052, 0.04, metal, -0.05, h*0.9 + 0.2, 0.03));
  g.add(box(0.03, 0.26, 0.03, mat('#8a5a2b', 0.6), -0.05, h*0.75 + 0.2, 0.03));
  g.add(box(0.14, 0.31, 0.005, mat('#1a1e24', 0.8), -0.05, h*0.81 + 0.2, 0.017));

  // Screwdrivers (handle + shaft) + shadow outlines
  [0.12, 0.2, 0.28].forEach((x, i) => {
    g.add(box(0.03, 0.1, 0.03, mat(['#e05a2b','#2b7ae0','#e0c42b'][i], 0.4), x, h*0.85 + 0.2, 0.03));
    g.add(box(0.012, 0.16, 0.012, metal, x, h*0.7 + 0.2, 0.03));
    g.add(box(0.038, 0.29, 0.005, mat('#1a1e24', 0.8), x, h*0.765 + 0.2, 0.018));
  });

  // Pliers + tape measure
  g.add(box(0.06, 0.2, 0.03, mat('#c05a3b', 0.4), 0.4, h*0.78 + 0.2, 0.03));
  g.add(cylAt(0.038, 0.038, 0.025, 12, mat('#f0c020', 0.5, 0.1), 0.44, h*0.6 + 0.2, 0.02).rotateX(Math.PI/2));

  // Bottom shelf with lip + tool boxes + small parts bin
  g.add(box(w, 0.03, 0.18, board, 0, 0.34, 0.08));
  g.add(box(w, 0.04, 0.012, board, 0, 0.365, 0.17));  // shelf lip
  g.add(box(0.3, 0.14, 0.14, mat('#c0392b', 0.5, 0.2), -0.25, 0.42, 0.08));
  g.add(box(0.26, 0.12, 0.14, mat('#2980b9', 0.5, 0.2), 0.15, 0.41, 0.08));
  g.add(box(0.14, 0.1, 0.12, mat('#e0a020', 0.5, 0.1), 0.44, 0.39, 0.08));

  return g;
}

function buildBandSaw({ color='#4a5c6a', w=0.6, d=0.55, h=1.55 } = {}) {
  const g = new THREE.Group();
  const body   = mat(color, 0.5, 0.15, { env: 0.4 });
  const tableM = mat('#c8c0b0', 0.4, 0.3, { env: 0.5 });
  const bladeM = mat('#aaaaaa', 0.2, 0.9, { env: 0.8 });

  // Lower cabinet (motor + drive housing)
  const cab = new THREE.Mesh(roundedBoxGeom(w, h*0.42, d, 0.03, 4), body);
  cab.position.set(0, h*0.21, 0); cab.castShadow = true; cab.userData.colorable = true; g.add(cab);

  // Work table with blade slot + tilt scale
  const tbl = new THREE.Mesh(roundedBoxGeom(w*0.95, 0.04, d*0.9, 0.01, 4), tableM);
  tbl.position.set(0, h*0.42 + 0.02, 0); tbl.castShadow = true; g.add(tbl);
  // Blade slot (thin dark groove)
  g.add(box(0.009, 0.032, d*0.85, mat('#111', 0.9, 0), -w*0.28, h*0.42 + 0.025, -d*0.22));
  // Tilt scale markings on front edge
  g.add(box(w*0.55, 0.012, 0.008, tableM, 0, h*0.41, -d*0.44));
  for (let ti = -0.22; ti <= 0.22; ti += 0.11) {
    g.add(box(0.005, 0.02, 0.006, mat('#555', 0.5), ti, h*0.415, -d*0.44));
  }

  // Rip fence with lock knob
  const fence = new THREE.Mesh(roundedBoxGeom(w*0.8, 0.06, 0.022, 0.005, 4), mat('#888', 0.3, 0.5));
  fence.position.set(0.08, h*0.45, 0); g.add(fence);
  g.add(cylAt(0.022, 0.022, 0.03, 10, mat('#3a3f47', 0.4, 0.4), w*0.3, h*0.45, 0).rotateX(Math.PI/2));

  // Upper arm (houses upper wheel + blade tension adjuster)
  const upperArm = new THREE.Mesh(roundedBoxGeom(w*0.28, h*0.46, d*0.3, 0.02, 4), body);
  upperArm.position.set(-w*0.28, h*0.42 + h*0.23, -d*0.3); upperArm.castShadow = true; g.add(upperArm);
  // Blade tension adjuster wheel (on top of upper arm)
  g.add(cylAt(0.022, 0.022, 0.04, 10, mat('#5a6070', 0.4, 0.5), -w*0.28, h*0.88, -d*0.3).rotateX(Math.PI/2));

  // Band wheels (lower drive + upper idler) with rubber tire rim
  [h*0.36, h - 0.08].forEach(wy => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20), mat('#555', 0.3, 0.6));
    wheel.rotation.z = Math.PI/2; wheel.position.set(-w*0.28, wy, -d*0.22); g.add(wheel);
    g.add(cylAt(0.122, 0.122, 0.035, 20, mat('#1a1a1a', 0.8, 0.02), -w*0.28, wy, -d*0.22).rotateZ(Math.PI/2));
  });

  // Blade (thin strip between wheels)
  const bladeGuide = new THREE.Mesh(new THREE.BoxGeometry(0.008, h*0.32, 0.008), bladeM);
  bladeGuide.position.set(-w*0.28, h*0.58, -d*0.22); g.add(bladeGuide);

  // Upper blade guide assembly (above table)
  g.add(box(0.04, 0.12, 0.05, mat('#3a4048', 0.4, 0.5), -w*0.28, h*0.56, -d*0.22 + 0.08));
  g.add(box(0.02, 0.004, 0.05, mat('#aaa', 0.2, 0.8),   -w*0.28, h*0.56, -d*0.22 + 0.08));

  // Dust collection port (rear of lower cabinet)
  g.add(cylAt(0.04, 0.04, 0.04, 10, mat('#2a2f33', 0.6, 0.2), 0, h*0.25, d*0.5).rotateX(Math.PI/2));
  g.add(cylAt(0.038, 0.038, 0.05, 10, mat('#1a1a1a', 0.8, 0), 0, h*0.25, d*0.5 + 0.03).rotateX(Math.PI/2));

  return g;
}
function buildWelderStation({ color='#2e4a6a', w=0.55, d=0.45, h=0.9 } = {}) {
  const g = new THREE.Group();
  const body  = mat(color, 0.55, 0.2, { env: 0.3 });
  const panel = mat('#1a1a1a', 0.7);
  const metal = mat('#888', 0.25, 0.8, { env: 0.7 });

  // Main cabinet body (welding power source)
  const cab = new THREE.Mesh(roundedBoxGeom(w, h*0.72, d, 0.03, 4), body);
  cab.position.set(0, h*0.36, 0); cab.castShadow = true; cab.userData.colorable = true; g.add(cab);

  // Carry handle on top
  g.add(box(w*0.5, 0.04, 0.032, mat(shade(color, 0.78), 0.4, 0.4), 0, h*0.75, 0));
  g.add(cylAt(0.016, 0.016, 0.05, 8, metal, -w*0.22, h*0.73, 0).rotateX(Math.PI/2));
  g.add(cylAt(0.016, 0.016, 0.05, 8, metal,  w*0.22, h*0.73, 0).rotateX(Math.PI/2));

  // Front panel face
  g.add(plainBox(w*0.9, h*0.5, 0.01, panel, 0, h*0.38, d/2));

  // Digital display (amperage readout — amber LED style)
  g.add(plainBox(w*0.36, h*0.11, 0.008,
    new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.85 }),
    -0.04, h*0.52, d/2 + 0.002));

  // Control dials: voltage + wire speed
  [-0.12, 0.12].forEach(dx => {
    g.add(cylAt(0.042, 0.042, 0.016, 16, mat('#e0c060', 0.3, 0.7), dx, h*0.36, d/2 + 0.01).rotateX(Math.PI/2));
    g.add(box(0.006, 0.03, 0.004, mat('#222', 0.5, 0), dx, h*0.36 + 0.035, d/2 + 0.018));  // indicator mark
  });

  // Output connectors (gun + ground, euro-style sockets)
  g.add(cylAt(0.018, 0.018, 0.02, 10, mat('#cc6600', 0.3, 0.5), -0.08, h*0.22, d/2 + 0.01).rotateX(Math.PI/2));
  g.add(cylAt(0.018, 0.018, 0.02, 10, mat('#222',    0.3, 0.5),  0.08, h*0.22, d/2 + 0.01).rotateX(Math.PI/2));

  // Power switch + LED
  g.add(box(0.05, 0.06, 0.02, mat('#333', 0.5), 0.16, h*0.38, d/2 + 0.012));
  g.add(cylAt(0.01, 0.01, 0.012, 8, mat('#22c55e', 0.3, 0.1), 0.16, h*0.46, d/2 + 0.012).rotateX(Math.PI/2));

  // Wire spool (MIG wire reel, visible through open top)
  const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20), mat('#d4882a', 0.6));
  spool.rotation.x = Math.PI/2; spool.position.set(w*0.2, h*0.8, 0); spool.castShadow = true; g.add(spool);
  const spoolPost = cylAt(0.015, 0.015, 0.14, 8, metal, w*0.2, h*0.8, 0);
  spoolPost.rotation.x = Math.PI/2; g.add(spoolPost);

  // Gun hose coil (lying on side of machine)
  const hose = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.013, 6, 18, Math.PI*1.1), mat('#111', 0.8));
  hose.position.set(-w*0.28, h*0.22, d*0.35); hose.rotation.y = 0.4; g.add(hose);

  // MIG torch body + copper nozzle tip
  const torch = cyl(0.014, 0.01, 0.22, 8, mat('#222', 0.75, 0.2));
  torch.rotation.x = Math.PI/4; torch.position.set(-w*0.38, h*0.18, d*0.48); g.add(torch);
  const nozzle = cyl(0.018, 0.01, 0.06, 10, mat('#b87333', 0.25, 0.65));
  nozzle.rotation.x = Math.PI/4; nozzle.position.set(-w*0.38, h*0.07, d*0.52); g.add(nozzle);

  // Ground clamp cable exit (right side bottom)
  g.add(box(0.012, 0.012, 0.08, mat('#1a1a1a', 0.85, 0), w*0.22, h*0.12, d*0.5));

  return g;
}
function buildHydraulicPress({ color='#3a5a3a', w=0.7, d=0.65, h=1.8 } = {}) {
  const g = new THREE.Group();
  const frame_m = mat(color, 0.5, 0.2, { env: 0.4 }), cyl_m = mat('#7a7a7a', 0.25, 0.7, { env: 0.7 }), plate_m = mat('#555', 0.35, 0.4);
  const base = new THREE.Mesh(roundedBoxGeom(w, 0.1, d, 0.02, 4), frame_m); base.position.set(0, 0.05, 0); base.castShadow = true; base.userData.colorable = true; g.add(base);
  const topBeam = new THREE.Mesh(roundedBoxGeom(w, 0.1, d, 0.02, 4), frame_m); topBeam.position.set(0, h - 0.05, 0); topBeam.castShadow = true; g.add(topBeam);
  [[-w / 2 + 0.06, d / 2 - 0.06], [-w / 2 + 0.06, -(d / 2 - 0.06)], [w / 2 - 0.06, d / 2 - 0.06], [w / 2 - 0.06, -(d / 2 - 0.06)]].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(roundedBoxGeom(0.07, h, 0.07, 0.02, 4), frame_m); col.position.set(cx, h / 2, cz); col.castShadow = true; g.add(col);
  });
  const workTable = new THREE.Mesh(roundedBoxGeom(w - 0.16, 0.06, d - 0.16, 0.015, 4), plate_m); workTable.position.set(0, h * 0.42, 0); workTable.castShadow = true; g.add(workTable);
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, h * 0.28, 16), cyl_m); cylinder.position.set(0, h - 0.05 - h * 0.14, 0); cylinder.castShadow = true; g.add(cylinder);
  const ram = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, h * 0.18, 12), mat('#aaa', 0.2, 0.8, { env: 0.8 })); ram.position.set(0, h * 0.55, 0); g.add(ram);
  const pressPlate = new THREE.Mesh(roundedBoxGeom(w * 0.55, 0.04, d * 0.55, 0.01, 4), plate_m); pressPlate.position.set(0, h * 0.46, 0); pressPlate.castShadow = true; g.add(pressPlate);
  return g;
}
function build3DPrinter({ color='#f0f0f0', w=0.5, d=0.5, h=0.6 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.55, 0.05), frame_m = mat('#1a1a1a', 0.4, 0.3), glass_m = new THREE.MeshStandardMaterial({ color: 0xd0eaf8, transparent: true, opacity: 0.22, roughness: 0.05 }), filament_m = mat('#ff8822', 0.5);
  const outer = new THREE.Mesh(roundedBoxGeom(w, h, d, 0.03, 4), body); outer.position.set(0, h / 2, 0); outer.castShadow = true; outer.userData.colorable = true; g.add(outer);
  const frontGlass = plainBox(w - 0.04, h * 0.7, 0.01, glass_m, 0, h * 0.42, d / 2 - 0.01); g.add(frontGlass);
  const buildPlate = new THREE.Mesh(roundedBoxGeom(w * 0.75, 0.02, d * 0.75, 0.005, 4), mat('#888', 0.4, 0.3)); buildPlate.position.set(0, h * 0.18, 0); g.add(buildPlate);
  const xRail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, w * 0.8, 8), frame_m); xRail.rotation.z = Math.PI / 2; xRail.position.set(0, h * 0.72, 0); g.add(xRail);
  const head = new THREE.Mesh(roundedBoxGeom(0.06, 0.05, 0.05, 0.01, 4), frame_m); head.position.set(0, h * 0.68, 0); g.add(head);
  const nozzle = cylAt(0.006, 0.004, 0.04, 8, mat('#e08030', 0.3, 0.7), 0, h * 0.65, 0); g.add(nozzle);
  const spool = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 8, 24), filament_m); spool.rotation.x = Math.PI / 2; spool.position.set(w * 0.32, h * 0.8, -d * 0.3); spool.castShadow = true; g.add(spool);
  const screen = plainBox(0.1, 0.07, 0.01, mat('#1a3a5a', 0.6, { emissive: '#1a3a5a', emissiveIntensity: 0.5 }), -w * 0.3, h * 0.85, d / 2 + 0.005); g.add(screen);
  return g;
}
function buildLaserCutter({ color='#2a2a2a', w=1.0, d=0.7, h=0.35 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.6, 0.1), cover_m = mat('#3a3a3a', 0.55, 0.1), glass_m = new THREE.MeshStandardMaterial({ color: 0xd0f0e8, transparent: true, opacity: 0.28, roughness: 0.05 });
  const base = new THREE.Mesh(roundedBoxGeom(w, h * 0.45, d, 0.025, 4), body); base.position.set(0, h * 0.225, 0); base.castShadow = true; base.userData.colorable = true; g.add(base);
  const lid = new THREE.Mesh(roundedBoxGeom(w - 0.02, h * 0.38, d - 0.02, 0.02, 4), cover_m); lid.position.set(0, h * 0.45 + h * 0.19, 0); lid.castShadow = true; g.add(lid);
  const lidGlass = plainBox(w * 0.7, 0.01, d * 0.65, glass_m, 0, h * 0.84, 0); g.add(lidGlass);
  const xBar = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, w * 0.85, 8), mat('#888', 0.25, 0.7)); xBar.rotation.z = Math.PI / 2; xBar.position.set(0, h * 0.46, 0); g.add(xBar);
  const head = new THREE.Mesh(roundedBoxGeom(0.05, 0.06, 0.04, 0.01, 4), mat('#cc2222', 0.4, 0.3)); head.position.set(0.1, h * 0.44, 0); g.add(head);
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10), mat('#555', 0.5, 0.2)); exhaust.rotation.z = Math.PI / 2; exhaust.position.set(-w / 2 - 0.06, h * 0.3, d * 0.25); g.add(exhaust);
  const panel = plainBox(0.18, h * 0.4, 0.02, mat('#1a1a1a', 0.7), w * 0.38, h * 0.22, d / 2 + 0.01); g.add(panel);
  return g;
}
function buildScrollSaw({ color='#4a5a4a', w=0.55, d=0.45, h=0.95 } = {}) {
  const g = new THREE.Group();
  const body = mat(color, 0.5, 0.15, { env: 0.3 }), table_m = mat('#b8b0a0', 0.4, 0.3);
  const cab = new THREE.Mesh(roundedBoxGeom(w, h * 0.38, d, 0.025, 4), body); cab.position.set(0, h * 0.19, 0); cab.castShadow = true; cab.userData.colorable = true; g.add(cab);
  const tbl = new THREE.Mesh(roundedBoxGeom(w * 0.9, 0.04, d * 0.88, 0.01, 4), table_m); tbl.position.set(0, h * 0.4, 0); tbl.castShadow = true; g.add(tbl);
  const lowerArm = new THREE.Mesh(roundedBoxGeom(w * 0.22, h * 0.22, d * 0.28, 0.02, 4), body); lowerArm.position.set(-w * 0.24, h * 0.51, -d * 0.28); lowerArm.castShadow = true; g.add(lowerArm);
  const upperArm = new THREE.Mesh(roundedBoxGeom(w * 0.22, h * 0.22, d * 0.28, 0.02, 4), body); upperArm.position.set(-w * 0.24, h * 0.78, -d * 0.28); upperArm.castShadow = true; g.add(upperArm);
  const post = new THREE.Mesh(roundedBoxGeom(0.06, h * 0.38, 0.06, 0.02, 4), body); post.position.set(-w * 0.24, h * 0.61, -d * 0.28 - 0.04); g.add(post);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.005, h * 0.28, 0.005), mat('#aaaaaa', 0.2, 0.9)); blade.position.set(-w * 0.24, h * 0.62, -d * 0.1); g.add(blade);
  return g;
}


export { build3DPrinter, buildAnalyticalBalance, buildBandSaw, buildBenchGrinder, buildCentrifuge, buildChemShelf, buildDrillPress, buildFumeHood, buildGlassware, buildHydraulicPress, buildLabBench, buildLaserCutter, buildLathe, buildMicroscope, buildMillingMachine, buildOscilloscope, buildScrollSaw, buildTestBench, buildToolRack, buildWelderStation };
