"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
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

export function BookCard({ book, showAddToCart = true, priority = false }: Props) {

  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { addItem, openDrawer } = useCartStore();
  const { data: session } = useSession();
  const router = useRouter();

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
  const discount = savingsPercent(book);

  return (
    <Link href={`/book/${book.slug}`} className="group flex flex-col w-[140px] flex-shrink-0 cursor-pointer">
      {/* Cover */}
      <div className="relative flex-shrink-0">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={displayTitle}
            width={140}
            height={210}
            sizes="(max-width: 640px) 120px, 140px"
            priority={priority}
            className="book-cover-img w-[140px] h-[210px] object-cover block shadow-book"
          />
        ) : (
          <div className="book-cover-img w-[140px] h-[210px] bg-gradient-to-br from-paper-dark to-paper-mid flex items-center justify-center shadow-book p-3">
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
        <p dir="auto" className="font-display text-[13px] font-semibold text-ink leading-snug line-clamp-2 mb-[3px] h-[40px] overflow-hidden">
          {displayTitle}
        </p>
        {book.authors && book.authors.length > 0 ? (
          <p dir="auto" className="text-[12px] text-ink-muted mb-[5px] line-clamp-1">
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
            className="text-[12px] text-ink-muted hover:text-brand transition-colors mb-[5px] line-clamp-1 block"
          >
            {book.author}
          </Link>
        ) : (
          <p dir="auto" className="text-[12px] text-ink-muted mb-[5px] line-clamp-1">{book.author}</p>
        )}
        {book.averageRating !== undefined && book.reviewCount !== undefined && (
          <StarRating rating={book.averageRating} count={book.reviewCount} />
        )}
        <PriceDisplay item={book} size="sm" className="mt-1" />
      </div>

      {/* Buy Now + Add to Cart */}
      {showAddToCart && (
        <div className="mt-auto flex flex-col sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          <button
            onClick={handleBuyNow}
            className="w-full py-[6px] bg-ink hover:bg-ink/80 text-paper text-[11px] font-bold tracking-[0.04em] uppercase transition-colors"
            aria-label={`اشترِ ${displayTitle} الآن`}
          >
            اشترِ الآن
          </button>
          <button
            onClick={handleAddToCart}
            className="w-full py-[6px] bg-brand hover:bg-brand-dark text-white text-[11px] font-bold tracking-[0.04em] uppercase transition-colors"
            aria-label={`أضف ${displayTitle} إلى السلة`}
          >
            {added ? "تمت الإضافة ✓" : "أضف للسلة"}
          </button>
        </div>
      )}
    </Link>
  );
}
