/**
 * Seed script — populates the MenuItem table with the store's header and
 * footer navigation. Idempotent: safe to run multiple times.
 *
 * The header mirrors the live alkarmabooks.com navigation exactly, so the
 * rebuilt site presents the same top-level structure shoppers already know.
 *
 * Run:  npx tsx --env-file .env.local scripts/seed-menu-items.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Top navigation — matches the live alkarmabooks.com header, in order.
const HEADER = [
  { label: "الرئيسية", href: "/", sortOrder: 1 },
  { label: "أحدث الإصدارات", href: "/new-releases", sortOrder: 2 },
  { label: "الأكثر مبيعًا", href: "/bestsellers", sortOrder: 3 },
  { label: "عروض وخصومات", href: "/category/offers", sortOrder: 4 },
  { label: "التصنيفات", href: "/category", sortOrder: 5 },
  { label: "كتب أطفال", href: "/category/children", sortOrder: 6 },
  { label: "أدوات مكتبية", href: "/category/stationery", sortOrder: 7 },
  { label: "موزعينا", href: "/distributors", sortOrder: 8 },
];

// The store's own footer carries exactly two link columns, in this order.
const FOOTER_SHOP = [
  { label: "المكتبة الكاملة", href: "/arabic-books", sortOrder: 1 },
  { label: "عن دار الكرمة", href: "/about", sortOrder: 2 },
  { label: "تواصل معنا", href: "/contact", sortOrder: 3 },
];

const FOOTER_HELP = [
  { label: "الأسئلة الشائعة", href: "/faq", sortOrder: 1 },
  { label: "الشروط والأحكام", href: "/terms", sortOrder: 2 },
  { label: "سياسة الخصوصية", href: "/privacy", sortOrder: 3 },
];

const FOOTER_LEGAL = [
  { label: "سياسة الخصوصية", href: "/privacy", sortOrder: 1 },
  { label: "الشروط والأحكام", href: "/terms", sortOrder: 2 },
];

async function upsertItems(menu: string, items: typeof FOOTER_SHOP) {
  for (const item of items) {
    // Check if an item with this href already exists in this menu
    const existing = await prisma.menuItem.findFirst({
      where: { menu, href: item.href },
    });
    if (existing) {
      await prisma.menuItem.update({
        where: { id: existing.id },
        data: { label: item.label, sortOrder: item.sortOrder },
      });
      console.log(`  ↺ Updated: [${menu}] ${item.label}`);
    } else {
      await prisma.menuItem.create({
        data: { menu, label: item.label, href: item.href, sortOrder: item.sortOrder },
      });
      console.log(`  ✔ Created: [${menu}] ${item.label}`);
    }
  }
}

async function main() {
  console.log("Seeding navigation menu items…\n");

  console.log("Header:");
  await upsertItems("header", HEADER);

  console.log("\nFooter — Shop column:");
  await upsertItems("footer_shop", FOOTER_SHOP);

  console.log("\nFooter — Help column:");
  await upsertItems("footer_help", FOOTER_HELP);

  console.log("\nFooter — Legal (bottom bar):");
  await upsertItems("footer_legal", FOOTER_LEGAL);

  console.log("\n✅ Navigation menu items seeded successfully.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
