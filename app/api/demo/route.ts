import { addDemoNearby, requireUser, updateLocation } from "@/db/matane";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const payload = (await request.json()) as { latitude?: number; longitude?: number };
    const latitude = Number.isFinite(payload.latitude) ? (payload.latitude as number) : 35.681236;
    const longitude = Number.isFinite(payload.longitude) ? (payload.longitude as number) : 139.767125;
    await updateLocation({ userId: user.id, latitude, longitude, accuracy: 20, enabled: true });
    const contacts = await addDemoNearby(user, latitude, longitude);
    return Response.json({ contacts, locationEnabled: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "デモを開始できませんでした。";
    return Response.json(
      { error: message === "SESSION_REQUIRED" ? "プロフィールを作成してください。" : message },
      { status: message === "SESSION_REQUIRED" ? 401 : 500 }
    );
  }
}
