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
  // table (desk は自立配置も一般的なため除外: アクセス面チェック(3)と机椅子チェック(7)で担保)
  'consoletab',
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
  // office / shop (island racks/registers/受付 stand freely — removed: shelfrack, register, palletrack, reception)
  'filingcab', 'copier', 'showcasefridge', 'vendingmachine', 'atm', 'barcounter',
  // factory (壁付けが自然な盤・棚; toolcab は移動式も多いため除外)
  'ctrlpanel', 'chemshelf',
]);

// --- 前面(+Z)に必要なアクセスクリアランス[m]。未指定は 0 (前面チェックなし) -----
const ACCESS = {
  // 着座して何か(机/テーブル)に向くべき椅子・ソファ
  sofa3: 0.3, sofa1: 0.3, sofa2: 0.3, sofalow: 0.3, sofal: 0.3, loungechair: 0.3,
  dchr: 0.3, ochr: 0.3, cafechr: 0.3, windsorchair: 0.3, stackchr: 0.3, upholchr: 0.3, barstool: 0.3, bench: 0.25, kidschair: 0.25,
  // 作業面 (前面に着座)
  desk: 0.5, deskrun: 0.5, schooldesk: 0.45,
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
  // 前面に投入扉/作業面を持つ大型機械 (前面が壁/室外を向くと作業不可)
  ind_furnace: 0.6,
};

// --- stack のうち必ず什器の上に載るべきもの (床に落ちたら不整合) --------------
// ceiling/floor fixtures excluded from footprint overlap check (don't block furniture placement)
const FOOTPRINT_SKIP = new Set(['pendlamp', 'tablelamp', 'desklamp', 'lamp', 'floorlamp', 'stove', 'balloon']);

// --- 人物フィギュア: 任意の場所に立つため干渉/動線チェックの対象外 ----------------
const PERSON_IDS = new Set(['girl', 'boy', 'woman', 'man', 'toddler', 'worker']);

// --- ユニットバス: 局所 -X / -Z に固体壁面を持つ。角で部屋壁と一体化させる ----------
const UNIT_BATH = new Set(['bathset']);

// --- 着座して必ずテーブル/作業面に「対面」すべき椅子 (対面方向チェック対象) ------
// sofa/bench/stool/loungechair/zabuton はオープン方向や TV に向くため対象外
const DINING_CHAIRS = new Set([
  'dchr', 'ochr', 'cafechr', 'windsorchair', 'stackchr', 'upholchr', 'barstool', 'kidschair',
]);
// --- 椅子が対面すべき「テーブル/作業面/カウンター」 ----------------------------
const TABLE_IDS = new Set([
  'desk', 'deskrun', 'schooldesk', 'kidsdesk', 'dtable', 'conftable', 'roundtable', 'roundtablesm',
  'cafetable', 'kotatsu', 'labbench', 'workbench', 'testbench', 'barcounter', 'roundctab',
]);
// --- 「通り抜ける」開口(扉/襖/障子/自動ドア等)。window は通行しないので対象外 ----
function isPassage(kind) { return !!kind && !String(kind).includes('window'); }
// --- 動線(扉前クリアランス)チェックで障害物とみなさない床置き ------------------
// 平たい物(ラグ/パレット)・椅子・装飾植物は通行の主障害から除外
const CIRC_IGNORE_CAT = new Set(['seating']);
const CIRC_IGNORE_ID = new Set([
  'rug', 'roundrug', 'woodpallet', 'steelpallet', 'resinpallet', 'zabuton', 'campfire',
  'balloon', 'kidschair', 'heartcushion',
]);

const SURFACE_ONLY = new Set([
  'monitor', 'espresso', 'microwave', 'ricecook', 'projector', 'desklamp', 'tablelamp',
  // lantern は屋外地面置きが正常なため除外

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
// アイテムの前面方向への半張り出し (front vec の方向に沿った AABB 半幅)
function halfDepthAlongFront(def, rotY) {
  const r = rotY * Math.PI / 180, c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  // hw=x軸半幅, hd=z軸半幅。front=(s,c) なので front方向投影 = hw*s + hd*c
  const hw = (def.w * c + def.d * s) / 2;
  const hd = (def.w * s + def.d * c) / 2;
  return hw * s + hd * c;
}

// プリセットの壁セグメント(外周4枚+間仕切り)を開口情報付きで返す
function presetWalls(preset) {
  const W = preset.room.w / 2, D = preset.room.d / 2, ws = preset.walls || {};
  const seg = (x1, z1, x2, z2, ops) => ({ x1, z1, x2, z2, ops: ops || [] });
  // 北/南の z 符号は app.js の rectToPlan に一致させる: south=z0(=-D, 負), north=z1(=+D, 正)。
  // (以前は north/south が逆マッピングで, 開口判定が描画と食い違っていた)
  const walls = [
    seg(-W, -D, W, -D, ws.south),   // 南 = z=-D
    seg(-W, D, W, D, ws.north),     // 北 = z=+D
    seg(W, -D, W, D, ws.east),      // 東 = x=+W
    seg(-W, -D, -W, D, ws.west),    // 西 = x=-W
  ];
  (preset.partitions || []).forEach(p => walls.push(seg(p.x1, p.z1, p.x2, p.z2, p.openings)));
  return walls;
}

// 点 (x,z) と壁セグメント群との最近接情報。inOpening: 投影点が開口内か、openingKind: 開口種別
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
    let inOpening = false, openingKind = null;
    for (const o of w.ops) {
      const oc = (o.t != null ? o.t : 0.5) * len, ow = (o.w || 0.9);
      if (Math.abs(s - oc) <= ow / 2) { inOpening = true; openingKind = o.kind || null; break; }
    }
    if (!best || dist < best.dist) best = { dist, px, pz, nx: uz, nz: -ux, inOpening, openingKind, wall: w };
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
      if (wallBehind && nw.inOpening) {
        // 扉位置に背面→通路閉塞の恐れ。窓位置は水回り什器のみ警告
        const isDoor = nw.openingKind && nw.openingKind.includes('door');
        const SANITARY = new Set(['vanity','toilet','handbasin','bathtub','bathset','washer']);
        if (isDoor || SANITARY.has(def.id)) {
          add('warn', idx, def.id, `背面が壁の${isDoor ? '扉' : '窓'}位置にある — ${nw.openingKind}と干渉`);
        }
      } else if (!wallBehind && !itemBehind) {
        add('warn', idx, def.id, `背面を壁に付けるべきだが背後に壁も什器もない (向き rotY=${it.rotY || 0})`);
      }
    }
  }

  // (5) 床置き什器どうしの footprint 重なり
  // 除外: 椅子・ラグ(h<0.06)・壁/stack・工場設備(隣接/積載が通常)・照明器具
  const floor = items.filter(m => m.use.mount === 'floor' && m.def.cat !== 'seating'
    && m.def.cat !== 'factory' && !FOOTPRINT_SKIP.has(m.def.id) && !PERSON_IDS.has(m.def.id)
    && m.def.id !== 'kidschair' && (m.def.h || 0) >= 0.06);
  for (let i = 0; i < floor.length; i++) {
    for (let j = i + 1; j < floor.length; j++) {
      const a = floor[i], b = floor[j];
      const { ox, oz } = overlapAABB(a, b);
      if (ox > 0.1 && oz > 0.1) {
        add('error', a.idx, a.def.id, `${a.def.id} と ${b.def.id}(#${b.idx}) の設置面が重なっている (${ox.toFixed(2)}×${oz.toFixed(2)}m)`);
      }
    }
  }

  // (6) 天井/床置き照明フィクスチャが大型床置き什器フットプリントに重なっていないか
  // (pendlampなどはFOOTPRINT_SKIPで床置き重複チェック除外のため別途検査)
  const LARGE_FLOOR_IDS = new Set(['dbed', 'sbed', 'bunkbed', 'bathset', 'bathtub']);
  const ceilFixtures = items.filter(m => FOOTPRINT_SKIP.has(m.def.id) && m.use.mount !== 'wall');
  const largeFloorItems = floor.filter(m => LARGE_FLOOR_IDS.has(m.def.id));
  for (const fix of ceilFixtures) {
    for (const fl of largeFloorItems) {
      const { ox, oz } = overlapAABB(fix, fl);
      if (ox > 0.05 && oz > 0.05) {
        add('warn', fix.idx, fix.def.id,
          `${fix.def.id} が ${fl.def.id}(#${fl.idx}) のフットプリント内に重なっている — 天井照明と大型家具の干渉`);
      }
    }
  }

  // (7) 椅子の「対面方向」チェック — 着座系椅子は最寄りのテーブル/作業面に正対すべき
  // 椅子ごとに最近傍テーブルを(AABB最近点距離で)探し、椅子前面がそのテーブルを向くか検査
  const tableItems = items.filter(m => TABLE_IDS.has(m.def.id) && m.use.mount === 'floor');
  for (const ch of items) {
    if (!DINING_CHAIRS.has(ch.def.id) || ch.use.mount !== 'floor') continue;
    let nearest = null, nearestEdge = 9999;
    for (const tb of tableItems) {
      // テーブルAABB上の最近点までの距離
      const nx = Math.max(tb.cx - tb.hw, Math.min(ch.cx, tb.cx + tb.hw));
      const nz = Math.max(tb.cz - tb.hd, Math.min(ch.cz, tb.cz + tb.hd));
      const d = Math.hypot(ch.cx - nx, ch.cz - nz);
      if (d < nearestEdge) { nearestEdge = d; nearest = tb; }
    }
    if (!nearest || nearestEdge > 0.85) continue;   // テーブルに着いていない椅子は対象外
    const dx = nearest.cx - ch.cx, dz = nearest.cz - ch.cz, dl = Math.hypot(dx, dz) || 1;
    const facing = (ch.front.x * dx + ch.front.z * dz) / dl;   // 前面がテーブル中心を向くなら +1
    if (facing < 0.2) {
      add('warn', ch.idx, ch.def.id,
        `椅子が正対すべき${nearest.def.id}(#${nearest.idx})と逆/横を向いている — 対面方向の不整合 (rotY=${ch.it.rotY || 0})`);
    }
  }

  // (8) 動線(導線)チェック — 扉/通路開口の前に通行を塞ぐ床置き什器がないか
  // 壁の各通行開口について、開口幅×CLEAR(室内側)のクリアランス帯に侵入する什器を検出
  const CLEAR = 0.55;   // 確保したい開口前クリアランス[m]
  const W = preset.room.w / 2, D = preset.room.d / 2;
  const obstacles = items.filter(m => m.use.mount === 'floor'
    && !CIRC_IGNORE_CAT.has(m.def.cat) && !CIRC_IGNORE_ID.has(m.def.id) && !PERSON_IDS.has(m.def.id)
    && (m.def.h || 0) >= 0.45);
  for (const w of walls) {
    const dxw = w.x2 - w.x1, dzw = w.z2 - w.z1, len = Math.hypot(dxw, dzw);
    if (len < 1e-6) continue;
    const ux = dxw / len, uz = dzw / len;          // 壁方向(接線)
    const isVertical = Math.abs(ux) < 1e-6;        // x一定の縦壁
    for (const o of (w.ops || [])) {
      if (!isPassage(o.kind)) continue;
      const oc = (o.t != null ? o.t : 0.5) * len, ow = (o.w || 0.9);
      const px = w.x1 + ux * oc, pz = w.z1 + uz * oc;     // 開口中心
      // 室内側(壁の法線方向)を判定。外周壁は室内中心側のみ、間仕切りは両側を検査
      const sides = w.isPartition ? [1, -1] : [Math.sign(-(isVertical ? px : pz)) || 1];
      for (const side of sides) {
        // クリアランス帯のAABB(全壁が軸平行なので軸平行ボックスで表現可)
        let bx0, bx1, bz0, bz1;
        if (isVertical) {
          const nx = side;   // 法線は±x
          bx0 = Math.min(px + nx * 0.05, px + nx * CLEAR); bx1 = Math.max(px + nx * 0.05, px + nx * CLEAR);
          bz0 = pz - ow / 2; bz1 = pz + ow / 2;
        } else {
          const nz = side;   // 法線は±z
          bz0 = Math.min(pz + nz * 0.05, pz + nz * CLEAR); bz1 = Math.max(pz + nz * 0.05, pz + nz * CLEAR);
          bx0 = px - ow / 2; bx1 = px + ow / 2;
        }
        // 外周壁: 室外側(部屋の外)は無視
        const mxb = (bx0 + bx1) / 2, mzb = (bz0 + bz1) / 2;
        if (!w.isPartition && (Math.abs(mxb) > W + 0.02 || Math.abs(mzb) > D + 0.02)) continue;
        for (const m of obstacles) {
          const ox = Math.min(m.cx + m.hw, bx1) - Math.max(m.cx - m.hw, bx0);
          const oz = Math.min(m.cz + m.hd, bz1) - Math.max(m.cz - m.hd, bz0);
          if (ox > 0.12 && oz > 0.12) {
            add('warn', m.idx, m.def.id,
              `${m.def.id} が開口(${o.kind || 'door'})前の通行クリアランスを塞いでいる — 動線阻害`);
          }
        }
      }
    }
  }

  // (9) ユニットバス(bathset): 2枚の固体壁面(局所 -X, -Z)が部屋壁と一体化し、その裏に開口が無いこと
  for (const m of items) {
    if (!UNIT_BATH.has(m.def.id)) continue;
    const r = (m.it.rotY || 0) * Math.PI / 180, cos = Math.cos(r), sin = Math.sin(r);
    // 固体面の外向き法線(world) と中心までの半張り出し
    const faces = [
      { nx: -cos, nz: sin,  off: m.def.w / 2, name: '-X' },   // 局所 -X 面
      { nx: -sin, nz: -cos, off: m.def.d / 2, name: '-Z' },   // 局所 -Z 面
    ];
    for (const f of faces) {
      const fx = m.cx + f.nx * f.off, fz = m.cz + f.nz * f.off;
      const nw = nearestWall(walls, fx, fz);
      if (!nw || nw.dist > 0.35) {
        add('warn', m.idx, m.def.id,
          `ユニットバスの壁面(${f.name})が部屋の壁と一体化していない (壁まで ${nw ? nw.dist.toFixed(2) : '∞'}m) — 角に密着配置を`);
      } else if (nw.inOpening) {
        add('error', m.idx, m.def.id,
          `ユニットバスの壁面(${f.name})の裏に開口(${nw.openingKind || '扉/窓'})がある — 壁面背後に扉/窓を置かない`);
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
