import { sha256 } from "@/lib/crypto";
import { readEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/data/supabase";

interface RateLimitInput {
  scope: string;
  identity: string;
  limit?: number;
  windowSeconds?: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  requestCount: number;
}

const memoryBucket = new Map<string, { count: number; resetAt: number }>();

function getWindowStart(now: Date, windowSeconds: number): string {
  const epochSeconds = Math.floor(now.getTime() / 1000);
  const normalized = Math.floor(epochSeconds / windowSeconds) * windowSeconds;
  return new Date(normalized * 1000).toISOString();
}

function inMemoryRateLimit(input: RateLimitInput, now: number): RateLimitResult {
  const windowSeconds = input.windowSeconds ?? Number(readEnv("RATE_LIMIT_WINDOW_SECONDS"));
  const max = input.limit ?? Number(readEnv("RATE_LIMIT_MAX_REQUESTS"));
  const key = `${input.scope}:${sha256(input.identity)}`;

  const entry = memoryBucket.get(key);
  if (!entry || now >= entry.resetAt) {
    memoryBucket.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: windowSeconds, requestCount: 1 };
  }

  entry.count += 1;
  memoryBucket.set(key, entry);

  return {
    allowed: entry.count <= max,
    retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    requestCount: entry.count,
  };
}

export async function enforceRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = new Date();
  const windowSeconds = input.windowSeconds ?? Number(readEnv("RATE_LIMIT_WINDOW_SECONDS"));
  const max = input.limit ?? Number(readEnv("RATE_LIMIT_MAX_REQUESTS"));
  const keyHash = sha256(input.identity);
  const windowStart = getWindowStart(now, windowSeconds);

  try {
    const supabase = getSupabaseServiceClient();
    const { data: existing, error: selectError } = await supabase
      .from("api_rate_limits")
      .select("request_count")
      .eq("key_hash", keyHash)
      .eq("scope", input.scope)
      .eq("window_start", windowStart)
      .maybeSingle();

    if (selectError) {
      throw selectError;
    }

    const existingRow = existing as { request_count: number } | null;
    const requestCount = Number(existingRow?.request_count ?? 0) + 1;

    const { error: upsertError } = await supabase.from("api_rate_limits").upsert(
      {
        key_hash: keyHash,
        scope: input.scope,
        window_start: windowStart,
        request_count: requestCount,
        updated_at: now.toISOString(),
      },
      { onConflict: "key_hash,scope,window_start" },
    );

    if (upsertError) {
      throw upsertError;
    }

    return {
      allowed: requestCount <= max,
      retryAfterSeconds: windowSeconds,
      requestCount,
    };
  } catch {
    return inMemoryRateLimit(input, now.getTime());
  }
}
