/**
 * Re-points Alkarma books whose cover file has vanished from the shared Vercel
 * Blob store at Jee's current cover for the same book.
 *
 * The store is shared between the two projects, so when Jee replaces a cover by
 * deleting the old key and uploading a new one, Jee's row is updated but ours
 * still names the deleted key and the book renders with no cover. This walks
 * every blob-hosted cover we reference, HEAD-checks it (a plain CDN request,
 * not a billed list() call), and for each 404 takes Jee's URL for the same book
 * — matched by slug, then ISBN — provided that URL actually resolves.
 *
 * Nothing is uploaded or deleted; only Book.coverUrl rows change here.
 *
 *   npx tsx scripts/sync-covers-from-jee.ts          # dry run
 *   npx tsx scripts/sync-covers-from-jee.ts --apply
 */
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const alkarma = new PrismaClient();
const jee = new PrismaClient({ datasources: { db: { url: process.env.JEE_DATABASE_URL } } });

async function ok(url: string): Promise<boolean> {
  try { return (await fetch(url, { method: "HEAD" })).ok; } catch { return false; }
}

async function main() {
  if (!process.env.JEE_DATABASE_URL) throw new Error("JEE_DATABASE_URL is not set");

  const books = await alkarma.book.findMany({
    where: { coverUrl: { contains: "blob.vercel-storage.com" } },
    select: { id: true, slug: true, isbn: true, title: true, coverUrl: true },
  });
  console.log(`checking ${books.length} blob-hosted covers…`);

  const missing: typeof books = [];
  for (let i = 0; i < books.length; i += 25) {
    const chunk = books.slice(i, i + 25);
    const results = await Promise.all(chunk.map((b) => ok(b.coverUrl)));
    results.forEach((alive, k) => { if (!alive) missing.push(chunk[k]); });
  }
  console.log(`${missing.length} no longer resolve\n`);

  let fixed = 0;
  const unresolved: string[] = [];
  for (const b of missing) {
    const twin = await jee.book.findFirst({
      where: { OR: [{ slug: b.slug }, ...(b.isbn ? [{ isbn: b.isbn }] : [])] },
      select: { coverUrl: true },
    });
    const next = twin?.coverUrl;
    if (!next || next === b.coverUrl || !(await ok(next))) { unresolved.push(b.title); continue; }

    console.log(`  ${b.title}\n     ${b.coverUrl.split("/").pop()}\n  → ${next.split("/").pop()}`);
    if (APPLY) await alkarma.book.update({ where: { id: b.id }, data: { coverUrl: next } });
    fixed++;
  }

  console.log(`\n${APPLY ? "updated" : "would update"}: ${fixed}`);
  if (unresolved.length) console.log(`no working replacement on Jee's side (${unresolved.length}):\n  ` + unresolved.join("\n  "));
  await alkarma.$disconnect(); await jee.$disconnect();
}

main().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await alkarma.$disconnect(); await jee.$disconnect(); process.exit(1); });
