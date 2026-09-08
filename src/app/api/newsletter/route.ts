export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Block subscriber-spam bots: max 5 per IP per 10 min
  const limited = await enforceRateLimit(req, "newsletter", { limit: 5, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const { email, source } = await req.json().catch(() => ({}));

  if (!email || typeof email !== "string" || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  // Whitelist the source field rather than storing arbitrary client input
  const allowedSources = ["homepage", "footer", "popup", "checkout", "blog"];
  const safeSource = allowedSources.includes(source) ? source : "homepage";

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existing) {
    if (!existing.isActive) {
      await prisma.newsletterSubscriber.update({
        where: { email: email.toLowerCase().trim() },
        data: { isActive: true },
      });
    }
    // Still return 200 — don't reveal if already subscribed
    return NextResponse.json({ ok: true });
  }

  await prisma.newsletterSubscriber.create({
    data: {
      email: email.toLowerCase().trim(),
      source: safeSource,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
