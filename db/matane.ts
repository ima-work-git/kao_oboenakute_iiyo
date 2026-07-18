import { env } from "cloudflare:workers";

export type Memo = {
  date: string;
  text: string;
};

export type MataneUser = {
  id: string;
  publicCode: string;
  name: string;
  reading: string;
  org: string;
  locationEnabled: boolean;
  lastSeen: string | null;
  createdAt: string;
};

export type ContactProfile = {
  contactUserId: string;
  name: string;
  reading: string;
  org: string;
  tags: string[];
  memos: Memo[];
  facts: string[];
  visualTraits: string[];
  alertLevel: "normal" | "caution";
  alertSuggested: boolean;
  alertReason: string | null;
  hudText: string;
  lastSeen: string | null;
  nearby: boolean;
  distanceMeters: number | null;
  createdAt: string;
  updatedAt: string;
};

type UserRow = {
  id: string;
  device_token: string;
  public_code: string;
  name: string;
  reading: string;
  org: string;
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
  contact_latitude: number | null;
  contact_longitude: number | null;
  contact_location_accuracy: number | null;
  contact_location_enabled: number;
  contact_last_seen: string | null;
  tags: string;
  memos: string;
  facts: string;
  visual_traits: string;
  alert_level: string;
  alert_suggested: number;
  alert_reason: string | null;
  hud_text: string;
  created_at: string;
  updated_at: string;
};

const LOCATION_TTL_MS = 60 * 60 * 1000;
export const NEARBY_RADIUS_METERS = 150;

function getBinding(): D1Database {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error("MATANEのデータベースに接続できませんでした。");
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
    name: row.name,
    reading: row.reading,
    org: row.org,
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
    reading: row.contact_reading,
    org: row.contact_org,
    tags: parseArray<string>(row.tags),
    memos: parseArray<Memo>(row.memos),
    facts: parseArray<string>(row.facts),
    visualTraits: parseArray<string>(row.visual_traits),
    alertLevel: row.alert_level === "caution" ? "caution" : "normal",
    alertSuggested: Boolean(row.alert_suggested),
    alertReason: row.alert_reason,
    hudText: row.hud_text,
    lastSeen: row.contact_last_seen,
    nearby: distance != null && distance <= NEARBY_RADIUS_METERS,
    distanceMeters: distance == null ? null : Math.round(distance),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
      public_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      reading TEXT NOT NULL DEFAULT '',
      org TEXT NOT NULL DEFAULT '',
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
      tags TEXT NOT NULL DEFAULT '[]',
      memos TEXT NOT NULL DEFAULT '[]',
      facts TEXT NOT NULL DEFAULT '[]',
      visual_traits TEXT NOT NULL DEFAULT '[]',
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
  const contactColumns = await db.prepare("PRAGMA table_info(contacts)").all<{ name: string }>();
  if (!(contactColumns.results ?? []).some((column) => column.name === "visual_traits")) {
    await db.prepare("ALTER TABLE contacts ADD COLUMN visual_traits TEXT NOT NULL DEFAULT '[]'").run();
  }
  await seedDemoUsers(db);
  return db;
}

export async function createUser(input: {
  name: string;
  reading: string;
  org: string;
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
        id, device_token, public_code, name, reading, org,
        location_enabled, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`
    )
    .bind(id, token, publicCode, input.name, input.reading, input.org, now, now)
    .run();
  const row = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<UserRow>();
  if (!row) throw new Error("プロフィールを作成できませんでした。");
  return { user: toUser(row), token };
}

export async function getUserByToken(token: string): Promise<UserRow | null> {
  if (!token) return null;
  const db = await ensureMataneDb();
  return (await db
    .prepare("SELECT * FROM users WHERE device_token = ?")
    .bind(token)
    .first<UserRow>()) ?? null;
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
        c.owner_id, c.contact_user_id, c.tags, c.memos, c.facts, c.visual_traits,
        c.alert_level, c.alert_suggested, c.alert_reason, c.hud_text,
        c.created_at, c.updated_at,
        u.name AS contact_name, u.reading AS contact_reading,
        u.org AS contact_org, u.latitude AS contact_latitude,
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

async function addContactPair(db: D1Database, owner: UserRow, target: UserRow) {
  const now = new Date().toISOString();
  const hudText = `${target.name}さん${target.org ? `｜${target.org}` : ""}\n前回の続きを話す`;
  await db
    .prepare(
      `INSERT OR IGNORE INTO contacts (
        id, owner_id, contact_user_id, tags, memos, facts,
        alert_level, alert_suggested, hud_text, created_at, updated_at
      ) VALUES (?, ?, ?, '[]', '[]', '[]', 'normal', 0, ?, ?, ?)`
    )
    .bind(`${owner.id}:${target.id}`, owner.id, target.id, hudText, now, now)
    .run();
}

export async function exchangeContact(owner: UserRow, publicCode: string) {
  const db = await ensureMataneDb();
  const target = await db
    .prepare("SELECT * FROM users WHERE public_code = ?")
    .bind(publicCode.trim().toUpperCase())
    .first<UserRow>();
  if (!target) throw new Error("その交換コードは見つかりませんでした。");
  if (target.id === owner.id) throw new Error("自分自身とは交換できません。");
  await addContactPair(db, owner, target);
  await addContactPair(db, target, owner);
  return listContacts(owner.id);
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
  await addContactPair(db, owner, tanaka);
  await addContactPair(db, tanaka, owner);
  await addContactPair(db, owner, sato);
  await addContactPair(db, sato, owner);
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
        JSON.stringify([{ date: "2026-07-18", text: "猫を2匹飼っている。Pythonが得意。丸い黒縁メガネと緑のパーカーが印象的。" }]),
        JSON.stringify(["猫を2匹飼っている", "Pythonが得意"]),
        JSON.stringify(["丸い黒縁メガネ", "緑のパーカー", "穏やかな雰囲気"]),
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
