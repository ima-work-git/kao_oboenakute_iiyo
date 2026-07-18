import type { ContactProfile } from "@/db/matane";
import { env } from "cloudflare:workers";

export type MemoryAnalysis = {
  facts: string[];
  tags: string[];
  alertSuggested: boolean;
  alertReason: string | null;
  hudLine1: string;
  hudLine2: string;
  mode: "openai" | "fallback";
};

const cautionPattern = /強引|しつこ|怖|危険|不快|ハラス|勧誘|避け|苦手|怒鳴|セクハラ|パワハラ/i;
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
  const topic = compact(memo.split(/[。！!？?]/)[0] || memo, 18);
  const shortName = person.name.replace(/\s+/g, "").slice(0, 6);
  return {
    facts: [compact(memo, 42)],
    tags: tags.length ? tags : ["会話メモ"],
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
                alertSuggested: { type: "boolean" },
                alertReason: { type: ["string", "null"] },
                hudLine1: { type: "string" },
                hudLine2: { type: "string" },
              },
              required: [
                "facts",
                "tags",
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
