import { env } from "cloudflare:workers";
import { getContact, getContactPortrait, requireUser, saveContactPortrait } from "@/db/matane";
import { generateImaginedPortrait } from "@/lib/openai";

function decodeImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/s);
  if (!match) throw new Error("生成画像を保存できませんでした。");
  const contentType = match[1];
  if (match[2]) {
    const binary = atob(match[3]);
    return { contentType, bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)) };
  }
  return { contentType, bytes: new TextEncoder().encode(decodeURIComponent(match[3])) };
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
    const contactUserId = new URL(request.url).searchParams.get("contactUserId")?.trim() || "";
    const saved = contactUserId ? await getContactPortrait(owner.id, contactUserId) : null;
    if (!saved?.portrait_key) return Response.json({ error: "保存画像がありません。" }, { status: 404 });
    const media = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
    if (!media) return Response.json({ error: "画像保存先が利用できません。" }, { status: 503 });
    const object = await media.get(saved.portrait_key);
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
    const portrait = await generateImaginedPortrait(contact);
    const disclaimer = portrait.mode === "openai"
      ? "メモから作ったAIの想像です。本人の顔を再現・特定するものではありません。"
      : "APIキー未設定のデモスケッチです。本人の顔を再現・特定するものではありません。";
    const media = (env as unknown as { MEDIA?: R2Bucket }).MEDIA;
    let updatedContact = null;
    if (media) {
      const previous = await getContactPortrait(owner.id, contactUserId);
      const image = decodeImageDataUrl(portrait.dataUrl);
      const key = `portraits/${owner.id}/${contactUserId}/${crypto.randomUUID()}.${extensionFor(image.contentType)}`;
      await media.put(key, image.bytes, { httpMetadata: { contentType: image.contentType } });
      updatedContact = await saveContactPortrait({ ownerId: owner.id, contactUserId, key, mode: portrait.mode, disclaimer });
      if (previous?.portrait_key && previous.portrait_key !== key) await media.delete(previous.portrait_key).catch(() => undefined);
    }
    return Response.json({
      ...portrait,
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
