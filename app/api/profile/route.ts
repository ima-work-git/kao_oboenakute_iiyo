import { requireUser, updateUserProfile } from "@/db/matane";
import { validateAvatarDataUrl } from "@/lib/profile";

export async function PATCH(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as {
      name?: string;
      reading?: string;
      org?: string;
      avatarDataUrl?: string;
    };
    const name = payload.name?.trim() || "";
    if (!name) return Response.json({ error: "名前 / Name を入力してください。" }, { status: 400 });
    const user = await updateUserProfile({
      userId: owner.id,
      name,
      reading: payload.reading?.trim() || "",
      org: payload.org?.trim() || "",
      avatarDataUrl: validateAvatarDataUrl(payload.avatarDataUrl),
    });
    return Response.json({ user });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REQUIRED") {
      return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "プロフィールを更新できませんでした。" },
      { status: 500 }
    );
  }
}
