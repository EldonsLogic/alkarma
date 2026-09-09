/**
 * READ-ONLY. Produces the proposed source-category -> target-category mapping
 * and, crucially, reports any BOOK that would end up with zero categories once
 * the mapping is applied. Writes nothing.
 */
import { PrismaClient } from "@prisma/client";

const src = new PrismaClient({ datasources: { db: { url: process.env.JEE_DIRECT_URL } } });
const dst = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

function key(s: string) {
  return String(s).normalize("NFKD").replace(/[ً-ْـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .split(/\s+/).map((w) => (w.length > 3 && w.startsWith("ال") ? w.slice(2) : w))
    .join(" ").trim().toLowerCase();
}

/** Source slug -> target slug, for categories auto-matching cannot resolve. */
const MANUAL: Record<string, string> = {
  "childrens-books": "كتب-أطفال",
  "كتب-الأطفال-والناشئة": "كتب-أطفال",
  "teen-young-adult": "كتب-للناشئة",
  "fiction": "روايات",
  "literature-fiction": "literature",
  "المعرفة-والعلوم": "science",
  "الدين-والروحانيات": "روحانيات",
  "الحياة-والأسرة": "تربية",
};

/** Approved additions — no live URL depends on these not existing. */
const NEW_CATS: Record<string, { slug: string; name: string }> = {
  "مسرحيات": { slug: "مسرحيات", name: "مسرحيات" },
  "تلوين-وأنشطة": { slug: "تلوين-وأنشطة", name: "تلوين وأنشطة" },
};

(async () => {
  const srcCats: any[] = await src.$queryRawUnsafe(`SELECT id, slug, name FROM "Category"`);
  const links: any[] = await src.$queryRawUnsafe(`SELECT "bookId", "categoryId" FROM "BookCategory"`);
  const books: any[] = await src.$queryRawUnsafe(`SELECT id, title FROM "Book"`);
  const dstCats = await dst.category.findMany({ select: { slug: true, name: true, kind: true } });

  const bySlug = new Map(dstCats.map((c) => [c.slug, c]));
  const byKey = new Map(dstCats.map((c) => [key(c.name), c]));

  // resolve each source category to a target slug (or null)
  const resolved = new Map<string, { target: string | null; how: string; name: string; slug: string }>();
  for (const c of srcCats) {
    let target: string | null = null, how = "";
    if (NEW_CATS[c.slug]) { target = NEW_CATS[c.slug].slug; how = "NEW category"; }
    else if (MANUAL[c.slug]) { target = MANUAL[c.slug]; how = "manual"; }
    else if (bySlug.has(c.slug)) { target = c.slug; how = "exact slug"; }
    else if (byKey.has(key(c.name))) { target = byKey.get(key(c.name))!.slug; how = "name match"; }
    resolved.set(c.id, { target, how: how || "UNMAPPED", name: c.name, slug: c.slug });
  }

  // per-category report
  const perCat = new Map<string, number>();
  for (const l of links) perCat.set(l.categoryId, (perCat.get(l.categoryId) ?? 0) + 1);

  const rows = srcCats.map((c) => ({ ...resolved.get(c.id)!, books: perCat.get(c.id) ?? 0 }))
    .sort((a, b) => b.books - a.books);

  console.log("=== proposed mapping (categories holding books) ===");
  for (const r of rows.filter((r) => r.books > 0))
    console.log(`  ${String(r.books).padStart(4)}  ${r.name.padEnd(28)} -> ${(r.target ?? "— NONE —").padEnd(22)} ${r.how}`);

  const emptyUnmapped = rows.filter((r) => r.books === 0 && !r.target);
  console.log(`\n  (${emptyUnmapped.length} further source categories hold 0 books and are dropped)`);

  // orphan detection: books whose every category resolves to null
  const byBook = new Map<string, string[]>();
  for (const l of links) {
    const t = resolved.get(l.categoryId)?.target ?? null;
    if (!byBook.has(l.bookId)) byBook.set(l.bookId, []);
    if (t) byBook.get(l.bookId)!.push(t);
  }
  const titles = new Map(books.map((b) => [b.id, b.title]));
  const noLinks = books.filter((b) => !byBook.has(b.id));
  const allDropped = books.filter((b) => byBook.has(b.id) && byBook.get(b.id)!.length === 0);

  console.log(`\n=== orphan check (${books.length} books) ===`);
  console.log(`  books with categories that ALL fail to map : ${allDropped.length}`);
  for (const b of allDropped.slice(0, 40)) {
    const from = links.filter((l) => l.bookId === b.id).map((l) => resolved.get(l.categoryId)?.name).join(", ");
    console.log(`     - ${titles.get(b.id)}   [only in: ${from}]`);
  }
  console.log(`  books with NO category rows in source at all: ${noLinks.length}`);
  for (const b of noLinks.slice(0, 40)) console.log(`     - ${titles.get(b.id)}`);

  const mapped = books.length - allDropped.length - noLinks.length;
  console.log(`\n  would be categorised: ${mapped}/${books.length}`);
  await src.$disconnect(); await dst.$disconnect();
})();
