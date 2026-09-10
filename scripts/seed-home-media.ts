/**
 * Seeds the footer's social links and the hero slider's banners.
 *
 * Both are admin-managed: the socials live in StoreSetting (Admin > Settings)
 * and the banners in the Banner table (Admin > Banners), so this only puts the
 * store's current content in place — it is not a hardcode. Re-runnable.
 *
 * Hero artwork is the store's own, copied from the live site's media library
 * (all 1170x330) into /public/hero so this site does not depend on the old one.
 *
 * The hero CTA label is stored in `subtitleAr` — HeroBanner renders it as the
 * button floating over the artwork. A banner with no subtitle shows no button.
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const SOCIALS: Record<string, string> = {
  facebook_url:  "https://www.facebook.com/alkarmabooks/",
  instagram_url: "https://www.instagram.com/alkarmabooks/",
  tiktok_url:    "https://www.tiktok.com/@alkarma_books",
  x_url:         "https://twitter.com/alkarmabooks",
  whatsapp_url:  "https://wa.me/201030165702",
  youtube_url:   "https://www.youtube.com/@AlKarmaBooks",
};

const BANNERS = [
  { title: "أحدث الإصدارات",          img: "/hero/hero-2026-1ST.jpg", href: "/new-releases",      cta: "تصفح الإصدارات" },
  { title: "تخفيضات معرض القاهرة",   img: "/hero/hero-2026-2nd.jpg", href: "/arabic-books",      cta: "تسوق الآن" },
  { title: "أقوى كتب الجريمة",        img: "/hero/hero-2025-2ND.jpg", href: "/category/روايات",   cta: "تصفح الروايات" },
  { title: "المكتبة التراثية الصغيرة", img: "/hero/hero-2025-6TH.jpg", href: "/arabic-books",      cta: "تصفح المجموعة" },
];

(async () => {
  for (const [key, value] of Object.entries(SOCIALS)) {
    await prisma.storeSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`socials: ${Object.keys(SOCIALS).length} settings written`);

  for (let i = 0; i < BANNERS.length; i++) {
    const b = BANNERS[i];
    const existing = await prisma.banner.findFirst({ where: { title: b.title } });
    const data = {
      title: b.title,
      titleAr: b.title,
      subtitleAr: b.cta,
      imageUrlAr: b.img,
      imageUrl: b.img,
      linkUrlAr: b.href,
      linkUrl: b.href,
      sortOrder: i,
      isActive: true,
    };
    if (existing) await prisma.banner.update({ where: { id: existing.id }, data });
    else await prisma.banner.create({ data });
    console.log(`  banner ${i + 1}. ${b.title}  ->  ${b.href}   [${b.cta}]`);
  }
  console.log(`active banners: ${await prisma.banner.count({ where: { isActive: true } })}`);
  await prisma.$disconnect();
})();
