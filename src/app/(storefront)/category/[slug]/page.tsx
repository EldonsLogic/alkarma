import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BOOK_SUMMARY_SELECT } from "@/lib/bookSummarySelect";
import { CategoryPageClient } from "./CategoryPageClient";
import { decodeSlug } from "@/lib/slug";
import { canonical } from "@/lib/seo";
import { resolveSortOrderBy } from "@/lib/sort";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
  searchParams: {
    page?: string;
    sort?: string;
    minPrice?: string;
    maxPrice?: string;
    author?: string;
    ageRange?: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await prisma.category.findUnique({ where: { slug: decodeSlug(params.slug) } });
  if (!category) return {};
  return {
    title: category.name,
    description: `Browse ${category.name} books at دار الكرمة`,
    ...canonical(`/category/${encodeURIComponent(category.slug)}`),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const category = await prisma.category.findUnique({
    where: { slug: decodeSlug(params.slug), isActive: true },
    include: {
      parent: { include: { children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } } },
      children: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  if (!category) notFound();

  // The chip row always shows the whole branch: the top parent + its children
  // (siblings), with the current category highlighted — so navigating between
  // subcategories never hides the others.
  const groupParent = category.parent ?? category;
  const groupSiblings = category.parent ? category.parent.children : category.children;

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 24;
  const skip = (page - 1) * limit;

  // Collect all category IDs (this category + children)
  const catIds = [category.id, ...category.children.map((c) => c.id)];

  const sort = searchParams.sort ?? "bestselling";
  const orderBy = resolveSortOrderBy(sort);

  const where = {
    isActive: true,
    stock: { gt: 0 },
    categories: { some: { categoryId: { in: catIds } } },
    ...(searchParams.ageRange ? { ageRange: searchParams.ageRange } : {}),
  };

  const [books, total, allCategories] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: BOOK_SUMMARY_SELECT,
    }),
    prisma.book.count({ where }),
    // Sidebar category list with in-stock counts, as the store shows it.
    // Explicit select + a _count aggregate rather than loading book rows.
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: {
        slug: true,
        name: true,
        _count: {
          select: { books: { where: { book: { isActive: true, stock: { gt: 0 } } } } },
        },
      },
    }),
  ]);

  return (
    <CategoryPageClient
      category={{
        id: category.id,
        slug: category.slug,
        name: category.name,
        nameAr: category.nameAr,
        imageUrl: category.imageUrl,
        sortOrder: category.sortOrder,
        children: category.children.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          nameAr: c.nameAr,
          imageUrl: c.imageUrl,
          sortOrder: c.sortOrder,
        })),
        parent: category.parent
          ? { id: category.parent.id, slug: category.parent.slug, name: category.parent.name, nameAr: category.parent.nameAr }
          : null,
      }}
      nav={{
        activeSlug: category.slug,
        group: { slug: groupParent.slug, name: groupParent.name, nameAr: groupParent.nameAr },
        siblings: groupSiblings.map((c) => ({ slug: c.slug, name: c.name, nameAr: c.nameAr })),
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
      allCategories={allCategories.map((c) => ({
        slug: c.slug,
        name: c.name,
        count: c._count.books,
      }))}
      total={total}
      page={page}
      limit={limit}
      searchParams={searchParams}
    />
  );
}
