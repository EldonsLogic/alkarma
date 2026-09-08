export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { BOOK_SUMMARY_SELECT } from "@/lib/bookSummarySelect";

/**
 * GET /api/books/by-slug?slugs=a,b,c
 *
 * Resolves a short list of slugs to book summaries, for the "recently viewed"
 * strip — the slugs live in the visitor's own browser, so the server is only
 * asked to look up what they already have.
 *
 * Results are returned in the order requested, and the count is capped so a
 * crafted query string can't turn this into an unbounded catalogue dump.
 */
const MAX = 12;

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("slugs") ?? "";
  const slugs = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX);
  if (!slugs.length) return NextResponse.json({ books: [] });

  const rows = await prisma.book.findMany({
    where: { slug: { in: slugs }, isActive: true },
    select: BOOK_SUMMARY_SELECT,
  });

  // Preserve the caller's ordering (most recently viewed first).
  const bySlug = new Map(rows.map((b) => [b.slug, b]));
  const books = slugs.map((s) => bySlug.get(s)).filter(Boolean);

  return NextResponse.json({ books });
}
