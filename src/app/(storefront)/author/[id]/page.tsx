import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BOOK_SUMMARY_SELECT } from "@/lib/bookSummarySelect";
import { decodeSlug } from "@/lib/slug";
import { canonical } from "@/lib/seo";
import { resolveSortOrderBy } from "@/lib/sort";
import { CategoryPageClient } from "../../category/[slug]/CategoryPageClient";
import type { Metadata } from "next";

interface Props {
  params: { id: string };
  searchParams: { page?: string; sort?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const author = await prisma.author.findUnique({ where: { slug: decodeSlug(params.id) } });
  if (!author) return {};
  return {
    title: author.name,
    description: author.bio?.slice(0, 160) ?? `Browse all books by ${author.name}.`,
    ...canonical(`/author/${encodeURIComponent(author.slug)}`),
  };
}

export default async function AuthorPage({ params, searchParams }: Props) {
  const [author] = await Promise.all([
    prisma.author.findUnique({ where: { slug: decodeSlug(params.id) } }),
  ]);
  if (!author) notFound();
  const displayName = author.name;
  const displayBio = author.bioAr ? author.bioAr : author.bio;

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 24;
  const skip = (page - 1) * limit;

  const sort = searchParams.sort ?? "bestselling";
  const orderBy = resolveSortOrderBy(sort);

  const where = { isActive: true, authors: { some: { authorId: author.id } } };

  const [books, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: BOOK_SUMMARY_SELECT,
    }),
    prisma.book.count({ where }),
  ]);

  return (
    <div>
      {/* Author header — name only (no avatar) */}
      <div className="bg-ink text-paper">
        <div className="max-w-[900px] mx-auto px-4 sm:px-10 py-10">
          <p className="text-[12px] text-brand font-bold uppercase tracking-widest mb-1">مؤلف</p>
          <h1 className="text-[28px] sm:text-[34px] font-bold mb-2">{displayName}</h1>
          {displayBio && (
            <p className="text-[14px] text-ink-muted leading-relaxed max-w-[600px]">{displayBio}</p>
          )}
          <p className="text-[12px] text-ink-muted mt-3">
            {`${total} كتاب متاح`}
          </p>
        </div>
      </div>

      {/* Books grid reusing CategoryPageClient */}
      <CategoryPageClient
        category={{
          id: author.id,
          slug: author.slug,
          name: `Books by ${author.name}`,
          nameAr: author.nameAr ? `كتب ${author.nameAr}` : null,
          imageUrl: author.photoUrl ?? null,
          sortOrder: 0,
          children: [],
          parent: null,
        }}
        books={books.map((b) => ({
          id: b.id,
          slug: b.slug,
          title: b.title,
          titleAr: b.titleAr ?? null,
          author: b.author,
          authorSlug: b.authorRef?.slug ?? null,
          authors: b.authors.map((ba) => ({ name: ba.author.name, nameAr: ba.author.nameAr, slug: ba.author.slug })),
          coverUrl: b.coverUrl,
          priceEgp: Number(b.priceEgp),
          compareAtEgp: b.compareAtEgp ? Number(b.compareAtEgp) : null,
          isBestseller: b.isBestseller,
          isNewRelease: b.isNewRelease,
          isFeatured: b.isFeatured,
          salesCount: b.salesCount,
          stock: b.stock,
        }))}
        total={total}
        page={page}
        limit={limit}
        searchParams={searchParams}
      />
    </div>
  );
}
