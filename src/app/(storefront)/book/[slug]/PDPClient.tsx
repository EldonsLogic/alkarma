"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart.store";
import { useSession } from "next-auth/react";
import { PriceDisplay } from "@/components/storefront/PriceDisplay";
import { StarRating } from "@/components/storefront/StarRating";
import { BookCarousel } from "@/components/storefront/BookCarousel";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";
import { recordView } from "@/lib/recently-viewed";
import { BundleUpsell, type BundleUpsellItem } from "@/components/storefront/BundleUpsell";
import { formatPrice, getPrice, getCompareAtPrice, effectivePrices } from "@/lib/currency";
import { gtmViewItem, gtmAddToCart } from "@/lib/gtm";
import type { BookDetail, BookSummary, CommunityRating, EditorialReview } from "@/types";

interface ExternalReviewData {
  communityRatings: CommunityRating[];
  editorialReviews: EditorialReview[];
}

const STRINGS = {
    home: "الرئيسية",
    by: "تأليف",
    outOfStock: "نفد المخزون",
    lowStock: (n: number) => `${n} نسخ فقط — سارع بالطلب!`,
    inStock: "متوفر",
    notifyPrompt: "أعلمني عند توفره مرة أخرى",
    notifyPlaceholder: "بريدك الإلكتروني",
    notifyButton: "أعلمني",
    notifySending: "جارٍ الحفظ…",
    notifySuccess: "تم! سنراسلك فور توفر الكتاب.",
    notifyError: "حدث خطأ. حاول مرة أخرى.",
    addToBasket: "أضف إلى السلة",
    buyNow: "اشترِ الآن",
    added: "تمت الإضافة ✓",
    addedShort: "تمت الإضافة ✓",
    addToWishlist: "♡ أضف إلى المفضلة",
    inWishlist: "♥ في المفضلة",
    ships: "يتم توصيل الطلب خلال ٥-٦ أيام عمل (لا تتضمن الإجازات الأسبوعية: الجمعة والسبت، والإجازات الرسمية) وتبدأ المدة من اليوم الثاني للطلب",
    tabSynopsis: "الوصف",
    tabReviews: "المراجعات",
    tabDetails: "التفاصيل",
    dimensions: "المقاس",
    coverType: "نوع الغلاف",
    isbn: "الرقم الدولي",
    publisher: "الناشر",
    published: "سنة النشر",
    pages: "عدد الصفحات",
    language: "اللغة",
    langEn: "الإنجليزية",
    langAr: "العربية",
    youMayLike: "قد يعجبك أيضًا",
    customersAlso: "اشترى العملاء أيضًا",
    relatedBooks: "قد يعجبك أيضًا",
    similarBooks: "كتب مشابهة لاختيارك",
    moreBy: (author: string) => `المزيد من ${author}`,
    sameAuthor: "نفس المؤلف",
    bestseller: "الأكثر مبيعًا",
    newBadge: "جديد",
    noReviews: "لا توجد مراجعات بعد. كن أول من يراجع هذا الكتاب!",
    signInToReview: "سجل دخولك لكتابة مراجعة",
    signIn: "تسجيل الدخول",
    reviewThanks: "شكرًا على مراجعتك!",
    reviewPending: "ستظهر بعد مراجعتها من فريقنا.",
    writeReview: "اكتب مراجعة",
    yourRating: "تقييمك *",
    reviewTitle: "عنوان المراجعة",
    reviewTitlePlaceholder: "لخص رأيك",
    yourReview: "مراجعتك *",
    yourReviewPlaceholder: "ما رأيك في هذا الكتاب؟",
    submit: "إرسال المراجعة",
    submitting: "جارٍ الإرسال…",
    pleaseWrite: "يرجى كتابة مراجعة.",
    failedSubmit: "فشل إرسال المراجعة.",
  } as const;

interface Props {
  book: BookDetail;
  related: BookSummary[];
  similar: BookSummary[];
  moreByAuthor: BookSummary[];
  externalReviews?: ExternalReviewData;
  bundleUpsells?: BundleUpsellItem[];
}


export function PDPClient({ book, related, similar, moreByAuthor, externalReviews, bundleUpsells = [] }: Props) {
  const t = STRINGS;
  // Gallery: main cover + any additional photos
  const galleryImages = Array.from(new Set([book.coverUrl, ...(book.images ?? [])].filter(Boolean)));
  const [activeImage, setActiveImage] = useState(book.coverUrl);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const { addItem, openDrawer } = useCartStore();
  const { data: session } = useSession();
  const router = useRouter();
  const atcRef = useRef<HTMLButtonElement>(null);

  const inStock = book.stock > 0;
  const lowStock = book.stock > 0 && book.stock <= 3;

  // Remember this book for the visitor's "آخر المشاهدات" strip.
  useEffect(() => {
    recordView(book.slug);
  }, [book.slug]);

  // GA4 view_item
  useEffect(() => {
    gtmViewItem(
      {
        item_id: book.slug,
        item_name: book.title,
        item_brand: book.author,
        price: getPrice(book),
        quantity: 1,
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  useEffect(() => {
    if (!session) return;
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((data: { items?: { bookId: string }[] }) => {
        setWishlisted(data.items?.some((i) => i.bookId === book.id) ?? false);
      })
      .catch(() => {});
  }, [session, book.id]);

  useEffect(() => {
    const el = atcRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cartPayload = {
    id: book.id,
    bookId: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    slug: book.slug,
    ...effectivePrices(book),
  };

  function handleAddToCart() {
    addItem({ ...cartPayload, quantity: qty });
    setAdded(true);
    openDrawer();
    setTimeout(() => setAdded(false), 2000);
    gtmAddToCart(
      { item_id: book.slug, item_name: book.title, item_brand: book.author, price: getPrice(book), quantity: qty }
    );
  }

  function handleBuyNow() {
    addItem({ ...cartPayload, quantity: qty });
    router.push("/cart");
  }

  async function handleWishlist() {
    if (!session) { window.location.href = "/login"; return; }
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

  const displayTitle = book.title;
  const displaySynopsis = book.synopsisAr ? book.synopsisAr : book.synopsis;

  return (
    <>
      {/* Breadcrumb */}
      <nav className="px-4 sm:px-10 py-[12px] text-[11px] text-ink-muted flex gap-2 items-center bg-paper-mid border-b border-paper-dark overflow-x-auto whitespace-nowrap font-mono tracking-wide uppercase">
        <Link href="/" className="hover:text-brand transition-colors">{t.home}</Link>
        <span className="text-paper-dark">›</span>
        {book.categories[0] && (
          <>
            <Link href={`/category/${book.categories[0].slug}`} className="hover:text-brand transition-colors">
              {book.categories[0].nameAr ? book.categories[0].nameAr : book.categories[0].name}
            </Link>
            <span className="text-paper-dark">›</span>
          </>
        )}
        <span className="text-ink font-bold truncate max-w-[200px]">{displayTitle}</span>
      </nav>

      <div className="px-4 sm:px-10 py-8 sm:py-12 grid grid-cols-1 md:grid-cols-[224px_1fr] lg:grid-cols-[256px_1fr_272px] gap-6 sm:gap-10 max-w-[1280px] mx-auto">

        {/* ── Col 1: Cover + gallery ── */}
        <div className="flex flex-col items-center md:items-start">
          <div className="relative aspect-[2/3] w-full max-w-[256px]">
            {activeImage ? (
              // object-contain: covers that aren't a clean 2:3 ratio are shown in full,
              // letterboxed on bg-paper (matches the page background) instead of cropped.
              <Image
                key={activeImage}
                src={activeImage}
                alt={displayTitle}
                fill
                className="cover-img object-contain"
                priority
                sizes="(max-width: 768px) 80vw, 256px"
              />
            ) : (
              <div className="w-full h-full bg-paper-mid flex items-center justify-center">
                <span className="text-ink-muted text-[14px] px-4 text-center">{displayTitle}</span>
              </div>
            )}
            {book.isBestseller && (
              <span className="absolute top-3 start-3 bg-brand text-white text-[11px] font-black px-2.5 py-1 uppercase tracking-wide">{t.bestseller}</span>
            )}
            {book.isNewRelease && !book.isBestseller && (
              <span className="absolute top-3 start-3 bg-ink text-paper text-[11px] font-bold px-2.5 py-1 uppercase tracking-wide">{t.newBadge}</span>
            )}
          </div>

          {/* Thumbnails — only when there's more than one photo */}
          {galleryImages.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-3 max-w-[256px]">
              {galleryImages.map((img) => (
                <button
                  key={img}
                  type="button"
                  onMouseEnter={() => setActiveImage(img)}
                  onClick={() => setActiveImage(img)}
                  aria-label="عرض الصورة"
                  className={`relative w-[48px] h-[72px] flex-shrink-0 overflow-hidden border-2 transition-colors ${
                    activeImage === img ? "border-brand" : "border-paper-dark hover:border-brand/60"
                  }`}
                >
                  <Image src={img} alt="" fill className="cover-img object-contain" sizes="48px" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Col 2: Title / Author / Rating / Tabs ── */}
        <div className="min-w-0">
          <h1 className="font-display font-bold text-ink leading-tight mb-2"
            style={{ fontSize: "clamp(22px, 3vw, 36px)" }}>
            {displayTitle}
          </h1>
          {book.subtitle && <p className="text-[15px] text-ink-muted mb-3 font-light">{book.subtitle}</p>}

          <p className="text-[18px] sm:text-[20px] mb-1">
            <span className="text-ink-muted font-normal">{t.by} </span>
            {book.authors && book.authors.length > 0 ? (
              book.authors.map((a, i) => (
                <span key={a.slug}>
                  {i > 0 && <span className="text-ink-muted">{"، "}</span>}
                  <Link href={`/author/${a.slug}`} className="text-brand font-semibold hover:underline">
                    {a.name}
                  </Link>
                </span>
              ))
            ) : book.authorSlug ? (
              <Link href={`/author/${book.authorSlug}`} className="text-brand font-semibold hover:underline">
                {book.author}
              </Link>
            ) : (
              <span className="text-brand font-semibold">{book.author}</span>
            )}
          </p>
          {book.translator && (
            <p className="text-[13px] text-ink-muted mb-1">
              {"ترجمة: "}
              <Link href={`/translator/${encodeURIComponent(book.translator)}`} className="text-ink-soft hover:text-brand hover:underline">
                {book.translator}
              </Link>
            </p>
          )}
          {book.editor && (
            <p className="text-[13px] text-ink-muted mb-3">
              {"تحرير: "}
              <span className="text-ink-soft">{book.editor}</span>
            </p>
          )}

          {/* Tags — clickable, searchable labels (publisher is included by default) */}
          {book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {book.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="px-2.5 py-1 text-[11px] font-medium text-ink-soft bg-paper-mid border border-paper-dark rounded-full hover:border-brand hover:text-brand transition-colors"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {(book.reviewCount ?? 0) > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={book.averageRating ?? 0} count={book.reviewCount} size="md" />
            </div>
          )}

          {/* Buy box — mobile/md only (hidden on lg where right col takes over) */}
          <div className="lg:hidden mb-6">
            <BuyBox
              book={book}
              inStock={inStock}
              lowStock={lowStock}
              added={added}
              wishlisted={wishlisted}
              wishlistLoading={wishlistLoading}
              atcRef={atcRef}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onWishlist={handleWishlist}
              qty={qty}
              setQty={setQty}
              t={t}
            />
          </div>

          {/* Content sections — the store presents these stacked under the
              product, not behind tabs, so every section is visible and
              indexable without interaction. */}
          <div className="border-t border-paper-dark mt-6 pt-6 space-y-9">
            <section>
              <h2 className="font-display text-[19px] font-bold text-brand mb-3">{t.tabSynopsis}</h2>
              <div className="space-y-4 text-[15px] sm:text-[16px] leading-[1.9] text-ink">
                {displaySynopsis
                  .split(/\n+/)
                  .map((para) => para.trim())
                  .filter(Boolean)
                  .map((para, i) => (
                    <p key={i} className="font-normal">{para}</p>
                  ))}
              </div>
            </section>

            <section>
              <h2 className="font-display text-[19px] font-bold text-brand mb-3">{t.tabDetails}</h2>
              <dl className="space-y-3">
                {book.publisher && (
                  <div className="flex gap-4 border-b border-paper-dark pb-3">
                    <dt className="text-[13px] text-ink-muted w-[140px] flex-shrink-0 pt-0.5">{t.publisher}</dt>
                    <dd className="text-[14px]">
                      <Link href={`/publisher/${encodeURIComponent(book.publisher)}`} className="text-ink-soft hover:text-brand hover:underline">
                        {book.publisher}
                      </Link>
                    </dd>
                  </div>
                )}
                {(
                  [
                    [t.pages, book.pageCount?.toString()],
                    [t.dimensions, book.dimensions],
                    [t.coverType, book.coverType],
                    [t.published, book.publishDate ? new Date(book.publishDate).getFullYear().toString() : null],
                    [t.isbn, book.isbn],
                  ] as [string, string | null | undefined][]
                )
                  .filter(([, v]) => v)
                  .map(([label, value]) => (
                    <div key={label} className="flex gap-4 border-b border-paper-dark pb-3">
                      <dt className="text-[13px] text-ink-muted w-[140px] flex-shrink-0 pt-0.5">{label}</dt>
                      <dd className="text-[14px] text-ink-soft">{value}</dd>
                    </div>
                  ))}
              </dl>
            </section>

            <section>
              <h2 className="font-display text-[19px] font-bold text-brand mb-3">{t.tabReviews}</h2>
              <ReviewsTab book={book} session={session} t={t} externalReviews={externalReviews} />
            </section>
          </div>
        </div>

        {/* ── Col 3: Buy box — desktop only (sticky) ── */}
        <div className="hidden lg:block">
          <div className="sticky top-[100px]">
            <BuyBox
              book={book}
              inStock={inStock}
              lowStock={lowStock}
              added={added}
              wishlisted={wishlisted}
              wishlistLoading={wishlistLoading}
              atcRef={atcRef}
              onAddToCart={handleAddToCart}
              onBuyNow={handleBuyNow}
              onWishlist={handleWishlist}
              qty={qty}
              setQty={setQty}
              t={t}
            />
          </div>
        </div>

      </div>

      {/* Bundle upsell — only when this book belongs to a bundle */}
      {bundleUpsells.length > 0 && (
        <div className="px-4 sm:px-10 max-w-[1280px] mx-auto">
          <BundleUpsell bundles={bundleUpsells} />
        </div>
      )}

      {/* Related / More by author */}
      {related.length > 0 && (
        <div className="border-t border-paper-dark">
          <BookCarousel title={t.relatedBooks} books={related} />
        </div>
      )}
      {similar.length > 0 && (
        <div className="max-w-[1200px] mx-auto">
          <BookCarousel title={t.similarBooks} books={similar} />
        </div>
      )}

      {moreByAuthor.length > 0 && (
        <div className="border-t border-paper-dark bg-paper-mid">
          <BookCarousel title={t.moreBy(book.author)} overline={t.sameAuthor} books={moreByAuthor} />
        </div>
      )}

      <RecentlyViewed excludeSlug={book.slug} />

      {/* ─── Sticky Buy Bar ─────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-[64px] sm:bottom-0 left-0 right-0 z-[70] border-t border-paper-dark bg-paper shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-300 ease-out ${
          showStickyBar ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-10 py-3 flex items-center gap-4">
          {book.coverUrl && (
            <div className="relative w-10 h-[60px] flex-shrink-0 hidden sm:block">
              <Image src={book.coverUrl} alt={displayTitle} fill className="cover-img object-contain" />
            </div>
          )}
          <div className="flex-1 min-w-0 hidden sm:block">
            <p className="font-display font-semibold text-ink text-[15px] leading-snug truncate">{displayTitle}</p>
            <p className="text-[12px] text-ink-muted truncate">{book.author}</p>
          </div>
          <div className="flex items-baseline gap-2 flex-shrink-0">
            <span className="price-mono text-[20px] font-medium text-brand">
              {formatPrice(getPrice(book))}
            </span>
            {getCompareAtPrice(book) != null && (
              <span className="price-mono text-[13px] text-ink-muted/70 line-through">
                {formatPrice(getCompareAtPrice(book)!)}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleBuyNow}
              disabled={!inStock}
              className="px-5 sm:px-6 py-3 bg-ink hover:bg-ink/80 disabled:opacity-50 text-paper text-[13px] font-bold uppercase tracking-[0.06em] transition-colors"
            >
              {t.buyNow}
            </button>
            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className="px-5 sm:px-7 py-3 bg-brand hover:bg-brand-dark disabled:opacity-50 text-white text-[13px] font-bold uppercase tracking-[0.06em] transition-colors"
            >
              {added ? t.addedShort : t.addToBasket}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Buy Box ─────────────────────────────────────────────────────────────────

interface BuyBoxProps {
  book: BookDetail;
  inStock: boolean;
  lowStock: boolean;
  added: boolean;
  wishlisted: boolean;
  wishlistLoading: boolean;
  atcRef: React.RefObject<HTMLButtonElement>;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onWishlist: () => void;
  qty: number;
  setQty: (n: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: any;
}

function BuyBox({ book, inStock, lowStock, added, wishlisted, wishlistLoading, atcRef, onAddToCart, onBuyNow, onWishlist, qty, setQty, t }: BuyBoxProps) {
  return (
    <div className="border border-paper-dark bg-paper p-5 space-y-4">
      {/* Price */}
      <div>
        <PriceDisplay item={book} size="lg" />
      </div>

      {/* Stock alert — only for out-of-stock or low-stock (nothing when comfortably in stock) */}
      {!inStock ? (
        <div className="bg-red-50 border border-red-200 px-3 py-2.5 text-[13px] font-bold text-red-600">
          {t.outOfStock}
        </div>
      ) : lowStock ? (
        <div className="bg-brand-pale border border-brand/40 px-3 py-2.5 text-[13px] font-bold text-brand">
          ⚠ {t.lowStock(book.stock)}
        </div>
      ) : null}

      {/* In stock → buy actions.  Out of stock → notify-me form.
          Layout mirrors the store's own product page: in RTL reading order the
          row runs quantity → add-to-cart (grey) → buy-now (brand red) → heart. */}
      {inStock ? (
        <div className="flex items-stretch gap-2 flex-wrap">
          {/* Quantity stepper */}
          <div className="flex items-center border border-paper-dark rounded-sm h-[46px]">
            <button
              type="button"
              onClick={() => setQty(Math.min(99, qty + 1))}
              aria-label="زيادة الكمية"
              className="w-9 h-full text-[16px] text-ink-muted hover:text-brand transition-colors"
            >
              +
            </button>
            <span className="price-mono w-8 text-center text-[14px] font-bold text-ink" aria-live="polite">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(Math.max(1, qty - 1))}
              disabled={qty <= 1}
              aria-label="تقليل الكمية"
              className="w-9 h-full text-[16px] text-ink-muted hover:text-brand disabled:opacity-30 disabled:hover:text-ink-muted transition-colors"
            >
              −
            </button>
          </div>

          <button
            ref={atcRef}
            onClick={onAddToCart}
            className="flex-1 min-w-[150px] h-[46px] px-5 bg-[#BCBCBC] hover:bg-[#a9a9a9] text-white text-[14px] font-bold rounded-sm transition-colors"
          >
            {added ? t.added : t.addToBasket}
          </button>

          <button
            onClick={onBuyNow}
            className="flex-1 min-w-[120px] h-[46px] px-5 bg-brand hover:bg-brand-dark text-white text-[14px] font-bold rounded-sm transition-colors"
          >
            {t.buyNow}
          </button>

          <button
            onClick={onWishlist}
            disabled={wishlistLoading}
            aria-label={wishlisted ? t.inWishlist : t.addToWishlist}
            title={wishlisted ? t.inWishlist : t.addToWishlist}
            className={`w-[46px] h-[46px] flex items-center justify-center rounded-sm border transition-colors ${
              wishlisted
                ? "border-brand text-brand bg-brand-pale"
                : "border-paper-dark text-ink-muted hover:border-brand hover:text-brand"
            }`}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill={wishlisted ? "currentColor" : "none"}
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
            </svg>
          </button>
        </div>
      ) : (
        <NotifyMeForm bookId={book.id} t={t} />
      )}

      {/* Delivery info */}
      <div className="bg-paper-mid border border-paper-dark p-3 text-[12px] text-ink-soft leading-[1.9]">
        <p>📦 {t.ships}</p>
      </div>
    </div>
  );
}

// ─── Notify me when back in stock ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function NotifyMeForm({ bookId, t }: { bookId: string; t: any }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch("/api/stock-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId, email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="text-[13px] text-green-700 bg-green-50 border border-green-200 px-3 py-2.5 font-semibold">
        ✓ {t.notifySuccess}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <p className="text-[12px] text-ink-soft font-semibold">{t.notifyPrompt}</p>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder={t.notifyPlaceholder}
          className="flex-1 min-w-0 px-3 py-2.5 border border-paper-dark bg-paper text-[13px] text-ink outline-none focus:border-brand placeholder:text-ink-muted"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="px-4 py-2.5 bg-ink hover:bg-brand text-paper text-[12px] font-bold uppercase tracking-wide transition-colors disabled:opacity-60 whitespace-nowrap"
        >
          {status === "sending" ? t.notifySending : t.notifyButton}
        </button>
      </div>
      {status === "error" && <p className="text-red-600 text-[12px]">{t.notifyError}</p>}
    </form>
  );
}

// ─── Reviews Tab ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReviewsTab({ book, session, t, externalReviews }: {
  book: BookDetail; session: any; t: any;
  externalReviews?: ExternalReviewData;
}) {
  const [reviews, setReviews] = useState(book.reviews);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const alreadyReviewed = session && reviews.some(
    (r) => r.user.firstName === session.user?.name?.split(" ")[0]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) { setError(t.pleaseWrite); return; }
    setError("");
    setSubmitting(true);
    const res = await fetch(`/api/books/${book.slug}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, title, body }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error ?? t.failedSubmit); return; }
    setSubmitted(true);
  }

  const dateLocale = "ar-EG";
  const hasExternal =
    (externalReviews?.communityRatings?.length ?? 0) > 0 ||
    (externalReviews?.editorialReviews?.length ?? 0) > 0;

  return (
    <div className="space-y-8">

      {/* ── Community ratings from external sources ──────────────────── */}
      {(externalReviews?.communityRatings?.length ?? 0) > 0 && (
        <div className="border border-paper-dark bg-paper p-5">
          <p className="price-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-4">
            التقييم العالمي
          </p>
          <div className="flex flex-wrap gap-6">
            {externalReviews!.communityRatings.map((cr) => {
              const full = Math.floor(cr.rating);
              const half = cr.rating - full >= 0.4;
              return (
                <a
                  key={cr.source}
                  href={cr.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 ${cr.url ? "hover:opacity-80" : "pointer-events-none"}`}
                >
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg key={i} width="13" height="13" viewBox="0 0 24 24"
                          fill={i < full ? "#c8622a" : (i === full && half) ? "url(#half)" : "none"}
                          stroke="#c8622a" strokeWidth="1.5">
                          {i === full && half && (
                            <defs>
                              <linearGradient id="half">
                                <stop offset="50%" stopColor="#c8622a"/>
                                <stop offset="50%" stopColor="transparent"/>
                              </linearGradient>
                            </defs>
                          )}
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                      ))}
                      <span className="font-bold text-ink text-[14px] ms-1">{cr.rating.toFixed(1)}</span>
                    </div>
                    <p className="price-mono text-[10px] text-ink-muted">
                      {cr.count.toLocaleString()} تقييم &middot; <span className="uppercase tracking-wide">{cr.label}</span>
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Editorial reviews ─────────────────────────────────────────── */}
      {(externalReviews?.editorialReviews?.length ?? 0) > 0 && (
        <div>
          <p className="price-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-3">
            مراجعات نقدية
          </p>
          <ul className="space-y-4">
            {externalReviews!.editorialReviews.map((er, i) => (
              <li key={i} className="border border-paper-dark bg-paper p-5">
                <p className="text-[14px] text-ink-soft leading-relaxed font-light italic mb-3">
                  &ldquo;{er.summary}&rdquo;
                </p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    {er.byline && (
                      <p className="text-[12px] font-bold text-ink">{er.byline}</p>
                    )}
                    <span className="text-[11px] font-bold text-ink-muted bg-paper-dark px-2 py-0.5 uppercase tracking-wide">
                      {er.label}
                    </span>
                  </div>
                  {er.url && (
                    <a href={er.url} target="_blank" rel="noopener noreferrer"
                      className="text-[12px] text-brand hover:underline">
                      قراءة المراجعة ↗
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Divider between external and customer reviews ─────────────── */}
      {hasExternal && reviews.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-paper-dark" />
          <span className="price-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
            مراجعات العملاء
          </span>
          <div className="flex-1 h-px bg-paper-dark" />
        </div>
      )}

      {/* ── Customer reviews ──────────────────────────────────────────── */}
      {reviews.length === 0 && !submitted && !hasExternal ? (
        <p className="text-ink-muted">{t.noReviews}</p>
      ) : reviews.length > 0 || submitted ? (
        <ul className="space-y-4">
          {reviews.map((r) => (
            <li key={r.id} className="border border-paper-dark bg-paper p-5">
              <div className="flex items-start gap-3 mb-2">
                <div>
                  <StarRating rating={r.rating} />
                  <p className="text-[13px] font-bold text-ink mt-1">
                    {r.user.firstName} {r.user.lastName}
                  </p>
                  <p className="price-mono text-[11px] text-ink-muted">
                    {new Date(r.createdAt).toLocaleDateString(dateLocale, { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
              </div>
              {r.title && <p className="font-display font-semibold text-[15px] mb-1 text-ink">{r.title}</p>}
              <p className="text-[14px] text-ink-soft leading-relaxed font-light">{r.body}</p>
            </li>
          ))}
        </ul>
      ) : null}

      {/* ── Write a review ────────────────────────────────────────────── */}
      {!session ? (
        <div className="border border-paper-dark bg-paper-mid p-5 text-center">
          <p className="text-[14px] text-ink-muted mb-3">{t.signInToReview}</p>
          <Link href="/login" className="inline-block px-6 py-2 bg-brand hover:bg-brand-dark text-white font-bold text-[13px] uppercase tracking-wide transition-colors">
            {t.signIn}
          </Link>
        </div>
      ) : submitted ? (
        <div className="border border-green-200 bg-green-50 rounded-sm p-5 text-center">
          <p className="text-[15px] font-bold text-green-700 mb-1">{t.reviewThanks}</p>
          <p className="text-[13px] text-green-600">{t.reviewPending}</p>
        </div>
      ) : alreadyReviewed ? null : (
        <div className="border border-paper-dark bg-paper p-5">
          <h3 className="font-display text-[18px] font-bold text-ink mb-4">{t.writeReview}</h3>
          {error && <p className="text-red-600 text-[13px] mb-3 bg-red-50 px-3 py-2 border border-red-200">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block price-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted mb-2">{t.yourRating}</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button key={s} type="button" onClick={() => setRating(s)}
                    className={`text-[28px] transition-colors ${s <= rating ? "text-brand" : "text-[#ddd] hover:text-brand"}`}>
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block price-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted mb-1.5">{t.reviewTitle}</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder={t.reviewTitlePlaceholder}
                className="w-full px-4 py-3 border border-paper-dark bg-paper text-[14px] text-ink outline-none focus:border-brand transition-colors placeholder:text-ink-muted" />
            </div>
            <div>
              <label className="block price-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted mb-1.5">{t.yourReview}</label>
              <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4}
                placeholder={t.yourReviewPlaceholder}
                className="w-full px-4 py-3 border border-paper-dark bg-paper text-[14px] text-ink outline-none focus:border-brand resize-y transition-colors placeholder:text-ink-muted" />
            </div>
            <button type="submit" disabled={submitting}
              className="px-8 py-3 bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-wide text-[14px] transition-colors disabled:opacity-60">
              {submitting ? t.submitting : t.submit}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
