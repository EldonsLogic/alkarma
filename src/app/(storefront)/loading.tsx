/**
 * Route-level Suspense fallback for the storefront.
 *
 * Without a loading file, the App Router keeps the CURRENT page on screen
 * until the whole server tree for the next one has rendered — several seconds
 * on the heavier listings — with nothing on screen to say a navigation is in
 * flight. This hands Next a boundary it can show immediately.
 *
 * Deliberately a plain shell rather than a per-page skeleton: it stands in for
 * every storefront route, so it should suggest "loading" without implying a
 * layout the next page may not have.
 */
export default function StorefrontLoading() {
  return (
    <div className="w-[calc(100%-30px)] max-w-[1170px] mx-auto my-8" aria-busy="true" aria-live="polite">
      <span className="sr-only">جارٍ التحميل…</span>

      <div className="h-[26px] w-[180px] bg-paper-dark/60 rounded-sm animate-pulse mb-6" />

      <div className="flex flex-wrap gap-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 px-[15px] md:px-[26px] xl:px-[30px] pb-8">
            <div className="w-full aspect-[2/3] bg-paper-dark/40 rounded-sm animate-pulse" />
            <div className="h-[14px] w-4/5 bg-paper-dark/40 rounded-sm animate-pulse mt-3" />
            <div className="h-[12px] w-3/5 bg-paper-dark/30 rounded-sm animate-pulse mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
