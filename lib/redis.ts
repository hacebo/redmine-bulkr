import { Redis } from "@upstash/redis";

/**
 * Creates a Redis client using Vercel KV environment variables.
 * Make sure you set KV_REST_API_URL and KV_REST_API_TOKEN.
 */
export function createRedis() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      "Missing KV_REST_API_URL or KV_REST_API_TOKEN in environment variables."
    );
  }

  return new Redis({ url, token });
}

/**
 * Shared Redis instance for server-side operations
 */
export const redis = createRedis();

