import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COUNTRY_COOKIE } from "@/lib/shipping-region";

// In-memory cache for the redirects list, shared across requests on the same
// warm middleware instance. Previously every single storefront request (i.e.
// virtually every page view on the site) called /api/redirects, which runs a
// database query with no caching — the "Cache-Control" request header set
// here did nothing, since that only affects browser/CDN caching, not Next's
// server-side fetch, and the route itself was force-dynamic. That meant one
// DB round trip PER PAGE VIEW, scaling directly with traffic — exactly what
// you don't want right before real ad-driven visitors arrive. Caching this
// for 5 minutes cuts it to roughly one query per 5 minutes, platform-wide.
let redirectsCache: { data: { from: string; to: string; statusCode: number }[]; expires: number } | null = null;
const REDIRECTS_TTL_MS = 5 * 60 * 1000;

async function getCachedRedirects(origin: string) {
  const now = Date.now();
  if (redirectsCache && redirectsCache.expires > now) return redirectsCache.data;
  try {
    const res = await fetch(`${origin}/api/redirects`);
    const data = res.ok ? await res.json() : [];
    redirectsCache = { data, expires: now + REDIRECTS_TTL_MS };
    return data as { from: string; to: string; statusCode: number }[];
  } catch {
    // On failure, keep serving the previous (possibly stale) cache rather
    // than hammering the DB on every request; fall back to empty if none yet.
    return redirectsCache?.data ?? [];
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Apply dynamic redirects for storefront paths only
  const isStorefront = !pathname.startsWith("/admin") && !pathname.startsWith("/_next");
  if (isStorefront) {
    const redirects = await getCachedRedirects(request.nextUrl.origin);
    const match = redirects.find((r) => r.from === pathname);
    if (match) {
      const url = request.nextUrl.clone();
      url.pathname = match.to;
      return NextResponse.redirect(url, { status: match.statusCode === 302 ? 302 : 301 });
    }
  }

  const response = NextResponse.next();

  // ── Delivery-region hint ────────────────────────────────────────────────
  // Surface the visitor's country (Vercel edge header) so the storefront can
  // warn early that the store ships inside Egypt only. This is purely a UI
  // hint — /api/checkout enforces the rule server-side — and is intentionally
  // NOT tied to pricing: the store has one currency, EGP.
  const country = request.headers.get("x-vercel-ip-country");
  if (country) {
    response.cookies.set(COUNTRY_COOKIE, country.toUpperCase(), {
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|uploads).*)"],
};
