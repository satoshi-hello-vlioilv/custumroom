import { FURNITURE_DEFS } from './catalog.js';
import { COLORS } from './core/helpers.js';

function P(defId, x, z, rot = 0, color) { const def = FURNITURE_DEFS.find(d => d.id === defId); return { defId, x, z, rotY: rot, color: color ?? COLORS[def.colorIdx] }; }
const PRESETS = [
  // ===== アルミ製造工場 (デフォルト) =====
  {
    id: 'aluminum_factory', name: 'アルミ製造工場', icon: 'fa-industry', cat: '工場',
    desc: '20m×16mのアルミニウム生産ライン。溶解炉・大型プレス・CNCマシニングセンタ・産業ロボット・フォークリフト2台を完備した本格的なアルミ製造工場。',
    room: { w: 20, d: 16 }, floorType: 'epoxy', wallType: 'concrete',
    walls: {
      south: [{ t:0.14, w:3.5, kind:'door' }, { t:0.43, w:3.5, kind:'door' }, { t:0.78, w:1.2, kind:'door' }],
      north: [{ t:0.5,  w:1.0, kind:'door' }],
      east:  [{ t:0.22, w:1.5, kind:'window' }, { t:0.47, w:1.5, kind:'window' }, { t:0.72, w:1.5, kind:'window' }],
      west:  [{ t:0.18, w:1.2, kind:'window' }, { t:0.4,  w:1.2, kind:'window' }, { t:0.68, w:1.5, kind:'window' }, { t:0.87, w:1.5, kind:'window' }],
    },
    partitions: [
      // コントロールルーム横仕切り (z=3)
      { x1: -10, z1: 3, x2: -6.5, z2: 3 },
      { x1: -6.5, z1: 3, x2: -5.5, z2: 3, openings: [{ t: 0.5, w: 0.9, kind: 'glass_door' }] },
      { x1: -5.5, z1: 3, x2: -5,   z2: 3 },
      // コントロールルーム縦仕切り (x=-5)
      { x1: -5, z1: 3, x2: -5, z2: 8 },
    ],
    floors: [
      { x1: -10, z1: 3, x2: -5, z2: 8, type: 'tile' },      // コントロールルーム
      { x1:   3, z1: 3, x2: 10, z2: 8, type: 'concrete' },  // 原材料・搬入エリア
    ],
    items: [
      // コントロールルーム
      P('reception',   -7.5, 3.5, 180, '#e8e2d6'),
      P('ctrlpanel',   -9.5, 4.5, 90,  '#e8e2d6'),
      P('ctrlpanel',   -9.5, 6.5, 90,  '#e8e2d6'),
      P('walltv',      -9.5, 5.5, 90,  '#2a2a2a'),
      P('desk',        -6.2, 7.0, 0,   '#f3ece0'),
      P('ochr',        -6.2, 6.3, 0),
      P('sansevieria', -9.5, 7.8),
      // 溶解・加熱炉 (左壁沿い)
      P('ind_furnace', -9.0,  1.5, 90, '#2a2a2a'),
      P('ind_furnace', -9.0, -0.5, 90, '#2a2a2a'),
      // 大型油圧プレス (アルミ圧延・鍛造)
      P('lg_hydpress', -6.5,  1.5, 0),
      P('lg_hydpress', -6.5, -1.0, 0),
      // 射出成形機 (アルミダイキャスト)
      P('inj_molder',  -2.5, 0.5, 0),
      // CNCマシニングセンタ (仕上げ加工)
      P('cnc_center',  1.5,  1.0, 0),
      P('cnc_center',  5.5,  1.0, 0),
      // 大型産業ロボット (CNC前 — 搬入出)
      P('ind_robot',   1.5, -1.2, 0),
      P('ind_robot',   5.5, -1.2, 0),
      // コンベアライン (製造フロー)
      P('conveyor', -4.5, -2.8, 0),
      P('conveyor', -2.0, -2.8, 0),
      P('conveyor',  0.5, -2.8, 0),
      P('conveyor',  3.0, -2.8, 0),
      P('conveyor',  5.5, -2.8, 0),
      P('conveyor',  8.0, -2.8, 0),
      P('conveyor',  9.5, -1.0, 90),
      P('conveyor',  9.5,  1.5, 90),
      // 原材料エリア (右奥) — アルミコイル原反
      P('alumcoil', 4.5, 7.2, 0),
      P('alumcoil', 6.0, 7.2, 0),
      P('alumcoil', 7.5, 7.2, 0),
      P('alumcoil', 4.5, 5.8, 0),
      P('alumcoil', 6.0, 5.8, 0),
      P('steelpallet', 3.5, 6.5, 0),
      P('steelpallet', 9.0, 7.0, 0),
      P('drum', 9.0, 5.5, 0),
      P('drum', 9.0, 4.2, 0),
      // フォークリフト① (原材料搬入)
      P('forklift', 3.0, 4.5, 270),
      // 炉前 原材料待機パレット
      P('steelpallet', -8.0, -2.0, 0),
      P('alumcoil',    -8.5, -2.5, 0),
      // 加工品スクラップ回収
      P('scrpbucket', 1.5, -4.2, 0),
      P('scrpbucket', 5.5, -4.2, 0),
      // 完成品保管・出荷エリア (右前)
      P('palletrack', 9.5, -3.5, 0),
      P('palletrack', 9.5, -5.5, 0),
      P('palletrack', 9.5, -7.5, 0),
      P('steelpallet', 7.0, -3.5, 0),
      P('steelpallet', 7.0, -5.5, 0),
      P('resinpallet', 5.5, -5.8, 0),
      P('drum', 7.5, -7.5, 0),
      P('drum', 8.5, -7.5, 0),
      // フォークリフト② (完成品出荷)
      P('forklift', 5.5, -6.5, 90),
      // 作業台・工具エリア (左前)
      P('workbench', -9.0, -5.0, 90, '#5a6370'),
      P('workbench', -9.0, -7.0, 90, '#5a6370'),
      P('toolcab',   -9.8, -4.0, 90),
      P('toolcab',   -9.8, -6.0, 90),
      P('scrpbucket', -7.0, -7.5, 0),
    ],
  },
  // ===== 商業施設 =====
  {
    id: 'factory_lg', name: '大型工場', icon: 'fa-industry', cat: '工場',
    desc: '18m×14m の本格的な生産フロア。コントロールルーム・CNC・産業ロボット・コンベア・パレットラックを配置。',
    room: { w: 18, d: 14 }, floorType: 'concrete', wallType: 'concrete',
    walls: {
      south: [{ t:0.17, w:3.0, kind:'door' }, { t:0.5, w:3.0, kind:'door' }, { t:0.83, w:1.2, kind:'door' }],
      north: [{ t:0.5,  w:1.0, kind:'door' }],
      east:  [{ t:0.22, w:1.5, kind:'window' }, { t:0.5, w:1.5, kind:'window' }, { t:0.78, w:1.5, kind:'window' }],
      west:  [{ t:0.2,  w:1.2, kind:'window' }, { t:0.45, w:1.2, kind:'window' }, { t:0.72, w:1.5, kind:'window' }],
    },
    partitions: [
      { x1: -9, z1: 2, x2: -6, z2: 2 },
      { x1: -6, z1: 2, x2: -5, z2: 2, openings: [{ t: 0.5, w: 0.9, kind: 'glass_door' }] },
      { x1: -5, z1: 2, x2: -4, z2: 2 },
      { x1: -4, z1: 2, x2: -4, z2: 7 },
    ],
    floors: [
      { x1: -9, z1: 2, x2: -4, z2: 7, type: 'tile' },
    ],
    items: [
      // コントロールルーム
      P('reception',   -6.5, 2.8, 0,   '#e8e2d6'),
      P('ctrlpanel',   -8.7, 3.5, 90,  '#e8e2d6'),
      P('ctrlpanel',   -8.7, 5.2, 90,  '#e8e2d6'),
      P('desk',        -5.4, 5.4, 0,   '#f3ece0'),
      P('ochr',        -5.4, 4.7, 0),
      P('walltv',      -8.7, 4.3, 90,  '#2a2a2a'),
      P('sansevieria', -8.5, 6.5),
      // CNCマシニングセンタ (4台) — 生産フロア奥列
      P('cnc_center', -6.0, -3.8, 0),
      P('cnc_center', -2.0, -3.8, 0),
      P('cnc_center',  2.0, -3.8, 0),
      P('cnc_center',  6.0, -3.8, 0),
      // 大型産業ロボット (4台) — CNC前に1台ずつ配置
      P('ind_robot', -6.0, -1.2, 0),
      P('ind_robot', -2.0, -1.2, 0),
      P('ind_robot',  2.0, -1.2, 0),
      P('ind_robot',  6.0, -1.2, 0),
      // コンベアベルト (搬出ライン)
      P('conveyor',  0.0, -6.0, 0),
      P('conveyor',  2.5, -6.0, 0),
      P('conveyor',  5.0, -6.0, 0),
      P('conveyor',  7.5, -4.5, 90),
      P('conveyor',  7.5, -2.0, 90),
      P('conveyor',  7.5,  0.5, 90),
      // 工業炉 (熱処理エリア)
      P('ind_furnace', -8.0, -5.5, 90, '#2a2a2a'),
      // 作業台エリア (左壁)
      P('workbench', -7.8, -1.5, 90, '#5a6370'),
      P('workbench', -7.8, -4.0, 90, '#5a6370'),
      P('toolcab',   -8.7, -2.6, 90),
      P('toolcab',   -8.7, -5.2, 90),
      // パレットラック列 (右壁)
      P('palletrack', 8.5,  5.5, 0),
      P('palletrack', 8.5,  3.0, 0),
      P('palletrack', 8.5,  0.5, 0),
      P('palletrack', 8.5, -2.0, 0),
      P('palletrack', 8.5, -4.5, 0),
      P('palletrack', 8.5, -6.5, 0),
      // 鉄パレット & ドラム缶 (搬入口付近)
      P('steelpallet', 5.5, -6.5, 0),
      P('steelpallet', 6.8, -6.5, 0),
      P('drum',  5.5, -5.5, 0),
      P('drum',  6.5, -5.5, 0),
    ],
  },
  {
    id: 'office', name: 'オープンオフィス', icon: 'fa-briefcase', cat: 'オフィス',
    desc: '14m×10mのオープンプラン。受付・会議コーナー・執務エリアを完備。',
    room: { w: 14, d: 10 }, floorType: 'carpet', wallType: 'white',
    walls: {
      north: [{ t:0.5, w:2.0, kind:'auto_door' }],
      south: [{ t:0.5, w:1.0, kind:'door' }],
      east:  [{ t:0.2, w:1.2, kind:'window' }, { t:0.5, w:1.2, kind:'window' }, { t:0.8, w:1.2, kind:'window' }],
      west:  [{ t:0.2, w:1.2, kind:'window' }, { t:0.5, w:1.2, kind:'window' }, { t:0.8, w:1.2, kind:'window' }],
    },
    partitions: [
      { x1: 2, z1: -5, x2: 2, z2: 1.0 },
      { x1: 2, z1: 1.0, x2: 2, z2: 2.0, openings: [{ t: 0.5, w: 0.9, kind: 'glass_door' }] },
      { x1: 2, z1: 2.0, x2: 2, z2: 5 },
      { x1: 2, z1: 1.0, x2: 7, z2: 1.0 },
    ],
    floors: [
      { x1: -7, z1: 3.5, x2: 7, z2: 5,   type: 'genkan' },
      { x1:  2, z1: -5,  x2: 7, z2: 1.0,  type: 'carpet' },
    ],
    items: [
      // 受付エリア
      P('reception',  -1.5,  4.6, 180, '#f3ece0'),
      P('ficus_umb',  -5.5,  4.5),
      P('monstera',    4.5,  4.5),
      P('sofa3',      -4.0,  2.8,   0, '#6f9e74'),
      P('ctable',     -4.0,  1.9),
      // 執務エリア (左)
      P('desk',  -5.5, -0.5, 180, '#f3ece0'), P('ochr', -5.5, 0.2, 0),
      P('desk',  -5.5, -2.0, 180, '#f3ece0'), P('ochr', -5.5,-1.3, 0),
      P('desk',  -5.5, -3.5, 180, '#f3ece0'), P('ochr', -5.5,-2.8, 0),
      P('desk',  -2.5, -0.5,   0, '#f3ece0'), P('ochr', -2.5,-1.2, 180),
      P('desk',  -2.5, -2.0,   0, '#f3ece0'), P('ochr', -2.5,-2.7, 180),
      P('desk',  -2.5, -3.5,   0, '#f3ece0'), P('ochr', -2.5,-4.2, 180),
      P('filingcab', -6.7, -1.0, 90, '#7a8fa0'),
      P('filingcab', -6.7, -2.5, 90, '#7a8fa0'),
      P('filingcab', -6.7, -4.0, 90, '#7a8fa0'),
      // 会議コーナー (右)
      P('conftable',  4.5, -1.5, 0, '#8a5a2b'),
      P('dchr', 3.2, -1.5, 90, '#5b5048'), P('dchr', 5.8, -1.5, 270, '#5b5048'),
      P('dchr', 4.5, -2.5,  0, '#5b5048'), P('dchr', 4.5, -0.5, 180, '#5b5048'),
      P('dchr', 3.2, -2.5, 90, '#5b5048'), P('dchr', 5.8, -2.5, 270, '#5b5048'),
      P('dchr', 3.2, -0.5, 90, '#5b5048'), P('dchr', 5.8, -0.5, 270, '#5b5048'),
      P('whiteboard', 6.8, -3.8, 90),
      P('walltv',     6.8,  0.3, 90),
      P('benjamin',   6.5, -4.5),
    ],
  },
  {
    id: 'conference', name: '会議室', icon: 'fa-chalkboard-user', cat: 'オフィス',
    desc: '8m×6mの中規模会議室。大型テーブル・ホワイトボード・プレゼン用TVを配置。',
    room: { w: 8, d: 6 }, floorType: 'carpet', wallType: 'white',
    walls: {
      north: [{ t:0.5, w:1.0, kind:'door' }],
      east:  [{ t:0.3, w:1.2, kind:'window' }, { t:0.7, w:1.2, kind:'window' }],
      west:  [{ t:0.3, w:1.2, kind:'window' }, { t:0.7, w:1.2, kind:'window' }],
    },
    partitions: [],
    items: [
      P('conftable', 0, 0, 0, '#8a5a2b'),
      P('dchr', -1.9, -0.6,  90, '#5b5048'), P('dchr', -1.9,  0.6,  90, '#5b5048'),
      P('dchr',  1.9, -0.6, 270, '#5b5048'), P('dchr',  1.9,  0.6, 270, '#5b5048'),
      P('dchr', -0.6, -0.6,   0, '#5b5048'), P('dchr',  0.6, -0.6,   0, '#5b5048'),
      P('dchr', -0.6,  0.6, 180, '#5b5048'), P('dchr',  0.6,  0.6, 180, '#5b5048'),
      P('whiteboard', -3.7, 0.8, 90),
      P('walltv',      3.7, 0.0, 270, '#2a2a2a'),
      P('filingcab',  -3.6, -2.5, 0, '#7a8fa0'),
      P('filingcab',  -2.7, -2.5, 0, '#7a8fa0'),
      P('sansevieria', 3.5, -2.5),
      P('zzplant',     3.5,  2.5),
      P('desklamp',    0.0,  0.0, 0, '#2a2a2a'),
    ],
  },
  {
    id: 'museum', name: '博物館展示室', icon: 'fa-landmark', cat: '特殊',
    desc: '16m×12mの展示ホール。展示ケース・台座・解説パネルを配置した開放的なギャラリー。',
    room: { w: 16, d: 12 }, floorType: 'marble', wallType: 'white',
    walls: {
      north: [{ t:0.33, w:2.0, kind:'auto_door' }, { t:0.67, w:2.0, kind:'auto_door' }],
      east:  [{ t:0.25, w:1.5, kind:'window' }, { t:0.6, w:1.5, kind:'window' }],
      west:  [{ t:0.25, w:1.5, kind:'window' }, { t:0.6, w:1.5, kind:'window' }],
    },
    partitions: [
      { x1: -8, z1: 3.5, x2: -0.6, z2: 3.5 },
      { x1: -0.6, z1: 3.5, x2: 0.6, z2: 3.5, openings: [{ t: 0.5, w: 1.0, kind: 'auto_door' }] },
      { x1:  0.6, z1: 3.5, x2:  8, z2: 3.5 },
    ],
    floors: [
      { x1: -8, z1: 3.5, x2: 8, z2: 6, type: 'tile' },
    ],
    items: [
      // エントランス
      P('reception', 0, 5.5, 180, '#f3ece0'),
      P('strelitzia', -6.5, 5.5), P('strelitzia', 6.5, 5.5),
      P('infopanel', -6.5, 3.8, 0, '#f2eee8'),
      P('infopanel',  6.5, 3.8, 0, '#f2eee8'),
      // 第1展示列
      P('displaycase', -5.5, 0.5, 0), P('displaycase', -5.5, -2.5, 0),
      P('displaycase',  5.5, 0.5, 0), P('displaycase',  5.5, -2.5, 0),
      P('infopanel',   -5.5, 2.0, 0), P('infopanel',    5.5, 2.0, 0),
      P('infopanel',   -5.5,-1.0, 0), P('infopanel',    5.5,-1.0, 0),
      // 中央展示
      P('pedestal', -1.8, -0.5, 0, '#c8c0b4'),
      P('pedestal',  1.8, -0.5, 0, '#c8c0b4'),
      P('pedestal',  0.0,  1.5, 0, '#c8c0b4'),
      // 奥の展示
      P('displaycase', -2.5, -4.5, 0), P('displaycase',  2.5, -4.5, 0),
      P('displaycase',  0.0, -4.5, 0),
      P('infopanel',   -4.5, -5.5, 180), P('infopanel', 4.5, -5.5, 180),
      P('ficus_umb', -7.5, -5.0), P('ficus_umb', 7.5, -5.0),
      P('lamp',  -7.5,  0.0), P('lamp',   7.5, 0.0),
    ],
  },
  {
    id: 'convenience', name: 'コンビニエンスストア', icon: 'fa-store', cat: '店舗',
    desc: '12m×8mの小型コンビニ。商品棚・ショーケース冷蔵庫・レジカウンターを配置。',
    room: { w: 12, d: 8 }, floorType: 'tile', wallType: 'white',
    walls: {
      north: [{ t:0.3,  w:1.5, kind:'auto_door' }, { t:0.65, w:1.5, kind:'auto_door' }],
      south: [{ t:0.2,  w:2.0, kind:'door' }],
      east:  [{ t:0.35, w:1.2, kind:'window' }, { t:0.7,  w:1.2, kind:'window' }],
    },
    partitions: [
      { x1: -6, z1: -1.5, x2:  3, z2: -1.5 },
      { x1:  3, z1: -1.5, x2:  4, z2: -1.5, openings: [{ t: 0.5, w: 0.9, kind: 'door' }] },
      { x1:  4, z1: -1.5, x2:  6, z2: -1.5 },
    ],
    floors: [
      { x1: -6, z1: -4, x2: 6, z2: -1.5, type: 'concrete' },
    ],
    items: [
      // レジカウンター (入口付近)
      P('register',  2.0, 3.0, 180, '#f3ece0'),
      P('register',  3.5, 3.0, 180, '#f3ece0'),
      P('ctrlpanel', 5.5, 2.5, 270, '#e8e2d6'),
      // 商品棚 (中央通路)
      P('shelfrack', -4.0, -0.2,   0, '#e0d8cc'),
      P('shelfrack', -2.5, -0.2,   0, '#e0d8cc'),
      P('shelfrack', -1.0, -0.2,   0, '#e0d8cc'),
      P('shelfrack',  0.5, -0.2,   0, '#e0d8cc'),
      P('shelfrack', -4.0,  1.5, 180, '#e0d8cc'),
      P('shelfrack', -2.5,  1.5, 180, '#e0d8cc'),
      P('shelfrack', -1.0,  1.5, 180, '#e0d8cc'),
      P('shelfrack',  0.5,  1.5, 180, '#e0d8cc'),
      // ショーケース冷蔵庫 (奥の壁)
      P('showcasefridge', -4.5, -3.6, 0, '#d8d0c4'),
      P('showcasefridge', -3.0, -3.6, 0, '#d8d0c4'),
      P('showcasefridge', -1.5, -3.6, 0, '#d8d0c4'),
      P('showcasefridge',  0.0, -3.6, 0, '#d8d0c4'),
      P('showcasefridge',  1.5, -3.6, 0, '#d8d0c4'),
      // 雑誌棚 (右壁)
      P('shelfrack',  5.5,  1.0, 270, '#e0d8cc'),
      P('shelfrack',  5.5, -0.5, 270, '#e0d8cc'),
      P('bamboo', -5.5, 3.5),
    ],
  },
  {
    id: 'restaurant', name: 'レストラン', icon: 'fa-utensils', cat: '店舗',
    desc: '12m×10mのダイニングレストラン。テーブル6卓・カウンター席・厨房エリアを配置。',
    room: { w: 12, d: 10 }, floorType: 'wood', wallType: 'cream',
    walls: {
      north: [{ t:0.5,  w:1.5, kind:'double_door' }],
      east:  [{ t:0.25, w:1.2, kind:'window' }, { t:0.55, w:1.2, kind:'window' }, { t:0.82, w:1.2, kind:'window' }],
      west:  [{ t:0.25, w:1.2, kind:'window' }, { t:0.55, w:1.2, kind:'window' }, { t:0.82, w:1.2, kind:'window' }],
    },
    partitions: [
      { x1: -6, z1: -2.5, x2: 0.5, z2: -2.5 },
      { x1: 0.5, z1: -2.5, x2: 2, z2: -2.5, openings: [{ t: 0.5, w: 1.2, kind: 'double_door' }] },
      { x1:  2, z1: -2.5, x2:  6,  z2: -2.5 },
    ],
    floors: [
      { x1: -6, z1: -5, x2: 6, z2: -2.5, type: 'tile' },
    ],
    items: [
      // 厨房 (奥)
      P('kitchen',  -1.5, -4.6, 0,  '#e8e2d6'),
      P('stove',     1.2, -4.6, 0,  '#3a332b'),
      P('fridge',    2.7, -4.5, 0,  '#e8e2d6'),
      P('cupboard', -4.0, -4.6, 0,  '#f3ece0'),
      P('microwave',-3.5, -4.6, 0),
      // カウンター席
      P('barcounter', -4.5, -2.2, 0, '#5b3a22'),
      P('barstool', -5.2, -1.5, 0, '#5b5048'),
      P('barstool', -4.5, -1.5, 0, '#5b5048'),
      P('barstool', -3.8, -1.5, 0, '#5b5048'),
      // ダイニングテーブル
      // 手前3卓 (レストランチェア)
      P('roundtable', -3.5, 0.5, 0, '#8a5a2b'),
      P('upholchr', -4.3, 0.5, 90, '#6a4030'), P('upholchr', -2.7, 0.5, 270, '#6a4030'),
      P('upholchr', -3.5,-0.3,  0, '#6a4030'), P('upholchr', -3.5, 1.3, 180, '#6a4030'),
      P('roundtable', -0.5, 0.5, 0, '#8a5a2b'),
      P('upholchr', -1.3, 0.5, 90, '#6a4030'), P('upholchr',  0.3, 0.5, 270, '#6a4030'),
      P('upholchr', -0.5,-0.3,  0, '#6a4030'), P('upholchr', -0.5, 1.3, 180, '#6a4030'),
      P('roundtable',  2.5, 0.5, 0, '#8a5a2b'),
      P('upholchr',  1.7, 0.5, 90, '#6a4030'), P('upholchr',  3.3, 0.5, 270, '#6a4030'),
      P('upholchr',  2.5,-0.3,  0, '#6a4030'), P('upholchr',  2.5, 1.3, 180, '#6a4030'),
      // 奥3卓 (ウィンザーチェア)
      P('roundtable', -3.5, 3.0, 0, '#8a5a2b'),
      P('windsorchair', -4.3, 3.0, 90, '#5b5048'), P('windsorchair', -2.7, 3.0, 270, '#5b5048'),
      P('windsorchair', -3.5, 2.2,  0, '#5b5048'), P('windsorchair', -3.5, 3.8, 180, '#5b5048'),
      P('roundtable',  0.0, 3.0, 0, '#8a5a2b'),
      P('windsorchair', -0.8, 3.0, 90, '#5b5048'), P('windsorchair',  0.8, 3.0, 270, '#5b5048'),
      P('windsorchair',  0.0, 2.2,  0, '#5b5048'), P('windsorchair',  0.0, 3.8, 180, '#5b5048'),
      P('roundtable',  3.5, 3.0, 0, '#8a5a2b'),
      P('windsorchair',  2.7, 3.0, 90, '#5b5048'), P('windsorchair',  4.3, 3.0, 270, '#5b5048'),
      P('windsorchair',  3.5, 2.2,  0, '#5b5048'), P('windsorchair',  3.5, 3.8, 180, '#5b5048'),
      P('strelitzia', -5.5,  4.5), P('ficus_umb', 5.5,  4.5),
      P('lamp',  -5.5, -1.0), P('lamp',  5.5, -1.0),
      P('rug',    0.0,  1.5, 0, '#5b5048'),
    ],
  },
  {
    id: 'cafe', name: 'カフェ', icon: 'fa-mug-hot', cat: '店舗',
    desc: '10m×8mのおしゃれカフェ。バーカウンター・バースツール・小テーブルを配置。',
    room: { w: 10, d: 8 }, floorType: 'wood', wallType: 'cream',
    walls: {
      north: [{ t:0.22, w:1.4, kind:'window' }, { t:0.5, w:1.4, kind:'glass_door' }, { t:0.78, w:1.4, kind:'window' }],
      east:  [{ t:0.35, w:1.2, kind:'window' }, { t:0.7, w:1.2, kind:'window' }],
      west:  [{ t:0.35, w:1.2, kind:'window' }, { t:0.7, w:1.2, kind:'window' }],
    },
    partitions: [
      { x1: -5, z1: -1.5, x2:  1.5, z2: -1.5 },
      { x1: 1.5, z1: -1.5, x2: 3, z2: -1.5, openings: [{ t: 0.5, w: 0.9, kind: 'door' }] },
      { x1:  3, z1: -1.5, x2:  5,   z2: -1.5 },
    ],
    floors: [
      { x1: -5, z1: -4, x2: 5, z2: -1.5, type: 'tile' },
    ],
    items: [
      // バックキッチン
      P('kitchen',   0.0, -3.7, 0, '#e8e2d6'),
      P('fridge',    2.5, -3.6, 0, '#e8e2d6'),
      P('microwave', 2.0, -3.6, 0),
      P('ricecook',  1.5, -3.6, 0),
      // バーカウンター
      P('barcounter',  0.0, -1.2, 0, '#5b3a22'),
      P('barcounter', -3.6, -1.2, 90, '#5b3a22'),
      P('barstool', -1.0, -0.4, 0, '#5b5048'),
      P('barstool',  0.0, -0.4, 0, '#5b5048'),
      P('barstool',  1.0, -0.4, 0, '#5b5048'),
      // 小テーブル (テラス席イメージ)
      P('cafetable', -3.0, 1.0, 0), P('cafechr', -3.8, 1.0, 90, '#6a4830'), P('cafechr', -2.2, 1.0, 270, '#6a4830'),
      P('cafetable', -0.5, 1.0, 0), P('cafechr', -1.3, 1.0, 90, '#6a4830'), P('cafechr',  0.3, 1.0, 270, '#6a4830'),
      P('cafetable',  2.0, 1.0, 0), P('cafechr',  1.2, 1.0, 90, '#6a4830'), P('cafechr',  2.8, 1.0, 270, '#6a4830'),
      P('cafetable', -3.0, 3.0, 0), P('cafechr', -3.8, 3.0, 90, '#6a4830'), P('cafechr', -2.2, 3.0, 270, '#6a4830'),
      P('cafetable',  0.0, 3.0, 0), P('cafechr', -0.8, 3.0, 90, '#6a4830'), P('cafechr',  0.8, 3.0, 270, '#6a4830'),
      P('sofa3',   3.5, 2.5, 270, '#b9714a'),
      P('ctable',  4.3, 1.5, 0),
      P('rug',     3.8, 1.8, 0, '#5b5048'),
      P('olive',  -4.5, 3.8), P('dracaena', 4.5, 3.8),
      P('bamboo', -4.8, -0.3), P('pothos', 4.3, 3.8),
      P('lamp',  -4.5, -0.5), P('lamp', 4.5, -0.5),
      P('shelf',  4.6, 0.5, 270, '#8a5a2b'),
    ],
  },
  {
    id: 'laboratory', name: '実験室', icon: 'fa-flask', cat: '特殊',
    desc: '12m×9mの化学実験室。実験台・ドラフトチャンバー・薬品棚・顕微鏡・遠心分離機を完備。',
    room: { w: 12, d: 9 }, floorType: 'tile', wallType: 'white',
    walls: {
      north: [{ t:0.5,  w:1.2, kind:'lab_door' }],
      east:  [{ t:0.2,  w:1.2, kind:'window' }, { t:0.5, w:1.2, kind:'window' }, { t:0.8, w:1.2, kind:'window' }],
      west:  [{ t:0.33, w:1.2, kind:'window' }, { t:0.67, w:1.2, kind:'window' }],
    },
    partitions: [
      { x1: -6, z1: 1.5, x2: -0.6, z2: 1.5 },
      { x1: -0.6, z1: 1.5, x2: 0.6, z2: 1.5, openings: [{ t: 0.5, w: 1.0, kind: 'lab_door' }] },
      { x1: 0.6, z1: 1.5, x2: 6, z2: 1.5 },
    ],
    floors: [
      { x1: -6, z1: 1.5, x2: 6, z2: 4.5, type: 'genkan' },
    ],
    items: [
      // ドラフトチャンバー (奥の壁沿い)
      P('fumehood', -4.5, -3.6, 0, '#e8e2d6'),
      P('fumehood', -2.9, -3.6, 0, '#e8e2d6'),
      // 右壁 — 薬品棚・分析機器列
      P('chemshelf', 5.4, -3.2, 270, '#f3ece0'),
      P('hplc',      5.4, -1.6, 270, '#e8e2d6'),
      P('laboven',   5.4, -0.2, 270, '#e8e2d6'),
      P('incubator', 5.4,  1.0, 270, '#e8e2d6'),
      // 中央の島型実験台 (両面)
      P('labbench', -1.5, -1.5, 0, '#f3ece0'),
      P('labbench', -1.5,  0.2, 180, '#f3ece0'),
      P('labbench',  2.5, -1.5, 0, '#f3ece0'),
      P('labbench',  2.5,  0.2, 180, '#f3ece0'),
      // 実験台上の機器
      P('microscope', -2.2, -1.6, 0, '#2a2e34'),
      P('microscope', -0.8, -1.6, 0, '#2a2e34'),
      P('centrifuge',  1.8, -1.6, 0, '#e8e2d6'),
      P('analbalance', 3.2, -1.6, 0, '#e8e2d6'),
      P('glassware',  -2.2,  0.2, 180),
      P('glassware',   1.8,  0.2, 180),
      P('oscilloscope', 3.0, 0.2, 180, '#2a2e34'),
      // 左壁の作業エリア
      P('labbench', -5.0, -1.0, 90, '#f3ece0'),
      P('microscope', -5.2, -1.6, 90, '#2a2e34'),
      P('centrifuge', -5.2, -0.4, 90, '#e8e2d6'),
      // 入口側の打合せ＆収納
      P('whiteboard', -5.7, 3.0, 90),
      P('filingcab', 4.8, 2.4, 0, '#7a8fa0'),
      P('filingcab', 5.3, 2.4, 0, '#7a8fa0'),
      P('handbasin', -5.6, 0.6, 90, '#e8e2d6'),
      P('rhapis', -5.4, 4.0), P('dracaena', 5.4, 4.0),
    ],
  },
  {
    id: 'testroom', name: '試験室', icon: 'fa-gauge-high', cat: '特殊',
    desc: '11m×8mの計測・試験室。測定試験機・オシロスコープ・電子天秤・恒温槽で精密測定。',
    room: { w: 11, d: 8 }, floorType: 'tile', wallType: 'white',
    walls: {
      north: [{ t:0.5,  w:1.0, kind:'door' }],
      east:  [{ t:0.22, w:1.2, kind:'window' }, { t:0.52, w:1.2, kind:'window' }, { t:0.8, w:1.2, kind:'window' }],
      west:  [{ t:0.28, w:1.2, kind:'window' }, { t:0.65, w:1.2, kind:'window' }],
    },
    partitions: [
      { x1: 1.5, z1: -4, x2: 1.5, z2: -0.5 },
      { x1: 1.5, z1: -0.5, x2: 1.5, z2: 0.5, openings: [{ t: 0.5, w: 0.9, kind: 'door' }] },
      { x1: 1.5, z1: 0.5, x2: 1.5, z2: 4 },
    ],
    floors: [
      { x1: 1.5, z1: -4, x2: 5.5, z2: 4, type: 'concrete' },
    ],
    items: [
      // 計測ラック列 (奥の壁)
      P('testbench', -4.5, -3.4, 0, '#3a4250'),
      P('testbench', -3.5, -3.4, 0, '#3a4250'),
      P('testbench', -2.5, -3.4, 0, '#3a4250'),
      P('testbench', -1.5, -3.4, 0, '#3a4250'),
      P('ctrlpanel',  -0.3, -3.3, 0, '#3a4250'),
      // 計測作業台
      P('labbench', -3.5, -0.8, 0, '#f3ece0'),
      P('oscilloscope', -4.2, -0.9, 0, '#2a2e34'),
      P('oscilloscope', -3.0, -0.9, 0, '#2a2e34'),
      P('analbalance', -2.2, -0.9, 0, '#e8e2d6'),
      P('labbench', -3.5,  1.2, 180, '#f3ece0'),
      P('microscope', -4.0, 1.2, 180, '#2a2e34'),
      P('glassware',  -2.5, 1.2, 180),
      // デスク作業
      P('desk', -5.2, 2.6, 90, '#f3ece0'), P('ochr', -4.4, 2.6, 270),
      P('whiteboard', -5.7, 0.0, 90),
      // 防振定盤エリア (右区画)
      P('conftable', 3.5, -1.5, 0, '#3a4250'),
      P('microscope', 2.8, -1.6, 0, '#2a2e34'),
      P('centrifuge', 4.2, -1.6, 0, '#e8e2d6'),
      P('testbench', 5.0, 2.5, 270, '#3a4250'),
      P('testbench', 5.0, 1.5, 270, '#3a4250'),
      P('filingcab', 2.2, 3.4, 0, '#7a8fa0'),
      P('filingcab', 2.7, 3.4, 0, '#7a8fa0'),
      // 精密計測機器 (右区画 追加)
      P('tensile',   5.0,  0.0, 270, '#3a4250'),
      P('laboven',   3.5,  2.8, 0,   '#e8e2d6'),
      P('incubator', 4.5,  2.5, 270, '#e8e2d6'),
      P('zzplant', 4.8, 3.4), P('sansevieria', -5.2, -3.2),
    ],
  },
  {
    id: 'machineshop', name: '加工室', icon: 'fa-gears', cat: '工場',
    desc: '14m×10mの機械加工室。旋盤・フライス盤・ボール盤・グラインダー・工具ラックを完備。',
    room: { w: 14, d: 10 }, floorType: 'concrete', wallType: 'concrete',
    walls: {
      north: [{ t:0.5,  w:1.2, kind:'door' }],
      south: [{ t:0.25, w:3.0, kind:'door' }, { t:0.72, w:1.2, kind:'door' }],
      east:  [{ t:0.22, w:1.5, kind:'window' }, { t:0.5, w:1.5, kind:'window' }, { t:0.78, w:1.5, kind:'window' }],
      west:  [{ t:0.3,  w:1.2, kind:'window' }, { t:0.65, w:1.2, kind:'window' }],
    },
    partitions: [
      { x1: -7, z1: 2.5, x2: -2.5, z2: 2.5, openings: [{ t: 0.85, w: 0.9, kind: 'door' }] },
      { x1: -2.5, z1: 2.5, x2: -2.5, z2: 5 },
    ],
    floors: [
      { x1: -7, z1: 2.5, x2: -2.5, z2: 5, type: 'tile' },
    ],
    items: [
      // 旋盤列 (奥)
      P('lathe', -4.5, -3.8, 0, '#4f7a52'),
      P('lathe', -1.5, -3.8, 0, '#4f7a52'),
      P('lathe',  1.5, -3.8, 0, '#4f7a52'),
      P('lathe',  4.5, -3.8, 0, '#4f7a52'),
      // フライス盤列 (中央)
      P('milling', -4.0, -1.0, 0, '#4f7a52'),
      P('milling', -1.5, -1.0, 0, '#4f7a52'),
      P('milling',  1.0, -1.0, 0, '#4f7a52'),
      P('milling',  3.5, -1.0, 0, '#4f7a52'),
      // ボール盤＆グラインダー (右壁)
      P('drillpress', 6.0, -2.5, 270, '#4f7a52'),
      P('drillpress', 6.0, -1.2, 270, '#4f7a52'),
      P('grinder',    6.2,  0.2, 270, '#4f7a52'),
      P('grinder',    6.2,  1.4, 270, '#4f7a52'),
      // 作業台＆工具エリア (手前)
      P('workbench', -4.5, 1.5, 0, '#5a6370'),
      P('workbench', -2.0, 1.5, 0, '#5a6370'),
      P('toolrack',  -4.5, 0.3, 0, '#3a3f47'),
      P('toolrack',  -2.0, 0.3, 0, '#3a3f47'),
      P('toolcab',   -0.5, 1.6, 0, '#c0392b'),
      P('toolcab',    0.5, 1.6, 0, '#c0392b'),
      P('palletrack', 2.5, 3.5, 90),
      P('palletrack', 5.0, 3.5, 90),
      // 帯鋸・溶接・工業炉 (追加機械)
      P('bandsaw',    6.5,  2.5, 270, '#4f7a52'),
      P('welder',     5.5,  2.0, 0,   '#3a4a5a'),
      P('ind_furnace', 1.5,  4.0, 0,  '#2a2a2a'),
      // 管理コーナー (左仕切り内)
      P('desk',  -5.8, 3.6, 0, '#f3ece0'), P('ochr', -5.8, 2.9, 0),
      P('ctrlpanel', -3.2, 3.4, 180, '#e8e2d6'),
      P('sansevieria', -6.2, 4.4),
    ],
  },
  // ===== 住宅 =====
  {
    id: 'studio', name: 'ワンルーム (1R)', icon: 'fa-cube', cat: '住宅',
    desc: 'コンパクトな単身向けレイアウト。ベッド・デスク・くつろぎスペースを集約。',
    room: { w: 6, d: 5 },
    walls: {
      north: [{ t:0.5, w:0.9, kind:'door' }],
      east:  [{ t:0.5, w:1.0, kind:'window' }],
      west:  [{ t:0.5, w:1.0, kind:'window' }],
      south: [{ t:0.5, w:1.2, kind:'window' }],
    },
    partitions: [],
    items: [
      P('sbed', -2.0, -1.2, 0, '#5b86b8'), P('stable', -2.0, 0.4),
      P('wardrobe', -2.5, 1.6, 90), P('desk', 1.6, -2.0, 180),
      P('ochr', 1.6, -1.4, 0), P('desklamp', 1.6, -2.0, 180, '#2a2a2a'),
      P('shelf', -0.2, -2.2, 0), P('pothos', -0.2, -2.2, 0),
      P('sofa1', 1.9, 1.4, 270, '#6f9e74'), P('ctable', 0.9, 1.4),
      P('tablelamp', 0.9, 1.4), P('rug', 1.0, 1.0, 0, '#3f5d7a'),
      P('dracaena', 2.6, -1.9), P('lamp', 2.6, 1.9),
    ],
  },
  {
    id: 'family', name: 'ファミリーホーム', icon: 'fa-house-user', cat: '住宅',
    desc: '玄関〜水回り〜LDK〜寝室を備えた一戸建てプラン。家族向けのフル装備レイアウト。',
    room: { w: 12, d: 10 },
    walls: {
      north: [{ t:0.15, w:0.9, kind:'door' }],
      east:  [{ t:0.12, w:1.2, kind:'window' }, { t:0.4, w:1.2, kind:'window' }, { t:0.65, w:1.2, kind:'window' }, { t:0.85, w:1.2, kind:'window' }],
      south: [{ t:0.75, w:1.2, kind:'window' }],
      west:  [{ t:0.12, w:0.8, kind:'window' }, { t:0.42, w:0.8, kind:'window' }, { t:0.68, w:0.8, kind:'window' }],
    },
    partitions: [
      // 左ゾーン縦仕切り (水回り/玄関 と 中央LDK を分ける)
      { x1: -2.5, z1: -5.0, x2: -2.5, z2: -1.0 },
      { x1: -2.5, z1: -1.0, x2: -2.5, z2: 0.0, openings: [{ t: 0.5, w: 0.9, kind: 'fusuma' }] },
      { x1: -2.5, z1: 0.0, x2: -2.5, z2: 5.0 },
      // 左ゾーン内の横仕切り (浴室 / 洗面所 / トイレ / 玄関)
      { x1: -6.0, z1: -2.0, x2: -2.5, z2: -2.0, openings: [{ t: 0.2, w: 0.8, kind: 'bath_door' }] },
      { x1: -6.0, z1: 1.0, x2: -2.5, z2: 1.0, openings: [{ t: 0.2, w: 0.8, kind: 'toilet_door' }] },
      { x1: -6.0, z1: 2.6, x2: -2.5, z2: 2.6, openings: [{ t: 0.75, w: 0.8, kind: 'door' }] },
      // 中央↔右 (LDK と 寝室/リビング) 縦仕切り
      { x1: 2.0, z1: -5.0, x2: 2.0, z2: -2.6 },
      { x1: 2.0, z1: -2.6, x2: 2.0, z2: -1.5, openings: [{ t: 0.5, w: 0.9, kind: 'fusuma' }] },
      { x1: 2.0, z1: -1.5, x2: 2.0, z2: 0.5, openings: [{ t: 0.5, w: 0.9, kind: 'shoji' }] },
      // 寝室の横仕切り
      { x1: 2.0, z1: -2.6, x2: 4.5, z2: -2.6 },
    ],
    floors: [
      { x1: -6, z1: 2.6, x2: -2.5, z2: 5,  type: 'genkan' }, // 玄関
      { x1: -6, z1: -5,  x2: -2.5, z2: -2, type: 'tile' },   // 浴室
      { x1: -6, z1: -2,  x2: -2.5, z2: 1,  type: 'tile' },   // 洗面所
      { x1: -6, z1: 1,   x2: -2.5, z2: 2.6,type: 'tile' },   // トイレ
      { x1: -2.5, z1: -5,x2: 2,    z2: -3, type: 'tile' },   // キッチン
      { x1: -2.5, z1: -3,x2: 2,    z2: 5,  type: 'wood' },   // ダイニング
      { x1: 2, z1: -2.6, x2: 6,    z2: 5,  type: 'wood' },   // リビング
      { x1: 2, z1: -5,   x2: 6,    z2: -2.6,type: 'wood' },  // 寝室
    ],
    items: [
      // 玄関 (左下)
      P('shoebox', -5.5, 4.6, 0, '#5b5048'), P('olive', -3.0, 4.6),
      // トイレ (左中)
      P('toilet', -5.5, 1.6, 90, '#e8e2d6'), P('handbasin', -5.7, 2.4, 90),
      // 洗面所 (左)
      P('vanity', -5.6, -0.6, 90, '#e8e2d6'), P('washer', -3.0, -1.4, 0, '#e8e2d6'),
      // 浴室 (左上)
      P('bathset', -4.6, -3.9, 0, '#e8e2d6'),
      // キッチン (中央上) — システムキッチン壁付け
      P('kitchen', -1.0, -4.6, 0, '#e8e2d6'),
      P('stove', 0.9, -4.6, 0, '#3a332b'),
      P('fridge', 1.5, -4.4, 0, '#e8e2d6'),
      P('cupboard', -2.0, -4.6, 0, '#f3ece0'),
      P('microwave', -1.6, -4.6, 0), P('ricecook', -1.0, -4.6, 0),
      // ダイニング (中央)
      P('dtable', -0.4, -1.4, 0, '#8a5a2b'),
      P('dchr', -1.3, -1.4, 90, '#5b5048'), P('dchr', 0.5, -1.4, 270, '#5b5048'),
      P('dchr', -0.4, -2.1, 0, '#5b5048'), P('dchr', -0.4, -0.7, 180, '#5b5048'),
      // リビング (右)
      P('sofa3', 3.4, 3.6, 180, '#b9714a'), P('sofa1', 5.2, 2.4, 270, '#b9714a'),
      P('ctable', 3.4, 2.4, 0), P('rug', 3.6, 2.6, 0, '#5b5048'),
      P('walltv', 3.6, 0.0, 0, '#3a332b'),
      P('lamp', 5.5, 4.4), P('monstera', 5.5, 0.3),
      // 寝室 (右上)
      P('dbed', 4.2, -3.9, 0, '#5b86b8'), P('stable', 2.7, -4.6),
      P('closet', 5.0, -2.9, 180, '#f3ece0'), P('zzplant', 2.6, -2.9),
    ],
  },
];

export { P, PRESETS };
