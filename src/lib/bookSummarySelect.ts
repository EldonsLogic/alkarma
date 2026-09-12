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
