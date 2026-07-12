import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clamp, shade } from './core/util.js';
import { canvas, wrapper, renderer, MAX_ANISO, scene, camera, DEFAULT_CAM_POS, raycaster, mouse, floorPlane, sun, hemi, rim, makeBgGradient } from './core/scene.js';
import { makeWoodTexture, makeWallTexture, makeNoiseTexture, makeRugTexture, makeConcreteTexture, makeTileTexture, makeMarbleTexture, makeCarpetTexture, makeTatamiTexture, makeBrickTexture, makePanelTexture, makeGenkanTexture, makeDirtTexture, makeGrassTexture, makeLawnTexture, makeParquetTexture, makeDarkWoodTexture, makeRubberTexture, makeCheckerPlateTexture, makeEpoxyTexture, makeTerracottaTexture, makeStoneTexture, woodTex, concreteTex, wallTexSrc, noiseTex, tileTex, marbleTex, carpetTex, tatamiTex, brickTex, panelTex, genkanTex, dirtTex, grassTex, lawnTex, parquetTex, darkWoodTex, rubberTex, checkerTex, epoxyTex, terracottaTex, stoneTex, FLOOR_TYPES, WALL_TYPES } from './core/textures.js';
import { GRID_SNAP, WALL_H, WALL_T, PART_H, COLORS, roundedBoxGeom, mat, fabricMat, box, plainBox, cyl, cylAt, makeGhost } from './core/helpers.js';
import { FURNITURE_DEFS } from './catalog.js';
import { P, PRESETS } from './presets.js';
import { validateAllPresets } from './core/orient.js';
import { APP_VERSION } from './core/version.js';


// Graceful degradation: verify WebGL before constructing the renderer


// ============================================================ APP STATE
let state = 'IDLE';
let currentDef = null, ghostGroup = null, ghostRotOffset = 0, ghostPlacement = null;
let selectedGroup = null, selectedColor = '#c8a06a', selectedRot = 0;
let placedItems = [], history = [], historyIndex = -1;
let roomW = 6, roomD = 6, partitions = [], extWallOpenings = null;
let showGrid = true, showShadows = true, isTopView = false;
let wallMode = 'semifade';
let wallMeshes = [];
let floorType = 'wood', wallType = 'cream';
let paintMode = false;
let paintableWalls = [];
// PLAN model — single source of truth for room shape / walls / doors / floor.
// cells: key "ix,iz" (integer grid indices) -> floorType string. Presence = floor exists.
//   Cell center is world meters: x = ix*CELL, z = iz*CELL (centered at origin, ix/iz may be negative).
// walls: [ { x1,z1,x2,z2 (world meters), doors:[ { t (0..1 along wall), w (door width m) } ] } ]
let roomPlan = { cells: new Map(), walls: [] };

// OrbitControls is created AFTER our pointer event listeners (see bottom of interaction section).
// This ensures our handlers run first so we can call stopImmediatePropagation()
// to block OrbitControls from seeing pointer events when dragging furniture.
let controls;






// Floor & wall material registries — single source of truth for the selectors

// Rounded box for soft, cozy furniture silhouettes

// ============================================================ ROOM
const roomGroup = new THREE.Group();
scene.add(roomGroup);
let gridHelper = null;
const camDirH = new THREE.Vector3();

const selectionRing = (() => {
  const r = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.03, 10, 64),
    new THREE.MeshBasicMaterial({ color: 0x62a86d, transparent: true, opacity: 0.9 })
  );
  r.rotation.x = -Math.PI / 2; r.position.y = 0.03; r.visible = false; scene.add(r);
  return r;
})();

function registerWall(mesh) {
  // Fade normal = horizontal direction from room center to wall center
  const n = new THREE.Vector3(mesh.position.x, 0, mesh.position.z);
  if (n.length() < 0.35) n.set(0, 0, 0); else n.normalize();
  mesh.userData.isWall = true;
  mesh.userData.fadeNormal = n;
  // transparent: true must be set in the material constructor to avoid shader recompilation.
  // We enforce this in buildRoom() and buildPartition() so nothing extra needed here.
  // Glass / frosted panes (素材がガラス) must stay see-through even when walls are set opaque:
  // tag them so updateWalls() caps their opacity at their natural (>=30% transparent) value.
  const mop = mesh.material && mesh.material.opacity;
  if (mesh.material && mesh.material.transparent && mop != null && mop < 0.6) {
    mesh.userData.glassPane = true;
    mesh.userData.baseOpacity = mop;
  }
  wallMeshes.push(mesh);
}

// Apply a floor-type spec to a material, sizing the texture to cover `w`×`d` meters.
function applyFloorSpec(material, type, w, d) {
  const spec = FLOOR_TYPES[type] || FLOOR_TYPES.wood;
  const t = spec.tex.clone(); t.needsUpdate = true;
  t.repeat.set(Math.max(1, w / spec.per), Math.max(1, d / spec.per));
  material.map = t;
  material.color.set(spec.color);
  material.roughness = spec.rough; material.metalness = spec.metal;
  material.envMapIntensity = 0.35;
  if (spec.macro) {
    const rm = spec.macro.clone(); rm.needsUpdate = true;
    rm.repeat.set(Math.max(0.5, w / 8.0), Math.max(0.5, d / 8.0));
    material.roughnessMap = rm;
  } else {
    material.roughnessMap = null;
  }
  material.needsUpdate = true;
}

// Non-paint mode: floor select repaints the WHOLE floor — set every cell to floorType, rebuild.
function updateFloorTexture() {
  roomPlan.cells.forEach((_, key) => roomPlan.cells.set(key, floorType));
  buildFloorMeshes();
  scheduleAutoSave();
}

function applyWallType() {
  const spec = WALL_TYPES[wallType] || WALL_TYPES.cream;
  paintableWalls.forEach(m => {
    const rep = m.userData.rep || [1, 1];
    const t = spec.tex.clone(); t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rep[0], rep[1]);
    m.material.map = t;
    m.material.color.set(spec.color);
    m.material.roughness = spec.rough; m.material.metalness = spec.metal;
    m.material.needsUpdate = true;
  });
}

// ============================================================ PLAN MODEL
const CELL = GRID_SNAP; // 0.5m cell — cells & walls share world-meter coords centered at origin
const DOOR_H = 2.05;    // door opening height
function cellKey(ix, iz) { return ix + ',' + iz; }
// Corner-indexed: cell (ix,iz) occupies [ix*CELL,(ix+1)*CELL] × [iz*CELL,(iz+1)*CELL].
// Walls snap to multiples of CELL — same as cell corners — so floors and walls align exactly.
function cellCenterX(ix) { return (ix + 0.5) * CELL; }
function cellCenterZ(iz) { return (iz + 0.5) * CELL; }
// Bounding box of filled cells (falls back to walls, then a small default).
function planBounds() {
  let minIx = Infinity, maxIx = -Infinity, minIz = Infinity, maxIz = -Infinity, any = false;
  roomPlan.cells.forEach((_, key) => {
    const [ix, iz] = key.split(',').map(Number);
    if (ix < minIx) minIx = ix; if (ix > maxIx) maxIx = ix;
    if (iz < minIz) minIz = iz; if (iz > maxIz) maxIz = iz; any = true;
  });
  if (!any && roomPlan.walls.length) {
    // derive extent from wall endpoints (in cell units)
    let xs = [], zs = [];
    roomPlan.walls.forEach(w => { xs.push(w.x1, w.x2); zs.push(w.z1, w.z2); });
    minIx = Math.round(Math.min(...xs) / CELL); maxIx = Math.round(Math.max(...xs) / CELL);
    minIz = Math.round(Math.min(...zs) / CELL); maxIz = Math.round(Math.max(...zs) / CELL); any = true;
  }
  if (!any) { minIx = maxIx = minIz = maxIz = 0; }
  const w = (maxIx - minIx + 1) * CELL, d = (maxIz - minIz + 1) * CELL;
  return { minIx, maxIx, minIz, maxIz, w, d };
}
// Build a rectangular plan (used by the room-size slider, presets, reset-to-rect).
// extW: optional { south, north, west, east } — each an openings array for that exterior wall.
function rectToPlan(w, d, parts, ftype, extW) {
  const cells = new Map();
  const nx = Math.max(1, Math.round(w / CELL)), nz = Math.max(1, Math.round(d / CELL));
  const ixMin = -Math.floor(nx / 2), ixMax = ixMin + nx - 1;
  const izMin = -Math.floor(nz / 2), izMax = izMin + nz - 1;
  for (let ix = ixMin; ix <= ixMax; ix++) for (let iz = izMin; iz <= izMax; iz++) cells.set(cellKey(ix, iz), ftype);
  const x0 = ixMin * CELL, x1 = (ixMax + 1) * CELL;  // corner-indexed edges
  const z0 = izMin * CELL, z1 = (izMax + 1) * CELL;
  const ew = extW || {};
  const walls = [
    { x1: x0, z1: z0, x2: x1, z2: z0, type: 'wall', openings: ew.south || [] },
    { x1: x0, z1: z1, x2: x1, z2: z1, type: 'wall', openings: ew.north || [] },
    { x1: x0, z1: z0, x2: x0, z2: z1, type: 'wall', openings: ew.west  || [] },
    { x1: x1, z1: z0, x2: x1, z2: z1, type: 'wall', openings: ew.east  || [] },
  ];
  (parts || []).forEach(p => walls.push({ x1: p.x1, z1: p.z1, x2: p.x2, z2: p.z2, type: p.type || 'wall', openings: p.openings || [], isPartition: true }));
  return { cells, walls };
}

// ============================================================ FLOOR PAINT (quick toolbar — edits plan cells)
// Quick-paint only REPAINTS existing cells (never changes shape — that's the 2D editor's job).
function paintFloorAt(worldX, worldZ, type) {
  const ix = Math.floor(worldX / CELL), iz = Math.floor(worldZ / CELL);
  const key = cellKey(ix, iz);
  if (!roomPlan.cells.has(key)) return;       // only existing floor
  if (roomPlan.cells.get(key) === type) return;
  roomPlan.cells.set(key, type);
  buildFloorMeshes();
}
function eraseFloorAt(worldX, worldZ) {
  // In quick-paint "erase" resets the cell to the base floorType (does NOT delete the cell).
  const ix = Math.floor(worldX / CELL), iz = Math.floor(worldZ / CELL);
  const key = cellKey(ix, iz);
  if (!roomPlan.cells.has(key)) return;
  if (roomPlan.cells.get(key) === floorType) return;
  roomPlan.cells.set(key, floorType);
  buildFloorMeshes();
}

// Representative swatch colors for the 2D editor (when FLOOR_TYPES.color is white).
const FLOOR_SWATCH = {
  wood:'#caa46d', parquet:'#9a7040', dark_wood:'#3a2414',
  concrete:'#9ca3a8', tile:'#e7eaee', marble:'#f0eee9',
  carpet:'#c9c2b4', tatami:'#cdbf86', genkan:'#ddd6c8',
  terracotta:'#c8724a', stone:'#8a8480',
  rubber:'#303030', checker_plate:'#7a8090', epoxy:'#3a7040',
  oil_concrete:'#82888c', worn_painted:'#41566b', rusty_metal:'#6b5a4a',
  safety_line:'#9a8a3a', cracked_concrete:'#9c988f',
  dirt:'#8a6a47', grass:'#5f8a44', lawn:'#6fa050'
};
function floorSwatch(type) { return FLOOR_SWATCH[type] || '#caa46d'; }

// Build (or rebuild) the floor: one merged BufferGeometry mesh per floor type present.
function buildFloorMeshes() {
  // remove existing floor meshes
  for (let i = roomGroup.children.length - 1; i >= 0; i--) {
    const c = roomGroup.children[i];
    if (c.userData && c.userData.isFloor) {
      c.geometry.dispose(); if (c.material.map) c.material.map.dispose(); c.material.dispose();
      roomGroup.remove(c);
    }
  }
  // group cells by type
  const byType = new Map();
  roomPlan.cells.forEach((type, key) => {
    const [ix, iz] = key.split(',').map(Number);
    if (!byType.has(type)) byType.set(type, []);
    byType.get(type).push([ix, iz]);
  });
  const half = CELL / 2;
  byType.forEach((cellsArr, type) => {
    if (!cellsArr.length) return;
    const spec = FLOOR_TYPES[type] || FLOOR_TYPES.wood;
    const positions = [], normals = [], uvs = [], indices = [];
    let v = 0;
    for (const [ix, iz] of cellsArr) {
      const cx = cellCenterX(ix), cz = cellCenterZ(iz);
      const x0 = cx - half, x1 = cx + half, z0 = cz - half, z1 = cz + half;
      // quad in XZ at y=0.002 (CCW viewed from above so normal +Y)
      positions.push(x0,0.002,z0,  x1,0.002,z0,  x1,0.002,z1,  x0,0.002,z1);
      for (let k = 0; k < 4; k++) normals.push(0,1,0);
      // tile texture by `per` meters
      uvs.push(x0/spec.per, z0/spec.per,  x1/spec.per, z0/spec.per,  x1/spec.per, z1/spec.per,  x0/spec.per, z1/spec.per);
      indices.push(v, v+2, v+1,  v, v+3, v+2);
      v += 4;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    const tex = spec.tex.clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: tex, color: spec.color, roughness: spec.rough, metalness: spec.metal, envMapIntensity: 0.35
    }));
    m.receiveShadow = true; m.userData.isFloor = true; m.userData.floorType = type;
    roomGroup.add(m);
  });
}

function buildRoom() {
  while (roomGroup.children.length) {
    const c = roomGroup.children[0];
    // traverse so meshes nested in pivot groups (door slabs) are disposed too
    c.traverse(n => { if (n.geometry) n.geometry.dispose(); if (n.material) { if (n.material.map) n.material.map.dispose(); n.material.dispose(); } });
    roomGroup.remove(c);
  }
  if (gridHelper) { scene.remove(gridHelper); gridHelper.geometry.dispose(); gridHelper.material.dispose(); gridHelper = null; }
  wallMeshes = [];
  paintableWalls = [];

  // Update roomW/roomD to the plan bounding box (keeps clamp / camera framing working).
  const b = planBounds();
  roomW = Math.max(CELL, b.w); roomD = Math.max(CELL, b.d);
  const w = roomW, d = roomD;

  // Floor: one merged mesh per floor type present in the plan.
  buildFloorMeshes();

  // Walls (with door openings) from the plan.
  roomPlan.walls.forEach(wall => buildWallSegment(wall));

  // Grid sized to the plan bounding box.
  if (showGrid) {
    const maxG = Math.max(1, Math.round(Math.max(w, d) / GRID_SNAP));
    gridHelper = new THREE.GridHelper(Math.max(w, d), maxG, 0x9c8f78, 0xc4b89f);
    gridHelper.material.transparent = true; gridHelper.material.opacity = 0.4;
    gridHelper.position.y = 0.02; gridHelper.visible = showGrid;
    scene.add(gridHelper);
  }

  // Sun shadow frustum sized to room
  const mx = Math.max(w, d) * 0.9 + 2;
  sun.shadow.camera.left = -mx; sun.shadow.camera.right = mx;
  sun.shadow.camera.top = mx; sun.shadow.camera.bottom = -mx;
  sun.shadow.camera.updateProjectionMatrix();

  applyShadowSetting();
}

// Build a wall (full height WALL_H) along the segment, with door gaps + frames + slabs.
function buildWallSegment(wall) {
  const prevWallCount = wallMeshes.length;
  const { x1, z1, x2, z2 } = wall;
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return;
  const ux = dx / len, uz = dz / len;            // unit dir along wall
  const rotY = Math.atan2(-dz, dx);              // same convention as partitions
  const wallSpec = WALL_TYPES[wallType] || WALL_TYPES.cream;
  // helper to spawn a wall material (cloned tex sized to a piece length)
  const wallMat = (pieceLen) => {
    const rep = [Math.max(0.1, pieceLen / 1.5), WALL_H / 1.5];
    const tex = wallSpec.tex.clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(rep[0], rep[1]);
    const m = new THREE.MeshStandardMaterial({ map: tex, color: wallSpec.color, roughness: wallSpec.rough, metalness: wallSpec.metal, envMapIntensity: 0.3, transparent: true, opacity: 1.0 });
    return { m, rep };
  };
  // point at distance s along the wall from (x1,z1)
  const ptAt = s => [x1 + ux * s, z1 + uz * s];

  // Normalize openings — backward compat: accept old 'doors' array mapped to kind:'door'
  const rawOpenings = wall.openings || (wall.doors || []).map(d => ({ t: d.t, w: d.w, kind: 'door' }));
  const wType = wall.type || 'wall';

  // ---- GLASS WALL: full-height glazing split around openings (supports glass doors) ----
  if (wType === 'glass') {
    const glassMat = () => new THREE.MeshStandardMaterial({
      color: 0xc8e8f4, roughness: 0.04, metalness: 0.15,
      transparent: true, opacity: 0.28, envMapIntensity: 1.4, side: THREE.DoubleSide
    });
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x8a9aa5, roughness: 0.3, metalness: 0.7, transparent: true, opacity: 1.0 });
    const fw = 0.06;
    // Openings along this glass wall
    const gOpenings = rawOpenings.map(dr => {
      const dw = dr.w || 0.9, s = clamp(dr.t, 0, 1) * len;
      return { s0: clamp(s - dw / 2, 0, len), s1: clamp(s + dw / 2, 0, len), kind: dr.kind || 'door' };
    }).filter(o => o.s1 - o.s0 > 0.05).sort((a, b) => a.s0 - b.s0);
    // Full-height glazing for a [s0,s1] span
    const glazing = (s0, s1) => {
      const pl = s1 - s0; if (pl < 0.04) return;
      const [cx, cz] = ptAt((s0 + s1) / 2);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(pl - fw, WALL_H - fw, 0.04), glassMat());
      panel.position.set(cx, WALL_H / 2, cz); panel.rotation.y = rotY; panel.castShadow = false;
      roomGroup.add(panel); registerWall(panel);
    };
    // Vertical mullion at distance s (full height unless h given)
    const mullion = (s, h = WALL_H) => {
      const [px, pz] = ptAt(s);
      const post = new THREE.Mesh(new THREE.BoxGeometry(fw, h, WALL_T + 0.01), frameMat);
      post.position.set(px, h / 2, pz); post.rotation.y = rotY; roomGroup.add(post); registerWall(post);
    };
    // Glazing for solid spans between openings
    let cursor = 0;
    gOpenings.forEach(o => { glazing(cursor, o.s0); cursor = o.s1; });
    glazing(cursor, len);
    // Top rail (full length) + end mullions
    const [tcx, tcz] = ptAt(len / 2);
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(len + fw, fw, WALL_T + 0.01), frameMat);
    topBar.position.set(tcx, WALL_H - fw / 2, tcz); topBar.rotation.y = rotY; roomGroup.add(topBar); registerWall(topBar);
    mullion(0); mullion(len);
    // Per-opening: jamb mullions, a transom-height glass leaf, and a head rail
    gOpenings.forEach(o => {
      const ow = o.s1 - o.s0; const [ocx, ocz] = ptAt((o.s0 + o.s1) / 2);
      mullion(o.s0, DOOR_H); mullion(o.s1, DOOR_H);
      // transom glazing above the door
      const th = WALL_H - DOOR_H - fw;
      if (th > 0.05) {
        const tr = new THREE.Mesh(new THREE.BoxGeometry(ow - fw, th, 0.04), glassMat());
        tr.position.set(ocx, DOOR_H + fw + th / 2, ocz); tr.rotation.y = rotY; tr.castShadow = false; roomGroup.add(tr); registerWall(tr);
      }
      // frameless glass door leaf (closed)
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(ow - 0.05, DOOR_H - 0.05, 0.035), glassMat());
      leaf.position.set(ocx, (DOOR_H - 0.05) / 2, ocz); leaf.rotation.y = rotY; leaf.castShadow = false;
      roomGroup.add(leaf); registerWall(leaf);
      // slim pull handle
      const [hx, hz] = ptAt(o.s1 - 0.12);
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.05), frameMat);
      handle.position.set(hx, DOOR_H * 0.5, hz); handle.rotation.y = rotY; roomGroup.add(handle); registerWall(handle);
      // head rail across the opening
      const head = new THREE.Mesh(new THREE.BoxGeometry(ow, fw, WALL_T + 0.01), frameMat);
      head.position.set(ocx, DOOR_H, ocz); head.rotation.y = rotY; roomGroup.add(head); registerWall(head);
    });
    return;
  }

  // Helpers for partial-height wall pieces
  const addPartial = (s0, s1, yBot, yTop) => {
    const pieceLen = s1 - s0, ph = yTop - yBot; if (pieceLen < 0.001 || ph < 0.001) return;
    const [cx, cz] = ptAt((s0 + s1) / 2);
    const { m: material } = wallMat(pieceLen);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(pieceLen, ph, WALL_T), material);
    mesh.position.set(cx, yBot + ph / 2, cz); mesh.rotation.y = rotY;
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.userData.isMainWall = true;
    roomGroup.add(mesh); registerWall(mesh); paintableWalls.push(mesh);
  };
  // a solid full-height piece spanning [s0,s1]
  const addSolid = (s0, s1) => addPartial(s0, s1, 0, WALL_H);

  const frameMatStd = () => new THREE.MeshStandardMaterial({ color: 0x9c7b4f, roughness: 0.6, metalness: 0.0, transparent: true, opacity: 1.0 });

  // ---- HALF WALL (腰壁 / counter wall): solid but only ~1.1m tall ----
  if (wType === 'half') {
    const HALF_H = 1.1;
    addPartial(0, len, 0, HALF_H);
    // capping rail along the top
    const [ccx, ccz] = ptAt(len / 2);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(len + 0.04, 0.06, WALL_T + 0.06),
      new THREE.MeshStandardMaterial({ color: 0xb89a6a, roughness: 0.55, metalness: 0.04, transparent: true, opacity: 1.0 }));
    cap.position.set(ccx, HALF_H + 0.03, ccz); cap.rotation.y = rotY; cap.castShadow = true; roomGroup.add(cap); registerWall(cap);
    return;
  }

  // ---- DOOR WALL (扉): the whole segment is a door unit (single or double) ----
  if (wType === 'door') {
    const fw = 0.07, ft = WALL_T + 0.03;
    const lh = WALL_H - DOOR_H;
    // lintel above the door spanning the full segment
    const [lcx, lcz] = ptAt(len / 2);
    const { m: lmat } = wallMat(len);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(len, lh, WALL_T), lmat);
    lintel.position.set(lcx, DOOR_H + lh / 2, lcz); lintel.rotation.y = rotY;
    lintel.castShadow = true; lintel.receiveShadow = true; lintel.userData.isMainWall = true;
    roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
    // jamb posts at both ends + head
    [0, len].forEach(sp => {
      const [px, pz] = ptAt(sp); const post = new THREE.Mesh(new THREE.BoxGeometry(fw, DOOR_H, ft), frameMatStd());
      post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; post.castShadow = true; roomGroup.add(post); registerWall(post);
    });
    const head = new THREE.Mesh(new THREE.BoxGeometry(len + fw, fw, ft), frameMatStd());
    head.position.set(lcx, DOOR_H - fw / 2, lcz); head.rotation.y = rotY; head.castShadow = true; roomGroup.add(head); registerWall(head);
    // interior normal (toward room center) for ajar swing + fade
    const fn = new THREE.Vector3(lcx, 0, lcz); if (fn.length() < 0.35) fn.set(0, 0, 0); else fn.normalize();
    const slabMat = () => new THREE.MeshStandardMaterial({ color: 0xb9925e, roughness: 0.5, metalness: 0.05, transparent: true, opacity: 1.0 });
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xcdb78a, roughness: 0.3, metalness: 0.8 });
    const slabH = DOOR_H - fw;
    const makeLeaf = (hingeS, leafW, dir) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(leafW, slabH, 0.045), slabMat());
      // recessed panel detail
      slab.add(new THREE.Mesh(new THREE.BoxGeometry(leafW - 0.12, slabH - 0.2, 0.05), new THREE.MeshStandardMaterial({ color: 0xa97f4e, roughness: 0.55 })));
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.1, 10), handleMat);
      handle.rotation.x = Math.PI / 2; handle.position.set(dir * (leafW - 0.08), 0, 0.05); slab.add(handle);
      const pivot = new THREE.Group();
      const [hx, hz] = ptAt(hingeS);
      pivot.position.set(hx, slabH / 2, hz); pivot.rotation.y = rotY;
      slab.position.set(dir * leafW / 2, 0, 0.06);
      slab.castShadow = true; pivot.add(slab);
      pivot.rotation.y = rotY;
      roomGroup.add(pivot); registerWall(slab);
      slab.userData.fadeNormal = fn;
    };
    if (len <= 1.35) {
      makeLeaf(fw / 2, len - fw, 1);                 // single leaf hinged at left
    } else {
      makeLeaf(fw / 2, len / 2 - fw, 1);             // left leaf
      makeLeaf(len - fw / 2, len / 2 - fw, -1);      // right leaf
    }
    return;
  }

  // Openings sorted; each has s0,s1,kind
  const openings = rawOpenings.map(dr => {
    const dw = dr.w || 0.9, s = clamp(dr.t, 0, 1) * len;
    return { s0: clamp(s - dw / 2, 0, len), s1: clamp(s + dw / 2, 0, len), kind: dr.kind || 'door' };
  }).filter(o => o.s1 - o.s0 > 0.05).sort((a, b) => a.s0 - b.s0);

  // Solid pieces between openings (full height, gaps where openings are)
  let cursor = 0;
  openings.forEach(o => { addSolid(cursor, o.s0); cursor = o.s1; });
  addSolid(cursor, len);

  // Per-opening detail (lintel / glass / door slab)
  const frameMat = () => new THREE.MeshStandardMaterial({ color: 0x9c7b4f, roughness: 0.6, metalness: 0.0, transparent: true, opacity: 1.0 });
  const glassMat = () => new THREE.MeshStandardMaterial({
    color: 0xc8e8f4, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.32, envMapIntensity: 1.4, side: THREE.DoubleSide
  });
  openings.forEach(o => {
    const ow = o.s1 - o.s0;
    const [cx, cz] = ptAt((o.s0 + o.s1) / 2);
    const ft = WALL_T + 0.02, fw = 0.06;

    if (o.kind === 'window') {
      // Window: sill at 0.85m, top at 2.1m — wall pieces fill below/above, glass in gap
      const SILL = 0.85, WIN_TOP = Math.min(2.1, WALL_H - 0.1);
      addPartial(o.s0, o.s1, 0, SILL);
      addPartial(o.s0, o.s1, WIN_TOP, WALL_H);
      // Glass pane
      const panH = WIN_TOP - SILL;
      const gMesh = new THREE.Mesh(new THREE.BoxGeometry(ow - 0.04, panH, 0.04), glassMat());
      gMesh.position.set(cx, SILL + panH / 2, cz); gMesh.rotation.y = rotY;
      roomGroup.add(gMesh); registerWall(gMesh);
      // Window frame
      const wfMat = new THREE.MeshStandardMaterial({ color: 0xd0c8b8, roughness: 0.5, metalness: 0.1, transparent: true, opacity: 1.0 });
      const addWF = (bx, by, bz, bw, bh, bd) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wfMat);
        m.position.set(bx, by, bz); m.rotation.y = rotY; roomGroup.add(m); registerWall(m);
      };
      addWF(cx, SILL, cz, ow, 0.05, ft);
      addWF(cx, WIN_TOP, cz, ow, 0.05, ft);
      [o.s0, o.s1].forEach(sp => { const [px, pz] = ptAt(sp); addWF(px, SILL + panH / 2, pz, 0.05, panH, ft); });
    } else if (o.kind === 'glass_door') {
      // Glass sliding door: gap floor-to-DOOR_H, filled with glass panel
      const lh = WALL_H - DOOR_H;
      const { m: lmat } = wallMat(ow);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(ow, lh, WALL_T), lmat);
      lintel.position.set(cx, DOOR_H + lh / 2, cz); lintel.rotation.y = rotY;
      lintel.castShadow = true; roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
      // Glass panel (closed — spans the full opening)
      const gPanel = new THREE.Mesh(new THREE.BoxGeometry(ow - 0.02, DOOR_H - 0.04, 0.04), glassMat());
      gPanel.position.set(cx, DOOR_H / 2, cz); gPanel.rotation.y = rotY;
      roomGroup.add(gPanel); registerWall(gPanel);
      // Frame rail
      [o.s0, o.s1].forEach(sp => {
        const [px, pz] = ptAt(sp); const post = new THREE.Mesh(new THREE.BoxGeometry(fw, DOOR_H, ft), frameMat());
        post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; post.castShadow = true; roomGroup.add(post); registerWall(post);
      });
    } else if (o.kind === 'auto_door') {
      // 自動ドア: two glass panels slid to edges, aluminum frame + sensor housing
      const lh = WALL_H - DOOR_H;
      const { m: lmat } = wallMat(ow);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(ow, lh, WALL_T), lmat);
      lintel.position.set(cx, DOOR_H + lh / 2, cz); lintel.rotation.y = rotY;
      lintel.castShadow = true; roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
      const alM = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, roughness: 0.3, metalness: 0.7, transparent: true, opacity: 1.0 });
      [o.s0, o.s1].forEach(sp => {
        const [px, pz] = ptAt(sp);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, DOOR_H, ft), alM);
        post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; post.castShadow = true; roomGroup.add(post); registerWall(post);
      });
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(ow, 0.08, ft), alM);
      topRail.position.set(cx, DOOR_H - 0.04, cz); topRail.rotation.y = rotY; roomGroup.add(topRail); registerWall(topRail);
      const panW = ow * 0.5;   // closed — two leaves meet at the center
      const gMopen = glassMat();
      const [lpx, lpz] = ptAt(o.s0 + panW / 2);
      const lp = new THREE.Mesh(new THREE.BoxGeometry(panW, DOOR_H - 0.1, 0.04), gMopen);
      lp.position.set(lpx, (DOOR_H - 0.1) / 2, lpz); lp.rotation.y = rotY; roomGroup.add(lp); registerWall(lp);
      const [rpx, rpz] = ptAt(o.s1 - panW / 2);
      const rp = new THREE.Mesh(new THREE.BoxGeometry(panW, DOOR_H - 0.1, 0.04), gMopen);
      rp.position.set(rpx, (DOOR_H - 0.1) / 2, rpz); rp.rotation.y = rotY; roomGroup.add(rp); registerWall(rp);
      const sens = new THREE.Mesh(new THREE.BoxGeometry(ow * 0.4, 0.07, 0.1), alM);
      sens.position.set(cx, DOOR_H + 0.035, cz); sens.rotation.y = rotY; roomGroup.add(sens);
    } else if (o.kind === 'double_door') {
      // 両開きドア: two swing leaves hinged at each edge
      const lh = WALL_H - DOOR_H;
      const { m: lmat } = wallMat(ow);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(ow, lh, WALL_T), lmat);
      lintel.position.set(cx, DOOR_H + lh / 2, cz); lintel.rotation.y = rotY;
      lintel.castShadow = true; roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
      const fMd = frameMat();
      [o.s0, o.s1].forEach(sp => {
        const [px, pz] = ptAt(sp);
        const post = new THREE.Mesh(new THREE.BoxGeometry(fw, DOOR_H, ft), fMd);
        post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; post.castShadow = true; roomGroup.add(post); registerWall(post);
      });
      const dtop = new THREE.Mesh(new THREE.BoxGeometry(ow + fw, fw, ft), fMd);
      dtop.position.set(cx, DOOR_H - fw / 2, cz); dtop.rotation.y = rotY; dtop.castShadow = true; roomGroup.add(dtop); registerWall(dtop);
      const halfW = ow / 2 - fw * 0.55, dslabH = DOOR_H - fw;
      const ddoorM = new THREE.MeshStandardMaterial({ color: 0xb9925e, roughness: 0.55, metalness: 0.05, transparent: true, opacity: 1.0 });
      const dfn = new THREE.Vector3(cx, 0, cz); if (dfn.length() < 0.35) dfn.set(0, 0, 0); else dfn.normalize();
      const pivL = new THREE.Group();
      const [hlx, hlz] = ptAt(o.s0 + fw * 0.5);
      pivL.position.set(hlx, dslabH / 2, hlz);
      const slabL = new THREE.Mesh(new THREE.BoxGeometry(halfW, dslabH, 0.04), ddoorM);
      slabL.position.set(halfW / 2, 0, 0.06); slabL.castShadow = true; pivL.add(slabL);
      pivL.rotation.y = rotY; roomGroup.add(pivL); registerWall(slabL); slabL.userData.fadeNormal = dfn;
      const pivR = new THREE.Group();
      const [hrx, hrz] = ptAt(o.s1 - fw * 0.5);
      pivR.position.set(hrx, dslabH / 2, hrz);
      const slabR = new THREE.Mesh(new THREE.BoxGeometry(halfW, dslabH, 0.04), ddoorM);
      slabR.position.set(-halfW / 2, 0, 0.06); slabR.castShadow = true; pivR.add(slabR);
      pivR.rotation.y = rotY; roomGroup.add(pivR); registerWall(slabR); slabR.userData.fadeNormal = dfn;
    } else if (o.kind === 'lab_door') {
      // 安全ドア: steel door with upper observation window
      const lh = WALL_H - DOOR_H;
      const { m: lmat } = wallMat(ow);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(ow, lh, WALL_T), lmat);
      lintel.position.set(cx, DOOR_H + lh / 2, cz); lintel.rotation.y = rotY;
      lintel.castShadow = true; lintel.receiveShadow = true; roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
      const fMl = frameMat();
      [o.s0, o.s1].forEach(sp => {
        const [px, pz] = ptAt(sp);
        const post = new THREE.Mesh(new THREE.BoxGeometry(fw, DOOR_H, ft), fMl);
        post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; post.castShadow = true; roomGroup.add(post); registerWall(post);
      });
      const ltop = new THREE.Mesh(new THREE.BoxGeometry(ow + fw, fw, ft), fMl);
      ltop.position.set(cx, DOOR_H - fw / 2, cz); ltop.rotation.y = rotY; ltop.castShadow = true; roomGroup.add(ltop); registerWall(ltop);
      const lslabW = ow - fw, lslabH = DOOR_H - fw;
      const labM = new THREE.MeshStandardMaterial({ color: 0x4a5055, roughness: 0.45, metalness: 0.55, transparent: true, opacity: 1.0 });
      const lslab = new THREE.Mesh(new THREE.BoxGeometry(lslabW, lslabH, 0.05), labM);
      const lpivot = new THREE.Group();
      const [lhx, lhz] = ptAt(o.s0 + fw / 2);
      lpivot.position.set(lhx, lslabH / 2, lhz);
      lslab.position.set(lslabW / 2, 0, 0.06); lslab.castShadow = true; lpivot.add(lslab);
      const lwinW = Math.min(0.28, lslabW * 0.45), lwinH = 0.26;
      const lwinglass = new THREE.Mesh(new THREE.BoxGeometry(lwinW, lwinH, 0.07), glassMat());
      lwinglass.position.set(lslabW * 0.5, lslabH * 0.25, 0.06); lpivot.add(lwinglass);
      lpivot.rotation.y = rotY; roomGroup.add(lpivot); registerWall(lslab);
      const lfn = new THREE.Vector3(cx, 0, cz); if (lfn.length() < 0.35) lfn.set(0, 0, 0); else lfn.normalize();
      lslab.userData.fadeNormal = lfn;
      lwinglass.userData.fadeNormal = lfn; wallMeshes.push(lwinglass);
    } else if (o.kind === 'fusuma') {
      // 襖: two sliding panels with wooden frame and washi paper face
      const lh = WALL_H - DOOR_H;
      const { m: lmat } = wallMat(ow);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(ow, lh, WALL_T), lmat);
      lintel.position.set(cx, DOOR_H + lh / 2, cz); lintel.rotation.y = rotY;
      lintel.castShadow = true; roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
      const fwM = new THREE.MeshStandardMaterial({ color: 0x3a2a16, roughness: 0.72, metalness: 0.0, transparent: true, opacity: 1.0 });
      const paM = new THREE.MeshStandardMaterial({ color: 0xf0e8d4, roughness: 0.92, metalness: 0.0, transparent: true, opacity: 1.0 });
      // Track header
      const trk = new THREE.Mesh(new THREE.BoxGeometry(ow + 0.04, 0.045, ft), fwM);
      trk.position.set(cx, DOOR_H - 0.022, cz); trk.rotation.y = rotY; roomGroup.add(trk); registerWall(trk);
      // Side posts
      [o.s0, o.s1].forEach(sp => {
        const [px, pz] = ptAt(sp);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.048, DOOR_H, ft), fwM);
        post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; post.castShadow = true; roomGroup.add(post); registerWall(post);
      });
      // Two panels (closed — each 50% of opening, meeting at the center)
      const fpW = ow * 0.50, fpH = DOOR_H - 0.07;
      [[o.s0 + fpW / 2, -1], [o.s1 - fpW / 2, 1]].forEach(([sc, side]) => {
        const [px, pz] = ptAt(sc);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(fpW, fpH, 0.038), paM);
        panel.position.set(px, fpH / 2 + 0.025, pz); panel.rotation.y = rotY;
        panel.castShadow = true; roomGroup.add(panel); registerWall(panel);
        // Wooden border frame on panel
        const bM = new THREE.MeshStandardMaterial({ color: 0x3a2a16, roughness: 0.7, metalness: 0.0, transparent: true, opacity: 1.0 });
        [[fpW, 0.03, 0], [0.03, fpH, 0]].forEach(([bw, bh, _]) => {
          [fpH / 2 + 0.025, -(fpH / 2) + 0.025].forEach(by_offset => {
            if (bh < 0.1) { // top/bottom rail
              const rail = new THREE.Mesh(new THREE.BoxGeometry(fpW, 0.04, 0.042), bM);
              rail.position.set(px, fpH / 2 + 0.025 + (bh < 0.1 ? by_offset - fpH / 2 - 0.025 : 0), pz); rail.rotation.y = rotY; roomGroup.add(rail);
            }
          });
          if (bh > fpH - 0.1) { // side stiles
            [-fpW / 2 + 0.015, fpW / 2 - 0.015].forEach(sOff => {
              const [stx, stz] = ptAt(sc + sOff * (side > 0 ? -1 : 1) * 0.001);
              const stile = new THREE.Mesh(new THREE.BoxGeometry(0.04, fpH, 0.042), bM);
              stile.position.set(stx, fpH / 2 + 0.025, stz); stile.rotation.y = rotY; roomGroup.add(stile);
            });
          }
        });
        // Handle pull
        const [hpx, hpz] = ptAt(sc + side * fpW * 0.28);
        const hdl = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.15, 0.052), bM);
        hdl.position.set(hpx, fpH * 0.48, hpz); hdl.rotation.y = rotY; roomGroup.add(hdl);
      });
    } else if (o.kind === 'shoji') {
      // 障子: translucent grid screen panels
      const lh = WALL_H - DOOR_H;
      const { m: lmat } = wallMat(ow);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(ow, lh, WALL_T), lmat);
      lintel.position.set(cx, DOOR_H + lh / 2, cz); lintel.rotation.y = rotY;
      lintel.castShadow = true; roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
      const sfwM = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.7, metalness: 0.0, transparent: true, opacity: 1.0 });
      const trk2 = new THREE.Mesh(new THREE.BoxGeometry(ow + 0.04, 0.04, ft), sfwM);
      trk2.position.set(cx, DOOR_H - 0.02, cz); trk2.rotation.y = rotY; roomGroup.add(trk2); registerWall(trk2);
      [o.s0, o.s1].forEach(sp => {
        const [px, pz] = ptAt(sp);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.045, DOOR_H, ft), sfwM);
        post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; roomGroup.add(post); registerWall(post);
      });
      // Translucent washi paper
      const waM = new THREE.MeshStandardMaterial({ color: 0xfdf5e6, roughness: 0.85, metalness: 0.0, transparent: true, opacity: 0.72, side: THREE.DoubleSide });
      const spW = ow * 0.50, spH = DOOR_H - 0.06;   // closed — panels meet at the center
      [[o.s0 + spW / 2, 1], [o.s1 - spW / 2, -1]].forEach(([sc, _]) => {
        const [px, pz] = ptAt(sc);
        const scrn = new THREE.Mesh(new THREE.BoxGeometry(spW - 0.04, spH - 0.04, 0.012), waM);
        scrn.position.set(px, spH / 2 + 0.025, pz); scrn.rotation.y = rotY; roomGroup.add(scrn); registerWall(scrn);
        // Grid lines (horizontal rails every ~200mm)
        const rows = Math.round(spH / 0.22);
        for (let r = 1; r < rows; r++) {
          const ry = r * spH / rows;
          const rail = new THREE.Mesh(new THREE.BoxGeometry(spW - 0.05, 0.022, 0.014), sfwM);
          rail.position.set(px, ry + 0.022, pz); rail.rotation.y = rotY; roomGroup.add(rail);
        }
        // Vertical mullion in center
        const mull = new THREE.Mesh(new THREE.BoxGeometry(0.022, spH - 0.04, 0.014), sfwM);
        mull.position.set(px, spH / 2 + 0.025, pz); mull.rotation.y = rotY; roomGroup.add(mull);
        // Outer frame
        const fr = new THREE.Mesh(new THREE.BoxGeometry(spW, spH, 0.02), sfwM);
        fr.position.set(px, spH / 2 + 0.025, pz); fr.rotation.y = rotY; roomGroup.add(fr); registerWall(fr);
      });
    } else if (o.kind === 'bath_door') {
      // 浴室ドア: frosted glass folding/sliding door with aluminum frame
      const lh = WALL_H - DOOR_H;
      const { m: lmat } = wallMat(ow);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(ow, lh, WALL_T), lmat);
      lintel.position.set(cx, DOOR_H + lh / 2, cz); lintel.rotation.y = rotY;
      lintel.castShadow = true; roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
      const batAlM = new THREE.MeshStandardMaterial({ color: 0xb0bcc4, roughness: 0.28, metalness: 0.72, transparent: true, opacity: 1.0 });
      const frostM = new THREE.MeshStandardMaterial({ color: 0xe8f0f4, roughness: 0.08, metalness: 0.05, transparent: true, opacity: 0.52, side: THREE.DoubleSide });
      // Side posts
      [o.s0, o.s1].forEach(sp => {
        const [px, pz] = ptAt(sp);
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.042, DOOR_H, ft), batAlM);
        post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; post.castShadow = true; roomGroup.add(post); registerWall(post);
      });
      const bathTop = new THREE.Mesh(new THREE.BoxGeometry(ow, 0.042, ft), batAlM);
      bathTop.position.set(cx, DOOR_H - 0.021, cz); bathTop.rotation.y = rotY; roomGroup.add(bathTop); registerWall(bathTop);
      // Frosted glass panel (closed — spans the full opening)
      const bgW = ow - 0.04, bgH = DOOR_H - 0.06;
      const [bgx, bgz] = ptAt((o.s0 + o.s1) / 2);
      const bglass = new THREE.Mesh(new THREE.BoxGeometry(bgW, bgH, 0.028), frostM);
      bglass.position.set(bgx, bgH / 2 + 0.025, bgz); bglass.rotation.y = rotY; roomGroup.add(bglass); registerWall(bglass);
      // Aluminum rail on glass top/bottom
      [[bgH + 0.025, 0.03], [0.01, 0.025]].forEach(([yOff, rh]) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(bgW, rh, 0.035), batAlM);
        rail.position.set(bgx, yOff, bgz); rail.rotation.y = rotY; roomGroup.add(rail);
      });
      // Handle (near the leading edge)
      const [bhx, bhz] = ptAt(o.s1 - 0.08);
      const bhdl = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.14, 0.042), batAlM);
      bhdl.position.set(bhx, bgH * 0.5, bhz); bhdl.rotation.y = rotY; roomGroup.add(bhdl);
    } else if (o.kind === 'toilet_door') {
      // トイレドア: narrow solid door with occupied/vacant indicator
      const lh = WALL_H - DOOR_H;
      const { m: lmat } = wallMat(ow);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(ow, lh, WALL_T), lmat);
      lintel.position.set(cx, DOOR_H + lh / 2, cz); lintel.rotation.y = rotY;
      lintel.castShadow = true; lintel.receiveShadow = true; roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
      const tfM = new THREE.MeshStandardMaterial({ color: 0x9c7b4f, roughness: 0.6, metalness: 0.0, transparent: true, opacity: 1.0 });
      // Frame
      [o.s0, o.s1].forEach(sp => {
        const [px, pz] = ptAt(sp);
        const post = new THREE.Mesh(new THREE.BoxGeometry(fw, DOOR_H, ft), tfM);
        post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; post.castShadow = true; roomGroup.add(post); registerWall(post);
      });
      const ttop = new THREE.Mesh(new THREE.BoxGeometry(ow + fw, fw, ft), tfM);
      ttop.position.set(cx, DOOR_H - fw / 2, cz); ttop.rotation.y = rotY; ttop.castShadow = true; roomGroup.add(ttop); registerWall(ttop);
      // Slab (solid, narrow)
      const tslabW = ow - fw, tslabH = DOOR_H - fw;
      const tdoorM = new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.55, metalness: 0.05, transparent: true, opacity: 1.0 });
      const tslab = new THREE.Mesh(new THREE.BoxGeometry(tslabW, tslabH, 0.04), tdoorM);
      const tpivot = new THREE.Group();
      const [thx, thz] = ptAt(o.s0 + fw / 2);
      tpivot.position.set(thx, tslabH / 2, thz);
      tslab.position.set(tslabW / 2, 0, 0.06); tslab.castShadow = true; tpivot.add(tslab);
      // Occupied/vacant indicator strip
      const indicM = new THREE.MeshStandardMaterial({ color: 0x22bb44, roughness: 0.4, metalness: 0.1, emissive: new THREE.Color(0x116622), emissiveIntensity: 0.5, transparent: true, opacity: 1.0 });
      const indic = new THREE.Mesh(new THREE.BoxGeometry(tslabW * 0.55, 0.06, 0.045), indicM);
      indic.position.set(tslabW * 0.5, tslabH * 0.88, 0.06); tpivot.add(indic);
      tpivot.rotation.y = rotY; roomGroup.add(tpivot); registerWall(tslab);
      const tfn = new THREE.Vector3(cx, 0, cz); if (tfn.length() < 0.35) tfn.set(0, 0, 0); else tfn.normalize();
      tslab.userData.fadeNormal = tfn;
    } else {
      // Standard door
      const lh = WALL_H - DOOR_H;
      const { m: lmat } = wallMat(ow);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(ow, lh, WALL_T), lmat);
      lintel.position.set(cx, DOOR_H + lh / 2, cz); lintel.rotation.y = rotY;
      lintel.castShadow = true; lintel.receiveShadow = true; lintel.userData.isMainWall = true;
      roomGroup.add(lintel); registerWall(lintel); paintableWalls.push(lintel);
      [o.s0, o.s1].forEach(sp => {
        const [px, pz] = ptAt(sp); const post = new THREE.Mesh(new THREE.BoxGeometry(fw, DOOR_H, ft), frameMat());
        post.position.set(px, DOOR_H / 2, pz); post.rotation.y = rotY; post.castShadow = true; roomGroup.add(post); registerWall(post);
      });
      const top = new THREE.Mesh(new THREE.BoxGeometry(ow + fw, fw, ft), frameMat());
      top.position.set(cx, DOOR_H - fw / 2, cz); top.rotation.y = rotY; top.castShadow = true; roomGroup.add(top); registerWall(top);
      // Door slab ajar
      const slabW = ow - fw, slabH = DOOR_H - fw;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, slabH, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xb9925e, roughness: 0.55, metalness: 0.05, transparent: true, opacity: 1.0 }));
      const pivot = new THREE.Group();
      const [hx, hz] = ptAt(o.s0 + fw / 2);
      pivot.position.set(hx, slabH / 2, hz); pivot.rotation.y = rotY;
      slab.position.set(slabW / 2, 0, 0.06);
      slab.castShadow = true; pivot.add(slab); pivot.rotation.y = rotY;
      roomGroup.add(pivot); registerWall(slab);
      const fn = new THREE.Vector3(cx, 0, cz); if (fn.length() < 0.35) fn.set(0, 0, 0); else fn.normalize();
      slab.userData.fadeNormal = fn;
    }
  });
  if (wall.isPartition) {
    for (let i = prevWallCount; i < wallMeshes.length; i++) {
      wallMeshes[i].userData.isPartition = true;
    }
  }
}

function applyShadowSetting() {
  renderer.shadowMap.enabled = showShadows;
  scene.traverse(c => { if (c.isMesh && !c.userData.isFloor) c.castShadow = showShadows ? c.castShadow : false; });
  roomGroup.traverse(c => { if (c.isMesh) c.receiveShadow = showShadows; });
  placedItems.forEach(it => it.group.traverse(c => { if (c.isMesh) { c.castShadow = showShadows; c.receiveShadow = showShadows; } }));
}


function snapToGrid(p) { return new THREE.Vector3(Math.round(p.x/GRID_SNAP)*GRID_SNAP, 0, Math.round(p.z/GRID_SNAP)*GRID_SNAP); }
function getFloorPoint(e) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX-rect.left)/rect.width)*2-1; mouse.y = -((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const t = new THREE.Vector3(); raycaster.ray.intersectPlane(floorPlane, t); return t;
}
function getHitFurniture(e) {
  const rect = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX-rect.left)/rect.width)*2-1; mouse.y = -((e.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(mouse, camera);
  const meshes = []; placedItems.forEach(it => it.group.traverse(c => { if (c.isMesh) meshes.push(c); }));
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  let grp = hits[0].object; while (grp.parent && !grp.userData.isPlacedItem) grp = grp.parent;
  return grp.userData.isPlacedItem ? grp : null;
}
function clampToRoom(pos, def) {
  const hw = roomW/2, hd = roomD/2, hw2 = (def.w||1)/2, hd2 = (def.d||1)/2;
  return new THREE.Vector3(clamp(pos.x, -hw+hw2, hw-hw2), 0, clamp(pos.z, -hd+hd2, hd-hd2));
}

// Snap a wall-mount item (TV, whiteboard, panel...) flat against the nearest
// wall segment, oriented so its front (+z) faces into the room. Returns
// { pos: Vector3, rotY: degrees } or null when no wall is within reach.
function snapToWall(point, def, maxDist = 1.6) {
  if (!roomPlan || !roomPlan.walls) return null;
  let best = null;
  roomPlan.walls.forEach(wall => {
    if (wall.type === 'glass' || wall.type === 'door') return; // can't mount on glass/door spans
    const dx = wall.x2 - wall.x1, dz = wall.z2 - wall.z1;
    const len = Math.hypot(dx, dz); if (len < 0.3) return;
    const ux = dx / len, uz = dz / len;
    // project point onto the segment
    let t = ((point.x - wall.x1) * ux + (point.z - wall.z1) * uz);
    const halfItem = (def.w || 1) / 2;
    t = clamp(t, halfItem, len - halfItem);
    if (t < 0 || t > len) return;
    const px = wall.x1 + ux * t, pz = wall.z1 + uz * t;
    const dist = Math.hypot(point.x - px, point.z - pz);
    if (dist > maxDist) return;
    if (!best || dist < best.dist) best = { dist, px, pz, ux, uz, wall };
  });
  if (!best) return null;
  // wall normal pointing toward the side the cursor is on
  let nx = best.uz, nz = -best.ux;
  if ((point.x - best.px) * nx + (point.z - best.pz) * nz < 0) { nx = -nx; nz = -nz; }
  const off = WALL_T / 2 + (def.d || 0.1) / 2 + 0.005;
  const pos = new THREE.Vector3(best.px + nx * off, 0, best.pz + nz * off);
  const rotY = Math.atan2(nx, nz) * 180 / Math.PI;
  return { pos, rotY };
}

// For stackable items: cast a ray straight down at (x,z) and return the top
// surface Y of whatever furniture is below, so the item rests on it instead of
// clipping through. Returns 0 (floor) when nothing supports it.
const _downRay = new THREE.Raycaster();
const _downOrigin = new THREE.Vector3();
const _downDir = new THREE.Vector3(0, -1, 0);
function computeRestY(x, z, excludeGroup) {
  _downOrigin.set(x, 60, z); _downRay.set(_downOrigin, _downDir);
  const meshes = [];
  placedItems.forEach(it => { if (it.group !== excludeGroup) it.group.traverse(c => { if (c.isMesh) meshes.push(c); }); });
  if (!meshes.length) return 0;
  const hits = _downRay.intersectObjects(meshes, false);
  // hits are sorted nearest-first; from far above, the first hit is the highest surface
  return hits.length ? Math.max(0, hits[0].point.y) : 0;
}

function placeFurniture(def, position, rotY, color, record = true) {
  const group = def.build({ color, w: def.w, d: def.d, h: def.h });
  group.position.copy(position); group.rotation.y = (rotY*Math.PI)/180;
  group.userData.isPlacedItem = true; group.userData.defId = def.id;
  group.traverse(c => { if (c.isMesh) { c.castShadow = showShadows; c.receiveShadow = showShadows; } });
  scene.add(group);
  group.updateMatrixWorld(true); // ensure world matrix is current so subsequent stack raycasts (computeRestY) hit this item
  const item = { group, defId: def.id, position: position.clone(), rotY, color };
  placedItems.push(item); updateItemCount();
  setupItemInteractor(item);
  if (record) pushHistory({ type: 'place', item });
  return item;
}
function removeFurniture(group, record = true) {
  const idx = placedItems.findIndex(i => i.group === group); if (idx < 0) return;
  const [removed] = placedItems.splice(idx, 1); scene.remove(group);
  if (record) pushHistory({ type: 'remove', item: removed });
  updateItemCount();
}

// ============================================================ HISTORY
function pushHistory(a) { history = history.slice(0, historyIndex+1); history.push(a); historyIndex++; updateHistoryButtons(); scheduleAutoSave(); }
function undo() {
  if (historyIndex < 0) return; const a = history[historyIndex--];
  if (a.type === 'place') { deselect(); removeFurniture(a.item.group, false); }
  else if (a.type === 'remove') { const def = FURNITURE_DEFS.find(d=>d.id===a.item.defId); a.item.group = placeFurniture(def, a.item.position, a.item.rotY, a.item.color, false).group; }
  else if (a.type === 'move') { a.item.group.position.copy(a.from); a.item.position.copy(a.from); }
  else if (a.type === 'rotate') { a.item.group.rotation.y = (a.fromRot*Math.PI)/180; a.item.rotY = a.fromRot; }
  if (selectedGroup === a.item?.group) refreshSelection();
  updateHistoryButtons();
}
function redo() {
  if (historyIndex >= history.length-1) return; historyIndex++; const a = history[historyIndex];
  const def = a.item ? FURNITURE_DEFS.find(d=>d.id===a.item.defId) : null;
  if (a.type === 'place') { a.item.group = placeFurniture(def, a.item.position, a.item.rotY, a.item.color, false).group; }
  else if (a.type === 'remove') { deselect(); removeFurniture(a.item.group, false); }
  else if (a.type === 'move') { a.item.group.position.copy(a.to); a.item.position.copy(a.to); }
  else if (a.type === 'rotate') { a.item.group.rotation.y = (a.toRot*Math.PI)/180; a.item.rotY = a.toRot; }
  updateHistoryButtons();
}
function updateHistoryButtons() {
  document.getElementById('btn-undo').disabled = historyIndex < 0;
  document.getElementById('btn-redo').disabled = historyIndex >= history.length-1;
}

// ============================================================ SELECTION
function select(group) {
  if (selectedGroup === group) return; deselect(); selectedGroup = group;
  group.traverse(c => { if (c.isMesh && c.material) { c.material = c.material.clone(); if (c.material.emissive) { c.material.emissive = new THREE.Color(0x1c3a22); c.material.emissiveIntensity = 0.5; } } });
  const item = placedItems.find(i => i.group === group); if (!item) return;
  selectedColor = item.color; selectedRot = item.rotY;
  updateSelectionRing(group); showProperties(group, item);
}
function deselect() {
  if (!selectedGroup) return;
  selectedGroup.traverse(c => { if (c.isMesh && c.material && c.material.emissive) { c.material.emissive.set(0x000000); c.material.emissiveIntensity = 0; } });
  selectedGroup = null; selectionRing.visible = false;
  document.getElementById('props-empty').style.display = 'flex';
  document.getElementById('props-panel').classList.remove('visible');
  const sc = document.getElementById('props-shortcuts'); if (sc) sc.style.display = '';
}
function refreshSelection() { if (selectedGroup) updateSelectionRing(selectedGroup); }
function updateSelectionRing(group) {
  const b = new THREE.Box3().setFromObject(group); const sz = new THREE.Vector3(); b.getSize(sz);
  const r = Math.max(sz.x, sz.z)*0.62;
  selectionRing.geometry.dispose(); selectionRing.geometry = new THREE.TorusGeometry(r, 0.025, 10, 64);
  selectionRing.position.set(group.position.x, 0.03, group.position.z); selectionRing.visible = true;
}
function showProperties(group, item) {
  const def = FURNITURE_DEFS.find(d => d.id === item.defId);
  document.getElementById('props-empty').style.display = 'none';
  document.getElementById('props-panel').classList.add('visible');
  const sc = document.getElementById('props-shortcuts'); if (sc) sc.style.display = 'none';
  document.getElementById('props-name').textContent = def.name;
  document.getElementById('props-dims').textContent = `${def.w}m × ${def.d}m`;
  document.getElementById('props-icon').innerHTML = `<i class="fa-solid ${def.icon}"></i>`;
  document.getElementById('pos-x').textContent = item.position.x.toFixed(1) + 'm';
  document.getElementById('pos-z').textContent = item.position.z.toFixed(1) + 'm';
  const sw = document.getElementById('color-swatches'); sw.innerHTML = '';
  COLORS.forEach(c => {
    const b = document.createElement('button'); b.className = 'color-swatch' + (c === item.color ? ' active' : '');
    b.style.background = c; b.title = c;
    b.addEventListener('click', () => {
      selectedColor = c; applyColor(selectedGroup, c); scheduleAutoSave();
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active')); b.classList.add('active');
      const pi = placedItems.find(i => i.group === selectedGroup); if (pi) pi.color = c;
    });
    sw.appendChild(b);
  });
}
function applyColor(group, color) {
  if (!group) return;
  group.traverse(c => { if (c.isMesh && c.userData.colorable && c.material) { c.material = c.material.clone(); c.material.color.set(color); if (c.material.emissive) { c.material.emissive = new THREE.Color(0x1c3a22); c.material.emissiveIntensity = 0.5; } } });
}

// ============================================================ GHOST
function exitPaintMode() {
  if (!paintMode) return;
  paintMode = false; paintDragging = false;
  document.getElementById('btn-floor-paint').classList.remove('active');
  if (state === 'PAINTING') state = 'IDLE';
}
function startPlacement(def) {
  exitPaintMode();
  cancelPlacement(); state = 'PLACING'; currentDef = def; ghostRotOffset = 0;
  const tmp = def.build({ color: '#62a86d', w: def.w, d: def.d, h: def.h });
  ghostGroup = makeGhost(tmp); ghostGroup.visible = false; scene.add(ghostGroup);
  document.getElementById('placement-hint').classList.add('visible');
  document.querySelectorAll('.furniture-item').forEach(el => el.classList.toggle('active-place', el.dataset.id === def.id));
  setStatus('配置モード: ' + def.name, 'busy');
}
function cancelPlacement() {
  if (ghostGroup) { scene.remove(ghostGroup); ghostGroup = null; }
  document.getElementById('placement-hint').classList.remove('visible');
  document.querySelectorAll('.furniture-item').forEach(el => el.classList.remove('active-place'));
  if (state === 'PLACING') { state = 'IDLE'; setStatus('準備完了'); }
  currentDef = null;
}

// ============================================================ STATUS / TOAST
function setStatus(t, type='idle') { document.getElementById('status-text').textContent = t; document.getElementById('status-dot').className = 'status-dot' + (type==='busy'?' busy':''); }
function updateItemCount() { document.getElementById('item-count').textContent = placedItems.length; }
let toastTimer = null;
function toast(msg) {
  const el = document.getElementById('toast'); document.getElementById('toast-text').textContent = msg;
  el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ============================================================ ROOM SIZE
function updateRoomSize(w, d, keepPartitions = false) {
  roomW = w; roomD = d;
  if (!keepPartitions) { partitions = []; extWallOpenings = null; }
  // Regenerate the plan as a rectangle (preserves the slider / preset / reset-to-rect flow).
  roomPlan = rectToPlan(w, d, keepPartitions ? partitions : [], floorType, extWallOpenings);
  document.getElementById('room-size-display').textContent = `${w}m × ${d}m`;
  // Update editor panel controls (elements live in the editor modal)
  const rwv = document.getElementById('room-w-val'); if (rwv) rwv.textContent = w + 'm';
  const rdv = document.getElementById('room-d-val'); if (rdv) rdv.textContent = d + 'm';
  const rws = document.getElementById('room-w'); if (rws) rws.value = w;
  const rds = document.getElementById('room-d'); if (rds) rds.value = d;
  const disp = document.getElementById('ed-room-display'); if (disp) disp.textContent = `${w}m × ${d}m`;
  buildRoom();
}

// ============================================================ SERIALIZE
function saveLayout() {
  // v5: plan with corner-indexed cells and typed openings
  const cells = [];
  roomPlan.cells.forEach((type, key) => { const [ix, iz] = key.split(',').map(Number); cells.push([ix, iz, type]); });
  const walls = roomPlan.walls.map(w => ({
    x1: w.x1, z1: w.z1, x2: w.x2, z2: w.z2,
    type: w.type || 'wall',
    openings: (w.openings || (w.doors || []).map(d => ({ t: d.t, w: d.w, kind: 'door' })))
  }));
  const data = { version: 5, room: { w: roomW, d: roomD }, partitions, floorType, wallType,
    plan: { cells, walls },
    items: placedItems.map(i => ({ defId: i.defId, x: i.position.x, y: i.position.y, z: i.position.z, rotY: i.rotY, color: i.color })) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'room-layout.json'; a.click(); URL.revokeObjectURL(url);
  toast('レイアウトを保存しました');
}
function clearItems() { placedItems.forEach(i => scene.remove(i.group)); placedItems = []; deselect(); history = []; historyIndex = -1; updateHistoryButtons(); updateItemCount(); }
function applyLayout(layout) {
  clearItems();
  partitions = layout.partitions ? JSON.parse(JSON.stringify(layout.partitions)) : [];
  extWallOpenings = layout.walls ? JSON.parse(JSON.stringify(layout.walls)) : null;
  if (layout.floorType && FLOOR_TYPES[layout.floorType]) floorType = layout.floorType;
  if (layout.wallType && WALL_TYPES[layout.wallType]) wallType = layout.wallType;
  updateRoomSize(layout.room.w, layout.room.d, true); // builds a rectangular plan
  // sync the toolbar selects
  const ws = document.getElementById('wall-type-select'); if (ws) ws.value = wallType;
  const fs = document.getElementById('floor-type-select'); if (fs) fs.value = floorType;
  if (layout.plan) {
    // v4: explicit plan replaces the rectangle.
    const cells = new Map();
    (layout.plan.cells || []).forEach(([ix, iz, type]) => cells.set(cellKey(ix, iz), type));
    roomPlan = { cells, walls: (layout.plan.walls || []).map(w => ({
      x1: w.x1, z1: w.z1, x2: w.x2, z2: w.z2,
      type: w.type || 'wall',
      openings: w.openings ? w.openings.map(o => ({ t: o.t, w: o.w, kind: o.kind || 'door', hinge: o.hinge || 0, swing: o.swing == null ? 1 : o.swing }))
                           : (w.doors || []).map(d => ({ t: d.t, w: d.w, kind: 'door', hinge: 0, swing: 1 }))
    })) };
    buildRoom();
  } else if (layout.patches) {
    // v3: paint patches onto the existing (rectangular) cells, converting old coords to indices.
    layout.patches.forEach(p => {
      const cx = -layout.room.w / 2 + (p.ix + 0.5) * CELL;
      const cz = -layout.room.d / 2 + (p.iz + 0.5) * CELL;
      const ix = Math.round(cx / CELL), iz = Math.round(cz / CELL);
      const key = cellKey(ix, iz);
      if (roomPlan.cells.has(key)) roomPlan.cells.set(key, p.type);
    });
    buildFloorMeshes();
  }
  (layout.items || []).forEach(it => {
    const def = FURNITURE_DEFS.find(d => d.id === it.defId); if (!def) return;
    // Auto-rest stackable items (TV/plant) on whatever was placed earlier in the list
    const y = (it.y != null) ? it.y : (def.stack ? computeRestY(it.x, it.z, null) : 0);
    const item = placeFurniture(def, new THREE.Vector3(it.x, y, it.z), it.rotY, it.color ?? COLORS[def.colorIdx], false);
    item.position.y = y;
  });
  // Optional per-area floor materials (axis-aligned rects in world meters)
  (layout.floors || []).forEach(f => {
    if (!FLOOR_TYPES[f.type]) return;
    const x1 = Math.min(f.x1, f.x2), x2 = Math.max(f.x1, f.x2);
    const z1 = Math.min(f.z1, f.z2), z2 = Math.max(f.z1, f.z2);
    for (let cx = x1 + CELL/2; cx < x2; cx += CELL)
      for (let cz = z1 + CELL/2; cz < z2; cz += CELL)
        paintFloorAt(cx, cz, f.type);
  });
  scheduleAutoSave();
}
function loadLayout(json) { try { applyLayout(JSON.parse(json)); toast('レイアウトを読み込みました'); } catch (e) { toast('読み込みに失敗しました'); } }
function takeScreenshot() { renderer.render(scene, camera); const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'room-planner.png'; a.click(); toast('スクリーンショットを保存しました'); }

// Floor swatch colors for plan preview
const PLAN_FLOOR_COLOR = {
  wood:'#d4aa70', parquet:'#b8904a', dark_wood:'#5a3820', concrete:'#b0b8bc',
  tile:'#d8e0e8', marble:'#f0eee8', carpet:'#c8bcd8', tatami:'#c8be80',
  genkan:'#c8c0b0', terracotta:'#c87840', stone:'#a8a4a0',
  rubber:'#404040', checker_plate:'#909898', epoxy:'#4a8850',
  dirt:'#907050', grass:'#60904a', lawn:'#70a054',
};
function presetPlanSVG(p) {
  const svgW = 130, svgH = 104;
  const rw = p.room.w, rd = p.room.d;
  const pad = 10;
  const scale = Math.min((svgW - pad*2) / rw, (svgH - pad*2) / rd);
  const ox = svgW/2, oy = svgH/2;
  const wx = v => ox + v * scale, wz = v => oy + v * scale;
  const x0 = ox - rw/2*scale, y0 = oy - rd/2*scale;
  const rW = rw*scale, rH = rd*scale;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
  // Room fill
  const mainFloor = PLAN_FLOOR_COLOR[p.floorType] || '#d4c8b4';
  s += `<rect x="${x0}" y="${y0}" width="${rW}" height="${rH}" fill="${mainFloor}" opacity="0.7"/>`;
  // Zone floors
  (p.floors || []).forEach(f => {
    const c = PLAN_FLOOR_COLOR[f.type] || '#c8c0b0';
    const fx0=wx(Math.min(f.x1,f.x2)), fx1=wx(Math.max(f.x1,f.x2));
    const fz0=wz(Math.min(f.z1,f.z2)), fz1=wz(Math.max(f.z1,f.z2));
    s += `<rect x="${fx0}" y="${fz0}" width="${fx1-fx0}" height="${fz1-fz0}" fill="${c}" opacity="0.85"/>`;
  });
  // Room outline
  s += `<rect x="${x0}" y="${y0}" width="${rW}" height="${rH}" fill="none" stroke="#5a5040" stroke-width="2.5"/>`;
  // Partitions
  (p.partitions || []).forEach(part => {
    const px1=wx(part.x1), pz1=wz(part.z1), px2=wx(part.x2), pz2=wz(part.z2);
    if (part.openings && part.openings.length) {
      // Draw wall in segments around openings
      const len = Math.hypot(part.x2-part.x1, part.z2-part.z1);
      part.openings.forEach(op => {
        const t0 = op.t - op.w/2/len, t1 = op.t + op.w/2/len;
        const ax0=px1+(px2-px1)*Math.max(t0,0), az0=pz1+(pz2-pz1)*Math.max(t0,0);
        const ax1=px1+(px2-px1)*Math.min(t1,1), az1=pz1+(pz2-pz1)*Math.min(t1,1);
        if (t0 > 0) s += `<line x1="${px1}" y1="${pz1}" x2="${ax0}" y2="${az0}" stroke="#5a5040" stroke-width="2" stroke-linecap="round"/>`;
        if (t1 < 1) s += `<line x1="${ax1}" y1="${az1}" x2="${px2}" y2="${pz2}" stroke="#5a5040" stroke-width="2" stroke-linecap="round"/>`;
        // Door arc symbol
        const mx=(ax0+ax1)/2, mz=(az0+az1)/2;
        const dw = op.w * scale * 0.5;
        s += `<line x1="${ax0}" y1="${az0}" x2="${ax1}" y2="${az1}" stroke="#98c8a8" stroke-width="2.5" stroke-linecap="round"/>`;
        s += `<circle cx="${mx}" cy="${mz}" r="3" fill="#62a86d" opacity="0.9"/>`;
      });
    } else {
      s += `<line x1="${px1}" y1="${pz1}" x2="${px2}" y2="${pz2}" stroke="#5a5040" stroke-width="2" stroke-linecap="round"/>`;
    }
  });
  // Room size label
  s += `<text x="${svgW/2}" y="${svgH - 3}" text-anchor="middle" font-size="8" fill="#888" font-family="sans-serif">${rw}m × ${rd}m</text>`;
  s += `</svg>`;
  return s;
}

let _presetActiveCat = 'all';
let _presetSearch = '';
let _lastUsedPresetId = null;

const FLOOR_NAME_JA = {
  wood:'木材', parquet:'ヘリンボーン', dark_wood:'ダーク木材', concrete:'コンクリート',
  tile:'タイル', marble:'大理石', carpet:'カーペット', tatami:'畳', genkan:'玄関石',
  rubber:'ゴムマット', checker_plate:'縞鋼板', epoxy:'エポキシ', terracotta:'テラコッタ',
  stone:'石畳', dirt:'土間', grass:'芝', lawn:'芝生'
};
const FEATURED_PRESETS = new Set(['aluminum_factory', 'family', 'factory_lg', 'office', 'laboratory']);

function renderPresetGrid() {
  // Update category count badges on filter buttons
  document.querySelectorAll('.pc-cat-btn[data-pcat]').forEach(btn => {
    const pcat = btn.dataset.pcat;
    const cnt = pcat === 'all' ? PRESETS.length : PRESETS.filter(p => p.cat === pcat).length;
    let badge = btn.querySelector('.pc-cat-count');
    if (!badge) { badge = document.createElement('span'); badge.className = 'pc-cat-count'; btn.appendChild(badge); }
    badge.textContent = cnt;
  });
  const grid = document.getElementById('preset-grid'); grid.innerHTML = '';
  const q = _presetSearch.toLowerCase();
  const filtered = PRESETS.filter(p =>
    (_presetActiveCat === 'all' || p.cat === _presetActiveCat) &&
    (!q || p.name.includes(q) || (p.desc||'').includes(q))
  );
  if (filtered.length === 0) {
    const empty = document.createElement('div'); empty.className = 'preset-empty';
    empty.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i>該当するプリセットが見つかりません';
    grid.appendChild(empty); return;
  }
  filtered.forEach((p, idx) => {
    const card = document.createElement('button');
    card.className = 'pc-card' + (p.id === _lastUsedPresetId ? ' last-used' : '');
    card.style.animationDelay = (idx * 0.04) + 's';
    const tagCls = `pc-tag pc-tag-${p.cat || ''}`;
    const floorBadge = p.floorType
      ? `<span class="pc-badge pc-badge-floor"><i class="fa-solid fa-grip"></i>${FLOOR_NAME_JA[p.floorType] || p.floorType}</span>`
      : '';
    const featuredBadge = FEATURED_PRESETS.has(p.id) ? '<div class="pc-featured-badge">★ おすすめ</div>' : '';
    card.innerHTML = `
      <div class="pc-plan-area">
        ${presetPlanSVG(p)}
        <div class="${tagCls}">${p.cat || ''}</div>
        ${featuredBadge}
      </div>
      <div class="pc-info">
        <div class="pc-name"><i class="fa-solid ${p.icon}" style="margin-right:5px;opacity:0.7"></i>${p.name}</div>
        <div class="pc-desc">${p.desc}</div>
        <div class="pc-badges">
          <span class="pc-badge"><i class="fa-solid fa-ruler-combined"></i>${p.room.w}×${p.room.d}m</span>
          <span class="pc-badge"><i class="fa-solid fa-cube"></i>${p.items.length}点</span>
          ${floorBadge}
          ${p.partitions && p.partitions.length ? `<span class="pc-badge"><i class="fa-solid fa-border-none"></i>間仕切${p.partitions.length}本</span>` : ''}
        </div>
      </div>`;
    card.addEventListener('click', () => {
      _lastUsedPresetId = p.id;
      applyLayout(p); closePresetModal();
      toast(p.name + ' を読み込みました');
    });
    grid.appendChild(card);
  });
}

function buildPresetCards() { renderPresetGrid(); }

function openPresetModal() {
  document.getElementById('preset-modal').classList.add('open');
  renderPresetGrid();
}
function closePresetModal() { document.getElementById('preset-modal').classList.remove('open'); }

// ============================================================ 3D ホバープレビュー (カタログ選択補助)
// カタログ項目にマウスオーバーすると、その家具の3Dモデルを小窓でくるくる表示する。
const ghostPreview = (() => {
  let rdr = null, scn, cam, pivot, modelGroup = null, el, nameEl, curId = null, raf = 0, showT = 0, failed = false, spin = 0;
  function ensure() {
    if (rdr || failed) return rdr;
    el = document.getElementById('ghost-preview');
    if (!el) { failed = true; return null; }
    const cvs = el.querySelector('canvas');
    nameEl = el.querySelector('.gp-name');
    try { rdr = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true }); }
    catch (e) { failed = true; return null; }
    rdr.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rdr.setSize(188, 188, false);
    rdr.outputColorSpace = THREE.SRGBColorSpace;
    rdr.toneMapping = THREE.ACESFilmicToneMapping; rdr.toneMappingExposure = 1.05;
    scn = new THREE.Scene();
    scn.environment = scene.environment;   // メインシーンのIBLを流用して素材を綺麗に
    scn.add(new THREE.AmbientLight(0xffffff, 0.5));
    scn.add(new THREE.HemisphereLight(0xfff4e0, 0xc8b89a, 0.5));
    const key = new THREE.DirectionalLight(0xfff2dd, 1.05); key.position.set(3, 5, 4); scn.add(key);
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.35); fill.position.set(-4, 2, -3); scn.add(fill);
    cam = new THREE.PerspectiveCamera(34, 1, 0.03, 100);
    pivot = new THREE.Group(); scn.add(pivot);
    window.addEventListener('scroll', hide, true);   // スクロールで追従ずれしないよう一旦隠す
    return rdr;
  }
  function clearModel() {
    if (!modelGroup) return;
    pivot.remove(modelGroup);
    modelGroup.traverse(o => { if (o.isMesh && o.geometry) o.geometry.dispose(); if (o.isLight && o.dispose) o.dispose(); });
    modelGroup = null;
  }
  function buildFor(def) {
    clearModel();
    let m;
    try { m = def.build({ color: COLORS[def.colorIdx], w: def.w, d: def.d, h: def.h }); }
    catch (e) { return false; }
    const bbox = new THREE.Box3().setFromObject(m);
    if (!isFinite(bbox.min.x) || !isFinite(bbox.max.x)) return false;
    const center = bbox.getCenter(new THREE.Vector3()), size = bbox.getSize(new THREE.Vector3());
    m.position.set(-center.x, -center.y, -center.z);   // bbox中心を原点へ
    pivot.add(m); modelGroup = m;
    const maxDim = Math.max(size.x, size.y, size.z, 0.3), dist = maxDim * 1.85 + 0.35;
    cam.position.set(dist * 0.72, dist * 0.6, dist * 0.92); cam.lookAt(0, 0, 0);
    return true;
  }
  function position(anchorEl) {
    const r = anchorEl.getBoundingClientRect(), S = 188;
    let left = r.right + 12, top = r.top + r.height / 2 - S / 2;
    if (left + S > window.innerWidth - 6) left = r.left - S - 12;
    left = Math.max(6, left);
    top = Math.max(6, Math.min(top, window.innerHeight - S - 6));
    el.style.left = left + 'px'; el.style.top = top + 'px';
  }
  function loop() {
    if (!el || el.style.display === 'none') { raf = 0; return; }
    raf = requestAnimationFrame(loop);
    spin += 0.014; pivot.rotation.set(0.12, spin, 0);
    rdr.render(scn, cam);
  }
  function hide() {
    clearTimeout(showT);
    if (el) el.style.display = 'none';
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function show(def, anchorEl) {
    if (!ensure()) return;
    clearTimeout(showT);
    showT = setTimeout(() => {
      if (curId !== def.id) { if (!buildFor(def)) { hide(); return; } curId = def.id; spin = -0.55; }
      if (nameEl) nameEl.textContent = `${def.name}  ${def.w}×${def.d}×${def.h}m`;
      position(anchorEl);
      el.style.display = 'block';
      if (!raf) loop();
    }, 55);
  }
  return { show, hide };
})();

// ============================================================ CATALOG UI
function buildCatalog(filter = '', cat = 'all') {
  const list = document.getElementById('furniture-list'); list.innerHTML = '';
  // Update count badges on tabs
  document.querySelectorAll('.cat-tab[data-cat]').forEach(tab => {
    const tc = tab.dataset.cat;
    const count = FURNITURE_DEFS.filter(d => tc==='all' || d.cat===tc).length;
    let badge = tab.querySelector('.cat-count');
    if (!badge) { badge = document.createElement('span'); badge.className = 'cat-count'; tab.appendChild(badge); }
    badge.textContent = count;
  });
  const filtered = FURNITURE_DEFS.filter(d => (cat==='all'||d.cat===cat) && (filter===''||d.name.includes(filter)));
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:32px 16px;color:var(--text-inv-muted);font-size:12px;';
    empty.innerHTML = '<i class="fa-solid fa-magnifying-glass" style="font-size:24px;opacity:0.4;display:block;margin-bottom:8px"></i>該当する家具が見つかりません';
    list.appendChild(empty); return;
  }
  filtered.forEach(def => {
    const item = document.createElement('div'); item.className = 'furniture-item'; item.dataset.id = def.id;
    item.innerHTML = `<div class="fitem-icon"><i class="fa-solid ${def.icon}"></i></div>
      <div class="fitem-info"><div class="fitem-name">${def.name}</div><div class="fitem-size">${def.w}m × ${def.d}m</div></div>`;
    item.addEventListener('mouseenter', () => ghostPreview.show(def, item));
    item.addEventListener('mouseleave', () => ghostPreview.hide());
    item.addEventListener('click', () => { ghostPreview.hide(); if (state==='PLACING' && currentDef===def) { cancelPlacement(); return; } deselect(); startPlacement(def); });
    list.appendChild(item);
  });
}

// ============================================================ ROTATE HELPER
function rotateSelected(delta) {
  if (!selectedGroup) return;
  const item = placedItems.find(i => i.group === selectedGroup);
  if (!item) return;
  const newRot = ((item.rotY + delta) % 360 + 360) % 360;
  pushHistory({ type: 'rotate', item, fromRot: item.rotY, toRot: newRot });
  item.rotY = newRot;
  selectedGroup.rotation.y = (item.rotY * Math.PI) / 180;
  refreshSelection();
}

// ============================================================ UI INIT
function initUI() {
  buildCatalog(); buildPresetCards();
  document.getElementById('cat-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.cat-tab'); if (!tab) return;
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active');
    buildCatalog(document.getElementById('search-input').value, tab.dataset.cat);
  });
  document.getElementById('search-input').addEventListener('input', e => {
    const active = document.querySelector('.cat-tab.active'); buildCatalog(e.target.value, active?.dataset.cat || 'all');
  });
  // Wall mode segmented
  document.getElementById('wall-seg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; wallMode = b.dataset.mode;
    document.querySelectorAll('#wall-seg button').forEach(x => x.classList.toggle('active', x === b));
  });
  // Wall type select
  const wallSel = document.getElementById('wall-type-select');
  Object.entries(WALL_TYPES).forEach(([key, spec]) => { const o = document.createElement('option'); o.value = key; o.textContent = spec.name; wallSel.appendChild(o); });
  wallSel.value = wallType;
  wallSel.addEventListener('change', () => { wallType = wallSel.value; applyWallType(); });
  // Floor type select — in paint mode it just sets the brush, otherwise it repaints the whole floor
  const floorSel = document.getElementById('floor-type-select');
  Object.entries(FLOOR_TYPES).forEach(([key, spec]) => { const o = document.createElement('option'); o.value = key; o.textContent = spec.name; floorSel.appendChild(o); });
  floorSel.value = floorType;
  floorSel.addEventListener('change', () => {
    floorType = floorSel.value;
    if (paintMode) toast(FLOOR_TYPES[floorType].name + ' で塗ります（左ドラッグ）');
    else updateFloorTexture();
  });
  // Floor paint mode toggle
  document.getElementById('btn-floor-paint').addEventListener('click', function() {
    paintMode = !paintMode;
    this.classList.toggle('active', paintMode);
    if (paintMode) {
      if (state === 'PLACING') cancelPlacement();
      deselect(); state = 'PAINTING';
      setStatus('床ペイント: ' + FLOOR_TYPES[floorType].name + '（左ドラッグで塗る / 右ドラッグで消す）', 'busy');
      toast('床ペイントモード: 床をドラッグして塗ります');
    } else {
      state = 'IDLE'; paintDragging = false; setStatus('準備完了');
    }
  });
  document.getElementById('btn-grid').addEventListener('click', function() { showGrid = !showGrid; this.classList.toggle('active', showGrid); if (gridHelper) gridHelper.visible = showGrid; });
  document.getElementById('btn-topview').addEventListener('click', function() {
    isTopView = !isTopView; this.classList.toggle('active', isTopView);
    if (isTopView) { camera.position.set(0.001, Math.max(roomW, roomD)*1.8, 0.001); controls.maxPolarAngle = Math.PI/2; }
    else { camera.position.copy(DEFAULT_CAM_POS); controls.maxPolarAngle = Math.PI/2.05; }
    controls.target.set(0, 0.4, 0); controls.update();
  });
  document.getElementById('btn-undo').addEventListener('click', undo);
  document.getElementById('btn-redo').addEventListener('click', redo);
  document.getElementById('btn-save').addEventListener('click', saveLayout);
  document.getElementById('btn-load').addEventListener('click', () => document.getElementById('file-input').click());
  document.getElementById('file-input').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => loadLayout(ev.target.result); r.readAsText(f); e.target.value = ''; });
  document.getElementById('btn-screenshot').addEventListener('click', takeScreenshot);
  document.getElementById('btn-clear-saved').addEventListener('click', async () => {
    if (!confirm('保存された自動セーブデータを削除して新規スタートします。よろしいですか？')) return;
    const ok = await idbDelete();
    applyLayout(PRESETS[0]);
    setStatus('保存データを削除しました — 新規スタート');
    toast(ok ? '保存データを削除しました' : '保存データはありませんでした');
  });
  document.getElementById('btn-presets').addEventListener('click', openPresetModal);
  document.getElementById('preset-close').addEventListener('click', closePresetModal);
  document.getElementById('preset-modal').addEventListener('click', e => { if (e.target.id === 'preset-modal') closePresetModal(); });
  document.getElementById('preset-modal').addEventListener('keydown', e => {
    const cards = [...document.querySelectorAll('#preset-grid .pc-card')];
    if (!cards.length) return;
    const idx = cards.indexOf(document.activeElement);
    const cols = document.querySelector('.preset-grid-new').offsetWidth < 520 ? 2 : 3;
    const move = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
    if (move[e.key] !== undefined && idx >= 0) {
      const next = idx + move[e.key];
      if (next >= 0 && next < cards.length) { cards[next].focus(); e.preventDefault(); }
    } else if (e.key === 'Escape') { closePresetModal(); }
  });
  // Preset search
  document.getElementById('preset-search-input').addEventListener('input', e => {
    _presetSearch = e.target.value; renderPresetGrid();
  });
  // Preset category filter
  document.getElementById('preset-cat-bar').addEventListener('click', e => {
    const btn = e.target.closest('.pc-cat-btn'); if (!btn) return;
    _presetActiveCat = btn.dataset.pcat;
    document.querySelectorAll('.pc-cat-btn').forEach(b => b.classList.toggle('active', b === btn));
    renderPresetGrid();
  });
  // New empty room
  document.getElementById('btn-preset-new').addEventListener('click', () => {
    clearItems(); partitions = []; roomPlan = rectToPlan(roomW || 6, roomD || 6, [], floorType);
    buildRoom(); closePresetModal(); toast('新しい空のルームを作成しました');
  });

  // 2D floor-plan editor
  document.getElementById('btn-editor').addEventListener('click', openEditor);
  document.getElementById('editor-close').addEventListener('click', closeEditor);
  document.getElementById('editor-modal').addEventListener('click', e => { if (e.target.id === 'editor-modal') closeEditor(); });
  const edHints = {
    floor: 'クリック/ドラッグで床セルを追加。ブラシの太さで一度に塗る範囲を変更できます',
    erase: 'クリック/ドラッグで床セルを削除（ブラシの太さ対応）',
    unify: 'ドラッグで範囲を選択 → 範囲内の床材のどれかにまとめて統一します',
    wall: '2点をドラッグして壁を追加（Snapあり）。壁タイプは下のメニューで選択',
    door: '壁をクリックで開口を追加。既存の開口をクリックすると開き方を編集できます',
    delwall: '壁をクリックして削除'
  };
  document.querySelectorAll('.ed-tool[data-tool]').forEach(btn => btn.addEventListener('click', () => {
    edTool = btn.dataset.tool;
    document.querySelectorAll('.ed-tool[data-tool]').forEach(b => b.classList.toggle('active', b === btn));
    document.getElementById('editor-hint').textContent = edHints[edTool] || '';
    closeDoorPop(); closeUnifyPop();
  }));
  // brush-size segmented control
  document.querySelectorAll('#ed-brush-seg button').forEach(btn => btn.addEventListener('click', () => {
    edBrush = +btn.dataset.brush;
    document.querySelectorAll('#ed-brush-seg button').forEach(b => b.classList.toggle('active', b === btn));
    drawEditor();
  }));
  const edSel = document.getElementById('editor-floor-select');
  Object.entries(FLOOR_TYPES).forEach(([key, spec]) => { const o = document.createElement('option'); o.value = key; o.textContent = spec.name; edSel.appendChild(o); });
  edSel.value = editorFloorType;
  edSel.addEventListener('change', () => { editorFloorType = edSel.value; });
  // ed-wall-type and ed-opening-kind selects are static HTML — just wire change events
  const edWallTypeSel = document.getElementById('ed-wall-type');
  const edOpeningKindSel = document.getElementById('ed-opening-kind');
  if (edWallTypeSel) edWallTypeSel.addEventListener('change', () => {});
  // 全ての扉種類(シーン設定付き)を開口タイプ選択に展開
  if (edOpeningKindSel) { edOpeningKindSel.innerHTML = openingKindOptionsHTML('door'); edOpeningKindSel.addEventListener('change', () => {}); }
  document.getElementById('editor-clear').addEventListener('click', () => { roomPlan = { cells: new Map(), walls: [] }; syncPlanTo3D(); });
  document.getElementById('editor-rect').addEventListener('click', () => { roomPlan = rectToPlan(roomW || 6, roomD || 6, [], floorType); syncPlanTo3D(); });
  document.getElementById('editor-apply').addEventListener('click', closeEditor);
  // Room size sliders (now live in the editor panel, not the toolbar)
  ['room-w', 'room-d'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      updateRoomSize(parseFloat(document.getElementById('room-w').value), parseFloat(document.getElementById('room-d').value));
      refreshSelection();
    });
  });

  document.getElementById('btn-zoom-in').addEventListener('click', () => { camera.position.sub(controls.target).multiplyScalar(0.85).add(controls.target); controls.update(); });
  document.getElementById('btn-zoom-out').addEventListener('click', () => { camera.position.sub(controls.target).multiplyScalar(1.18).add(controls.target); controls.update(); });
  document.getElementById('btn-reset-cam').addEventListener('click', () => { camera.position.copy(DEFAULT_CAM_POS); controls.target.set(0, 0.4, 0); controls.maxPolarAngle = Math.PI/2.05; controls.update(); isTopView = false; document.getElementById('btn-topview').classList.remove('active'); });

  document.getElementById('btn-rot-ccw').addEventListener('click', () => rotateSelected(-90));
  document.getElementById('btn-rot-cw').addEventListener('click', () => rotateSelected(90));
  document.getElementById('btn-duplicate').addEventListener('click', () => {
    if (!selectedGroup) return; const item = placedItems.find(i => i.group === selectedGroup); if (!item) return;
    const def = FURNITURE_DEFS.find(d => d.id === item.defId);
    const np = item.position.clone().add(new THREE.Vector3(GRID_SNAP, 0, GRID_SNAP)); np.y = 0;
    if (def.stack) np.y = computeRestY(np.x, np.z, null);
    const dup = placeFurniture(def, np, item.rotY, item.color); dup.position.y = np.y;
    toast(def.name + ' を複製しました');
  });
  document.getElementById('btn-delete').addEventListener('click', () => { if (!selectedGroup) return; removeFurniture(selectedGroup); deselect(); toast('削除しました'); });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === 'Escape') { if (state==='PLACING') cancelPlacement(); else if (paintMode) exitPaintMode(); else { deselect(); closePresetModal(); closeEditor(); } }
    if ((e.key==='Delete'||e.key==='Backspace') && selectedGroup && state!=='PLACING') { removeFurniture(selectedGroup); deselect(); }
    if (e.key==='r'||e.key==='R') {
      if (state==='PLACING') { ghostRotOffset = (ghostRotOffset+90)%360; if (ghostGroup) ghostGroup.rotation.y = (ghostRotOffset*Math.PI)/180; }
      else if (selectedGroup) { rotateSelected(90); }
    }
    if ((e.ctrlKey||e.metaKey) && e.key==='z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey||e.metaKey) && (e.key==='y' || (e.shiftKey && e.key==='z'))) { e.preventDefault(); redo(); }
  });
}

// ============================================================ POINTER INTERACTION
let pointerDown = false, grabbed = false, dragStarted = false;
let pointerStart = { x: 0, y: 0 }, dragOffset = new THREE.Vector3(), dragItemStart = null;
let paintDragging = false, paintErasing = false;

canvas.addEventListener('pointerdown', e => {
  if (state === 'PAINTING' && (e.button === 0 || e.button === 2)) {
    // Left = paint with current floor type, right = erase patches
    e.stopImmediatePropagation();
    paintDragging = true; paintErasing = (e.button === 2);
    const pt = getFloorPoint(e);
    if (pt) { if (paintErasing) eraseFloorAt(pt.x, pt.z); else paintFloorAt(pt.x, pt.z, floorType); }
    return;
  }
  if (e.button !== 0) return;
  pointerStart = { x: e.clientX, y: e.clientY }; pointerDown = true; dragStarted = false; grabbed = false;
  if (state === 'PLACING') return; // In placement mode, camera orbit is handled by OrbitControls
  const hit = getHitFurniture(e);
  if (hit) {
    // stopImmediatePropagation blocks OrbitControls (registered after us) from seeing this
    // pointerdown — otherwise OrbitControls would start rotation tracking before we can stop it.
    e.stopImmediatePropagation();
    grabbed = true; select(hit); state = 'SELECTED';
    const pt = getFloorPoint(e); if (pt) { dragItemStart = hit.position.clone(); dragOffset.copy(pt).sub(hit.position); dragOffset.y = 0; }
  }
});
canvas.addEventListener('pointermove', e => {
  if (state === 'PAINTING') {
    if (paintDragging) { const pt = getFloorPoint(e); if (pt) { if (paintErasing) eraseFloorAt(pt.x, pt.z); else paintFloorAt(pt.x, pt.z, floorType); } }
    return;
  }
  if (state === 'PLACING' && ghostGroup) {
    const pt = getFloorPoint(e);
    if (pt) {
      let snap = currentDef.wallMount ? snapToWall(pt, currentDef) : null;
      if (snap) {
        ghostGroup.position.copy(snap.pos);
        ghostGroup.rotation.y = (snap.rotY * Math.PI) / 180;
        ghostPlacement = { pos: snap.pos.clone(), rotY: snap.rotY };
      } else {
        const s = clampToRoom(snapToGrid(pt), currentDef);
        if (currentDef.stack) s.y = computeRestY(s.x, s.z, null);
        ghostGroup.position.copy(s); ghostGroup.rotation.y = (ghostRotOffset*Math.PI)/180;
        ghostPlacement = { pos: s.clone(), rotY: ghostRotOffset };
      }
      ghostGroup.visible = true;
    }
  }
  if (pointerDown && grabbed && selectedGroup) {
    const dx = e.clientX - pointerStart.x, dy = e.clientY - pointerStart.y;
    if (Math.hypot(dx, dy) > 5) dragStarted = true;
    if (dragStarted) {
      const pt = getFloorPoint(e);
      if (pt) {
        const item = placedItems.find(i => i.group === selectedGroup);
        const def = item ? FURNITURE_DEFS.find(d => d.id === item.defId) : null;
        const wallSnap = def && def.wallMount ? snapToWall(pt.clone().sub(dragOffset), def) : null;
        let np;
        if (wallSnap) {
          np = wallSnap.pos;
          selectedGroup.rotation.y = (wallSnap.rotY * Math.PI) / 180;
          if (item) item.rotY = wallSnap.rotY;
        } else {
          np = pt.clone().sub(dragOffset); np.y = 0; if (def) np = clampToRoom(snapToGrid(np), def);
          if (def && def.stack) np.y = computeRestY(np.x, np.z, selectedGroup);
        }
        selectedGroup.position.copy(np); if (item) item.position.copy(np);
        selectionRing.position.set(np.x, 0.03, np.z);
        document.getElementById('pos-x').textContent = np.x.toFixed(1) + 'm';
        document.getElementById('pos-z').textContent = np.z.toFixed(1) + 'm';
      }
    }
  }
});
canvas.addEventListener('pointerup', e => {
  if (state === 'PAINTING') { paintDragging = false; paintErasing = false; return; }
  if (e.button !== 0) { pointerDown = false; return; }
  const isClick = Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) < 6;
  if (grabbed) {
    if (dragStarted && selectedGroup) { const item = placedItems.find(i => i.group === selectedGroup); if (item && dragItemStart && !dragItemStart.equals(item.position)) pushHistory({ type:'move', item, from: dragItemStart, to: item.position.clone() }); }
    // No need to restore controls.enabled — we used stopImmediatePropagation instead,
    // so OrbitControls never started tracking and its state remains clean.
    if (isClick && !dragStarted && selectedGroup) {
      const _ia = placedItems.find(i => i.group === selectedGroup);
      if (_ia) _ia.group.userData.interactor?.toggle();
    }
  }
  if (isClick) {
    if (state === 'PLACING' && currentDef && ghostGroup && ghostGroup.visible) {
      const rot = ghostPlacement ? ghostPlacement.rotY : ghostRotOffset;
      placeFurniture(currentDef, ghostGroup.position.clone(), rot, COLORS[currentDef.colorIdx] || '#c8a06a');
      setStatus('配置モード: ' + currentDef.name + ' (続けて配置できます)', 'busy');
    } else if (state !== 'PLACING' && !grabbed) {
      if (!getHitFurniture(e)) deselect();
    }
  }
  pointerDown = false; grabbed = false; dragStarted = false; dragItemStart = null;
});
canvas.addEventListener('contextmenu', e => { e.preventDefault(); if (state === 'PLACING') cancelPlacement(); });
canvas.addEventListener('pointerleave', () => { paintDragging = false; paintErasing = false; });
canvas.addEventListener('dblclick', e => {
  if (state === 'PLACING' || state === 'PAINTING') return;
  const hit = getHitFurniture(e);
  if (hit) {
    select(hit); state = 'SELECTED';
    rotateSelected(90);
  }
});

// ============================================================ ORBIT CONTROLS
// Created here — AFTER our pointer listeners — so our handlers run first on every
// pointer event. This lets stopImmediatePropagation() block OrbitControls cleanly.
controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minPolarAngle = Math.PI / 10;
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 2.5;
controls.maxDistance = 32;
// 左ドラッグ=視点回転  右ドラッグ=平行移動  ホイール=ズーム
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.target.set(0, 0.4, 0);
controls.update();

// ============================================================ WALL CUTAWAY
function updateWalls() {
  camDirH.set(camera.position.x - controls.target.x, 0, camera.position.z - controls.target.z).normalize();
  for (const w of wallMeshes) {
    const m = w.material; let target;
    if (wallMode === 'solid') target = 1;
    else if (wallMode === 'ghost') target = 0.24;
    else if (wallMode === 'semifade') { const d = w.userData.fadeNormal.dot(camDirH); target = d > 0.15 ? (w.userData.isPartition ? 0.68 : 0.18) : 1.0; }
    else {
      // cutaway: outer walls → fully transparent, partition/inner walls → semi-transparent
      const d = w.userData.fadeNormal.dot(camDirH);
      if (d > 0.15) target = w.userData.isPartition ? 0.45 : 0.0;
      else target = 1.0;
    }
    // Glass panes never go fully opaque — keep them at least ~30% transparent (素材がガラス)
    if (w.userData.glassPane) target = Math.min(target, w.userData.baseOpacity);
    m.opacity += (target - m.opacity) * 0.18;
    // transparent is already true in the constructor — never toggle it (would need needsUpdate)
    w.visible = m.opacity > 0.02;
    m.depthWrite = m.opacity > 0.5;
    if (showShadows) w.castShadow = m.opacity > 0.5;
  }
}

// ============================================================ RESIZE / LOOP
function handleResize() { const w = wrapper.clientWidth, h = wrapper.clientHeight; camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h, false); }
window.addEventListener('resize', handleResize);

// ============================================================ ITEM INTERACTIONS
let _animPrevT = 0;
const ITEM_INTERACTIONS = {
  wardrobe(g) {
    const p = g.userData.parts || {};
    if (!p.doorL) return null;
    let open = false, prog = 0;
    return {
      toggle() { open = !open; },
      tick(dt) {
        prog += ((open ? 1 : 0) - prog) * Math.min(dt * 5, 1);
        const a = prog * Math.PI * 0.5;
        p.doorL.rotation.y = -a;
        p.doorR.rotation.y = a;
      }
    };
  },
  closet(g) {
    const p = g.userData.parts || {};
    if (!p.slideL) return null;
    const initL = p.slideL.position.x, initR = p.slideR.position.x;
    let open = false, prog = 0;
    return {
      toggle() { open = !open; },
      tick(dt) {
        prog += ((open ? 1 : 0) - prog) * Math.min(dt * 5, 1);
        p.slideL.position.x = initL - prog * p.slideRange;
        p.slideR.position.x = initR + prog * p.slideRange;
      }
    };
  },
  cupboard(g) {
    const p = g.userData.parts || {};
    if (!p.lowerL) return null;
    let open = false, prog = 0;
    return {
      toggle() { open = !open; },
      tick(dt) {
        prog += ((open ? 1 : 0) - prog) * Math.min(dt * 5, 1);
        const a = prog * Math.PI * 0.5;
        p.lowerL.rotation.y = -a;
        p.lowerR.rotation.y = a;
        p.upperL.rotation.y = -a;
        p.upperR.rotation.y = a;
      }
    };
  },
  conveyor(g) {
    const p = g.userData.parts || {};
    if (!p.drumH) return null;
    let running = false;
    return {
      toggle() { running = !running; },
      tick(dt) {
        if (!running) return;
        p.drumH.rotation.z += dt * 3;
        p.drumT.rotation.z += dt * 3;
      }
    };
  },
  forklift(g) {
    const p = g.userData.parts || {};
    if (!p.forkAss) return null;
    let up = false, prog = 0;
    return {
      toggle() { up = !up; },
      tick(dt) {
        prog += ((up ? 1 : 0) - prog) * Math.min(dt * 2.5, 1);
        p.forkAss.position.y = prog * 1.8;
      }
    };
  },
  ind_furnace(g) {
    const p = g.userData.parts || {};
    if (!p.door) return null;
    let open = true, prog = 1;
    return {
      toggle() { open = !open; },
      tick(dt) {
        prog += ((open ? 1 : 0) - prog) * Math.min(dt * 3, 1);
        p.door.rotation.y = -prog * 0.95;
      }
    };
  },
};
function setupItemInteractor(item) {
  const fn = ITEM_INTERACTIONS[item.defId];
  if (fn) item.group.userData.interactor = fn(item.group);
}

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  const dt = Math.min(t - _animPrevT, 0.05); _animPrevT = t;
  placedItems.forEach(item => item.group.userData.interactor?.tick(dt));
  controls.update();
  updateWalls();
  if (selectionRing.visible) { selectionRing.material.opacity = 0.6 + Math.sin(t*3)*0.25; selectionRing.scale.setScalar(1 + Math.sin(t*3)*0.02); }
  const ci = document.getElementById('compass-icon');
  if (ci) { const az = Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z); ci.style.transform = `rotate(${az}rad)`; }
  renderer.render(scene, camera);
}

// ============================================================ 2D FLOOR-PLAN EDITOR
const edCanvas = document.getElementById('editor-canvas');
const edCtx = edCanvas.getContext('2d');
let edTool = 'floor';
let editorFloorType = 'wood';
let editorScale = 36;                 // px per meter
let editorPan = { x: 0, y: 0 };       // pan offset (px)
let edDrag = null;                    // { type:'paint'|'wall'|'pan'|'unify', ... }
let edBrush = 1;                      // brush footprint in cells (1=細,2=中,3=太)
let edHover = null;                   // { x, z } world coords under pointer (for ghost preview)
let edSelOpening = null;              // { wi, oi } currently selected wall opening (door/window)
let edAnim = null;                    // editor swing-animation rAF handle
let edSwingT = 0;                     // animated 0..1 phase for selected-door swing
// Opening kinds that swing on a single hinge (show 吊り元/開く向き controls)
const SWING_KINDS = new Set(['door', 'lab_door', 'bath_door', 'toilet_door']);
// Opening kinds with two leaves hinged at both jambs (show 開く向き only)
const DOUBLE_KINDS = new Set(['double_door']);
// Opening kinds whose leaves slide along the wall (引戸・自動ドア)
const SLIDE_KINDS = new Set(['glass_door', 'auto_door']);
function openingSwings(kind) { return SWING_KINDS.has(kind) || DOUBLE_KINDS.has(kind); }
function openingAnimates(kind) { return openingSwings(kind) || SLIDE_KINDS.has(kind); }

// Rebuild the 3D room from the plan (live), then redraw the 2D canvas.
function syncPlanTo3D() { buildRoom(); drawEditor(); }

// coordinate transforms (world meters ↔ canvas pixels), origin centered + pan
function worldToScreen(wx, wz) {
  return { x: edCanvas.width / 2 + editorPan.x + wx * editorScale,
           y: edCanvas.height / 2 + editorPan.y + wz * editorScale };
}
function screenToWorld(px, py) {
  return { x: (px - edCanvas.width / 2 - editorPan.x) / editorScale,
           z: (py - edCanvas.height / 2 - editorPan.y) / editorScale };
}
function edSnap(v) { return Math.round(v / CELL) * CELL; }
// canvas pixel coords from a pointer event
function edPointer(e) {
  const r = edCanvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (edCanvas.width / r.width),
           y: (e.clientY - r.top) * (edCanvas.height / r.height) };
}
// distance from point P to segment AB, plus projection parameter t (0..1)
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx*dx + dz*dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0;
  t = clamp(t, 0, 1);
  const cx = ax + t * dx, cz = az + t * dz;
  return { dist: Math.hypot(px - cx, pz - cz), t };
}

function drawEditor() {
  const W = edCanvas.width, H = edCanvas.height, ctx = edCtx;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#f1ece1'; ctx.fillRect(0, 0, W, H);
  // grid (0.5m light, 1m darker)
  const x0 = screenToWorld(0, 0).x, x1 = screenToWorld(W, 0).x;
  const z0 = screenToWorld(0, 0).z, z1 = screenToWorld(0, H).z;
  const gx0 = Math.floor(x0 / CELL) * CELL, gz0 = Math.floor(z0 / CELL) * CELL;
  ctx.lineWidth = 1;
  for (let x = gx0; x <= x1; x += CELL) {
    const sx = worldToScreen(x, 0).x;
    ctx.strokeStyle = (Math.abs(Math.round(x) - x) < 1e-6) ? '#cdc3ae' : '#e2dac9';
    ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
  }
  for (let z = gz0; z <= z1; z += CELL) {
    const sy = worldToScreen(0, z).y;
    ctx.strokeStyle = (Math.abs(Math.round(z) - z) < 1e-6) ? '#cdc3ae' : '#e2dac9';
    ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke();
  }
  // floor cells
  const half = CELL / 2;
  roomPlan.cells.forEach((type, key) => {
    const [ix, iz] = key.split(',').map(Number);
    const p = worldToScreen(ix * CELL, iz * CELL);
    ctx.fillStyle = floorSwatch(type);
    ctx.fillRect(p.x, p.y, CELL * editorScale + 0.6, CELL * editorScale + 0.6);
  });
  // origin crosshair + axes
  const o = worldToScreen(0, 0);
  ctx.strokeStyle = 'rgba(98,168,109,0.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(o.x - 9, o.y); ctx.lineTo(o.x + 9, o.y); ctx.moveTo(o.x, o.y - 9); ctx.lineTo(o.x, o.y + 9); ctx.stroke();
  ctx.fillStyle = 'rgba(110,100,80,0.6)'; ctx.font = '10px sans-serif';
  ctx.fillText('X →', o.x + 12, o.y - 4); ctx.fillText('↓ Z', o.x + 4, o.y + 16);
  // walls + openings (color-coded by type)
  roomPlan.walls.forEach((wall, wi) => {
    const wType = wall.type || 'wall';
    const a = worldToScreen(wall.x1, wall.z1), b = worldToScreen(wall.x2, wall.z2);
    const wallColor = wType === 'glass' ? '#5ba4c8' : wType === 'window' ? '#7a8fa0'
                    : wType === 'door' ? '#b9925e' : wType === 'half' ? '#a98b5a' : '#5b5048';
    const wallLW = wType === 'glass' ? 3 : wType === 'half' ? 4 : 5;
    ctx.strokeStyle = wallColor; ctx.lineWidth = wallLW; ctx.lineCap = 'round';
    if (wType === 'glass') ctx.setLineDash([8, 4]);
    else if (wType === 'half') ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]);
    // openings — clean architectural symbol (NO always-on swing line; click a door to see its swing)
    const len = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
    if (len < 0.01) return;
    const ux = (wall.x2 - wall.x1) / len, uz = (wall.z2 - wall.z1) / len;
    const px = -uz, pz = ux;           // wall-perpendicular unit (for jamb ticks)
    const ops = wall.openings || (wall.doors || []).map(d => ({ t: d.t, w: d.w, kind: 'door' }));
    ops.forEach((dr, oi) => {
      const dw = dr.w || 0.9, kind = dr.kind || 'door';
      const s = clamp(dr.t, 0, 1) * len;
      const ax = wall.x1 + ux * (s - dw/2), az = wall.z1 + uz * (s - dw/2);
      const bx = wall.x1 + ux * (s + dw/2), bz = wall.z1 + uz * (s + dw/2);
      const pa = worldToScreen(ax, az), pb = worldToScreen(bx, bz);
      const sel = edSelOpening && edSelOpening.wi === wi && edSelOpening.oi === oi;
      // 1) punch the gap out of the wall line
      ctx.strokeStyle = '#f1ece1'; ctx.lineWidth = wallLW + 3; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      // 2) jamb ticks (short perpendicular marks = the frame) so it still reads as an opening
      const tickC = kind === 'window' || kind === 'glass_door' || kind === 'auto_door' ? '#5ba4c8' : '#b9925e';
      const tk = 0.12;
      ctx.strokeStyle = tickC; ctx.lineWidth = sel ? 3.5 : 2.5;
      [[ax, az], [bx, bz]].forEach(([jx, jz]) => {
        const j0 = worldToScreen(jx - px * tk, jz - pz * tk), j1 = worldToScreen(jx + px * tk, jz + pz * tk);
        ctx.beginPath(); ctx.moveTo(j0.x, j0.y); ctx.lineTo(j1.x, j1.y); ctx.stroke();
      });
      // 3) sill / threshold line across the gap (color-coded by kind)
      if (kind === 'window' || kind === 'glass_door' || kind === 'auto_door') {
        ctx.strokeStyle = '#5ba4c8'; ctx.lineWidth = sel ? 3 : 2;
        const o1 = worldToScreen(ax + px * 0.05, az + pz * 0.05), o2 = worldToScreen(bx + px * 0.05, bz + pz * 0.05);
        const u1 = worldToScreen(ax - px * 0.05, az - pz * 0.05), u2 = worldToScreen(bx - px * 0.05, bz - pz * 0.05);
        ctx.beginPath(); ctx.moveTo(o1.x, o1.y); ctx.lineTo(o2.x, o2.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(u1.x, u1.y); ctx.lineTo(u2.x, u2.y); ctx.stroke();
      } else {
        ctx.strokeStyle = sel ? '#62a86d' : '#caa078'; ctx.lineWidth = sel ? 3 : 1.5;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }
    });
  });
  ctx.lineCap = 'butt';
  // selected opening — animated swing diagram (shows HOW the door moves)
  if (edSelOpening) drawSelectedOpening(ctx);
  // wall-drawing preview
  if (edDrag && edDrag.type === 'wall' && edDrag.cur) {
    const a = worldToScreen(edDrag.x1, edDrag.z1), b = worldToScreen(edDrag.cur.x, edDrag.cur.z);
    ctx.strokeStyle = 'rgba(98,168,109,0.85)'; ctx.lineWidth = 4;
    ctx.setLineDash([6, 4]); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
  }
  // unify selection rectangle
  if (edDrag && edDrag.type === 'unify' && edDrag.cur) {
    const r = edUnifyRange(edDrag);
    const tl = worldToScreen(r.ix0 * CELL, r.iz0 * CELL);
    const br = worldToScreen((r.ix1 + 1) * CELL, (r.iz1 + 1) * CELL);
    ctx.fillStyle = 'rgba(98,168,109,0.14)';
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.strokeStyle = 'rgba(78,145,89,0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
    ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y); ctx.setLineDash([]);
  }
  // hover ghost (tentative-paint / tool preview)
  if (edHover && !(edDrag && edDrag.type === 'pan')) drawHoverGhost(ctx);
}

// brush footprint: cell indices covered by a brush centered on (ix,iz)
function brushCells(ix, iz) {
  const half = Math.floor(edBrush / 2), out = [];
  for (let dx = 0; dx < edBrush; dx++) for (let dz = 0; dz < edBrush; dz++) out.push([ix - half + dx, iz - half + dz]);
  return out;
}

// cell-index range covered by a unify drag (inclusive)
function edUnifyRange(d) {
  const ix0 = Math.floor(Math.min(d.x1, d.cur.x) / CELL), ix1 = Math.floor(Math.max(d.x1, d.cur.x) / CELL);
  const iz0 = Math.floor(Math.min(d.z1, d.cur.z) / CELL), iz1 = Math.floor(Math.max(d.z1, d.cur.z) / CELL);
  return { ix0, ix1, iz0, iz1 };
}

// Translucent preview of what the current tool will do at the hovered position.
function drawHoverGhost(ctx) {
  const cs = CELL * editorScale;
  if (edTool === 'floor' || edTool === 'erase') {
    const cix = Math.floor(edHover.x / CELL), ciz = Math.floor(edHover.z / CELL);
    brushCells(cix, ciz).forEach(([ix, iz]) => {
      const p = worldToScreen(ix * CELL, iz * CELL);
      if (edTool === 'floor') {
        ctx.fillStyle = floorSwatch(editorFloorType); ctx.globalAlpha = 0.5;
        ctx.fillRect(p.x, p.y, cs, cs); ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(78,145,89,0.95)'; ctx.lineWidth = 1.5; ctx.strokeRect(p.x + 0.5, p.y + 0.5, cs - 1, cs - 1);
      } else {
        ctx.fillStyle = 'rgba(217,106,91,0.16)'; ctx.fillRect(p.x, p.y, cs, cs);
        ctx.strokeStyle = 'rgba(217,106,91,0.9)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, cs - 1, cs - 1); ctx.setLineDash([]);
      }
    });
  } else if (edTool === 'wall') {
    const sp = worldToScreen(edSnap(edHover.x), edSnap(edHover.z));
    ctx.strokeStyle = 'rgba(78,145,89,0.95)'; ctx.fillStyle = 'rgba(98,168,109,0.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  } else if (edTool === 'door') {
    const hit = edFindWall(edHover.x, edHover.z, 16);
    if (hit) {
      const wall = roomPlan.walls[hit.index];
      const a = worldToScreen(wall.x1, wall.z1), b = worldToScreen(wall.x2, wall.z2);
      ctx.strokeStyle = 'rgba(98,168,109,0.55)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.lineCap = 'butt';
      const len = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
      const ux = (wall.x2 - wall.x1) / len, uz = (wall.z2 - wall.z1) / len;
      const s = clamp(hit.t, 0.05, 0.95) * len;
      const mk = worldToScreen(wall.x1 + ux * s, wall.z1 + uz * s);
      ctx.fillStyle = '#4e9159'; ctx.beginPath(); ctx.arc(mk.x, mk.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// Animated swing diagram for the currently selected opening.
function drawSelectedOpening(ctx) {
  const sel = selectedOpening(); if (!sel) return;
  const { wall, op } = sel;
  const len = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1); if (len < 0.01) return;
  const ux = (wall.x2 - wall.x1) / len, uz = (wall.z2 - wall.z1) / len;
  const dw = op.w || 0.9, kind = op.kind || 'door';
  const s = clamp(op.t, 0, 1) * len, s0 = s - dw / 2, s1 = s + dw / 2;
  const mx = wall.x1 + ux * s, mz = wall.z1 + uz * s;
  // highlight the selected gap
  const pa = worldToScreen(wall.x1 + ux * s0, wall.z1 + uz * s0);
  const pb = worldToScreen(wall.x1 + ux * s1, wall.z1 + uz * s1);
  ctx.strokeStyle = 'rgba(98,168,109,0.9)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.lineCap = 'butt';
  if (SLIDE_KINDS.has(kind)) { drawSlideDiagram(ctx, wall, op, ux, uz, s0, s1, dw); return; }
  if (!openingSwings(kind)) return;   // windows: just highlight, no swing
  // interior normal (toward room center), flipped by swing
  let nx = -uz, nz = ux;
  if (mx * nx + mz * nz > 0) { nx = -nx; nz = -nz; }
  const swing = op.swing === -1 ? -1 : 1; nx *= swing; nz *= swing;
  const prog = 0.5 - 0.5 * Math.cos(edSwingT * Math.PI * 2);   // eased 0→1→0
  const drawLeaf = (hingeAtStart, leafLen) => {
    const hx = hingeAtStart ? wall.x1 + ux * s0 : wall.x1 + ux * s1;
    const hz = hingeAtStart ? wall.z1 + uz * s0 : wall.z1 + uz * s1;
    const dir = hingeAtStart ? 1 : -1;
    const ax = dir * ux, az = dir * uz;            // closed-leaf direction (along wall)
    const aC = Math.atan2(az, ax), aO = Math.atan2(nz, nx);
    let delta = aO - aC; while (delta > Math.PI) delta -= 2 * Math.PI; while (delta < -Math.PI) delta += 2 * Math.PI;
    const ph = worldToScreen(hx, hz), r = leafLen * editorScale;
    // swing arc envelope
    ctx.strokeStyle = 'rgba(98,168,109,0.5)'; ctx.lineWidth = 1.3; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(ph.x, ph.y, r, aC, aC + delta, delta < 0); ctx.stroke(); ctx.setLineDash([]);
    // fully-open leaf (faint)
    const eO = worldToScreen(hx + nx * leafLen, hz + nz * leafLen);
    ctx.strokeStyle = 'rgba(98,168,109,0.28)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ph.x, ph.y); ctx.lineTo(eO.x, eO.y); ctx.stroke();
    // animated leaf at current progress
    const aN = aC + delta * prog;
    const lx = ph.x + Math.cos(aN) * r, ly = ph.y + Math.sin(aN) * r;
    ctx.strokeStyle = '#4e9159'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ph.x, ph.y); ctx.lineTo(lx, ly); ctx.stroke(); ctx.lineCap = 'butt';
    // hinge dot
    ctx.fillStyle = '#4e9159'; ctx.beginPath(); ctx.arc(ph.x, ph.y, 4, 0, Math.PI * 2); ctx.fill();
  };
  if (DOUBLE_KINDS.has(kind)) { drawLeaf(true, dw / 2); drawLeaf(false, dw / 2); }
  else drawLeaf(!op.hinge, dw);
}

// Animated slide diagram for 引戸 / 自動ドア (panel translates along the wall).
function drawSlideDiagram(ctx, wall, op, ux, uz, s0, s1, dw) {
  const prog = 0.5 - 0.5 * Math.cos(edSwingT * Math.PI * 2);
  let nx = -uz, nz = ux;
  const cx = wall.x1 + ux * (s0 + s1) / 2, cz = wall.z1 + uz * (s0 + s1) / 2;
  if (cx * nx + cz * nz > 0) { nx = -nx; nz = -nz; }
  const off = 0.08, kind = op.kind;
  const auto = kind === 'auto_door';
  // panel spans: [a,b] in along-wall meters at current progress
  const panels = auto
    ? [{ a0: s0, w: dw / 2, dir: -1 }, { a0: (s0 + s1) / 2, w: dw / 2, dir: 1 }]
    : [{ a0: s0, w: dw, dir: 1 }];
  panels.forEach(pn => {
    const shift = pn.dir * pn.w * prog;
    const a = pn.a0 + shift, b = pn.a0 + pn.w + shift;
    const pa = worldToScreen(wall.x1 + ux * a + nx * off, wall.z1 + uz * a + nz * off);
    const pb = worldToScreen(wall.x1 + ux * b + nx * off, wall.z1 + uz * b + nz * off);
    ctx.strokeStyle = '#4e9159'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke(); ctx.lineCap = 'butt';
    // slide-direction arrow at the leading edge
    const tip = worldToScreen(wall.x1 + ux * b + nx * off, wall.z1 + uz * b + nz * off);
    const ah = 5, axu = pn.dir * ux, azu = pn.dir * uz, ang = Math.atan2(azu, axu);
    ctx.fillStyle = 'rgba(78,145,89,0.85)';
    ctx.beginPath();
    ctx.moveTo(tip.x + Math.cos(ang) * ah, tip.y + Math.sin(ang) * ah);
    ctx.lineTo(tip.x + Math.cos(ang + 2.5) * ah, tip.y + Math.sin(ang + 2.5) * ah);
    ctx.lineTo(tip.x + Math.cos(ang - 2.5) * ah, tip.y + Math.sin(ang - 2.5) * ah);
    ctx.closePath(); ctx.fill();
  });
}

// Constrain an endpoint to horiz/vertical when near-axis (cleaner plans).
function edAxisSnap(x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
  if (len < 1e-6) return { x: x2, z: z2 };
  const ang = Math.abs(Math.atan2(dz, dx));
  const near = 15 * Math.PI / 180;
  if (ang < near || Math.abs(ang - Math.PI) < near) return { x: x2, z: z1 };     // horizontal
  if (Math.abs(ang - Math.PI/2) < near) return { x: x1, z: z2 };                 // vertical
  return { x: x2, z: z2 };
}

function edFindWall(wx, wz, pxThreshold) {
  const wt = pxThreshold / editorScale; let best = null, bi = -1;
  roomPlan.walls.forEach((wall, i) => {
    const r = segDist(wx, wz, wall.x1, wall.z1, wall.x2, wall.z2);
    if (r.dist < wt && (!best || r.dist < best.dist)) { best = r; bi = i; }
  });
  return best ? { index: bi, t: best.t } : null;
}

function edApplyAt(px, py) {
  const w = screenToWorld(px, py);
  if (edTool !== 'floor' && edTool !== 'erase') return false;
  const cix = Math.floor(w.x / CELL), ciz = Math.floor(w.z / CELL);
  let changed = false;
  brushCells(cix, ciz).forEach(([ix, iz]) => {
    const key = cellKey(ix, iz);
    if (edTool === 'floor') {
      if (roomPlan.cells.get(key) !== editorFloorType) { roomPlan.cells.set(key, editorFloorType); changed = true; }
    } else {
      if (roomPlan.cells.has(key)) { roomPlan.cells.delete(key); changed = true; }
    }
  });
  return changed;
}

// ---- selected-opening helpers ----
function selectedOpening() {
  if (!edSelOpening) return null;
  const wall = roomPlan.walls[edSelOpening.wi]; if (!wall) return null;
  const op = (wall.openings || [])[edSelOpening.oi]; if (!op) return null;
  return { wall, op };
}
function startEdAnim() { if (edAnim) return; const loop = () => { edSwingT = (edSwingT + 0.011) % 1; drawEditor(); edAnim = requestAnimationFrame(loop); }; edAnim = requestAnimationFrame(loop); }
function stopEdAnim() { if (edAnim) { cancelAnimationFrame(edAnim); edAnim = null; } }

// CSS-pixel position (relative to the canvas-area) for a backing-store screen point.
function edCanvasCssPos(sx, sy) {
  const rect = edCanvas.getBoundingClientRect();
  const area = edCanvas.parentElement.getBoundingClientRect();
  return { left: (rect.left - area.left) + (sx / edCanvas.width) * rect.width,
           top:  (rect.top - area.top) + (sy / edCanvas.height) * rect.height };
}

// 開口(扉/窓)の種類レジストリ。各扉が「使えるシーン(用途カテゴリ)」設定を持つ。
const OPENING_KINDS = {
  door:        { label: 'ドア（片開き）', scenes: ['住宅', 'オフィス', '店舗', '工場', '特殊'] },
  double_door: { label: '両開きドア',     scenes: ['店舗', 'オフィス', '特殊'] },
  glass_door:  { label: 'ガラス引戸',     scenes: ['オフィス', '店舗', '工場', '特殊'] },
  auto_door:   { label: '自動ドア',       scenes: ['店舗', 'オフィス', '特殊'] },
  bath_door:   { label: '浴室ドア',       scenes: ['住宅'] },
  toilet_door: { label: 'トイレドア',     scenes: ['住宅'] },
  lab_door:    { label: '実験室ドア',     scenes: ['特殊'] },
  fusuma:      { label: '襖（ふすま）',   scenes: ['住宅'] },
  shoji:       { label: '障子',           scenes: ['住宅'] },
  window:      { label: '窓',             scenes: ['住宅', 'オフィス', '店舗', '工場', '特殊'] },
};
const OPENING_KIND_LABELS = Object.fromEntries(Object.entries(OPENING_KINDS).map(([k, v]) => [k, v.label]));
// 種類セレクト用の<option>群 (使えるシーンを併記)
function openingKindOptionsHTML(selected) {
  return Object.entries(OPENING_KINDS).map(([k, v]) =>
    `<option value="${k}"${k === selected ? ' selected' : ''}>${v.label}（${v.scenes.join('・')}）</option>`).join('');
}
function handleDoorClick(w) {
  const hit = edFindWall(w.x, w.z, 16);
  if (!hit) { closeDoorPop(); return; }
  const wall = roomPlan.walls[hit.index];
  if (!wall.openings) wall.openings = (wall.doors || []).map(d => ({ t: d.t, w: d.w, kind: 'door' }));
  const len = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
  let oi = -1, best = Infinity;
  wall.openings.forEach((op, i) => {
    const halfT = (op.w || 0.9) / 2 / len + 0.04, d = Math.abs(op.t - hit.t);
    if (d < halfT && d < best) { best = d; oi = i; }
  });
  if (oi >= 0) {
    edSelOpening = { wi: hit.index, oi };
    openDoorPop();
  } else {
    const selKind = (document.getElementById('ed-opening-kind') || {}).value || 'door';
    wall.openings.push({ t: clamp(hit.t, 0.05, 0.95), w: selKind === 'window' ? 1.2 : 0.9, kind: selKind, hinge: 0, swing: 1 });
    edSelOpening = { wi: hit.index, oi: wall.openings.length - 1 };
    syncPlanTo3D();
    openDoorPop();
  }
}

function openDoorPop() {
  const sel = selectedOpening(), pop = document.getElementById('ed-door-pop');
  if (!sel || !pop) return;
  const { wall, op } = sel, kind = op.kind || 'door';
  const showHinge = SWING_KINDS.has(kind);
  const showSwing = SWING_KINDS.has(kind) || DOUBLE_KINDS.has(kind);
  const opts = openingKindOptionsHTML(kind);
  pop.innerHTML = `
    <div class="ed-pop-head"><i class="fa-solid fa-door-open"></i><span>開口の編集</span>
      <button class="ed-pop-x" data-act="close" title="閉じる"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="ed-pop-body">
      <label class="ed-pop-field"><span>種類</span>
        <select class="ed-pop-kind ed-select">${opts}</select></label>
      <label class="ed-pop-field"><span>幅 <b class="ed-pop-wval">${(op.w || 0.9).toFixed(1)}m</b></span>
        <input type="range" class="ed-pop-width ed-slider" min="0.6" max="2" step="0.1" value="${op.w || 0.9}"></label>
      ${showHinge ? `<button class="ed-pop-btn" data-act="hinge"><i class="fa-solid fa-left-right"></i> 吊り元を左右反転</button>` : ''}
      ${showSwing ? `<button class="ed-pop-btn" data-act="swing"><i class="fa-solid fa-arrows-up-down"></i> 開く向きを内/外反転</button>` : ''}
    </div>
    <div class="ed-pop-foot">
      <button class="ed-pop-del" data-act="delete"><i class="fa-solid fa-trash"></i> この開口を削除</button>
    </div>`;
  // position near the opening midpoint
  const len = Math.hypot(wall.x2 - wall.x1, wall.z2 - wall.z1);
  const ux = (wall.x2 - wall.x1) / len, uz = (wall.z2 - wall.z1) / len, s = clamp(op.t, 0, 1) * len;
  const mid = worldToScreen(wall.x1 + ux * s, wall.z1 + uz * s);
  const css = edCanvasCssPos(mid.x, mid.y);
  pop.hidden = false;
  const area = edCanvas.parentElement.getBoundingClientRect();
  let left = css.left + 14, top = css.top + 14;
  left = clamp(left, 6, area.width - pop.offsetWidth - 6);
  top = clamp(top, 6, area.height - pop.offsetHeight - 6);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  // wire controls
  pop.querySelector('.ed-pop-kind').addEventListener('change', e => {
    op.kind = e.target.value;
    if (openingSwings(op.kind)) { if (op.hinge == null) op.hinge = 0; if (op.swing == null) op.swing = 1; }
    if (op.kind === 'window' && op.w < 1.0) op.w = 1.2;
    syncPlanTo3D(); openDoorPop();
  });
  pop.querySelector('.ed-pop-width').addEventListener('input', e => {
    op.w = parseFloat(e.target.value); pop.querySelector('.ed-pop-wval').textContent = op.w.toFixed(1) + 'm';
    syncPlanTo3D();
  });
  pop.querySelectorAll('[data-act]').forEach(btn => btn.addEventListener('click', () => {
    const act = btn.dataset.act;
    if (act === 'close') closeDoorPop();
    else if (act === 'hinge') { op.hinge = op.hinge ? 0 : 1; syncPlanTo3D(); }
    else if (act === 'swing') { op.swing = op.swing === -1 ? 1 : -1; syncPlanTo3D(); }
    else if (act === 'delete') {
      wall.openings.splice(edSelOpening.oi, 1); closeDoorPop(); syncPlanTo3D(); toast('開口を削除しました');
    }
  }));
  if (openingAnimates(op.kind)) startEdAnim(); else stopEdAnim();
  drawEditor();
}
function closeDoorPop() {
  const pop = document.getElementById('ed-door-pop'); if (pop) pop.hidden = true;
  edSelOpening = null; stopEdAnim(); drawEditor();
}

// ---- unify (均一化) chooser ----
function openUnifyChooser(range, sx, sy) {
  const pop = document.getElementById('ed-unify-pop'); if (!pop) return;
  const counts = new Map();
  for (let ix = range.ix0; ix <= range.ix1; ix++) for (let iz = range.iz0; iz <= range.iz1; iz++) {
    const t = roomPlan.cells.get(cellKey(ix, iz)); if (t != null) counts.set(t, (counts.get(t) || 0) + 1);
  }
  if (counts.size === 0) { toast('範囲に床がありません'); return; }
  if (counts.size === 1) { toast('この範囲はすでに均一です'); return; }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([type, n]) =>
    `<button class="ed-unify-opt" data-type="${type}">
       <span class="ed-unify-sw" style="background:${floorSwatch(type)}"></span>
       <span class="ed-unify-name">${(FLOOR_TYPES[type] || {}).name || type}</span>
       <span class="ed-unify-n">${n}</span></button>`).join('');
  pop.innerHTML = `
    <div class="ed-pop-head"><i class="fa-solid fa-object-group"></i><span>どの床材に統一しますか？</span>
      <button class="ed-pop-x" data-act="ucancel" title="閉じる"><i class="fa-solid fa-xmark"></i></button></div>
    <div class="ed-unify-list">${rows}</div>`;
  pop.hidden = false;
  const area = edCanvas.parentElement.getBoundingClientRect();
  const css = edCanvasCssPos(sx, sy);
  let left = clamp(css.left + 8, 6, area.width - pop.offsetWidth - 6);
  let top = clamp(css.top + 8, 6, area.height - pop.offsetHeight - 6);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  pop.querySelector('[data-act="ucancel"]').addEventListener('click', closeUnifyPop);
  pop.querySelectorAll('.ed-unify-opt').forEach(btn => btn.addEventListener('click', () => {
    const type = btn.dataset.type; let n = 0;
    for (let ix = range.ix0; ix <= range.ix1; ix++) for (let iz = range.iz0; iz <= range.iz1; iz++) {
      const key = cellKey(ix, iz);
      if (roomPlan.cells.has(key) && roomPlan.cells.get(key) !== type) { roomPlan.cells.set(key, type); n++; }
    }
    closeUnifyPop(); syncPlanTo3D(); toast(`${n} セルを「${(FLOOR_TYPES[type] || {}).name || type}」に統一しました`);
  }));
}
function closeUnifyPop() { const pop = document.getElementById('ed-unify-pop'); if (pop) pop.hidden = true; }

edCanvas.addEventListener('pointerdown', e => {
  e.preventDefault(); edCanvas.setPointerCapture(e.pointerId);
  const p = edPointer(e);
  // middle button or right button = pan
  if (e.button === 1 || e.button === 2) { edDrag = { type: 'pan', sx: p.x, sy: p.y, ox: editorPan.x, oy: editorPan.y }; return; }
  const w = screenToWorld(p.x, p.y);
  if (edTool !== 'door') closeDoorPop();
  closeUnifyPop();
  if (edTool === 'floor' || edTool === 'erase') {
    edDrag = { type: 'paint' };
    if (edApplyAt(p.x, p.y)) syncPlanTo3D(); else drawEditor();
  } else if (edTool === 'unify') {
    edDrag = { type: 'unify', x1: w.x, z1: w.z, cur: { x: w.x, z: w.z } };
    drawEditor();
  } else if (edTool === 'wall') {
    edDrag = { type: 'wall', x1: edSnap(w.x), z1: edSnap(w.z), cur: { x: edSnap(w.x), z: edSnap(w.z) } };
    drawEditor();
  } else if (edTool === 'door') {
    handleDoorClick(w);
  } else if (edTool === 'delwall') {
    const hit = edFindWall(w.x, w.z, 14);
    if (hit) { roomPlan.walls.splice(hit.index, 1); closeDoorPop(); syncPlanTo3D(); }
  }
});
edCanvas.addEventListener('pointermove', e => {
  const p = edPointer(e);
  const w = screenToWorld(p.x, p.y);
  edHover = { x: w.x, z: w.z };
  if (!edDrag) { drawEditor(); return; }
  if (edDrag.type === 'pan') { editorPan.x = edDrag.ox + (p.x - edDrag.sx); editorPan.y = edDrag.oy + (p.y - edDrag.sy); drawEditor(); return; }
  if (edDrag.type === 'paint') { if (edApplyAt(p.x, p.y)) syncPlanTo3D(); else drawEditor(); return; }
  if (edDrag.type === 'wall') { edDrag.cur = { x: edSnap(w.x), z: edSnap(w.z) }; drawEditor(); return; }
  if (edDrag.type === 'unify') { edDrag.cur = { x: w.x, z: w.z }; drawEditor(); return; }
});
edCanvas.addEventListener('pointerup', e => {
  if (edDrag && edDrag.type === 'wall' && edDrag.cur) {
    let { x: ex, z: ez } = edAxisSnap(edDrag.x1, edDrag.z1, edDrag.cur.x, edDrag.cur.z);
    ex = edSnap(ex); ez = edSnap(ez);
    if (Math.hypot(ex - edDrag.x1, ez - edDrag.z1) >= CELL) {
      const selWType = (document.getElementById('ed-wall-type') || {}).value || 'wall';
      roomPlan.walls.push({ x1: edDrag.x1, z1: edDrag.z1, x2: ex, z2: ez, type: selWType, openings: [] });
      syncPlanTo3D();
    } else drawEditor();
  } else if (edDrag && edDrag.type === 'unify' && edDrag.cur) {
    const range = edUnifyRange(edDrag);
    const p = edPointer(e);
    edDrag = null;
    openUnifyChooser(range, p.x, p.y);
    return;
  }
  edDrag = null;
});
edCanvas.addEventListener('pointerleave', () => { edHover = null; if (edDrag && edDrag.type !== 'wall') edDrag = null; drawEditor(); });
edCanvas.addEventListener('contextmenu', e => e.preventDefault());
edCanvas.addEventListener('wheel', e => {
  e.preventDefault();
  const p = edPointer(e);
  const before = screenToWorld(p.x, p.y);
  editorScale = clamp(editorScale * (e.deltaY < 0 ? 1.12 : 0.89), 12, 120);
  const after = screenToWorld(p.x, p.y);
  // keep the point under the cursor stable
  editorPan.x += (after.x - before.x) * editorScale;
  editorPan.y += (after.z - before.z) * editorScale;
  drawEditor();
}, { passive: false });

function openEditor() {
  try {
    if (state === 'PLACING') cancelPlacement();
    exitPaintMode(); deselect();
    editorFloorType = floorType;
    const sel = document.getElementById('editor-floor-select'); if (sel) sel.value = editorFloorType;
    // Sync room size controls to current state
    const rw = document.getElementById('room-w'); if (rw) rw.value = roomW;
    const rd = document.getElementById('room-d'); if (rd) rd.value = roomD;
    const rwv = document.getElementById('room-w-val'); if (rwv) rwv.textContent = roomW + 'm';
    const rdv = document.getElementById('room-d-val'); if (rdv) rdv.textContent = roomD + 'm';
    const disp = document.getElementById('ed-room-display'); if (disp) disp.textContent = `${roomW}m × ${roomD}m`;
    const b = planBounds();
    const bw = Math.max(b.w, 2), bd = Math.max(b.d, 2);
    editorScale = clamp(Math.min(edCanvas.width / (bw + 4), edCanvas.height / (bd + 4)), 14, 100);
    editorPan = { x: 0, y: 0 };
    edSelOpening = null; edHover = null; edDrag = null;
    closeDoorPop(); closeUnifyPop();
    // sync brush-size control
    document.querySelectorAll('#ed-brush-seg button').forEach(b => b.classList.toggle('active', +b.dataset.brush === edBrush));
    document.getElementById('editor-modal').classList.add('open');
    requestAnimationFrame(() => drawEditor());
  } catch(err) { console.error('openEditor:', err); }
}
function closeEditor() {
  stopEdAnim(); closeDoorPop(); closeUnifyPop();
  document.getElementById('editor-modal').classList.remove('open');
}

// ============================================================ JS TOOLTIP
(function initTooltip() {
  const tip = document.getElementById('global-tooltip');
  if (!tip) return;
  let hideTimer = null;
  function showTip(el) {
    const text = el.getAttribute('data-tip'); if (!text) return;
    tip.textContent = text; tip.style.display = 'block';
    const r = el.getBoundingClientRect();
    let tx = r.left + r.width / 2 - tip.offsetWidth / 2;
    let ty = r.bottom + 6;
    if (ty + tip.offsetHeight > window.innerHeight - 4) ty = r.top - tip.offsetHeight - 6;
    tip.style.left = Math.max(4, Math.min(tx, window.innerWidth - tip.offsetWidth - 4)) + 'px';
    tip.style.top = Math.max(4, ty) + 'px';
  }
  document.addEventListener('mouseover', e => {
    const el = e.target.closest('[data-tip]'); if (!el) return;
    clearTimeout(hideTimer); showTip(el);
  });
  document.addEventListener('mouseout', e => {
    const el = e.target.closest('[data-tip]'); if (!el) return;
    hideTimer = setTimeout(() => { tip.style.display = 'none'; }, 80);
  });
  document.addEventListener('click', () => { tip.style.display = 'none'; });
})();

// ============================================================ INDEXEDDB AUTO-SAVE
const IDB_NAME = 'room-planner-v1', IDB_VER = 1, IDB_STORE = 'autosave';
let idb = null;
function openIDB() {
  return new Promise((res, rej) => {
    try {
      const req = indexedDB.open(IDB_NAME, IDB_VER);
      req.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
      req.onsuccess = e => { idb = e.target.result; res(idb); };
      req.onerror = () => { console.warn('IndexedDB unavailable'); res(null); };
    } catch(e) { console.warn('IndexedDB error', e); res(null); }
  });
}
function idbPut(data) {
  if (!idb) return;
  try {
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(data, 'layout');
  } catch(e) { console.warn('idbPut failed', e); }
}
function idbGet() {
  return new Promise(res => {
    if (!idb) { res(null); return; }
    try {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get('layout');
      req.onsuccess = e => res(e.target.result || null);
      req.onerror = () => res(null);
    } catch(e) { res(null); }
  });
}
function idbDelete() {
  return new Promise(res => {
    if (!idb) { res(false); return; }
    try {
      const tx = idb.transaction(IDB_STORE, 'readwrite');
      const req = tx.objectStore(IDB_STORE).delete('layout');
      req.onsuccess = () => res(true);
      req.onerror = () => res(false);
    } catch(e) { console.warn('idbDelete failed', e); res(false); }
  });
}
function buildSavePayload() {
  const cells = [];
  roomPlan.cells.forEach((type, key) => { const [ix, iz] = key.split(',').map(Number); cells.push([ix, iz, type]); });
  const walls = roomPlan.walls.map(w => ({ x1:w.x1, z1:w.z1, x2:w.x2, z2:w.z2, type:w.type||'wall', openings:(w.openings||[]) }));
  return { version: 5, room: { w: roomW, d: roomD }, partitions, floorType, wallType,
    plan: { cells, walls },
    items: placedItems.map(i => ({ defId:i.defId, x:i.position.x, y:i.position.y, z:i.position.z, rotY:i.rotY, color:i.color })) };
}
let _autoSaveTimer = null;
function showSaveStatus(state) {
  const el = document.getElementById('save-status');
  const txt = document.getElementById('save-status-text');
  if (!el) return;
  el.className = 'save-status ' + state;
  if (state === 'saving') {
    el.querySelector('i').className = 'fa-solid fa-rotate';
    txt.textContent = '保存中…';
  } else {
    el.querySelector('i').className = 'fa-solid fa-cloud-arrow-up';
    txt.textContent = '保存済み';
  }
}
let _autoSaveEnabled = false;
function scheduleAutoSave() {
  if (!_autoSaveEnabled) return;
  showSaveStatus('saving');
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(() => {
    try { idbPut(buildSavePayload()); showSaveStatus('saved'); }
    catch(e) { console.warn('auto-save failed', e); }
  }, 1500);
}

// ============================================================ BOOT
async function boot() {
  if (typeof WebGLRenderingContext === 'undefined') { document.getElementById('no-webgl').classList.add('show'); document.getElementById('app').style.display = 'none'; return; }
  const verEl = document.getElementById('app-version');
  if (verEl) verEl.textContent = 'v' + APP_VERSION;
  roomPlan = rectToPlan(6, 6, [], 'wood');
  buildRoom(); initUI(); updateHistoryButtons(); handleResize(); animate();
  await openIDB();
  _autoSaveEnabled = true;
  const saved = await idbGet();
  if (saved && saved.items && saved.items.length > 0) {
    // Auto-restore the previous layout — no prompt
    applyLayout(saved);
    setStatus('前回のレイアウトを自動復元しました');
    toast(`前回のレイアウトを復元しました（${saved.items.length} 点）`);
  } else {
    applyLayout(PRESETS[0]);
    setStatus('準備完了 — 家具を配置、またはプリセットを選択');
  }
  setTimeout(() => { document.getElementById('loading').classList.add('hidden'); }, 650);

  // Validate all preset layouts for orientation/placement inconsistencies
  const _orientIssues = validateAllPresets(PRESETS, FURNITURE_DEFS);
  const _orientErrors = _orientIssues.filter(i => i.severity === 'error');
  const _orientWarns  = _orientIssues.filter(i => i.severity === 'warn');
  _orientErrors.forEach(i => console.warn(`[orient] ${i.preset}#${i.index} ${i.defId}: ${i.message}`));
  _orientWarns.forEach(i => console.info(`[orient] ${i.preset}#${i.index} ${i.defId}: ${i.message}`));
  if (_orientIssues.length > 0) console.log(`[orient] ${_orientErrors.length} error(s), ${_orientWarns.length} warning(s) across ${PRESETS.length} presets`);
}
boot();
