"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { PromoBar } from "./PromoBar";
import { CartIcon } from "./CartIcon";
import { BRAND_SHORT_AR, BRAND_AR } from "@/lib/brand";

interface SubCat { name: string; nameAr?: string | null; slug: string }
export interface NavGroup {
  name: string;
  nameAr?: string | null;
  slug: string;
  subcategories: SubCat[];
}
// A top-level "mother" menu item (الكتب / أدوات مكتبية) whose mega-menu shows
// its parent categories (groups) and their subcategories.
export interface NavCategoryItem {
  key: string;
  label: string;
  href?: string;
  /** Topical categories — fill the mega-menu's first four columns. */
  groups: NavGroup[];
  /** Imprints — live gives these their own final column. */
  publishers?: NavGroup[];
}

interface Props {
  navCategories: NavCategoryItem[];
}

// Top navigation, in the same order as the live alkarmabooks.com header.
// The categories mega-menu is injected between OFFERS and CHILDREN below.
const NAV_BEFORE_CATEGORIES = [
  { label: "الرئيسية", href: "/" },
  { label: "أحدث الإصدارات", href: "/new-releases" },
  { label: "الأكثر مبيعًا", href: "/bestsellers" },
  { label: "عروض وخصومات", href: "/bundles" },
];

// Slugs here are the live site's own category slugs (verified against the
// live header's hrefs). They previously pointed at /category/children and
// /category/stationery, neither of which exists — both 404'd. "stationary"
// is live's actual spelling, not a typo on our side.
const NAV_AFTER_CATEGORIES = [
  { label: "كتب أطفال", href: "/category/كتب-أطفال" },
  { label: "أدوات مكتبية", href: "/category/stationary" },
  { label: "موزعينا", href: "/distributors" },
];

/**
 * Splits the topical categories into the four columns live uses, filling each
 * column top-to-bottom before starting the next (column-major), which is the
 * order live's own list reads in. Live happens to hold 7 per column; this
 * balances instead so the panel stays even as the catalogue grows.
 */
function topicColumns(groups: NavGroup[]): NavGroup[][] {
  const flat = groups.flatMap((g) => [g, ...g.subcategories.map((sub) => ({
    name: sub.name,
    nameAr: sub.nameAr,
    slug: sub.slug,
    subcategories: [] as SubCat[],
  }))]);
  const per = Math.ceil(flat.length / 4) || 1;
  return [0, 1, 2, 3].map((i) => flat.slice(i * per, (i + 1) * per));
}

export function Header({ navCategories }: Props) {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`);
      setMobileSearchOpen(false);
      setMobileMenuOpen(false);
      setSearchQuery("");
    }
  }

  function openMenu(slug: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHoveredMenu(slug);
  }

  function scheduleClose() {
    closeTimer.current = setTimeout(() => setHoveredMenu(null), 90);
  }

  const activeMother = navCategories.find((m) => m.key === hoveredMenu) ?? null;

  // Categories carry an optional Arabic name (used by bilingual stationery
  // rows); prefer it and fall back to the base name when it isn't set.
  function loc(name: string, ar?: string | null) {
    return ar ? ar : name;
  }

  return (
    <>
      {/* Mobile click-away */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-[98] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mega-menu backdrop */}
      {hoveredMenu && activeMother?.groups.length ? (
        <div
          className="hidden lg:block fixed inset-0 z-[99] bg-ink/30"
          onMouseEnter={() => setHoveredMenu(null)}
        />
      ) : null}

      <header className="relative z-[100]">
        <PromoBar />

        {/* ── Top bar: logo / search / icons ── */}
        {/* Live's masthead sits on #F4F4F4, a shade off the white nav bar
            below it — measured on the live header. bg-paper (white) made the
            two bars read as one slab. */}
        {/* Both header rows share the hero's 1170px column: on live the logo
            and الرئيسية sit 15px inside its right edge and the cart is flush
            with its left edge (measured at 1440: hero 135–1305, logo → 1290,
            nav text → 1290, cart → 135). Padding the full-width bar instead
            put the logo 40px from the viewport edge and let it drift away
            from the hero as the screen widened. */}
        <nav className="relative bg-[#F4F4F4] border-b border-paper-dark h-[60px] md:h-[72px] sticky top-0 z-[101] shadow-[0_1px_4px_rgba(26,18,8,0.07)]">
        <div className="relative h-full w-[calc(100%-30px)] max-w-[1170px] mx-auto lg:ps-[15px] flex items-center gap-3 md:gap-6">

          {/* Hamburger */}
          <button
            className="lg:hidden flex flex-col gap-[5px] p-1 flex-shrink-0"
            onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setMobileSearchOpen(false); }}
            aria-label="فتح القائمة"
          >
            <span className={`block w-5 h-[2px] bg-ink transition-all ${mobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""}`} />
            <span className={`block w-5 h-[2px] bg-ink transition-all ${mobileMenuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-[2px] bg-ink transition-all ${mobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""}`} />
          </button>

          {/* Logo */}
          {/* Centred on mobile, as live has it. left/translate are physical
              properties, so this behaves the same regardless of RTL. */}
          <Link
            href="/"
            className="flex-shrink-0 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:translate-x-0 lg:translate-y-0"
            aria-label={`${BRAND_AR} — الصفحة الرئيسية`}
          >
            <Image
              src="/logo.png"
              alt={BRAND_SHORT_AR}
              width={132}
              height={44}
              className="h-[26px] lg:h-[44px] w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop Search */}
          <form
            onSubmit={handleSearch}
            className="hidden lg:flex flex-1 max-w-[480px] mx-auto items-center border-2 border-paper-dark rounded-sm overflow-hidden focus-within:border-brand transition-colors"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={"العنوان، المؤلف، القسم..."}
              aria-label={"بحث"}
              className="flex-1 px-4 py-[10px] text-[14px] border-none outline-none bg-paper placeholder:text-ink-muted"
            />
            <button type="submit" className="bg-brand text-white px-[18px] h-[42px] text-[13px] font-bold tracking-[0.03em] hover:bg-brand-dark transition-colors">
              بحث
            </button>
          </form>

          {/* Right icons */}
          <div className="flex items-center gap-3 md:gap-4 ms-auto">
            <button
              className="lg:hidden flex flex-col items-center gap-[2px]"
              onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileMenuOpen(false); }}
              aria-label="بحث"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            {/* Wishlist and account are hidden on mobile: live's mobile header
                is just search / logo / menu, and both are already reachable
                from the bottom tab bar. Six icons crammed into a 375px bar was
                the clutter in the screenshots. */}
            <Link href="/account/wishlist" aria-label="المفضلة"
              onClick={() => setMobileMenuOpen(false)}
              className="hidden lg:flex flex-col items-center gap-[2px]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
              </svg>
              <span className="text-[11px] text-ink-muted">المفضلة</span>
            </Link>


            {(() => {
              const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
              const href = session ? (isAdmin ? "/admin" : "/account") : "/login";
              const label = session ? (isAdmin ? "Admin" : session.user?.name?.split(" ")[0]) : "دخول";
              return (
                <Link href={href} aria-label={session ? "My account" : "Sign in"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="hidden lg:flex flex-col items-center gap-[2px]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className={`text-[11px] ${isAdmin ? "text-brand font-bold" : "text-ink-muted"}`}>{label}</span>
                </Link>
              );
            })()}

            {/* Cart likewise: desktop only, it is in the bottom tab bar on mobile. */}
            <span className="hidden lg:block" onClick={() => setMobileMenuOpen(false)}>
              <CartIcon />
            </span>
          </div>
        </div>
        </nav>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="lg:hidden bg-paper border-b border-paper-dark px-4 py-3 z-[99] sticky top-[60px]">
            <form onSubmit={handleSearch} className="flex items-center border-2 border-paper-dark rounded-sm overflow-hidden focus-within:border-brand transition-colors">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={"العنوان، المؤلف، القسم..."}
                autoFocus
                className="flex-1 px-4 py-[10px] text-[14px] border-none outline-none bg-paper placeholder:text-ink-muted"
              />
              <button type="submit" className="bg-brand text-white px-4 h-[42px] text-[13px] font-bold tracking-[0.03em] hover:bg-brand-dark transition-colors">
                بحث
              </button>
            </form>
          </div>
        )}

        {/* ── Department nav bar (desktop) ── */}
        <div className="hidden lg:block bg-paper border-b border-paper-dark sticky top-[72px] z-[101]">
        <div className="flex items-center w-[calc(100%-30px)] max-w-[1170px] mx-auto gap-0">

          {NAV_BEFORE_CATEGORIES.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              // Live paints the current page's nav item brand red.
              className={`px-[15px] py-[13px] text-[14px] font-normal whitespace-nowrap border-b-2 border-transparent transition-all hover:text-brand hover:border-brand ${
                pathname === link.href ? "text-brand" : "text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {navCategories.map((mother) => (
            <div
              key={mother.key}
              onMouseEnter={() => openMenu(mother.key)}
              onMouseLeave={scheduleClose}
            >
              {(() => {
                const cls = `flex items-center gap-1 px-[15px] py-[13px] text-[14px] font-normal whitespace-nowrap border-b-2 transition-all ${
                  hoveredMenu === mother.key
                    ? "text-brand border-brand"
                    : "text-ink border-transparent hover:text-brand hover:border-brand"
                }`;
                const inner = (
                  <>
                    {mother.label}
                    {mother.groups.length > 0 && (
                      <svg
                        width="10" height="10" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className={`mt-px opacity-60 transition-transform ${hoveredMenu === mother.key ? "rotate-180" : ""}`}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    )}
                  </>
                );
                return mother.href ? (
                  <Link href={mother.href} onClick={() => setHoveredMenu(null)} className={cls}>{inner}</Link>
                ) : (
                  <button type="button" className={cls}>{inner}</button>
                );
              })()}
            </div>
          ))}

          {NAV_AFTER_CATEGORIES.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              // Live paints the current page's nav item brand red.
              className={`px-[15px] py-[13px] text-[14px] font-normal whitespace-nowrap border-b-2 border-transparent transition-all hover:text-brand hover:border-brand ${
                pathname === link.href ? "text-brand" : "text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {session?.user && (session.user as { role?: string }).role === "ADMIN" && (
            <Link href="/admin" className="ms-auto px-4 py-[13px] text-brand text-[13px] font-bold whitespace-nowrap hover:text-brand-dark transition-colors">
              Admin
            </Link>
          )}
        </div>
        </div>

        {/* ── Mega-menu panel ─────────────────────────────────────
            Measured directly off the live panel. It is fetched over AJAX into
            an empty placeholder and then kept in the DOM behind
            visibility:hidden, so `jQuery(li).trigger("mouseenter")` is what
            loads it; once loaded its real geometry can be read exactly.

              panel    864px wide, white, border-top 1px #D0D0D0,
                       radius 0 0 3px 3px, no shadow, z-index 1000; its
                       start edge sits on the 1170px column's start edge
                       (live: panel right 1305 = hero right 1305), which is
                       what the max(15px, 50% - 585px) offset reproduces
                       without the panel having to live inside that column
              columns  5 equal 172.8px columns, 30px vertical padding.
                       Columns 2 and 4 (0-indexed 1 and 3) are striped
                       #F3F3F3; the rest are white.
              links    Cairo 14px / 28px / weight 400, #999999,
                       inset 28px from the start edge
              column 5 imprints, then a 1px black rule inset 28px each side
                       (15px of air above and below it), then "تصفح كل الكتب"
                       as a bold black 14px/24px heading — NOT a plain link

            The first four columns are topics; the fifth is imprints. That
            split is why this cannot be a CSS `column-count` flow: a flow
            would scatter the imprints through the topical columns, and CSS
            columns cannot be striped individually either.

            Deliberate deviations, both previously agreed: live's 4th column
            ends with an English Books link (removed from this store on
            purpose), and live's link hover resolves to #BCBCBC — lighter than
            its own #999999 base. That is genuinely what live does, so it is
            reproduced rather than "corrected".

            Colours are literal hexes, not theme tokens: they are live-site
            values with no counterpart in this store's palette. */}
        {activeMother && activeMother.groups.length > 0 && (
          <div
            className="hidden lg:block absolute start-[max(15px,calc(50%-585px))] w-[864px] max-w-[calc(100%-30px)] bg-white border-t border-[#D0D0D0] rounded-b-[3px] z-[102] overflow-hidden"
            onMouseEnter={() => openMenu(activeMother.key)}
            onMouseLeave={scheduleClose}
          >
            <div className="flex items-stretch">
              {topicColumns(activeMother.groups).map((column, i) => (
                <div
                  key={i}
                  className={`w-1/5 py-[30px] ${i % 2 === 1 ? "bg-[#F3F3F3]" : ""}`}
                >
                  <ul>
                    {column.map((c) => (
                      <li key={c.slug}>
                        <Link
                          href={`/category/${c.slug}`}
                          onClick={() => setHoveredMenu(null)}
                          className="block ps-7 text-[14px] font-normal leading-[28px] text-[#999999] hover:text-[#BCBCBC] transition-colors"
                        >
                          {loc(c.name, c.nameAr)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              {/* Fifth column: imprints, rule, then the browse-all heading.
                  Imprint links go to /publisher/<name>, which lists books by
                  that publisher — not to a category page. */}
              <div className="w-1/5 py-[30px]">
                <ul>
                  {(activeMother.publishers ?? []).map((p) => (
                    <li key={p.slug}>
                      <Link
                        href={`/publisher/${encodeURIComponent(loc(p.name, p.nameAr))}`}
                        onClick={() => setHoveredMenu(null)}
                        className="block ps-7 text-[14px] font-normal leading-[28px] text-[#999999] hover:text-[#BCBCBC] transition-colors"
                      >
                        {loc(p.name, p.nameAr)}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="mx-7 my-[15px] border-t border-black" />
                {/* Live sends this to /shop — the full catalogue — which this
                    store's own 301 map rewrites to /arabic-books. NOT /category,
                    which is the list of category names ("تصفّح التصنيفات"). */}
                <h4 className="ps-7 text-[14px] font-bold leading-[24px] text-black py-[6px]">
                  <Link href="/arabic-books" onClick={() => setHoveredMenu(null)} className="hover:text-brand transition-colors">
                    تصفح كل الكتب
                  </Link>
                </h4>
              </div>
            </div>
          </div>
        )}

        {/* ── Mobile menu drawer ── */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-paper relative z-[99] border-b border-paper-dark max-h-[80vh] overflow-y-auto">
            {NAV_BEFORE_CATEGORIES.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-ink text-[14px] font-semibold px-6 py-4 border-b border-paper-dark hover:text-brand transition-colors"
              >
                {link.label}
              </Link>
            ))}

            {navCategories.map((mother) => (
              <div key={mother.key}>
                <button
                  onClick={() => setExpandedMobile(expandedMobile === mother.key ? null : mother.key)}
                  className="w-full flex items-center justify-between text-paper-dark text-[14px] font-bold tracking-[0.05em] uppercase px-6 py-4 border-b border-ink-soft hover:text-white hover:bg-ink-soft transition-colors"
                >
                  <span>{mother.label}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className={`transition-transform ${expandedMobile === mother.key ? "rotate-180" : ""}`}>
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {expandedMobile === mother.key && (
                  <div className="bg-ink-soft">
                    {mother.href && (
                      <Link
                        href={mother.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block text-brand text-[13px] font-bold px-8 py-3 border-b border-white/10 hover:bg-white/5 transition-colors"
                      >
                        {`كل ${mother.label}`}
                      </Link>
                    )}
                    {mother.groups.map((group) => (
                      <div key={group.slug}>
                        <Link
                          href={`/category/${group.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block text-white text-[13px] font-bold px-8 py-3 border-b border-white/10 hover:bg-white/5 transition-colors"
                        >
                          {loc(group.name, group.nameAr)}
                        </Link>
                        {group.subcategories.map((sub) => (
                          <Link
                            key={sub.slug}
                            href={`/category/${sub.slug}`}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-paper-dark/80 text-[13px] px-12 py-2.5 border-b border-white/5 hover:text-white hover:bg-white/5 transition-colors"
                          >
                            {loc(sub.name, sub.nameAr)}
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {NAV_AFTER_CATEGORIES.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block text-ink text-[14px] font-semibold px-6 py-4 border-b border-paper-dark hover:text-brand transition-colors"
              >
                {link.label}
              </Link>
            ))}


            {session?.user && (session.user as { role?: string }).role === "ADMIN" && (
              <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="block text-brand text-[14px] font-bold px-6 py-4 hover:bg-ink-soft transition-colors">
                لوحة التحكم
              </Link>
            )}
          </div>
        )}
      </header>
    </>
  );
}
