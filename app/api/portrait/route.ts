import { getContact, requireUser } from "@/db/matane";
import { generateImaginedPortrait } from "@/lib/openai";

export async function POST(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { contactUserId?: string };
    const contactUserId = payload.contactUserId?.trim() || "";
    if (!contactUserId) {
      return Response.json({ error: "相手を選んでください。" }, { status: 400 });
    }
    const contact = await getContact(owner.id, contactUserId);
    if (!contact) {
      return Response.json({ error: "交換済みの相手が見つかりません。" }, { status: 404 });
    }
    const portrait = await generateImaginedPortrait(contact);
    return Response.json({
      ...portrait,
      disclaimer: portrait.mode === "openai"
        ? "メモから作ったAIの想像です。本人の顔を再現・特定するものではありません。"
        : "APIキー未設定のデモスケッチです。本人の顔を再現・特定するものではありません。",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REQUIRED") {
      return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "想像ポートレートを生成できませんでした。" },
      { status: 500 }
    );
  }
}
