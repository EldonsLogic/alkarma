/**
 * Applies the approved source-category -> target-category mapping and rebuilds
 * BookCategory in this project.
 *
 * The 41 existing categories are NOT touched: they carry the live site's own
 * slugs, which the /book-category -> /category prefix redirect (~2,870 inbound
 * links) depends on. Source categories are mapped onto them instead. Three new
 * categories are added, which costs nothing against the redirect map because no
 * live URL depends on them not existing.
 *
 * Idempotent: createMany with skipDuplicates, and new categories are upserted.
 *
 *   --dry   report only, write nothing
 */
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const src = new PrismaClient({ datasources: { db: { url: process.env.JEE_DIRECT_URL } } });
const dst = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });
const DRY = process.argv.includes("--dry");

function key(s: string) {
  return String(s).normalize("NFKD").replace(/[ً-ْـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .split(/\s+/).map((w) => (w.length > 3 && w.startsWith("ال") ? w.slice(2) : w))
    .join(" ").trim().toLowerCase();
}

const MANUAL: Record<string, string> = {
  "childrens-books": "كتب-أطفال",
  "كتب-الأطفال-والناشئة": "كتب-أطفال",
  "teen-young-adult": "كتب-للناشئة",
  "fiction": "روايات",
  "literature-fiction": "literature",
  "المعرفة-والعلوم": "science",
  "الدين-والروحانيات": "روحانيات",
  "الحياة-والأسرة": "تربية",
  "travel": "سياحة-وسفر",
};

/** Approved additions. No live URL depends on these not existing. */
const NEW_CATS = [
  { slug: "مسرحيات", name: "مسرحيات" },
  { slug: "تلوين-وأنشطة", name: "تلوين وأنشطة" },
  { slug: "سياحة-وسفر", name: "سياحة وسفر" },
];

/** Books the source left with no category at all. Title -> target slug. */
const ORPHAN_FALLBACK: { title: string; slug: string; why: string; review?: string }[] = [
  { title: "Thus Spoke Zarathustra", slug: "فلسفة", why: "Friedrich Nietzsche" },
  { title: "شققما هو الزن", slug: "روحانيات", why: "synopsis describes Zen philosophy" },
  { title: "الحضور في الان - رحلة الى أعماق النفس والعودة", slug: "self-development", why: "synopsis: understanding one's feelings and thoughts" },
  { title: "The Journey: A Goal-Setting Journal", slug: "stationary", why: "an undated planner — a stationery product, not reading material" },
  { title: "شباب دائم", slug: "صحة", why: "no author, synopsis or tags in the source — placed on the title alone",
    review: "Only evidence is the publisher (دار الخيال). صحة is a guess, not a determination." },
];

(async () => {
  const srcCats: any[] = await src.$queryRawUnsafe(`SELECT id, slug, name FROM "Category"`);
  const links: any[] = await src.$queryRawUnsafe(`SELECT "bookId", "categoryId" FROM "BookCategory"`);

  if (!DRY) {
    const maxOrder = (await dst.category.aggregate({ _max: { sortOrder: true } }))._max.sortOrder ?? 0;
    for (const [i, c] of NEW_CATS.entries()) {
      await dst.category.upsert({
        where: { slug: c.slug },
        update: {},
        create: { slug: c.slug, name: c.name, kind: "BOOK", sortOrder: maxOrder + 1 + i, isActive: true },
      });
    }
    console.log(`ensured ${NEW_CATS.length} new categories`);
  }

  const dstCats = await dst.category.findMany({ select: { id: true, slug: true, name: true } });
  const idBySlug = new Map(dstCats.map((c) => [c.slug, c.id]));
  const bySlug = new Set(dstCats.map((c) => c.slug));
  const byKey = new Map(dstCats.map((c) => [key(c.name), c.slug]));

  const target = new Map<string, string | null>();
  for (const c of srcCats) {
    let t: string | null = null;
    if (MANUAL[c.slug]) t = MANUAL[c.slug];
    else if (bySlug.has(c.slug)) t = c.slug;
    else if (byKey.has(key(c.name))) t = byKey.get(key(c.name))!;
    target.set(c.id, t);
  }

  const pairs = new Map<string, { bookId: string; categoryId: string }>();
  let dropped = 0;
  for (const l of links) {
    const slug = target.get(l.categoryId);
    if (!slug) { dropped++; continue; }
    const categoryId = idBySlug.get(slug);
    if (!categoryId) { dropped++; continue; }
    pairs.set(`${l.bookId}|${categoryId}`, { bookId: l.bookId, categoryId });
  }

  for (const o of ORPHAN_FALLBACK) {
    const b = await dst.book.findFirst({ where: { title: o.title }, select: { id: true } });
    if (!b) { console.log(`  !! orphan fallback: book not found — ${o.title}`); continue; }
    const categoryId = idBySlug.get(o.slug);
    if (!categoryId) { console.log(`  !! orphan fallback: category not found — ${o.slug}`); continue; }
    pairs.set(`${b.id}|${categoryId}`, { bookId: b.id, categoryId });
  }

  const rows = [...pairs.values()];
  console.log(`source links ${links.length} · unique target links ${rows.length} · dropped ${dropped} (0-book / unmapped categories)`);
  if (DRY) { await src.$disconnect(); await dst.$disconnect(); return; }

  let written = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const r = await dst.bookCategory.createMany({ data: rows.slice(i, i + 500), skipDuplicates: true });
    written += r.count;
  }

  const total = await dst.book.count();
  const uncategorised = await dst.book.count({ where: { categories: { none: {} } } });
  console.log(`wrote ${written} BookCategory rows`);
  console.log(`categorised ${total - uncategorised}/${total} · uncategorised ${uncategorised}`);

  const review = ORPHAN_FALLBACK.filter((o) => o.review);
  writeFileSync("CATALOGUE-REVIEW.md", `# Catalogue — needs manual review

Placements made without solid evidence during the catalogue migration. Everything
else was mapped from an explicit source category or from clear evidence in the
book's own record. Worth a look from whoever owns the catalogue.

${review.map((o) => `## ${o.title}\n\n- **Placed in:** \`${o.slug}\`\n- **Why:** ${o.why}\n- **Caveat:** ${o.review}\n`).join("\n")}
## Known source-data issues (left as-is — temporary seed data)

- \`Thus Spoke Zarathustra\` — synopsis is the string "Minor Cover wear", a
  condition note where a description belongs. Originates in the source
  catalogue, not in this migration.
- \`شققما هو الزن\` — title has a typo in the source.
- \`Thus Spoke Zarathustra\` and \`The Journey: A Goal-Setting Journal\` carry
  English titles on an Arabic-only storefront.
`);
  console.log("wrote CATALOGUE-REVIEW.md");
  await src.$disconnect(); await dst.$disconnect();
})();
