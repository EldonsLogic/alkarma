import { NextRequest, NextResponse } from "next/server";
import { prisma } from "./prisma";

/**
 * Durable, serverless-safe rate limiter backed by Postgres.
 * Survives cold starts and works across multiple Vercel instances —
 * unlike an in-memory counter which resets per instance.
 *
 * Usage in a route:
 *   const limited = await enforceRateLimit(req, "register", { limit: 5, windowMs: 60_000 });
 *   if (limited) return limited; // 429 response
 */

export interface RateLimitOptions {
  limit: number;      // max requests allowed in the window
  windowMs: number;   // window length in milliseconds
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Best-effort client IP extraction (Vercel sets these). */
export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Atomically check + increment the counter for a key.
 * Fails OPEN (allows the request) if the DB is unreachable — availability
 * over strictness, since these are abuse-mitigation not auth controls.
 */
export async function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions
): Promise<RateLimitResult> {
  const now = new Date();

  // Opportunistic cleanup (~1% of calls) so expired rows don't accumulate
  if (Math.random() < 0.01) {
    prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }).catch(() => {});
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.rateLimit.findUnique({ where: { key } });

      // No record, or the window has expired → start a fresh window
      if (!existing || existing.expiresAt < now) {
        const expiresAt = new Date(now.getTime() + windowMs);
        await tx.rateLimit.upsert({
          where: { key },
          create: { key, count: 1, expiresAt },
          update: { count: 1, expiresAt },
        });
        return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
      }

      // Within the window and over the limit → block
      if (existing.count >= limit) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((existing.expiresAt.getTime() - now.getTime()) / 1000)
        );
        return { allowed: false, remaining: 0, retryAfterSec };
      }

      // Within the window, under the limit → increment
      await tx.rateLimit.update({
        where: { key },
        data: { count: { increment: 1 } },
      });
      return { allowed: true, remaining: limit - existing.count - 1, retryAfterSec: 0 };
    });
  } catch {
    // DB error — fail open so legitimate users aren't locked out
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
  }
}

/**
 * Convenience wrapper: rate-limits by client IP for a named action.
 * Returns a 429 NextResponse if the limit is exceeded, otherwise null.
 */
export async function enforceRateLimit(
  req: NextRequest,
  action: string,
  opts: RateLimitOptions,
  extraKey?: string
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const key = `${action}:${ip}${extraKey ? `:${extraKey}` : ""}`;
  const result = await rateLimit(key, opts);
  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(result.retryAfterSec) },
      }
    );
  }
  return null;
}
