"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/currency";

export interface BundleUpsellItem {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  priceEgp: number;
  compareEgp: number | null;
  itemCount: number;
  covers?: { coverUrl: string | null; title: string }[];
}

/** Fanned trio of the bundle's book covers — no backdrop. */
function CoverFan({ covers }: { covers: NonNullable<BundleUpsellItem["covers"]> }) {
  const shown = covers.slice(0, 3);
  if (!shown.length) return null;
  const mid = (shown.length - 1) / 2;
  return (
    <div className="flex items-end justify-center h-[150px]">
      {shown.map((c, i) => {
        const offset = i - mid;
        return (
          <div
            key={i}
            className="relative aspect-[2/3] w-[78px] rounded-sm overflow-hidden bg-paper-dark shadow-book group-hover:shadow-book-hover ring-1 ring-black/10 transition-all"
            style={{
              zIndex: 10 - Math.round(Math.abs(offset) * 2),
              transform: `rotate(${offset * 6}deg) translateY(${Math.abs(offset) * 10}px)`,
              marginInlineStart: i === 0 ? 0 : "-22px",
            }}
          >
            {c.coverUrl ? (
              <Image src={c.coverUrl} alt={c.title} fill sizes="78px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-1 text-center text-[9px] text-ink-muted leading-tight" dir="auto">
                {c.title}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * PDP upsell — shown only when the current book belongs to one or more bundles.
 * Nudges the shopper to buy the bundle (and save) instead of the single title.
 * Uses the same card layout as the homepage Featured Bundles row.
 */
export function BundleUpsell({ bundles }: { bundles: BundleUpsellItem[] }) {
  if (!bundles.length) return null;

  return (
    <section className="mt-10 sm:mt-12 border-t border-paper-dark pt-8">
      <div className="mb-6">
        <span className="section-overline">وفر أكثر</span>
        <h2 className="font-display font-bold text-ink leading-tight" style={{ fontSize: "clamp(20px, 2.4vw, 28px)" }}>
          هذا الكتاب متوفر ضمن باقة
        </h2>
      </div>

      <div className="flex flex-wrap gap-5">
        {bundles.map((b) => {
          const price = b.priceEgp;
          const compare = b.compareEgp;
          const savings = compare != null && compare > price ? Math.round(((compare - price) / compare) * 100) : null;
          const name = b.nameAr ? b.nameAr : b.name;

          return (
            <Link
              key={b.id}
              href={`/bundles/${b.slug}`}
              className="group w-full sm:w-[320px] flex flex-col border border-paper-dark bg-paper hover:border-brand hover:shadow-card-hover transition-all"
            >
              {/* Cover fan */}
              <div className="relative px-6 pt-6 pb-2">
                {b.covers && b.covers.length > 0 && <CoverFan covers={b.covers} />}
                {savings != null && (
                  <span className="absolute top-4 end-4 bg-brand text-white font-mono text-[11px] tracking-wide px-2.5 py-1">
                    {`وفر ${savings}%`}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col flex-1 px-6 pb-6 pt-2">
                <h3 className="font-display text-[17px] font-semibold text-ink group-hover:text-brand transition-colors leading-snug" dir="auto">
                  {name}
                </h3>
                <p className="text-[12px] text-ink-muted mt-1.5">
                  {`${b.itemCount} كتاب في هذه الباقة`}
                </p>

                <div className="flex items-baseline gap-2 mt-auto border-t border-paper-dark pt-4">
                  <span className="price-mono text-[20px] font-bold text-ink">{formatPrice(price)}</span>
                  {compare != null && compare > price && (
                    <span className="price-mono text-[13px] text-ink-muted line-through">{formatPrice(compare)}</span>
                  )}
                </div>

                <div className="mt-4">
                  <span className="inline-block w-full text-center py-2.5 border-2 border-brand text-brand text-[12px] font-bold uppercase tracking-[0.08em] group-hover:bg-brand group-hover:text-white transition-colors">
                    عرض الباقة
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
