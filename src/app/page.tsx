import { prisma } from "@/lib/prisma";
import { BookCarousel } from "@/components/storefront/BookCarousel";
import { Top10Carousel } from "@/components/storefront/Top10Carousel";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { HeroBanner } from "@/components/storefront/HeroBanner";
import { CampaignBanner } from "@/components/storefront/CampaignBanner";
import { BundleRow } from "@/components/storefront/BundleRow";
import { BookOfMonth } from "@/components/storefront/BookOfMonth";
import { AdoptSection } from "@/components/storefront/AdoptSection";
import { Reveal } from "@/components/ui/Reveal";
import { NewsletterStrip } from "@/components/storefront/NewsletterStrip";
import type { BookSummary, CategorySummary, BundleSummary } from "@/types";
import { BOOK_SUMMARY_SELECT } from "@/lib/bookSummarySelect";
import { FeaturedAuthors } from "@/components/storefront/FeaturedAuthors";

function toNum(v: unknown): number | null {
  if (v == null) return null;
  return Number(v);
}

async function getCampaign() {
  const keys = [
    "campaign_image_url", "campaign_image_mobile_url", "campaign_cta_href",
    "campaign_image_url_ar", "campaign_image_mobile_url_ar", "campaign_cta_href_ar",
  ];
  const settings = await prisma.storeSetting.findMany({ where: { key: { in: keys } } });
  const m: Record<string, string> = {};
  settings.forEach((s) => { m[s.key] = s.value; });
  // Pick this locale's assets, falling back to the other language when empty.
  const desktop = (m["campaign_image_url_ar"] || m["campaign_image_url"]);
  const mobile = (m["campaign_image_mobile_url_ar"] || m["campaign_image_mobile_url"]);
  const href = (m["campaign_cta_href_ar"] || m["campaign_cta_href"]);
  return {
    imageUrl: desktop || "",
    imageMobileUrl: mobile || "",
    href: href || "/bestsellers",
  };
}

async function getNewsletterContent() {
  const keys = ["newsletter_heading", "newsletter_heading_ar", "newsletter_subtext", "newsletter_subtext_ar"];
  const settings = await prisma.storeSetting.findMany({ where: { key: { in: keys } } });
  const m: Record<string, string> = {};
  settings.forEach((s) => { m[s.key] = s.value; });
  return {
    heading: m["newsletter_heading"] || undefined,
    headingAr: m["newsletter_heading_ar"] || undefined,
    subtext: m["newsletter_subtext"] || undefined,
    subtextAr: m["newsletter_subtext_ar"] || undefined,
  };
}

async function getHomeData() {
  const [banners, bestsellers, newReleases, staffPickList, categories, bundles, botmList, adoptList, featuredAuthors] =
    await Promise.all([
      prisma.banner.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 5,
        select: {
          id: true, title: true,
          imageUrl: true, imageMobileUrl: true, linkUrl: true,
          imageUrlAr: true, imageMobileUrlAr: true, linkUrlAr: true,
        },
      }),
      prisma.book.findMany({
        where: { type: "BOOK", isActive: true, isBestseller: true },
        orderBy: { salesCount: "desc" },
        take: 25,
        select: BOOK_SUMMARY_SELECT,
      }),
      prisma.book.findMany({
        where: { type: "BOOK", isActive: true, isNewRelease: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: BOOK_SUMMARY_SELECT,
      }),
      prisma.featuredList.findFirst({
        where: { slug: "staff-picks", isActive: true },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            select: { book: { select: BOOK_SUMMARY_SELECT } },
            take: 10,
          },
        },
      }),
      prisma.category.findMany({
        where: { isActive: true, parentId: null },
        // Top 6 by number of assigned books; ties (and the all-zero early state)
        // fall back to the manual sort order.
        orderBy: [{ books: { _count: "desc" } }, { sortOrder: "asc" }],
        take: 6,
        include: { _count: { select: { books: true } } },
      }),
      prisma.bundle.findMany({
        where: { isActive: true },
        take: 3,
        include: {
          _count: { select: { items: true } },
          items: { take: 4, include: { book: { select: { coverUrl: true, title: true } } } },
        },
      }),
      // Book of the Month — the first item of the curated "book-of-the-month"
      // featured list (section hides entirely when unset, like Bundles).
      prisma.featuredList.findFirst({
        where: { slug: "book-of-the-month", isActive: true },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: {
              book: {
                select: {
                  slug: true, title: true, titleAr: true, author: true, coverUrl: true,
                  synopsis: true, synopsisAr: true,
                },
              },
            },
          },
        },
      }),
      // Adopt a Book — second-hand / slightly damaged copies (type ADOPT).
      // Section hides entirely when there are none.
      prisma.book.findMany({
        where: { type: "ADOPT", isActive: true, stock: { gt: 0 } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: BOOK_SUMMARY_SELECT,
      }),
      // Featured authors for the homepage "أعمال <author>" banner row. Explicit
      // select, and photoUrl is required — a banner with no portrait is just a
      // coloured rectangle.
      prisma.author.findMany({
        where: { isFeatured: true, photoUrl: { not: null } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 6,
        select: { slug: true, name: true, nameAr: true, photoUrl: true, featuredColor: true },
      }),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toBookSummary = (b: any): BookSummary => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    titleAr: b.titleAr ?? null,
    author: b.author,
    authorSlug: b.authorRef?.slug ?? null,
    authors: b.authors.map((ba: { author: { name: string; nameAr: string | null; slug: string } }) => ({ name: ba.author.name, nameAr: ba.author.nameAr, slug: ba.author.slug })),
    coverUrl: b.coverUrl,
    priceEgp: Number(b.priceEgp),
    compareAtEgp: toNum(b.compareAtEgp),
    isBestseller: b.isBestseller,
    isNewRelease: b.isNewRelease,
    isFeatured: b.isFeatured,
    salesCount: b.salesCount,
    stock: b.stock,
  });

  const botmBook = botmList?.items[0]?.book ?? null;
  const bookOfMonth = botmBook
    ? {
        slug: botmBook.slug,
        title: botmBook.title,
        titleAr: botmBook.titleAr ?? null,
        author: botmBook.author,
        coverUrl: botmBook.coverUrl,
        synopsis: botmBook.synopsis ?? null,
        synopsisAr: botmBook.synopsisAr ?? null,
      }
    : null;

  return {
    featuredAuthors: featuredAuthors.map((a) => ({
      slug: a.slug,
      name: a.nameAr || a.name,
      photoUrl: a.photoUrl as string,
      featuredColor: a.featuredColor,
    })),
    banners,
    bookOfMonth,
    bestsellers: bestsellers.map(toBookSummary),
    newReleases: newReleases.map(toBookSummary),
    staffPicks: staffPickList?.items.map((i) => toBookSummary(i.book)) ?? [],
    adopt: adoptList.map(toBookSummary),
    categories: categories.map(
      (c): CategorySummary => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        nameAr: c.nameAr,
        imageUrl: c.imageUrl,
        sortOrder: c.sortOrder,
        bookCount: c._count.books,
      })
    ),
    bundles: bundles.map(
      (b): BundleSummary => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        nameAr: b.nameAr,
        coverUrl: b.coverUrl,
        priceEgp: Number(b.priceEgp),
        compareEgp: toNum(b.compareEgp),
        stock: b.stock,
        itemCount: b._count.items,
        covers: b.items.map((i) => ({ coverUrl: i.book.coverUrl, title: i.book.title })),
      })
    ),
  };
}

export default async function HomePage() {
  const [{ banners, bookOfMonth, bestsellers, newReleases, staffPicks, adopt, categories, bundles, featuredAuthors }, campaign, newsletter] =
    await Promise.all([getHomeData(), getCampaign(), getNewsletterContent()]);

  return (
    <>
      {/* Hero */}
      <HeroBanner banners={banners} />

      {/* Bestsellers — Netflix-style Top 10 ranked list */}
      <Reveal><Top10Carousel books={bestsellers} /></Reveal>

      {/* New Releases */}
      {newReleases.length > 0 && (
        <Reveal>
          <BookCarousel
            title="إصدارات جديدة"
            books={newReleases}
            viewAllHref="/new-releases"
          />
        </Reveal>
      )}

      {/* Campaign banner — image managed from Admin › Content */}
      <Reveal>
        <CampaignBanner
          imageUrl={campaign.imageUrl || undefined}
          imageMobileUrl={campaign.imageMobileUrl || undefined}
          href={campaign.href}
        />
      </Reveal>

      {/* Staff Picks */}
      {staffPicks.length > 0 && (
        <Reveal>
          <BookCarousel
            title="اختيارات الفريق"
            books={staffPicks}
          />
        </Reveal>
      )}

      {/* Adopt a Book — second-hand / slightly damaged copies; hidden when empty */}
      <Reveal><FeaturedAuthors authors={featuredAuthors} /></Reveal>

      {adopt.length > 0 && <Reveal><AdoptSection books={adopt} /></Reveal>}

      {/* Book of the Month — hidden entirely when no pick is set */}
      {bookOfMonth && <Reveal><BookOfMonth book={bookOfMonth} /></Reveal>}

      {/* Browse Categories — tiles cascade in (internal stagger) */}
      <CategoryGrid categories={categories} title="تصفّح حسب التصنيف" />

      {/* Featured Bundles */}
      {bundles.length > 0 && <Reveal><BundleRow bundles={bundles} /></Reveal>}

      {/* Newsletter */}
      <Reveal><NewsletterStrip content={newsletter} /></Reveal>
    </>
  );
}
