export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Pro allows up to 300s for cron

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshBookExternalReviews } from "@/lib/externalReviews";

/**
 * Weekly cron: refresh external ratings for all active products.
 *
 * Invoked automatically by Vercel Cron (see vercel.json).
 * Protected by CRON_SECRET — Vercel sets the Authorization header automatically.
 *
 * Can also be triggered manually from Admin → Products → "Refresh Ratings".
 */
export async function GET(req: NextRequest) {
  // Verify the request is from Vercel Cron or an admin trigger.
  // Fail CLOSED: if no secret is configured, reject everything rather than
  // leaving the endpoint publicly triggerable (API-abuse / cost risk).
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const books = await prisma.book.findMany({
    where: { isActive: true },
    select: { id: true, isbn: true, title: true, author: true },
  });

  let refreshed = 0;
  let failed = 0;

  // Process in batches of 5 to avoid hammering the APIs
  const BATCH = 5;
  for (let i = 0; i < books.length; i += BATCH) {
    const batch = books.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((b) =>
        refreshBookExternalReviews(b.id, b.isbn, b.title, b.author)
      )
    );
    results.forEach((r) => {
      if (r.status === "fulfilled") refreshed++;
      else failed++;
    });
    // Small pause between batches to be respectful to free APIs
    if (i + BATCH < books.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return NextResponse.json({
    ok: true,
    total: books.length,
    refreshed,
    failed,
    timestamp: new Date().toISOString(),
  });
}
