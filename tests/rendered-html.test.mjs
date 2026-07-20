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
  assert.match(layout, /matane-app-icon\.svg/);
  assert.match(layout, /apple-icon\.png/);
  assert.match(app, /名前を思い出す前に/);
  assert.match(app, /顔認証なし/);
  assert.match(app, /MATANEをはじめる/);
  assert.match(app, /visibilitychange/);
  assert.match(app, /メモから作るイメージ/);
  assert.match(app, /PORTRAIT_WAITING_MESSAGES/);
  assert.match(app, /トイレに篭って待つのも作戦です/);
  assert.match(app, /顔アップと全身の2枚を作成中です/);
  assert.match(app, /setPortraitWaitingMessage/);
  assert.match(app, /portrait-waiting-mark[^\n]+<i \/><b>\?<\/b>/);
  assert.match(css, /portrait-waiting/);
  assert.match(app, /useState<Tab>\("exchange"\)/);
  assert.match(app, /QRCode\.toDataURL/);
  assert.match(app, /searchParams\.set\("exchange"/);
  assert.match(app, /キーボード標準音声入力/);
  assert.match(app, /特徴を保存する \/ Save features/);
  assert.match(app, /メモ原文/);
  assert.match(app, /className={`menu-button/);
  assert.match(app, /openFriend\(contact\.contactUserId\)/);
  assert.match(app, /method: "PATCH"/);
  assert.match(app, /method: "DELETE"/);
  assert.doesNotMatch(app, /AIで記憶にする|OpenAIが事実・外見・次の話題を整理/);
  assert.doesNotMatch(app, /className="fact-list"|className="trait-list"|className="alert-suggestion"/);
  assert.match(app, /inputMode="text"/);
  assert.match(app, /怖いと記録する \/ Mark as caution/);
  assert.match(app, /友達 <small>Friends/);
  assert.match(app, /\/api\/profile/);
  assert.match(app, /本人の顔を再現・特定するものではありません/);
  assert.match(app, /友達と交換/);
  assert.match(app, /近くの人を表示/);
  assert.match(app, /位置情報を共有する（1時間）/);
  assert.match(app, /近くの人<small>Nearby/);
  assert.match(app, /メール連携・変更/);
  assert.match(app, /プロフィール設定/);
  assert.match(app, /ログアウトする \/ Sign out/);
  assert.match(app, /カメラで相手のQRを読む/);
  assert.match(app, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(app, /jsQR\(/);
  assert.match(app, /IdentityImages/);
  assert.match(app, /顔アップと全身を作る/);
  assert.match(app, /以前のメモを見る/);
  assert.match(app, /showPreviousMemos/);
  assert.match(app, /直近のメモ/);
  assert.ok(app.indexOf('className="portrait-studio"') < app.indexOf('className="memory-notes-panel"'));
  assert.match(app, /faceSrc=\{portraits\[contact\.contactUserId\]\?\.face\?\.dataUrl\}/);
  assert.match(app, /fullBodySrc=\{portraits\[contact\.contactUserId\]\?\.fullBody\?\.dataUrl\}/);
  assert.doesNotMatch(app, /会場モード|この会場にいる間だけ|自分のQRを相手に見せる|このQRを相手に見せる|読み取ると一度だけ自動交換します/);
  assert.doesNotMatch(app, /CAMERALESS CONNECTION|REUNION RADAR|ONE-TIME EXCHANGE|AI IMAGINED PORTRAIT|ORIGINAL NOTES|SHOW & SCAN|MY PROFILE/);
  assert.match(css, /Calm, familiar mobile UI/);
  assert.match(css, /\.bottom-nav[\s\S]*background: rgba\(255, 255, 255, \.97\)/);
  assert.match(layout, /viewportFit:\s*"cover"/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(manifest, /matane-app/);
  assert.doesNotMatch(`${layout}\n${app}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
  await access(new URL("app/icon.png", root));
  await access(new URL("app/apple-icon.png", root));
  await access(new URL("public/matane-app-icon.svg", root));
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
  const [openai, portraitRoute, schema, avatarMigration, portraitMigration, portraitPairMigration, hosting] = await Promise.all([
    readFile(new URL("lib/openai.ts", root), "utf8"),
    readFile(new URL("app/api/portrait/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0002_flat_christian_walker.sql", root), "utf8"),
    readFile(new URL("drizzle/0004_nostalgic_beyonder.sql", root), "utf8"),
    readFile(new URL("drizzle/0005_green_praxagora.sql", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
  ]);
  assert.match(openai, /gpt-image-2/);
  assert.match(openai, /deterministic-demo-sketch/);
  assert.match(openai, /\/v1\/images\/generations/);
  assert.match(openai, /visualTraits/);
  assert.match(openai, /highly photorealistic/);
  assert.match(openai, /Do not slim, beautify, idealize/);
  assert.match(openai, /head-to-toe full-body photograph/);
  assert.match(openai, /tight face close-up portrait/);
  assert.match(openai, /generateImaginedPortraitPair/);
  assert.match(openai, /Promise\.all/);
  assert.match(openai, /visualNotesFromMemos/);
  assert.doesNotMatch(openai, /gpt-4o-mini-transcribe/);
  assert.match(portraitRoute, /generateImaginedPortraitPair/);
  assert.match(schema, /visual_traits/);
  assert.match(schema, /avatarDataUrl/);
  assert.match(avatarMigration, /avatar_data_url/);
  assert.match(portraitRoute, /export async function GET/);
  assert.match(portraitRoute, /media\.put/);
  assert.match(portraitRoute, /saveContactPortrait/);
  assert.match(schema, /portraitKey/);
  assert.match(schema, /portraitFullBodyKey/);
  assert.match(portraitMigration, /portrait_key/);
  assert.match(portraitPairMigration, /portrait_full_body_key/);
  assert.match(hosting, /"r2": "MEDIA"/);
});

test("keeps AI structure private while original notes remain editable", async () => {
  const [app, memoryRoute, database] = await Promise.all([
    readFile(new URL("app/matane-app.tsx", root), "utf8"),
    readFile(new URL("app/api/memory/route.ts", root), "utf8"),
    readFile(new URL("db/matane.ts", root), "utf8"),
  ]);
  assert.match(app, /<h3>メモ <small>Notes<\/small><\/h3>/);
  assert.match(app, /編集 \/ Edit/);
  assert.match(app, /削除 \/ Delete/);
  assert.match(memoryRoute, /export async function PATCH/);
  assert.match(memoryRoute, /export async function DELETE/);
  assert.match(memoryRoute, /replaceAndReanalyze/);
  assert.match(database, /export async function replaceMemories/);
});

test("provides a one-tap judge scenario with twenty memorable friends", async () => {
  const [app, reviewerRoute, database, readme] = await Promise.all([
    readFile(new URL("app/matane-app.tsx", root), "utf8"),
    readFile(new URL("app/api/reviewer/route.ts", root), "utf8"),
    readFile(new URL("db/matane.ts", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
  ]);
  assert.match(app, /審査デモを開始 \/ Start judge demo/);
  assert.match(app, /20人と交換済み/);
  assert.match(reviewerRoute, /createReviewerDemoSession/);
  assert.match(database, /REVIEWER_VENUE/);
  assert.match(database, /35\.6564031/);
  assert.match(database, /139\.6964821/);
  assert.equal((database.match(/id: "reviewer-persona-\d{2}"/g) ?? []).length, 20);
  assert.equal((database.match(/nearbyOffset: \[/g) ?? []).length, 10);
  assert.match(readme, /顔が覚えられない同志よ、もうそのストレスは抱えなくていい/);
  assert.match(readme, /使うのはスマホだけ/);
  assert.match(readme, /60秒デモシナリオ/);
  assert.match(readme, /肖像権侵害や生体情報漏えいのリスクを抑え/);
  assert.match(readme, /懇親会/);
  assert.match(readme, /カンファレンスの休憩時間/);
  assert.match(readme, /将来構想：ネイティブアプリ化/);
  assert.match(readme, /Bluetooth Low Energy（BLE）/);
  assert.match(readme, /専用ビーコンなどの外部機器は使いません/);
  assert.match(readme, /短時間で変わる匿名ID/);
});
