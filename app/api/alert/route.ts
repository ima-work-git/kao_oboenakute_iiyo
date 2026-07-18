import { requireUser, setAlert } from "@/db/matane";

export async function POST(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { contactUserId?: string; approved?: boolean };
    if (!payload.contactUserId) {
      return Response.json({ error: "相手が見つかりません。" }, { status: 400 });
    }
    const contact = await setAlert(owner.id, payload.contactUserId, Boolean(payload.approved));
    return Response.json({ contact });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REQUIRED") {
      return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "注意設定を更新できませんでした。" },
      { status: 500 }
    );
  }
}
