/**
 * Links every book to its publisher's category.
 *
 * The catalogue carries the publisher as a free-text field on Book, and the
 * store also has six kind="PUBLISHER" categories — but nothing ever connected
 * the two, so all six category rows held zero books and the imprint column of
 * the mega-menu pointed at pages that could not resolve.
 *
 * Two of the category names are longer than the string the books actually
 * carry ("دار جامعة حمد بن خليفة للنشر" vs "جامعة حمد بن خليفة"), hence the
 * explicit map rather than a name equality join. Nothing is guessed: a
 * publisher string not listed here is reported and left alone.
 *
 *   npx tsx scripts/assign-publisher-categories.ts          # dry run
 *   npx tsx scripts/assign-publisher-categories.ts --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const PUBLISHER_CATEGORY: Record<string, string> = {
  // category slug            : publisher string on Book
  "دار-الخيال": "دار الخيال",
  "دار-الكرمة": "دار الكرمة",
  "دار-جامعة-حمد-بن-خليفة-للنشر": "جامعة حمد بن خليفة",
  "شركة-المطبوعات-للتوزيع-والنشر": "شركة المطبوعات",
  "مجموعة-كلمات": "مجموعة كلمات",
  "هاشيت-أنطوان": "هاشيت أنطوان",
};

async function main() {
  const cats = await prisma.category.findMany({
    where: { kind: "PUBLISHER" },
    select: { id: true, slug: true, name: true },
  });

  const unmapped = cats.filter((c) => !PUBLISHER_CATEGORY[c.slug]);
  if (unmapped.length) console.log("PUBLISHER categories with no mapping:", unmapped.map((c) => c.slug).join(", "));

  const known = new Set(Object.values(PUBLISHER_CATEGORY));
  const groups = await prisma.book.groupBy({ by: ["publisher"], _count: { _all: true } });
  const strays = groups.filter((g) => g.publisher && !known.has(g.publisher));
  if (strays.length) console.log("publisher strings with no category:", strays.map((g) => `${g.publisher} (${g._count._all})`).join(", "));

  let linked = 0;
  for (const cat of cats) {
    const publisher = PUBLISHER_CATEGORY[cat.slug];
    if (!publisher) continue;

    const books = await prisma.book.findMany({ where: { publisher }, select: { id: true } });
    const existing = await prisma.bookCategory.findMany({ where: { categoryId: cat.id }, select: { bookId: true } });
    const have = new Set(existing.map((e) => e.bookId));
    const missing = books.filter((b) => !have.has(b.id));

    console.log(`${cat.name}: ${books.length} books match, ${have.size} already linked, ${missing.length} to add`);
    if (!APPLY || missing.length === 0) continue;

    for (let i = 0; i < missing.length; i += 500) {
      await prisma.bookCategory.createMany({
        data: missing.slice(i, i + 500).map((b) => ({ bookId: b.id, categoryId: cat.id })),
        skipDuplicates: true,
      });
    }
    linked += missing.length;
  }

  console.log(APPLY ? `\napplied: ${linked} book→category links added` : "\ndry run — nothing written (pass --apply)");
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
