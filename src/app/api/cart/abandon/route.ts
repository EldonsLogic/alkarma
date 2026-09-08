export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

// POST — upsert an abandoned cart snapshot
export async function POST(req: NextRequest) {
  // Prevent bots flooding the table with anonymous records
  const limited = await enforceRateLimit(req, "abandon", { limit: 20, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await auth();
  const {
    items,
    totalEgp,
    currency = "EGP",
    step = "cart",
    guestEmail,
  } = await req.json().catch(() => ({}));

  if (!items || !Array.isArray(items) || items.length > 100) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  const userId = session?.user?.id ?? null;

  // If no user and no guest email — still store anonymously
  const data = {
    items: JSON.stringify(items).slice(0, 20000), // cap stored payload size
    totalEgp: Number(totalEgp ?? 0) || 0,
    currency: "EGP",
    step: ["cart", "shipping", "payment"].includes(step) ? step : "cart",
    guestEmail: typeof guestEmail === "string" && guestEmail.length <= 254 ? guestEmail : null,
    isRecovered: false,
  };

  // Try to update existing record first (keyed on userId for logged-in users)
  if (userId) {
    const existing = await prisma.abandonedCart.findFirst({
      where: { userId, isRecovered: false },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      await prisma.abandonedCart.update({
        where: { id: existing.id },
        data,
      });
      return NextResponse.json({ ok: true });
    }

    await prisma.abandonedCart.create({ data: { ...data, userId } });
  } else {
    // For guests, just create a new record each time
    await prisma.abandonedCart.create({ data });
  }

  return NextResponse.json({ ok: true });
}

// PATCH — mark a cart as recovered (called from order confirmation)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ ok: true });

  await prisma.abandonedCart.updateMany({
    where: { userId, isRecovered: false },
    data: { isRecovered: true, recoveredAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
