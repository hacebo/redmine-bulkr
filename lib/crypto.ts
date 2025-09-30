import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

const keyB64 = process.env.CRYPTO_KEY_BASE64;
if (!keyB64) {
  throw new Error("Missing CRYPTO_KEY_BASE64 environment variable");
}

const key = Buffer.from(keyB64, "base64");
if (key.length !== 32) {
  throw new Error("CRYPTO_KEY_BASE64 must be a 32-byte key encoded in base64");
}

export function encryptToGcm(plain: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encB64: enc.toString("base64"),
    ivB64: iv.toString("base64"),
    tagB64: tag.toString("base64"),
  };
}

export function decryptFromGcm(encB64: string, ivB64: string, tagB64: string) {
  const enc = Buffer.from(encB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
  return dec.toString("utf8");
}
