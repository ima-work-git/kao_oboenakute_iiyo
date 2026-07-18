import { createReviewerDemoSession } from "@/db/matane";

export async function POST() {
  try {
    return Response.json(await createReviewerDemoSession(), { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "審査デモを開始できませんでした。" },
      { status: 500 }
    );
  }
}
