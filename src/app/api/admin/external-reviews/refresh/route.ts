export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { refreshBookExternalReviews } from "@/lib/externalReviews";

/**
 * POST /api/admin/external-reviews/refresh
 * Body: { bookId?: string }  — omit bookId to refresh ALL active products (queued in background)
 *       { bookId: "xyz" }    — refresh a single product immediately
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { bookId } = await req.json().catch(() => ({}));

  if (bookId) {
    // Single book — do it inline so the admin can see the result immediately
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      select: { id: true, isbn: true, title: true, author: true },
    });
    if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

    await refreshBookExternalReviews(book.id, book.isbn, book.title, book.author);
    return NextResponse.json({ ok: true, refreshed: 1 });
  }

  // All books — fire and forget via the cron endpoint (avoids 60s timeout)
  const cronUrl = `${process.env.AUTH_URL ?? ""}/api/cron/refresh-external-reviews`;
  fetch(cronUrl, {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` },
  }).catch(() => {});

  const total = await prisma.book.count({ where: { isActive: true } });
  return NextResponse.json({ ok: true, message: `Queued refresh for ${total} products. Check back in a few minutes.` });
}
