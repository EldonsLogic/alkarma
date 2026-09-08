export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { validateGiftCard } from "@/lib/gift-card";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Throttle brute-forcing of gift-card codes
  const limited = await enforceRateLimit(req, "gift-card", { limit: 20, windowMs: 60 * 1000 });
  if (limited) return limited;

  const { code, currency } = await req.json();

  const result = await validateGiftCard(code);
  if (!result.valid) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    code: result.code,
    balance: result.balance,
    currency: result.currency,
  });
}
