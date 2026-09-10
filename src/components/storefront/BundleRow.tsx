"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/currency";
import type { BundleSummary } from "@/types";

interface Props {
  bundles: BundleSummary[];
}

/** Fanned trio of the bundle's book covers — no backdrop, just the covers. */
function CoverFan({ covers }: { covers: NonNullable<BundleSummary["covers"]> }) {
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
            className="relative aspect-[2/3] w-[78px] overflow-hidden transition-all"
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

export function BundleRow({ bundles }: Props) {

  return (
    <section className="py-6 sm:py-8 px-4 sm:px-10 bg-paper-mid">
      {/* Section header */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b-2 border-brand">
        <div>
          <span className="section-overline">مجموعات مختارة</span>
          <h2 className="font-display font-bold text-ink leading-tight" style={{ fontSize: "clamp(24px, 3vw, 36px)" }}>
            باقات مميزة
          </h2>
        </div>
        <Link
          href="/bundles"
          className="text-[12px] text-brand font-bold tracking-[0.08em] uppercase hover:underline flex-shrink-0 ms-4 mb-1"
        >
          ← عرض الكل
        </Link>
      </div>

      <div className="flex flex-wrap justify-center gap-5">
        {bundles.map((bundle) => {
          const price = bundle.priceEgp;
          const compare = bundle.compareEgp;
          const savings =
            compare != null && compare > price ? Math.round(((compare - price) / compare) * 100) : null;

          return (
            <Link
              key={bundle.id}
              href={`/bundles/${bundle.slug}`}
              className="group w-full sm:w-[340px] lg:w-[360px] flex flex-col border border-paper-dark bg-paper hover:border-brand hover:shadow-card-hover transition-all"
            >
              {/* Cover fan */}
              <div className="relative px-6 pt-6 pb-2">
                <CoverFan covers={bundle.covers ?? []} />
                {savings != null && (
                  <span className="absolute top-4 end-4 bg-brand text-white font-mono text-[11px] tracking-wide px-2.5 py-1">
                    {`وفر ${savings}%`}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col flex-1 px-6 pb-6 pt-2">
                <h3 className="font-display text-[18px] font-semibold text-ink group-hover:text-brand transition-colors leading-snug" dir="auto">
                  {bundle.nameAr ? bundle.nameAr : bundle.name}
                </h3>
                <p className="text-[12px] text-ink-muted mt-1.5">
                  {`${bundle.itemCount} كتاب في هذه الباقة`}
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
