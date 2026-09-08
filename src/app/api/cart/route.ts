export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] });

  const items = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    select: {
      id: true, bookId: true, quantity: true,
      book: { select: { id: true, slug: true, title: true, author: true, coverUrl: true, priceEgp: true, stock: true } },
    },
    orderBy: { addedAt: "asc" },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      bookId: item.bookId,
      quantity: item.quantity,
      book: item.book
        ? {
            id: item.book.id,
            slug: item.book.slug,
            title: item.book.title,
            author: item.book.author,
            coverUrl: item.book.coverUrl,
            priceEgp: Number(item.book.priceEgp),
            stock: item.book.stock,
          }
        : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId, quantity = 1 } = await req.json();
  if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

  const book = await prisma.book.findUnique({ where: { id: bookId } });
  if (!book) return NextResponse.json({ error: "Book not found" }, { status: 404 });

  const existing = await prisma.cartItem.findUnique({
    where: { userId_bookId: { userId: session.user.id, bookId } },
  });

  if (existing) {
    const updated = await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
    return NextResponse.json(updated);
  }

  const item = await prisma.cartItem.create({
    data: { userId: session.user.id, bookId, quantity },
  });
  return NextResponse.json(item, { status: 201 });
}
