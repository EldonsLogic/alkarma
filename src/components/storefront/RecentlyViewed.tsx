"use client";

import { useEffect, useState } from "react";
import { BookCard } from "./BookCard";
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

  return (
    <section className="mx-4 sm:mx-10 my-5 bg-paper border border-paper-dark">
      <div className="px-5 sm:px-7 py-4 border-b border-paper-dark">
        <h2 className="font-display font-bold text-brand leading-tight text-[18px] sm:text-[20px]">
          آخر المشاهدات
        </h2>
      </div>
      <div className="flex gap-5 overflow-x-auto px-5 sm:px-7 py-6 scrollbar-thin">
        {books.map((b) => (
          <BookCard key={b.id} book={b} showAddToCart={false} />
        ))}
      </div>
    </section>
  );
}
