import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    deviceToken: text("device_token").notNull(),
    email: text("email"),
    publicCode: text("public_code").notNull(),
    name: text("name").notNull(),
    reading: text("reading").notNull().default(""),
    org: text("org").notNull().default(""),
    avatarDataUrl: text("avatar_data_url").notNull().default(""),
    latitude: real("latitude"),
    longitude: real("longitude"),
    locationAccuracy: real("location_accuracy"),
    locationEnabled: integer("location_enabled", { mode: "boolean" }).notNull().default(false),
    lastSeen: text("last_seen"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("users_device_token_idx").on(table.deviceToken),
    uniqueIndex("users_email_idx").on(table.email),
    uniqueIndex("users_public_code_idx").on(table.publicCode),
  ]
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    contactUserId: text("contact_user_id").notNull(),
    tags: text("tags").notNull().default("[]"),
    memos: text("memos").notNull().default("[]"),
    facts: text("facts").notNull().default("[]"),
    visualTraits: text("visual_traits").notNull().default("[]"),
    alertLevel: text("alert_level").notNull().default("normal"),
    alertSuggested: integer("alert_suggested", { mode: "boolean" }).notNull().default(false),
    alertReason: text("alert_reason"),
    hudText: text("hud_text").notNull().default(""),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("contacts_owner_target_idx").on(table.ownerId, table.contactUserId)]
);
