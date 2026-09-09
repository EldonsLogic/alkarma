/**
 * READ-ONLY inspection of the source (Jee) database ahead of the catalogue
 * copy. Writes nothing to either database. Raw SQL throughout so a schema
 * drift between the two projects cannot cause a false failure.
 *
 * Needs JEE_DIRECT_URL in .env.local. Delete this script once the copy is done.
 */
import { PrismaClient } from "@prisma/client";

const src = new PrismaClient({ datasources: { db: { url: process.env.JEE_DIRECT_URL } } });
const dst = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

const TABLES = ["Book", "Author", "Category", "BookCategory", "BookAuthor", "Tag", "BookTag"];

/**
 * Arabic-tolerant comparison key: unify alef/ya/ta-marbuta, drop tatweel and
 * diacritics, and strip the definite article "ال" from the front of each word.
 * That last part matters: the source calls it الأدب where the target calls it
 * أدب, and without it 745 book links look unmatched when they are the same
 * category.
 */
function key(s: string) {
  return String(s)
    .normalize("NFKD").replace(/[ً-ْـ]/g, "")
    .replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه")
    .split(/\s+/).map((w) => (w.length > 3 && w.startsWith("ال") ? w.slice(2) : w))
    .join(" ").trim().toLowerCase();
}

(async () => {
  console.log("=== source tables ===");
  for (const t of TABLES) {
    try {
      const r: any = await src.$queryRawUnsafe(`SELECT COUNT(*)::int AS n FROM "${t}"`);
      console.log(`  ${t.padEnd(14)} ${r[0].n}`);
    } catch (e: any) {
      console.log(`  ${t.padEnd(14)} — ${String(e.message).split("\n")[0].slice(0, 60)}`);
    }
  }

  const cols: any = await src.$queryRawUnsafe(
    `SELECT column_name FROM information_schema.columns WHERE table_name='Category' ORDER BY ordinal_position`,
  );
  console.log("\n=== source Category columns ===\n  " + cols.map((c: any) => c.column_name).join(", "));

  const srcCats: any = await src.$queryRawUnsafe(
    `SELECT id, slug, name, "nameAr", "parentId", "isActive" FROM "Category" ORDER BY name`,
  );
  const counts: any = await src.$queryRawUnsafe(
    `SELECT "categoryId", COUNT(*)::int AS n FROM "BookCategory" GROUP BY "categoryId"`,
  );
  const byCat = new Map(counts.map((c: any) => [c.categoryId, c.n]));

  const dstCats = await dst.category.findMany({ select: { slug: true, name: true, kind: true } });

  const dstBySlug = new Map(dstCats.map((c) => [c.slug, c]));
  const dstByKey = new Map(dstCats.map((c) => [key(c.name), c]));

  console.log(`\n=== source categories: ${srcCats.length} | target categories: ${dstCats.length} ===\n`);
  let slugHit = 0, nameHit = 0, miss = 0, booksMissed = 0;
  const missRows: string[] = [];
  for (const c of srcCats) {
    const n = (byCat.get(c.id) as number) ?? 0;
    const bySlug = dstBySlug.get(c.slug);
    const byName = dstByKey.get(key(c.name));
    let mark: string;
    if (bySlug) { mark = "SLUG+NAME match"; slugHit++; }
    else if (byName) { mark = `name match -> ${byName.slug}`; nameHit++; }
    else { mark = "NO MATCH"; miss++; booksMissed += n; missRows.push(`${c.name} (${c.slug}) — ${n} books`); }
    console.log(`  ${String(n).padStart(4)}  ${(c.name || "").padEnd(32)} ${c.slug.padEnd(34)} ${mark}`);
  }

  console.log(`\n=== overlap summary ===`);
  console.log(`  exact slug match : ${slugHit}`);
  console.log(`  name-only match  : ${nameHit}`);
  console.log(`  no match         : ${miss}  (covering ${booksMissed} book links)`);
  if (missRows.length) console.log("\n  unmatched source categories:\n    - " + missRows.join("\n    - "));

  const orphan = dstCats.filter((c) => !srcCats.some((s: any) => s.slug === c.slug || key(s.name) === key(c.name)));
  console.log(`\n  target categories with no source counterpart: ${orphan.length}`);
  if (orphan.length) console.log("    - " + orphan.map((c) => `${c.name} (${c.slug})`).join("\n    - "));

  await src.$disconnect(); await dst.$disconnect();
})();
