/**
 * 301 redirect map: the previous WordPress/WooCommerce site → this app.
 *
 * Built from an actual crawl of alkarmabooks.com (its declared sitemap,
 * /wp-sitemap.xml, returns 404 — so search engines have only ever discovered
 * pages by following links, and every one of those links must keep resolving).
 *
 * Two kinds of rule:
 *   prefix — "/product" → "/book" rewrites /product/<slug> to /book/<slug>.
 *            Three prefix rules cover ~4,800 of the crawled links; writing
 *            them out individually would mean thousands of rows.
 *   exact  — one-off pages whose path changes shape entirely.
 *
 * Slugs are deliberately preserved on import (see seed-categories.ts), which
 * is what makes the prefix approach work.
 *
 * Idempotent. Run:
 *   npx tsx --env-file .env.local scripts/seed-redirects.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type Rule = { from: string; to: string; isPrefix?: boolean; note?: string };

const RULES: Rule[] = [
  // ── High-volume prefix rules ────────────────────────────────────────────
  { from: "/product", to: "/book", isPrefix: true, note: "~1,950 product links" },
  { from: "/book-category", to: "/category", isPrefix: true, note: "~2,870 category links" },
  { from: "/book-tag", to: "/tag", isPrefix: true, note: "tag archives" },

  // ── Content pages ───────────────────────────────────────────────────────
  { from: "/shop", to: "/arabic-books", note: "المكتبة الكاملة" },
  { from: "/faqs", to: "/faq" },
  { from: "/contact-us", to: "/contact" },
  { from: "/عن-الكرمة", to: "/about" },
  { from: "/موزعينا", to: "/distributors" },
  { from: "/terms-of-service-ar", to: "/terms" },
  { from: "/privacy-policy-ar", to: "/privacy" },

  // ── Account / commerce ──────────────────────────────────────────────────
  { from: "/wishlist", to: "/account/wishlist" },
  { from: "/my-account/lost-password", to: "/forgot-password" },
  { from: "/my-account/orders", to: "/account/orders" },
  { from: "/my-account/edit-address", to: "/account/addresses" },
  { from: "/my-account/edit-account", to: "/account/settings" },
  { from: "/my-account", to: "/account", isPrefix: true, note: "any remaining WooCommerce account sub-page" },

  // ── No direct equivalent — send somewhere useful rather than 404 ────────
  { from: "/recently-viewed-products", to: "/arabic-books", note: "آخر المشاهدات not built yet" },
];

// Deliberately NOT redirected: /wp-content/*, /wp-json/*, /feed/, /comments/feed/,
// /tbay_megamenu/*. These are WordPress plumbing, not content anyone linked to
// as a destination; 404ing them is correct and avoids masking real errors.

async function main() {
  console.log(`Seeding ${RULES.length} redirect rules…\n`);
  let created = 0, updated = 0;
  for (const r of RULES) {
    const data = { toPath: r.to, statusCode: 301, isPrefix: !!r.isPrefix };
    const existing = await prisma.redirect.findUnique({ where: { fromPath: r.from } });
    if (existing) {
      await prisma.redirect.update({ where: { fromPath: r.from }, data });
      updated++;
    } else {
      await prisma.redirect.create({ data: { fromPath: r.from, ...data } });
      created++;
    }
    const kind = r.isPrefix ? "prefix" : "exact ";
    console.log(`  ${kind}  ${r.from}  →  ${r.to}${r.note ? `   (${r.note})` : ""}`);
  }
  const total = await prisma.redirect.count();
  console.log(`\n✔ ${created} created, ${updated} updated — ${total} redirect(s) total.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
