export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    select: {
      id: true, bookId: true, addedAt: true,
      book: {
        select: {
          id: true, slug: true, title: true, author: true, coverUrl: true,
          priceEgp: true, stock: true, isBestseller: true, isNewRelease: true,
          isFeatured: true, salesCount: true, compareAtEgp: true, },
      },
    },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json(
    items.map((i) => ({
      id: i.id,
      bookId: i.bookId,
      addedAt: i.addedAt.toISOString(),
      book: {
        id: i.book.id,
        slug: i.book.slug,
        title: i.book.title,
        author: i.book.author,
        coverUrl: i.book.coverUrl,
        priceEgp: Number(i.book.priceEgp),
        stock: i.book.stock,
        isBestseller: i.book.isBestseller,
        isNewRelease: i.book.isNewRelease,
        isFeatured: i.book.isFeatured,
        salesCount: i.book.salesCount,
        compareAtEgp: i.book.compareAtEgp ? Number(i.book.compareAtEgp) : null,
      },
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookId } = await req.json();
  if (!bookId) return NextResponse.json({ error: "bookId required" }, { status: 400 });

  const item = await prisma.wishlistItem.upsert({
    where: { userId_bookId: { userId: session.user.id, bookId } },
    update: {},
    create: { userId: session.user.id, bookId },
  });

  return NextResponse.json(item, { status: 201 });
}
