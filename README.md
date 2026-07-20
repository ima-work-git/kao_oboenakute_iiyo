# Hello Again

> **Never worry about remembering faces.**
>
> **顔が覚えられない同志よ、もうそのストレスは抱えなくていい。**

Hello Again is a mobile-first reunion assistant for people who struggle to remember faces or names. Exchange once by QR code or short code. At a later event, the app can remind you when an exchanged friend is nearby and restore the private context you saved about them—without facial recognition, continuous location tracking, or dedicated hardware.

## OpenAI Build Week submission

- **Track:** Apps for Your Life
- **Live judge demo:** [matane-reunion-2026.fumiyaa.chatgpt.site](https://matane-reunion-2026.fumiyaa.chatgpt.site)
- **Public demo video:** [YouTube — 2:42](https://youtu.be/KEK5DcMCCTo)
- **Source:** [github.com/ima-work-git/kao_oboenakute_iiyo](https://github.com/ima-work-git/kao_oboenakute_iiyo)
- **Primary Codex `/feedback` Session ID:** `019f7384-363b-7382-823e-3d7e8363976b`
- **Primary platform:** Smartphone web browser; no installation or external device required
- **Entrant:** Fumiya, an individual entrant, working with Codex. The early “team of three” note was a planning template and does not describe the submitted build.

The judge demo is free, requires no email registration, and stays usable without granting location access. On the first screen, select English and choose **Start judge demo**.

## The problem

Meeting someone for the second time can be more stressful than meeting them for the first. Their name does not come back, their profile photo may be years old or carefully posed, and asking again can make a promising conversation stall. This affects networking events, conference breaks, community gatherings, and business meetings—and it disproportionately burdens people who already struggle with face or name memory.

Hello Again brings back the useful context at the moment of reunion. It treats memory support as a product problem, not a personal failure.

## What the working product does

- Exchanges profiles once using a QR code, camera scan, or six-character code.
- Stores a private original note, nickname, exchange history, and optional caution flag for each friend.
- Accepts the phone keyboard's built-in dictation, so notes appear in real time without a separate speech service.
- Registers one location snapshot only after the user explicitly taps the button.
- Expires that snapshot after one hour and never follows movement in real time.
- Shows only exchanged friends within 150 meters; exact coordinates are never returned to another user or to the client UI.
- Uses GPT-5.6 to extract only explicitly written facts, topics, and visual traits from free-form memory notes.
- Uses GPT Image 2 to create clearly fictional, photorealistic memory aids from written visual details.
- Keeps the original note editable and hides the internal AI structure from the user.
- Supports Japanese, English, Simplified Chinese, Korean, Spanish, French, German, and Portuguese.
- Restores a verified-email profile across devices while still providing a one-tap, account-free judge demo.

## Two-minute judge path

1. Open the [live demo](https://matane-reunion-2026.fumiyaa.chatgpt.site).
2. Select **English**, then choose **Start judge demo**. No signup or location permission is needed.
3. Open **Nearby**. Ten of twenty fictional friends are already within 150 meters of Shibuya Solasta Conference.
4. Select **Yuto Kuroda** and review the original private note: tall, slim, red knit cap, round silver glasses, and mustard overshirt.
5. Generate the face and full-body imagined portraits. They are fictional memory aids, not reconstructions of a real person.
6. Edit or delete the note, add a private nickname, or mark a private caution flag.
7. Open **Friends** to see all twenty exchanged contacts, including the ten who are not nearby.
8. Return to **Exchange** to inspect the QR and camera-based exchange flow.

All demo names, organizations, notes, and image prompts are fictional and English-only. A deterministic fallback keeps the core judge path available if an external AI call is temporarily unavailable.

## How OpenAI is used

### GPT-5.6 in the product

When a user saves a free-form note, the app sends it to the Responses API with a strict JSON schema. GPT-5.6 extracts only explicitly stated facts, tags, visual traits, and two concise reunion prompts. The prompt prohibits inventing sensitive attributes or classifying whether a person is dangerous, trustworthy, desirable, or a “caution person.” The private caution flag is set and removed only by the user; AI never recommends it.

```env
OPENAI_MODEL=gpt-5.6-luna
```

The model's structured result is deliberately not shown as an opaque profile about the other person. The interface centers the user's editable original note; structure is used internally to make retrieval and image prompting consistent.

### GPT Image 2 in the product

The Image API receives only written visual traits, such as “bright red knit cap,” “round silver glasses,” or an explicitly stated body build. It generates a face view and a full-body view so clothing, build, and hairstyle remain visible. The prompt explicitly prevents identity reconstruction, public-figure resemblance, unstated sensitive attributes, beautification that contradicts the note, logos, and watermarks.

```env
OPENAI_IMAGE_MODEL=gpt-image-2
```

Generated images are presented as **AI-imagined** aids. The portrait generator does not take a real face photo as input and the app does not compare, identify, or recognize faces. A user may still choose to upload an ordinary profile avatar, which is handled as profile data under the Privacy Policy.

## How I collaborated with Codex

Codex was the development partner throughout the main build thread, not a decorative mention added at submission time. The primary evidence thread is the Session ID shown above.

### Where Codex accelerated the work

- Translated the original concept into a deployable smartphone-only architecture.
- Implemented the responsive React interface, multilingual text system, QR generation and camera scanning, profile flows, hamburger-menu account settings, and mobile-safe navigation.
- Built Cloudflare D1 schemas and migrations for users, contacts, private notes, exchange history, one-hour location snapshots, profile restoration, and portrait choices.
- Implemented API routes for sessions, profiles, exchange, nearby matching, memory CRUD, location consent, alerts, and image generation.
- Integrated the Responses API with Structured Outputs and the Image API with fidelity and safety constraints.
- Created twenty fictional English judge personas and a deterministic demo path.
- Reproduced and fixed visual regressions across phone and desktop layouts.
- Added regression tests, ran builds, diagnosed deployment issues, and published iterative Sites versions.
- Researched browser Bluetooth and background-location limits before the product pivot.
- Helped script, render, validate, and publish the 2:42 English demo video.

### Individual product, engineering, and design decisions

I made the consequential choices as the sole individual entrant. I rejected a Web Bluetooth approach after confirming that it would not deliver dependable cross-platform background discovery on ordinary phones. I chose a one-hour, user-triggered location snapshot instead of continuous tracking. I chose a smartphone web app so judges and users need no dedicated beacon, PC, native installation, or smart glasses. I also chose to avoid facial recognition entirely, keep notes private, never expose exact coordinates, and label all generated portraits as fictional.

Codex helped me explore, implement, test, and refine those decisions; it did not replace my responsibility for privacy, user experience, safety, or business strategy.

## Architecture

```text
Smartphone browser
  ├─ profile + verified-email restoration
  ├─ QR / camera / short-code exchange
  ├─ private notes + caution flag
  └─ explicit one-hour location snapshot
             │
             ▼
Cloudflare Worker / vinext API routes
  ├─ D1: profiles, contacts, notes, exchanges, location TTL
  ├─ Responses API: GPT-5.6 Structured Outputs
  └─ Image API: GPT Image 2 fictional portraits
```

Key files:

- `app/matane-app.tsx` — mobile UI and judge experience
- `app/api/*` — server routes
- `db/matane.ts` — persistence, twenty demo personas, and 150-meter matching
- `lib/openai.ts` — GPT-5.6 Structured Outputs and GPT Image 2
- `drizzle/*` — D1 migrations
- `tests/rendered-html.test.mjs` — regression coverage
- `SPEC.md` — original smart-glasses concept and documented smartphone MVP pivot

## Privacy and safety design

- No real-face capture for AI portraits, biometric template, facial recognition, or identity matching. An optional user-supplied profile avatar remains ordinary profile data.
- Location is read only when the user takes an explicit action.
- No `watchPosition`; movement is not tracked or automatically refreshed.
- A location snapshot expires after one hour.
- Only mutually exchanged contacts can appear nearby.
- Exact latitude and longitude are never returned to another user or the client list.
- Original notes, nicknames, and caution flags are private to their author.
- AI structure is hidden; the editable original note remains the source of truth.
- Generated portraits are fictional and are not evidence of a person's real appearance.
- First use requires separate, explicit acceptance of the [Terms of Use](https://matane-reunion-2026.fumiyaa.chatgpt.site/terms), [Privacy Policy](https://matane-reunion-2026.fumiyaa.chatgpt.site/privacy), and OpenAI processing for photorealistic fictional memory images.
- By exchanging profiles, each user permits exchanged contacts to process their shared profile and private memory notes only within Hello Again’s intended memory-support features. Sensitive, unlawful, rights-infringing, or public use remains prohibited.
- AI does not evaluate danger, trustworthiness, personality, or social value; caution flags are manual and private.
- Settings includes permanent deletion of the profile, exchange data, private notes, and saved portraits.

## Impact and business potential

Hello Again can turn short conference breaks and networking sessions into useful reconnections. Instead of spending the first minute hiding a memory gap, users can continue the previous topic, follow up on a promise, make an introduction, or start a business conversation with confidence.

The same consent-based reunion layer could support conferences, professional communities, alumni networks, coworking spaces, and accessibility-focused workplace tools. The product creates value without building a face database or exposing a map of other people.

## Run locally

Requirements:

- Node.js 22.13 or newer
- npm
- An OpenAI API key only if you want live GPT-5.6 and GPT Image 2 calls

```bash
git clone https://github.com/ima-work-git/kao_oboenakute_iiyo.git
cd kao_oboenakute_iiyo
npm install
cp .env.example .env
npm run dev
```

Open the local URL printed by the development server. Leave `OPENAI_API_KEY` blank to use the deterministic fallback path.

Environment variables:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
OPENAI_IMAGE_MODEL=gpt-image-2
```

Validation:

```bash
npm test
npm run lint
```

Production data is stored in Cloudflare D1. The Sites deployment owns the real D1 and R2 bindings declared in `.openai/hosting.json`.

## Future native app

The submitted product is intentionally a no-install smartphone web app. A future iOS and Android version can combine coarse location with Bluetooth Low Energy to improve indoor discovery and deliver opt-in background notifications—still with no dedicated hardware.

The native design would broadcast rotating anonymous identifiers rather than names or fixed IDs. A server would resolve them only when both people have already exchanged profiles and both have enabled event mode. BLE would improve the probability of a timely reunion; it would not be presented as a precise distance meter or guaranteed background detector.

## 日本語要約

**使うのはスマホだけ。** 顔が覚えられない同志よ、もうそのストレスは抱えなくていい。Hello Againは、交換済みの人が近くにいる時に、名前と自分のメモを思い出させる再会支援アプリです。

### 60秒デモシナリオ

審査デモを開始し、「近く」で10人を確認します。友達を選ぶと、自分が残したメモ原文と会話のきっかけを確認でき、書いた特徴だけから架空のAI想像ポートレートを生成できます。最後に「友達」で全20人を確認します。

本人の写真を撮影・保存・照合せず、顔認証や生体識別も行いません。実在する顔写真を利用しないことで、肖像権侵害や生体情報漏えいのリスクを抑えます。現在地はボタンを押した時に1回だけ登録し、1時間で失効します。

懇親会やカンファレンスの休憩時間でも、前回の文脈から自然に会話を再開し、商談・紹介・協業の機会につなげられます。

### 将来構想：ネイティブアプリ化

将来はスマホ内蔵のBluetooth Low Energy（BLE）と粗い位置情報を組み合わせます。専用ビーコンなどの外部機器は使いません。氏名や固定IDを周囲へ送らず、短時間で変わる匿名IDを、双方が交換済みかつ明示同意中の場合だけ照合する設計です。

## License

Released under the [MIT License](LICENSE).
