export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateCoupon } from "@/lib/coupon";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Throttle coupon brute-forcing (guessing valid codes)
  const limited = await enforceRateLimit(req, "coupon", { limit: 20, windowMs: 60 * 1000 });
  if (limited) return limited;

  const { code, subtotal } = await req.json();

  const sub = Number(subtotal);
  if (!Number.isFinite(sub) || sub < 0) {
    return NextResponse.json({ error: "Invalid subtotal" }, { status: 400 });
  }

  const result = await validateCoupon(code, sub);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code: result.code,
    discount: result.discount,
    discountType: result.discountType,
    freeShipping: result.freeShipping,
    message: `Code applied! You saved ${result.discount} EGP`,
  });
}
