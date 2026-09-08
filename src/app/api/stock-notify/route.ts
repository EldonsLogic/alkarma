import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  bookId: z.string().min(1),
  email: z.string().email(),
  locale: z.string().optional(),
});

// POST /api/stock-notify — subscribe an email to a book's back-in-stock alert.
export async function POST(req: NextRequest) {
  const limited = await enforceRateLimit(req, "stock-notify", { limit: 8, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  const { bookId } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();

  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, stock: true } });
  if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });

  // Already in stock — no need to subscribe
  if (book.stock > 0) {
    return NextResponse.json({ ok: true, alreadyInStock: true });
  }

  await prisma.stockNotification.upsert({
    where: { bookId_email: { bookId, email } },
    update: { locale: "ar", notifiedAt: null },
    create: { bookId, email, locale: "ar" },
  });

  return NextResponse.json({ ok: true });
}
