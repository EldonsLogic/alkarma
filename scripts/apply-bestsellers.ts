/**
 * Replaces the placeholder bestseller set with the real one.
 *
 * The isBestseller flag came over from the source catalogue set on ten
 * unrelated المكتبة الصغيرة titles — placeholder data, never sales. The real
 * list is the "Karma website bestsellers" sheet: 24 titles, matched by ISBN,
 * with the historical quantity sold where the sheet has one. Six are recent
 * releases the sheet predates; they are flagged but keep whatever salesCount
 * they have, so they sort after the ones with figures until real numbers
 * arrive. Jee applied the same list the same way.
 *
 *   npx tsx scripts/apply-bestsellers.ts          # dry run
 *   npx tsx scripts/apply-bestsellers.ts --apply
 */
import { PrismaClient } from "@prisma/client";

const APPLY = process.argv.includes("--apply");
const prisma = new PrismaClient();

/** ISBN → quantity sold (null = not in the sheet). */
const BESTSELLERS: [string, number | null][] = [
  ["9789779603599", null],  // قضية مخالب القط: تحقيقات نوح الألفي ج5
  ["9789776743861", 16568], // قضية ست الحسن: تحقيقات نوح الألفي ج1
  ["9789779603452", 15573], // قضية ذيل القط: تحقيقات نوح الألفي ج4
  ["9789778727326", 15082], // قضية عنب الثعلب: تحقيقات نوح الألفي ج3
  ["9789776743878", 13220], // قضية لوز مر: تحقيقات نوح الألفي ج2
  ["9789779603339", 12939], // قنبلة للاستخدام الشخصي
  ["9789779603292", 9553],  // صديقي السيكوباتي
  ["9789778678321", 9475],  // جسمك يتذكر كل شيء
  ["9789779603261", 8737],  // جاز وروك
  ["9789778648065", 8736],  // دليل جدتي لقتل الأوغاد
  ["9789779603605", null],  // العلاج بالقراءة
  ["9789779603247", 4984],  // سيوف الآخرة: ثلاثية القتلة الأوائل ج3
  ["9789779603155", 4658],  // أخوية الطبقة المتوسطة
  ["9789779603018", 4453],  // لا تكذب أبدًا
  ["9789776467552", 4251],  // في ممر الفئران
  ["9789776743458", 3852],  // التغيير للأفضل
  ["9789779603254", 3465],  // دعني أخبرك بشيء
  ["9789779603063", 2816],  // الأمير الصغير
  ["9789779603315", 2813],  // مكتبة الكلمات المفقودة
  ["9789776467675", 2567],  // التنوير في اسقاط التدبير
  ["9789779603681", null],  // للقتل ثمن لاحق
  ["9789779603568", null],  // وجدتك
  ["9786140135383", null],  // الخادمة (طبعة مصرية)
  ["9789779603537", null],  // البرنسيسة والأفندي (جزءان)
];

async function main() {
  const isbns = BESTSELLERS.map(([i]) => i);
  const books = await prisma.book.findMany({ where: { isbn: { in: isbns } }, select: { id: true, isbn: true, title: true, salesCount: true } });
  const missing = isbns.filter((i) => !books.some((b) => b.isbn === i));
  if (missing.length) console.log("not in catalogue:", missing.join(", "));

  const stale = await prisma.book.findMany({ where: { isBestseller: true, NOT: { isbn: { in: isbns } } }, select: { id: true, title: true } });
  console.log(`clearing the flag on ${stale.length} placeholder titles:`);
  for (const s of stale) console.log("  −", s.title);

  console.log(`\nflagging ${books.length}:`);
  for (const [isbn, qty] of BESTSELLERS) {
    const b = books.find((x) => x.isbn === isbn);
    if (!b) continue;
    console.log(`  + ${b.title.slice(0, 48).padEnd(48)} salesCount ${b.salesCount} → ${qty ?? `${b.salesCount} (no figure, kept)`}`);
  }

  if (!APPLY) { console.log("\ndry run — nothing written (pass --apply)"); await prisma.$disconnect(); return; }

  await prisma.$transaction([
    prisma.book.updateMany({ where: { id: { in: stale.map((s) => s.id) } }, data: { isBestseller: false } }),
    ...BESTSELLERS.flatMap(([isbn, qty]) => {
      const b = books.find((x) => x.isbn === isbn);
      if (!b) return [];
      return [prisma.book.update({ where: { id: b.id }, data: { isBestseller: true, ...(qty != null ? { salesCount: qty } : {}) } })];
    }),
  ]);
  console.log(`\napplied: ${stale.length} cleared, ${books.length} flagged`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e instanceof Error ? e.message : e); await prisma.$disconnect(); process.exit(1); });
