export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/shipping/free-threshold?country=EG&currency=EGP
 * Returns the admin-configured promo bar text (if any) for the visitor's
 * region. The free-shipping threshold has been removed — it is no longer
 * applicable, so this no longer returns one; the promo bar falls back to a
 * fixed catchy message when no custom text is set.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  // Prefer the geo cookie set by middleware; fall back to query param
  const country = (
    req.cookies.get("alk-country")?.value ??
    sp.get("country") ??
    "EG"
  ).toUpperCase().slice(0, 2);

  const settings = await prisma.storeSetting.findMany({
    where: { key: { in: ["promo_bar_text", "promo_bar_text_ar"] } },
  }).catch(() => []);
  const m: Record<string, string> = {};
  settings.forEach((s) => { m[s.key] = s.value; });

  return NextResponse.json({
    country,
    promoText: m["promo_bar_text"] || "",
    promoTextAr: m["promo_bar_text_ar"] || "",
  });
}
