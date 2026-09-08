export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getRatesForCountry } from "@/lib/shipping";

/**
 * GET /api/shipping/rates?country=EG&currency=EGP&subtotal=350
 * Returns the shipping options available for a country, with free-shipping
 * already applied for the given currency + subtotal.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const country = (sp.get("country") ?? "EG").toUpperCase().slice(0, 2);
  const subtotal = Math.max(0, Number(sp.get("subtotal") ?? 0) || 0);
  const governorate = sp.get("governorate") ?? undefined;

  const rates = await getRatesForCountry(country, subtotal, governorate || undefined);
  return NextResponse.json({ rates });
}
