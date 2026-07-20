import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("builds the multilingual Hello Again mobile experience", async () => {
  const [layout, app, i18n, css, manifest] = await Promise.all([
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/matane-app.tsx", root), "utf8"),
    readFile(new URL("app/i18n.ts", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("dist/client/.vite/manifest.json", root), "utf8"),
  ]);
  const ui = `${app}\n${i18n}`;
  assert.match(layout, /lang="ja"/i);
  assert.match(layout, /Hello Again — Never worry about remembering faces/);
  assert.match(layout, /og-hello-again\.png/);
  assert.match(layout, /hello-again-app-icon\.png/);
  assert.match(layout, /apple-icon\.png/);
  assert.match(app, />Hello Again</);
  assert.match(i18n, /Never worry about remembering faces/);
  assert.match(i18n, /"onboarding\.headline": "名前を思い出せなくても、また話せる。"/);
  assert.match(i18n, /位置情報は、あなたが操作した時だけ登録します。自動追跡や、知らないうちの共有はしません。/);
  assert.doesNotMatch(i18n, /顔認証なし。座標は相手に見せません。/);
  assert.doesNotMatch(i18n, /"onboarding\.headline": [^\n]*\\n/);
  assert.doesNotMatch(app, /onboarding\.headline"\)\.split/);
  assert.match(i18n, /日本語/);
  assert.match(i18n, /English/);
  assert.match(i18n, /简体中文/);
  assert.match(i18n, /한국어/);
  assert.match(i18n, /Español/);
  assert.match(i18n, /Français/);
  assert.match(i18n, /Deutsch/);
  assert.match(i18n, /Português/);
  const languageNames = ["ja", "en", "zh", "ko", "es", "fr", "de", "pt"];
  const translatedKeySets = languageNames.map((name, index) => {
    const start = i18n.indexOf(`const ${name}`);
    const end = index + 1 < languageNames.length
      ? i18n.indexOf(`const ${languageNames[index + 1]}`, start)
      : i18n.indexOf("const TRANSLATIONS", start);
    return new Set([...i18n.slice(start, end).matchAll(/"([a-zA-Z][^"]*)":/g)].map((match) => match[1]));
  });
  for (const keys of translatedKeySets) assert.deepEqual(keys, translatedKeySets[0]);
  assert.match(app, /LANGUAGE_KEY = "hello_again_language"/);
  assert.match(app, /localStorage\.setItem\(LANGUAGE_KEY/);
  assert.match(app, /navigator\.languages/);
  assert.match(app, /preferredAppLanguage\(browserLanguages\)/);
  assert.match(i18n, /return "en"/);
  assert.match(app, /LANGUAGE_OPTIONS\.map/);
  assert.equal((app.match(/placeholder=\{t\("profile\.readingPlaceholder"\)\}/g) ?? []).length, 2);
  assert.match(app, /言語を選択 \/ Choose your language/);
  assert.match(app, /Choose your language for Hello Again/);
  assert.match(app, /returnToTop\(\)/);
  assert.match(app, /className="app-brand-link"/);
  assert.equal((app.match(/<img src="\/hello-again-app-icon\.png"/g) ?? []).length, 3);
  assert.match(app, /setLanguagePickerOpen\(true\)/);
  assert.match(app, /document\.documentElement\.lang/);
  assert.match(css, /\.language-button/);
  assert.match(css, /\.language-picker/);
  assert.match(css, /\.language-options[^\n]+overflow-y: auto/);
  assert.match(css, /\.onboarding-copy h1[^\n]+text-wrap: balance/);
  assert.match(css, /\.brand-tagline[\s\S]*margin: 10px 0 28px/);
  assert.doesNotMatch(css, /\.brand-tagline[^}]*margin-(?:top|bottom):\s*-/);
  assert.match(css, /\.onboarding-language[\s\S]*width: min\(calc\(100% - 32px\), 1070px\)/);
  assert.match(app, /visibilitychange/);
  assert.match(ui, /メモから作るイメージ/);
  assert.match(app, /WAITING_MESSAGE_KEYS/);
  assert.match(i18n, /トイレに篭って待つのも作戦です/);
  assert.match(i18n, /A quick bathroom break is a valid strategy/);
  assert.match(ui, /顔アップと全身の2枚を作成中です/);
  assert.match(app, /setPortraitWaitingMessage/);
  assert.match(app, /portrait-waiting-mark[^\n]+<i \/><b>\?<\/b>/);
  assert.match(css, /portrait-waiting/);
  assert.match(app, /useState<Tab>\("exchange"\)/);
  assert.match(app, /QRCode\.toDataURL/);
  assert.match(app, /searchParams\.set\("exchange"/);
  assert.match(ui, /キーボード標準音声入力/);
  assert.match(ui, /特徴を保存する/);
  assert.match(ui, /メモ原文/);
  assert.match(app, /className={`menu-button/);
  assert.match(app, /openFriend\(contact\.contactUserId\)/);
  assert.match(app, /method: "PATCH"/);
  assert.match(app, /method: "DELETE"/);
  assert.doesNotMatch(app, /AIで記憶にする|OpenAIが事実・外見・次の話題を整理/);
  assert.doesNotMatch(app, /className="fact-list"|className="trait-list"|className="alert-suggestion"/);
  assert.match(app, /inputMode="text"/);
  assert.match(ui, /怖いと記録する/);
  assert.match(app, /t\("friends\.title"\)/);
  assert.match(app, /\/api\/profile/);
  assert.match(ui, /本人の顔を再現・特定するものではありません/);
  assert.match(ui, /友達と交換/);
  assert.match(ui, /近くの人を表示/);
  assert.match(ui, /今いる場所を登録（1時間有効）/);
  assert.match(ui, /移動しても自動更新されず、1時間後に無効になります/);
  assert.match(ui, /リアルタイム追跡はしません/);
  assert.match(ui, /現在地を更新（1時間延長）/);
  assert.match(ui, /登録した場所を解除/);
  assert.doesNotMatch(app, /navigator\.geolocation\.watchPosition/);
  assert.match(app, /t\("nav\.nearby"\)/);
  assert.match(ui, /150m以内/);
  assert.match(ui, /メール連携・変更/);
  assert.match(ui, /プロフィール設定/);
  assert.match(ui, /ログアウトする/);
  assert.match(ui, /カメラで相手のQRを読む/);
  assert.match(app, /navigator\.mediaDevices\.getUserMedia/);
  assert.match(app, /jsQR\(/);
  assert.match(app, /IdentityImages/);
  assert.match(ui, /顔アップと全身を作る/);
  assert.match(ui, /以前のメモを見る/);
  assert.match(app, /showPreviousMemos/);
  assert.match(ui, /直近のメモ/);
  assert.ok(app.indexOf('className="portrait-studio"') < app.indexOf('className="memory-notes-panel"'));
  assert.match(app, /faceSrc=\{portraits\[contact\.contactUserId\]\?\.face\?\.dataUrl\}/);
  assert.match(app, /fullBodySrc=\{portraits\[contact\.contactUserId\]\?\.fullBody\?\.dataUrl\}/);
  assert.match(app, /className="nav-friends"[^>]*>👤<\/span>/);
  assert.match(app, /singleLineMemo\(contact\.memos\[contact\.memos\.length - 1\]\.text\)/);
  assert.match(app, /className="list-memo"/);
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
  await access(new URL("public/hello-again-app-icon.png", root));
  await access(new URL("public/og-hello-again.png", root));
  await access(new URL("dist/server/index.js", root));
});

test("stores private exchange context, nicknames, and a final portrait choice", async () => {
  const [app, i18n, database, schema, exchangeRoute, contactRoute, portraitRoute, migration] = await Promise.all([
    readFile(new URL("app/matane-app.tsx", root), "utf8"),
    readFile(new URL("app/i18n.ts", root), "utf8"),
    readFile(new URL("db/matane.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("app/api/exchange/route.ts", root), "utf8"),
    readFile(new URL("app/api/contact/route.ts", root), "utf8"),
    readFile(new URL("app/api/portrait/route.ts", root), "utf8"),
    readFile(new URL("drizzle/0006_black_misty_knight.sql", root), "utf8"),
  ]);
  const ui = `${app}\n${i18n}`;
  assert.match(database, /NEARBY_RADIUS_METERS = 150/);
  assert.match(database, /LOCATION_TTL_MS = 60 \* 60 \* 1000/);
  assert.match(schema, /exchangedAt/);
  assert.match(schema, /exchangeLatitude/);
  assert.match(migration, /ADD `exchanged_at`/);
  assert.match(migration, /ADD `exchange_latitude`/);
  assert.match(exchangeRoute, /exchangeContact\(owner, code, hasPosition/);
  assert.match(ui, /QR読み取り・コード交換の確定時に、その端末の現在地を1回だけ取得します/);
  assert.match(ui, /双方の交換履歴に残ります/);
  assert.match(app, /className="exchange-history"/);
  assert.match(schema, /nickname/);
  assert.match(contactRoute, /updateContactNickname/);
  assert.match(ui, /自分だけのニックネーム/);
  assert.match(schema, /portraitPreviousKey/);
  assert.match(migration, /ADD `portrait_previous_key`/);
  assert.match(portraitRoute, /export async function PATCH/);
  assert.match(portraitRoute, /finalizeContactPortrait/);
  assert.match(ui, /前回に戻して採用/);
  assert.match(ui, /今回を採用/);
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
  const [page, auth, sessionRoute, app, i18n, schema, migration] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/chatgpt-auth.ts", root), "utf8"),
    readFile(new URL("app/api/session/route.ts", root), "utf8"),
    readFile(new URL("app/matane-app.tsx", root), "utf8"),
    readFile(new URL("app/i18n.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("drizzle/0003_shocking_white_tiger.sql", root), "utf8"),
  ]);
  assert.match(page, /dynamic = "force-dynamic"/);
  assert.match(auth, /oai-authenticated-user-email/);
  assert.match(sessionRoute, /getUserByEmail/);
  assert.match(sessionRoute, /linkUserEmail/);
  assert.match(sessionRoute, /restoredByEmail/);
  assert.match(app, /signin-with-chatgpt/);
  assert.match(i18n, /ChatGPTでメールを確認/);
  assert.match(i18n, /ログインせず体験する/);
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
  const [app, i18n, memoryRoute, database] = await Promise.all([
    readFile(new URL("app/matane-app.tsx", root), "utf8"),
    readFile(new URL("app/i18n.ts", root), "utf8"),
    readFile(new URL("app/api/memory/route.ts", root), "utf8"),
    readFile(new URL("db/matane.ts", root), "utf8"),
  ]);
  assert.match(app, /t\("notes\.title"\)/);
  assert.match(i18n, /"common\.edit": "編集"/);
  assert.match(i18n, /"common\.delete": "削除"/);
  assert.match(memoryRoute, /export async function PATCH/);
  assert.match(memoryRoute, /export async function DELETE/);
  assert.match(memoryRoute, /replaceAndReanalyze/);
  assert.match(database, /export async function replaceMemories/);
});

test("provides a one-tap judge scenario with twenty memorable friends", async () => {
  const [i18n, reviewerRoute, database, readme] = await Promise.all([
    readFile(new URL("app/i18n.ts", root), "utf8"),
    readFile(new URL("app/api/reviewer/route.ts", root), "utf8"),
    readFile(new URL("db/matane.ts", root), "utf8"),
    readFile(new URL("README.md", root), "utf8"),
  ]);
  assert.match(i18n, /"auth\.judgeStart": "審査デモを開始"/);
  assert.match(i18n, /20人と交換済み/);
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
