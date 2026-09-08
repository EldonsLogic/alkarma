export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(48, parseInt(searchParams.get("limit") ?? "24"));
  const skip = (page - 1) * limit;
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const bestseller = searchParams.get("bestseller") === "true";
  const newRelease = searchParams.get("newRelease") === "true";
  const featured = searchParams.get("featured") === "true";
  const inStock = searchParams.get("inStock") === "true";
  const sort = searchParams.get("sort") ?? "bestselling";

  const where = {
    isActive: true,
    ...(bestseller ? { isBestseller: true } : {}),
    ...(newRelease ? { isNewRelease: true } : {}),
    ...(featured ? { isFeatured: true } : {}),
    ...(inStock ? { stock: { gt: 0 } } : {}),
    ...(category ? { categories: { some: { category: { slug: category } } } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { author: { contains: q, mode: "insensitive" as const } },
            { synopsis: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "price-asc"
      ? { priceEgp: "asc" as const }
      : sort === "price-desc"
      ? { priceEgp: "desc" as const }
      : sort === "newest"
      ? { createdAt: "desc" as const }
      : { salesCount: "desc" as const };

  const [books, total] = await Promise.all([
    prisma.book.findMany({ where, orderBy, skip, take: limit }),
    prisma.book.count({ where }),
  ]);

  // Log search queries (fire-and-forget, page 1 only to avoid double-counting)
  if (q && page === 1) {
    prisma.searchLog.create({ data: { query: q.toLowerCase().trim(), resultsCount: total } }).catch(() => {});
  }

  return NextResponse.json({
    books: books.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      author: b.author,
      coverUrl: b.coverUrl,
      priceEgp: Number(b.priceEgp),
      compareAtEgp: b.compareAtEgp ? Number(b.compareAtEgp) : null,
      isBestseller: b.isBestseller,
      isNewRelease: b.isNewRelease,
      isFeatured: b.isFeatured,
      salesCount: b.salesCount,
      stock: b.stock,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
