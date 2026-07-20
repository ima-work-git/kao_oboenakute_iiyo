import { acceptCurrentPolicies, requireUser } from "@/db/matane";
import { hasCurrentPolicyConsent, type PolicyConsent } from "@/lib/policy";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    const payload = (await request.json()) as { consent?: PolicyConsent };
    if (!hasCurrentPolicyConsent(payload.consent)) {
      return Response.json({ error: "明示同意を確認できませんでした。" }, { status: 400 });
    }
    return Response.json({ user: await acceptCurrentPolicies(user.id) });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REQUIRED") {
      return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
    }
    return Response.json({ error: "同意内容を保存できませんでした。" }, { status: 500 });
  }
}
