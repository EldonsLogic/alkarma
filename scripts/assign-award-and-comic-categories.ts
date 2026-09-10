/**
 * Fills the two shelves that existed with zero books in them:
 * كتب حاصلة على جوائز (award-winning-books) and قصص مصورة (picture-books).
 *
 * Neither has a data field behind it, so both are derived from the catalogue
 * text and then hand-checked:
 *
 *  • Awards — the synopsis is matched for a prize actually attached to THIS
 *    book (won / shortlisted / longlisted + a named prize). The regex alone
 *    over-collects, because a blurb just as often credits the author, the film
 *    adaptation, the TV series or the person the book is about, so every match
 *    was read and the ones whose prize belongs to something other than the book
 *    are listed in EXCLUDED_TITLES with the reason.
 *
 *  • قصص مصورة — only the "كلاسيكيات مصورة" illustrated-classics series
 *    qualifies here; "مصور" elsewhere in the catalogue means an illustrated
 *    biography or a nature title, not a picture book.
 *
 *   npx tsx scripts/assign-award-and-comic-categories.ts          # dry run
 *   npx tsx scripts/assign-award-and-comic-categories.ts --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const AWARD =
  /(?:فاز(?:ت)?|حاز(?:ت)?|نال(?:ت)?|حصل(?:ت)?|الحائز(?:ة)?|الفائز(?:ة)?|المتوّج(?:ة)?|تُوّج(?:ت)?)[^.،؛\n]{0,40}?(?:جائزة|الجائزة|جوائز|الجوائز)|(?:القائمة\s+(?:القصيرة|الطويلة))[^.،؛\n]{0,25}?جائزة|(?:won|winner of|awarded|shortlisted for|longlisted for)[^.\n]{0,40}?(?:prize|award|booker|pulitzer|nobel)/i;

/** Matched the regex, but the prize is not the book's. */
const EXCLUDED_TITLES: Record<string, string> = {
  "كذبات صغيرة كبيرة": "the HBO series won the awards",
  "في غرفة الكتابة: تأملات أدبية": "author's credentials, not this book",
  "كتاب البهجة": "authors' Nobel prizes",
  "اللطف من أصغر الأشياء وأكثرها أهمية": "author's award",
  "مسيو إبراهيم وزهور القرآن": "César for the film's actor",
  "بوذا وآينشتاين في المقهى": "an award-winning seminar, not the book",
  "فكر كرجل أعمال تصرف كمدير": "Pulitzer belongs to a blurb writer",
  "خيار الحب": "TV programme's awards",
  "نقلات الروح": "TV programme's awards",
  "سولاريس": "author's honours",
  "قلب الظلمات": "the film adaptation's awards",
  "أنا وخوف": "author's award for a different book",
  "فضائل الحرب رواية عن الاسكندر الاكبر": "author described as award-winning",
  "أحجية إدمون عمران المالح": "a prize inside the plot",
  "أطفال بأحلام كبيرة - ماري كوري": "Marie Curie's Nobel, the book's subject",
  "نساء متميزات من الشرق": "the women profiled won the prizes",
  "ملالا فتاة شجاعة من باكستان / إقبال فتى شجاع من باكستان": "the subject's Nobel",
  "الوارثون: ثلاثية الوسية ج2 - مختارات الكرمة": "prize went to volume 1",
};

const COMIC_PREFIX = "كلاسيكيات مصورة";

async function link(slug: string, bookIds: string[], label: string) {
  const cat = await prisma.category.findUnique({ where: { slug }, select: { id: true, name: true } });
  if (!cat) { console.log(`${slug}: no such category — skipped`); return; }

  const existing = await prisma.bookCategory.findMany({ where: { categoryId: cat.id }, select: { bookId: true } });
  const have = new Set(existing.map((e) => e.bookId));
  const missing = bookIds.filter((id) => !have.has(id));
  console.log(`${cat.name}: ${bookIds.length} ${label}, ${have.size} already linked, ${missing.length} to add`);
  if (!APPLY || missing.length === 0) return;

  for (let i = 0; i < missing.length; i += 500) {
    await prisma.bookCategory.createMany({
      data: missing.slice(i, i + 500).map((id) => ({ bookId: id, categoryId: cat.id })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  const books = await prisma.book.findMany({
    where: { isActive: true },
    select: { id: true, title: true, synopsis: true },
  });

  const matched = books.filter((b) => AWARD.test(b.synopsis));
  const excluded = matched.filter((b) => EXCLUDED_TITLES[b.title]);
  const awarded = matched.filter((b) => !EXCLUDED_TITLES[b.title]);

  const stale = Object.keys(EXCLUDED_TITLES).filter((t) => !matched.some((b) => b.title === t));
  if (stale.length) console.log("EXCLUDED_TITLES entries that no longer match anything:", stale.join(" | "));

  console.log(`award regex matched ${matched.length}; ${excluded.length} excluded by hand; ${awarded.length} kept\n`);
  for (const b of awarded) console.log("  +", b.title);
  console.log();

  const comics = books.filter((b) => b.title.startsWith(COMIC_PREFIX));

  await link("award-winning-books", awarded.map((b) => b.id), "award-winning");
  await link("picture-books", comics.map((b) => b.id), "illustrated classics");

  console.log(APPLY ? "\napplied" : "\ndry run — nothing written (pass --apply)");
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
