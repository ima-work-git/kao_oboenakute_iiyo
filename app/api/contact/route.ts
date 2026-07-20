import { requireUser, updateContactNickname } from "@/db/matane";

export async function PATCH(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { contactUserId?: string; nickname?: string };
    const contactUserId = payload.contactUserId?.trim() || "";
    if (!contactUserId) return Response.json({ error: "相手を選んでください。" }, { status: 400 });
    const contact = await updateContactNickname({
      ownerId: owner.id,
      contactUserId,
      nickname: String(payload.nickname ?? ""),
    });
    return Response.json({ contact });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ニックネームを保存できませんでした。";
    return Response.json(
      { error: message === "SESSION_REQUIRED" ? "プロフィールを作成してください。" : message },
      { status: message === "SESSION_REQUIRED" ? 401 : 400 }
    );
  }
}
