import { prisma } from "@/lib/prisma";
import { BookCarousel } from "@/components/storefront/BookCarousel";
import { BRAND_AR } from "@/lib/brand";
import { newReleaseWhere, NEW_RELEASE_ORDER_BY } from "@/lib/newReleases";
import { BannerStrip } from "@/components/storefront/BannerStrip";
import { HOME_BANNER_STRIPS } from "@/content/home-banners";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import { HeroBanner } from "@/components/storefront/HeroBanner";
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

/**
 * The live homepage runs four rails of exactly 15 books, laid out 3 x 5 rather
 * than as a scroller.
 */
const RAIL_SIZE = 15;

/**
 * Staff picks, featured authors, adopt-a-book, book of the month, the category
 * grid and bundles have no counterpart on the live homepage, so they are not
 * rendered here. The features themselves are untouched and still live at their
 * own routes — this only controls whether the homepage shows them.
 */
const SHOW_NON_LIVE_HOME_SECTIONS = false;

async function getHomeData() {
  const [banners, bestsellers, newReleases, imprintPicks, offers, staffPickList, categories, bundles, botmList, adoptList, featuredAuthors] =
    await Promise.all([
      prisma.banner.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        take: 5,
        select: {
          id: true, title: true,
          // subtitle carries the hero CTA's label — see HeroBanner
          subtitle: true, subtitleAr: true,
          imageUrl: true, imageMobileUrl: true, linkUrl: true,
          imageUrlAr: true, imageMobileUrlAr: true, linkUrlAr: true,
        },
      }),
      // Flagged bestsellers first, then topped up by sales rank. The seed
      // catalogue only flags 10 books and only 3 have any sales at all, so a
      // bare isBestseller filter renders a half-empty rail; live's equivalent
      // is category-driven and always shows a full 3 x 5.
      prisma.book.findMany({
        where: { type: "BOOK", isActive: true },
        orderBy: [{ isBestseller: "desc" }, { salesCount: "desc" }, { createdAt: "desc" }],
        take: RAIL_SIZE,
        select: BOOK_SUMMARY_SELECT,
      }),
      // Published this calendar year OR flagged by hand — see lib/newReleases.
      // Ordered by publication date, not createdAt: createdAt is the import
      // timestamp, so it would rank by whatever was written to the database
      // last rather than by what is actually new.
      prisma.book.findMany({
        where: { type: "BOOK", isActive: true, ...newReleaseWhere() },
        orderBy: NEW_RELEASE_ORDER_BY,
        take: RAIL_SIZE,
        select: BOOK_SUMMARY_SELECT,
      }),
      // "ترشيحات" on the live homepage is the دار الكرمة imprint's own books —
      // its "المزيد" points at /book-category/دار-الكرمة.
      prisma.book.findMany({
        where: { type: "BOOK", isActive: true, publisher: BRAND_AR },
        orderBy: { salesCount: "desc" },
        take: RAIL_SIZE,
        select: BOOK_SUMMARY_SELECT,
      }),
      // "عروض وخصومات" — anything actually marked down.
      prisma.book.findMany({
        where: { type: "BOOK", isActive: true, compareAtEgp: { not: null } },
        orderBy: { salesCount: "desc" },
        take: RAIL_SIZE,
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
    translator: b.translator ?? null, editor: b.editor ?? null,
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
    imprintPicks: imprintPicks.map(toBookSummary),
    offers: offers.map(toBookSummary),
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
  const [{ banners, bookOfMonth, bestsellers, newReleases, imprintPicks, offers, staffPicks, adopt, categories, bundles, featuredAuthors }, campaign, newsletter] =
    await Promise.all([getHomeData(), getCampaign(), getNewsletterContent()]);

  return (
    <>
      {/* Hero */}
      <HeroBanner banners={banners} />

      {/* ── The four rails, in the live site's own order ────────────────
          Live runs أحدث الإصدارات, then الأكثر مبيعًا, then ترشيحات, then
          عروض وخصومات — each 15 books laid out 3 x 5, with a three-image
          author-promo strip between them.

          Those promo strips are NOT reproduced here: they are marketing
          artwork hosted on the live site (03.-Eissa.jpg, Merna-home-midBanner
          .jpg, 01.-Omar.jpg) linking to author tag pages, and inventing
          stand-ins would be worse than leaving the slot empty. The existing
          CampaignBanner sits in the first of those slots instead, since it is
          the closest thing this store already has. */}

      {newReleases.length > 0 && (
        <Reveal>
          <BookCarousel
            title="أحدث الإصدارات"
            books={newReleases}
            viewAllHref="/new-releases"
            variant="grid"
          />
        </Reveal>
      )}

      <Reveal><BannerStrip banners={HOME_BANNER_STRIPS[0]} /></Reveal>

      {bestsellers.length > 0 && (
        <Reveal>
          <BookCarousel
            title="الأكثر مبيعًا"
            books={bestsellers}
            viewAllHref="/bestsellers"
            variant="grid"
          />
        </Reveal>
      )}

      <Reveal><BannerStrip banners={HOME_BANNER_STRIPS[1]} /></Reveal>

      {imprintPicks.length > 0 && (
        <Reveal>
          <BookCarousel
            title="ترشيحات"
            books={imprintPicks}
            viewAllHref={`/publisher/${encodeURIComponent(BRAND_AR)}`}
            variant="grid"
          />
        </Reveal>
      )}

      <Reveal><BannerStrip banners={HOME_BANNER_STRIPS[2]} /></Reveal>

      {/* Only one book in the seed catalogue carries a compareAt price, so this
          rail stays hidden until there are enough real markdowns to fill a row.
          Discounts are not invented to pad it. */}
      {offers.length >= 5 && (
        <Reveal>
          <BookCarousel
            title="عروض وخصومات"
            books={offers}
            viewAllHref="/bundles"
            variant="grid"
          />
        </Reveal>
      )}

      {/* Tied to the offers rail: that rail hides itself until there are enough
          real markdowns, and without this the third and fourth strips would
          render back to back with no books between them. */}
      {offers.length >= 5 && <Reveal><BannerStrip banners={HOME_BANNER_STRIPS[3]} /></Reveal>}

      {/* ── Sections the live homepage does not have ─────────────────────
          Switched off so this homepage matches the live site as-is. Nothing
          is deleted: every one of these is a working feature with its own
          route, its own admin screen and its own data, all still reachable —
          only the homepage rendering is gated. Flip the flag to bring them
          back. The queries that feed them still run in getHomeData(), so
          re-enabling is a one-line change with nothing else to rewire. */}
      {SHOW_NON_LIVE_HOME_SECTIONS && (
        <>
          {staffPicks.length > 0 && (
            <Reveal>
              <BookCarousel
                title="اختيارات الفريق"
                books={staffPicks}
              />
            </Reveal>
          )}

          <Reveal><FeaturedAuthors authors={featuredAuthors} /></Reveal>

          {/* Adopt a Book — second-hand / slightly damaged copies */}
          {adopt.length > 0 && <Reveal><AdoptSection books={adopt} /></Reveal>}

          {/* Book of the Month — hidden entirely when no pick is set */}
          {bookOfMonth && <Reveal><BookOfMonth book={bookOfMonth} /></Reveal>}

          {/* Browse Categories — tiles cascade in (internal stagger) */}
          <CategoryGrid categories={categories} title="تصفّح حسب التصنيف" />

          {/* Featured Bundles */}
          {bundles.length > 0 && <Reveal><BundleRow bundles={bundles} /></Reveal>}
        </>
      )}

      {/* Newsletter */}
      <Reveal><NewsletterStrip content={newsletter} /></Reveal>
    </>
  );
}
