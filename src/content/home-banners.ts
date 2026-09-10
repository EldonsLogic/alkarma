/**
 * The promo strips that sit between the homepage rails on the live site.
 *
 * Artwork is the store's own, taken from the live site (570x253 each) and
 * served from /public/banners rather than hot-linked, so the new site does not
 * depend on the old one staying up.
 *
 * Live points these at WooCommerce tag archives; here they point at this
 * store's equivalent author and category pages. Every destination was checked
 * against the imported catalogue and is populated — the book counts below were
 * true at import time and are recorded so a future empty banner is obvious.
 *
 * Order matters: the list reads right-to-left on the page, matching live.
 */
export interface HomeBanner {
  src: string;
  alt: string;
  href: string;
}

export const HOME_BANNER_STRIPS: HomeBanner[][] = [
  // After أحدث الإصدارات
  [
    { src: "/banners/03.-Eissa.jpg", alt: "أعمال إبراهيم عيسى", href: "/author/إبراهيم-عيسى" },          // 12 books
    { src: "/banners/Merna-home-midBanner.jpg", alt: "أعمال ميرنا المهدي", href: "/author/ميرنا-المهدي" }, // 9
    { src: "/banners/01.-Omar.jpg", alt: "أعمال عمر طاهر", href: "/author/عمر-طاهر" },                    // 14
  ],
  // After الأكثر مبيعًا
  [
    { src: "/banners/02.-Tawfiq.jpg", alt: "أعمال أحمد خالد توفيق", href: "/author/أحمد-خالد-توفيق" },     // 8
    { src: "/banners/Banner-570-X-253_16.jpg", alt: "أعمال خيري شلبي", href: "/author/خيري-شلبي" },        // 10
    { src: "/banners/Banner-570-X-253_15.jpg", alt: "أعمال محمد المنسي قنديل", href: "/author/محمد-المنسي-قنديل" }, // 3
  ],
  // After ترشيحات
  [
    { src: "/banners/12.-galal_ameen.jpg", alt: "أعمال جلال أمين", href: "/author/جلال-أمين" },            // 4
    { src: "/banners/06.-Translations.jpg", alt: "روايات مترجمة", href: "/category/روايات-مترجمة" },        // 68
    { src: "/banners/10.-salah_Eissa.jpg", alt: "أعمال صلاح عيسى", href: "/author/صلاح-عيسى" },            // 7
  ],
  // After عروض وخصومات
  [
    { src: "/banners/09.-novels.jpg", alt: "روايات", href: "/category/روايات" },                            // 412
    { src: "/banners/08.-self-development.jpg", alt: "تنمية ذاتية", href: "/category/self-development" },   // 200
    { src: "/banners/Banner-570-X-253_07.jpg", alt: "سير وتراجم", href: "/category/تراجم-وسير" },          // 88
  ],
];
