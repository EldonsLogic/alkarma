import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PDPClient } from "./PDPClient";
import { getExternalReviews } from "@/lib/externalReviews";
import { decodeSlug } from "@/lib/slug";
import { BOOK_SUMMARY_SELECT } from "@/lib/bookSummarySelect";
import { canonical } from "@/lib/seo";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const book = await prisma.book.findUnique({
    where: { slug: decodeSlug(params.slug) },
    select: { slug: true, title: true, synopsis: true, coverUrl: true },
  });
  if (!book) return {};
  return {
    title: book.title,
    description: book.synopsis.slice(0, 160),
    openGraph: { images: [book.coverUrl], title: book.title, description: book.synopsis.slice(0, 160), type: "website" },
    ...canonical(`/book/${encodeURIComponent(book.slug)}`),
  };
}

export default async function BookPage({ params }: Props) {
  const book = await prisma.book.findUnique({
    where: { slug: decodeSlug(params.slug), isActive: true },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      authorRef: true,
      authors: {
        orderBy: { position: "asc" },
        include: { author: { select: { name: true, nameAr: true, slug: true } } },
      },
      images: { orderBy: { position: "asc" } },
      reviews: {
        where: { isApproved: true },
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!book) notFound();

  // Related: same first category, exclude this book
  const firstCatId = book.categories[0]?.categoryId;
  const related = firstCatId
    ? await prisma.book.findMany({
        where: {
          isActive: true,
          id: { not: book.id },
          categories: { some: { categoryId: firstCatId } },
        },
        take: 8,
        orderBy: { salesCount: "desc" },
        select: BOOK_SUMMARY_SELECT,
      })
    : [];

  // More by author
  const moreByAuthor = book.authorId
    ? await prisma.book.findMany({
        where: { isActive: true, authorId: book.authorId, id: { not: book.id } },
        take: 6,
        orderBy: { salesCount: "desc" },
        select: BOOK_SUMMARY_SELECT,
      })
    : [];

  // Bundles that include this book — shown as an upsell on the PDP (only when
  // the book actually belongs to one or more active bundles).
  const bundleRows = await prisma.bundle.findMany({
    where: { isActive: true, items: { some: { bookId: book.id } } },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: {
      _count: { select: { items: true } },
      items: { take: 4, include: { book: { select: { coverUrl: true, title: true } } } },
    },
  });
  const bundleUpsells = bundleRows.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    nameAr: b.nameAr,
    priceEgp: Number(b.priceEgp),
    compareEgp: b.compareEgp != null ? Number(b.compareEgp) : null,
    itemCount: b._count.items,
    covers: b.items.map((i) => ({ coverUrl: i.book.coverUrl, title: i.book.title })),
  }));

  const avgRating =
    book.reviews.length > 0
      ? book.reviews.reduce((s, r) => s + r.rating, 0) / book.reviews.length
      : 0;

  // External ratings + editorial reviews — read from DB (refreshed weekly by cron)
  const externalReviews = await getExternalReviews(
    book.id,
    book.isbn,
    book.title,
    book.author
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Book", "Product"],
    name: book.title,
    image: book.coverUrl,
    description: book.synopsis.slice(0, 500),
    sku: book.id,
    ...(book.isbn ? { isbn: book.isbn } : {}),
    ...(book.publisher ? { publisher: { "@type": "Organization", name: book.publisher } } : {}),
    author: book.authors.length > 0
      ? book.authors.map((ba) => ({ "@type": "Person", name: ba.author.name }))
      : book.author
        ? [{ "@type": "Person", name: book.author }]
        : undefined,
    offers: {
      "@type": "Offer",
      url: `https://alkarmabooks.com/book/${encodeURIComponent(book.slug)}`,
      priceCurrency: "EGP",
      price: Number(book.priceEgp).toFixed(2),
      availability: book.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(book.reviews.length > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: book.reviews.length,
          },
        }
      : {}),
  };

  const firstCategory = book.categories[0]?.category;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: "https://alkarmabooks.com" },
      ...(firstCategory
        ? [{ "@type": "ListItem", position: 2, name: firstCategory.name, item: `https://alkarmabooks.com/category/${encodeURIComponent(firstCategory.slug)}` }]
        : []),
      {
        "@type": "ListItem",
        position: firstCategory ? 3 : 2,
        name: book.title,
        item: `https://alkarmabooks.com/book/${encodeURIComponent(book.slug)}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <PDPClient
      bundleUpsells={bundleUpsells}
      book={{
        id: book.id,
        slug: book.slug,
        title: book.title,
        titleAr: book.titleAr,
        subtitle: book.subtitle,
        synopsis: book.synopsis,
        synopsisAr: book.synopsisAr,
        isbn: book.isbn,
        author: book.author,
        authorId: book.authorId,
        authorSlug: book.authorRef?.slug ?? null,
        authors: book.authors.map((ba) => ({
          name: ba.author.name,
          nameAr: ba.author.nameAr,
          slug: ba.author.slug,
        })),
        translator: book.translator,
        editor: book.editor,
        publisher: book.publisher,
        publishDate: book.publishDate?.toISOString() ?? null,
        pageCount: book.pageCount,
        dimensions: book.dimensions,
        coverType: book.coverType,
        language: book.language,
        coverUrl: book.coverUrl,
        images: book.images.map((img) => img.url),
        priceEgp: Number(book.priceEgp),
        compareAtEgp: book.compareAtEgp ? Number(book.compareAtEgp) : null,
        stock: book.stock,
        isBestseller: book.isBestseller,
        isNewRelease: book.isNewRelease,
        isFeatured: book.isFeatured,
        salesCount: book.salesCount,
        categories: book.categories.map((bc) => ({
          id: bc.category.id,
          slug: bc.category.slug,
          name: bc.category.name,
          nameAr: bc.category.nameAr,
          imageUrl: bc.category.imageUrl,
          sortOrder: bc.category.sortOrder,
        })),
        tags: book.tags.map((bt) => bt.tag.name),
        reviews: book.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          createdAt: r.createdAt.toISOString(),
          user: { firstName: r.user.firstName, lastName: r.user.lastName },
        })),
        averageRating: avgRating,
        reviewCount: book.reviews.length,
      }}
      externalReviews={externalReviews}
      related={related.map((b) => ({
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
      moreByAuthor={moreByAuthor.map((b) => ({
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
      />
    </>
  );
}
