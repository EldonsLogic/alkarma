import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { BRAND_SHORT_AR, BRAND_AR } from "@/lib/brand";

const FALLBACK_SHOP_EN = [
  { label: "Bestsellers", labelAr: "الأكثر مبيعًا", href: "/bestsellers" },
  { label: "New Releases", labelAr: "إصدارات جديدة", href: "/new-releases" },
  { label: "Book of the Month", labelAr: "كتاب الشهر", href: "/book-of-the-month" },
  { label: "Bundles", labelAr: "باقات", href: "/bundles" },
  { label: "All Categories", labelAr: "كل الأقسام", href: "/category" },
];

const FALLBACK_HELP_EN = [
  { label: "Shipping Info", labelAr: "معلومات الشحن", href: "/shipping" },
  { label: "Returns", labelAr: "الإرجاع", href: "/returns" },
  { label: "Contact Us", labelAr: "تواصل معنا", href: "/contact" },
  { label: "FAQ", labelAr: "الأسئلة الشائعة", href: "/faq" },
];

const FALLBACK_LEGAL_EN = [
  { label: "Privacy Policy", labelAr: "سياسة الخصوصية", href: "/privacy" },
  { label: "Terms of Service", labelAr: "شروط الاستخدام", href: "/terms" },
];

type LinkItem = { label: string; labelAr: string | null; href: string; openNew: boolean };
type BilingualItem = { label: string; labelAr: string; href: string };

async function getFooterLinks() {
  try {
    const items = await prisma.menuItem.findMany({
      where: { menu: { in: ["footer_shop", "footer_help", "footer_legal"] } },
      orderBy: { sortOrder: "asc" },
      select: { menu: true, label: true, labelAr: true, href: true, openNew: true },
    });

    const pick = (menu: string): LinkItem[] =>
      items
        .filter((i) => i.menu === menu)
        .map((i) => ({ label: i.label, labelAr: i.labelAr, href: i.href, openNew: i.openNew }));

    const shop = pick("footer_shop");
    const help = pick("footer_help");
    const legal = pick("footer_legal");

    return {
      shop: shop.length ? shop : null,
      help: help.length ? help : null,
      legal: legal.length ? legal : null,
    };
  } catch {
    return { shop: null, help: null, legal: null };
  }
}

async function getStoreInfo() {
  try {
    const keys = ["store_tagline", "store_tagline_ar"];
    const settings = await prisma.storeSetting.findMany({ where: { key: { in: keys } } });
    const m: Record<string, string> = {};
    settings.forEach((s) => { m[s.key] = s.value; });
    return { tagline: m["store_tagline"] || "", taglineAr: m["store_tagline_ar"] || "" };
  } catch {
    return { tagline: "", taglineAr: "" };
  }
}

/**
 * The six platforms the store actually links to, in the order its own footer
 * uses. Each is an admin-editable StoreSetting; a platform with no URL set is
 * rendered muted rather than removed, so the row stays stable.
 */
// Tile colours are taken from the store's own footer: brand colours for
// Facebook / YouTube / WhatsApp / TikTok, and white tiles with a dark glyph
// for Instagram and X.
const SOCIALS = [
  { key: "tiktok_url",    label: "تيك توك",  Icon: TikTokIcon,    bg: "#5F6368", fg: "#fff" },
  { key: "instagram_url", label: "إنستجرام", Icon: InstagramIcon, bg: "#FFFFFF", fg: "#111" },
  { key: "facebook_url",  label: "فيسبوك",   Icon: FacebookIcon,  bg: "#3B5998", fg: "#fff" },
  { key: "youtube_url",   label: "يوتيوب",   Icon: YouTubeIcon,   bg: "#FF0000", fg: "#fff" },
  { key: "whatsapp_url",  label: "واتساب",   Icon: WhatsAppIcon,  bg: "#25D366", fg: "#fff" },
  { key: "x_url",         label: "إكس",      Icon: XIcon,         bg: "#FFFFFF", fg: "#111" },
] as const;

async function getSocialLinks(): Promise<Record<string, string>> {
  try {
    const keys = SOCIALS.map((s) => s.key);
    const settings = await prisma.storeSetting.findMany({ where: { key: { in: keys } } });
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    return map;
  } catch {
    return {};
  }
}

/**
 * NOTE: the footer uses logo-footer.png, NOT the header's logo.png.
 * The header logo is dark ink intended for a white bar; on the footer's black
 * background it renders invisible. This is the store's own "negative" variant,
 * the same asset the live site serves in its footer.
 */
export async function Footer() {
  const [{ shop: dbShop, help: dbHelp, legal: dbLegal }, social, storeInfo] = await Promise.all([
    getFooterLinks(),
    getSocialLinks(),
    getStoreInfo(),
  ]);


  // Render footer links — bilingual for both DB-managed and fallback items.
  function renderLinks(
    dbLinks: LinkItem[] | null,
    fallback: BilingualItem[]
  ) {
    if (dbLinks) {
      return dbLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          target={item.openNew ? "_blank" : undefined}
          rel={item.openNew ? "noopener noreferrer" : undefined}
          className="block text-[13px] text-white mb-2 hover:text-brand transition-colors"
        >
          {item.labelAr ? item.labelAr : item.label}
        </Link>
      ));
    }
    return fallback.map((item) => (
      <Link
        key={item.href}
        href={item.href}
        className="block text-[13px] text-white mb-2 hover:text-brand transition-colors"
      >
        {item.labelAr}
      </Link>
    ));
  }

  const tagline = storeInfo.taglineAr || "دار نشر عربية تأسست عام ٢٠١٣ بالقاهرة. كتب عربية ومترجمة تُوصَّل إلى باب بيتك.";

  return (
    <footer className="bg-ink text-paper-dark px-6 sm:px-10 pt-10 sm:pt-12 pb-24 md:pb-6 mt-10">
      <div className="max-w-[1400px] mx-auto">
        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About */}
          <div>
            <div className="mb-3">
              <Image
                src="/logo-footer.png"
                alt={BRAND_SHORT_AR}
                width={110}
                height={125}
                className="h-[125px] w-auto"
              />
            </div>
            <p className="text-[13px] text-white leading-relaxed">{tagline}</p>
          </div>

          {/* Shop column */}
          <div>
            {renderLinks(dbShop, FALLBACK_SHOP_EN)}
          </div>

          {/* Help column */}
          <div>
            {renderLinks(dbHelp, FALLBACK_HELP_EN)}
          </div>

          {/* Follow */}
          <div>
            <div className="grid grid-cols-3 gap-2.5 w-max">
              {SOCIALS.map(({ key, label, Icon, bg, fg }) => {
                const href = social[key];
                const tile = "w-[38px] h-[38px] rounded-[5px] flex items-center justify-center transition-opacity";
                return href ? (
                  <a
                    key={key}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className={`${tile} hover:opacity-80`}
                    style={{ background: bg, color: fg }}
                  >
                    <Icon />
                  </a>
                ) : (
                  <span
                    key={key}
                    aria-hidden
                    title={label}
                    className={`${tile} opacity-30`}
                    style={{ background: bg, color: fg }}
                  >
                    <Icon />
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-ink-soft pt-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-paper-dark/50">
          <span>
            {`© ${new Date().getFullYear()} ${BRAND_AR}. جميع الحقوق محفوظة.`}
          </span>
        </div>
      </div>
    </footer>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.9 2H22l-7.1 8.1L23.2 22h-6.6l-5.2-6.8L5.5 22H2.4l7.6-8.7L1.2 2h6.8l4.7 6.2L18.9 2Zm-1.1 18h1.7L6.9 3.8H5L17.8 20Z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.700-1.7-.8-.2-.1-.4-.1-.6.1s-.6.8-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.4 0-.5s-.6-1.4-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3c-.3.3-.9.9-.9 2.1s.9 2.5 1.1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M23 12s0-3.4-.4-5a2.5 2.5 0 0 0-1.8-1.8C19.1 4.8 12 4.8 12 4.8s-7.1 0-8.8.4A2.5 2.5 0 0 0 1.4 7C1 8.6 1 12 1 12s0 3.4.4 5a2.5 2.5 0 0 0 1.8 1.8c1.7.4 8.8.4 8.8.4s7.1 0 8.8-.4A2.5 2.5 0 0 0 22.6 17c.4-1.6.4-5 .4-5ZM9.8 15.3V8.7l5.7 3.3-5.7 3.3Z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.79 1.52V6.75a4.85 4.85 0 01-1.02-.06z" />
    </svg>
  );
}
