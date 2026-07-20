import { env } from "cloudflare:workers";

export type Memo = {
  date: string;
  text: string;
};

export type MataneUser = {
  id: string;
  publicCode: string;
  accountEmail: string | null;
  name: string;
  reading: string;
  org: string;
  avatarDataUrl: string;
  locationEnabled: boolean;
  lastSeen: string | null;
  createdAt: string;
};

export type ContactProfile = {
  contactUserId: string;
  name: string;
  nickname: string;
  reading: string;
  org: string;
  avatarDataUrl: string;
  tags: string[];
  memos: Memo[];
  facts: string[];
  visualTraits: string[];
  portraitFaceAvailable: boolean;
  portraitFullBodyAvailable: boolean;
  portraitPreviousAvailable: boolean;
  portraitPreviousUpdatedAt: string | null;
  portraitMode: "openai" | "fallback" | null;
  portraitDisclaimer: string;
  portraitUpdatedAt: string | null;
  alertLevel: "normal" | "caution";
  alertSuggested: boolean;
  alertReason: string | null;
  hudText: string;
  lastSeen: string | null;
  nearby: boolean;
  distanceMeters: number | null;
  exchangedAt: string;
  exchangePlaceLabel: string;
  exchangeLatitude: number | null;
  exchangeLongitude: number | null;
  createdAt: string;
  updatedAt: string;
};

export type UserRow = {
  id: string;
  device_token: string;
  email: string | null;
  public_code: string;
  name: string;
  reading: string;
  org: string;
  avatar_data_url: string;
  latitude: number | null;
  longitude: number | null;
  location_accuracy: number | null;
  location_enabled: number;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
};

type ContactRow = {
  owner_id: string;
  contact_user_id: string;
  contact_name: string;
  contact_reading: string;
  contact_org: string;
  contact_avatar_data_url: string;
  contact_latitude: number | null;
  contact_longitude: number | null;
  contact_location_accuracy: number | null;
  contact_location_enabled: number;
  contact_last_seen: string | null;
  nickname: string;
  exchanged_at: string;
  exchange_latitude: number | null;
  exchange_longitude: number | null;
  exchange_accuracy: number | null;
  tags: string;
  memos: string;
  facts: string;
  visual_traits: string;
  portrait_key: string;
  portrait_full_body_key: string;
  portrait_previous_key: string;
  portrait_previous_full_body_key: string;
  portrait_previous_mode: string;
  portrait_previous_updated_at: string | null;
  portrait_mode: string;
  portrait_disclaimer: string;
  portrait_updated_at: string | null;
  alert_level: string;
  alert_suggested: number;
  alert_reason: string | null;
  hud_text: string;
  created_at: string;
  updated_at: string;
};

const LOCATION_TTL_MS = 60 * 60 * 1000;
export const NEARBY_RADIUS_METERS = 150;
export const REVIEWER_VENUE = {
  name: "渋谷ソラスタコンファレンス",
  latitude: 35.6564031,
  longitude: 139.6964821,
};

type ReviewerPersona = {
  id: string;
  publicCode: string;
  name: string;
  reading: string;
  org: string;
  memo: string;
  visualTraits: string[];
  tags: string[];
  nearbyOffset?: [latitude: number, longitude: number];
};

const REVIEWER_PERSONAS: ReviewerPersona[] = [
  {
    id: "reviewer-persona-01",
    publicCode: "RV1001",
    name: "黒田 悠斗",
    reading: "Yuto Kuroda",
    org: "Pixel Forge",
    memo: "30代の背が高く細身の男性。鮮やかな赤いニット帽、丸い銀縁メガネ、マスタード色のオーバーシャツが目印。前回はアクセシブルなUI設計の話で盛り上がった。",
    visualTraits: ["30代の背が高く細身の男性", "鮮やかな赤いニット帽", "丸い銀縁メガネ", "マスタード色のオーバーシャツ"],
    tags: ["UI", "アクセシビリティ"],
    nearbyOffset: [0.00007, 0.00003],
  },
  {
    id: "reviewer-persona-02",
    publicCode: "RV1002",
    name: "森川 彩",
    reading: "Aya Morikawa",
    org: "Canvas AI",
    memo: "20代後半の小柄な女性。短いピンクのボブヘア、大きな白縁メガネ、コバルトブルーのワンピースが印象的。生成AIとブランドデザインを研究している。",
    visualTraits: ["20代後半の小柄な女性", "短いピンクのボブヘア", "大きな白縁メガネ", "コバルトブルーのワンピース"],
    tags: ["生成AI", "デザイン"],
    nearbyOffset: [-0.00008, 0.00004],
  },
  {
    id: "reviewer-persona-03",
    publicCode: "RV1003",
    name: "大橋 健司",
    reading: "Kenji Ohashi",
    org: "FinBridge",
    memo: "40代のとてもふくよかな男性。スキンヘッド、濃い黒ひげ、緑のアロハシャツ、太いオレンジ色の腕時計が目立つ。金融APIの連携先を探している。",
    visualTraits: ["40代のとてもふくよかな男性", "スキンヘッド", "濃い黒ひげ", "緑のアロハシャツ", "太いオレンジ色の腕時計"],
    tags: ["FinTech", "API"],
    nearbyOffset: [0.00012, -0.00002],
  },
  {
    id: "reviewer-persona-04",
    publicCode: "RV1004",
    name: "水野 玲奈",
    reading: "Rena Mizuno",
    org: "Sprint Base",
    memo: "30代の背が高くスポーティーな女性。高いポニーテール、オレンジ色のトラックジャケット、首に銀色の大型ヘッドホン。プロダクトマネージャー採用の話をした。",
    visualTraits: ["30代の背が高くスポーティーな女性", "高いポニーテール", "オレンジ色のトラックジャケット", "銀色の大型ヘッドホン"],
    tags: ["プロダクト", "採用"],
    nearbyOffset: [-0.00011, -0.00005],
  },
  {
    id: "reviewer-persona-05",
    publicCode: "RV1005",
    name: "岡本 蓮",
    reading: "Ren Okamoto",
    org: "Fluid Studio",
    memo: "20代の細身で中性的な雰囲気の人。左右非対称の青いショートヘア、紫のダブルスーツ、片耳だけの大きな三角イヤリング。空間コンピューティングの展示を作っている。",
    visualTraits: ["20代の細身で中性的な雰囲気", "左右非対称の青いショートヘア", "紫のダブルスーツ", "大きな三角イヤリング"],
    tags: ["XR", "展示"],
    nearbyOffset: [0.00003, 0.00009],
  },
  {
    id: "reviewer-persona-06",
    publicCode: "RV1006",
    name: "神谷 直子",
    reading: "Naoko Kamiya",
    org: "Startup Legal Lab",
    memo: "50代の女性。ボリュームのあるグレーの巻き髪、黄色いキャットアイ型メガネ、真っ赤なスカーフが目印。スタートアップ契約の無料相談をしてくれた。",
    visualTraits: ["50代の女性", "ボリュームのあるグレーの巻き髪", "黄色いキャットアイ型メガネ", "真っ赤なスカーフ"],
    tags: ["法務", "スタートアップ"],
    nearbyOffset: [-0.00004, -0.0001],
  },
  {
    id: "reviewer-persona-07",
    publicCode: "RV1007",
    name: "松田 航",
    reading: "Wataru Matsuda",
    org: "MoveX",
    memo: "20代後半の筋肉質な男性。ラインの入った短い刈り上げ、白いボンバージャケット、ネオングリーンのスニーカー。ウェルネスアプリとの協業を考えている。",
    visualTraits: ["20代後半の筋肉質な男性", "ラインの入った短い刈り上げ", "白いボンバージャケット", "ネオングリーンのスニーカー"],
    tags: ["ウェルネス", "協業"],
    nearbyOffset: [0.00015, 0.00006],
  },
  {
    id: "reviewer-persona-08",
    publicCode: "RV1008",
    name: "石井 杏",
    reading: "An Ishii",
    org: "Culture Grid",
    memo: "40代のふくよかな女性。腰まである銀色の一本三つ編み、ターコイズ色の着物風ジャケット、大きな星形イヤリング。地域文化のデジタルアーカイブを運営している。",
    visualTraits: ["40代のふくよかな女性", "腰まである銀色の一本三つ編み", "ターコイズ色の着物風ジャケット", "大きな星形イヤリング"],
    tags: ["文化", "アーカイブ"],
    nearbyOffset: [-0.00016, 0.00003],
  },
  {
    id: "reviewer-persona-09",
    publicCode: "RV1009",
    name: "藤原 翔",
    reading: "Sho Fujiwara",
    org: "Lens Loop",
    memo: "30代の小柄な男性。とても強い黒いくせ毛、太い口ひげ、紫のパーカー、斜め掛けの黄色いカメラストラップ。イベント撮影の見積もりを相談した。",
    visualTraits: ["30代の小柄な男性", "とても強い黒いくせ毛", "太い口ひげ", "紫のパーカー", "黄色いカメラストラップ"],
    tags: ["写真", "イベント"],
    nearbyOffset: [0.00002, -0.00014],
  },
  {
    id: "reviewer-persona-10",
    publicCode: "RV1010",
    name: "長谷川 芽衣",
    reading: "Mei Hasegawa",
    org: "Neon Research",
    memo: "20代の背が高く細身の女性。長い二本三つ編み、ライムグリーンのジャケット、黒いタートルネック、六角形のメガネ。音声AIのユーザー調査をしている。",
    visualTraits: ["20代の背が高く細身の女性", "長い二本三つ編み", "ライムグリーンのジャケット", "六角形のメガネ"],
    tags: ["音声AI", "リサーチ"],
    nearbyOffset: [-0.00006, 0.00015],
  },
  {
    id: "reviewer-persona-11",
    publicCode: "RV1011",
    name: "吉田 修",
    reading: "Osamu Yoshida",
    org: "Mentor Dock",
    memo: "60代の細身の男性。白いカイゼルひげ、紺のフェルト帽、えんじ色のベスト、木製の杖が目印。起業家メンタリングの話をした。",
    visualTraits: ["60代の細身の男性", "白いカイゼルひげ", "紺のフェルト帽", "えんじ色のベスト", "木製の杖"],
    tags: ["起業", "メンタリング"],
  },
  {
    id: "reviewer-persona-12",
    publicCode: "RV1012",
    name: "高橋 紗季",
    reading: "Saki Takahashi",
    org: "Copy & Co.",
    memo: "30代の小柄な女性。一直線に切りそろえた黒いボブ、赤いキャットアイ型メガネ、白黒の水玉ブラウス。プロダクトのタグラインを一緒に考えた。",
    visualTraits: ["30代の小柄な女性", "一直線の黒いボブ", "赤いキャットアイ型メガネ", "白黒の水玉ブラウス"],
    tags: ["コピー", "ブランド"],
  },
  {
    id: "reviewer-persona-13",
    publicCode: "RV1013",
    name: "西村 陸",
    reading: "Riku Nishimura",
    org: "Field Robotics",
    memo: "20代の肩幅が広い男性。肩までの金髪、青いデニムのオーバーオール、首に赤い防音ヘッドホン。倉庫ロボットの実証実験を進めている。",
    visualTraits: ["20代の肩幅が広い男性", "肩までの金髪", "青いデニムのオーバーオール", "赤い防音ヘッドホン"],
    tags: ["ロボティクス", "物流"],
  },
  {
    id: "reviewer-persona-14",
    publicCode: "RV1014",
    name: "伊藤 真琴",
    reading: "Makoto Ito",
    org: "People First",
    memo: "50代の大柄な女性。白髪交じりの短いピクシーカット、鮮やかなオレンジのポンチョ、大きな木のネックレス。組織開発ワークショップを企画している。",
    visualTraits: ["50代の大柄な女性", "白髪交じりの短いピクシーカット", "鮮やかなオレンジのポンチョ", "大きな木のネックレス"],
    tags: ["組織開発", "HR"],
  },
  {
    id: "reviewer-persona-15",
    publicCode: "RV1015",
    name: "中村 慧",
    reading: "Kei Nakamura",
    org: "Green Ledger",
    memo: "40代の背が高く痩せた男性。長いダークブラウンの髪を後ろで束ね、エメラルド色の三つ揃いスーツ、ピンクのポケットチーフ。脱炭素データ基盤を作っている。",
    visualTraits: ["40代の背が高く痩せた男性", "長いダークブラウンの髪を後ろで束ねている", "エメラルド色の三つ揃いスーツ", "ピンクのポケットチーフ"],
    tags: ["脱炭素", "データ"],
  },
  {
    id: "reviewer-persona-16",
    publicCode: "RV1016",
    name: "小林 凛",
    reading: "Rin Kobayashi",
    org: "Signal Works",
    memo: "20代のスポーティーな女性。片側を刈り上げた紫の髪、白いテックウェアベスト、青い透明バイザー。災害通知サービスの開発者。",
    visualTraits: ["20代のスポーティーな女性", "片側を刈り上げた紫の髪", "白いテックウェアベスト", "青い透明バイザー"],
    tags: ["防災", "通知"],
  },
  {
    id: "reviewer-persona-17",
    publicCode: "RV1017",
    name: "山口 誠",
    reading: "Makoto Yamaguchi",
    org: "Rainy Day SaaS",
    memo: "30代のがっしりした男性。丸いマッシュヘア、黄色いレインコート、四角い透明フレームのメガネ。中小企業向けSaaSの販売パートナーを探している。",
    visualTraits: ["30代のがっしりした男性", "丸いマッシュヘア", "黄色いレインコート", "四角い透明フレームのメガネ"],
    tags: ["SaaS", "販売"],
  },
  {
    id: "reviewer-persona-18",
    publicCode: "RV1018",
    name: "青木 久美",
    reading: "Kumi Aoki",
    org: "Local Bloom",
    memo: "60代の小柄な女性。短い白い巻き髪、紫の丸メガネ、緑を基調にした大きな花柄ワンピース。商店街のデジタル化を支援している。",
    visualTraits: ["60代の小柄な女性", "短い白い巻き髪", "紫の丸メガネ", "緑の大きな花柄ワンピース"],
    tags: ["地域", "DX"],
  },
  {
    id: "reviewer-persona-19",
    publicCode: "RV1019",
    name: "斎藤 駿",
    reading: "Shun Saito",
    org: "Joyful Data",
    memo: "20代後半のとても背が高く細身の男性。大きく丸いオレンジ色のカーリーヘア、白黒チェックのスーツ、緑の蝶ネクタイ。データ可視化の登壇者。",
    visualTraits: ["20代後半のとても背が高く細身の男性", "大きく丸いオレンジ色のカーリーヘア", "白黒チェックのスーツ", "緑の蝶ネクタイ"],
    tags: ["データ可視化", "登壇"],
  },
  {
    id: "reviewer-persona-20",
    publicCode: "RV1020",
    name: "渡辺 澪",
    reading: "Mio Watanabe",
    org: "Moonshot Care",
    memo: "30代で中肉中背の人。青緑色のアンダーカット、オーバーサイズのピンクのカーディガン、三日月形のメガネ。介護者向けコミュニティを運営している。",
    visualTraits: ["30代で中肉中背", "青緑色のアンダーカット", "オーバーサイズのピンクのカーディガン", "三日月形のメガネ"],
    tags: ["ケア", "コミュニティ"],
  },
];

function getBinding(): D1Database {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error("Hello Againのデータベースに接続できませんでした。");
  return binding;
}

function parseArray<T>(value: string): T[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function isFresh(value: string | null) {
  if (!value) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= LOCATION_TTL_MS;
}

function toUser(row: UserRow): MataneUser {
  return {
    id: row.id,
    publicCode: row.public_code,
    accountEmail: row.email,
    name: row.name,
    reading: row.reading,
    org: row.org,
    avatarDataUrl: row.avatar_data_url,
    locationEnabled: Boolean(row.location_enabled) && isFresh(row.last_seen),
    lastSeen: row.last_seen,
    createdAt: row.created_at,
  };
}

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radius = 6_371_000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRad(lat2 - lat1);
  const deltaLon = toRad(lon2 - lon1);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(deltaLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toContact(row: ContactRow, owner: UserRow | null): ContactProfile {
  const locationFresh = Boolean(row.contact_location_enabled) && isFresh(row.contact_last_seen);
  const canMeasure =
    owner?.latitude != null &&
    owner.longitude != null &&
    row.contact_latitude != null &&
    row.contact_longitude != null &&
    Boolean(owner.location_enabled) &&
    isFresh(owner.last_seen) &&
    locationFresh;
  const distance = canMeasure
    ? distanceMeters(
        owner.latitude as number,
        owner.longitude as number,
        row.contact_latitude as number,
        row.contact_longitude as number
      )
    : null;
  return {
    contactUserId: row.contact_user_id,
    name: row.contact_name,
    nickname: row.nickname,
    reading: row.contact_reading,
    org: row.contact_org,
    avatarDataUrl: row.contact_avatar_data_url,
    tags: parseArray<string>(row.tags),
    memos: parseArray<Memo>(row.memos),
    facts: parseArray<string>(row.facts),
    visualTraits: parseArray<string>(row.visual_traits),
    portraitFaceAvailable: Boolean(row.portrait_key),
    portraitFullBodyAvailable: Boolean(row.portrait_full_body_key),
    portraitPreviousAvailable: Boolean(row.portrait_previous_key && row.portrait_previous_full_body_key),
    portraitPreviousUpdatedAt: row.portrait_previous_updated_at,
    portraitMode: row.portrait_mode === "openai" || row.portrait_mode === "fallback" ? row.portrait_mode : null,
    portraitDisclaimer: row.portrait_disclaimer,
    portraitUpdatedAt: row.portrait_updated_at,
    alertLevel: row.alert_level === "caution" ? "caution" : "normal",
    alertSuggested: Boolean(row.alert_suggested),
    alertReason: row.alert_reason,
    hudText: row.hud_text,
    lastSeen: row.contact_last_seen,
    nearby: distance != null && distance <= NEARBY_RADIUS_METERS,
    distanceMeters: distance == null ? null : Math.round(distance),
    exchangedAt: row.exchanged_at || row.created_at,
    exchangePlaceLabel: exchangePlaceLabel(row.exchange_latitude, row.exchange_longitude),
    exchangeLatitude: row.exchange_latitude,
    exchangeLongitude: row.exchange_longitude,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function exchangePlaceLabel(latitude: number | null, longitude: number | null) {
  if (latitude == null || longitude == null) return "場所は記録されていません";
  if (distanceMeters(latitude, longitude, REVIEWER_VENUE.latitude, REVIEWER_VENUE.longitude) <= 250) {
    return `${REVIEWER_VENUE.name}付近`;
  }
  return `緯度${latitude.toFixed(3)}・経度${longitude.toFixed(3)}付近`;
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function seedDemoUsers(db: D1Database) {
  const now = new Date().toISOString();
  await db.batch([
    db
      .prepare(
        `INSERT OR IGNORE INTO users (
          id, device_token, public_code, name, reading, org,
          location_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .bind(
        "demo-tanaka",
        "demo-token-tanaka",
        "TANAKA",
        "田中 太郎",
        "たなか たろう",
        "Neko Labs",
        now,
        now
      ),
    db
      .prepare(
        `INSERT OR IGNORE INTO users (
          id, device_token, public_code, name, reading, org,
          location_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
      .bind(
        "demo-sato",
        "demo-token-sato",
        "SATO39",
        "佐藤 美香",
        "さとう みか",
        "Growth Works",
        now,
        now
      ),
  ]);
}

export async function ensureMataneDb() {
  const db = getBinding();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      device_token TEXT NOT NULL UNIQUE,
      email TEXT,
      public_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      reading TEXT NOT NULL DEFAULT '',
      org TEXT NOT NULL DEFAULT '',
      avatar_data_url TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      location_accuracy REAL,
      location_enabled INTEGER NOT NULL DEFAULT 0,
      last_seen TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      contact_user_id TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '',
      exchanged_at TEXT NOT NULL DEFAULT '',
      exchange_latitude REAL,
      exchange_longitude REAL,
      exchange_accuracy REAL,
      tags TEXT NOT NULL DEFAULT '[]',
      memos TEXT NOT NULL DEFAULT '[]',
      facts TEXT NOT NULL DEFAULT '[]',
      visual_traits TEXT NOT NULL DEFAULT '[]',
      portrait_key TEXT NOT NULL DEFAULT '',
      portrait_full_body_key TEXT NOT NULL DEFAULT '',
      portrait_previous_key TEXT NOT NULL DEFAULT '',
      portrait_previous_full_body_key TEXT NOT NULL DEFAULT '',
      portrait_previous_mode TEXT NOT NULL DEFAULT '',
      portrait_previous_updated_at TEXT,
      portrait_mode TEXT NOT NULL DEFAULT '',
      portrait_disclaimer TEXT NOT NULL DEFAULT '',
      portrait_updated_at TEXT,
      alert_level TEXT NOT NULL DEFAULT 'normal',
      alert_suggested INTEGER NOT NULL DEFAULT 0,
      alert_reason TEXT,
      hud_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
    db.prepare(
      "CREATE UNIQUE INDEX IF NOT EXISTS contacts_owner_target_idx ON contacts (owner_id, contact_user_id)"
    ),
  ]);
  const userColumns = await db.prepare("PRAGMA table_info(users)").all<{ name: string }>();
  if (!(userColumns.results ?? []).some((column) => column.name === "email")) {
    await db.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();
  }
  if (!(userColumns.results ?? []).some((column) => column.name === "avatar_data_url")) {
    await db.prepare("ALTER TABLE users ADD COLUMN avatar_data_url TEXT NOT NULL DEFAULT ''").run();
  }
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users (email)").run();
  const contactColumns = await db.prepare("PRAGMA table_info(contacts)").all<{ name: string }>();
  if (!(contactColumns.results ?? []).some((column) => column.name === "nickname")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN nickname TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "exchanged_at")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN exchanged_at TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "exchange_latitude")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN exchange_latitude REAL").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "exchange_longitude")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN exchange_longitude REAL").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "exchange_accuracy")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN exchange_accuracy REAL").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "visual_traits")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN visual_traits TEXT NOT NULL DEFAULT '[]'").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "portrait_key")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN portrait_key TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "portrait_full_body_key")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN portrait_full_body_key TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "portrait_previous_key")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN portrait_previous_key TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "portrait_previous_full_body_key")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN portrait_previous_full_body_key TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "portrait_previous_mode")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN portrait_previous_mode TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "portrait_previous_updated_at")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN portrait_previous_updated_at TEXT").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "portrait_mode")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN portrait_mode TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "portrait_disclaimer")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN portrait_disclaimer TEXT NOT NULL DEFAULT ''").run();
  }
  if (!(contactColumns.results ?? []).some((column) => column.name === "portrait_updated_at")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN portrait_updated_at TEXT").run();
  }
  await seedDemoUsers(db);
  return db;
}

export async function createUser(input: {
  name: string;
  reading: string;
  org: string;
  avatarDataUrl: string;
  accountEmail: string | null;
}): Promise<{ user: MataneUser; token: string }> {
  const db = await ensureMataneDb();
  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const now = new Date().toISOString();
  let publicCode = randomCode();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const existing = await db
      .prepare("SELECT id FROM users WHERE public_code = ?")
      .bind(publicCode)
      .first<{ id: string }>();
    if (!existing) break;
    publicCode = randomCode();
  }
  await db
    .prepare(
      `INSERT INTO users (
        id, device_token, email, public_code, name, reading, org, avatar_data_url,
        location_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(id, token, input.accountEmail, publicCode, input.name, input.reading, input.org, input.avatarDataUrl, now, now)
    .run();
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  if (!row) throw new Error("プロフィールを作成できませんでした。");
  return { user: toUser(row), token };
}

export async function createReviewerDemoSession() {
  const created = await createUser({
    name: "審査デモ",
    reading: "Judge Demo",
    org: "OpenAI Build Week · JUDGE DEMO",
    avatarDataUrl: "",
    accountEmail: null,
  });
  const db = await ensureMataneDb();
  const now = new Date().toISOString();

  await db
    .prepare(
      `UPDATE users SET latitude = ?, longitude = ?, location_accuracy = 12,
       location_enabled = 1, last_seen = ?, updated_at = ? WHERE id = ?`
    )
    .bind(REVIEWER_VENUE.latitude, REVIEWER_VENUE.longitude, now, now, created.user.id)
    .run();

  await db.batch(
    REVIEWER_PERSONAS.map((persona) => {
      const nearby = Boolean(persona.nearbyOffset);
      const latitude = nearby ? REVIEWER_VENUE.latitude + (persona.nearbyOffset?.[0] ?? 0) : null;
      const longitude = nearby ? REVIEWER_VENUE.longitude + (persona.nearbyOffset?.[1] ?? 0) : null;
      return db
        .prepare(
          `INSERT INTO users (
            id, device_token, public_code, name, reading, org, avatar_data_url,
            latitude, longitude, location_accuracy, location_enabled, last_seen,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            reading = excluded.reading,
            org = excluded.org,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            location_accuracy = excluded.location_accuracy,
            location_enabled = excluded.location_enabled,
            last_seen = excluded.last_seen,
            updated_at = excluded.updated_at`
        )
        .bind(
          persona.id,
          `reviewer-persona-token-${persona.id.slice(-2)}`,
          persona.publicCode,
          persona.name,
          persona.reading,
          persona.org,
          latitude,
          longitude,
          nearby ? 12 : null,
          nearby ? 1 : 0,
          nearby ? now : null,
          now,
          now
        );
    })
  );

  await db.batch(
    REVIEWER_PERSONAS.map((persona, index) => {
      const updatedAt = new Date(Date.now() - index * 60_000).toISOString();
      return db
        .prepare(
          `INSERT INTO contacts (
            id, owner_id, contact_user_id, tags, memos, facts, visual_traits,
            exchanged_at, exchange_latitude, exchange_longitude, exchange_accuracy,
            alert_level, alert_suggested, alert_reason, hud_text, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 20, 'normal', 0, NULL, ?, ?, ?)
          ON CONFLICT(owner_id, contact_user_id) DO UPDATE SET
            tags = excluded.tags,
            memos = excluded.memos,
            facts = excluded.facts,
            visual_traits = excluded.visual_traits,
            exchanged_at = excluded.exchanged_at,
            exchange_latitude = excluded.exchange_latitude,
            exchange_longitude = excluded.exchange_longitude,
            exchange_accuracy = excluded.exchange_accuracy,
            alert_level = excluded.alert_level,
            alert_suggested = excluded.alert_suggested,
            alert_reason = excluded.alert_reason,
            hud_text = excluded.hud_text,
            updated_at = excluded.updated_at`
        )
        .bind(
          `${created.user.id}:${persona.id}`,
          created.user.id,
          persona.id,
          JSON.stringify(persona.tags),
          JSON.stringify([{ date: "2026-07-18", text: persona.memo }]),
          JSON.stringify([persona.memo]),
          JSON.stringify(persona.visualTraits),
          "2026-07-18T04:30:00.000Z",
          REVIEWER_VENUE.latitude,
          REVIEWER_VENUE.longitude,
          `${persona.name}さん｜${persona.org}\n${persona.tags[0]}の話を続ける`,
          now,
          updatedAt
        );
    })
  );

  const reviewer = await db.prepare("SELECT * FROM users WHERE id = ?").bind(created.user.id).first<UserRow>();
  if (!reviewer) throw new Error("審査デモを準備できませんでした。");
  return {
    ...(await sessionSnapshot(reviewer)),
    token: created.token,
    reviewerMode: true,
    venue: REVIEWER_VENUE,
  };
}

export async function updateUserProfile(input: {
  userId: string;
  name: string;
  reading: string;
  org: string;
  avatarDataUrl: string;
}) {
  const db = await ensureMataneDb();
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE users SET name = ?, reading = ?, org = ?, avatar_data_url = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(input.name, input.reading, input.org, input.avatarDataUrl, now, input.userId)
    .run();
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(input.userId).first<UserRow>();
  if (!row) throw new Error("プロフィールを更新できませんでした。");
  return toUser(row);
}

export async function getUserByToken(token: string): Promise<UserRow | null> {
  if (!token) return null;
  const db = await ensureMataneDb();
  return (await db
    .prepare("SELECT * FROM users WHERE device_token = ?")
    .bind(token)
    .first<UserRow>()) ?? null;
}

export async function getUserByEmail(email: string): Promise<UserRow | null> {
  if (!email) return null;
  const db = await ensureMataneDb();
  return (await db
    .prepare("SELECT * FROM users WHERE email = ?")
    .bind(email.trim().toLowerCase())
    .first<UserRow>()) ?? null;
}

export async function linkUserEmail(userId: string, email: string): Promise<UserRow> {
  const db = await ensureMataneDb();
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(normalizedEmail).first<{ id: string }>();
  if (existing && existing.id !== userId) throw new Error("EMAIL_ALREADY_LINKED");
  await db
    .prepare("UPDATE users SET email = ?, updated_at = ? WHERE id = ?")
    .bind(normalizedEmail, new Date().toISOString(), userId)
    .run();
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
  if (!row) throw new Error("プロフィールを更新できませんでした。");
  return row;
}

export function tokenFromRequest(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
}

export async function requireUser(request: Request): Promise<UserRow> {
  const user = await getUserByToken(tokenFromRequest(request));
  if (!user) throw new Error("SESSION_REQUIRED");
  return user;
}

async function contactRows(ownerId: string) {
  const db = await ensureMataneDb();
  const result = await db
    .prepare(
      `SELECT
        c.owner_id, c.contact_user_id, c.nickname, c.exchanged_at,
        c.exchange_latitude, c.exchange_longitude, c.exchange_accuracy,
        c.tags, c.memos, c.facts, c.visual_traits,
        c.portrait_key, c.portrait_full_body_key,
        c.portrait_previous_key, c.portrait_previous_full_body_key,
        c.portrait_previous_mode, c.portrait_previous_updated_at,
        c.portrait_mode, c.portrait_disclaimer, c.portrait_updated_at,
        c.alert_level, c.alert_suggested, c.alert_reason, c.hud_text,
        c.created_at, c.updated_at,
        u.name AS contact_name, u.reading AS contact_reading,
        u.org AS contact_org, u.avatar_data_url AS contact_avatar_data_url,
        u.latitude AS contact_latitude,
        u.longitude AS contact_longitude,
        u.location_accuracy AS contact_location_accuracy,
        u.location_enabled AS contact_location_enabled,
        u.last_seen AS contact_last_seen
      FROM contacts c
      JOIN users u ON u.id = c.contact_user_id
      WHERE c.owner_id = ?
      ORDER BY c.alert_level = 'caution' DESC, c.updated_at DESC`
    )
    .bind(ownerId)
    .all<ContactRow>();
  return result.results ?? [];
}

export async function listContacts(ownerId: string): Promise<ContactProfile[]> {
  const db = await ensureMataneDb();
  const [owner, rows] = await Promise.all([
    db.prepare("SELECT * FROM users WHERE id = ?").bind(ownerId).first<UserRow>(),
    contactRows(ownerId),
  ]);
  return rows.map((row) => toContact(row, owner ?? null));
}

export async function sessionSnapshot(userRow: UserRow) {
  const contacts = await listContacts(userRow.id);
  return { user: toUser(userRow), contacts };
}

type ExchangePosition = { latitude: number; longitude: number; accuracy: number | null } | null;

async function addContactPair(db: D1Database, owner: UserRow, target: UserRow, position: ExchangePosition) {
  const now = new Date().toISOString();
  const hudText = `${target.name}さん${target.org ? `｜${target.org}` : ""}\n前回の続きを話す`;
  await db
    .prepare(
      `INSERT OR IGNORE INTO contacts (
        id, owner_id, contact_user_id, exchanged_at, exchange_latitude, exchange_longitude, exchange_accuracy,
        tags, memos, facts,
        alert_level, alert_suggested, hud_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]', 'normal', 0, ?, ?, ?)`
    )
    .bind(
      `${owner.id}:${target.id}`,
      owner.id,
      target.id,
      now,
      position?.latitude ?? null,
      position?.longitude ?? null,
      position?.accuracy ?? null,
      hudText,
      now,
      now
    )
    .run();
}

export async function exchangeContact(owner: UserRow, publicCode: string, position: ExchangePosition = null) {
  const db = await ensureMataneDb();
  const target = await db
    .prepare("SELECT * FROM users WHERE public_code = ?")
    .bind(publicCode.trim().toUpperCase())
    .first<UserRow>();
  if (!target) throw new Error("その交換コードは見つかりませんでした。");
  if (target.id === owner.id) throw new Error("自分自身とは交換できません。");
  const exchangePosition = position ?? (
    owner.latitude != null && owner.longitude != null && isFresh(owner.last_seen)
      ? { latitude: owner.latitude, longitude: owner.longitude, accuracy: owner.location_accuracy }
      : null
  );
  await addContactPair(db, owner, target, exchangePosition);
  await addContactPair(db, target, owner, exchangePosition);
  const contacts = await listContacts(owner.id);
  return {
    contacts,
    contact: contacts.find((contact) => contact.contactUserId === target.id) ?? null,
  };
}

export async function updateLocation(input: {
  userId: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  enabled: boolean;
}) {
  const db = await ensureMataneDb();
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE users SET latitude = ?, longitude = ?, location_accuracy = ?,
       location_enabled = ?, last_seen = ?, updated_at = ? WHERE id = ?`
    )
    .bind(
      input.enabled ? input.latitude : null,
      input.enabled ? input.longitude : null,
      input.enabled ? input.accuracy : null,
      input.enabled ? 1 : 0,
      input.enabled ? now : null,
      now,
      input.userId
    )
    .run();
  return listContacts(input.userId);
}

export async function getContact(ownerId: string, contactUserId: string) {
  const contacts = await listContacts(ownerId);
  return contacts.find((contact) => contact.contactUserId === contactUserId) ?? null;
}

export async function getContactPortrait(ownerId: string, contactUserId: string) {
  const db = await ensureMataneDb();
  return (await db
    .prepare(
      `SELECT portrait_key, portrait_full_body_key,
       portrait_previous_key, portrait_previous_full_body_key,
       portrait_previous_mode, portrait_previous_updated_at,
       portrait_mode, portrait_disclaimer, portrait_updated_at
       FROM contacts WHERE owner_id = ? AND contact_user_id = ?`
    )
    .bind(ownerId, contactUserId)
    .first<{
      portrait_key: string;
      portrait_full_body_key: string;
      portrait_previous_key: string;
      portrait_previous_full_body_key: string;
      portrait_previous_mode: string;
      portrait_previous_updated_at: string | null;
      portrait_mode: string;
      portrait_disclaimer: string;
      portrait_updated_at: string | null;
    }>()) ?? null;
}

export async function saveContactPortrait(input: {
  ownerId: string;
  contactUserId: string;
  faceKey: string;
  fullBodyKey: string;
  previousFaceKey: string;
  previousFullBodyKey: string;
  previousMode: "openai" | "fallback" | "";
  previousUpdatedAt: string | null;
  mode: "openai" | "fallback";
  disclaimer: string;
}) {
  const db = await ensureMataneDb();
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE contacts SET portrait_key = ?, portrait_full_body_key = ?,
       portrait_previous_key = ?, portrait_previous_full_body_key = ?,
       portrait_previous_mode = ?, portrait_previous_updated_at = ?,
       portrait_mode = ?, portrait_disclaimer = ?,
       portrait_updated_at = ?, updated_at = ? WHERE owner_id = ? AND contact_user_id = ?`
    )
    .bind(
      input.faceKey,
      input.fullBodyKey,
      input.previousFaceKey,
      input.previousFullBodyKey,
      input.previousMode,
      input.previousUpdatedAt,
      input.mode,
      input.disclaimer,
      now,
      now,
      input.ownerId,
      input.contactUserId
    )
    .run();
  if (!result.meta.changes) throw new Error("交換済みの相手が見つかりませんでした。");
  return getContact(input.ownerId, input.contactUserId);
}

export async function finalizeContactPortrait(input: {
  ownerId: string;
  contactUserId: string;
  choice: "current" | "previous";
}) {
  const db = await ensureMataneDb();
  const saved = await getContactPortrait(input.ownerId, input.contactUserId);
  if (!saved) throw new Error("交換済みの相手が見つかりませんでした。");
  if (!saved.portrait_previous_key || !saved.portrait_previous_full_body_key) {
    throw new Error("比較できる前回画像がありません。");
  }
  const now = new Date().toISOString();
  if (input.choice === "previous") {
    await db
      .prepare(
        `UPDATE contacts SET portrait_key = ?, portrait_full_body_key = ?, portrait_mode = ?,
         portrait_updated_at = ?, portrait_previous_key = '', portrait_previous_full_body_key = '',
         portrait_previous_mode = '', portrait_previous_updated_at = NULL, updated_at = ?
         WHERE owner_id = ? AND contact_user_id = ?`
      )
      .bind(
        saved.portrait_previous_key,
        saved.portrait_previous_full_body_key,
        saved.portrait_previous_mode || "fallback",
        saved.portrait_previous_updated_at || now,
        now,
        input.ownerId,
        input.contactUserId
      )
      .run();
  } else {
    await db
      .prepare(
        `UPDATE contacts SET portrait_previous_key = '', portrait_previous_full_body_key = '',
         portrait_previous_mode = '', portrait_previous_updated_at = NULL, updated_at = ?
         WHERE owner_id = ? AND contact_user_id = ?`
      )
      .bind(now, input.ownerId, input.contactUserId)
      .run();
  }
  return {
    contact: await getContact(input.ownerId, input.contactUserId),
    discardedKeys: input.choice === "previous"
      ? [saved.portrait_key, saved.portrait_full_body_key]
      : [saved.portrait_previous_key, saved.portrait_previous_full_body_key],
  };
}

export async function updateContactNickname(input: {
  ownerId: string;
  contactUserId: string;
  nickname: string;
}) {
  const db = await ensureMataneDb();
  const nickname = input.nickname.trim().slice(0, 30);
  const result = await db
    .prepare("UPDATE contacts SET nickname = ?, updated_at = ? WHERE owner_id = ? AND contact_user_id = ?")
    .bind(nickname, new Date().toISOString(), input.ownerId, input.contactUserId)
    .run();
  if (!result.meta.changes) throw new Error("交換済みの相手が見つかりませんでした。");
  return getContact(input.ownerId, input.contactUserId);
}

export async function updateMemory(input: {
  ownerId: string;
  contactUserId: string;
  memo: string;
  facts: string[];
  visualTraits: string[];
  tags: string[];
  alertSuggested: boolean;
  alertReason: string | null;
  hudText: string;
}) {
  const db = await ensureMataneDb();
  const current = await getContact(input.ownerId, input.contactUserId);
  if (!current) throw new Error("交換済みの相手が見つかりませんでした。");
  const now = new Date().toISOString();
  const memos = [...current.memos, { date: now.slice(0, 10), text: input.memo }];
  const tags = Array.from(new Set([...current.tags, ...input.tags])).slice(0, 8);
  const facts = Array.from(new Set([...current.facts, ...input.facts])).slice(-8);
  const visualTraits = Array.from(new Set([...current.visualTraits, ...input.visualTraits])).slice(-8);
  await db
    .prepare(
      `UPDATE contacts SET tags = ?, memos = ?, facts = ?, visual_traits = ?,
       alert_suggested = ?, alert_reason = ?, hud_text = ?, updated_at = ?
       WHERE owner_id = ? AND contact_user_id = ?`
    )
    .bind(
      JSON.stringify(tags),
      JSON.stringify(memos),
      JSON.stringify(facts),
      JSON.stringify(visualTraits),
      input.alertSuggested ? 1 : 0,
      input.alertReason,
      input.hudText,
      now,
      input.ownerId,
      input.contactUserId
    )
    .run();
  return getContact(input.ownerId, input.contactUserId);
}

export async function replaceMemories(input: {
  ownerId: string;
  contactUserId: string;
  memos: Memo[];
  facts: string[];
  visualTraits: string[];
  tags: string[];
  alertSuggested: boolean;
  alertReason: string | null;
  hudText: string;
}) {
  const db = await ensureMataneDb();
  const current = await getContact(input.ownerId, input.contactUserId);
  if (!current) throw new Error("交換済みの相手が見つかりませんでした。");
  const cautionActive = current.alertLevel === "caution";
  await db
    .prepare(
      `UPDATE contacts SET tags = ?, memos = ?, facts = ?, visual_traits = ?,
       alert_suggested = ?, alert_reason = ?, hud_text = ?, updated_at = ?
       WHERE owner_id = ? AND contact_user_id = ?`
    )
    .bind(
      JSON.stringify(input.tags.slice(0, 8)),
      JSON.stringify(input.memos),
      JSON.stringify(input.facts.slice(-8)),
      JSON.stringify(input.visualTraits.slice(-8)),
      cautionActive ? 0 : input.alertSuggested ? 1 : 0,
      cautionActive ? current.alertReason : input.alertReason,
      cautionActive ? current.hudText : input.hudText,
      new Date().toISOString(),
      input.ownerId,
      input.contactUserId
    )
    .run();
  return getContact(input.ownerId, input.contactUserId);
}

export async function setAlert(ownerId: string, contactUserId: string, approved: boolean) {
  const db = await ensureMataneDb();
  const current = await getContact(ownerId, contactUserId);
  if (!current) throw new Error("交換済みの相手が見つかりませんでした。");
  const reason = approved ? current.alertReason || "前回のメモを確認" : null;
  const hudText = approved
    ? `!! ${current.name}さんが近くにいます\n${reason} → 無理せず離れる`
    : `${current.name}さん${current.org ? `｜${current.org}` : ""}\n前回の続きを話す`;
  await db
    .prepare(
      `UPDATE contacts SET alert_level = ?, alert_suggested = 0,
       alert_reason = ?, hud_text = ?, updated_at = ?
       WHERE owner_id = ? AND contact_user_id = ?`
    )
    .bind(
      approved ? "caution" : "normal",
      reason,
      hudText,
      new Date().toISOString(),
      ownerId,
      contactUserId
    )
    .run();
  return getContact(ownerId, contactUserId);
}

export async function addDemoNearby(owner: UserRow, latitude: number, longitude: number) {
  const db = await ensureMataneDb();
  const now = new Date().toISOString();
  const tanaka = await db.prepare("SELECT * FROM users WHERE id = 'demo-tanaka'").first<UserRow>();
  const sato = await db.prepare("SELECT * FROM users WHERE id = 'demo-sato'").first<UserRow>();
  if (!tanaka || !sato) throw new Error("デモ人物を準備できませんでした。");
  const position = { latitude, longitude, accuracy: 20 };
  await addContactPair(db, owner, tanaka, position);
  await addContactPair(db, tanaka, owner, position);
  await addContactPair(db, owner, sato, position);
  await addContactPair(db, sato, owner, position);
  await db.batch([
    db
      .prepare(
        `UPDATE users SET latitude = ?, longitude = ?, location_accuracy = 20,
         location_enabled = 1, last_seen = ?, updated_at = ? WHERE id = 'demo-tanaka'`
      )
      .bind(latitude + 0.00016, longitude, now, now),
    db
      .prepare(
        `UPDATE users SET latitude = ?, longitude = ?, location_accuracy = 20,
         location_enabled = 1, last_seen = ?, updated_at = ? WHERE id = 'demo-sato'`
      )
      .bind(latitude, longitude + 0.00038, now, now),
    db
      .prepare(
        `UPDATE contacts SET tags = ?, memos = ?, facts = ?, visual_traits = ?, hud_text = ?, updated_at = ?
         WHERE owner_id = ? AND contact_user_id = 'demo-tanaka'`
      )
      .bind(
        JSON.stringify(["猫", "Python"]),
        JSON.stringify([{ date: "2026-07-18", text: "40代のふくよかな男性。猫を2匹飼っている。Pythonが得意。丸い黒縁メガネと緑のパーカーが印象的。" }]),
        JSON.stringify(["猫を2匹飼っている", "Pythonが得意"]),
        JSON.stringify(["40代のふくよかな男性", "丸い黒縁メガネ", "緑のパーカー", "穏やかな雰囲気"]),
        "田中さん｜Neko Labs\n猫の話 → 2匹とも元気？",
        now,
        owner.id
      ),
    db
      .prepare(
        `UPDATE contacts SET tags = ?, memos = ?, facts = ?, visual_traits = ?, alert_level = 'caution',
         alert_reason = ?, hud_text = ?, updated_at = ?
         WHERE owner_id = ? AND contact_user_id = 'demo-sato'`
      )
      .bind(
        JSON.stringify(["営業", "SaaS"]),
        JSON.stringify([{ date: "2026-07-18", text: "前回は強引な勧誘が続いて少し困った。" }]),
        JSON.stringify(["前回は勧誘が長かった"]),
        JSON.stringify(["紺のジャケット", "きびきびした雰囲気"]),
        "強引な勧誘が続いた",
        "!! 佐藤さんが近くにいます\n強引な勧誘 → 無理せず離れる",
        now,
        owner.id
      ),
  ]);
  return listContacts(owner.id);
}
