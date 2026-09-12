import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSidebarCategories } from "@/lib/sidebarCategories";
import { BOOK_SUMMARY_SELECT } from "@/lib/bookSummarySelect";
import { decodeSlug } from "@/lib/slug";
import { canonical } from "@/lib/seo";
import { resolveSortOrderBy } from "@/lib/sort";
import { CategoryPageClient } from "../../category/[slug]/CategoryPageClient";
import type { Metadata } from "next";

interface Props {
  params: { name: string };
  searchParams: { page?: string; sort?: string };
}

const STRINGS = { label: "الناشر", books: (n: number) => `${n} كتاب متاح` } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeSlug(params.name);
  return { title: name, description: `Browse all books published by ${name}.`, ...canonical(`/publisher/${encodeURIComponent(name)}`) };
}

export default async function PublisherPage({ params, searchParams }: Props) {
  const t = STRINGS;
  const name = decodeSlug(params.name);

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 24;
  const skip = (page - 1) * limit;

  const sort = searchParams.sort ?? "bestselling";
  const orderBy = resolveSortOrderBy(sort);

  // Books carry the publisher as free text, and for two imprints the store's
  // own category name is longer than that text ("دار جامعة حمد بن خليفة للنشر"
  // vs "جامعة حمد بن خليفة"), so the mega-menu's imprint links 404ed on an
  // exact match. The PUBLISHER category is the authority when one exists;
  // the raw string is the fallback for publishers that have no category row.
  const publisherCategory = await prisma.category.findFirst({
    where: { kind: "PUBLISHER", name },
    select: { id: true },
  });

  const where = publisherCategory
    ? { isActive: true, categories: { some: { categoryId: publisherCategory.id } } }
    : { isActive: true, publisher: name };

  const [books, total, allCategories] = await Promise.all([
    prisma.book.findMany({
      where, orderBy, skip, take: limit,
      select: BOOK_SUMMARY_SELECT,
    }),
    prisma.book.count({ where }),
    getSidebarCategories(),
  ]);

  if (total === 0 && page === 1) notFound();

  return (
    <div>
      <div className="bg-ink text-paper">
        <div className="max-w-[900px] mx-auto px-4 sm:px-10 py-10">
          <p className="text-[12px] text-brand font-bold uppercase tracking-widest mb-1">{t.label}</p>
          <h1 className="text-[28px] sm:text-[34px] font-bold mb-2">{name}</h1>
          <p className="text-[12px] text-ink-muted mt-3">{t.books(total)}</p>
        </div>
      </div>

      <CategoryPageClient
        category={{
          id: `publisher-${name}`,
          slug: name,
          name: `Books by ${name}`,
          nameAr: `كتب ${name}`,
          imageUrl: null,
          sortOrder: 0,
          children: [],
          parent: null,
        }}
        books={books.map((b) => ({
          id: b.id, slug: b.slug, title: b.title, titleAr: b.titleAr ?? null, author: b.author,
          authorSlug: b.authorRef?.slug ?? null,
          authors: b.authors.map((ba) => ({ name: ba.author.name, nameAr: ba.author.nameAr, slug: ba.author.slug })),
          coverUrl: b.coverUrl,
          priceEgp: Number(b.priceEgp), compareAtEgp: b.compareAtEgp ? Number(b.compareAtEgp) : null,
          isBestseller: b.isBestseller, isNewRelease: b.isNewRelease, isFeatured: b.isFeatured,
          salesCount: b.salesCount, stock: b.stock,
        }))}
        allCategories={allCategories}
      total={total}
        page={page}
        limit={limit}
        searchParams={searchParams}
      />
    </div>
  );
}
