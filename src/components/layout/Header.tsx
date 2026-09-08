"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
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
  groups: NavGroup[];
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

const NAV_AFTER_CATEGORIES = [
  { label: "كتب أطفال", href: "/category/children" },
  { label: "أدوات مكتبية", href: "/category/stationery" },
  { label: "موزعينا", href: "/distributors" },
];

export function Header({ navCategories }: Props) {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null);
  const [expandedMobile, setExpandedMobile] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

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
        <nav className="bg-paper border-b border-paper-dark px-4 md:px-10 flex items-center gap-3 md:gap-6 h-[60px] md:h-[72px] sticky top-0 z-[101] shadow-[0_1px_4px_rgba(26,18,8,0.07)]">

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
          <Link href="/" className="flex-shrink-0" aria-label={`${BRAND_AR} — الصفحة الرئيسية`}>
            <Image
              src="/logo.png"
              alt={BRAND_SHORT_AR}
              width={132}
              height={44}
              className="h-[36px] md:h-[44px] w-auto object-contain"
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
          <div className="flex items-center gap-3 md:gap-4 ml-auto">
            <button
              className="lg:hidden flex flex-col items-center gap-[2px]"
              onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileMenuOpen(false); }}
              aria-label="بحث"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>

            <Link href="/account/wishlist" aria-label="المفضلة"
              onClick={() => setMobileMenuOpen(false)}
              className="flex flex-col items-center gap-[2px]">
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
                  className="flex flex-col items-center gap-[2px]">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className={`text-[11px] ${isAdmin ? "text-brand font-bold" : "text-ink-muted"}`}>{label}</span>
                </Link>
              );
            })()}

            <span onClick={() => setMobileMenuOpen(false)}>
              <CartIcon />
            </span>
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
        <div className="hidden lg:flex items-center bg-paper border-b border-paper-dark sticky top-[72px] z-[101] px-4 lg:px-10 gap-0">

          {NAV_BEFORE_CATEGORIES.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-5 py-[13px] text-[14px] font-normal whitespace-nowrap border-b-2 border-transparent text-ink hover:text-brand hover:border-brand transition-all"
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
                const cls = `flex items-center gap-1 px-5 py-[13px] text-[14px] font-normal whitespace-nowrap border-b-2 transition-all ${
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
              className="px-5 py-[13px] text-[14px] font-normal whitespace-nowrap border-b-2 border-transparent text-ink hover:text-brand hover:border-brand transition-all"
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

        {/* ── Mega-menu panel ──────────────────────────────────────────────
            Mirrors the live site: a single "تصفح كل الكتب" heading above a
            flat five-column list of category links. It is deliberately NOT a
            set of bold group headers with sub-lists — the live menu has one
            heading and 33 plain links, and the heavier treatment was the main
            reason this section didn't read like the real thing. */}
        {activeMother && activeMother.groups.length > 0 && (
          <div
            className="hidden lg:block absolute start-0 end-0 bg-paper shadow-[0_8px_32px_rgba(0,0,0,0.14)] z-[102] border-t border-paper-dark"
            onMouseEnter={() => openMenu(activeMother.key)}
            onMouseLeave={scheduleClose}
          >
            <div className="px-4 lg:px-10 py-7">
              <Link
                href="/category"
                onClick={() => setHoveredMenu(null)}
                className="inline-block font-display text-[20px] font-bold text-brand mb-5 hover:text-brand-dark transition-colors"
              >
                تصفح كل الكتب
              </Link>
              {/* CSS columns so links flow down each column, as on the live site */}
              <ul className="[column-count:2] md:[column-count:3] lg:[column-count:5] [column-gap:2rem]">
                {activeMother.groups.flatMap((group) => [
                  { slug: group.slug, label: loc(group.name, group.nameAr) },
                  ...group.subcategories.map((sub) => ({
                    slug: sub.slug,
                    label: loc(sub.name, sub.nameAr),
                  })),
                ]).map((c) => (
                  <li key={c.slug} className="break-inside-avoid">
                    <Link
                      href={`/category/${c.slug}`}
                      onClick={() => setHoveredMenu(null)}
                      className="block py-[5px] text-[14px] text-ink hover:text-brand transition-colors"
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
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
