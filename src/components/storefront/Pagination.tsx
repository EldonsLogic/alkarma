import Link from "next/link";

interface Props {
  /** 1-based current page. */
  page: number;
  /** Total number of matching items (not pages). */
  total: number;
  /** Items per page. */
  limit: number;
  /** Current query string params, preserved across page links. */
  searchParams: Record<string, string | undefined>;
  /** Path the page links point at, e.g. "/category/روايات". */
  basePath: string;
}

/**
 * Numbered pagination, matching the store's listing pages.
 *
 * Renders as links (not buttons) so pages are crawlable and openable in a new
 * tab; every other active filter/sort param is preserved in each link.
 */
export function Pagination({ page, total, limit, searchParams, basePath }: Props) {
  const pageCount = Math.ceil(total / limit);
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page" && k !== "slug") qs.set(k, v);
    }
    if (p > 1) qs.set("page", String(p));
    const q = qs.toString();
    return q ? `${basePath}?${q}` : basePath;
  };

  // Window of pages around the current one, always including first and last.
  const nums: (number | "…")[] = [];
  const push = (n: number | "…") => { if (nums[nums.length - 1] !== n) nums.push(n); };
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) push(p);
    else push("…");
  }

  const box =
    "min-w-[36px] h-9 px-2.5 flex items-center justify-center text-[13px] rounded-sm border transition-colors";

  return (
    <nav aria-label="ترقيم الصفحات" className="flex items-center justify-center gap-2 py-8">
      {page > 1 && (
        <Link href={href(page - 1)} rel="prev" aria-label="الصفحة السابقة"
          className={`${box} border-paper-dark text-ink-muted hover:text-brand hover:border-brand`}>
          {/* SVGs rather than ‹ ›: those characters are bidi-mirrored and the
              RTL context flipped both, so prev pointed left and next right. */}
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </Link>
      )}

      {nums.map((n, i) =>
        n === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-ink-muted text-[13px]">…</span>
        ) : n === page ? (
          <span key={n} aria-current="page"
            className={`${box} border-brand bg-brand text-white font-bold`}>
            {n}
          </span>
        ) : (
          <Link key={n} href={href(n)}
            className={`${box} border-paper-dark text-ink hover:text-brand hover:border-brand`}>
            {n}
          </Link>
        )
      )}

      {page < pageCount && (
        <Link href={href(page + 1)} rel="next" aria-label="الصفحة التالية"
          className={`${box} border-paper-dark text-ink-muted hover:text-brand hover:border-brand`}>
          <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </Link>
      )}
    </nav>
  );
}
