/**
 * Merge the three English legacy categories the previous (WordPress) site
 * carried into their Arabic equivalents, and 301 the old URLs.
 *
 * The store is Arabic-only, so an English category structure must not be
 * recreated — but the old URLs are presumably still indexed, so they are
 * redirected rather than deleted outright.
 *
 * What this does:
 *   1. Re-points any BookCategory rows on a legacy category at its Arabic
 *      equivalent (skipping links that already exist), then removes the empty
 *      legacy category.
 *   2. Registers 301 redirects for BOTH the old WordPress path and this app's
 *      own category path, so either shape resolves.
 *
 * Safe to run before the catalogue import (there is simply nothing to move
 * yet) and again after it — the merge step is idempotent.
 *
 * Run:  npx tsx --env-file .env.local scripts/merge-legacy-english-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** legacy English slug → the Arabic category it belongs in. */
const MERGES: { from: string; fromLabel: string; to: string; toLabel: string }[] = [
  { from: "childrens-books", fromLabel: "Children's Books", to: "كتب-أطفال", toLabel: "كتب أطفال" },
  { from: "fiction",         fromLabel: "Fiction",          to: "روايات",     toLabel: "روايات" },
  { from: "non-fiction",     fromLabel: "Non-Fiction",      to: "literature", toLabel: "أدب" },
];

async function upsertRedirect(fromPath: string, toPath: string) {
  await prisma.redirect.upsert({
    where: { fromPath },
    update: { toPath, statusCode: 301 },
    create: { fromPath, toPath, statusCode: 301 },
  });
  console.log(`    301  ${fromPath}  →  ${toPath}`);
}

async function main() {
  console.log("Merging legacy English categories…\n");

  for (const m of MERGES) {
    console.log(`  ${m.fromLabel} → ${m.toLabel}`);

    const target = await prisma.category.findUnique({ where: { slug: m.to } });
    if (!target) {
      console.warn(`    ⚠️  target category "${m.to}" not found — run seed-categories.ts first. Skipping merge.`);
    } else {
      const legacy = await prisma.category.findUnique({ where: { slug: m.from } });
      if (!legacy) {
        console.log("    (no legacy category row — nothing to move)");
      } else {
        // BookCategory has a COMPOSITE primary key (bookId, categoryId) — there
        // is no scalar id — so rows are addressed via the compound selector.
        const links = await prisma.bookCategory.findMany({ where: { categoryId: legacy.id } });
        let moved = 0, already = 0;
        for (const link of links) {
          const key = { bookId_categoryId: { bookId: link.bookId, categoryId: legacy.id } };
          const exists = await prisma.bookCategory.findUnique({
            where: { bookId_categoryId: { bookId: link.bookId, categoryId: target.id } },
          });
          if (exists) {
            // Book is already in the target category — drop the duplicate link.
            await prisma.bookCategory.delete({ where: key });
            already++;
          } else {
            // Can't UPDATE part of a composite key, so re-create the link.
            await prisma.bookCategory.delete({ where: key });
            await prisma.bookCategory.create({
              data: { bookId: link.bookId, categoryId: target.id },
            });
            moved++;
          }
        }
        await prisma.category.delete({ where: { id: legacy.id } });
        console.log(`    moved ${moved} book link(s), ${already} already present; legacy category removed`);
      }
    }

    // Redirect both URL shapes: the old WordPress one and this app's own.
    await upsertRedirect(`/book-category/${m.from}`, `/category/${m.to}`);
    await upsertRedirect(`/category/${m.from}`, `/category/${m.to}`);
  }

  const total = await prisma.redirect.count();
  console.log(`\n✅ Done. ${total} redirect(s) registered.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
