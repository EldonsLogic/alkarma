import Link from "next/link";
import { BookCard } from "./BookCard";
import { Reveal } from "@/components/ui/Reveal";
import type { BookSummary } from "@/types";

interface Props {
  title: string;
  /** Small label above the title. Optional. */
  overline?: string;
  books: BookSummary[];
  viewAllHref?: string;
  /**
   * "grid" wraps into rows of five, which is how the live site lays out its
   * homepage rails — 15 books as 3 x 5, not a scroller. "scroll" keeps the
   * horizontal scroller used elsewhere (PDP, book of the month).
   */
  variant?: "grid" | "scroll";
}

/**
 * A titled row of books, presented as a white panel on the page's grey ground
 * — the storefront's dominant section pattern, matching the live site: the
 * section title sits in brand red on the leading edge, with a "المزيد" link on
 * the trailing edge.
 */
export function BookCarousel({ title, overline, books, viewAllHref, variant = "scroll" }: Props) {
  if (!books.length) return null;

  /*
    Live insets this panel 15px from each side of the viewport until it hits a
    1170px cap, after which it centres — measured x=15/w=345 at 375, x=15/w=994
    at 1024, x=55/w=1170 at 1280. calc keeps both behaviours in one rule.

    No outer border: live draws this panel as plain white on the #F0F0F0 page
    ground with no stroke. The border here was a mockup-ism, and it also stole
    1px from every card width.
  */
  return (
    <section className="w-[calc(100%-30px)] max-w-[1170px] mx-auto my-5 bg-paper">
      <div className="flex items-center justify-between gap-4 px-5 sm:px-7 py-4 border-b border-paper-dark">
        <div className="min-w-0">
          {overline && <span className="section-overline">{overline}</span>}
          <h2 className="font-display font-bold text-brand leading-tight text-[20px] sm:text-[22px] truncate">
            {title}
          </h2>
        </div>
      </div>

      {/* gap-0 and no inline padding: the gutter is the cards' own padding, as
          on live. Live's row padding is 0 on mobile and 6px from tablet up. */}
      {/* Reveal carries the row's own layout classes so the cards are its DIRECT
          children — `.reveal-stagger > *` only reaches one level, so wrapping the
          row in a Reveal instead would cascade the whole row as a single unit
          rather than card by card. */}
      <Reveal
        stagger
        className={`flex gap-0 px-0 md:px-[6px] py-6 ${
          variant === "grid" ? "flex-wrap" : "overflow-x-auto scrollbar-thin"
        }`}
      >
        {books.map((book, i) => (
          <BookCard key={book.id} book={book} priority={i < 3} />
        ))}
      </Reveal>

      {/* "المزيد" sits BELOW the books, not in the header.
          Live puts it in the section header, which means a reader who has just
          scrolled the whole rail has to scroll back up to act on it. Putting it
          where the reading ends is a deliberate departure from live. */}
      {viewAllHref && (
        <div className="px-5 sm:px-7 pb-6 -mt-2 flex justify-center">
          <Link
            href={viewAllHref}
            className="inline-block border border-paper-dark px-6 py-[9px] text-[13px] font-semibold text-ink hover:text-brand hover:border-brand transition-colors"
          >
            المزيد ‹
          </Link>
        </div>
      )}
    </section>
  );
}
