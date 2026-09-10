/**
 * Backfills Book.ageRange on the children's shelves so الفئة العمرية is worth
 * showing. 140 books carried an age (all of them Hachette Antoine titles, the
 * only source that shipped the field); 593 more sat on a children's shelf with
 * nothing, and the المراهقون bracket matched no book at all.
 *
 * Three rules, in priority order — nothing outside them is touched:
 *
 *   1. STATED   the book's own text gives an age. The title wins over the
 *               synopsis, because a series blurb quotes the whole series' span
 *               ("من 3 إلى 11 سنة") while the title carries that volume's band
 *               ("البارعون الصغار - مثلجات 9-10").
 *   2. ACTIVITY colouring / sticker / activity books → 5-8. These are licensed
 *               character colouring books (Marvel, Star Wars, دورية المخلب);
 *               5-8 is the band the trade puts them in.
 *   3. CURATED  the كتب للناشئة shelf, read title by title. It is a mixed
 *               shelf — picture-book biographies next to YA fantasy — so a
 *               shelf-wide default would have been wrong; the table below is
 *               the judgement call for each one, and it is what finally fills
 *               المراهقون.
 *
 * Books on كتب أطفال that none of the three cover are deliberately left NULL:
 * there is no signal in the data for them and a guess would mislabel the shelf.
 *
 *   npx tsx scripts/backfill-age-ranges.ts          # dry run + review file
 *   npx tsx scripts/backfill-age-ranges.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const CHILDREN_SHELVES = ["كتب-أطفال", "كتب-للناشئة", "تلوين-وأنشطة"];

/** The four values the filter offers, lowest first. */
type Age = "preschool" | "5-8" | "9-12" | "teen";

const RANGE = /(?:من\s*)?(\d{1,2})\s*(?:[-–—]|إلى|الى|و\s*)\s*(\d{1,2})\s*(?:سنة|سنوات|عام|أعوام|عامًا)/;
const TITLE_BAND = /(\d{1,2})\s*[-–—]\s*(\d{1,2})\s*(?:سنوات|سنة)?\s*\)?\s*$/;
const ACTIVITY = /تلوين|تلوينات|ألوّن|ألون|أنشطة|ستيكرز|ملصقات|coloring|color me|colouring/i;

/** A stated span becomes the bracket its midpoint falls in. */
function bracketFor(a: number, b: number): Age {
  const [lo, hi] = a <= b ? [a, b] : [b, a];
  const mid = (lo + hi) / 2;
  if (mid < 5) return "preschool";
  if (mid <= 8) return "5-8";
  if (mid <= 12) return "9-12";
  return "teen";
}

/** كتب للناشئة, read one by one — see the header. */
const CURATED: Record<string, Age> = {
  "Calling Magic": "teen",
  "Circus of the Greats": "teen",
  "The Scenarist": "teen",
  "Wielding Magic": "teen",
  "نداء القوى": "teen",
  "مملكة إبريز": "teen",
  "هذا الظل لا يشبهني": "teen",
  "شمس بلا ضوء": "teen",
  "شوك الكوادي": "teen",
  "دموع القاتل": "teen",
  "الناصر صلاح الدين": "teen",
  "رموز وعلامات من حولنا": "teen",

  "Hayy Bin Yaqdhan: The Island Adventure": "9-12",
  "What Happened to Zeeko": "9-12",
  "حيّ بن يقظان: مغامرة الجزيرة": "9-12",
  "أحلام شمس": "9-12",
  "أسفل الوادي قرب النهر": "9-12",
  "أمثال خالدة من قصص كليلة ودمنة": "9-12",
  "الرمح الشارد": "9-12",
  "الفتى في آخر الزقاق": "9-12",
  "باي باي ببجي": "9-12",
  "خبر صادم كيف نتصرف؟": "9-12",
  "رحلة انقاذ العالم": "9-12",
  "سلسلة الخرائط المفقودة: جزيرة الكنز": "9-12",
  "سلسلة الخرائط المفقودة: سر البوصلة الذهبية": "9-12",
  "سلسلة الخرائط المفقودة: لغز الجرادة": "9-12",
  "سلسلة مفتاح الأزمنة: غزالة رأس عشيرج": "9-12",
  "سلسلة مفتاح الأزمنة: قراصنة خور حسَّان": "9-12",
  "سلسلة مفتاح الأزمنة: قلعة الزبارة": "9-12",
  "شاهين ومجرة الحجر الأزرق": "9-12",
  "عالم عمر: جاسوس خارق للعادة": "9-12",
  "عالم عمر: مغناطيس يجذب المتاعب": "9-12",
  "عالم عمر: مهمة الانقاذ المدهشة": "9-12",
  "عشرون قطعة ذهبية": "9-12",
  "غابة لم تر ثعلبًا": "9-12",
  "غراب خارج السرب": "9-12",
  "قطة آيا صوفيا": "9-12",
  "ملهي الرعيان": "9-12",
  "نادية في مغامرة ساحرة": "9-12",
  "نجمات العيد": "9-12",

  "Hayakom": "5-8",
  "حياكم": "5-8",
  "The Boy who loved to pass the ball": "5-8",
  "The Boy who Wanted to Box Like Ali": "5-8",
  "The Girl who Dreamed of Climbing Mount Everest": "5-8",
  "الفتى الذي أحب تمرير الكرة": "5-8",
  "الفتاة التي أحبت الغولف": "5-8",
  "الفتاة التي حلمت بتسلق قمة إيفرست": "5-8",
  "النورس الصغير والثعلب": "5-8",
  "زرافة المدينة": "5-8",
  "الولد": "5-8",
  "صقر": "5-8",
};

/** On the shelf but not of it — left alone rather than given a children's age. */
const LEAVE_NULL: Record<string, string> = {
  "طيور ايلول": "adult literary novel, filed under كتب للناشئة by mistake",
};

async function main() {
  const cats = await prisma.category.findMany({ where: { slug: { in: CHILDREN_SHELVES } }, select: { id: true, slug: true } });
  const books = await prisma.book.findMany({
    where: { isActive: true, ageRange: null, categories: { some: { categoryId: { in: cats.map((c) => c.id) } } } },
    select: { id: true, title: true, synopsis: true, categories: { select: { categoryId: true } } },
    orderBy: { title: "asc" },
  });

  const colouringShelf = cats.find((c) => c.slug === "تلوين-وأنشطة")?.id;
  // Titles are matched NFC-normalised: some rows store a shadda before its
  // vowel mark and some after, which is the same word but not the same string.
  const key = (t: string) => t.normalize("NFC");
  const curated = new Map(Object.entries(CURATED).map(([t, a]) => [key(t), a]));
  const leaveNull = new Map(Object.entries(LEAVE_NULL).map(([t, w]) => [key(t), w]));

  const decided: { id: string; title: string; age: Age; rule: string }[] = [];
  const skipped: { title: string; why: string }[] = [];

  for (const b of books) {
    const why = leaveNull.get(key(b.title));
    if (why) { skipped.push({ title: b.title, why }); continue; }

    const titleBand = b.title.match(TITLE_BAND) ?? b.title.match(RANGE);
    const synopsisBand = b.synopsis.match(RANGE);
    const onColouringShelf = !!colouringShelf && b.categories.some((c) => c.categoryId === colouringShelf);

    const hand = curated.get(key(b.title));

    if (titleBand) decided.push({ id: b.id, title: b.title, age: bracketFor(+titleBand[1], +titleBand[2]), rule: `stated in title (${titleBand[0].trim()})` });
    else if (synopsisBand) decided.push({ id: b.id, title: b.title, age: bracketFor(+synopsisBand[1], +synopsisBand[2]), rule: `stated in synopsis (${synopsisBand[0].trim()})` });
    else if (onColouringShelf || ACTIVITY.test(b.title)) decided.push({ id: b.id, title: b.title, age: "5-8", rule: "colouring / activity book" });
    else if (hand) decided.push({ id: b.id, title: b.title, age: hand, rule: "curated (كتب للناشئة)" });
    else skipped.push({ title: b.title, why: "no signal" });
  }

  const stale = Array.from(curated.keys()).filter((t) => !books.some((b) => key(b.title) === t));
  if (stale.length) console.log("CURATED titles that matched no unassigned book:\n  " + stale.join("\n  ") + "\n");

  const byAge = decided.reduce<Record<string, number>>((acc, d) => ({ ...acc, [d.age]: (acc[d.age] ?? 0) + 1 }), {});
  console.log(`children's books without an age: ${books.length}`);
  console.log(`assigning: ${decided.length} — ${JSON.stringify(byAge)}`);
  console.log(`leaving NULL: ${skipped.length}`);

  const lines = [
    "# Age-range backfill",
    "",
    `Generated by \`scripts/backfill-age-ranges.ts\`. ${decided.length} of ${books.length} unassigned children's books were given an age; ${skipped.length} were left NULL.`,
    "",
    "## Assigned",
    "",
    "| Book | الفئة العمرية | Rule |",
    "| --- | --- | --- |",
    ...decided.map((d) => `| ${d.title.replace(/\|/g, "\\|")} | ${d.age} | ${d.rule} |`),
    "",
    "## Left without an age",
    "",
    "| Book | Why |",
    "| --- | --- |",
    ...skipped.map((s) => `| ${s.title.replace(/\|/g, "\\|")} | ${s.why} |`),
    "",
  ];
  writeFileSync("AGE-RANGE-REVIEW.md", lines.join("\n"), "utf8");
  console.log("wrote AGE-RANGE-REVIEW.md");

  if (!APPLY) { console.log("\ndry run — nothing written to the database (pass --apply)"); await prisma.$disconnect(); return; }

  for (const d of decided) {
    await prisma.book.update({ where: { id: d.id }, data: { ageRange: d.age } });
  }
  console.log(`\napplied: ${decided.length} books updated`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
