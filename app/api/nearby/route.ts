import { listContacts, requireUser } from "@/db/matane";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const contacts = await listContacts(user.id);
    return Response.json({ contacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "近くの人を取得できませんでした。";
    return Response.json(
      { error: message === "SESSION_REQUIRED" ? "プロフィールを作成してください。" : message },
      { status: message === "SESSION_REQUIRED" ? 401 : 500 }
    );
  }
}
