export function validateAvatarDataUrl(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  if (value.length > 350_000) throw new Error("アイコン画像が大きすぎます。別の画像を選んでください。");
  if (!/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value)) {
    throw new Error("アイコン画像の形式が正しくありません。");
  }
  return value;
}
