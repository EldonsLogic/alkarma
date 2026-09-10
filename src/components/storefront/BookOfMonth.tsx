import Link from "next/link";
import Image from "next/image";

export interface BookOfMonthData {
  slug: string;
  title: string;
  titleAr: string | null;
  author: string;
  coverUrl: string | null;
  synopsis: string | null;
  synopsisAr: string | null;
}

/**
 * Homepage "Book of the Month" spotlight — one hero title (the current item of
 * the curated `book-of-the-month` featured list). The whole section is only
 * rendered when a pick is set, so it disappears entirely when unset (like the
 * Bundles row). Presented as a distinguished, centered card; the details block
 * is aligned to the pick's own language so it never skews.
 */
export function BookOfMonth({ book }: { book: BookOfMonthData; }) {
  const title = book.title;
  const synopsisRaw = book.synopsisAr ? book.synopsisAr : book.synopsis;
  const blurb = synopsisRaw ? synopsisRaw.slice(0, 280) + (synopsisRaw.length > 280 ? "…" : "") : null;

  // Align the whole spotlight (cover + text) to the book's own script so it
  // reads as one coherent block, regardless of the site's browsing language.
  const bookIsAr = /[؀-ۿ]/.test(book.title);
  const dir = bookIsAr ? "rtl" : "ltr";

  return (
    <section className="py-6 sm:py-8 px-4 sm:px-10 bg-paper-mid">
      <div className="max-w-[1080px] mx-auto">
        {/* Section header — follows the site language */}
        <div className="flex items-end justify-between mb-5 pb-4 border-b-2 border-brand">
          <h2 className="text-[22px] sm:text-[26px] font-bold text-ink">
            كتاب الشهر
          </h2>
          <Link
            href="/book-of-the-month"
            className="text-[12px] text-brand font-bold tracking-[0.08em] uppercase hover:underline flex-shrink-0 ms-4 mb-1"
          >
            عرض الاختيار ←
          </Link>
        </div>

        {/* Spotlight card */}
        <div className="bg-paper border border-paper-dark rounded-md shadow-card px-6 py-7 sm:px-10 sm:py-9">
          <div
            dir={dir}
            className="grid gap-6 sm:gap-10 sm:grid-cols-[200px_1fr] items-center justify-items-center sm:justify-items-stretch"
          >
            {/* Cover */}
            <Link href={`/book/${book.slug}`} className="block group w-[170px] sm:w-[200px]">
              <div className="relative w-full aspect-[2/3]">
                {book.coverUrl ? (
                  <Image src={book.coverUrl} alt={title} fill sizes="200px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-ink-muted text-[13px] px-3 text-center">
                    {title}
                  </div>
                )}
              </div>
            </Link>

            {/* Details — inherit `dir`, so alignment stays with the cover */}
            <div className="text-center sm:text-start">
              <p className="text-[12px] text-brand font-bold uppercase tracking-widest mb-2">
                اختيار هذا الشهر
              </p>
              <h3 className="text-[24px] sm:text-[30px] font-bold text-ink leading-tight mb-2">
                {title}
              </h3>
              <p className="text-[15px] sm:text-[16px] text-ink-soft mb-5">
                بقلم {book.author}
              </p>

              {blurb && (
                <p className="text-[14px] sm:text-[15px] text-ink-soft/90 leading-relaxed mb-6 max-w-[60ch] mx-auto sm:mx-0">
                  {blurb}
                </p>
              )}

              <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                <Link
                  href={`/book/${book.slug}`}
                  className="px-8 py-3 bg-brand hover:bg-brand-dark text-paper font-bold uppercase tracking-wide text-[14px] transition-colors"
                >
                  تسوق الاختيار
                </Link>
                <Link
                  href="/book-of-the-month"
                  className="px-6 py-3 border-2 border-ink hover:bg-ink hover:text-paper text-ink font-bold uppercase tracking-wide text-[14px] transition-colors"
                >
                  اقرأ المزيد
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
