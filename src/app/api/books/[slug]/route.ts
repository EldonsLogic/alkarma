export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decodeSlug } from "@/lib/slug";

export async function GET(_: NextRequest, { params }: { params: { slug: string } }) {
  const book = await prisma.book.findUnique({
    where: { slug: decodeSlug(params.slug), isActive: true },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      reviews: {
        where: { isApproved: true },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!book) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const avgRating =
    book.reviews.length > 0
      ? book.reviews.reduce((s, r) => s + r.rating, 0) / book.reviews.length
      : 0;

  return NextResponse.json({
    ...book,
    priceEgp: Number(book.priceEgp),
    compareAtEgp: book.compareAtEgp ? Number(book.compareAtEgp) : null,
    averageRating: avgRating,
    reviewCount: book.reviews.length,
  });
}
