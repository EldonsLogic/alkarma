import type { Metadata } from "next";
import { canonical } from "@/lib/seo";
import { BRAND_AR } from "@/lib/brand";
import {
  DISTRIBUTORS_TITLE,
  DOMESTIC_REGIONS,
  INTERNATIONAL_HEADING,
  INTERNATIONAL_COUNTRIES,
} from "@/content/distributors";

export const metadata: Metadata = {
  title: "موزعينا",
  description:
    "أماكن توفر كتب دار الكرمة — شبكة المكتبات والموزعين في جميع أنحاء مصر وخارجها.",
  ...canonical("/distributors"),
};

export default function DistributorsPage() {
  const egyptCount = DOMESTIC_REGIONS.reduce((n, r) => n + r.stores.length, 0);
  const intlCount = INTERNATIONAL_COUNTRIES.reduce((n, c) => n + c.stores.length, 0);

  return (
    <div className="min-h-screen bg-paper-mid" dir="rtl">
      {/* Hero */}
      <div className="bg-ink py-14 sm:py-20 px-4 sm:px-10 text-center">
        <span className="font-mono text-[11px] tracking-[0.18em] text-brand block mb-4">
          {BRAND_AR}
        </span>
        <h1
          className="font-display font-bold text-paper leading-tight mb-4"
          style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
        >
          موزعينا
        </h1>
        <p className="text-[15px] text-paper/60 font-light">
          {DISTRIBUTORS_TITLE} — {egyptCount} مكتبة في مصر و{intlCount} خارجها
        </p>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-10 py-12 space-y-12">
        {DOMESTIC_REGIONS.map((region) => (
          <section key={region.region}>
            <h2 className="font-display text-[20px] sm:text-[22px] font-bold text-ink mb-5 pb-2 border-b-2 border-brand inline-block">
              {region.region}
            </h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              {region.stores.map((store) => (
                <li
                  key={store}
                  className="text-[14px] text-ink-soft leading-relaxed ps-4 relative before:content-[''] before:absolute before:start-0 before:top-[9px] before:w-[5px] before:h-[5px] before:bg-brand before:rounded-full"
                >
                  {store}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="font-display text-[20px] sm:text-[22px] font-bold text-ink mb-5 pb-2 border-b-2 border-brand inline-block">
            {INTERNATIONAL_HEADING}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {INTERNATIONAL_COUNTRIES.map((c) => (
              <div key={c.country} className="bg-paper border border-paper-dark p-5">
                <h3 className="font-display text-[15px] font-bold text-ink mb-2">{c.country}</h3>
                <ul className="space-y-1">
                  {c.stores.map((store) => (
                    <li key={store} className="text-[13px] text-ink-muted leading-relaxed">
                      {store}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-paper border border-paper-dark p-8 text-center">
          <p className="font-display text-[18px] font-semibold text-ink mb-2">
            تريد توزيع كتبنا؟
          </p>
          <p className="text-[14px] text-ink-soft mb-5">
            راسلنا لمناقشة إضافة مكتبتك إلى شبكة التوزيع.
          </p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 bg-brand hover:bg-brand-dark text-paper font-bold tracking-wide text-[14px] transition-colors"
          >
            تواصل معنا
          </a>
        </section>
      </div>
    </div>
  );
}
