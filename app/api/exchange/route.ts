import { exchangeContact, requireUser } from "@/db/matane";

export async function POST(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as {
      code?: string;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    };
    const code = payload.code?.trim() || "";
    if (!code) return Response.json({ error: "交換コードを入力してください。" }, { status: 400 });
    const hasPosition =
      Number.isFinite(payload.latitude) &&
      Number.isFinite(payload.longitude) &&
      (payload.latitude as number) >= -90 &&
      (payload.latitude as number) <= 90 &&
      (payload.longitude as number) >= -180 &&
      (payload.longitude as number) <= 180;
    const result = await exchangeContact(owner, code, hasPosition ? {
      latitude: payload.latitude as number,
      longitude: payload.longitude as number,
      accuracy: Number.isFinite(payload.accuracy) ? Math.max(0, payload.accuracy as number) : null,
    } : null);
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "交換できませんでした。";
    return Response.json(
      { error: message === "SESSION_REQUIRED" ? "プロフィールを作成してください。" : message },
      { status: message === "SESSION_REQUIRED" ? 401 : 400 }
    );
  }
}
