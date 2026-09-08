"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/currency";

interface BundleItem {
  book: { id: string; title: string; author: string; coverUrl: string; slug: string };
  quantity: number;
}

interface Bundle {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  priceEgp: number;
  compareEgp?: number | null;
  stock: number;
  items: BundleItem[];
}

interface Props {
  bundles: Bundle[];
}

export function BundlesClient({ bundles }: Props) {

  const t = {
    overline: "مجموعات مختارة",
    title: "مجموعات الكتب",
    subtitle: "مجموعات مختارة بعناية بأسعار مميزة. اشترِ أكثر، وفر أكثر.",
    noBundles: "لا توجد مجموعات حاليًا",
    noBundlesHint: "تابعنا — نضع دائمًا مجموعات جديدة.",
    backHome: "العودة للرئيسية →",
    books: (n: number) => `${n} كتاب`,
    more: (n: number) => `+${n} أخرى`,
    save: (pct: number) => `وفر ${pct}%`,
    outOfStock: "نفد المخزون",
    viewBundle: "عرض المجموعة",
  };

  return (
    <div className="min-h-screen bg-paper">

      {/* Page hero */}
      <div className="bg-ink py-14 sm:py-20 px-4 sm:px-10 text-center">
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-brand block mb-4">
          {t.overline}
        </span>
        <h1
          className="font-display font-bold text-paper leading-tight mb-4"
          style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
        >
          {t.title}
        </h1>
        <p className="text-[15px] sm:text-[17px] text-paper/60 font-light max-w-[480px] mx-auto">
          {t.subtitle}
        </p>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-10 py-12">
        {bundles.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display text-[22px] font-semibold text-ink mb-3">{t.noBundles}</p>
            <p className="text-ink-muted text-[15px] mb-6">{t.noBundlesHint}</p>
            <Link href="/" className="text-brand font-bold hover:underline text-[14px]">{t.backHome}</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {bundles.map((bundle) => {
              const price = bundle.priceEgp;
              const compare = bundle.compareEgp;
              const savings =
                compare != null && compare > price
                  ? Math.round(((compare - price) / compare) * 100)
                  : null;
              const outOfStock = bundle.stock === 0;

              return (
                <Link
                  key={bundle.id}
                  href={`/bundles/${bundle.slug}`}
                  className="group bg-paper border border-paper-dark hover:border-brand hover:shadow-card-hover transition-all flex flex-col"
                >
                  {/* Cover / book stack preview */}
                  <div className="relative bg-paper-mid overflow-hidden h-[230px] flex items-center justify-center px-4 py-5">
                    {bundle.coverUrl ? (
                      <Image
                        src={bundle.coverUrl}
                        alt={bundle.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex items-end justify-center">
                        {bundle.items.slice(0, 3).map((item, i, arr) => {
                          const mid = (arr.length - 1) / 2;
                          const offset = i - mid;
                          return (
                            <div
                              key={item.book.id}
                              className="relative aspect-[2/3] w-[100px] rounded-sm overflow-hidden bg-paper-dark shadow-book group-hover:shadow-book-hover ring-1 ring-black/10 transition-all"
                              style={{
                                zIndex: 10 - Math.round(Math.abs(offset) * 2),
                                transform: `rotate(${offset * 6}deg) translateY(${Math.abs(offset) * 10}px)`,
                                marginInlineStart: i === 0 ? 0 : "-28px",
                              }}
                            >
                              {item.book.coverUrl ? (
                                <Image src={item.book.coverUrl} alt={item.book.title} fill sizes="100px" className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center p-1.5 text-center text-[10px] text-ink-muted leading-tight" dir="auto">
                                  {item.book.title}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {savings != null && (
                      <span className="absolute top-3 end-3 bg-brand text-white font-mono text-[11px] tracking-wide px-2.5 py-1">
                        {t.save(savings)}
                      </span>
                    )}
                    {outOfStock && (
                      <span className="absolute top-3 start-3 bg-ink-muted text-paper text-[11px] font-bold px-2 py-0.5">
                        {t.outOfStock}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 flex flex-col flex-1 border-t border-paper-dark">
                    <h2 className="font-display text-[18px] font-semibold text-ink group-hover:text-brand transition-colors leading-snug mb-1" dir="auto">
                      {bundle.nameAr ? bundle.nameAr : bundle.name}
                    </h2>
                    <p className="price-mono text-[11px] text-ink-muted uppercase tracking-[0.08em] mb-2">
                      {t.books(bundle.items.length)}
                    </p>
                    {bundle.description && (
                      <p className="text-[13px] text-ink-soft leading-relaxed mb-3 line-clamp-2 font-light">
                        {bundle.description}
                      </p>
                    )}

                    {/* Book list */}
                    <ul className="space-y-1.5 mb-5 flex-1">
                      {bundle.items.slice(0, 3).map((item) => (
                        <li key={item.book.id} className="text-[12px] text-ink-soft flex items-start gap-2">
                          <span className="text-brand mt-0.5 flex-shrink-0 text-[8px]">●</span>
                          <span className="truncate">{item.book.title}</span>
                        </li>
                      ))}
                      {bundle.items.length > 3 && (
                        <li className="text-[12px] text-ink-muted ms-4">
                          {t.more(bundle.items.length - 3)}
                        </li>
                      )}
                    </ul>

                    {/* Price */}
                    <div className="flex items-baseline gap-2.5 mb-4 mt-auto pt-3 border-t border-paper-dark">
                      <span className="price-mono text-[22px] font-medium text-brand">
                        {formatPrice(price)}
                      </span>
                      {compare != null && compare > price && (
                        <span className="price-mono text-[14px] text-ink-muted/70 line-through">
                          {formatPrice(compare)}
                        </span>
                      )}
                    </div>

                    <span className="block w-full text-center py-3 border-2 border-brand text-brand text-[12px] font-bold uppercase tracking-[0.08em] group-hover:bg-brand group-hover:text-white transition-colors">
                      {t.viewBundle}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
