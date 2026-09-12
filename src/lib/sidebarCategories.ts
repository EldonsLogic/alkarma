import { prisma } from "@/lib/prisma";

export interface SidebarCategory {
  slug: string;
  name: string;
  count: number;
}

/**
 * The "التصنيفات" list in the listing sidebar — the standard filter on every
 * shelf. It was only ever built for /category/[slug]; the other pages that
 * reuse the same listing component (new releases, bestsellers, search, author,
 * translator, publisher, tag) rendered no sidebar at all, so their only filter
 * was the age filter, which belongs to children's shelves alone.
 *
 * Kept to the topical BOOK shelves: publishers have their own column in the
 * mega-menu, and stationery its own nav link. Shelves with nothing in stock are
 * dropped — three of them exist only as nav targets — except the shelf being
 * viewed, so the list can still mark it active.
 */
export async function getSidebarCategories(currentSlug?: string): Promise<SidebarCategory[]> {
  const cats = await prisma.category.findMany({
    where: { isActive: true, kind: "BOOK" },
    orderBy: { sortOrder: "asc" },
    select: {
      slug: true,
      name: true,
      _count: {
        select: { books: { where: { book: { isActive: true, stock: { gt: 0 } } } } },
      },
    },
  });

  return cats
    .filter((c) => c._count.books > 0 || c.slug === currentSlug)
    .map((c) => ({ slug: c.slug, name: c.name, count: c._count.books }));
}
