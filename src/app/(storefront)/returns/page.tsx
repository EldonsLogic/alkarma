import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CmsPageView } from "@/components/storefront/CmsPageView";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "الإرجاع والاسترداد",
  description: "دار الكرمة returns, exchanges, and refund policy.",
  ...canonical("/returns"),
};

const STRINGS = {
    heroLabel: "الإرجاع والاسترداد",
    heroTitle: "الإرجاع والاسترداد",
    heroSubtitle: "سياسة الإرجاع بدون تعقيدات",
    windowTitle: "نافذة الإرجاع خلال ١٤ يومًا",
    windowBody: (
      <>
        بنقبل إرجاع معظم المنتجات خلال <strong>١٤ يومًا</strong> من
        التسليم. لازم يرجع الكتاب بحالته الأصلية من غير ما يتقرأ — من غير
        أي تلف أو علامات، وفي التغليف الأصلي لو كان موجود.
      </>
    ),
    howTitle: "كيفية الإرجاع",
    steps: [
      "ابعتلنا إيميل على info@alkarmabooks.com فيه رقم طلبك وسبب الإرجاع.",
      "هنراجع طلبك خلال ١–٢ يوم عمل ونبعتلك تعليمات الإرجاع.",
      "غلف الكتاب كويس وابعته لمستودعنا.",
      "بعد ما نستلم المنتج ونفحصه، هنعمل الاسترداد خلال ٥–٧ أيام عمل.",
    ],
    nonTitle: "منتجات غير قابلة للإرجاع",
    nonItems: [
      "المنتجات الرقمية أو القابلة للتحميل",
      "المنتجات المكتوب عليها 'بيع نهائي' أو 'غير قابل للإرجاع'",
      "الكتب اللي اتقرأت أو اتكتب فيها أو اتلفت من قِبل العميل",
      "الطلبات المخصصة أو الشخصية",
    ],
    refundTitle: "طريقة الاسترداد",
    refundBody:
      "الاسترداد بيرجع لطريقة الدفع الأصلية. بالنسبة لطلبات الدفع عند الاستلام، الاسترداد بيكون رصيد في المتجر أو تحويل بنكي. تكاليف الشحن مش بترجع إلا لو كان الإرجاع بسبب غلطة منا.",
    ctaText: "عندك سؤال عن إرجاع منتج؟ نحن هنا للمساعدة.",
    ctaBtn: "تواصل مع الدعم",
  } as const;

export default async function ReturnsPage() {
  const [dbPage] = await Promise.all([
    prisma.page.findFirst({ where: { slug: "returns", isPublished: true } }).catch(() => null),
  ]);

  // Editable CMS version takes precedence (managed from Admin → Pages)
  if (dbPage) {
    return (
      <CmsPageView
        page={dbPage}
        heroLabel="الإرجاع والاسترداد"
        heroSubtitle="سياسة الإرجاع بدون تعقيدات"
      />
    );
  }

  const t = STRINGS;

  return (
    <div className="min-h-screen bg-paper-mid" dir="rtl">
      <div className="bg-ink py-14 sm:py-20 px-4 sm:px-10 text-center">
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-brand block mb-4">
          {t.heroLabel}
        </span>
        <h1
          className="font-display font-bold text-paper leading-tight mb-4"
          style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
        >
          {t.heroTitle}
        </h1>
        <p className="text-[15px] text-paper/60 font-light">{t.heroSubtitle}</p>
      </div>

      <div className="max-w-[760px] mx-auto px-4 sm:px-10 py-12 space-y-10">
        <section>
          <h2 className="text-[20px] font-display font-bold text-ink mb-3 pb-2 border-b-2 border-brand inline-block">
            {t.windowTitle}
          </h2>
          <p className="text-[15px] text-ink-soft leading-relaxed mt-3">
            {t.windowBody}
          </p>
        </section>

        <section>
          <h2 className="text-[20px] font-display font-bold text-ink mb-3 pb-2 border-b-2 border-brand inline-block">
            {t.howTitle}
          </h2>
          <ol className="space-y-3 mt-3">
            {t.steps.map((step, i) => (
              <li key={i} className="flex gap-4 items-start">
                <span className="w-7 h-7 flex-shrink-0 bg-brand text-paper text-[13px] font-display font-bold rounded-full flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-[15px] text-ink-soft leading-relaxed">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-[20px] font-display font-bold text-ink mb-3 pb-2 border-b-2 border-brand inline-block">
            {t.nonTitle}
          </h2>
          <ul className="space-y-2 mt-3">
            {t.nonItems.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[15px] text-ink-soft">
                <span className="text-brand mt-1">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-[20px] font-display font-bold text-ink mb-3 pb-2 border-b-2 border-brand inline-block">
            {t.refundTitle}
          </h2>
          <p className="text-[15px] text-ink-soft leading-relaxed mt-3">{t.refundBody}</p>
        </section>

        <div className="bg-brand/10 border border-brand/30 px-6 py-5 text-center">
          <p className="text-[14px] text-ink-soft mb-3">{t.ctaText}</p>
          <Link
            href="/contact"
            className="inline-block px-6 py-2.5 bg-brand hover:bg-brand-dark text-paper font-bold text-[13px] uppercase tracking-wide transition-colors"
          >
            {t.ctaBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}
