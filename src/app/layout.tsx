import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { prisma } from "@/lib/prisma";
import { BRAND_AR, BRAND_LATIN, SITE_URL } from "@/lib/brand";
import { GTM_ID } from "@/lib/gtm";
import "./globals.css";

const cairo = Cairo({
  // Arabic + Latin in one family, matching the live site. Latin coverage means
  // mixed strings ("350.00 EGP", ISBNs) don't swap typeface mid-line.
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "900"],
  display: "swap",
  variable: "--font-cairo",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_AR} — كتب عربية ومترجمة تُوصَّل إلى باب بيتك`,
    // Pages set a BARE title (e.g. "الأسئلة الشائعة") and this template adds
    // the brand. Pages must NOT append the brand themselves — doing so is what
    // produced doubled titles like "FAQ | Brand | Brand".
    template: `%s | ${BRAND_AR}`,
  },
  description:
    "«الكرمة» دار نشر عربية تأسست عام ٢٠١٣ بالقاهرة. تسوّق الروايات والكتب المترجمة وكتب التاريخ والسِّير والتنمية الذاتية وكتب الأطفال، مع التوصيل لكل محافظات مصر.",
  keywords: [
    "دار الكرمة", "الكرمة", "كتب عربية", "كتب مترجمة", "روايات", "متجر كتب",
    "مكتبة اونلاين مصر", "كتب اونلاين", "كتب أطفال", "تنمية ذاتية",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    siteName: BRAND_AR,
    type: "website",
    locale: "ar_EG",
    url: SITE_URL,
    title: `${BRAND_AR} — كتب عربية ومترجمة تُوصَّل إلى باب بيتك`,
    description:
      "تسوّق إصدارات دار الكرمة وأهم الكتب العربية والمترجمة، مع التوصيل لكل محافظات مصر.",
  },
};

async function getNavCategories() {
  try {
    const cats = await prisma.category.findMany({
      where: { isActive: true, parentId: null },
      orderBy: { sortOrder: "asc" },
      select: {
        kind: true,
        name: true,
        nameAr: true,
        slug: true,
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: { name: true, nameAr: true, slug: true },
        },
      },
    });

    const mapped = cats.map((c) => ({
      kind: c.kind,
      name: c.name,
      nameAr: c.nameAr,
      slug: c.slug,
      subcategories: c.children.map((ch) => ({ name: ch.name, nameAr: ch.nameAr, slug: ch.slug })),
    }));

    // A single "التصنيفات" mega-menu holding every category, mirroring the
    // live site's header. Stationery has its own top-level nav link there, so
    // it is not given a second mother entry here — that produced a duplicate
    // "أدوات مكتبية" in the bar.
    // The live site's mega-menu omits the categories that already have their
    // own top-level nav link (أحدث الإصدارات / الأكثر مبيعًا / عروض وخصومات /
    // أدوات مكتبية) — they are real categories there too, just not repeated
    // inside the panel. كتب أطفال is deliberately NOT excluded: live lists it
    // both in the bar and in the panel.
    const NAV_LINKED_SLUGS = new Set([
      "أحدث-الإصدارات",
      "الأكثر-مبيعًا",
      "عروض-وخصومات",
      "stationary",
    ]);

    const mothers = [
      {
        key: "categories",
        label: "التصنيفات",
        href: "/category",
        groups: mapped.filter((c) => !NAV_LINKED_SLUGS.has(c.slug)),
      },
    ];
    return mothers.filter((m) => m.groups.length > 0);
  } catch {
    return [];
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const navCategories = await getNavCategories();

  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable}`}
    >
      <head>
        {/* Scroll-reveal: if JS is disabled, force revealed content visible. */}
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
        {/* GTM script — in <head> of Server Component so it's in the initial HTML
            and executed by the browser before any JS hydration */}
        {GTM_ID && (
          /* eslint-disable-next-line @next/next/no-sync-scripts */
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${GTM_ID}');`,
            }}
          />
        )}
        {/* Structured data: Organization + WebSite (enables the Google
            sitelinks searchbox and a cleaner brand result) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "Organization",
                name: BRAND_AR,
                alternateName: BRAND_LATIN,
                url: SITE_URL,
                logo: `${SITE_URL}/logo.png`,
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: BRAND_AR,
                alternateName: BRAND_LATIN,
                inLanguage: "ar",
                url: SITE_URL,
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
                  },
                  "query-input": "required name=search_term_string",
                },
              },
            ]),
          }}
        />
      </head>
      <body className={`${cairo.variable}`}>
        {/* GTM noscript fallback — immediately after opening <body> */}
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
          <Providers>
            <div className="flex flex-col min-h-screen">
              <Header navCategories={navCategories} />
              <main className="flex-1 pb-16 md:pb-0">{children}</main>
              <Footer />
              <MobileBottomNav />
            </div>
            <CartDrawer />
          </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
