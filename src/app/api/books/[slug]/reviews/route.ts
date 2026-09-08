export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decodeSlug } from "@/lib/slug";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendAdminNewReview } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Throttle review spam: max 10 per user per hour
  const limited = await enforceRateLimit(req, "review", { limit: 10, windowMs: 60 * 60 * 1000 }, session.user.id);
  if (limited) return limited;

  const book = await prisma.book.findUnique({ where: { slug: decodeSlug(params.slug) } });
  if (!book)
    return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const { rating, title, body } = await req.json().catch(() => ({}));

  if (!body?.trim())
    return NextResponse.json({ error: "Review body is required." }, { status: 400 });

  // Cap lengths to prevent oversized-payload storage abuse
  if (typeof body !== "string" || body.length > 5000)
    return NextResponse.json({ error: "Review is too long (max 5000 characters)." }, { status: 400 });
  if (title && (typeof title !== "string" || title.length > 200))
    return NextResponse.json({ error: "Title is too long (max 200 characters)." }, { status: 400 });

  const ratingNum = parseInt(String(rating));
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5)
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });

  // Check if user already reviewed this book
  const existing = await prisma.review.findUnique({
    where: { bookId_userId: { bookId: book.id, userId: session.user.id } },
  });
  if (existing)
    return NextResponse.json({ error: "You have already reviewed this book." }, { status: 409 });

  const review = await prisma.review.create({
    data: {
      bookId: book.id,
      userId: session.user.id,
      rating: ratingNum,
      title: title?.trim() || null,
      body: body.trim(),
      isApproved: false,
    },
  });

  // Notify admins so they can moderate the new review
  try {
    await sendAdminNewReview({
      bookTitle: book.title,
      bookSlug: book.slug,
      rating: ratingNum,
      reviewer: session.user.email ?? "a customer",
      comment: body.trim(),
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ id: review.id }, { status: 201 });
}
