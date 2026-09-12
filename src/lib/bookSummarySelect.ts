// Shared Prisma `select` for book-summary/card views (listing pages, homepage
// rails, PDP related/more-by-author rows). Deliberately excludes synopsis,
// subtitle, publisher, translator, editor, publishDate, pageCount, etc. —
// fields no summary card renders — since a bare findMany()/include() with no
// select was pulling every column for every row on every page view.
// translator and editor ARE here: the card byline links every contributor.
export const BOOK_SUMMARY_SELECT = {
  id: true, slug: true, title: true, titleAr: true, author: true, translator: true, editor: true,
  coverUrl: true, priceEgp: true, compareAtEgp: true, isBestseller: true, isNewRelease: true, isFeatured: true, salesCount: true, stock: true,
  authorRef: { select: { slug: true } },
  authors: { orderBy: { position: "asc" as const }, select: { author: { select: { name: true, nameAr: true, slug: true } } } },
} as const;

import type { Prisma } from "@prisma/client";
import type { BookSummary } from "@/types";

type SummaryRow = Prisma.BookGetPayload<{ select: typeof BOOK_SUMMARY_SELECT }>;

/**
 * Turns a row selected with BOOK_SUMMARY_SELECT into the BookSummary a card
 * expects. The relation comes back nested ({ author: { name, slug } }) and the
 * card wants it flat ({ name, slug }); handing a raw row to a card silently
 * loses every author link, which is how آخر المشاهدات ended up with an
 * unlinked byline while every other rail had links.
 */
export function toBookSummary(b: SummaryRow): BookSummary {
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    titleAr: b.titleAr ?? null,
    author: b.author,
    authorSlug: b.authorRef?.slug ?? null,
    translator: b.translator ?? null,
    editor: b.editor ?? null,
    authors: b.authors.map((ba) => ({ name: ba.author.name, nameAr: ba.author.nameAr, slug: ba.author.slug })),
    coverUrl: b.coverUrl,
    priceEgp: Number(b.priceEgp),
    compareAtEgp: b.compareAtEgp == null ? null : Number(b.compareAtEgp),
    isBestseller: b.isBestseller,
    isNewRelease: b.isNewRelease,
    isFeatured: b.isFeatured,
    salesCount: b.salesCount,
    stock: b.stock,
  };
}
