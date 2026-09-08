import { NextRequest, NextResponse } from "next/server";

/**
 * Cloudflare Turnstile — server-side token verification.
 *
 * Set TURNSTILE_SECRET_KEY in env to enable. If it's unset, verification is
 * SKIPPED (returns ok) so the site keeps working before keys are configured.
 * The matching public site key goes in NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY;
}

export async function verifyTurnstile(token: string | undefined, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured → skip (don't block legitimate users)
  if (!token) return false;

  try {
    const body = new URLSearchParams();
    body.append("secret", secret);
    body.append("response", token);
    if (ip) body.append("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    // On network error to Cloudflare, fail OPEN so the form still works
    return true;
  }
}

/**
 * Convenience guard for API routes. Reads the token from the request body's
 * `turnstileToken` field. Returns a 403 NextResponse if verification fails,
 * otherwise null.
 */
export async function enforceTurnstile(
  req: NextRequest,
  token: string | undefined
): Promise<NextResponse | null> {
  if (!isTurnstileEnabled()) return null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
  const ok = await verifyTurnstile(token, ip);
  if (!ok) {
    return NextResponse.json(
      { error: "Verification failed. Please refresh the page and try again." },
      { status: 403 }
    );
  }
  return null;
}
