"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { PriceDisplay } from "./PriceDisplay";
import { StarRating } from "./StarRating";
import { useCartStore } from "@/stores/cart.store";
import { effectivePrices, savingsPercent } from "@/lib/currency";
import type { BookSummary } from "@/types";
import { coverSrc } from "@/lib/coverSrc";
import { Byline } from "./Byline";

interface Props {
  book: BookSummary;
  showAddToCart?: boolean;
  priority?: boolean;
}

export function BookCard({ book, showAddToCart = true, priority = false }: Props) {

  const [added, setAdded] = useState(false);
  const router = useRouter();
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { addItem, openDrawer } = useCartStore();
  const { data: session } = useSession();

  const cartPayload = {
    id: book.id,
    bookId: book.id,
    title: book.title,
    author: book.author,
    coverUrl: book.coverUrl,
    slug: book.slug,
    ...effectivePrices(book),
  };

  function handleAddToCart(e: React.MouseEvent) {
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

  const displayTitle = book.title;
  const href = `/book/${book.slug}`;
  const discount = savingsPercent(book);

  /*
    Card width and the inner gutter are taken from the live site, measured at
    four widths. Live sizes each item as a plain fraction of the row's content
    box with NO flex gap — the visible gutter between covers is the card's own
    horizontal padding, doubled. Reproducing it that way (rather than as a gap)
    is what makes the cover come out at live's exact pixel size:

      viewport   per row   item      padding   cover
      375        2         172.5     15        142.5
      768        3         242       26        190
      1024       4         245.5     26        193.5
      1280       5         231.6     30        171.6

    These fall exactly on Tailwind's md/lg/xl breakpoints. The row must
    therefore carry gap-0, and its content box must be min(vw - 30, 1170)
    — see BookCarousel.
    */
  /*
    The card is a <div>, not one big <Link>. It used to be a single anchor
    around everything, which is why the byline had to be plain text: an <a>
    inside an <a> is invalid HTML, the parser un-nests it, and React then
    failed to hydrate every page with a card on it. Now the cover and the title
    are each a link to the book, and every contributor in the byline is a link
    of its own.
    */
  return (
    <div className="group flex flex-col flex-shrink-0 w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 px-[15px] md:px-[26px] xl:px-[30px] pt-[20px] xl:pt-[30px] pb-[20px] xl:pb-[61px] relative top-0 hover:-top-1 transition-[top] duration-300 ease-out">
      {/* Live keeps an empty 21px "product-top" row above the cover with 10px
          beneath it. It is empty on all 60 of its homepage tiles — no badges
          anywhere — so it is pure spacing, and reproduced as such. This card's
          own badges stay overlaid on the cover, where they cost no height. */}
      <div aria-hidden className="h-[26px] xl:h-[21px] mb-[10px]" />

      {/* Cover */}
      <div className="relative flex-shrink-0">
        <Link href={href} aria-label={displayTitle} className="block">
        {book.coverUrl ? (
          <Image
            src={coverSrc(book.coverUrl)}
            alt={displayTitle}
            width={172}
            height={172}
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 20vw"
            priority={priority}
            className="book-cover-img w-full aspect-square object-contain block"
          />
        ) : (
          <div className="book-cover-img w-full aspect-square bg-paper-mid flex items-center justify-center p-3">
            <span className="text-[11px] text-ink-muted text-center leading-snug">{displayTitle}</span>
          </div>
        )}
        </Link>

        {/* Badges — RTL-safe: start-2.
            The discount pill comes first: on a reduced title it is the single
            most useful thing on the card, and the store shows it the same way. */}
        <div className="absolute top-2 start-2 flex flex-col gap-1 items-start">
          {discount > 0 && (
            <span className="price-mono bg-white border border-brand text-brand text-[10px] font-bold px-1.5 py-[1px] rounded-full">
              -{discount}%
            </span>
          )}
          {book.isBestseller && (
            <span className="bg-brand text-white text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-wide">
              الأكثر مبيعًا
            </span>
          )}
          {book.isNewRelease && (
            <span className="bg-brand text-white text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-wide">
              جديد
            </span>
          )}
        </div>

        {/* Wishlist heart */}
        <button
          onClick={handleWishlist}
          disabled={wishlistLoading}
          aria-label={wishlisted ? "إزالة من المفضلة" : "أضف للمفضلة"}
          className={`absolute top-2 end-2 w-7 h-7 flex items-center justify-center bg-paper/85 backdrop-blur-sm transition-all duration-150 focus:opacity-100 ${
            wishlisted
              ? "opacity-100"
              : "sm:opacity-0 sm:group-hover:opacity-100"
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

      {/* Info */}
      {/* Caption. Live: 25px above the title, a 60px title+byline block at
          line-height 20 (two title lines + one byline line), then the price
          with 5px beneath it. */}
      <div className="pt-[17px] xl:pt-[25px] flex flex-col">
        {/* Live's grid title is 16.8px bold, not 14px regular — measured on its
            own product tiles at 1280. Two lines, then the byline. */}
        <Link href={href} className="block">
          <p dir="auto" className="font-display text-[16.8px] font-bold text-ink leading-[20px] line-clamp-2 overflow-hidden group-hover:text-brand transition-colors">
            {displayTitle}
          </p>
        </Link>
        {/* One 20px line per contributor role, each name linked. A translated
            book is one line taller than live's tile; rows still align because
            the buttons sit at mt-auto. */}
        <div className="mb-[5px] xl:mb-0">
          <Byline book={book} lineClassName="text-[14px] text-ink leading-[20px] h-[20px] line-clamp-1" />
        </div>

        {book.averageRating !== undefined && book.reviewCount !== undefined && (
          <StarRating rating={book.averageRating} count={book.reviewCount} />
        )}
        {/* Live's price line measures 21.5px tall with 5px beneath it. */}
        <PriceDisplay item={book} size="sm" className="mb-[5px] leading-[21.5px]" />
      </div>

      {/* Buy Now + Add to Cart, matching the deployed Jee listing exactly:
          the reveal is per-BUTTON, not on the wrapper.

            Add to Cart  no opacity gating at all — always visible, at every
                         width. This is the one that was missing on touch.
            Buy Now      opacity-0 + group-hover, so it is a desktop-only
                         affordance; add-to-cart already covers touch.

          An earlier attempt put the reveal on the shared wrapper, which hid
          BOTH buttons on desktop until hover. */}
      {showAddToCart && (
        <div className="mt-auto pt-2 flex flex-col gap-0">
          <button
            onClick={handleBuyNow}
            className="w-full py-[7px] bg-ink hover:bg-ink/80 text-white text-[13px] font-bold rounded-t-[3px] transition-all duration-150 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 focus:opacity-100 focus:translate-y-0"
            aria-label={`اشترِ ${displayTitle} الآن`}
          >
            اشترِ الآن
          </button>
          <button
            onClick={handleAddToCart}
            className="w-full py-[7px] bg-brand hover:bg-brand-dark text-white text-[13px] font-bold rounded-b-[3px] transition-colors"
            aria-label={`أضف ${displayTitle} إلى السلة`}
          >
            {added ? "تمت الإضافة ✓" : "إضافة إلى السلة"}
          </button>
        </div>
      )}

    </div>
  );
}
