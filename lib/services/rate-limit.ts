import { redis } from "@/lib/redis";
import crypto from "crypto";

const EMAIL_WINDOW = 60 * 60; // 1 hour in seconds
const EMAIL_MAX = 3; // Maximum sends per hour
const EMAIL_COOLDOWN = 90; // Cooldown in seconds between requests

export interface RateLimitResult {
  allowed: boolean;
  reason?: "cooldown" | "rate_limit";
  cooldownSeconds?: number;
  retryAfter?: number;
}

/**
 * Hash an email address for privacy in Redis keys
 */
function hashEmail(email: string): string {
  const secret = process.env.REDIS_HASH_SECRET || "fallback_secret";
  return crypto
    .createHmac("sha256", secret)
    .update(email.toLowerCase().trim())
    .digest("hex");
}

/**
 * Check if an email is allowed to request a magic link
 * Enforces both short-term cooldown and hourly rate limits
 */
export async function checkMagicLinkRateLimit(
  email: string
): Promise<RateLimitResult> {
  try {
    const id = hashEmail(email);
    const cooldownKey = `cd:email:${id}`;
    const rateKey = `rl:email:${id}`;

    // Step 1: Check short cooldown
    const onCooldown = await redis.exists(cooldownKey);
    if (onCooldown) {
      const ttl = await redis.ttl(cooldownKey);
      return {
        allowed: false,
        reason: "cooldown",
        cooldownSeconds: ttl > 0 ? ttl : EMAIL_COOLDOWN,
      };
    }

    // Step 2: Check hourly rate limit
    const count = await redis.incr(rateKey);
    if (count === 1) {
      await redis.expire(rateKey, EMAIL_WINDOW);
    }
    if (count > EMAIL_MAX) {
      const ttl = await redis.ttl(rateKey);
      return {
        allowed: false,
        reason: "rate_limit",
        retryAfter: ttl > 0 ? ttl : EMAIL_WINDOW,
      };
    }

    return { allowed: true, cooldownSeconds: EMAIL_COOLDOWN };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // On error, allow the request to proceed
    // This ensures the service remains available if Redis is down
    return { allowed: true };
  }
}

/**
 * Set the cooldown period after successfully sending a magic link
 */
export async function setMagicLinkCooldown(email: string): Promise<void> {
  try {
    const id = hashEmail(email);
    const cooldownKey = `cd:email:${id}`;
    await redis.set(cooldownKey, "1", { ex: EMAIL_COOLDOWN });
  } catch (error) {
    console.error("Error setting cooldown:", error);
  }
}

/**
 * Clear rate limiting data for an email after successful authentication
 * This gives the user a fresh start after proving their identity
 */
export async function clearMagicLinkRateLimit(email: string): Promise<void> {
  try {
    const id = hashEmail(email);
    const cooldownKey = `cd:email:${id}`;
    const rateKey = `rl:email:${id}`;
    
    // Clear both cooldown and rate limit counters
    await Promise.all([
      redis.del(cooldownKey),
      redis.del(rateKey)
    ]);
  } catch (error) {
    console.error("Error clearing rate limit:", error);
  }
}

