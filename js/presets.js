import { FURNITURE_DEFS } from './catalog.js';
import { COLORS } from './core/helpers.js';

function P(defId, x, z, rot = 0, color, y) { const def = FURNITURE_DEFS.find(d => d.id === defId); const o = { defId, x, z, rotY: rot, color: color ?? COLORS[def.colorIdx] }; if (y != null) o.y = y; return o; }
const PRESETS = [
  // ===== アルミ製造工場 (デフォルト) =====
  {
    id: 'aluminum_factory', name: 'アルミ製造工場', icon: 'fa-industry', cat: '工場',
    desc: '28m×22mのアルミニウム生産ライン。西→東への一貫生産フロー（原材料→溶解炉→油圧プレス→CNC加工→出荷）。全生産機械は南向き(rotY=0)で統一し、ロボットは各機械の正面（南側）に配置。コントロールルーム・ダイキャストライン・原材料倉庫・完成品出荷エリアを完備した本格的なアルミ製造工場。',
    room: { w: 28, d: 22 }, floorType: 'epoxy', wallType: 'concrete',
    walls: {
      south: [
        // t=0.10の搬入シャッターは撤去(SW制御室の真裏に当たり受付/ロッカーと干渉。搬入はt=0.40で確保)
        { t:0.40, w:4.5, kind:'door' },
        { t:0.78, w:1.2, kind:'door' },
      ],
      north: [{ t:0.5, w:1.0, kind:'door' }],
      east:  [
        { t:0.2, w:1.5, kind:'window' },
        { t:0.5, w:1.5, kind:'window' },
        { t:0.8, w:1.5, kind:'window' },
      ],
      west:  [
        { t:0.15, w:1.2, kind:'window' },
        { t:0.38, w:1.2, kind:'window' },
        { t:0.60, w:1.5, kind:'window' },
        { t:0.83, w:1.5, kind:'window' },
      ],
    },
    partitions: [
      // コントロールルーム横仕切り (z=-5): x=-14 to x=-8
      { x1: -14, z1: -5, x2: -11.0, z2: -5 },
      { x1: -11.0, z1: -5, x2: -10.0, z2: -5, openings: [{ t: 0.5, w: 0.9, kind: 'glass_door' }] },
      { x1: -10.0, z1: -5, x2: -8,   z2: -5 },
      // コントロールルーム縦仕切り (x=-8): z=-11 to z=-5
      { x1: -8, z1: -11, x2: -8, z2: -5 },
    ],
    floors: [
      { x1: -14, z1: -11, x2: -8, z2: -5, type: 'tile' },   // コントロールルーム
      { x1: -14, z1:   2, x2: -7, z2:  9, type: 'concrete' }, // 原材料・搬入エリア
      { x1:   9, z1:   0, x2: 14, z2:  9, type: 'concrete' }, // 完成品・出荷エリア
    ],
    items: [
      // ===== コントロールルーム (北西) =====
      P('reception',   -11.0, -10.5,   0, '#e8e2d6'),  // 南向き (制御室内に前面)
      P('ctrlpanel',   -13.5,  -9.0,  90, '#e8e2d6'),
      P('ctrlpanel',   -13.5,  -7.0,  90, '#e8e2d6'),
      P('walltv',      -13.7,  -6.2,  90, '#2a2a2a'),  // 西壁 (窓t=0.15位置を避け南へ)
      P('desk',         -9.5,  -7.5, 180, '#f3ece0'),
      P('ochr',         -9.5,  -8.2,   0),  // 机の北側・南向き(正しいアクセス側)
      P('locker',       -9.0, -10.5,   0, '#5a6370'),  // 作業員ロッカー (北壁沿い・南向き)
      P('sansevieria', -12.6,  -5.6),

      // ===== 生産ライン: 溶解炉 (西端, rotY=0=南向き) =====
      P('ind_furnace',  -6.0, -9.25, 0, '#2a2a2a'),  // 炉1: x=[-7,-5]
      P('ind_furnace',  -3.5, -9.25, 0, '#2a2a2a'),  // 炉2: x=[-4.5,-2.5]

      // ===== 生産ライン: 大型油圧プレス (中央, rotY=0=南向き) =====
      P('lg_hydpress',  +0.5, -8.7, 0),  // プレス1: x=[-1.1,+2.1]
      P('lg_hydpress',  +5.0, -8.7, 0),  // プレス2: x=[+3.4,+6.6]

      // ===== 生産ライン: CNCマシニングセンタ (東端, rotY=0=南向き) =====
      P('cnc_center',  +8.5, -8.9, 0),   // CNC1: x=[+7.0,+10.0]
      P('cnc_center', +12.0, -8.9, 0),   // CNC2: x=[+10.5,+13.5]

      // ===== 産業ロボット (各機械の正面・南側) =====
      P('ind_robot',  +0.5, -5.5, 0),    // ロボット1: プレス1担当
      P('ind_robot',  +5.0, -5.5, 0),    // ロボット2: プレス2担当
      P('ind_robot',  +8.5, -6.0, 0),    // ロボット3: CNC1担当
      P('ind_robot', +12.0, -6.0, 0),    // ロボット4: CNC2担当

      // ===== コンベアライン (東西方向, z=-4.5) =====
      P('conveyor', -5.0, -4.5, 0),
      P('conveyor', -2.6, -4.5, 0),
      P('conveyor', -0.2, -4.5, 0),
      P('conveyor', +2.2, -4.5, 0),
      P('conveyor', +4.6, -4.5, 0),
      P('conveyor', +7.0, -4.5, 0),
      P('conveyor', +9.4, -4.5, 0),

      // ===== 射出成形機 (ダイキャストサブライン, 西壁沿い, 東向き rotY=90) =====
      P('inj_molder', -12.0, +1.5, 90),

      // ===== 炉前 原材料待機エリア (x=-8〜-3, z=-6.3) =====
      P('woodpallet', -7.5, -6.3, 0),
      P('woodpallet', -6.2, -6.3, 0),
      P('alumcoil',   -3.8, -6.3, 0),    // 待機アルミ原反

      // ===== スクラップ回収 (各ゾーン) =====
      P('scrpbucket',  -4.5, -7.7, 0),   // 炉ゾーン
      P('scrpbucket',  +2.5, -4.8, 0),   // プレスゾーン
      P('scrpbucket', +10.5, -4.8, 0),   // CNCゾーン

      // ===== 作業者 =====
      P('worker',  -5.6, -6.5, 0),       // 炉前作業者
      P('worker',  +6.5, -7.0, 0),       // CNC担当作業者

      // ===== 消火器 =====
      P('fire_ext',  -7.5, -8.5, 0),
      P('fire_ext',  -0.5, -5.5, 0),
      P('fire_ext',  +6.5, -5.5, 0),
      P('fire_ext', +13.5,  0.0, 0),

      // ===== 原材料エリア (南西, z=+2〜+9, x=-14〜-7) =====
      P('alumcoil', -13.0, +3.0, 0),
      P('alumcoil', -11.5, +3.0, 0),
      P('alumcoil', -10.0, +3.0, 0),
      P('alumcoil', -13.0, +4.5, 0),
      P('alumcoil', -11.5, +4.5, 0),
      P('alumcoil', -10.0, +4.5, 0),
      P('woodpallet', -13.0, +6.5, 0),
      P('woodpallet', -11.5, +6.5, 0),
      P('woodpallet', -10.0, +6.5, 0),
      P('drum',     -13.0, +8.0, 0),
      P('drum',     -11.5, +8.0, 0),
      // フォークリフト① (原材料搬入, 東向き=furnace方向)
      P('forklift',  -8.5,  +5.5, 90),

      // ===== 完成品保管・出荷エリア (南東, z=0〜+9, x=+9〜+14) =====
      P('palletrack', +13.5, +2.0, 270),  // 東壁沿いラック (西向き)
      P('palletrack', +13.5, +4.5, 270),
      P('palletrack', +13.5, +7.0, 270),
      P('woodpallet', +11.0, +2.5, 0),
      P('woodpallet', +11.0, +5.0, 0),
      P('alumcoil',    +11.0, +7.5, 0),   // 完成品アルミコイル
      P('resinpallet', +9.5,  +3.5, 0),
      // フォークリフト② (完成品出荷, 西向き=荷捌き方向)
      P('forklift', +10.5, +5.0, 270),

      // ===== 作業台・工具エリア (南西壁沿い) =====
      P('workbench', -13.5, +3.5, 90, '#5a6370'),
      P('workbench', -13.5, +6.0, 90, '#5a6370'),
      P('toolcab',   -13.8, +2.5, 90),
      P('toolcab',   -13.8, +5.0, 90),
      P('scrpbucket', -12.0, +8.5, 0),
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
      P('ochr',        -5.4, 6.1, 180),  // 机の南側・北向き(正しいアクセス側)
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
    desc: '14m×10mのオープンプラン。受付・会議コーナー・執務エリア・コピー機・エアコンを完備。',
    room: { w: 14, d: 10 }, floorType: 'carpet', wallType: 'white',
    walls: {
      north: [{ t:0.5, w:2.0, kind:'auto_door' }],
      south: [{ t:0.5, w:1.0, kind:'door' }],
      east:  [{ t:0.2, w:1.2, kind:'window' }, { t:0.5, w:1.2, kind:'window' }, { t:0.8, w:1.2, kind:'window' }],
      west:  [{ t:0.2, w:1.2, kind:'window' }, { t:0.5, w:1.2, kind:'window' }, { t:0.8, w:1.2, kind:'window' }],
    },
    partitions: [
      { x1: 2, z1: -5, x2: 2, z2: 1.0, openings: [{ t: 0.58, w: 0.9, kind: 'glass_door' }] },  // 会議室への入口(z≈-1.5) — 旧構造は扉が無く出入り不能だった
      { x1: 2, z1: 1.0, x2: 2, z2: 2.0, openings: [{ t: 0.5, w: 0.9, kind: 'glass_door' }] },
      { x1: 2, z1: 2.0, x2: 2, z2: 5 },
      { x1: 2, z1: 1.0, x2: 7, z2: 1.0 },
    ],
    floors: [
      { x1: -7, z1: 3.5, x2: 7, z2: 5,   type: 'genkan' },
      { x1:  2, z1: -5,  x2: 7, z2: 1.0,  type: 'carpet' },
    ],
    items: [
      // 受付エリア (南の通用口を塞がないよう西へ寄せ、北の主入口=自動ドアに正対)
      P('reception',  -2.6,  4.6, 180, '#f3ece0'),
      P('ficus_umb',  -5.5,  4.5),
      P('monstera',    4.5,  4.5),
      P('sofa3',      -4.0,  2.8,   0, '#6f9e74'),
      P('ctable',     -4.0,  1.9),
      // 執務エリア (左) — 連続デスク(deskrun)の対向ベンチ島。天板が隙間なく一続き(3席×2列が背中合わせ)
      // 北列: ユーザーは北側、南向き(rotY=0)。デスクはアクセス面が北(rotY=180)。モニターは机南端で北向き(rotY=180)
      P('deskrun', -5.4, -2.35, 180, '#e7e1d6'), P('ochr', -5.4, -3.0, 0), P('monitor', -5.4, -2.1, 180, '#2a2a2a', 0.75),
      P('deskrun', -4.2, -2.35, 180, '#e7e1d6'), P('ochr', -4.2, -3.0, 0), P('monitor', -4.2, -2.1, 180, '#2a2a2a', 0.75),
      P('deskrun', -3.0, -2.35, 180, '#e7e1d6'), P('ochr', -3.0, -3.0, 0), P('monitor', -3.0, -2.1, 180, '#2a2a2a', 0.75),
      // 南列: ユーザーは南側、北向き(rotY=180)。デスクはアクセス面が南(rotY=0)。モニターは机北端で南向き(rotY=0)
      P('deskrun', -5.4, -1.65, 0, '#e7e1d6'), P('ochr', -5.4, -1.0, 180), P('monitor', -5.4, -1.9, 0, '#2a2a2a', 0.75),
      P('deskrun', -4.2, -1.65, 0, '#e7e1d6'), P('ochr', -4.2, -1.0, 180), P('monitor', -4.2, -1.9, 0, '#2a2a2a', 0.75),
      P('deskrun', -3.0, -1.65, 0, '#e7e1d6'), P('ochr', -3.0, -1.0, 180), P('monitor', -3.0, -1.9, 0, '#2a2a2a', 0.75),
      P('filingcab', -6.7, -1.0, 90, '#7a8fa0'),
      P('filingcab', -6.7, -2.5, 90, '#7a8fa0'),
      P('filingcab', -6.7, -4.0, 90, '#7a8fa0'),
      // 会議コーナー (右)
      P('conftable',  4.5, -1.5, 0, '#8a5a2b'),
      P('dchr', 3.2, -1.5, 90, '#5b5048'), P('dchr', 5.8, -1.5, 270, '#5b5048'),
      P('dchr', 4.5, -2.5,  0, '#5b5048'), P('dchr', 4.5, -0.5, 180, '#5b5048'),
      P('dchr', 3.2, -2.5, 90, '#5b5048'), P('dchr', 5.8, -2.5, 270, '#5b5048'),
      P('dchr', 3.2, -0.5, 90, '#5b5048'), P('dchr', 5.8, -0.5, 270, '#5b5048'),
      P('whiteboard', 6.8, -3.8, 270),  // 東壁に背面→室内(西)向き
      P('walltv',     6.8,  1.6, 270, '#2a2a2a'),   // 東壁 → 西向き (窓位置t=0.5を避けて移動)
      P('benjamin',   6.5, -4.5),
      P('copier',    -6.6, -4.6, 90, '#e2e2de'),    // 西壁際コピー機 (東向き) — 壁に寄せる
      P('wallac',    -3.5, -4.8,   0),               // 北壁エアコン西側 (南向き)
      P('wallac',     3.5, -4.8,   0),               // 北壁エアコン東側 (南向き)
    ],
  },
  {
    id: 'conference', name: '会議室', icon: 'fa-chalkboard-user', cat: 'オフィス',
    desc: '8m×6mの中規模会議室。大型テーブル・ホワイトボード・プロジェクターとスクリーンを配置。',
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
      P('whiteboard', -3.7, 0.0, 90),                          // 西壁 (窓t=0.3/0.7を避け中央へ)
      P('projscreen',  3.8,  0.0, 270),                        // 東壁スクリーン (西向き)
      P('projector',   0.8,  0.0, 90, '#2a2a2a'),              // テーブル上プロジェクター (東向き)
      P('wallac',      2.5,  2.8, 180),                        // 北壁エアコン(室内向き) — 北扉(中央)を避け東寄りへ
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
    desc: '12m×8mの小型コンビニ。南面ガラス張りの店頭(自動ドア)から入店し、両面ゴンドラ什器の通路、間仕切り沿いのリーチイン冷蔵ケース、レジ、バックヤードを備えた本格レイアウト。',
    room: { w: 12, d: 8 }, floorType: 'tile', wallType: 'white',
    walls: {
      // 店頭(南)= ガラス張り＋自動ドア。北壁はバックヤード背面(開口なし)。東はサイド窓。
      south: [{ t:0.18, w:1.6, kind:'window' }, { t:0.5, w:2.0, kind:'auto_door' }, { t:0.82, w:1.6, kind:'window' }],
      east:  [{ t:0.35, w:1.2, kind:'window' }, { t:0.7,  w:1.2, kind:'window' }],
    },
    partitions: [
      // 売場とバックヤードの間仕切り(z=-1.5)。スタッフ動線は東端の扉
      { x1: -6, z1: -1.5, x2:  4, z2: -1.5 },
      { x1:  4, z1: -1.5, x2:  5, z2: -1.5, openings: [{ t: 0.5, w: 0.9, kind: 'door' }] },
      { x1:  5, z1: -1.5, x2:  6, z2: -1.5 },
    ],
    floors: [
      { x1: -6, z1: -4, x2: 6, z2: -1.5, type: 'concrete' },   // バックヤード
    ],
    items: [
      // ===== リーチイン冷蔵ケース (間仕切り沿い・前面=南/売場側) =====
      P('showcasefridge', -5.4, -1.15, 0, '#d8d0c4'),
      P('showcasefridge', -4.2, -1.15, 0, '#d8d0c4'),
      P('showcasefridge', -3.0, -1.15, 0, '#d8d0c4'),
      P('showcasefridge', -1.8, -1.15, 0, '#d8d0c4'),
      P('showcasefridge', -0.6, -1.15, 0, '#d8d0c4'),
      // ===== ゴンドラ什器 (両面棚・端を突き合わせ連続配置) =====
      // 通路1
      P('gondola', -3.0, 0.3, 0, '#dcd6c8'),
      P('gondola', -1.8, 0.3, 0, '#dcd6c8'),
      P('gondola', -0.6, 0.3, 0, '#dcd6c8'),
      // 通路2
      P('gondola', -3.0, 1.8, 0, '#dcd6c8'),
      P('gondola', -1.8, 1.8, 0, '#dcd6c8'),
      P('gondola', -0.6, 1.8, 0, '#dcd6c8'),
      // ===== レジカウンター (店頭近く・前面=北/客対応) =====
      P('register',  2.2, 3.0, 180, '#f3ece0'),
      P('register',  3.6, 3.0, 180, '#f3ece0'),
      P('ctrlpanel', 5.6, 2.6, 270, '#e8e2d6'),  // レジ裏機器 (東壁)
      // ===== 雑誌棚 (東壁・西向き) =====
      P('shelfrack',  5.5,  1.0, 270, '#e0d8cc'),
      P('shelfrack',  5.5, -0.4, 270, '#e0d8cc'),
      // ===== 自動販売機・ATM (西壁沿い・東向き) =====
      P('vendingmachine', -5.6, 0.2, 90, '#e83028'),
      P('vendingmachine', -5.6, 1.7, 90, '#1a6bbf'),
      P('atm', -5.6, 3.0, 90, '#e8e2d6'),
      P('bamboo', -5.5, 3.6),
      // ===== バックヤード (北・z<-1.5) 在庫棚 =====
      P('shelfrack', -5.0, -3.6, 0, '#cfc7ba'),
      P('shelfrack', -3.5, -3.6, 0, '#cfc7ba'),
      P('palletrack', 5.2, -3.4, 180),
      P('woodpallet', 3.5, -3.5, 0),
      P('woodpallet', 2.3, -3.5, 0),
    ],
  },
  {
    id: 'restaurant', name: 'レストラン', icon: 'fa-utensils', cat: '店舗',
    desc: '12m×10mのダイニングレストラン。テーブル6卓・カウンター席・厨房エリアを配置。',
    room: { w: 12, d: 10 }, floorType: 'wood', wallType: 'cream',
    walls: {
      // 厨房は南壁(z=-D, 背面)沿いに配置。客用入口は厨房と反対の北(前面・客席側)に置く。
      north: [{ t:0.5,  w:1.5, kind:'double_door' }],   // 客用入口(厨房の反対側=北)
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
      P('microwave',-3.8, -4.6, 0),  // cupboard上に収める
      // カウンター席
      P('barcounter', -4.5, -2.2, 0, '#5b3a22'),
      P('barstool', -5.2, -1.5, 180, '#5b5048'),
      P('barstool', -4.5, -1.5, 180, '#5b5048'),
      P('barstool', -3.8, -1.5, 180, '#5b5048'),
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
      // 厨房は南壁(z=-D, 背面)沿い。客用入口(ガラス戸)は厨房と反対の北(前面・客席側)に置く。
      north: [{ t:0.25, w:1.4, kind:'window' }, { t:0.5, w:1.4, kind:'glass_door' }, { t:0.75, w:1.4, kind:'window' }],   // 中央が客用入口
      south: [],
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
      P('microwave', 0.3, -3.7, 0),   // キッチンカウンター上に配置
      P('ricecook', -0.3, -3.7, 0),
      // バーカウンター
      P('barcounter',  0.0, -1.2, 0, '#5b3a22'),
      P('barcounter', -3.6, -1.2, 90, '#5b3a22'),
      P('espresso',   -0.8, -1.2, 0, '#1a1a1a'),  // バーカウンター上エスプレッソマシン
      P('barstool', -1.0, -0.4, 180, '#5b5048'),
      P('barstool',  0.0, -0.4, 180, '#5b5048'),
      P('barstool',  1.0, -0.4, 180, '#5b5048'),
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
    id: 'abw_office',
    name: 'ABWオフィス',
    icon: 'fa-layer-group',
    cat: 'オフィス',
    desc: '18m×12mのActivity Based Working対応オフィス。フォーカス・コラボレーション・プロジェクトルーム・集中ブース・ラウンジ・カフェの6ゾーン構成。個人ロッカー完備で固定席なし。',
    room: { w: 18, d: 12 },
    floorType: 'carpet',
    wallType: 'white',
    walls: {
      north: [
        { t: 0.18, w: 1.8, kind: 'window' },
        { t: 0.34, w: 2.2, kind: 'auto_door' },   // 正面入口(受付の隣・北窓の間)
        { t: 0.50, w: 1.8, kind: 'window' },
        { t: 0.82, w: 1.8, kind: 'window' },
      ],
      east: [
        { t: 0.30, w: 1.4, kind: 'window' },
        { t: 0.70, w: 1.4, kind: 'window' },
      ],
      west: [
        { t: 0.30, w: 1.4, kind: 'window' },
        { t: 0.70, w: 1.4, kind: 'window' },
      ],
      south: [
        // 入口は北(受付隣)へ移設。南壁はデスク列の背面なので窓のみ。
        { t: 0.15, w: 1.2, kind: 'window' },
        { t: 0.85, w: 1.2, kind: 'window' },
      ],
    },
    partitions: [
      // プロジェクトルーム左壁 (x=3.5, z=-6〜-2) — ガラス壁＋会議室入口(コラボゾーンから直接出入り。
      //  旧構造はこの壁が無開口で, 会議室はブースA経由でしか入れず到達不能=閉鎖空間だった)
      { x1: 3.5, z1: -6,   x2: 3.5, z2: -2,  type: 'glass', openings: [{ t: 0.5, w: 1.0, kind: 'glass_door' }] },
      // プロジェクトルーム南壁 (z=-2, x=3.5〜9) — ガラス壁＋ガラスドア
      { x1: 3.5, z1: -2,   x2: 9,   z2: -2,  type: 'glass', openings: [{ t: 0.45, w: 1.2, kind: 'glass_door' }] },
      // 集中ブースゾーン左壁 (x=3.5, z=-2〜3) — ガラス壁。各ブースに専用出入口(ブースA:z≈-0.5 / ブースB:z≈2.6)
      { x1: 3.5, z1: -2,   x2: 3.5, z2:  3,  type: 'glass', openings: [{ t: 0.3, w: 1.0, kind: 'door' }, { t: 0.92, w: 1.0, kind: 'door' }] },
      // ブース仕切り (z=0.5, x=3.5〜9) — 防音のため不透明のまま
      { x1: 3.5, z1:  0.5, x2: 9,   z2:  0.5 },
    ],
    floors: [
      { x1: -9,  z1:  2.5, x2: 9,   z2: 6,   type: 'wood' },   // ラウンジ＆カフェ
      { x1:  3.5,z1: -6,   x2: 9,   z2: -2,  type: 'wood' },   // プロジェクトルーム
    ],
    items: [
      // ===== フォーカスゾーン (北窓沿い個人デスク) =====
      // デスクは北窓向き(rotY=0でモニター面=南/利用者側)、椅子は北を向いて着席(rotY=180)
      P('desk',  -7,  -5.6, 0, '#dcd6cc'), P('ochr', -7,  -4.8, 180),
      P('desk',  -5,  -5.6, 0, '#dcd6cc'), P('ochr', -5,  -4.8, 180),
      P('desk',  -3,  -5.6, 0, '#dcd6cc'), P('ochr', -3,  -4.8, 180),
      P('desk',  -1,  -5.6, 0, '#dcd6cc'), P('ochr', -1,  -4.8, 180),
      P('desk',   1,  -5.6, 0, '#dcd6cc'), P('ochr',  1,  -4.8, 180),
      // モニター & デスクランプ
      P('monitor', -7, -5.6, 0, undefined, 0.75),
      P('monitor', -5, -5.6, 0, undefined, 0.75),
      P('monitor', -3, -5.6, 0, undefined, 0.75),
      P('monitor', -1, -5.6, 0, undefined, 0.75),
      P('monitor',  1, -5.6, 0, undefined, 0.75),
      P('desklamp', -7.5, -5.4, 0, undefined, 0.75),
      P('desklamp', -5.5, -5.4, 0, undefined, 0.75),
      P('desklamp', -3.5, -5.4, 0, undefined, 0.75),
      P('desklamp', -1.5, -5.4, 0, undefined, 0.75),
      P('desklamp',  0.5, -5.4, 0, undefined, 0.75),
      // デスク間の仕切り植物 (プライバシー・吸音)
      P('sansevieria', -6, -5.5),
      P('sansevieria', -4, -5.5),
      P('sansevieria', -2, -5.5),
      P('sansevieria',  0, -5.5),

      // ===== コラボレーションゾーン =====
      // 4人チームテーブル ×2 (東西の椅子はテーブル中心に正対: 西側=東向き90 / 東側=西向き270)
      P('dtable', -6.0, -2.5, 0, '#b89878'),
      P('ochr', -6.0, -3.5, 0),  P('ochr', -6.0, -1.5, 180),
      P('ochr', -7.1, -2.5, 90), P('ochr', -4.9, -2.5, 270),
      P('dtable', -2.0, -2.0, 0, '#b89878'),
      P('ochr', -2.0, -3.0, 0),  P('ochr', -2.0, -1.0, 180),
      P('ochr', -3.1, -2.0, 90), P('ochr', -0.9, -2.0, 270),
      // 立ち話用ラウンドテーブル
      P('roundtable', 1.5, -1.2, 0, '#6a5848'),
      P('ochr', 1.5, -2.1, 0),  P('ochr', 1.5, -0.3, 180),
      P('ochr', 0.6, -1.2, 90), P('ochr', 2.4, -1.2, 270),
      // 西壁ホワイトボード (ブレスト用)
      P('whiteboard', -8.96, -3.5, 90, '#f8f5f0'),
      P('whiteboard', -8.96, -0.5, 90, '#f8f5f0'),
      // コラボゾーン装飾
      P('monstera',  -8.5, -1.5),
      P('zzplant',    2.8, -1.5),
      P('wallclock', -8.96, -5.0, 90),

      // ===== プロジェクトルーム (x:3.5〜9, z:-6〜-2) =====
      P('conftable', 6.5, -4.3, 0, '#5a4a3a'),
      P('ochr', 5.0, -5.0, 0), P('ochr', 6.5, -5.0, 0), P('ochr', 8.0, -5.0, 0),
      P('ochr', 5.0, -3.6, 180), P('ochr', 6.5, -3.6, 180), P('ochr', 8.0, -3.6, 180),
      P('whiteboard', 7.5, -5.86, 0, '#f8f5f0'),   // 北壁 (窓を避けて右寄り)
      P('walltv', 8.94, -4.3, 270, '#1a1a1a'),      // 東壁
      P('dracaena', 4.0, -5.5),

      // ===== 集中ブース (x:3.5〜9, z:-2〜3) =====
      // ブースA (z:-2〜0.5) — 1人集中作業
      P('sofa1',   8.4, -0.8, 270, '#4a6a7a'),
      P('stable',  7.3, -0.8, 0),
      P('desklamp', 7.3, -0.8, 0, undefined, 0.55),
      // ブースB (z:0.5〜3) — 向かい合わせ2人打ち合わせ
      P('sofa1',   8.4,  1.8, 270, '#4a6a7a'),
      P('sofa1',   6.8,  1.8, 90,  '#4a6a7a'),
      P('stable',  7.6,  1.8, 0),
      P('sansevieria', 4.3, 2.3),

      // ===== ラウンジゾーン (z:2.5〜6, x:-9〜3.5) =====
      P('sofalow',    -5.5, 4.0, 0,   '#7a9070'),
      P('sofa2',      -2.2, 4.7, 0,   '#7a9070'),
      P('sofa1',      -8.0, 3.8, 90,  '#8a7868'),
      P('loungechair',-7.5, 5.2, 90,  '#a07850'),
      P('ottoman',    -6.5, 3.0, 0),
      P('roundctab',  -5.5, 4.9, 0,   '#7a6050'),
      P('ctable',     -2.2, 3.5, 0,   '#8a7060'),
      P('rug',        -5.5, 4.3, 0),
      P('roundrug',   -2.2, 4.5, 0),
      // ラウンジ植物
      P('ficus_umb',  -8.5, 2.8),
      P('strelitzia',  2.8, 4.5),
      P('rhapis',     -4.5, 5.7),
      P('benjamin',   -1.5, 5.7),
      P('olive',       2.0, 3.4),   // ブース入口(間仕切りドア)前を避けて配置
      P('lamp',       -7.0, 5.5),
      P('pendlamp',   -5.5, 4.3),
      P('wallart',    -8.96, 4.0, 90),

      // ===== カフェゾーン (z:2.5〜6, x:3.5〜9) =====
      // バーカウンター (南壁沿い・前面=北/客席側)。スツールはカウンターに正対(北側で南向き)
      P('barcounter', 6.3, 5.75, 180, '#5a4030'),
      P('barstool', 5.1, 5.0, 0),
      P('barstool', 6.3, 5.0, 0),
      P('barstool', 7.5, 5.0, 0),
      P('espresso', 5.5, 5.75, 180, undefined, 1.1),
      // カフェテーブル & チェア (東西の椅子はテーブル中心へ正対)
      P('roundtablesm', 5.5, 3.5, 0, '#7a6050'),
      P('cafechr', 5.5, 2.8, 0),  P('cafechr', 5.5, 4.2, 180),
      P('cafechr', 4.7, 3.5, 90), P('cafechr', 6.3, 3.5, 270),
      // 冷蔵庫 & 食器棚 (東壁)
      P('fridge',   8.65, 4.6, 270, '#e8e8e0'),
      P('cupboard', 8.55, 3.0, 270, '#d8d0c0'),
      // 自動販売機 (東壁)
      P('vendingmachine', 8.6, 5.6, 270, '#cc3344'),
      P('bamboo', 3.8, 5.5),
      P('pothos', 3.8, 2.8),

      // ===== エントランス & ロッカーエリア =====
      // 受付は南の自動ドア(入口)に正対(rotY=0で前面=南)。来訪者を入口側から迎える島型カウンター
      P('reception',  0.0, 4.5, 0, '#f0ebe0'),
      P('locker', -8.6, 3.8, 90, '#c0b8a8'),  // 西壁に寄せて背面チェック通過
      P('locker', -8.6, 5.0, 90, '#c0b8a8'),
      P('monstera', -7.2, 5.5),

      // ===== 空調 =====
      P('wallac', -3.0, -5.9,  0),    // 北壁 (フォーカスゾーン)
      P('wallac', -8.9, -4.5, 90),    // 西壁 (コラボゾーン)
      P('wallac',  8.9, -4.0, 270),   // 東壁 (プロジェクトルーム)
      P('wallac', -4.0,  5.9, 180),   // 南壁 (ラウンジ)
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
      P('filingcab', 4.5, 4.0, 180, '#7a8fa0'),  // 南壁背面→北向き
      P('filingcab', 5.0, 4.0, 180, '#7a8fa0'),
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
      P('testbench', -4.5, -3.4, 0, '#3a4250'),  // 北壁沿い計測ラック群
      P('testbench', -3.5, -3.4, 0, '#3a4250'),
      P('testbench', -2.5, -3.4, 0, '#3a4250'),
      P('testbench', -1.5, -3.4, 0, '#3a4250'),
      P('ctrlpanel',  1.0, -3.4, 0, '#3a4250'),  // 北壁沿い・北扉(x=0)の通行クリアランス外へ東寄せ
      // 計測作業台
      P('labbench', -3.5, -0.8, 0, '#f3ece0'),
      P('oscilloscope', -4.2, -0.9, 0, '#2a2e34'),
      P('oscilloscope', -3.0, -0.9, 0, '#2a2e34'),
      P('analbalance', -3.3, -0.9, 0, '#e8e2d6'),  // labbench上に移動(-3.5±0.75の範囲内)
      P('labbench', -3.5,  1.2, 180, '#f3ece0'),
      P('microscope', -4.0, 1.2, 180, '#2a2e34'),
      P('glassware',  -2.5, 1.2, 180),
      // デスク作業
      P('desk', -5.2, 2.6, 90, '#f3ece0'), P('ochr', -4.4, 2.6, 270),  // desk: 西壁背面→東向きで着座
      P('whiteboard', -5.35, 0.0, 90),  // 西壁面に正しく壁掛け
      // 防振定盤エリア (右区画)
      P('conftable', 3.5, -1.5, 0, '#3a4250'),
      P('microscope', 2.8, -1.6, 0, '#2a2e34'),
      P('centrifuge', 4.2, -1.6, 0, '#e8e2d6'),
      P('testbench', 5.0, 2.5, 270, '#3a4250'),
      P('testbench', 5.0, 1.5, 270, '#3a4250'),
      P('filingcab', 2.2, 3.5, 180, '#7a8fa0'),  // 南壁に背面→北向きで引き出し開閉
      P('filingcab', 2.7, 3.5, 180, '#7a8fa0'),
      // 精密計測機器 (右区画 追加)
      P('tensile',   5.0,  0.0, 270, '#3a4250'),
      P('laboven',   3.5,  2.8, 0,   '#e8e2d6'),
      P('incubator', 4.0,  3.5, 270, '#e8e2d6'),  // testbenchとの重なりを解消
      P('zzplant', 4.8, 3.4), P('sansevieria', -5.2, -3.2),
    ],
  },
  {
    id: 'machineshop', name: '加工室', icon: 'fa-gears', cat: '工場',
    desc: '14m×10mの機械加工室。旋盤・フライス盤・ボール盤・グラインダー・工具ラックを完備。',
    room: { w: 14, d: 10 }, floorType: 'concrete', wallType: 'concrete',
    walls: {
      north: [{ t:0.5,  w:1.2, kind:'door' }],
      // 搬入シャッター(w2.0)は本工場側へ。小部屋(x:-7〜-2.5)の南壁は塞ぎ、屋外開放を解消
      south: [{ t:0.393, w:2.0, kind:'door' }, { t:0.72, w:1.2, kind:'door' }],
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
      P('workbench', -1.0, 1.5, 0, '#5a6370'),  // 東へ移動 — ドア前通路を確保
      P('toolrack',  -4.5, -4.6, 0, '#3a3f47'),  // 北壁沿い壁掛け (距離0.4m→閾値内)
      P('toolrack',   1.0, -4.6, 0, '#3a3f47'),  // 南壁の扉(t=0.39/0.72)を避け扉間へ
      P('toolcab',   -0.5, 1.6, 0, '#c0392b'),
      P('toolcab',    0.5, 1.6, 0, '#c0392b'),
      P('palletrack', 2.5, 3.5, 90),
      P('palletrack', 5.0, 3.5, 90),
      // 帯鋸・溶接・工業炉 (追加機械)
      P('bandsaw',    6.5,  2.5, 270, '#4f7a52'),
      P('welder',     5.5,  2.0, 0,   '#3a4a5a'),
      P('ind_furnace', -6.0, -0.25, 90, '#2a2a2a'),  // 西壁沿い・投入扉(前面)を東(通路)へ。窓間に収め室外貫通を解消
      // 管理コーナー (左仕切り内)
      P('desk',  -5.8, 3.1, 0, '#f3ece0'), P('ochr', -5.8, 3.8, 180),  // 椅子を机の南側・北向きに
      P('ctrlpanel', -6.7, 3.5, 90, '#e8e2d6'),  // 西壁に背面→東向き(ドア前を塞がない)
      P('locker', -6.0, 4.6, 180, '#5a6370'),   // 作業員ロッカー: 西寄りに移動 — ドア前を回避
      P('sansevieria', -6.8, 4.4),               // 観葉植物: ロッカーと重ならないよう西へ
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
      P('wallac', 1.5, -2.3, 0),                     // 北壁エアコン (南向き) — 北扉の外側へ
      P('sbed', -2.0, -1.2, 0, '#5b86b8'), P('stable', -2.0, 0.4),
      P('wardrobe', -2.5, 1.6, 90), P('desk', 1.6, -2.0, 0),  // 北壁背面→南向きで着座
      P('ochr', 1.6, -1.4, 180), P('desklamp', 1.6, -2.0, 0, '#2a2a2a'),
      P('shelf', 2.5, -2.0, 270), P('pothos', 2.5, -2.0, 0),   // 棚: 東壁沿い・西向き(北壁ドア・ベッド回避)
      P('sofa1', 1.9, 1.4, 270, '#6f9e74'), P('ctable', 0.9, 1.4),
      P('tablelamp', 0.9, 1.4), P('rug', 1.0, 1.0, 0, '#3f5d7a'),
      P('dracaena', 2.6, -1.0), P('lamp', 2.6, 1.9),  // 棚との干渉を避け南へ
    ],
  },
  {
    id: 'family', name: 'ファミリーホーム', icon: 'fa-house-user', cat: '住宅',
    desc: '玄関〜水回り〜LDK〜寝室を備えた一戸建てプラン。家族向けのフル装備レイアウト。',
    room: { w: 12, d: 10 },
    walls: {
      north: [{ t:0.83, w:1.2, kind:'window' }],
      east:  [{ t:0.12, w:1.2, kind:'window' }, { t:0.4, w:1.2, kind:'window' }, { t:0.65, w:1.2, kind:'window' }, { t:0.85, w:1.2, kind:'window' }],
      south: [{ t:0.75, w:1.2, kind:'window' }],   // 玄関扉は撤去(南壁=浴室/キッチン/寝室の外壁。外扉は玄関ゾーンの西壁へ移設)
      west:  [{ t:0.42, w:0.8, kind:'window' }, { t:0.68, w:0.8, kind:'window' }, { t:0.85, w:1.0, kind:'door' }],  // t=0.85(z≈3.5)=玄関の外扉。t=0.12窓は撤去(ユニットバス壁面の裏に当たるため)
    },
    partitions: [
      // 左ゾーン縦仕切り (水回り/玄関 と 中央LDK を分ける)
      { x1: -2.5, z1: -5.0, x2: -2.5, z2: -1.0 },
      { x1: -2.5, z1: -1.0, x2: -2.5, z2: 0.0, openings: [{ t: 0.5, w: 0.9, kind: 'fusuma' }] }, // 洗面所↔ダイニング
      { x1: -2.5, z1: 0.0, x2: -2.5, z2: 3.0 },
      { x1: -2.5, z1: 3.0, x2: -2.5, z2: 4.0, openings: [{ t: 0.5, w: 0.9, kind: 'door' }] },    // 玄関ホール↔LDK 動線
      { x1: -2.5, z1: 4.0, x2: -2.5, z2: 5.0 },
      // 左ゾーン内の横仕切り (浴室 / 洗面所 / トイレ / 玄関)
      { x1: -6.0, z1: -2.0, x2: -2.5, z2: -2.0, openings: [{ t: 0.2, w: 0.8, kind: 'bath_door' }] },
      { x1: -6.0, z1: 1.0, x2: -2.5, z2: 1.0, openings: [{ t: 0.2, w: 0.8, kind: 'toilet_door' }] },
      { x1: -6.0, z1: 2.6, x2: -2.5, z2: 2.6 },   // トイレ↔玄関の扉は撤去 — トイレ室を行き止まりのWCにし通り抜けを無くす(洗面所経由でアクセス)
      // 中央↔右 (LDK と 寝室/リビング) 縦仕切り — z=0.5〜5 は開口(LDKの繋がり)
      // 寝室を北へ拡張(z=-2.6→-1.3)して手狭さを解消
      { x1: 2.0, z1: -5.0, x2: 2.0, z2: -1.3 },
      { x1: 2.0, z1: -1.3, x2: 2.0, z2: 0.5 },
      // 寝室の横仕切り (TVの壁掛け面・x=4.5〜6 は寝室↔リビング通路)
      { x1: 2.0, z1: -1.3, x2: 4.5, z2: -1.3 },
    ],
    floors: [
      { x1: -6, z1: 2.6, x2: -2.5, z2: 5,  type: 'genkan' }, // 玄関
      { x1: -6, z1: -5,  x2: -2.5, z2: -2, type: 'tile' },   // 浴室
      { x1: -6, z1: -2,  x2: -2.5, z2: 1,  type: 'tile' },   // 洗面所
      { x1: -6, z1: 1,   x2: -2.5, z2: 2.6,type: 'tile' },   // トイレ
      { x1: -2.5, z1: -5,x2: 2,    z2: -3, type: 'tile' },   // キッチン
      { x1: -2.5, z1: -3,x2: 2,    z2: 5,  type: 'wood' },   // ダイニング
      { x1: 2, z1: -1.3, x2: 6,    z2: 5,  type: 'wood' },   // リビング
      { x1: 2, z1: -5,   x2: 6,    z2: -1.3,type: 'wood' },  // 寝室(北へ拡張)
    ],
    items: [
      // 玄関 (左下)
      P('shoebox', -5.5, 4.6, 180, '#5b5048'), P('olive', -3.0, 4.6),  // 南壁背面→玄関内向き
      // トイレ (左中) — 扉(toilet_door: x≈-5.3, z=1.0)の前を空け, 北壁側へ背面を付けて南向き
      P('toilet', -3.8, 2.25, 180, '#e8e2d6'), P('handbasin', -5.7, 2.4, 90),
      // 洗面所 (左) — vanityは西壁の窓(t=0.42,z≈-0.8)・浴室扉(z=-2)・トイレ扉(z=1)を全て避けた中央へ
      P('vanity', -5.6, 0.0, 90, '#e8e2d6'), P('washer', -3.0, -1.4, 0, '#e8e2d6'),
      // 浴室 (左上) — ユニットバスを北西の角に密着 (西壁・北壁=固体壁面と一体化、開口側=南/東へ)
      P('bathset', -5.2, -4.2, 0, '#e8e2d6'),
      // キッチン (中央上) — システムキッチン壁付け
      P('kitchen', -0.3, -4.6, 0, '#e8e2d6'),
      P('stove', 0.9, -4.6, 0, '#3a332b'),
      P('fridge', 1.5, -4.4, 0, '#e8e2d6'),
      P('cupboard', -2.0, -4.6, 0, '#f3ece0'),
      P('microwave', -1.6, -4.6, 0), P('ricecook', -1.0, -4.6, 0),
      // ダイニング (中央)
      P('dtable', -0.4, -1.4, 0, '#8a5a2b'),
      P('dchr', -1.3, -1.4, 90, '#5b5048'), P('dchr', 0.5, -1.4, 270, '#5b5048'),
      P('dchr', -0.4, -2.1, 0, '#5b5048'), P('dchr', -0.4, -0.7, 180, '#5b5048'),
      // エアコン
      P('wallac', 5.8, 2.5, 270),                   // リビング東壁 (西向き) — 東壁窓の間
      P('wallac', -0.2, -4.8, 0),                   // キッチン北壁 (南向き)
      // リビング (右) — TVは寝室との間仕切り壁(z=-1.3)に壁掛け、ソファは北向きで対面
      P('walltv', 3.5, -1.15, 0, '#3a332b'),
      P('sofa3', 3.5, 2.2, 180, '#b9714a'), P('sofa1', 5.4, 1.0, 270, '#b9714a'),
      P('ctable', 3.5, 0.4, 0), P('rug', 3.6, 0.9, 0, '#5b5048'),
      P('lamp', 2.7, 3.5), P('monstera', 5.5, 4.2),
      // 寝室 (右下・北へ拡張: z=-5〜-1.3) — ベッドは南壁に頭, 北側は通路/出入り(x=4.5〜6)を確保
      P('dbed', 4.0, -3.9, 0, '#5b86b8'), P('stable', 2.7, -4.6),
      P('closet', 5.7, -3.5, 270, '#f3ece0'), P('zzplant', 2.4, -1.7),  // 植物は寝室北西の隅(通路を塞がない)
      P('dresser', 2.55, -3.6, 90, '#f3ece0'),  // 東向き: 西壁仕切りに背面
    ],
  },
  // ===== 子供部屋 (女の子の部屋) =====
  {
    id: 'kidsroom', name: '子供部屋（女の子）', icon: 'fa-heart', cat: '住宅',
    desc: '5m×5mの可愛い女の子の部屋。お姫様ベッド・キッズデスク・ドールハウス・おもちゃ箱・ぬいぐるみ・風船・ガーランドでいっぱい。小学生の女の子が主役のパステルなお部屋。',
    room: { w: 5, d: 5 }, floorType: 'carpet', wallType: 'blush',
    walls: {
      south: [{ t: 0.5, w: 0.9, kind: 'door' }],     // 入口
      east:  [{ t: 0.55, w: 1.2, kind: 'window' }],
      west:  [{ t: 0.3, w: 1.0, kind: 'window' }],
    },
    partitions: [],
    items: [
      // お姫様ベッド (北壁・天蓋付き)
      P('kidsbed', -1.1, -1.45, 0, '#fbe3ec'),
      P('teddy', -0.5, -1.75, 0, '#c79a6a'),    // 床のテディベア
      P('bunny',  0.55, -1.6, 200, '#fbf4f6'),  // 床のうさぎ
      // 勉強コーナー (東壁) — キッズデスク＆チェアは正対
      P('kidsdesk', 2.15, -0.6, 270, '#bfe3f5'),
      P('kidschair', 1.55, -0.6, 90, '#ffd382'),
      P('cake',    2.0, -0.5, 0, undefined, 0.56),    // 机上
      P('cupcake', 2.3, -0.78, 0, undefined, 0.56),
      P('starwall', 2.46, 0.9, 270),                   // 東壁の星飾り
      // 本棚 (西壁)
      P('shelf', -2.32, 1.1, 90, '#f4b9cf'),
      // 遊びスペース (中央ラグ)
      P('roundrug', 0.3, 0.9, 0, '#f7a8c4'),
      P('girl', -0.1, 0.5, 180),                       // 主役の女の子
      P('unicorn', 1.0, 1.25, 200, '#f3e3f7'),
      P('blocks', -0.7, 1.3, 0, '#ff9aa2'),
      P('heartcushion', 0.55, 0.25, 0, '#ff8fab'),
      // コーナーの玩具
      P('toybox', -2.0, 1.95, 0, '#9ad0ec'),
      P('dollhouse', 1.9, 1.9, 180, '#ffd1e0'),
      // 風船 & 飾り (天井から吊るすペンダント、壁のガーランド)
      P('balloon', 2.25, -2.2, 0, '#ff7d9c'),
      P('balloon', -2.25, -0.1, 0, '#9ad0ec'),
      P('garland', -1.1, -2.46, 0),                    // ベッド頭上のガーランド — 南扉(中央)を避けベッド中央へ
      P('pendlamp', 0.3, 0.9, 0, '#f7a8c4'),
    ],
  },
  // ===== 学校 (教室) =====
  {
    id: 'classroom', name: '学校（教室）', icon: 'fa-school', cat: '特殊',
    desc: '9m×8mの標準的な教室。前方に黒板と教卓、学習机を5列×4行で整然と配置。廊下側(西)に前後2つの引き戸、窓側(東)に大きな窓を備えた小中学校の教室レイアウト。',
    room: { w: 9, d: 8 }, floorType: 'wood', wallType: 'cream',
    walls: {
      // 什器レイアウトは前方=南(黒板/教卓)・背面=北(ロッカー/学級文庫)で一貫しているため、
      // 開口もそれに合わせる: 南=黒板壁(無開口) / 北=背面窓 / 東=窓側 / 西=廊下側引き戸。
      south: [],   // 黒板の壁(前方=南, 無開口)
      north: [{ t: 0.5, w: 1.0, kind: 'window' }],   // 背面窓(生徒の背面=北, 学級文庫の間に配置)
      east:  [{ t: 0.25, w: 1.6, kind: 'window' }, { t: 0.55, w: 1.6, kind: 'window' }, { t: 0.85, w: 1.6, kind: 'window' }],  // 窓側
      west:  [{ t: 0.28, w: 1.0, kind: 'glass_door' }, { t: 0.75, w: 1.0, kind: 'glass_door' }],  // 廊下側 前後引き戸
    },
    partitions: [],
    items: [
      // 前方 (南) — 黒板・教卓 (黒板は南壁=無開口の内面 z=-3.94 の手前に置き, 前面+Z=室内/生徒側を向く rotY=0)
      P('blackboard', 0, -3.91, 0, '#1f4a37'),   // 壁にめり込ませず室内側へ(内面-3.94の手前)
      P('wallclock', 3.7, -3.93, 0),
      // 教卓: アクセス面(膝入れ+Z)はrotY=180で南=教師側へ向き, 引き出し面は北=生徒側。
      // 教師は机の南側(黒板の手前)に着座し北=生徒側に正対する。
      P('desk', 0, -2.8, 180, '#e8e2d6'),   // 教卓 (膝入れ=南/教師側, 引き出し=北/生徒側)
      P('ochr', 0, -3.35, 0),               // 教師椅子: 机の南側・北向き(生徒に正対)
      // 学習机 5列×4行 (机 rotY=0=本入れ/前面+Z=北=生徒側 / 生徒椅子 北側・南向きで黒板(南)に正対)
      P('schooldesk', -3.0, -1.4, 0), P('stackchr', -3.0, -0.9, 180),
      P('schooldesk', -1.5, -1.4, 0), P('stackchr', -1.5, -0.9, 180),
      P('schooldesk',  0.0, -1.4, 0), P('stackchr',  0.0, -0.9, 180),
      P('schooldesk',  1.5, -1.4, 0), P('stackchr',  1.5, -0.9, 180),
      P('schooldesk',  3.0, -1.4, 0), P('stackchr',  3.0, -0.9, 180),
      P('schooldesk', -3.0, -0.2, 0), P('stackchr', -3.0,  0.3, 180),
      P('schooldesk', -1.5, -0.2, 0), P('stackchr', -1.5,  0.3, 180),
      P('schooldesk',  0.0, -0.2, 0), P('stackchr',  0.0,  0.3, 180),
      P('schooldesk',  1.5, -0.2, 0), P('stackchr',  1.5,  0.3, 180),
      P('schooldesk',  3.0, -0.2, 0), P('stackchr',  3.0,  0.3, 180),
      P('schooldesk', -3.0,  1.0, 0), P('stackchr', -3.0,  1.5, 180),
      P('schooldesk', -1.5,  1.0, 0), P('stackchr', -1.5,  1.5, 180),
      P('schooldesk',  0.0,  1.0, 0), P('stackchr',  0.0,  1.5, 180),
      P('schooldesk',  1.5,  1.0, 0), P('stackchr',  1.5,  1.5, 180),
      P('schooldesk',  3.0,  1.0, 0), P('stackchr',  3.0,  1.5, 180),
      P('schooldesk', -3.0,  2.2, 0), P('stackchr', -3.0,  2.7, 180),
      P('schooldesk', -1.5,  2.2, 0), P('stackchr', -1.5,  2.7, 180),
      P('schooldesk',  0.0,  2.2, 0), P('stackchr',  0.0,  2.7, 180),
      P('schooldesk',  1.5,  2.2, 0), P('stackchr',  1.5,  2.7, 180),
      P('schooldesk',  3.0,  2.2, 0), P('stackchr',  3.0,  2.7, 180),
      // 背面 (北) — 清掃ロッカー・学級文庫
      P('locker', -3.2, 3.6, 180, '#8a9a9e'),
      P('shelf',  -1.1, 3.65, 180, '#8a5a2b'),
      P('shelf',   1.1, 3.65, 180, '#8a5a2b'),
      P('locker',  3.2, 3.6, 180, '#8a9a9e'),
      // 窓側
      P('benjamin', 4.0, -0.6),
    ],
  },
  // ===== ホテル (客室) =====
  {
    id: 'hotel', name: 'ホテル客室', icon: 'fa-hotel', cat: '住宅',
    desc: '7m×5mのホテルツインルーム。ダブルベッド・ワークデスク・ラウンジチェア・壁掛けテレビ・ユニットバスを備えたシティホテルの客室レイアウト。東面に大きな眺望窓。',
    room: { w: 7, d: 5 }, floorType: 'carpet', wallType: 'cream',
    walls: {
      north: [],
      south: [{ t: 0.39, w: 0.9, kind: 'door' }],   // 客室入口: 浴室(x≤-1.3)を完全に外しベッド西脇の入口通路へ
      east:  [{ t: 0.5, w: 2.2, kind: 'window' }],   // 眺望窓
      west:  [],
    },
    partitions: [
      // バスルーム (北西) の囲い。扉は1枚=浴室ドアのみ
      { x1: -1.3, z1: -2.5, x2: -1.3, z2: -0.3, openings: [{ t: 0.78, w: 0.75, kind: 'bath_door' }] },
      { x1: -3.5, z1: -0.3, x2: -1.3, z2: -0.3 },
    ],
    floors: [
      { x1: -3.5, z1: -2.5, x2: -1.3, z2: -0.3, type: 'tile' },  // バスルーム
    ],
    items: [
      // ユニットバス: 西壁・北壁の角に密着 (固体壁面=室壁と一体化、開口側=東の扉/南へ)
      P('bathset', -2.7, -1.7, 0, '#e8e2d6'),
      // ベッド (ヘッドボード南壁) — 入口確保のため一式を東へ0.5mシフト
      P('dbed', 1.2, -1.3, 0, '#3f5d7a'),
      P('stable', 0.0, -2.0), P('stable', 2.4, -2.0),
      P('tablelamp', 0.0, -2.0), P('tablelamp', 2.4, -2.0),
      P('wallart', 1.2, -2.45, 0),
      // テレビ (南壁・ベッド対面)
      P('tvboard', 0.7, 2.28, 180, '#5b5048'), P('walltv', 0.7, 2.45, 180, '#2a2a2a'),
      // ワークデスク (東壁・窓下)
      P('desk', 3.0, 0.7, 270, '#e8e2d6'), P('ochr', 2.35, 0.7, 90),
      // ワードローブ・荷物掛け (西壁)
      P('wardrobe', -3.0, 0.6, 90, '#f3ece0'),
      P('hangerrack', -3.0, 2.0, 90),
      // ラウンジコーナー (南東)
      P('loungechair', 2.6, 1.9, 270, '#6f9e74'), P('lamp', 3.2, 2.2),
      // 装飾
      P('strelitzia', 3.1, -2.0),
      P('pendlamp', -0.2, -1.3),  // ベッド西脇の吊り下げ灯(天井マウント・笠は頭上1.85m) — ベッド footprint 外
    ],
  },
  // ===== 日本家屋 (和室) =====
  {
    id: 'washitsu', name: '日本家屋', icon: 'fa-torii-gate', cat: '住宅',
    desc: '10m×9mの伝統的な日本家屋。畳敷きの二間続き(襖で仕切り)・床の間・縁側・玄関を備えた和の住まい。北面の障子越しに庭を望む。',
    room: { w: 10, d: 9 }, floorType: 'tatami', wallType: 'cream',
    walls: {
      north: [{ t: 0.5, w: 3.5, kind: 'window' }],   // 庭側 (縁側の先)
      south: [{ t: 0.5, w: 1.2, kind: 'door' }],      // 玄関入口
      east:  [{ t: 0.3, w: 1.2, kind: 'window' }, { t: 0.7, w: 1.2, kind: 'window' }],
      west:  [{ t: 0.3, w: 1.2, kind: 'window' }, { t: 0.7, w: 1.2, kind: 'window' }],
    },
    partitions: [
      // 縁側 仕切り (障子)
      { x1: -5, z1: -3.5, x2: 5, z2: -3.5, openings: [{ t: 0.25, w: 1.6, kind: 'shoji' }, { t: 0.72, w: 1.6, kind: 'shoji' }] },
      // 中央 襖 (二間続き)
      { x1: 0, z1: -3.5, x2: 0, z2: 1.0, openings: [{ t: 0.32, w: 1.4, kind: 'fusuma' }, { t: 0.78, w: 1.4, kind: 'fusuma' }] },
      // 玄関の囲い
      { x1: -1.5, z1: 2.2, x2: -1.5, z2: 4.5 },
      { x1: 1.5, z1: 2.2, x2: 1.5, z2: 4.5 },
      { x1: -1.5, z1: 2.2, x2: 1.5, z2: 2.2, openings: [{ t: 0.5, w: 1.0, kind: 'door' }] },  // 上がり框の戸
    ],
    floors: [
      { x1: -5, z1: -4.5, x2: 5, z2: -3.5, type: 'wood' },     // 縁側
      { x1: -1.5, z1: 2.2, x2: 1.5, z2: 4.5, type: 'genkan' }, // 玄関
    ],
    items: [
      // 西の間 (居間) — こたつ
      P('kotatsu', -2.5, -1.2, 0, '#8a5a2b'),
      P('zabuton', -2.5, -2.1, 0, '#7a3540'), P('zabuton', -2.5, -0.3, 0, '#3f5d7a'),
      P('zabuton', -3.5, -1.2, 0, '#5b6b3a'), P('zabuton', -1.4, -1.2, 0, '#b25c78'),
      P('chest', -4.6, -2.6, 90, '#5b3a22'),   // 和箪笥
      P('lamp', -4.4, 0.4),                     // 行灯風
      P('rhapis', -4.4, 1.6),
      // 東の間 (座敷) — 床の間付き
      P('roundctab', 2.5, -1.0, 0, '#5b3a22'),  // 茶卓
      P('zabuton', 2.5, -1.9, 0, '#7a3540'), P('zabuton', 1.6, -0.5, 0, '#3f5d7a'), P('zabuton', 3.4, -0.5, 0, '#5b6b3a'),
      P('consoletab', 4.6, -3.0, 270, '#5b3a22'), // 床の間 飾り台 (東壁窓を避け北へ)
      P('wallart', 4.95, -3.0, 270),              // 掛け軸
      P('bamboo', 4.4, -3.0),                      // 活け花
      P('zzplant', 3.6, 1.4),
      // 縁側 (北)
      P('zabuton', 0, -4.0, 0, '#b25c78'),
      P('benjamin', -4.2, -4.0), P('strelitzia', 4.2, -4.0),
      // 玄関
      P('shoebox', 1.05, 4.0, 270, '#5b3a22'),
      P('olive', -1.05, 4.0),
      // 玄関脇のたたみ (南角)
      P('chest', -4.6, 3.8, 90, '#5b3a22'),
      P('ficus_umb', 4.3, 3.8),
    ],
  },
  // ===== キャンプサイト (テント) =====
  {
    id: 'campsite', name: 'キャンプサイト', icon: 'fa-campground', cat: '特殊',
    desc: '10m×9mの林間キャンプサイト。ドームテント・焚き火・キャンプチェア・クーラーボックス・ランタンを配した屋外レイアウト。芝生の上に設営エリアと焚き火スペースを設けた本格的なアウトドアシーン。',
    room: { w: 10, d: 9 }, floorType: 'grass', wallType: 'wood',
    walls: {
      north: [{ t: 0.5, w: 1.5, kind: 'door' }],   // 林道への小径
      south: [{ t: 0.5, w: 3.0, kind: 'door' }],    // メインゲート
      east:  [],
      west:  [],
    },
    partitions: [],
    floors: [
      { x1: -0.6, z1: -0.2, x2: 1.6, z2: 1.8, type: 'dirt' },  // 焚き火の地面
    ],
    items: [
      // テント (北西・入口南向き)
      P('tent', -2.2, -2.3, 180, '#3f7a4a'),
      P('lantern', -1.0, -0.7),
      // 焚き火
      P('campfire', 0.5, 0.8, 0),
      // 焚き火を囲むチェア
      P('campchair', 0.5, 2.1, 180, '#2f5fa0'),   // 南→北向き
      P('campchair', 2.0, 0.8, 270, '#b25c78'),   // 東→西向き
      P('campchair', -0.9, 0.8, 90, '#5b6b3a'),   // 西→東向き
      // クーラーボックス・テーブル
      P('coolerbox', -2.2, 1.6, 0, '#b9714a'),
      P('cafetable', 3.0, 2.2, 0, '#8a5a2b'), P('lantern', 3.0, 2.2),
      // 木立 (周囲)
      P('ficus_umb', -4.3, -3.6), P('benjamin', 4.3, -3.6),
      P('strelitzia', 4.3, 3.6), P('olive', -4.3, 3.6),
      P('bamboo', -4.5, 0.5), P('rhapis', 4.5, 0.5),
    ],
  },
];

export { P, PRESETS };
