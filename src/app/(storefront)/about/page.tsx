import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CmsPageView } from "@/components/storefront/CmsPageView";
import { canonical } from "@/lib/seo";
import { BRAND_AR, CONTACT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: `عن ${BRAND_AR}`,
  description:
    "«الكرمة» دار نشر عربية تأسست عام ٢٠١٣ بالقاهرة، تهتم بنشر الكتب العربية والمترجمة التي تغيّر حياة قارئها إلى الأفضل.",
  ...canonical("/about"),
};

// The narrative below is the store's own published "about" copy. It is the
// fallback shown when no CMS page row exists for /about yet.
const STORY = [
  "«الكرمة» دار نشر عربية تأسست عام 2013 بالقاهرة. تهتم بنشر الكتب العربية والمترجمة التي تتميز بقدرتها على تغيير حياة قارئها إلى الأفضل، وعلى الأخص الروايات وكتب التاريخ والسِّير والتراجم والتنمية الذاتية. وقد أصبحت «دار الكرمة» في فترة قصيرة الناشرَ لبعض أهم أعلام الفكر والإبداع في مصر، مثل: إبراهيم عيسى، وعمر طاهر، والدكتور أحمد خالد توفيق، والدكتور محمد المنسي قنديل، وصلاح عيسى، وخيري شلبي، والدكتور جلال أمين، والدكتور عز الدين شكري فشير، والدكتور أحمد عكاشه، وآخرين.",
  "وتوجد كتبها بصورة دائمة في قوائم الكتب الأكثر مبيعًا، فضلًا عن كونها تحظى بتقدير نقدي متميز نظرًا إلى حرصها على اختيار المحتوى الراقي، وعنايتها بالتحرير والتدقيق اللغوي والإخراج الفني والطباعة.",
  "وقد حازت كتب «دار الكرمة» عددًا من الجوائز المهمة، كما اختارها اتحاد الناشرين المصريين والهيئة العامة للكتاب لتفوز بجائزة «أفضل ناشر» في عام 2020، وفازت بالجائزة التشجيعية لجائزة الشيخ حمد للترجمة والتفاهم الدولي في عام 2022.",
  "وللدار شبكة توزيع ممتدة تساعد على وصول كتبها مطبوعة ورقمية إلى القُرَّاء عن طريق عدد كبير من المكتبات والمتاجر الرقمية في مصر والعالم العربي.",
];

const SERIES = [
  {
    icon: "📚",
    title: "مختارات الكرمة",
    body: "سلسلة تُعنى بإعادة نشر روائع الإبداع العربي المنسية والنادرة في طبعات جديدة أنيقة جديرة بالاقتناء، أعادت بها تقديم عدد من الكنوز الأدبية للأجيال الجديدة.",
  },
  {
    icon: "🌍",
    title: "ترجمات الكرمة",
    body: "سلسلة تُنتقى كتبها من بين أفضل الروايات العالمية، بترجمات تحرص على أمانة النص وجمال العربية معًا.",
  },
  {
    icon: "🕌",
    title: "المكتبة الصوفية الصغيرة",
    body: "سلسلة تعيد تقديم عدد من كتب التصوف الأساسية التي تتميز بوضوح فكرها وسهولة فهمها، في حجم صغير يُيسِّر وضعها في حقيبة اليد أو الجيب.",
  },
];

export default async function AboutPage() {
  const dbPage = await prisma.page
    .findFirst({ where: { slug: "about", isPublished: true } })
    .catch(() => null);

  if (dbPage) {
    return <CmsPageView page={dbPage} heroLabel="قصتنا" />;
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Hero */}
      <div className="bg-ink py-14 sm:py-20 px-4 sm:px-10 text-center">
        <span className="font-mono text-[11px] tracking-[0.18em] text-brand block mb-4">قصتنا</span>
        <h1
          className="font-display font-bold text-paper leading-tight mb-4"
          style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
        >
          عن {BRAND_AR}
        </h1>
        <p className="text-[15px] text-paper/60 font-light">دار نشر عربية تأسست عام ٢٠١٣ بالقاهرة</p>
      </div>

      <div className="max-w-[800px] mx-auto px-4 sm:px-10 py-14 space-y-14">
        {/* Story */}
        <section>
          <h2 className="text-[24px] font-display font-bold text-ink mb-4 pb-2 border-b-2 border-brand inline-block">
            من نحن
          </h2>
          {STORY.map((para, i) => (
            <p key={i} className="text-[15px] text-ink-soft leading-relaxed mt-4">
              {para}
            </p>
          ))}
        </section>

        {/* Series */}
        <section>
          <h2 className="text-[24px] font-display font-bold text-ink mb-6 pb-2 border-b-2 border-brand inline-block">
            من أهم إصداراتنا
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-4">
            {SERIES.map((v) => (
              <div key={v.title} className="border border-paper-dark p-6">
                <div className="text-[32px] mb-3">{v.icon}</div>
                <h3 className="text-[15px] font-display font-bold text-ink mb-2">{v.title}</h3>
                <p className="text-[13px] text-ink-muted leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact / CTA */}
        <section className="bg-paper-mid border border-paper-dark p-8 text-center">
          <h2 className="text-[20px] font-display font-bold text-ink mb-2">لديك سؤال؟</h2>
          <p className="text-[14px] text-ink-soft mb-5">
            يسعدنا أن نسمع منك — سواء كان ترشيحًا لكتاب أو استفسارًا عن طلب.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-block px-6 py-3 bg-brand hover:bg-brand-dark text-paper font-bold text-[14px] tracking-wide transition-colors"
            >
              راسلنا
            </a>
            <Link
              href="/bestsellers"
              className="inline-block px-6 py-3 border-2 border-[#1a1a1a] hover:bg-ink hover:text-paper text-ink font-bold text-[14px] tracking-wide transition-colors"
            >
              تصفّح الكتب
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
