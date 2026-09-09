/**
 * Seed the store's real book categories, taken from the live alkarmabooks.com
 * catalogue (44 categories).
 *
 * SLUGS ARE DELIBERATELY THE LIVE SITE'S SLUGS — including the URL-encoded
 * Arabic ones. Keeping them identical means the WordPress → Next.js category
 * redirect is a single prefix rule (/book-category/<slug> → /category/<slug>)
 * instead of 44 hand-written redirects, and preserves whatever link equity
 * those URLs already carry.
 *
 * Idempotent: re-running updates names/ordering, never duplicates.
 *
 * Run:  npx tsx --env-file .env.local scripts/seed-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// "PUBLISHER" rows are imprints, not topics. Live lists them together in the
// mega-menu's last column rather than mixed into the topical ones, and this
// store links them at /publisher/<name> so they list books BY that imprint.
type Cat = { slug: string; name: string; kind?: "BOOK" | "STATIONERY" | "PUBLISHER" };

// Order roughly follows the live site's own sidebar listing.
const CATEGORIES: Cat[] = [
  { slug: "أحدث-الإصدارات", name: "أحدث الإصدارات" },
  { slug: "الأكثر-مبيعًا", name: "الأكثر مبيعًا" },
  { slug: "عروض-وخصومات", name: "عروض وخصومات" },
  { slug: "كتب-أطفال", name: "كتب أطفال" },
  { slug: "stationary", name: "أدوات مكتبية", kind: "STATIONERY" },
  { slug: "literature", name: "أدب" },
  { slug: "أدب-رسائل", name: "أدب رسائل" },
  { slug: "إدارة", name: "إدارة" },
  { slug: "history", name: "تاريخ" },
  { slug: "تراجم-وسير", name: "تراجم وسير" },
  { slug: "تربية", name: "تربية" },
  { slug: "تصوف", name: "تصوف" },
  { slug: "تعلم-الكتابة", name: "تعلم الكتابة" },
  { slug: "تلوين-للكبار", name: "تلوين للكبار" },
  { slug: "self-development", name: "تنمية ذاتية" },
  { slug: "دار-الخيال", name: "دار الخيال", kind: "PUBLISHER" },
  { slug: "دار-الكرمة", name: "دار الكرمة", kind: "PUBLISHER" },
  { slug: "دار-جامعة-حمد-بن-خليفة-للنشر", name: "دار جامعة حمد بن خليفة للنشر", kind: "PUBLISHER" },
  { slug: "روايات", name: "روايات" },
  { slug: "روايات-مترجمة", name: "روايات مترجمة" },
  { slug: "روحانيات", name: "روحانيات" },
  { slug: "سياسة-وعسكرية", name: "سياسة وعسكرية" },
  { slug: "شركة-المطبوعات-للتوزيع-والنشر", name: "شركة المطبوعات للتوزيع والنشر", kind: "PUBLISHER" },
  { slug: "شعر", name: "شعر" },
  { slug: "صحة", name: "صحة" },
  { slug: "cooking", name: "طبخ" },
  { slug: "علم-نفس", name: "علم نفس" },
  { slug: "science", name: "علوم" },
  { slug: "علوم-اجتماعية", name: "علوم اجتماعية" },
  { slug: "فلسفة", name: "فلسفة" },
  { slug: "arts", name: "فنون" },
  { slug: "قصص", name: "قصص" },
  { slug: "picture-books", name: "قصص مصورة" },
  { slug: "قواميس-ومعاجم-ومراجع", name: "قواميس ومعاجم ومراجع" },
  { slug: "award-winning-books", name: "كتب حاصلة على جوائز" },
  { slug: "كتب-للناشئة", name: "كتب للناشئة" },
  { slug: "مجموعة-كلمات", name: "مجموعة كلمات", kind: "PUBLISHER" },
  { slug: "مقالات", name: "مقالات" },
  { slug: "موسوعات", name: "موسوعات" },
  { slug: "نقد-أدبي", name: "نقد أدبي" },
  { slug: "هاشيت-أنطوان", name: "هاشيت أنطوان", kind: "PUBLISHER" },
];

// NOT seeded: the live site still carries three English-titled legacy
// categories ("Children's Books", "Fiction", "Non-Fiction") that duplicate
// Arabic ones and hold almost no stock. They need a merge/redirect decision
// from the business rather than being carried across silently.
export const LEGACY_ENGLISH_SLUGS = ["childrens-books", "fiction", "non-fiction"];

async function main() {
  console.log(`Seeding ${CATEGORIES.length} categories…\n`);
  let created = 0, updated = 0;
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const data = {
      name: c.name,
      kind: c.kind ?? "BOOK",
      sortOrder: i + 1,
      isActive: true,
    };
    const existing = await prisma.category.findUnique({ where: { slug: c.slug } });
    if (existing) {
      await prisma.category.update({ where: { slug: c.slug }, data });
      updated++;
    } else {
      await prisma.category.create({ data: { slug: c.slug, ...data } });
      created++;
    }
  }
  console.log(`✔ ${created} created, ${updated} updated`);
  console.log(`\n⚠️  Legacy English categories NOT seeded (need a merge decision): ${LEGACY_ENGLISH_SLUGS.join(", ")}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
