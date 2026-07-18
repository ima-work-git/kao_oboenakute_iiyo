import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("builds the MATANE mobile experience", async () => {
  const [layout, app, css, manifest] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/matane-app.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"),
  ]);
  assert.match(layout, /lang="ja"/i);
  assert.match(layout, /MATANE — 近くにいる、を思い出す/);
  assert.match(app, /名前を思い出す前に/);
  assert.match(app, /顔認証なし/);
  assert.match(app, /MATANEをはじめる/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /AI IMAGINED PORTRAIT/);
  assert.match(app, /useState<Tab>\("exchange"\)/);
  assert.match(app, /QRCode\.toDataURL/);
  assert.match(app, /searchParams\.set\("exchange"/);
  assert.match(app, /音声入力 \/ Dictate/);
  assert.match(app, /inputMode="text"/);
  assert.match(app, /怖いと記録する \/ Mark as caution/);
  assert.match(app, /友達 <small>Friends/);
  assert.match(app, /\/api\/profile/);
  assert.match(app, /本人の顔を再現・特定するものではありません/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(manifest, /matane-app/);
  assert.doesNotMatch(`${layout}\n${app}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
  await access(new URL("dist/server/index.js", root));
});

test("ships durable data and no disposable starter preview", async () => {
  const [hosting, packageJson, page, layout, migration] = await Promise.all([
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("drizzle/0000_demonic_natasha_romanoff.sql", root), "utf8"),
  ]);

  assert.match(hosting, /"d1": "DB"/);
  assert.match(packageJson, /"name": "matane"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(page, /<MataneApp account=/);
  assert.match(layout, /lang="ja"/);
  assert.match(migration, /CREATE TABLE `users`/);
  assert.match(migration, /CREATE TABLE `contacts`/);
  await assert.rejects(access(new URL("app/_sites-preview", root)));
});

test("restores the same profile from a verified email", async () => {
  const [page, auth, sessionRoute, app, schema, migration] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/chatgpt-auth.ts", root), "utf8"),
    readFile(new URL("app/api/session/route.ts", root), "utf8"),
    readFile(new URL("app/matane-app.tsx", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0003_shocking_white_tiger.sql", root), "utf8"),
  ]);
  assert.match(page, /dynamic = "force-dynamic"/);
  assert.match(auth, /oai-authenticated-user-email/);
  assert.match(sessionRoute, /getUserByEmail/);
  assert.match(sessionRoute, /linkUserEmail/);
  assert.match(sessionRoute, /restoredByEmail/);
  assert.match(app, /signin-with-chatgpt/);
  assert.match(app, /ChatGPTでメールを確認/);
  assert.match(app, /ログインせず体験する/);
  assert.match(schema, /users_email_idx/);
  assert.match(migration, /ADD `email`/);
  assert.match(migration, /UNIQUE INDEX `users_email_idx`/);
});

test("connects faithful structured memory to photorealistic OpenAI image generation", async () => {
  const [openai, portraitRoute, schema, avatarMigration] = await Promise.all([
    readFile(new URL("lib/openai.ts", root), "utf8"),
    readFile(new URL("app/api/portrait/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0002_flat_christian_walker.sql", root), "utf8"),
  ]);
  assert.match(openai, /gpt-image-2/);
  assert.match(openai, /deterministic-demo-sketch/);
  assert.match(openai, /\/v1\/images\/generations/);
  assert.match(openai, /visualTraits/);
  assert.match(openai, /highly photorealistic/);
  assert.match(openai, /Do not slim, beautify, idealize/);
  assert.match(openai, /body build is easy to see/);
  assert.match(openai, /visualNotesFromMemos/);
  assert.doesNotMatch(openai, /gpt-4o-mini-transcribe/);
  assert.match(portraitRoute, /generateImaginedPortrait/);
  assert.match(schema, /visual_traits/);
  assert.match(schema, /avatarDataUrl/);
  assert.match(avatarMigration, /avatar_data_url/);
});
