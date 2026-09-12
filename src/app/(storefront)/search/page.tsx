import { prisma } from "@/lib/prisma";
import { getSidebarCategories } from "@/lib/sidebarCategories";
import { BOOK_SUMMARY_SELECT } from "@/lib/bookSummarySelect";
import { CategoryPageClient } from "../category/[slug]/CategoryPageClient";
import { searchProductIds } from "@/lib/search";
import { resolveSortOrderBy } from "@/lib/sort";
import Link from "next/link";
import type { Metadata } from "next";

// Query-dependent results page — noindex to avoid thin/duplicate-content
// indexing across the infinite space of possible ?q= values.
export const metadata: Metadata = { title: "نتائج البحث", robots: { index: false, follow: true } };

const SEARCH_STRINGS = {
    title: "بحث",
    hint: "استخدم شريط البحث أعلاه للعثور على كتب أو مؤلفين أو مواضيع.",
    results: (total: number, q: string) => <><strong className="text-ink">{total}</strong> نتيجة لـ &ldquo;<strong className="text-brand">{q}</strong>&rdquo;</>,
    categoryName: (q: string) => `بحث: "${q}"`,
  } as const;

interface Props {
  searchParams: { q?: string; page?: string; sort?: string };
}

export default async function SearchPage({ searchParams }: Props) {
  const t = SEARCH_STRINGS;
  const q = searchParams.q?.trim();
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 24;
  const skip = (page - 1) * limit;

  if (!q) {
    return (
      <div className="max-w-[600px] mx-auto px-4 sm:px-10 py-16 sm:py-24 text-center">
        <h1 className="text-[24px] font-display font-bold mb-3">{t.title}</h1>
        <p className="text-[14px] text-ink-muted">{t.hint}</p>
      </div>
    );
  }

  // Arabic-tolerant matching (ignores diacritics/letter variants, case-insensitive)
  const matchedIds = await searchProductIds(q);

  const where = {
    isActive: true,
    type: { not: "ADOPT" }, // adopt-a-book items only appear in their homepage section
    OR: [
      { id: { in: matchedIds } },
      { synopsis: { contains: q } },
    ],
  };

  const sort = searchParams.sort ?? "bestselling";
  const orderBy = resolveSortOrderBy(sort);

  const [books, total, allCategories] = await Promise.all([
    prisma.book.findMany({ where, orderBy, skip, take: limit, select: BOOK_SUMMARY_SELECT }),
    prisma.book.count({ where }),
    getSidebarCategories(),
  ]);

  // Record the search for admin Search Analytics (first page only; fire-and-forget)
  if (q.length >= 2 && page === 1) {
    prisma.searchLog.create({ data: { query: q.toLowerCase(), resultsCount: total } }).catch(() => {});
  }

  return (
    <div>
      <div className="px-4 sm:px-10 py-4 sm:py-5 bg-paper-mid border-b border-paper-dark">
        <p className="text-[14px] text-ink-muted">{t.results(total, q)}</p>
      </div>
      <CategoryPageClient
        category={{ id: "search", slug: "search", name: t.categoryName(q), nameAr: t.categoryName(q), imageUrl: null, sortOrder: 0, children: [], parent: null }}
        books={books.map((b) => ({
          id: b.id, slug: b.slug, title: b.title, titleAr: b.titleAr ?? null, author: b.author,
          authorSlug: b.authorRef?.slug ?? null,
          translator: b.translator ?? null, editor: b.editor ?? null,
          authors: b.authors.map((ba) => ({ name: ba.author.name, nameAr: ba.author.nameAr, slug: ba.author.slug })),
          coverUrl: b.coverUrl,
          priceEgp: Number(b.priceEgp), compareAtEgp: b.compareAtEgp ? Number(b.compareAtEgp) : null,
          isBestseller: b.isBestseller, isNewRelease: b.isNewRelease, isFeatured: b.isFeatured,
          salesCount: b.salesCount, stock: b.stock,
        }))}
        allCategories={allCategories}
      total={total} page={page} limit={limit}
        searchParams={searchParams}
      />
    </div>
  );
}
