import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CmsPageView } from "@/components/storefront/CmsPageView";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "الشحن والتوصيل",
  description: "Learn about our shipping options, delivery times, and costs.",
  ...canonical("/shipping"),
};

const STRINGS = {
    heroLabel: "التوصيل",
    heroTitle: "معلومات الشحن",
    heroSubtitle: "كل ما تحتاج معرفته عن التوصيل",
    ctaText: "عندك سؤال عن التوصيل؟",
    ctaBtn: "تواصل معنا",
    sections: [
      {
        title: "مناطق التوصيل",
        body: "نوصّل إلى جميع محافظات مصر الـ٢٧. الشحن حاليًا داخل مصر فقط.",
      },
      {
        title: "تكاليف الشحن",
        rows: [
          ["القاهرة والجيزة", "١٠٠ جنيه"],
          ["الإسكندرية والبحيرة", "١١٠ جنيه"],
          ["الدلتا والقناة", "١١٥ جنيه"],
          ["شمال الصعيد", "١٣٠ جنيه"],
          ["جنوب الصعيد والمحافظات النائية", "١٥٠ جنيه"],
        ] as [string, string][],
      },
      {
        title: "مواعيد التوصيل",
        body: "يتم توصيل الطلب خلال ٥-٦ أيام عمل (لا تتضمن الإجازات الأسبوعية: الجمعة والسبت، والإجازات الرسمية)، وتبدأ المدة من اليوم الثاني للطلب.",
      },
      {
        title: "طرق الدفع",
        body: "يمكنك الدفع عند الاستلام، أو بالبطاقة الائتمانية (فيزا، وماستركارد، وميزة).",
      },
      {
        title: "تتبع طلبك",
        body: "بعد شحن طلبك ستصلك رسالة تأكيد بالبريد الإلكتروني تحتوي على رقم التتبع. كما يمكنك متابعة طلبك في أي وقت من صفحة حسابك تحت قسم «طلباتي».",
      },
      {
        title: "البضاعة التالفة أو المفقودة",
        body: "إذا وصلك الطلب تالفًا أو لم يصلك في الوقت المحدد، تواصل معنا على info@alkarmabooks.com خلال ٧ أيام من الموعد المتوقع للتسليم وسنحل الأمر فورًا.",
      },
    ],
  } as const;

export default async function ShippingPage() {
  const [dbPage] = await Promise.all([
    prisma.page
      .findFirst({ where: { slug: "shipping", isPublished: true } })
      .catch(() => null),
  ]);

  if (dbPage) {
    return (
      <CmsPageView
        page={dbPage}
        heroLabel="التوصيل"
        heroSubtitle="كل ما تحتاج معرفته عن التوصيل"
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
          style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
        >
          {t.heroTitle}
        </h1>
        <p className="text-[15px] text-paper/60 font-light">{t.heroSubtitle}</p>
      </div>

      <div className="max-w-[760px] mx-auto px-4 sm:px-10 py-12 space-y-10">
        {t.sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-[22px] font-bold text-ink mb-3 pb-2 border-b-2 border-brand inline-block">
              {s.title}
            </h2>
            {"body" in s && s.body && (
              <p className="text-[15px] text-ink-soft leading-relaxed mt-3">{s.body}</p>
            )}
            {"rows" in s && s.rows && (
              <div className="mt-3 border border-paper-dark overflow-hidden">
                {s.rows.map(([dest, time], i) => (
                  <div
                    key={i}
                    className="flex items-center px-5 py-3 text-[14px] bg-paper"
                  >
                    <span className="flex-1 text-ink-soft">{dest}</span>
                    <span className="text-ink-muted font-bold">{time}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

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
