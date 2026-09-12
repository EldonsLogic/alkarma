/**
 * One-time move of every cover to its fixed address, covers/<isbn>.webp.
 *
 * Why: see src/lib/coverKey.ts. Until now each cover sat under a random name,
 * so replacing one in Jee's admin gave it a new URL that only Jee's database
 * knew, and our copy broke when the old file was deleted.
 *
 * What it does, per book with a blob-hosted cover and an ISBN:
 *   1. copy() the current file to covers/<isbn>.webp inside the Blob store —
 *      server-side, nothing is downloaded here; the old file is left in place
 *      because Jee's rows still point at it.
 *   2. point Book.coverUrl (and the Media Library row) at the new address.
 *
 * Idempotent: books already on their stable key are skipped, so it can be
 * re-run after a failure. Covers whose current file no longer exists are
 * reported and left alone.
 *
 * Jee then only has to re-point its own rows to the same deterministic URLs —
 * the files are already there — and adopt the same key rule in its upload
 * route. Both stores then share one file per book.
 *
 *   npx tsx scripts/migrate-covers-to-stable-keys.ts          # dry run
 *   npx tsx scripts/migrate-covers-to-stable-keys.ts --apply
 */
import { PrismaClient } from "@prisma/client";
import { copy } from "@vercel/blob";
import { stableCoverPathname, isStableCoverUrl, COVER_CACHE_SECONDS } from "../src/lib/coverKey";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

async function exists(url: string) {
  try { return (await fetch(url, { method: "HEAD" })).ok; } catch { return false; }
}

async function main() {
  if (APPLY && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN is not set");

  const books = await prisma.book.findMany({
    where: { coverUrl: { contains: "blob.vercel-storage.com" } },
    select: { id: true, title: true, isbn: true, coverUrl: true },
    orderBy: { title: "asc" },
  });

  const todo = books.filter((b) => !isStableCoverUrl(b.coverUrl));
  const noIsbn = todo.filter((b) => !b.isbn);
  console.log(`${books.length} blob covers · ${books.length - todo.length} already on a stable key · ${todo.length} to move · ${noIsbn.length} without ISBN (skipped)`);

  let moved = 0;
  const missing: string[] = [];
  const failed: string[] = [];

  for (const b of todo) {
    if (!b.isbn) continue;
    const to = stableCoverPathname(b.isbn);

    if (!APPLY) { if (moved < 5) console.log(`  would copy ${b.coverUrl.split("/").pop()} → ${to}  (${b.title})`); moved++; continue; }

    if (!(await exists(b.coverUrl))) { missing.push(b.title); continue; }
    try {
      const { url } = await copy(b.coverUrl, to, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "image/webp",
        cacheControlMaxAge: COVER_CACHE_SECONDS,
      });
      await prisma.$transaction([
        prisma.book.update({ where: { id: b.id }, data: { coverUrl: url } }),
        // Keep the library row on the same file so "delete" still finds it;
        // if a row for the stable URL somehow exists already, drop the old one.
        prisma.mediaFile.deleteMany({ where: { url, NOT: { url: b.coverUrl } } }),
        prisma.mediaFile.updateMany({ where: { url: b.coverUrl }, data: { url } }),
      ]);
      moved++;
      if (moved % 100 === 0) console.log(`  …${moved} moved`);
    } catch (e) {
      failed.push(`${b.title}: ${e instanceof Error ? e.message : e}`);
    }
  }

  console.log(`\n${APPLY ? "moved" : "would move"}: ${moved}`);
  if (missing.length) console.log(`current file missing (left alone, ${missing.length}):\n  ` + missing.join("\n  "));
  if (failed.length) console.log(`failed (${failed.length}):\n  ` + failed.join("\n  "));
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
