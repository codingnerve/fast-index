// API key generation, hashing, lookup, and a simple in-memory rate limiter.
import crypto from "crypto";
import { dbConnect } from "./db";
import { ApiKey } from "./models";

const PREFIX = "ifk_"; // IndexFast Key

/** Generate a new key. Returns the plaintext (shown once) + storage fields. */
export function generateApiKey() {
  const random = crypto.randomBytes(24).toString("base64url");
  const full = PREFIX + random;
  const hash = crypto.createHash("sha256").update(full).digest("hex");
  return { full, hash, prefix: full.slice(0, 12) };
}

export function hashApiKey(full: string): string {
  return crypto.createHash("sha256").update(full).digest("hex");
}

/** Look up the owning user for a presented key, or null. Bumps usage stats. */
export async function authenticateApiKey(full: string) {
  if (!full.startsWith(PREFIX)) return null;
  await dbConnect();
  const hash = hashApiKey(full);
  const key = await ApiKey.findOne({ hash });
  if (!key || key.revoked) return null;
  await ApiKey.updateOne(
    { _id: key._id },
    { $set: { lastUsedAt: new Date() }, $inc: { requests: 1 } }
  );
  return { userId: key.userId as string, keyId: String(key._id) };
}

// ---- Simple fixed-window rate limiter (per-instance, in-memory) ----
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60; // 60 requests / minute / key
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(keyId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(keyId);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(keyId, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, retryAfter: 0 };
  }
  if (bucket.count >= MAX_PER_WINDOW) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count++;
  return { ok: true, retryAfter: 0 };
}

/** Extract the key from an Authorization: Bearer or x-api-key header. */
export function extractKey(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  const x = req.headers.get("x-api-key");
  return x?.trim() || null;
}
