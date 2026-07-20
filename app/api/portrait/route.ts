import { env } from "cloudflare:workers";
import {
  finalizeContactPortrait,
  getContact,
  getContactPortrait,
  requireUser,
  saveContactPortrait,
} from "@/db/matane";
import { generateImaginedPortraitPair } from "@/lib/openai";

function decodeImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^,]+),(.*)$/s);
  if (!match) throw new Error("生成画像を保存できませんでした。");
  const metadata = match[1].split(";");
  const contentType = metadata[0] || "application/octet-stream";
  if (metadata.includes("base64")) {
    const binary = atob(match[2]);
    return { contentType, bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)) };
  }
  return { contentType, bytes: new TextEncoder().encode(decodeURIComponent(match[2])) };
}

function extensionFor(contentType: string) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "svg";
}

export async function GET(request: Request) {
  try {
    const owner = await requireUser(request);
    const url = new URL(request.url);
    const contactUserId = url.searchParams.get("contactUserId")?.trim() || "";
    const kind = url.searchParams.get("kind") || "face";
    const saved = contactUserId ? await getContactPortrait(owner.id, contactUserId) : null;
    const key = kind === "fullBody"
      ? saved?.portrait_full_body_key
      : kind === "previousFace"
        ? saved?.portrait_previous_key
        : kind === "previousFullBody"
          ? saved?.portrait_previous_full_body_key
          : saved?.portrait_key;
    if (!key) return Response.json({ error: "保存画像がありません。" }, { status: 404 });
    const media = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
    if (!media) return Response.json({ error: "画像保存先が利用できません。" }, { status: 503 });
    const object = await media.get(key);
    if (!object) return Response.json({ error: "保存画像が見つかりません。" }, { status: 404 });
    const headers = new Headers({ "Cache-Control": "private, max-age=300" });
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    return new Response(object.body, { headers });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REQUIRED") {
      return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
    }
    return Response.json({ error: "保存画像を取得できませんでした。" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { contactUserId?: string };
    const contactUserId = payload.contactUserId?.trim() || "";
    if (!contactUserId) {
      return Response.json({ error: "相手を選んでください。" }, { status: 400 });
    }
    const contact = await getContact(owner.id, contactUserId);
    if (!contact) {
      return Response.json({ error: "交換済みの相手が見つかりません。" }, { status: 404 });
    }
    const portraits = await generateImaginedPortraitPair(contact);
    const disclaimer = portraits.face.mode === "openai"
      ? "メモから作ったAIの想像です。本人の顔を再現・特定するものではありません。"
      : "APIキー未設定のデモスケッチです。本人の顔を再現・特定するものではありません。";
    const media = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
    let updatedContact = null;
    if (media) {
      const previous = await getContactPortrait(owner.id, contactUserId);
      const faceImage = decodeImageDataUrl(portraits.face.dataUrl);
      const fullBodyImage = decodeImageDataUrl(portraits.fullBody.dataUrl);
      const batchId = crypto.randomUUID();
      const faceKey = `portraits/${owner.id}/${contactUserId}/${batchId}-face.${extensionFor(faceImage.contentType)}`;
      const fullBodyKey = `portraits/${owner.id}/${contactUserId}/${batchId}-full.${extensionFor(fullBodyImage.contentType)}`;
      await Promise.all([
        media.put(faceKey, faceImage.bytes, { httpMetadata: { contentType: faceImage.contentType } }),
        media.put(fullBodyKey, fullBodyImage.bytes, { httpMetadata: { contentType: fullBodyImage.contentType } }),
      ]);
      updatedContact = await saveContactPortrait({
        ownerId: owner.id,
        contactUserId,
        faceKey,
        fullBodyKey,
        previousFaceKey: previous?.portrait_key && previous?.portrait_full_body_key ? previous.portrait_key : "",
        previousFullBodyKey: previous?.portrait_key && previous?.portrait_full_body_key ? previous.portrait_full_body_key : "",
        previousMode: previous?.portrait_key && previous?.portrait_full_body_key
          ? previous.portrait_mode === "openai" ? "openai" : "fallback"
          : "",
        previousUpdatedAt: previous?.portrait_key && previous?.portrait_full_body_key
          ? previous.portrait_updated_at
          : null,
        mode: portraits.face.mode,
        disclaimer,
      });
      await Promise.all([
        previous?.portrait_previous_key && previous.portrait_previous_key !== previous.portrait_key
          ? media.delete(previous.portrait_previous_key)
          : Promise.resolve(),
        previous?.portrait_previous_full_body_key && previous.portrait_previous_full_body_key !== previous.portrait_full_body_key
          ? media.delete(previous.portrait_previous_full_body_key)
          : Promise.resolve(),
      ]).catch(() => undefined);
    }
    return Response.json({
      portraits,
      disclaimer,
      contact: updatedContact,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REQUIRED") {
      return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "想像ポートレートを生成できませんでした。" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const owner = await requireUser(request);
    const payload = (await request.json()) as { contactUserId?: string; choice?: string };
    const contactUserId = payload.contactUserId?.trim() || "";
    const choice = payload.choice === "previous" ? "previous" : payload.choice === "current" ? "current" : null;
    if (!contactUserId || !choice) {
      return Response.json({ error: "採用する画像を選んでください。" }, { status: 400 });
    }
    const result = await finalizeContactPortrait({ ownerId: owner.id, contactUserId, choice });
    const media = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
    if (media) {
      await Promise.all(result.discardedKeys.filter(Boolean).map((key) => media.delete(key))).catch(() => undefined);
    }
    return Response.json({ contact: result.contact, choice });
  } catch (error) {
    if (error instanceof Error && error.message === "SESSION_REQUIRED") {
      return Response.json({ error: "プロフィールを作成してください。" }, { status: 401 });
    }
    return Response.json(
      { error: error instanceof Error ? error.message : "画像を採用できませんでした。" },
      { status: 400 }
    );
  }
}
