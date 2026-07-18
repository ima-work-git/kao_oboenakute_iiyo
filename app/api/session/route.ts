import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  createUser,
  getUserByEmail,
  getUserByToken,
  linkUserEmail,
  sessionSnapshot,
  tokenFromRequest,
} from "@/db/matane";
import { validateAvatarDataUrl } from "@/lib/profile";

export async function GET(request: Request) {
  try {
    const account = await getChatGPTUser();
    const deviceUser = await getUserByToken(tokenFromRequest(request));
    const emailUser = account ? await getUserByEmail(account.email) : null;
    let user = emailUser ?? deviceUser;
    let linkedNow = false;

    if (!emailUser && deviceUser && account) {
      user = await linkUserEmail(deviceUser.id, account.email);
      linkedNow = true;
    }
    if (!user) {
      return Response.json(
        { error: account ? "このメールにはまだプロフィールがありません。" : "ログインまたはプロフィール作成が必要です。" },
        { status: 401 }
      );
    }
    return Response.json({
      ...(await sessionSnapshot(user)),
      token: user.device_token,
      restoredByEmail: Boolean(emailUser && (!deviceUser || emailUser.id !== deviceUser.id)),
      linkedNow,
    });
  } catch {
    return Response.json({ error: "セッションを取得できませんでした。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const account = await getChatGPTUser();
    if (account) {
      const existing = await getUserByEmail(account.email);
      if (existing) {
        return Response.json({
          ...(await sessionSnapshot(existing)),
          token: existing.device_token,
          restoredByEmail: true,
        });
      }
    }
    const payload = (await request.json()) as { name?: string; reading?: string; org?: string; avatarDataUrl?: string };
    const name = payload.name?.trim() || "";
    if (!name) return Response.json({ error: "名前を入力してください。" }, { status: 400 });
    const created = await createUser({
      name,
      reading: payload.reading?.trim() || "",
      org: payload.org?.trim() || "",
      avatarDataUrl: validateAvatarDataUrl(payload.avatarDataUrl),
      accountEmail: account?.email ?? null,
    });
    return Response.json({ user: created.user, contacts: [], token: created.token }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "プロフィールを作成できませんでした。" },
      { status: 500 }
    );
  }
}
