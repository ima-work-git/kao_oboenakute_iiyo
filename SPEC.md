# Hello Again — Current Product Specification

**OpenAI Build Week · Apps for Your Life · July 2026**

> Authorship clarification: an early planning template said “team of three.” The submitted product was actually created by **Fumiya as one individual entrant, working with Codex**. No three-person human team built the submission.

## 1. Product promise

**Never worry about remembering faces.**

Hello Again is a smartphone-first reunion assistant for people who struggle to remember faces or names. Two people exchange profiles once by QR or short code. At a later event, each person can voluntarily register one location snapshot; exchanged friends within approximately 150 meters appear with the private context the user previously saved.

The working submission requires only a smartphone browser. It does not require a PC, dedicated Bluetooth device, native installation, camera-based face capture, or smart glasses.

## 2. Current user experience

### First use and consent

1. The browser language is detected; the user can choose among Japanese, English, Simplified Chinese, Korean, Spanish, French, German, and Portuguese.
2. Before any login, guest mode, or judge demo, the user must explicitly check and accept:
   - the Terms of Use;
   - the Privacy Policy and personal-data handling; and
   - sending written appearance notes to OpenAI for photorealistic fictional memory-image generation, plus responsibility to enter another person’s data only with lawful authority or permission.
3. Consent is versioned and recorded locally. When a profile exists, the current consent version and timestamps are also stored in D1. Existing profiles must consent to the current version before using the app.

### Profile and account

- Set a name, Roman-letter pronunciation, organization, and optional avatar.
- Link a ChatGPT-verified email to restore the profile on another device or in private browsing.
- Edit the profile, change/relink email, sign out, or permanently delete the account and stored data from the hamburger menu.

### One-time exchange

- Show a QR code containing an exchange URL, scan the other user’s QR with the phone camera, or enter a six-character exchange code.
- Only mutually exchanged profiles can appear in one another’s friend and nearby results.
- With browser permission, exchange confirmation may store a single location snapshot in both exchange histories. It does not start continuous tracking.

### Private memory support

- Save, edit, or delete the original private note and a private nickname.
- Use the smartphone keyboard’s built-in dictation; no separate speech-recognition service is required.
- GPT-5.6 Structured Outputs extracts only explicitly written facts, topics, and visual traits. The internal structure is hidden from the interface; the editable original note remains the source of truth.
- AI does **not** judge whether someone is dangerous, trustworthy, desirable, or a “caution person.” A private caution flag can be set or removed only by the user.

### Photorealistic fictional memory images

- On request, GPT Image 2 generates a face view and full-body view from written visual traits.
- Photorealism is intentional because the image is a practical memory aid. The prompt preserves explicitly written gender expression, age range, body build, hair, clothing, and accessories without beautifying away important details.
- The service does not use the person’s photograph as the image-generation input and does not perform face recognition, face matching, biometric enrollment, or identity reconstruction.
- Every output is labeled as an AI-imagined fictional aid that may be inaccurate and must not be used for identification, publication, surveillance, or decisions about the person.
- Generated images are privately stored in Cloudflare R2 so the most recent selected pair can reappear in friend and nearby lists. A user can compare the previous and current pair and keep one.

### Nearby mode

- Tapping **Register this location (1 hour)** calls browser geolocation once.
- The app stores the snapshot and timestamp. It does not call `watchPosition`, follow movement, or refresh in the background.
- A snapshot stops being used for matching after one hour. Moving requires another explicit update.
- Matching happens on the server. Friends receive only a nearby result and rounded distance; another person’s exact coordinates are not returned to the client UI.

## 3. Judge demo

- No signup or real location permission is required after consent.
- The demo creates one fictional English judge profile, twenty fictional exchanged friends, and ten nearby friends around Shibuya Solasta Conference.
- Names, organizations, notes, prompts, and visual traits are fictional and English-only.
- The demo supports note editing/deletion, private caution flags, nearby navigation, and live imagined-image generation.

## 4. OpenAI usage

### GPT-5.6 (`gpt-5.6-luna`)

- Responses API with strict JSON schema and `store: false`.
- Extracts explicit facts, tags, and visual traits and writes two short reunion prompts.
- Must not infer unstated sensitive traits or make safety, trustworthiness, personality, or social-value classifications.

### GPT Image 2 (`gpt-image-2`)

- Generates one photorealistic face close-up and one head-to-toe image from text notes.
- Uses a fictional, non-identifying subject instruction and prohibits public-figure resemblance, logos, watermarks, and unstated sensitive traits.

## 5. Data and privacy

| Data | Storage | Visibility / lifetime |
|---|---|---|
| Profile and verified email | Cloudflare D1 | Exchanged contacts; retained until deletion or service cleanup |
| Session token | D1 + local storage | User device/server only |
| Exchange history | D1 | Each participant’s own history |
| Original notes, nickname, manual caution flag | D1 | Author only |
| AI-extracted facts and visual traits | D1 | Internal processing only |
| Location snapshot | D1 | Matching only for one hour; exact coordinates are not shown to friends |
| Generated images | Cloudflare R2 | Owner only; retained until replaced, account deletion, or service cleanup |
| Policy version and consent timestamps | D1 | Compliance record for that profile |

Account deletion removes the profile, owned contacts, notes, exchange links, and known R2 portrait objects. The prototype may retain only limited records where legally required or necessary to prevent abuse.

## 6. Architecture

```text
Smartphone browser (Next.js / React)
  ├─ language, explicit consent, profile, QR/camera exchange
  ├─ private notes, manual caution flag, portrait selection
  └─ explicit one-time geolocation snapshot
             │ HTTPS
             ▼
Cloudflare Worker API (vinext)
  ├─ D1: profiles, consent, contacts, notes, exchanges, location
  ├─ R2: privately served generated images
  ├─ OpenAI Responses API: GPT-5.6 Structured Outputs
  └─ OpenAI Image API: GPT Image 2 fictional memory images
```

## 7. Safety constraints

- No facial recognition, face matching, biometric templates, or real-face database.
- No AI-generated caution/safety/trustworthiness classification.
- No continuous or background location tracking.
- No map or exact coordinates exposed to friends.
- No shared blacklist; notes, nicknames, portraits, and caution flags are private.
- Explicit, versioned first-use consent for Terms, Privacy Policy, and AI image processing.
- Another person’s data may be entered only with lawful authority or permission.
- AI output is not evidence of identity or actual appearance.

## 8. Future native app and smart glasses

The submitted product is the smartphone web app above. A future native iOS/Android app could add opt-in background notifications and rotating anonymous Bluetooth Low Energy identifiers, with no dedicated hardware. Resolution would occur only for already-exchanged users who both enabled an event mode. BLE would be a probabilistic reunion signal, not a precise distance meter.

An Even G2 companion can later display the same name, private context, and conversation prompt on the glasses HUD while the smartphone remains the consent, account, networking, and location hub. This future work is isolated from the submitted web build and is not claimed as part of the working Build Week product.

## 9. Acceptance criteria

- Fresh users cannot enter login, guest mode, or judge demo without all three explicit consents.
- Current consent is enforced server-side before OpenAI note processing or image generation.
- GPT outputs contain no caution-person recommendation fields.
- A user can delete their account and stored application data from Settings.
- Terms and Privacy Policy are available in English and Japanese.
- The full judge path works on a smartphone without external hardware or location permission.
- `npm test` and `npm run lint` pass before publication.
