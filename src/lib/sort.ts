export type SortKey = "bestselling" | "newest" | "price-asc" | "price-desc";

/**
 * Resolve a book listing's `sort` query param into a Prisma orderBy.
 *
 * - "newest" orders by publishDate (the book's actual release date), with
 *   createdAt as a tiebreaker for books sharing the same date. Previously
 *   every listing page ordered by createdAt alone, which is when the record
 *   was imported/added — not when the book was released — so bulk-imported
 *   catalogs (hundreds of books added in one batch) didn't sort by release
 *   date at all.
 * - "price-asc"/"price-desc" orders by priceEgp — the store's only currency.
 */
export function resolveSortOrderBy(sort: string | undefined) {
  const priceField = "priceEgp";
  switch (sort) {
    case "newest":
      return [{ publishDate: "desc" as const }, { createdAt: "desc" as const }];
    case "price-asc":
      return [{ [priceField]: "asc" as const }];
    case "price-desc":
      return [{ [priceField]: "desc" as const }];
    case "bestselling":
    default:
      return [{ salesCount: "desc" as const }];
  }
}
