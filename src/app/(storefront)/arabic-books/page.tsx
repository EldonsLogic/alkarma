import { prisma } from "@/lib/prisma";
import { BOOK_SUMMARY_SELECT } from "@/lib/bookSummarySelect";
import { CategoryPageClient } from "../category/[slug]/CategoryPageClient";
import { resolveSortOrderBy } from "@/lib/sort";

interface Props {
  searchParams: { page?: string; sort?: string; ageRange?: string };
}

import { canonical } from "@/lib/seo";

export const metadata = { title: "Arabic Books", ...canonical("/arabic-books") };

export default async function ArabicBooksPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 24;
  const skip = (page - 1) * limit;

  const sort = searchParams.sort ?? "bestselling";
  const orderBy = resolveSortOrderBy(sort);

  const where = {
    isActive: true,
    type: "BOOK",
    language: "ar",
    ...(searchParams.ageRange ? { ageRange: searchParams.ageRange } : {}),
  };

  const [books, total] = await Promise.all([
    prisma.book.findMany({ where, orderBy, skip, take: limit, select: BOOK_SUMMARY_SELECT }),
    prisma.book.count({ where }),
  ]);

  return (
    <CategoryPageClient
      category={{ id: "arabic-books", slug: "arabic-books", name: "Arabic Books", nameAr: "كتب عربية", imageUrl: null, sortOrder: 0, children: [], parent: null }}
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
