"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatPrice } from "@/lib/currency";
import { useCartStore } from "@/stores/cart.store";

interface BundleBook {
  id: string;
  slug: string;
  title: string;
  author: string;
  coverUrl: string;
  priceEgp: number;
  synopsis: string;
}

interface Bundle {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  descAr?: string | null;
  coverUrl?: string | null;
  priceEgp: number;
  compareEgp?: number | null;
  stock: number;
  items: { book: BundleBook; quantity: number }[];
}

interface Props {
  bundle: Bundle;
}

export function BundleDetailClient({ bundle }: Props) {
  const { addItem, openDrawer } = useCartStore();
  const { data: session } = useSession();
  const router = useRouter();
  const [qty, setQty] = useState(1);

  const t = {
    home: "الرئيسية",
    bundles: "المجموعات",
    allBundles: "كل المجموعات →",
    booksInBundle: (n: number) => `${n} كتاب في هذه المجموعة`,
    retailValue: "القيمة الأصلية:",
    outOfStock: "نفد المخزون",
    lowStock: (n: number) => `${n} نسخ فقط!`,
    inStock: "متوفر",
    addToBasket: "أضف إلى السلة",
    whatsIn: "محتويات هذه المجموعة",
    by: "بقلم",
    qty: "الكمية:",
    savings: (price: string) => <>🎉 توفر <strong>{price}</strong> مقارنة بالشراء المنفصل</>,
  };

  const price = bundle.priceEgp;
  const compare = bundle.compareEgp;
  const savings =
    compare != null && compare > price
      ? Math.round(((compare - price) / compare) * 100)
      : null;
  const outOfStock = bundle.stock === 0;

  const retailTotal = bundle.items.reduce((sum, i) => {
    const bookPrice = i.book.priceEgp;
    return sum + bookPrice * i.quantity;
  }, 0);
  const bundleSavings = retailTotal > price ? retailTotal - price : 0;

  const displayName = bundle.nameAr ? bundle.nameAr : bundle.name;
  const displayDesc = bundle.descAr ? bundle.descAr : bundle.description;

  function handleAddToCart() {
    if (!session) {
      router.push("/login");
      return;
    }
    addItem({
      id: bundle.id,
      bundleId: bundle.id,
      title: bundle.name,
      coverUrl: bundle.coverUrl ?? undefined,
      slug: bundle.slug,
      quantity: qty,
      priceEgp: bundle.priceEgp,
    });
    openDrawer();
  }

  return (
    <div className="min-h-screen bg-paper-mid">
      {/* Breadcrumb */}
      <div className="bg-paper border-b border-paper-dark px-4 sm:px-10 py-3">
        <nav className="text-[12px] text-ink-muted flex items-center gap-1.5">
          <Link href="/" className="hover:text-brand">{t.home}</Link>
          <span>/</span>
          <Link href="/bundles" className="hover:text-brand">{t.bundles}</Link>
          <span>/</span>
          <span className="text-ink-soft">{displayName}</span>
        </nav>
      </div>

      <div className="max-w-[1100px] mx-auto px-4 sm:px-10 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
          {/* Left: Cover */}
          <div>
            {bundle.coverUrl ? (
              <div className="relative w-full aspect-[3/4] max-w-[380px] mx-auto shadow-xl">
                <Image src={bundle.coverUrl} alt={displayName} fill className="object-cover" />
              </div>
            ) : (
              // No composite image — fan the individual book covers, no backdrop.
              <div className="flex items-end justify-center max-w-[420px] mx-auto py-6 min-h-[320px]">
                {bundle.items.slice(0, 4).map((item, i, arr) => {
                  const mid = (arr.length - 1) / 2;
                  const offset = i - mid;
                  return (
                    <div
                      key={item.book.id}
                      className="relative aspect-[2/3] w-[130px] sm:w-[150px] rounded-sm overflow-hidden bg-paper-dark shadow-book-hover ring-1 ring-black/10"
                      style={{
                        zIndex: 20 - Math.round(Math.abs(offset) * 2),
                        transform: `rotate(${offset * 6}deg) translateY(${Math.abs(offset) * 16}px)`,
                        marginInlineStart: i === 0 ? 0 : "-38px",
                      }}
                    >
                      {item.book.coverUrl ? (
                        <Image src={item.book.coverUrl} alt={item.book.title} fill sizes="150px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center p-2 text-center text-[11px] text-ink-muted leading-tight" dir="auto">
                          {item.book.title}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {bundleSavings > 0 && (
              <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-[13px] px-4 py-3 text-center max-w-[380px] mx-auto">
                {t.savings(formatPrice(bundleSavings))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div>
            <div className="mb-1">
              <Link href="/bundles" className="text-[12px] text-ink-muted hover:text-brand uppercase tracking-wide font-bold">
                {t.allBundles}
              </Link>
            </div>

            <h1 className="text-[28px] sm:text-[32px] font-display font-bold text-ink leading-tight mb-2 mt-2">
              {displayName}
            </h1>

            <p className="text-[13px] text-ink-muted mb-4">
              {t.booksInBundle(bundle.items.length)}
            </p>

            {displayDesc && (
              <p className="text-[15px] text-[#444] leading-relaxed mb-6">{displayDesc}</p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-1">
              <span className="text-[32px] font-display font-bold text-ink">
                {formatPrice(price)}
              </span>
              {compare != null && compare > price && (
                <span className="text-[18px] text-ink-muted line-through">
                  {formatPrice(compare)}
                </span>
              )}
              {savings != null && (
                <span className="bg-brand text-paper text-[13px] font-display font-bold px-2.5 py-1">
                  {savings}% OFF
                </span>
              )}
            </div>

            {retailTotal > price && (
              <p className="text-[12px] text-ink-muted mb-5">
                {t.retailValue} <span className="line-through">{formatPrice(retailTotal)}</span>
              </p>
            )}

            {/* Stock */}
            {outOfStock ? (
              <p className="text-red-600 text-[13px] font-bold mb-4">{t.outOfStock}</p>
            ) : bundle.stock <= 5 ? (
              <p className="text-brand text-[13px] font-bold mb-4">{t.lowStock(bundle.stock)}</p>
            ) : (
              <p className="text-green-600 text-[13px] mb-4">{t.inStock}</p>
            )}

            {/* Qty + Add to cart */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-paper-dark">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-11 flex items-center justify-center text-[18px] text-ink-soft hover:bg-paper-mid transition-colors"
                >
                  −
                </button>
                <span className="w-10 text-center text-[15px] font-bold">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(bundle.stock || 99, q + 1))}
                  className="w-10 h-11 flex items-center justify-center text-[18px] text-ink-soft hover:bg-paper-mid transition-colors"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                disabled={outOfStock}
                className="flex-1 py-[13px] bg-brand hover:bg-brand-dark text-paper font-display font-bold uppercase tracking-wide text-[14px] transition-colors disabled:opacity-50"
              >
                {outOfStock ? t.outOfStock : t.addToBasket}
              </button>
            </div>
          </div>
        </div>

        {/* Books in this bundle */}
        <div>
          <h2 className="text-[20px] font-display font-bold text-ink mb-5 pb-2 border-b-2 border-brand">
            {t.whatsIn}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bundle.items.map((item) => (
              <Link
                key={item.book.id}
                href={`/book/${item.book.slug}`}
                className="group bg-paper border border-paper-dark hover:border-brand hover:shadow-sm transition-all flex gap-4 p-4"
              >
                <div className="relative w-[60px] h-[84px] flex-shrink-0">
                  {item.book.coverUrl ? (
                    <Image src={item.book.coverUrl} alt={item.book.title} fill className="object-cover shadow" />
                  ) : (
                    <div className="w-full h-full bg-[#e5e5e5]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-ink group-hover:text-brand transition-colors leading-snug line-clamp-2">
                    {item.book.title}
                  </p>
                  <p className="text-[12px] text-ink-muted mt-1">{t.by} {item.book.author}</p>
                  {item.quantity > 1 && (
                    <p className="text-[11px] text-ink-muted mt-1">{t.qty} {item.quantity}</p>
                  )}
                  <p className="text-[12px] text-ink-muted mt-2 line-clamp-2 leading-relaxed">
                    {item.book.synopsis?.slice(0, 100)}…
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
