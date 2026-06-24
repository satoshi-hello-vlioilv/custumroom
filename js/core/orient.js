// ============================================================================
// orient.js — アイテムの「使用向き」セマンティクスとプリセット整合チェック
//
// 規約 (CONVENTION):
//   すべてのビルダーは、アイテムの「使う面」(画面・引き出し・座面の開口・扉の前面)
//   をローカル +Z 方向にモデリングする。よって人がそのアイテムを使うために立つ/座る
//   「アクセス方向」は前面 = ローカル +Z。回転 rotY を適用した後の前面ベクトルは
//   front = ( sin(rotY), cos(rotY) )  ［x,z 平面］
//     rotY=0  → +Z (南/手前)   rotY=90 → +X (東)
//     rotY=180→ -Z (北/奥)     rotY=270→ -X (西)
//   壁掛け/壁付けアイテムは背面(-Z)を壁に向け、前面を室内へ向ける。
//
// 各カタログ def に解決される使用プロファイル def.use:
//   mount  : 'floor' | 'wall' | 'stack' | 'ceiling'   どこに設置するか
//   back   : 'wall'  | 'free'    背面(-Z)を壁に付けるべきか
//   access : number(m)           前面(+Z)に必要な使用クリアランス。0なら前面チェックなし
//   surface: boolean             stackのとき、必ず什器の上に載るべきか(床置きNG)
//
// validateLayout(preset, defsById) はプリセット 1 件の不整合配列を返す。
// validateAllPresets(presets, defs) は全プリセットを検査して配列を返す。
// ============================================================================

// --- 背面を壁に付けるべき床置きアイテム ------------------------------------
const BACK_TO_WALL = new Set([
  // table
  'desk', 'consoletab',
  // sleep
  'sbed', 'dbed', 'bunkbed',
  // storage
  'wardrobe', 'shelf', 'chest', 'tvboard', 'shoebox', 'closet', 'glasscab', 'dresser', 'hangerrack', 'locker',
  // deco
  'piano',
  // kitchen
  'cupboard', 'kitchen', 'stove', 'fridge', 'dishwasher',
  // sanitary
  'toilet', 'handbasin', 'vanity', 'washer', 'bathtub', 'bathset',
  // office / shop
  'filingcab', 'copier', 'reception', 'shelfrack', 'register', 'showcasefridge', 'vendingmachine', 'atm', 'barcounter',
  // factory (壁付けが自然な棚・盤)
  'toolcab', 'ctrlpanel', 'palletrack', 'chemshelf',
]);

// --- 前面(+Z)に必要なアクセスクリアランス[m]。未指定は 0 (前面チェックなし) -----
const ACCESS = {
  // 着座して何か(机/テーブル)に向くべき椅子・ソファ
  sofa3: 0.3, sofa1: 0.3, sofa2: 0.3, sofalow: 0.3, sofal: 0.3, loungechair: 0.3,
  dchr: 0.3, ochr: 0.3, cafechr: 0.3, windsorchair: 0.3, stackchr: 0.3, upholchr: 0.3, barstool: 0.3, bench: 0.25,
  // 作業面 (前面に着座)
  desk: 0.5, schooldesk: 0.45,
  // 前面から扉/引き出しを開ける収納
  wardrobe: 0.5, closet: 0.5, chest: 0.45, dresser: 0.45, glasscab: 0.4, locker: 0.4,
  hangerrack: 0.3, shelf: 0.35, shoebox: 0.3, cupboard: 0.4, filingcab: 0.45,
  // 前面から使う調理・家電
  kitchen: 0.5, stove: 0.5, fridge: 0.5, dishwasher: 0.4,
  // 水回り
  toilet: 0.4, vanity: 0.4, washer: 0.4, handbasin: 0.35,
  // カウンター・機器
  reception: 0.6, copier: 0.5, register: 0.6, barcounter: 0.6, shelfrack: 0.5,
  showcasefridge: 0.5, vendingmachine: 0.5, atm: 0.6,
};

// --- stack のうち必ず什器の上に載るべきもの (床に落ちたら不整合) --------------
const SURFACE_ONLY = new Set([
  'monitor', 'espresso', 'microwave', 'ricecook', 'projector', 'desklamp', 'tablelamp', 'lantern',
  'microscope', 'centrifuge', 'analbalance', 'glassware', 'oscilloscope', 'printer3d',
  'spectropho', 'ultrasonic', 'vacpump',
]);

function resolveUse(def) {
  const mount = def.wallMount ? 'wall' : def.stack ? 'stack' : 'floor';
  let back = 'free';
  if (mount === 'wall') back = 'wall';
  else if (mount === 'floor' && BACK_TO_WALL.has(def.id)) back = 'wall';
  const access = (mount === 'floor' && ACCESS[def.id] != null) ? ACCESS[def.id] : 0;
  const surface = mount === 'stack' && SURFACE_ONLY.has(def.id);
  return { mount, back, access, surface };
}

// --- 幾何ヘルパー (x-z 平面) -------------------------------------------------
function frontVec(rotY) { const r = rotY * Math.PI / 180; return { x: Math.sin(r), z: Math.cos(r) }; }
function halfExtents(def, rotY) {
  const r = rotY * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  return { hw: (def.w * c + def.d * s) / 2, hd: (def.w * s + def.d * c) / 2 };
}
// アイテムの「奥行き半分」= 前後方向(±Z)の張り出し
function halfDepthAlongFront(def, rotY) {
  const r = rotY * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  return (def.d * c + def.w * s) / 2;
}

// プリセットの壁セグメント(外周4枚+間仕切り)を開口情報付きで返す
function presetWalls(preset) {
  const W = preset.room.w / 2, D = preset.room.d / 2, ws = preset.walls || {};
  const seg = (x1, z1, x2, z2, ops) => ({ x1, z1, x2, z2, ops: ops || [] });
  const walls = [
    seg(-W, -D, W, -D, ws.north),
    seg(-W, D, W, D, ws.south),
    seg(W, -D, W, D, ws.east),
    seg(-W, -D, -W, D, ws.west),
  ];
  (preset.partitions || []).forEach(p => walls.push(seg(p.x1, p.z1, p.x2, p.z2, p.openings)));
  return walls;
}

// 点 (x,z) と壁セグメント群との最近接情報。inOpening: 投影点が開口内か
function nearestWall(walls, x, z) {
  let best = null;
  for (const w of walls) {
    const dx = w.x2 - w.x1, dz = w.z2 - w.z1, len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    const ux = dx / len, uz = dz / len;
    let s = (x - w.x1) * ux + (z - w.z1) * uz;
    s = Math.max(0, Math.min(len, s));
    const px = w.x1 + ux * s, pz = w.z1 + uz * s;
    const dist = Math.hypot(x - px, z - pz);
    let inOpening = false;
    for (const o of w.ops) {
      const oc = (o.t != null ? o.t : 0.5) * len, ow = (o.w || 0.9);
      if (Math.abs(s - oc) <= ow / 2) { inOpening = true; break; }
    }
    if (!best || dist < best.dist) best = { dist, px, pz, nx: uz, nz: -ux, inOpening, wall: w };
  }
  return best;
}

// AABB 重なり量
function overlapAABB(a, b) {
  const ox = Math.min(a.cx + a.hw, b.cx + b.hw) - Math.max(a.cx - a.hw, b.cx - b.hw);
  const oz = Math.min(a.cz + a.hd, b.cz + b.hd) - Math.max(a.cz - a.hd, b.cz - b.hd);
  return { ox, oz };
}

// def の上面高さ(stack 支持面の概算)
function topY(def) { return def.h || 0; }

function validateLayout(preset, defsById) {
  const issues = [];
  const add = (sev, idx, defId, msg) => issues.push({ preset: preset.id, index: idx, defId, severity: sev, message: msg });
  const walls = presetWalls(preset);
  const items = (preset.items || []).map((it, idx) => {
    const def = defsById[it.defId];
    if (!def) return null;
    const use = def.use || resolveUse(def);
    const he = halfExtents(def, it.rotY || 0);
    return { it, idx, def, use, cx: it.x, cz: it.z, hw: he.hw, hd: he.hd, front: frontVec(it.rotY || 0) };
  }).filter(Boolean);

  for (const m of items) {
    const { it, idx, def, use, front } = m;

    // (1) 壁掛け/壁付け: 壁が背後にあり前面が室内を向くこと
    if (use.mount === 'wall') {
      const nw = nearestWall(walls, m.cx, m.cz);
      if (!nw || nw.dist > 0.45) {
        add('error', idx, def.id, `壁掛けアイテムだが近くに壁がない (最寄り壁まで ${nw ? nw.dist.toFixed(2) : '∞'}m)`);
      } else {
        // 壁から室内へ向かう法線
        let nx = nw.nx, nz = nw.nz;
        if ((m.cx - nw.px) * nx + (m.cz - nw.pz) * nz < 0) { nx = -nx; nz = -nz; }
        const facing = front.x * nx + front.z * nz; // 前面が室内向きなら +1
        if (facing < 0.5) add('error', idx, def.id, `壁掛けアイテムの前面が壁を向いている (向き rotY=${it.rotY || 0})`);
        if (nw.inOpening) add('warn', idx, def.id, `壁掛けアイテムが開口(扉/窓)の位置にある`);
      }
      continue;
    }

    // (2) stack: 載るべき什器が下にあるか / 高さ整合
    if (use.mount === 'stack') {
      const supporters = items.filter(o => o !== m && o.use.mount !== 'wall' &&
        Math.abs(o.cx - m.cx) <= o.hw && Math.abs(o.cz - m.cz) <= o.hd && topY(o.def) <= (def.h ? topY(m.def) + topY(o.def) : 99));
      const support = supporters.filter(o => o.use.mount === 'floor' || o.use.mount === 'stack');
      const best = support.reduce((a, o) => (!a || topY(o.def) > topY(a.def)) ? o : a, null);
      if (use.surface && !best) {
        add('error', idx, def.id, `卓上アイテムを支える什器が下にない (床に落ちる)`);
      } else if (best && it.y != null && Math.abs(it.y - topY(best.def)) > 0.07) {
        add('warn', idx, def.id, `載置高 y=${it.y} が下の${best.def.id}(上面${topY(best.def).toFixed(2)})と不一致 (貫通/浮き)`);
      } else if (it.y != null && !best && it.y > 0.05) {
        add('warn', idx, def.id, `y=${it.y} だが下に什器がなく宙に浮く`);
      }
      continue;
    }

    // --- 以降は床置き ---
    // (3) 前面(アクセス側)が壁を向いていないか
    if (use.access > 0) {
      const hdF = halfDepthAlongFront(def, it.rotY || 0);
      const fx = m.cx + front.x * (hdF + Math.min(use.access, 0.4));
      const fz = m.cz + front.z * (hdF + Math.min(use.access, 0.4));
      const nw = nearestWall(walls, fx, fz);
      const outside = Math.abs(fx) > preset.room.w / 2 + 0.05 || Math.abs(fz) > preset.room.d / 2 + 0.05;
      if (nw && nw.dist < 0.15 && !nw.inOpening) {
        add('error', idx, def.id, `アクセス面(前面)が壁を向いている (向き rotY=${it.rotY || 0})`);
      } else if (outside) {
        add('error', idx, def.id, `アクセス面(前面)が部屋の外(壁の向こう)を向いている (向き rotY=${it.rotY || 0})`);
      }
    }

    // (4) 背面を壁に付けるべきアイテムの背面が露出していないか
    if (use.back === 'wall') {
      const hdB = halfDepthAlongFront(def, it.rotY || 0);
      const bx = m.cx - front.x * (hdB + 0.12), bz = m.cz - front.z * (hdB + 0.12);
      const nw = nearestWall(walls, bx, bz);
      const wallBehind = nw && nw.dist < 0.35;
      // 背中合わせ(他什器が背後)も可
      const itemBehind = items.some(o => o !== m && o.use.mount === 'floor' &&
        Math.abs(o.cx - bx) <= o.hw + 0.1 && Math.abs(o.cz - bz) <= o.hd + 0.1);
      if (!wallBehind && !itemBehind) {
        add('warn', idx, def.id, `背面を壁に付けるべきだが背後に壁も什器もない (向き rotY=${it.rotY || 0})`);
      }
    }
  }

  // (5) 床置き什器どうしの footprint 重なり (椅子・ラグ・壁/stack は除外)
  const floor = items.filter(m => m.use.mount === 'floor' && m.def.cat !== 'seating' && (m.def.h || 0) >= 0.06);
  for (let i = 0; i < floor.length; i++) {
    for (let j = i + 1; j < floor.length; j++) {
      const a = floor[i], b = floor[j];
      const { ox, oz } = overlapAABB(a, b);
      if (ox > 0.1 && oz > 0.1) {
        add('error', a.idx, a.def.id, `${a.def.id} と ${b.def.id}(#${b.idx}) の設置面が重なっている (${ox.toFixed(2)}×${oz.toFixed(2)}m)`);
      }
    }
  }

  return issues;
}

function validateAllPresets(presets, defs) {
  const byId = {};
  defs.forEach(d => { byId[d.id] = d; if (!d.use) d.use = resolveUse(d); });
  let all = [];
  presets.forEach(p => { all = all.concat(validateLayout(p, byId)); });
  return all;
}

export { resolveUse, validateLayout, validateAllPresets, frontVec, presetWalls };
