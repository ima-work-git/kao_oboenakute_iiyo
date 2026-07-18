import { createUser, requireUser, sessionSnapshot } from "@/db/matane";
import { validateAvatarDataUrl } from "@/lib/profile";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    return Response.json(await sessionSnapshot(user));
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REQUIRED") {
      return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
    }
    return Response.json({ error: "セッションを取得できませんでした。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { name?: string; reading?: string; org?: string; avatarDataUrl?: string };
    const name = payload.name?.trim() || "";
    if (!name) return Response.json({ error: "名前を入力してください。" }, { status: 400 });
    const created = await createUser({
      name,
      reading: payload.reading?.trim() || "",
      org: payload.org?.trim() || "",
      avatarDataUrl: validateAvatarDataUrl(payload.avatarDataUrl),
    });
    return Response.json({ user: created.user, contacts: [], token: created.token }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "プロフィールを作成できませんでした。" },
      { status: 500 }
    );
  }
}
