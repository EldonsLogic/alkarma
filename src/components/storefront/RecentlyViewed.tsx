"use client";

import { useEffect, useState } from "react";
import { BookCarousel } from "./BookCarousel";
import { readRecentlyViewed } from "@/lib/recently-viewed";
import type { BookSummary } from "@/types";

interface Props {
  /** Slug of the book currently being viewed, so it isn't listed under itself. */
  excludeSlug?: string;
}

/**
 * Renders the visitor's recently viewed books. Client-only by nature: the list
 * lives in their browser, so this fetches after mount and renders nothing at
 * all until there is something worth showing.
 */
export function RecentlyViewed({ excludeSlug }: Props) {
  const [books, setBooks] = useState<BookSummary[]>([]);

  useEffect(() => {
    const slugs = readRecentlyViewed().filter((s) => s !== excludeSlug);
    if (!slugs.length) return;
    const ctrl = new AbortController();
    fetch(`/api/books/by-slug?slugs=${encodeURIComponent(slugs.join(","))}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { books: BookSummary[] }) => setBooks(d.books ?? []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [excludeSlug]);

  if (!books.length) return null;

  /*
    Rendered through BookCarousel rather than hand-rolled markup.

    This section had kept its original styling while every other rail moved to
    the shared component: an unbounded mx-4/sm:mx-10 width instead of the
    1170px container, a panel border the others no longer have, and gap-5 with
    px-5/px-7 on the row. BookCard meanwhile carries its own horizontal padding
    and fractional widths (w-1/2 -> w-1/5) designed for a gap-0 row, so the two
    sets of spacing fought each other and the cards landed on different
    gridlines from the content above them — different on every page it appears
    on, since the surrounding width differed too.

    Using the shared component means it inherits the same container, card
    widths, gutters, heading treatment and grid as أحدث الإصدارات and the rest,
    and stays consistent with them automatically.
  */
  return <BookCarousel title="آخر المشاهدات" books={books} variant="grid" />;
}
