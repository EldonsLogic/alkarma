/**
 * Seed script — adds Stationery category with subcategories
 * Run with: npx ts-node -r tsconfig-paths/register --project tsconfig.json scripts/seed-stationery.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create top-level Stationery category
  const stationery = await prisma.category.upsert({
    where: { slug: "stationery" },
    update: { name: "Stationery & Gifts", nameAr: "أدوات مكتبية", isActive: true, sortOrder: 4 },
    create: {
      slug: "stationery",
      name: "Stationery & Gifts",
      nameAr: "أدوات مكتبية",
      sortOrder: 4,
      isActive: true,
    },
  });

  console.log(`✔ Upserted: ${stationery.name} (${stationery.id})`);

  const subcategories = [
    { slug: "stationery-pens-pencils",   name: "Pens & Pencils",   nameAr: "أقلام", sortOrder: 1 },
    { slug: "stationery-notebooks",       name: "Notebooks & Journals", nameAr: "دفاتر ومفكرات", sortOrder: 2 },
    { slug: "stationery-art-supplies",    name: "Art Supplies",     nameAr: "أدوات الفن", sortOrder: 3 },
    { slug: "stationery-office",          name: "Office Supplies",  nameAr: "مستلزمات المكتب", sortOrder: 4 },
    { slug: "stationery-gift-wrap",       name: "Gift Wrap & Cards", nameAr: "تغليف وبطاقات", sortOrder: 5 },
    { slug: "stationery-craft",           name: "Craft & DIY",      nameAr: "الحرف اليدوية", sortOrder: 6 },
  ];

  for (const sub of subcategories) {
    const created = await prisma.category.upsert({
      where: { slug: sub.slug },
      update: { name: sub.name, nameAr: sub.nameAr, parentId: stationery.id, sortOrder: sub.sortOrder, isActive: true },
      create: {
        slug: sub.slug,
        name: sub.name,
        nameAr: sub.nameAr,
        parentId: stationery.id,
        sortOrder: sub.sortOrder,
        isActive: true,
      },
    });
    console.log(`  ✔ Subcategory: ${created.name}`);
  }

  // Also ensure the other main categories have sensible sortOrders
  await prisma.category.updateMany({
    where: { slug: "fiction" },
    data: { sortOrder: 1 },
  });
  await prisma.category.updateMany({
    where: { slug: "non-fiction" },
    data: { sortOrder: 2 },
  });
  await prisma.category.updateMany({
    where: { slug: { in: ["childrens", "children"] } },
    data: { sortOrder: 3 },
  });

  console.log("\n✅ Stationery seeding complete.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
