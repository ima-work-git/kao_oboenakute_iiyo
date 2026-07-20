import { createReviewerDemoSession } from "@/db/matane";
import { hasCurrentPolicyConsent, type PolicyConsent } from "@/lib/policy";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { consent?: PolicyConsent };
    if (!hasCurrentPolicyConsent(payload.consent)) {
      return Response.json({ error: "Terms, Privacy Policy, and AI image consent are required." }, { status: 400 });
    }
    return Response.json(await createReviewerDemoSession(), { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "審査デモを開始できませんでした。" },
      { status: 500 }
    );
  }
}
