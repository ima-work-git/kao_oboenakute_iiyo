import { getContact, replaceMemories, requireUser, updateMemory, type ContactProfile, type Memo } from "@/db/matane";
import { analyzeMemory } from "@/lib/openai";

async function replaceAndReanalyze(ownerId: string, contact: ContactProfile, memos: Memo[]) {
  if (!memos.length) {
    return {
      contact: await replaceMemories({
        ownerId,
        contactUserId: contact.contactUserId,
        memos: [],
        facts: [],
        visualTraits: [],
        tags: [],
        alertSuggested: false,
        alertReason: null,
        hudText: `${contact.name}さん${contact.org ? `｜${contact.org}` : ""}\n前回の続きを話す`,
      }),
      aiMode: "none",
    };
  }
  const combinedMemo = memos.map((memo) => memo.text).join("\n");
  const analysis = await analyzeMemory({ ...contact, memos }, combinedMemo);
  return {
    contact: await replaceMemories({
      ownerId,
      contactUserId: contact.contactUserId,
      memos,
      facts: analysis.facts,
      visualTraits: analysis.visualTraits,
      tags: analysis.tags,
      alertSuggested: analysis.alertSuggested,
      alertReason: analysis.alertReason,
      hudText: `${analysis.hudLine1}\n${analysis.hudLine2}`,
    }),
    aiMode: analysis.mode,
  };
}

function memoryError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message === "SESSION_REQUIRED") {
    return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
  }
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { contactUserId?: string; memo?: string };
    const contactUserId = payload.contactUserId?.trim() || "";
    const memo = payload.memo?.trim() || "";
    if (!contactUserId || !memo) {
      return Response.json({ error: "相手とメモを入力してください。" }, { status: 400 });
    }
    const contact = await getContact(owner.id, contactUserId);
    if (!contact) {
      return Response.json({ error: "交換済みの相手が見つかりません。" }, { status: 404 });
    }
    const analysis = await analyzeMemory(contact, memo);
    const updated = await updateMemory({
      ownerId: owner.id,
      contactUserId,
      memo,
      facts: analysis.facts,
      visualTraits: analysis.visualTraits,
      tags: analysis.tags,
      alertSuggested: analysis.alertSuggested,
      alertReason: analysis.alertReason,
      hudText: `${analysis.hudLine1}\n${analysis.hudLine2}`,
    });
    return Response.json({ contact: updated, aiMode: analysis.mode });
  } catch (error) {
    return memoryError(error, "特徴を保存できませんでした。");
  }
}

export async function PATCH(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { contactUserId?: string; memoIndex?: number; memo?: string };
    const contactUserId = payload.contactUserId?.trim() || "";
    const memo = payload.memo?.trim() || "";
    if (!contactUserId || !Number.isInteger(payload.memoIndex) || !memo) {
      return Response.json({ error: "編集するメモと内容を入力してください。" }, { status: 400 });
    }
    const contact = await getContact(owner.id, contactUserId);
    if (!contact) return Response.json({ error: "交換済みの相手が見つかりません。" }, { status: 404 });
    const memoIndex = payload.memoIndex as number;
    if (memoIndex < 0 || memoIndex >= contact.memos.length) {
      return Response.json({ error: "編集するメモが見つかりません。" }, { status: 404 });
    }
    const memos = contact.memos.map((item, index) => index === memoIndex ? { ...item, text: memo } : item);
    return Response.json(await replaceAndReanalyze(owner.id, contact, memos));
  } catch (error) {
    return memoryError(error, "メモを編集できませんでした。");
  }
}

export async function DELETE(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { contactUserId?: string; memoIndex?: number };
    const contactUserId = payload.contactUserId?.trim() || "";
    if (!contactUserId || !Number.isInteger(payload.memoIndex)) {
      return Response.json({ error: "削除するメモを指定してください。" }, { status: 400 });
    }
    const contact = await getContact(owner.id, contactUserId);
    if (!contact) return Response.json({ error: "交換済みの相手が見つかりません。" }, { status: 404 });
    const memoIndex = payload.memoIndex as number;
    if (memoIndex < 0 || memoIndex >= contact.memos.length) {
      return Response.json({ error: "削除するメモが見つかりません。" }, { status: 404 });
    }
    const memos = contact.memos.filter((_, index) => index !== memoIndex);
    return Response.json(await replaceAndReanalyze(owner.id, contact, memos));
  } catch (error) {
    return memoryError(error, "メモを削除できませんでした。");
  }
}
