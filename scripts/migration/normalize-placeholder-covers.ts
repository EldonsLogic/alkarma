/**
 * The source project ships a placeholder image at /covers/placeholder.jpg and
 * points cover-less books at it. That file does not exist in this project, so
 * those rows render a BROKEN image rather than a graceful fallback.
 *
 * Every storefront cover render already falls back on a falsy coverUrl (showing
 * the title on a grey tile), and the admin "Match Covers to Products" tool
 * treats both "" and any path containing "placeholder" as needing a cover. So
 * rewriting the dead sentinel to "" fixes the rendering without losing the fact
 * that these books still need artwork.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const before = await p.book.count({ where: { coverUrl: { contains: "placeholder" } } });
  const r = await p.book.updateMany({ where: { coverUrl: { contains: "placeholder" } }, data: { coverUrl: "" } });
  const withCover = await p.book.count({ where: { NOT: { coverUrl: "" } } });
  const total = await p.book.count();
  console.log(`placeholder rows: ${before} -> rewritten ${r.count}`);
  console.log(`covers present: ${withCover}/${total} · still need artwork: ${total - withCover}`);
  await p.$disconnect();
})();
