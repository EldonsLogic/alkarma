import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { BookCarousel } from "@/components/storefront/BookCarousel";
import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

// Summary fields plus synopsis (needed for the main pick's blurb) — still
// excludes subtitle/publisher/translator/editor/publishDate/pageCount/etc.
const BOTM_BOOK_SELECT = {
  id: true, slug: true, title: true, titleAr: true, author: true, coverUrl: true,
  priceEgp: true, compareAtEgp: true, isBestseller: true, isNewRelease: true, isFeatured: true, salesCount: true, stock: true,
  synopsis: true, synopsisAr: true,
} as const;

export const metadata: Metadata = {
  title: "كتاب الشهر",
  description: "Our hand-picked Book of the Month — one extraordinary read, chosen by our team.",
  ...canonical("/book-of-the-month"),
};

const STRINGS = {
    staffPick:       "✦ كتاب الشهر ✦",
    overline:        "كتاب الشهر",
    by:              "بقلم",
    getBook:         "احصل على الكتاب ←",
    learnMore:       "اعرف أكثر",
    whyLove:         "لماذا أحببناه",
    team:            "— فريق دار الكرمة",
    previousPicks:   "اختيارات سابقة",
    alsoLove:        "قد يعجبك أيضًا",
    noPick:          "لم يُختر كتاب هذا الشهر بعد — عد قريبًا!",
    backHome:        "→ العودة للرئيسية",
    fallbackQuote:   "قراءة استثنائية لم يستطع فريقنا التوقف عنها — مثيرة للتفكير، جميلة الأسلوب، ولا تُنسى.",
  } as const;

async function getData() {
  const list = await prisma.featuredList.findFirst({
    where: { slug: "book-of-the-month", isActive: true },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
        select: { book: { select: BOTM_BOOK_SELECT } },
        take: 12,
      },
    },
  });

  const fallback = await prisma.book.findFirst({
    where: { isActive: true, isFeatured: true },
    orderBy: { salesCount: "desc" },
    select: BOTM_BOOK_SELECT,
  });

  const alsoLove = await prisma.book.findMany({
    where: { isActive: true, isBestseller: true },
    orderBy: { salesCount: "desc" },
    take: 12,
    select: BOTM_BOOK_SELECT,
  });

  const mainBook = list?.items[0]?.book ?? fallback;
  const pastPicks = list?.items.slice(1).map((i) => i.book) ?? [];

  return { list, mainBook, pastPicks, alsoLove };
}

export default async function BookOfTheMonthPage() {
  const [{ mainBook, pastPicks, alsoLove }] = await Promise.all([
    getData(),
  ]);

  const t = STRINGS;

  const toSummary = (b: NonNullable<typeof mainBook>) => ({
    id: b.id,
    slug: b.slug,
    title: b.title,
    titleAr: b.titleAr ?? null,
    author: b.author,
    authorSlug: null,
    coverUrl: b.coverUrl,
    priceEgp: Number(b.priceEgp),
    compareAtEgp: b.compareAtEgp ? Number(b.compareAtEgp) : null,
    isBestseller: b.isBestseller,
    isNewRelease: b.isNewRelease,
    isFeatured: b.isFeatured,
    salesCount: b.salesCount,
    stock: b.stock,
  });

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero strip */}
      <div className="bg-brand text-paper py-4 text-center">
        <p className="text-[13px] font-bold uppercase tracking-widest">{t.staffPick}</p>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-10 py-12">

        {mainBook ? (
          <>
            {/* Main pick */}
            <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-10 items-start mb-16">
              <div>
                <div className="relative w-full aspect-[2/3] max-w-[280px]">
                  {mainBook.coverUrl ? (
                    <Image
                      src={mainBook.coverUrl}
                      alt={mainBook.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full bg-[#e5e5e5] flex items-center justify-center">
                      <span className="text-ink-muted text-[14px]">{mainBook.title}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[12px] text-brand font-bold uppercase tracking-widest mb-2">
                  {t.overline}
                </p>
                <h1 className="text-[28px] sm:text-[36px] font-display font-bold text-ink leading-tight mb-2">
                  {mainBook.title}
                </h1>
                <p className="text-[16px] text-ink-soft mb-5">{t.by} {mainBook.author}</p>

                {mainBook.synopsis && (
                  <p className="text-[15px] text-[#444] leading-relaxed mb-6">
                    {(() => {
                      const synopsis = mainBook.synopsisAr ? mainBook.synopsisAr : mainBook.synopsis;
                      return synopsis.slice(0, 400) + (synopsis.length > 400 ? "…" : "");
                    })()}
                  </p>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/book/${mainBook.slug}`}
                    className="px-8 py-3 bg-brand hover:bg-brand-dark text-paper font-display font-bold uppercase tracking-wide text-[14px] transition-colors"
                  >
                    {t.getBook}
                  </Link>
                  <Link
                    href={`/book/${mainBook.slug}`}
                    className="px-6 py-3 border-2 border-[#1a1a1a] hover:bg-ink hover:text-paper text-ink font-bold text-[14px] uppercase tracking-wide transition-colors"
                  >
                    {t.learnMore}
                  </Link>
                </div>
              </div>
            </div>

            {/* Why we love it */}
            <div className="bg-[#fef9f5] border-s-4 border-brand px-6 py-5 mb-16">
              <p className="text-[12px] font-display font-bold text-brand uppercase tracking-widest mb-2">
                {t.whyLove}
              </p>
              <p className="text-[15px] text-[#444] leading-relaxed italic">
                &ldquo;{(() => {
                  const synopsis = mainBook.synopsisAr ? mainBook.synopsisAr : mainBook.synopsis;
                  return synopsis?.slice(0, 200) ?? t.fallbackQuote;
                })()}&rdquo;
              </p>
              <p className="text-[12px] text-ink-muted mt-2">{t.team}</p>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-[18px] text-ink-muted mb-4">{t.noPick}</p>
            <Link href="/" className="text-brand font-bold hover:underline">{t.backHome}</Link>
          </div>
        )}

        {/* Past picks */}
        {pastPicks.length > 0 && (
          <div className="mb-12">
            <h2 className="text-[22px] font-display font-bold text-ink mb-5 pb-2 border-b-2 border-brand">
              {t.previousPicks}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
              {pastPicks.map((book) => (
                <Link
                  key={book.id}
                  href={`/book/${book.slug}`}
                  className="group flex flex-col gap-2"
                >
                  <div className="relative w-full aspect-[2/3]">
                    {book.coverUrl ? (
                      <Image
                        src={book.coverUrl}
                        alt={book.title}
                        fill
                        className="object-cover group-hover:opacity-80 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full bg-[#e5e5e5]" />
                    )}
                  </div>
                  <p className="text-[13px] font-bold text-ink group-hover:text-brand transition-colors line-clamp-2 leading-snug">
                    {book.title}
                  </p>
                  <p className="text-[11px] text-ink-muted">{book.author}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Also love */}
        {alsoLove.length > 0 && (
          <BookCarousel
            title="قد يعجبك أيضًا"
            books={alsoLove.map(toSummary)}
            viewAllHref="/bestsellers"
          />
        )}
      </div>
    </div>
  );
}
