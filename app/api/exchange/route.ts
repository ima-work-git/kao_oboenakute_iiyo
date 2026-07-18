import { exchangeContact, requireUser } from "@/db/matane";

export async function POST(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { code?: string };
    const code = payload.code?.trim() || "";
    if (!code) return Response.json({ error: "交換コードを入力してください。" }, { status: 400 });
    const result = await exchangeContact(owner, code);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "交換できませんでした。";
    return Response.json(
      { error: message === "SESSION_REQUIRED" ? "プロフィールを作成してください。" : message },
      { status: message === "SESSION_REQUIRED" ? 401 : 400 }
    );
  }
}
