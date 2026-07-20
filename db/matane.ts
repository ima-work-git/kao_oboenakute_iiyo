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
  name: "Shibuya Solasta Conference",
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
    name: "Yuto Kuroda",
    reading: "YOO-toh koo-ROH-dah",
    org: "Pixel Forge",
    memo: "A tall, slim man in his 30s. A bright red knit cap, round silver glasses, and a mustard overshirt make him easy to spot. We last talked about accessible interface design.",
    visualTraits: ["tall slim man in his 30s", "bright red knit cap", "round silver glasses", "mustard overshirt"],
    tags: ["UI", "Accessibility"],
    nearbyOffset: [0.00007, 0.00003],
  },
  {
    id: "reviewer-persona-02",
    publicCode: "RV1002",
    name: "Aya Morikawa",
    reading: "AH-yah moh-ree-KAH-wah",
    org: "Canvas AI",
    memo: "A petite woman in her late 20s with a short pink bob, oversized white glasses, and a cobalt blue dress. She researches generative AI and brand design.",
    visualTraits: ["petite woman in her late 20s", "short pink bob", "oversized white glasses", "cobalt blue dress"],
    tags: ["Generative AI", "Brand design"],
    nearbyOffset: [-0.00008, 0.00004],
  },
  {
    id: "reviewer-persona-03",
    publicCode: "RV1003",
    name: "Kenji Ohashi",
    reading: "KEN-jee oh-HAH-shee",
    org: "FinBridge",
    memo: "A very heavyset man in his 40s with a shaved head, thick black beard, green aloha shirt, and chunky orange watch. He is looking for a financial API partner.",
    visualTraits: ["very heavyset man in his 40s", "shaved head", "thick black beard", "green aloha shirt", "chunky orange watch"],
    tags: ["FinTech", "API"],
    nearbyOffset: [0.00012, -0.00002],
  },
  {
    id: "reviewer-persona-04",
    publicCode: "RV1004",
    name: "Rena Mizuno",
    reading: "REH-nah mee-ZOO-noh",
    org: "Sprint Base",
    memo: "A tall, athletic woman in her 30s with a high ponytail, orange track jacket, and large silver headphones around her neck. We discussed hiring product managers.",
    visualTraits: ["tall athletic woman in her 30s", "high ponytail", "orange track jacket", "large silver headphones"],
    tags: ["Product", "Hiring"],
    nearbyOffset: [-0.00011, -0.00005],
  },
  {
    id: "reviewer-persona-05",
    publicCode: "RV1005",
    name: "Ren Okamoto",
    reading: "REN oh-kah-MOH-toh",
    org: "Fluid Studio",
    memo: "A slim, androgynous person in their 20s with asymmetrical short blue hair, a purple double-breasted suit, and one large triangular earring. They build spatial-computing exhibits.",
    visualTraits: ["slim androgynous person in their 20s", "asymmetrical short blue hair", "purple double-breasted suit", "one large triangular earring"],
    tags: ["XR", "Exhibits"],
    nearbyOffset: [0.00003, 0.00009],
  },
  {
    id: "reviewer-persona-06",
    publicCode: "RV1006",
    name: "Naoko Kamiya",
    reading: "nah-OH-koh kah-MEE-yah",
    org: "Startup Legal Lab",
    memo: "A woman in her 50s with voluminous gray curls, yellow cat-eye glasses, and a vivid red scarf. She offered a free consultation on startup contracts.",
    visualTraits: ["woman in her 50s", "voluminous gray curls", "yellow cat-eye glasses", "vivid red scarf"],
    tags: ["Legal", "Startups"],
    nearbyOffset: [-0.00004, -0.0001],
  },
  {
    id: "reviewer-persona-07",
    publicCode: "RV1007",
    name: "Wataru Matsuda",
    reading: "wah-TAH-roo maht-SOO-dah",
    org: "MoveX",
    memo: "A muscular man in his late 20s with a short fade and shaved line, white bomber jacket, and neon green sneakers. He is exploring a wellness-app partnership.",
    visualTraits: ["muscular man in his late 20s", "short fade with a shaved line", "white bomber jacket", "neon green sneakers"],
    tags: ["Wellness", "Partnerships"],
    nearbyOffset: [0.00015, 0.00006],
  },
  {
    id: "reviewer-persona-08",
    publicCode: "RV1008",
    name: "An Ishii",
    reading: "AHN ee-SHEE-ee",
    org: "Culture Grid",
    memo: "A plus-size woman in her 40s with one waist-length silver braid, a turquoise kimono-style jacket, and large star-shaped earrings. She runs a local-culture digital archive.",
    visualTraits: ["plus-size woman in her 40s", "waist-length silver braid", "turquoise kimono-style jacket", "large star-shaped earrings"],
    tags: ["Culture", "Archives"],
    nearbyOffset: [-0.00016, 0.00003],
  },
  {
    id: "reviewer-persona-09",
    publicCode: "RV1009",
    name: "Sho Fujiwara",
    reading: "SHOH foo-jee-WAH-rah",
    org: "Lens Loop",
    memo: "A short man in his 30s with very tight black curls, a thick mustache, purple hoodie, and yellow cross-body camera strap. We discussed a quote for event photography.",
    visualTraits: ["short man in his 30s", "very tight black curls", "thick mustache", "purple hoodie", "yellow camera strap"],
    tags: ["Photography", "Events"],
    nearbyOffset: [0.00002, -0.00014],
  },
  {
    id: "reviewer-persona-10",
    publicCode: "RV1010",
    name: "Mei Hasegawa",
    reading: "MAY hah-seh-GAH-wah",
    org: "Neon Research",
    memo: "A tall, slim woman in her 20s with two long braids, lime-green jacket, black turtleneck, and hexagonal glasses. She conducts user research for voice AI.",
    visualTraits: ["tall slim woman in her 20s", "two long braids", "lime-green jacket", "black turtleneck", "hexagonal glasses"],
    tags: ["Voice AI", "Research"],
    nearbyOffset: [-0.00006, 0.00015],
  },
  {
    id: "reviewer-persona-11",
    publicCode: "RV1011",
    name: "Osamu Yoshida",
    reading: "oh-SAH-moo yoh-SHEE-dah",
    org: "Mentor Dock",
    memo: "A slim man in his 60s with a white handlebar mustache, navy felt hat, burgundy vest, and wooden walking stick. We talked about founder mentoring.",
    visualTraits: ["slim man in his 60s", "white handlebar mustache", "navy felt hat", "burgundy vest", "wooden walking stick"],
    tags: ["Founders", "Mentoring"],
  },
  {
    id: "reviewer-persona-12",
    publicCode: "RV1012",
    name: "Saki Takahashi",
    reading: "SAH-kee tah-kah-HAH-shee",
    org: "Copy & Co.",
    memo: "A petite woman in her 30s with a blunt black bob, red cat-eye glasses, and a black-and-white polka-dot blouse. We worked on a product tagline together.",
    visualTraits: ["petite woman in her 30s", "blunt black bob", "red cat-eye glasses", "black-and-white polka-dot blouse"],
    tags: ["Copywriting", "Brand"],
  },
  {
    id: "reviewer-persona-13",
    publicCode: "RV1013",
    name: "Riku Nishimura",
    reading: "REE-koo nee-shee-MOO-rah",
    org: "Field Robotics",
    memo: "A broad-shouldered man in his 20s with shoulder-length blond hair, blue denim overalls, and red hearing-protection headphones around his neck. He is piloting warehouse robots.",
    visualTraits: ["broad-shouldered man in his 20s", "shoulder-length blond hair", "blue denim overalls", "red hearing-protection headphones"],
    tags: ["Robotics", "Logistics"],
  },
  {
    id: "reviewer-persona-14",
    publicCode: "RV1014",
    name: "Makoto Ito",
    reading: "mah-KOH-toh EE-toh",
    org: "People First",
    memo: "A large-framed woman in her 50s with a short salt-and-pepper pixie cut, bright orange poncho, and oversized wooden necklace. She organizes team-development workshops.",
    visualTraits: ["large-framed woman in her 50s", "short salt-and-pepper pixie cut", "bright orange poncho", "oversized wooden necklace"],
    tags: ["Organization design", "HR"],
  },
  {
    id: "reviewer-persona-15",
    publicCode: "RV1015",
    name: "Kei Nakamura",
    reading: "KAY nah-kah-MOO-rah",
    org: "Green Ledger",
    memo: "A tall, thin man in his 40s with long dark-brown hair tied back, an emerald three-piece suit, and a pink pocket square. He builds a carbon-accounting data platform.",
    visualTraits: ["tall thin man in his 40s", "long dark-brown hair tied back", "emerald three-piece suit", "pink pocket square"],
    tags: ["Climate", "Data"],
  },
  {
    id: "reviewer-persona-16",
    publicCode: "RV1016",
    name: "Rin Kobayashi",
    reading: "REEN koh-bah-YAH-shee",
    org: "Signal Works",
    memo: "An athletic woman in her 20s with purple hair shaved on one side, a white techwear vest, and a translucent blue visor. She develops an emergency-alert service.",
    visualTraits: ["athletic woman in her 20s", "purple hair shaved on one side", "white techwear vest", "translucent blue visor"],
    tags: ["Emergency tech", "Notifications"],
  },
  {
    id: "reviewer-persona-17",
    publicCode: "RV1017",
    name: "Makoto Yamaguchi",
    reading: "mah-KOH-toh yah-mah-GOO-chee",
    org: "Rainy Day SaaS",
    memo: "A stocky man in his 30s with a rounded bowl cut, yellow raincoat, and square clear-frame glasses. He is looking for sales partners for a small-business SaaS product.",
    visualTraits: ["stocky man in his 30s", "rounded bowl cut", "yellow raincoat", "square clear-frame glasses"],
    tags: ["SaaS", "Sales"],
  },
  {
    id: "reviewer-persona-18",
    publicCode: "RV1018",
    name: "Kumi Aoki",
    reading: "KOO-mee ah-OH-kee",
    org: "Local Bloom",
    memo: "A petite woman in her 60s with short white curls, round purple glasses, and a green dress with oversized floral prints. She helps shopping streets modernize digitally.",
    visualTraits: ["petite woman in her 60s", "short white curls", "round purple glasses", "green oversized-floral dress"],
    tags: ["Local business", "Digital transformation"],
  },
  {
    id: "reviewer-persona-19",
    publicCode: "RV1019",
    name: "Shun Saito",
    reading: "SHOON sigh-TOH",
    org: "Joyful Data",
    memo: "A very tall, slim man in his late 20s with a large round orange afro, black-and-white checked suit, and green bow tie. He speaks about data visualization.",
    visualTraits: ["very tall slim man in his late 20s", "large round orange afro", "black-and-white checked suit", "green bow tie"],
    tags: ["Data visualization", "Speaking"],
  },
  {
    id: "reviewer-persona-20",
    publicCode: "RV1020",
    name: "Mio Watanabe",
    reading: "MEE-oh wah-tah-NAH-beh",
    org: "Moonshot Care",
    memo: "A medium-build person in their 30s with a teal undercut, oversized pink cardigan, and crescent-shaped glasses. They run a community for family caregivers.",
    visualTraits: ["medium-build person in their 30s", "teal undercut", "oversized pink cardigan", "crescent-shaped glasses"],
    tags: ["Caregiving", "Community"],
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
  if (latitude == null || longitude == null) return "No place was recorded";
  if (distanceMeters(latitude, longitude, REVIEWER_VENUE.latitude, REVIEWER_VENUE.longitude) <= 250) {
    return `Near ${REVIEWER_VENUE.name}`;
  }
  return `Near ${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;
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
        `INSERT INTO users (
          id, device_token, public_code, name, reading, org,
          location_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          reading = excluded.reading,
          org = excluded.org,
          updated_at = excluded.updated_at`
      )
      .bind(
        "demo-tanaka",
        "demo-token-tanaka",
        "TANAKA",
        "Taro Tanaka",
        "TAH-roh tah-NAH-kah",
        "Neko Labs",
        now,
        now
      ),
    db
      .prepare(
        `INSERT INTO users (
          id, device_token, public_code, name, reading, org,
          location_enabled, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          reading = excluded.reading,
          org = excluded.org,
          updated_at = excluded.updated_at`
      )
      .bind(
        "demo-sato",
        "demo-token-sato",
        "SATO39",
        "Mika Sato",
        "MEE-kah SAH-toh",
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
    name: "Judge Demo",
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
          `${persona.name} · ${persona.org}\nContinue the ${persona.tags[0]} conversation`,
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
        JSON.stringify(["Cats", "Python"]),
        JSON.stringify([{ date: "2026-07-18", text: "A heavyset man in his 40s who owns two cats and is great with Python. Round black glasses and a green hoodie make him easy to spot." }]),
        JSON.stringify(["Owns two cats", "Skilled with Python"]),
        JSON.stringify(["heavyset man in his 40s", "round black glasses", "green hoodie", "calm presence"]),
        "Taro Tanaka · Neko Labs\nAsk whether both cats are doing well",
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
        JSON.stringify(["Sales", "SaaS"]),
        JSON.stringify([{ date: "2026-07-18", text: "The last conversation became an uncomfortably persistent sales pitch." }]),
        JSON.stringify(["The last sales pitch was persistent"]),
        JSON.stringify(["navy jacket", "brisk manner"]),
        "Persistent sales pitch",
        "!! Mika Sato is nearby\nPersistent pitch · it is okay to step away",
        now,
        owner.id
      ),
  ]);
  return listContacts(owner.id);
}
