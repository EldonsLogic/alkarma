import Link from "next/link";
import Image from "next/image";
import type { BookSummary } from "@/types";
import { coverSrc } from "@/lib/coverSrc";

interface Props {
  books: BookSummary[];
}

// Always plain Western digits (0-9), including in the Arabic version — per request.
function formatRank(n: number): string {
  return n.toString();
}

const labels = { title: "الأكثر مبيعًا", viewAll: "عرض الكل", arrow: "←" };

export function Top10Carousel({ books }: Props) {
  if (!books.length) return null;

  const top10 = books.slice(0, 10);
  const t = labels;

  return (
    <section className="bg-paper py-6 sm:py-8 overflow-hidden">
      {/* Header */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b-2 border-brand px-4 sm:px-10">
        <div>
          <h2
            className="font-display font-bold text-ink leading-tight"
            style={{ fontSize: "clamp(24px, 3vw, 36px)" }}
          >
            {t.title}
          </h2>
        </div>
        <Link
          href="/bestsellers"
          className="text-[12px] text-brand font-bold tracking-[0.08em] uppercase hover:underline flex-shrink-0 ms-4 mb-1"
        >
          {t.viewAll} {t.arrow}
        </Link>
      </div>

      {/* Scrollable ranked row */}
      <div className="flex gap-0 overflow-x-auto pb-4 px-4 sm:px-10 scrollbar-thin">
        {top10.map((book, idx) => {
          const rank = idx + 1;
          const displayTitle =
            book.title;
          const hasImage =
            book.coverUrl;

          return (
            <Link
              key={book.id}
              href={`/book/${book.slug}`}
              className="group relative flex-shrink-0 flex flex-col"
              style={{ width: "clamp(130px, 14vw, 170px)" }}
            >
              {/* Cover + overlapping rank number */}
              <div className="relative flex items-end overflow-hidden" style={{ height: "clamp(150px, 17vw, 195px)" }}>
                {/* Ghost rank number — behind cover, ink color on light bg */}
                <span
                  aria-hidden
                  className="absolute bottom-0 start-0 leading-[0.85] font-black select-none pointer-events-none font-sans"
                  style={{
                    fontSize: "clamp(100px, 13vw, 150px)",
                    color: "rgba(26,18,8,0.10)",
                  }}
                >
                  {formatRank(rank)}
                </span>

                {/* Book cover — overlaps number from the inline-end side */}
                <div
                  className="relative z-10 shadow-book group-hover:shadow-book-hover transition-shadow duration-300"
                  style={{ marginInlineStart: "clamp(36px, 4.5vw, 56px)" }}
                >
                  {hasImage ? (
                    <Image
                      src={coverSrc(book.coverUrl)}
                      alt={displayTitle}
                      width={100}
                      height={150}
                      sizes="(max-width: 640px) 78px, 110px"
                      className="object-cover block"
                      style={{
                        width: "clamp(78px, 9.5vw, 110px)",
                        height: "clamp(117px, 14vw, 165px)",
                      }}
                    />
                  ) : (
                    <div
                      className="bg-gradient-to-br from-paper-dark to-paper-mid flex items-center justify-center p-2"
                      style={{
                        width: "clamp(78px, 9.5vw, 110px)",
                        height: "clamp(117px, 14vw, 165px)",
                      }}
                    >
                      <span className="text-[9px] text-ink-muted text-center leading-snug">
                        {displayTitle}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Title below */}
              <p
                className="mt-[6px] text-[11px] text-ink-muted font-medium leading-snug line-clamp-2 group-hover:text-ink transition-colors duration-200"
                style={{ paddingInlineStart: "clamp(36px, 4.5vw, 56px)" }}
              >
                {displayTitle}
              </p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
