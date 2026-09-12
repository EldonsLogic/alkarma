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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeSlug(params.name);
  return { title: name, description: `Browse all books edited by ${name}.`, ...canonical(`/editor/${encodeURIComponent(name)}`) };
}

export default async function EditorPage({ params, searchParams }: Props) {
  const name = decodeSlug(params.name);

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 24;
  const skip = (page - 1) * limit;

  const sort = searchParams.sort ?? "bestselling";
  const orderBy = resolveSortOrderBy(sort);

  // Substring match: the field is a display string that may hold several
  // names joined with "، ", and the card byline links each of them separately.
  const where = { isActive: true, editor: { contains: name } };

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
          <h1 className="text-[28px] sm:text-[34px] font-bold">{name}</h1>
        </div>
      </div>

      <CategoryPageClient
        category={{
          id: `editor-${name}`,
          slug: name,
          name: `Books edited by ${name}`,
          nameAr: `تحرير ${name}`,
          imageUrl: null,
          sortOrder: 0,
          children: [],
          parent: null,
        }}
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
        total={total}
        page={page}
        limit={limit}
        searchParams={searchParams}
      />
    </div>
  );
}
