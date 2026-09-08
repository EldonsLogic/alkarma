/**
 * Seed the CMS-editable pages with the store's real published copy, so the
 * admin editor opens pre-populated instead of blank.
 *
 * Content here is Alkarma's own — carried across from the live site — not
 * placeholder text. Seeding is idempotent and only CREATES missing rows: it
 * never overwrites a page an admin has since edited.
 *
 * DELIBERATELY OMITTED: "privacy" and "terms".
 * The live site publishes full legal documents for both, and legal copy must
 * be migrated verbatim and signed off rather than paraphrased. Until that
 * happens these two pages have no CMS row, so the storefront falls back to its
 * built-in copy — which still needs replacing. See the note in the README.
 *
 * Run:  npx tsx --env-file .env.local scripts/seed-pages.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ABOUT = `<h2>من نحن</h2>
<p>«الكرمة» دار نشر عربية تأسست عام 2013 بالقاهرة. تهتم بنشر الكتب العربية والمترجمة التي تتميز بقدرتها على تغيير حياة قارئها إلى الأفضل، وعلى الأخص الروايات وكتب التاريخ والسِّير والتراجم والتنمية الذاتية. وقد أصبحت «دار الكرمة» في فترة قصيرة الناشرَ لبعض أهم أعلام الفكر والإبداع في مصر، مثل: إبراهيم عيسى، وعمر طاهر، والدكتور أحمد خالد توفيق، والدكتور محمد المنسي قنديل، وصلاح عيسى، وخيري شلبي، والدكتور جلال أمين، والدكتور عز الدين شكري فشير، والدكتور أحمد عكاشه، وآخرين.</p>
<p>وتوجد كتبها بصورة دائمة في قوائم الكتب الأكثر مبيعًا، فضلًا عن كونها تحظى بتقدير نقدي متميز نظرًا إلى حرصها على اختيار المحتوى الراقي، وعنايتها بالتحرير والتدقيق اللغوي والإخراج الفني والطباعة.</p>
<p>وقد حازت كتب «دار الكرمة» عددًا من الجوائز المهمة، كما اختارها اتحاد الناشرين المصريين والهيئة العامة للكتاب لتفوز بجائزة «أفضل ناشر» في عام 2020، وفازت بالجائزة التشجيعية لجائزة الشيخ حمد للترجمة والتفاهم الدولي في عام 2022.</p>
<h2>من أهم إصداراتنا</h2>
<p><strong>مختارات الكرمة</strong> — سلسلة تُعنى بإعادة نشر روائع الإبداع العربي المنسية والنادرة في طبعات جديدة أنيقة جديرة بالاقتناء، أعادت بها تقديم عدد من الكنوز الأدبية للأجيال الجديدة.</p>
<p><strong>ترجمات الكرمة</strong> — سلسلة تُنتقى كتبها من بين أفضل الروايات العالمية.</p>
<p><strong>المكتبة الصوفية الصغيرة</strong> — سلسلة تعيد تقديم عدد من كتب التصوف الأساسية والمهمة التي تتميز بوضوح فكرها وسهولة فهمها، وحجمها الصغير يُيسِّر وضعها في حقيبة اليد أو الجيب.</p>
<p>وللدار شبكة توزيع ممتدة تساعد على وصول كتبها مطبوعة ورقمية إلى القُرَّاء عن طريق عدد كبير من المكتبات والمتاجر الرقمية في مصر والعالم العربي.</p>`;

const CONTACT = `<h2>تواصل معنا</h2>
<p>يسعدنا أن نسمع منك — سواء كان ترشيحًا لكتاب أو استفسارًا عن طلب.</p>
<p><strong>البريد الإلكتروني:</strong> <a href="mailto:info@alkarmabooks.com">info@alkarmabooks.com</a><br>
<strong>الهاتف:</strong> 01067274880</p>
<p>لاستفسارات التوزيع أو الشراكات أو الصحافة، راسلنا على البريد نفسه مع كتابة «استفسار أعمال» في عنوان الرسالة.</p>`;

const SHIPPING = `<h2>الشحن والتوصيل</h2>
<p>نشحن إلى جميع محافظات مصر.</p>
<h3>تكلفة الشحن</h3>
<p>تكلفة الشحن ثابتة حسب المنطقة، وتظهر تلقائيًّا عند اختيار محافظتك في صفحة إتمام الطلب:</p>
<ul>
  <li>القاهرة والجيزة: ١٠٠ جنيه.</li>
  <li>الإسكندرية والبحيرة: ١١٠ جنيه.</li>
  <li>الدلتا والقناة: ١١٥ جنيه.</li>
  <li>شمال الصعيد: ١٣٠ جنيه.</li>
  <li>جنوب الصعيد والمحافظات النائية: ١٥٠ جنيه.</li>
</ul>
<h3>مدة التوصيل</h3>
<p>يتم توصيل الطلب خلال ٥-٦ أيام عمل (لا تتضمن الإجازات الأسبوعية: الجمعة والسبت، والإجازات الرسمية)، وتبدأ المدة من اليوم الثاني للطلب.</p>
<h3>طرق الدفع</h3>
<p>يمكنك الدفع عند الاستلام، أو بالبطاقة الائتمانية (فيزا، ماستركارد، ميزة).</p>`;

const RETURNS = `<h2>الإرجاع والاسترداد</h2>
<p>إذا وصلك الكتاب تالفًا أو وصلك كتاب غير الذي طلبته، تواصل معنا على <a href="mailto:info@alkarmabooks.com">info@alkarmabooks.com</a> خلال ١٤ يومًا من استلام الطلب وسنحل الأمر في أسرع وقت.</p>
<p>برجاء الاحتفاظ بالكتاب في حالته الأصلية مع فاتورة الطلب حتى تكتمل عملية المراجعة.</p>`;

type Seed = { slug: string; title: string; body: string; metaDesc?: string };

const PAGES: Seed[] = [
  { slug: "about", title: "عن دار الكرمة", body: ABOUT,
    metaDesc: "«الكرمة» دار نشر عربية تأسست عام ٢٠١٣ بالقاهرة، تنشر الكتب العربية والمترجمة." },
  { slug: "contact", title: "تواصل معنا", body: CONTACT,
    metaDesc: "تواصل مع دار الكرمة عبر البريد الإلكتروني أو الهاتف." },
  { slug: "shipping", title: "الشحن والتوصيل", body: SHIPPING,
    metaDesc: "تكلفة الشحن ومدة التوصيل وطرق الدفع لدى دار الكرمة." },
  { slug: "returns", title: "الإرجاع والاسترداد", body: RETURNS,
    metaDesc: "سياسة الإرجاع والاسترداد لدى دار الكرمة." },
];

async function main() {
  console.log("Seeding CMS pages…\n");
  for (const p of PAGES) {
    const existing = await prisma.page.findUnique({ where: { slug: p.slug } });
    if (existing) {
      console.log(`  ↷ Skipped (already exists): ${p.slug}`);
      continue;
    }
    await prisma.page.create({
      data: {
        slug: p.slug,
        // Single-language store: the Arabic columns are what the storefront
        // renders, and the base columns mirror them so nothing renders blank
        // if a consumer reads `title`/`body` directly.
        title: p.title,
        titleAr: p.title,
        body: p.body,
        bodyAr: p.body,
        metaTitle: p.title,
        metaDesc: p.metaDesc,
        isPublished: true,
      },
    });
    console.log(`  ✔ Created: ${p.slug}`);
  }
  console.log("\n✅ CMS pages seeded. (privacy + terms intentionally omitted — see file header.)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
