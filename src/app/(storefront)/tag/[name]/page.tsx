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

const STRINGS = { label: "وسم", books: (n: number) => `${n} كتاب متاح` } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeSlug(params.name);
  return { title: name, description: `Browse all books tagged "${name}".`, ...canonical(`/tag/${encodeURIComponent(name)}`) };
}

export default async function TagPage({ params, searchParams }: Props) {
  const t = STRINGS;
  const name = decodeSlug(params.name);

  const tag = await prisma.tag.findUnique({ where: { name } });
  if (!tag) notFound();

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 24;
  const skip = (page - 1) * limit;

  const sort = searchParams.sort ?? "bestselling";
  const orderBy = resolveSortOrderBy(sort);

  const where = { isActive: true, tags: { some: { tagId: tag.id } } };

  const [books, total, allCategories] = await Promise.all([
    prisma.book.findMany({
      where, orderBy, skip, take: limit,
      select: BOOK_SUMMARY_SELECT,
    }),
    prisma.book.count({ where }),
    getSidebarCategories(),
  ]);

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
          id: tag.id,
          slug: name,
          name: `Tagged "${name}"`,
          nameAr: `موسوم بـ "${name}"`,
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
