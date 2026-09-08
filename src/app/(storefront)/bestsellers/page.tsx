import { prisma } from "@/lib/prisma";
import { BOOK_SUMMARY_SELECT } from "@/lib/bookSummarySelect";
import { resolveSortOrderBy } from "@/lib/sort";
import { CategoryPageClient } from "../category/[slug]/CategoryPageClient";

interface Props {
  searchParams: {
    page?: string;
    sort?: string;
    inStock?: string;
    minPrice?: string;
    maxPrice?: string;
    author?: string;
  };
}

import { canonical } from "@/lib/seo";

export const metadata = { title: "Bestsellers", ...canonical("/bestsellers") };

export default async function BestsellersPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 24;
  const skip = (page - 1) * limit;

  const sort = searchParams.sort ?? "bestselling";
  const orderBy = resolveSortOrderBy(sort);

  const where = {
    isActive: true,
    isBestseller: true,
    ...(searchParams.inStock === "true" ? { stock: { gt: 0 } } : {}),
    ...(searchParams.author ? { author: searchParams.author } : {}),
    ...(searchParams.minPrice || searchParams.maxPrice ? {
      priceEgp: {
        ...(searchParams.minPrice ? { gte: Number(searchParams.minPrice) } : {}),
        ...(searchParams.maxPrice ? { lte: Number(searchParams.maxPrice) } : {}),
      },
    } : {}),
  };

  const [books, total] = await Promise.all([
    prisma.book.findMany({ where, orderBy, skip, take: limit, select: BOOK_SUMMARY_SELECT }),
    prisma.book.count({ where }),
  ]);

  return (
    <CategoryPageClient
      category={{ id: "bestsellers", slug: "bestsellers", name: "Bestsellers", nameAr: "الأكثر مبيعًا", imageUrl: null, sortOrder: 0, children: [], parent: null }}
      books={books.map((b) => ({
        id: b.id, slug: b.slug, title: b.title, titleAr: b.titleAr ?? null, author: b.author,
        authorSlug: b.authorRef?.slug ?? null,
        authors: b.authors.map((ba) => ({ name: ba.author.name, nameAr: ba.author.nameAr, slug: ba.author.slug })),
        coverUrl: b.coverUrl, priceEgp: Number(b.priceEgp), compareAtEgp: b.compareAtEgp ? Number(b.compareAtEgp) : null,
        isBestseller: b.isBestseller, isNewRelease: b.isNewRelease,
        isFeatured: b.isFeatured, salesCount: b.salesCount, stock: b.stock,
      }))}
      total={total}
      page={page}
      limit={limit}
      searchParams={searchParams}
    />
  );
}
