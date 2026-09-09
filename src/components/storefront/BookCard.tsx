"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { PriceDisplay } from "./PriceDisplay";
import { StarRating } from "./StarRating";
import { useCartStore } from "@/stores/cart.store";
import { effectivePrices, savingsPercent } from "@/lib/currency";
import type { BookSummary } from "@/types";

interface Props {
  book: BookSummary;
  showAddToCart?: boolean;
  priority?: boolean;
}

/** Live prefixes the byline on its product tiles, e.g. "تأليف: ميرنا المهدي". */
const BYLINE = "تأليف: ";

/**
 * Live never reveals the add-to-cart control on its product tiles — see the
 * note at the button below. Flip to true to restore it everywhere at once.
 */
const SHOW_GRID_ADD_TO_CART = false;

export function BookCard({ book, showAddToCart = true, priority = false }: Props) {

  const [added, setAdded] = useState(false);
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
  return (
    <Link href={`/book/${book.slug}`} className="group flex flex-col flex-shrink-0 cursor-pointer w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 px-[15px] md:px-[26px] xl:px-[30px]">
      {/* Cover */}
      <div className="relative flex-shrink-0">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={displayTitle}
            width={172}
            height={172}
            sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, (max-width: 1279px) 25vw, 20vw"
            priority={priority}
            className="book-cover-img w-full aspect-square object-contain block bg-paper"
          />
        ) : (
          <div className="book-cover-img w-full aspect-square bg-paper-mid flex items-center justify-center p-3">
            <span className="text-[11px] text-ink-muted text-center leading-snug">{displayTitle}</span>
          </div>
        )}

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
              : "opacity-0 group-hover:opacity-100"
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
      <div className="pt-[10px] pb-1 flex flex-col flex-1">
        {/* Live's grid title is 16.8px bold, not 14px regular — measured on its
            own product tiles at 1280. Two lines, then the byline. */}
        <p dir="auto" className="font-display text-[16.8px] font-bold text-ink leading-snug line-clamp-2 mb-[3px] h-[48px] overflow-hidden">
          {displayTitle}
        </p>
        {book.authors && book.authors.length > 0 ? (
          <p dir="auto" className="text-[14px] text-ink mb-[5px] line-clamp-1">
            {BYLINE}
            {book.authors.map((a, i) => (
              <span key={a.slug}>
                {i > 0 && "، "}
                <Link
                  href={`/author/${a.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-brand transition-colors"
                >
                  {a.name}
                </Link>
              </span>
            ))}
          </p>
        ) : book.authorSlug ? (
          <Link
            href={`/author/${book.authorSlug}`}
            onClick={(e) => e.stopPropagation()}
            dir="auto"
            className="text-[14px] text-ink hover:text-brand transition-colors mb-[5px] line-clamp-1 block"
          >
            {BYLINE}{book.author}
          </Link>
        ) : (
          <p dir="auto" className="text-[14px] text-ink mb-[5px] line-clamp-1">{BYLINE}{book.author}</p>
        )}
        {book.averageRating !== undefined && book.reviewCount !== undefined && (
          <StarRating rating={book.averageRating} count={book.reviewCount} />
        )}
        <PriceDisplay item={book} size="sm" className="mt-1" />
      </div>

      {/* Card action.
          Verified against the live site with a REAL pointer hover (a
          JS-dispatched mouseenter cannot fire CSS :hover, so it proves
          nothing here): live's tile button never appears. Its .group-buttons
          wrapper computes visibility:hidden / opacity:0 both at rest AND while
          .product-block:hover is genuinely true, and all 60 tiles on the
          homepage report hidden/0. Live's stylesheet carries a
          "tbay-body-woocommerce-catalog-mod" class, so this reads as a
          deliberate catalogue mode rather than an accident.

          Matched by default. Note live still RESERVES the button's 35px of
          layout space, which is why hiding it here changes no tile heights.
          Set SHOW_GRID_ADD_TO_CART to true to put the control back — it is a
          real conversion affordance, just not one the live site uses. */}
      {SHOW_GRID_ADD_TO_CART && showAddToCart && (
        <div className="mt-auto pt-2 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <button
            onClick={handleAddToCart}
            className="w-full py-[7px] bg-[#BCBCBC] hover:bg-[#a9a9a9] text-white text-[13px] font-bold rounded-[3px] transition-colors"
            aria-label={`أضف ${displayTitle} إلى السلة`}
          >
            {added ? "تمت الإضافة ✓" : "إضافة إلى السلة"}
          </button>
        </div>
      )}

      {/* Live leaves the hidden control's 35px of space in the tile. Kept so
          tiles keep a consistent height and match live's proportions. */}
      {!SHOW_GRID_ADD_TO_CART && showAddToCart && <div aria-hidden className="mt-auto pt-2 h-[35px]" />}
    </Link>
  );
}
