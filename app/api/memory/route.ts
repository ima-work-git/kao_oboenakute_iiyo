import { getContact, requireUser, updateMemory } from "@/db/matane";
import { analyzeMemory } from "@/lib/openai";

export async function POST(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { contactUserId?: string; memo?: string };
    const contactUserId = payload.contactUserId?.trim() || "";
    const memo = payload.memo?.trim() || "";
    if (!contactUserId || !memo) {
      return Response.json({ error: "相手とメモを入力してください。" }, { status: 400 });
    }
    const contact = await getContact(owner.id, contactUserId);
    if (!contact) {
      return Response.json({ error: "交換済みの相手が見つかりません。" }, { status: 404 });
    }
    const analysis = await analyzeMemory(contact, memo);
    const updated = await updateMemory({
      ownerId: owner.id,
      contactUserId,
      memo,
      facts: analysis.facts,
      tags: analysis.tags,
      alertSuggested: analysis.alertSuggested,
      alertReason: analysis.alertReason,
      hudText: `${analysis.hudLine1}\n${analysis.hudLine2}`,
    });
    return Response.json({ contact: updated, aiMode: analysis.mode });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REQUIRED") {
      return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "メモを記憶化できませんでした。" },
      { status: 500 }
    );
  }
}
