"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { PriceDisplay } from "@/components/storefront/PriceDisplay";
import { StarRating } from "@/components/storefront/StarRating";
import { useCartStore } from "@/stores/cart.store";
import { effectivePrices } from "@/lib/currency";
import type { BookSummary, CategorySummary } from "@/types";
import { Pagination } from "@/components/storefront/Pagination";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";

interface CategoryData extends CategorySummary {
  children: CategorySummary[];
  parent: { id: string; slug: string; name: string; nameAr?: string | null } | null;
}

const AGE_RANGES = [
  { value: "preschool", labelEn: "Pre-school",       labelAr: "ما قبل المدرسة" },
  { value: "5-8",       labelEn: "Ages 5–8",         labelAr: "5–8 سنوات"      },
  { value: "9-12",      labelEn: "Ages 9–12",        labelAr: "9–12 سنة"       },
  { value: "teen",      labelEn: "Teen / Young Adult", labelAr: "المراهقون"    },
];

interface NavData {
  activeSlug: string;
  group: { slug: string; name: string; nameAr?: string | null };
  siblings: { slug: string; name: string; nameAr?: string | null }[];
}

/** One row of the sidebar category list, with its in-stock book count. */
interface CategoryCount {
  slug: string;
  name: string;
  count: number;
}

interface Props {
  category: CategoryData;
  nav?: NavData;
  allCategories?: CategoryCount[];
  books: BookSummary[];
  total: number;
  page: number;
  limit: number;
  searchParams: Record<string, string | undefined>;
}

const STRINGS = {
    home: "الرئيسية",
    allOf: (n: string) => `كل ${n}`,
    filter: "تصفية",
    allCategories: "التصنيفات",
    price: "النطاق السعري (ج.م)",
    pricePlaceholderMin: "الأقل",
    pricePlaceholderMax: "الأعلى",
    ageRange: "الفئة العمرية",
    author: "المؤلف",
    clear: "مسح",
    applyFilters: "عرض النتائج",
    filters: "تصفية النتائج",
    sort: {
      bestselling: "الأكثر مبيعًا",
      newest: "الأحدث",
      priceAsc: "السعر: من الأقل للأعلى",
      priceDesc: "السعر: من الأعلى للأقل",
    },
    showing: (from: number, to: number, total: number) =>
      `عرض ${from}–${to} من أصل ${total} نتيجة`,
    results: (n: number) => `${n} نتيجة`,
    noProducts: "لا توجد منتجات",
    noProductsHint: "جرب تغيير خيارات التصفية",
    bestseller: "الأكثر مبيعًا",
    newBadge: "جديد",
    addToCart: "أضف للسلة",
    addedToCart: "تمت الإضافة ✓",
    buyNow: "اشترِ الآن",
    browse: "استعرض",
    addToWishlist: "أضف للمفضلة",
    removeFromWishlist: "إزالة من المفضلة",
  } as const;

export function CategoryPageClient({
  category,
  nav,
  allCategories,
  books,
  total,
  page,
  limit,
  searchParams,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { addItem, openDrawer } = useCartStore();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const t = STRINGS;
  const loc = (en: string, ar?: string | null) => ar ? ar : en;

  const hasActiveFilters = !!searchParams.ageRange;

  // Changing a FILTER resets to page 1 (page param dropped intentionally).
  function updateSearch(key: string, value: string | null) {
    const params = new URLSearchParams(
      Object.entries(searchParams).filter((e): e is [string, string] => e[1] != null)
    );
    if (value === null) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  // PAGINATION keeps every filter and sets the page. Full browser navigation so
  // the server always renders the requested page (Next's client router cache
  // otherwise reused the same-pathname entry and the list never changed).

  const filterPanel = (
    <div className="space-y-5">
      {category.children.length > 0 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2.5 pb-1.5 border-b border-paper-dark text-ink-muted">{t.browse}</div>
          <ul className="space-y-1.5">
            {category.children.map((sub) => (
              <li key={sub.id}>
                <Link href={`/category/${sub.slug}`} className="text-[13px] text-ink-soft hover:text-brand transition-colors">
                  {loc(sub.name, sub.nameAr)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Age Range */}
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2.5 pb-1.5 border-b border-paper-dark text-ink-muted">{t.ageRange}</div>
        <ul className="space-y-1.5">
          {AGE_RANGES.map((a) => {
            const isActive = searchParams.ageRange === a.value;
            return (
              <li key={a.value}>
                <button
                  onClick={() => updateSearch("ageRange", isActive ? null : a.value)}
                  className={`w-full text-start text-[13px] px-2 py-1 rounded-sm transition-colors ${
                    isActive ? "text-brand font-bold" : "text-ink-soft hover:text-brand"
                  }`}
                >
                  {a.labelAr}
                </button>
              </li>
            );
          })}
          {searchParams.ageRange && (
            <li>
              <button onClick={() => updateSearch("ageRange", null)} className="text-[12px] text-brand underline ms-2">{t.clear}</button>
            </li>
          )}
        </ul>
      </div>

      <button
        onClick={() => setMobileFiltersOpen(false)}
        className="md:hidden w-full py-3 bg-brand text-white text-[13px] font-bold uppercase tracking-wide rounded-sm"
      >
        {t.applyFilters}
      </button>
    </div>
  );

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="px-4 sm:px-10 py-[12px] text-[12px] text-ink-muted flex gap-2 items-center bg-paper-mid border-b border-paper-dark overflow-x-auto whitespace-nowrap font-mono">
        <Link href="/" className="hover:text-brand flex-shrink-0">{t.home}</Link>
        <span className="text-paper-dark">›</span>
        {category.parent && (
          <>
            <Link href={`/category/${category.parent.slug}`} className="hover:text-brand flex-shrink-0">
              {loc(category.parent.name, category.parent.nameAr)}
            </Link>
            <span className="text-paper-dark">›</span>
          </>
        )}
        <span dir="auto" className="text-ink font-bold flex-shrink-0">{loc(category.name, category.nameAr)}</span>
      </nav>

      {/* Sub-category pill strip */}
      {nav && nav.siblings.length > 0 && (() => {
        const chipBase = "flex-shrink-0 px-4 py-[7px] text-[11px] font-bold uppercase tracking-[0.08em] border whitespace-nowrap transition-colors";
        const chipActive = "bg-brand border-brand text-white";
        const chipIdle = "border-paper-dark text-ink-muted hover:border-brand hover:text-brand";
        return (
          <div className="bg-paper border-b border-paper-dark">
            <div
              className="flex gap-2 overflow-x-auto px-4 sm:px-10 py-3"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {/* "All <group>" — highlighted only when viewing the parent itself */}
              <Link
                href={`/category/${nav.group.slug}`}
                className={`${chipBase} ${nav.activeSlug === nav.group.slug ? chipActive : chipIdle}`}
              >
                {t.allOf(loc(nav.group.name, nav.group.nameAr))}
              </Link>
              {/* All siblings stay visible; the current one is highlighted */}
              {nav.siblings.map((sub) => (
                <Link
                  key={sub.slug}
                  href={`/category/${sub.slug}`}
                  className={`${chipBase} ${nav.activeSlug === sub.slug ? chipActive : chipIdle}`}
                >
                  {loc(sub.name, sub.nameAr)}
                </Link>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Mobile toolbar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-paper-dark bg-paper sticky top-[60px] z-10">
        <p className="text-[13px] text-ink-muted">
          <strong className="text-ink">{total}</strong> نتيجة
        </p>
        <div className="flex items-center gap-2">
          <select
            value={searchParams.sort ?? "bestselling"}
            onChange={(e) => updateSearch("sort", e.target.value)}
            className="px-2 py-1.5 border border-paper-dark rounded-sm text-[12px] bg-paper outline-none text-ink"
          >
            <option value="bestselling">{t.sort.bestselling}</option>
            <option value="newest">{t.sort.newest}</option>
            <option value="price-asc">{t.sort.priceAsc}</option>
            <option value="price-desc">{t.sort.priceDesc}</option>
          </select>
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-sm text-[12px] font-bold transition-colors ${
              hasActiveFilters ? "border-brand text-brand bg-[#FFECEC]" : "border-[#ddd] text-[#333]"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            {t.filters}{hasActiveFilters ? " ·" : ""}
          </button>
        </div>
      </div>

      {/* Mobile filter panel */}
      {mobileFiltersOpen && (
        <div className="md:hidden bg-paper border-b border-paper-dark px-4 py-5">
          <h2 className="font-display text-[18px] font-bold text-ink mb-5">{t.filters}</h2>
          {filterPanel}
        </div>
      )}

      <div className="flex items-start max-w-[1400px] mx-auto">
        {/* Desktop sidebar */}
        <aside className="hidden md:block w-[260px] flex-shrink-0 px-6 py-6 border-e border-paper-dark bg-paper sticky top-[73px] max-h-[calc(100vh-73px)] overflow-y-auto">
          {allCategories && allCategories.length > 0 && (
            <div className="mb-7">
              <h2 className="font-display text-[17px] font-bold text-ink mb-3 pb-2 border-b border-paper-dark">
                {t.allCategories}
              </h2>
              <ul className="space-y-[3px]">
                {allCategories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/category/${c.slug}`}
                      className={`flex items-baseline justify-between gap-2 text-[12.5px] leading-[1.75] py-[3px] transition-colors ${
                        c.slug === category.slug
                          ? "text-brand font-bold"
                          : "text-ink-muted hover:text-brand"
                      }`}
                    >
                      <span className="min-w-0 truncate">{c.name}</span>
                      <span className="price-mono text-[11px] text-ink-muted/70 flex-shrink-0">({c.count})</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <h2 className="font-display text-[17px] font-bold text-ink mb-4 pb-2 border-b border-paper-dark">{t.filter}</h2>
          {filterPanel}
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 py-4 sm:py-6">
          {/* Desktop sort bar */}
          <div className="hidden md:flex items-center justify-between mb-5 pb-4 border-b border-paper-dark">
            <p className="text-[13px] text-ink-muted">
              {t.showing((page - 1) * limit + 1, Math.min(page * limit, total), total)}
            </p>
            <select
              value={searchParams.sort ?? "bestselling"}
              onChange={(e) => updateSearch("sort", e.target.value)}
              className="px-3 py-2 border border-paper-dark rounded-sm text-[13px] bg-paper text-ink outline-none focus:border-brand cursor-pointer"
            >
              <option value="bestselling">{t.sort.bestselling}</option>
              <option value="newest">{t.sort.newest}</option>
              <option value="price-asc">{t.sort.priceAsc}</option>
              <option value="price-desc">{t.sort.priceDesc}</option>
            </select>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex gap-2 flex-wrap mb-4">
              {searchParams.ageRange && (
                <FilterChip
                  label={AGE_RANGES.find((a) => a.value === searchParams.ageRange)?.["labelAr"] ?? searchParams.ageRange}
                  onRemove={() => updateSearch("ageRange", null)}
                />
              )}
            </div>
          )}

          {/* Grid */}
          {books.length === 0 ? (
            <div className="py-16 text-center text-ink-muted">
              <p className="font-display text-[20px] font-bold mb-2 text-ink">{t.noProducts}</p>
              <p className="text-[14px]">{t.noProductsHint}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6 mb-10">
              {books.map((book) => (
                <ProductCard key={book.id} book={book} />
              ))}
            </div>
          )}

          {/* Pagination — real <a> links so paginated pages are crawlable and
              openable in a new tab. Buttons driving window.location meant
              nothing past page 1 could be discovered by a search engine. */}
          <Pagination
            page={page}
            total={total}
            limit={limit}
            searchParams={searchParams}
            basePath={pathname}
          />

          <RecentlyViewed />

        </main>
      </div>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1.5 bg-[#FFECEC] border border-brand text-brand text-[12px] font-bold px-3 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="text-brand text-[14px] leading-none hover:text-brand-dark">×</button>
    </span>
  );
}

function ProductCard({ book }: { book: BookSummary; }) {
  const { addItem, openDrawer } = useCartStore();
  const { data: session } = useSession();
  const router = useRouter();
  const t = STRINGS;
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  const cartPayload = { id: book.id, bookId: book.id, title: book.title, author: book.author, coverUrl: book.coverUrl, slug: book.slug, ...effectivePrices(book) };

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    addItem(cartPayload);
    setAdded(true);
    openDrawer();
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow(e: React.MouseEvent) {
    e.preventDefault();
    addItem(cartPayload);
    router.push("/cart");
  }

  async function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    if (!session) { window.location.href = "/login"; return; }
    if (wishlistLoading) return;
    setWishlistLoading(true);
    try {
      if (wishlisted) {
        await fetch("/api/wishlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId: book.id }),
        });
        setWishlisted(false);
      } else {
        await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookId: book.id }),
        });
        setWishlisted(true);
      }
    } catch {}
    setWishlistLoading(false);
  }

  return (
    <Link href={`/book/${book.slug}`} className="group flex flex-col cursor-pointer">
      <div className="relative flex-shrink-0">
        <div className="w-full aspect-[2/3] bg-paper shadow-card group-hover:shadow-card-hover transition-all duration-150 overflow-hidden">
          {book.coverUrl && !false ? (
            // object-contain: some covers aren't a clean 2:3 ratio — contain shows the
            // whole cover (letterboxed on bg-paper, matching the page background so it
            // blends in) instead of cropping it or standing out as a grey/beige box.
            <Image src={book.coverUrl} alt={book.title} fill className="object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center p-3">
              <span className="text-[10px] sm:text-[11px] text-ink-muted text-center leading-snug">{book.title}</span>
            </div>
          )}
        </div>
        {/* Badges — stacked so Bestseller + New don't overlap when both apply */}
        <div className="absolute top-2 start-2 flex flex-col gap-1 z-10">
          {book.isBestseller && (
            <span className="bg-brand text-white text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-wide">{t.bestseller}</span>
          )}
          {book.isNewRelease && (
            <span className="bg-brand text-white text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-wide">{t.newBadge}</span>
          )}
        </div>
        {/* Wishlist heart */}
        <button
          onClick={handleWishlist}
          disabled={wishlistLoading}
          aria-label={wishlisted ? t.removeFromWishlist : t.addToWishlist}
          className={`absolute top-2 end-2 w-7 h-7 flex items-center justify-center bg-paper/85 backdrop-blur-sm transition-all duration-150 focus:opacity-100 ${
            wishlisted ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill={wishlisted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={wishlisted ? "text-brand" : "text-ink-muted"}
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>
      </div>
      <div className="pt-3 flex flex-col flex-1">
        <p dir="auto" className="font-display text-[14px] sm:text-[15px] font-semibold text-ink line-clamp-2 leading-snug mb-1 h-[44px] overflow-hidden">{book.title}</p>
        {/* Byline is PLAIN TEXT: this whole card is already a <Link> (an <a>),
            and an <a> inside an <a> is invalid HTML. The browser unnests it
            when parsing the server HTML, so React's tree stopped matching the
            DOM and every listing page threw a hydration error and re-rendered
            client-side. Same fix as BookCard. */}
        <p dir="auto" className="text-[12px] text-ink-muted mb-2 line-clamp-1">
          {(book.authors && book.authors.length > 0
            ? Array.from(new Set(book.authors.map((a) => a.name)))
            : [book.author]
          )
            .filter(Boolean)
            .join("، ")}
        </p>
        <PriceDisplay item={book} size="sm" />
        <div className="mt-auto pt-2 flex flex-col gap-0">
          <button
            onClick={handleBuyNow}
            className="w-full py-2 bg-ink hover:bg-ink/80 text-paper text-[11px] sm:text-[12px] font-bold uppercase tracking-wide rounded-t-sm transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 -translate-y-1 group-hover:translate-y-0 duration-150"
          >
            {t.buyNow}
          </button>
          <button
            onClick={handleAdd}
            className="w-full py-2 bg-brand hover:bg-brand-dark text-white text-[11px] sm:text-[12px] font-bold uppercase tracking-wide rounded-b-sm transition-colors"
          >
            {added ? t.addedToCart : t.addToCart}
          </button>
        </div>
      </div>
    </Link>
  );
}
