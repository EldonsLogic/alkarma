import Link from "next/link";
import { BookCard } from "./BookCard";
import type { BookSummary } from "@/types";

interface Props {
  title: string;
  /** Small label above the title. Optional. */
  overline?: string;
  books: BookSummary[];
  viewAllHref?: string;
}

/**
 * A titled row of books, presented as a white panel on the page's grey ground
 * — the storefront's dominant section pattern, matching the live site: the
 * section title sits in brand red on the leading edge, with a "المزيد" link on
 * the trailing edge.
 */
export function BookCarousel({ title, overline, books, viewAllHref }: Props) {
  if (!books.length) return null;

  return (
    <section className="mx-4 sm:mx-10 my-5 bg-paper border border-paper-dark">
      <div className="flex items-center justify-between gap-4 px-5 sm:px-7 py-4 border-b border-paper-dark">
        <div className="min-w-0">
          {overline && <span className="section-overline">{overline}</span>}
          <h2 className="font-display font-bold text-brand leading-tight text-[20px] sm:text-[22px] truncate">
            {title}
          </h2>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-[13px] text-ink-muted hover:text-brand font-semibold whitespace-nowrap transition-colors"
          >
            المزيد ‹
          </Link>
        )}
      </div>

      <div className="flex gap-5 overflow-x-auto px-5 sm:px-7 py-6 scrollbar-thin">
        {books.map((book, i) => (
          <BookCard key={book.id} book={book} priority={i < 3} />
        ))}
      </div>
    </section>
  );
}
