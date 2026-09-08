/**
 * External book review / rating data.
 *
 * Sources:
 *   • Google Books API  — community average rating + count  (free, GOOGLE_BOOKS_API_KEY recommended)
 *   • Open Library API  — community ratings + count         (free, no key)
 *   • NYT Books API     — editorial/critic review text      (NYT_BOOKS_API_KEY required)
 *
 * Data is stored in ExternalRating / ExternalEditorialReview tables and refreshed
 * on a weekly schedule via /api/cron/refresh-external-reviews.
 * On a product's first page visit, if no DB record exists yet, we fetch live and store immediately.
 */

import { prisma } from "@/lib/prisma";

export interface CommunityRating {
  source: string;
  label: string;
  rating: number;
  count: number;
  url: string | null;
}

export interface EditorialReview {
  source: string;
  label: string;
  summary: string;
  byline: string;
  date: string;
  url: string;
}

export interface ExternalReviewData {
  communityRatings: CommunityRating[];
  editorialReviews: EditorialReview[];
}

// ─── API fetch helpers ────────────────────────────────────────────────────────

async function fetchGoogleBooks(
  isbn?: string | null,
  title?: string,
  author?: string
): Promise<CommunityRating | null> {
  try {
    const q = isbn
      ? `isbn:${isbn.replace(/[-\s]/g, "")}`
      : `intitle:${encodeURIComponent(title ?? "")}+inauthor:${encodeURIComponent(author ?? "")}`;
    const key = process.env.GOOGLE_BOOKS_API_KEY
      ? `&key=${process.env.GOOGLE_BOOKS_API_KEY}`
      : "";
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1${key}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const info = data.items?.[0]?.volumeInfo;
    if (!info?.averageRating || !info?.ratingsCount) return null;
    return {
      source: "google_books",
      label: "Google Books",
      rating: info.averageRating,
      count: info.ratingsCount,
      url: info.canonicalVolumeLink ?? info.infoLink ?? null,
    };
  } catch { return null; }
}

async function fetchOpenLibrary(
  isbn?: string | null,
  title?: string,
  author?: string
): Promise<CommunityRating | null> {
  try {
    const q = [title, author].filter(Boolean).join(" ");
    const searchRes = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=1&fields=key,ratings_average,ratings_count`,
      { cache: "no-store" }
    );
    if (!searchRes.ok) return null;
    const data = await searchRes.json();
    const doc = data.docs?.[0];
    if (!doc?.ratings_average || !doc?.ratings_count) return null;
    return {
      source: "open_library",
      label: "Open Library",
      rating: Math.round(doc.ratings_average * 10) / 10,
      count: doc.ratings_count,
      url: `https://openlibrary.org${doc.key}`,
    };
  } catch { return null; }
}

async function fetchNYTReview(
  isbn?: string | null,
  title?: string,
  author?: string
): Promise<EditorialReview | null> {
  const apiKey = process.env.NYT_BOOKS_API_KEY;
  if (!apiKey) return null;
  try {
    const params = isbn
      ? `isbn=${isbn.replace(/[-\s]/g, "")}`
      : `author=${encodeURIComponent(author ?? "")}`;
    const res = await fetch(
      `https://api.nytimes.com/svc/books/v3/reviews.json?${params}&api-key=${apiKey}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.results?.[0];
    if (!result?.summary) return null;
    if (!isbn && title) {
      const resultTitle: string = result.book_title?.toLowerCase() ?? "";
      if (!resultTitle.includes(title.toLowerCase().slice(0, 8))) return null;
    }
    return {
      source: "nyt",
      label: "The New York Times",
      summary: result.summary,
      byline: result.byline ?? "",
      date: result.publication_dt ?? "",
      url: result.url ?? result.book_review_link ?? "",
    };
  } catch { return null; }
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

/** Fetch from all APIs and upsert results into DB for one book. */
export async function refreshBookExternalReviews(
  bookId: string,
  isbn?: string | null,
  title?: string,
  author?: string
): Promise<void> {
  const [google, openLib, nyt] = await Promise.allSettled([
    fetchGoogleBooks(isbn, title, author),
    fetchOpenLibrary(isbn, title, author),
    fetchNYTReview(isbn, title, author),
  ]);

  const ratings = [
    google.status === "fulfilled" ? google.value : null,
    openLib.status === "fulfilled" ? openLib.value : null,
  ].filter((r): r is CommunityRating => r !== null);

  const editorials = [
    nyt.status === "fulfilled" ? nyt.value : null,
  ].filter((r): r is EditorialReview => r !== null);

  // Upsert community ratings
  await Promise.all(
    ratings.map((r) =>
      prisma.externalRating.upsert({
        where: { bookId_source: { bookId, source: r.source } },
        update: { label: r.label, rating: r.rating, count: r.count, url: r.url },
        create: { bookId, source: r.source, label: r.label, rating: r.rating, count: r.count, url: r.url },
      })
    )
  );

  // Upsert editorial reviews
  await Promise.all(
    editorials.map((r) =>
      prisma.externalEditorialReview.upsert({
        where: { bookId_source: { bookId, source: r.source } },
        update: { label: r.label, summary: r.summary, byline: r.byline, date: r.date, url: r.url },
        create: { bookId, source: r.source, label: r.label, summary: r.summary, byline: r.byline, date: r.date, url: r.url },
      })
    )
  );
}

// ─── PDP entry point ──────────────────────────────────────────────────────────

/**
 * Read external reviews from DB for a given book.
 * If no record exists yet (new product), fetches live and stores immediately — happens once only.
 */
export async function getExternalReviews(
  bookId: string,
  isbn?: string | null,
  title?: string,
  author?: string
): Promise<ExternalReviewData> {
  const [ratings, editorials] = await Promise.all([
    prisma.externalRating.findMany({ where: { bookId } }),
    prisma.externalEditorialReview.findMany({ where: { bookId } }),
  ]);

  // First-time visit for this book — fetch live in background, return empty for now
  // (next visit will have data)
  if (ratings.length === 0 && editorials.length === 0) {
    // Fire-and-forget — don't block the page render
    refreshBookExternalReviews(bookId, isbn, title, author).catch(() => {});
    return { communityRatings: [], editorialReviews: [] };
  }

  return {
    communityRatings: ratings.map((r) => ({
      source: r.source,
      label: r.label,
      rating: r.rating,
      count: r.count,
      url: r.url,
    })),
    editorialReviews: editorials.map((r) => ({
      source: r.source,
      label: r.label,
      summary: r.summary,
      byline: r.byline,
      date: r.date,
      url: r.url,
    })),
  };
}
