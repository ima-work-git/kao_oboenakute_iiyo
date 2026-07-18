import { requireUser, updateLocation } from "@/db/matane";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const payload = (await request.json()) as {
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: number | null;
      enabled?: boolean;
    };
    const enabled = Boolean(payload.enabled);
    if (
      enabled &&
      (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude))
    ) {
      return Response.json({ error: "位置情報を取得できませんでした。" }, { status: 400 });
    }
    const contacts = await updateLocation({
      userId: user.id,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      accuracy: payload.accuracy ?? null,
      enabled,
    });
    return Response.json({ contacts, locationEnabled: enabled });
  } catch (error) {
    const message = error instanceof Error ? error.message : "位置を更新できませんでした。";
    return Response.json(
      { error: message === "SESSION_REQUIRED" ? "プロフィールを作成してください。" : message },
      { status: message === "SESSION_REQUIRED" ? 401 : 500 }
    );
  }
}
