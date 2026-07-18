import type { ContactProfile } from "@/db/matane";
import { env } from "cloudflare:workers";

export type MemoryAnalysis = {
  facts: string[];
  tags: string[];
  visualTraits: string[];
  alertSuggested: boolean;
  alertReason: string | null;
  hudLine1: string;
  hudLine2: string;
  mode: "openai" | "fallback";
};

const cautionPattern = /強引|しつこ|怖|危険|不快|ハラス|勧誘|避け|苦手|怒鳴|セクハラ|パワハラ/i;
const visualPattern = /男性|女性|男(?:性|の人)?|女(?:性|の人)?|ジェンダー|年齢|若い|若者|中年|高齢|年配|太(?:い|め)|肥満|ふくよか|ぽっちゃり|大柄|がっしり|筋肉|痩せ|細身|小柄|体格|体型|メガネ|眼鏡|髪|ヘア|服|シャツ|パーカー|ジャケット|帽子|表情|笑顔|雰囲気|印象|声|姿勢|背|ひげ|髭|\b(?:man|male|woman|female|young|middle-aged|older|elderly|fat|plus-size|heavyset|stocky|large|muscular|slim|thin|petite|build|glasses|hair|shirt|hoodie|jacket|hat|beard|tall|short)\b/i;
const tagCandidates = [
  "AI",
  "Python",
  "デザイン",
  "猫",
  "犬",
  "音楽",
  "SaaS",
  "起業",
  "営業",
  "研究",
  "ゲーム",
  "旅行",
];

function compact(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

function fallbackAnalysis(person: ContactProfile, memo: string): MemoryAnalysis {
  const alertSuggested = cautionPattern.test(memo);
  const tags = tagCandidates.filter((tag) => memo.toLowerCase().includes(tag.toLowerCase()));
  const visualTraits = memo
    .split(/[。！!？?]/)
    .map((part) => compact(part, 36))
    .filter((part) => part && visualPattern.test(part))
    .slice(0, 4);
  const topic = compact(memo.split(/[。！!？?]/)[0] || memo, 18);
  const shortName = person.name.replace(/\s+/g, "").slice(0, 6);
  return {
    facts: [compact(memo, 42)],
    tags: tags.length ? tags : ["会話メモ"],
    visualTraits,
    alertSuggested,
    alertReason: alertSuggested ? topic : null,
    hudLine1: alertSuggested
      ? `!! ${shortName}さんが近くにいます`
      : `${shortName}さん${person.org ? `｜${compact(person.org, 10)}` : ""}`,
    hudLine2: alertSuggested ? `${topic} → 無理せず離れる` : `${topic} → 続きを聞く`,
    mode: "fallback",
  };
}

function outputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof body.output_text === "string") return body.output_text;
  for (const item of body.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return null;
}

export async function analyzeMemory(person: ContactProfile, memo: string): Promise<MemoryAnalysis> {
  const runtime = env as unknown as { OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
  if (!runtime.OPENAI_API_KEY) return fallbackAnalysis(person, memo);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${runtime.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: runtime.OPENAI_MODEL || "gpt-5.6-luna",
        reasoning: { effort: "none" },
        store: false,
        max_output_tokens: 300,
        instructions: [
          "あなたは、再会時に人の名前と会話を思い出す支援アプリMATANEの記憶整理担当です。",
          "自由文メモに明記された事実だけを抽出し、センシティブ属性を推測しないでください。",
          "visualTraitsには、メモに明記された視覚的特徴だけを入れてください。髪型・メガネ・服・表情・雰囲気に加えて、明記された性別表現・年代・体格・体型も必ず含め、意味を弱めたり美化したりせず原文に近い言葉で保持してください。",
          "性別表現・年代・体格・体型・人種など、メモにない特徴は決して推測しないでください。",
          "注意人物の判定は必ず提案に留め、強引な勧誘・ハラスメント・威圧など明確な記述がある場合だけtrueにしてください。",
          "HUD文は日本語で各行24文字程度、合計2行。会話を始めやすい具体的な一言にしてください。",
        ].join("\n"),
        input: `人物: ${person.name} / ${person.org || "所属なし"}\n既存タグ: ${person.tags.join(", ")}\n新しいメモ: ${memo}`,
        text: {
          format: {
            type: "json_schema",
            name: "matane_memory",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                facts: { type: "array", items: { type: "string" }, maxItems: 4 },
                tags: { type: "array", items: { type: "string" }, maxItems: 5 },
                visualTraits: { type: "array", items: { type: "string" }, maxItems: 5 },
                alertSuggested: { type: "boolean" },
                alertReason: { type: ["string", "null"] },
                hudLine1: { type: "string" },
                hudLine2: { type: "string" },
              },
              required: [
                "facts",
                "tags",
                "visualTraits",
                "alertSuggested",
                "alertReason",
                "hudLine1",
                "hudLine2",
              ],
            },
          },
        },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI API: ${response.status}`);
    const payload = await response.json();
    const text = outputText(payload);
    if (!text) throw new Error("OpenAI APIから構造化結果を取得できませんでした。");
    const parsed = JSON.parse(text) as Omit<MemoryAnalysis, "mode">;
    return {
      facts: Array.isArray(parsed.facts) ? parsed.facts : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      visualTraits: Array.isArray(parsed.visualTraits) ? parsed.visualTraits : [],
      alertSuggested: Boolean(parsed.alertSuggested),
      alertReason: parsed.alertReason || null,
      hudLine1: compact(parsed.hudLine1, 30),
      hudLine2: compact(parsed.hudLine2, 30),
      mode: "openai",
    };
  } catch {
    return fallbackAnalysis(person, memo);
  }
}

export type ImaginedPortrait = {
  dataUrl: string;
  model: string;
  mode: "openai" | "fallback";
};

function fallbackPortrait(): ImaginedPortrait {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><rect width="640" height="640" fill="#142820"/><circle cx="320" cy="255" r="125" fill="#e5eddb"/><path d="M95 640c18-172 104-256 225-256s207 84 225 256" fill="#79a941"/><circle cx="278" cy="245" r="38" fill="none" stroke="#20362e" stroke-width="14"/><circle cx="362" cy="245" r="38" fill="none" stroke="#20362e" stroke-width="14"/><path d="M316 245h8M265 315c34 28 76 28 110 0" fill="none" stroke="#20362e" stroke-width="13" stroke-linecap="round"/><circle cx="320" cy="320" r="220" fill="none" stroke="#c9f56a" stroke-opacity=".18" stroke-width="2"/><circle cx="320" cy="320" r="278" fill="none" stroke="#c9f56a" stroke-opacity=".1" stroke-width="2"/></svg>`;
  return {
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    model: "deterministic-demo-sketch",
    mode: "fallback",
  };
}

export async function generateImaginedPortrait(person: ContactProfile): Promise<ImaginedPortrait> {
  const runtime = env as unknown as {
    OPENAI_API_KEY?: string;
    OPENAI_IMAGE_MODEL?: string;
  };
  const visualNotesFromMemos = person.memos
    .flatMap((memo) => memo.text.split(/[。！!？?]/))
    .map((note) => compact(note, 80))
    .filter((note) => note && visualPattern.test(note))
    .slice(-6);
  const portraitDetails = Array.from(new Set([...person.visualTraits, ...visualNotesFromMemos]));
  if (!portraitDetails.length) {
    throw new Error("先に、性別・年代・体型・服・髪型など、見た目の特徴をメモしてください。");
  }
  if (!runtime.OPENAI_API_KEY) return fallbackPortrait();

  const model = runtime.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const prompt = [
    "Create a clearly fictional but highly photorealistic portrait inspired only by a person's written memory notes.",
    "This is an AI-imagined memory aid, not a reconstruction, identification, biometric match, or claim about the real person's face.",
    `MANDATORY explicitly recorded visual details: ${portraitDetails.join("; ")}.`,
    "Every mandatory detail must be visibly and unambiguously reflected. If male or female presentation, age range, height, or body build is stated, depict it exactly. A stated fat, plus-size, heavyset, stocky, slim, or muscular build must be clearly visible in the silhouette and proportions.",
    "Do not slim, beautify, idealize, soften, contradict, or swap any stated characteristic. Give equal priority to body build and gender presentation, not only hair, clothes, or facial details.",
    "Use a natural photorealistic candid editorial-photography look with realistic skin texture, anatomy, lens depth, and soft daylight. Use a three-quarter or near-full-body composition so the stated body build is easy to see.",
    "Do not invent age, ethnicity, disability, religion, or gender presentation when it is not stated. Do not resemble any public figure.",
    "No words, letters, logos, watermark, frame, collage, illustration, anime styling, or UI. Centered square composition with a calm real-world background.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "jpeg",
      output_compression: 84,
      moderation: "auto",
      n: 1,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: { code?: string } } | null;
    if (payload?.error?.code === "moderation_blocked") {
      throw new Error("このメモでは画像を生成できませんでした。中立的な見た目の表現に直してください。");
    }
    throw new Error(`画像生成に失敗しました（${response.status}）。`);
  }
  const payload = (await response.json()) as { data?: Array<{ b64_json?: string }> };
  const image = payload.data?.[0]?.b64_json;
  if (!image) throw new Error("OpenAIから画像を受け取れませんでした。");
  return { dataUrl: `data:image/jpeg;base64,${image}`, model, mode: "openai" };
}
