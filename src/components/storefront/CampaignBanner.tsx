import Link from "next/link";
import Image from "next/image";

interface Props {
  imageUrl?: string;
  imageMobileUrl?: string;
  href?: string;
  /** Describes what the banner promotes, for screen readers and image search. */
  alt?: string;
}

/**
 * Mid-homepage feature banner — full-width designed image (desktop + optional
 * mobile) linking to a single URL. Managed from Admin → Campaign Banner.
 * Full-width slim strip with fixed heights: desktop 232px, mobile 158px.
 * Recommended source images: desktop 1920×232, mobile 1080×316.
 */
export function CampaignBanner({ imageUrl, imageMobileUrl, href = "/bestsellers", alt }: Props) {
  // No image configured → render nothing. The live storefront has no banner
  // in this position, and a dark "add an image here" placeholder read as a
  // second empty hero. The feature stays; it just stays invisible until used.
  if (!imageUrl) return null;

  // A linked promotional banner is content, not decoration — it needs a real
  // alt. Only the visible copy carries it; the hidden breakpoint twin is
  // aria-hidden so screen readers don't announce the banner twice.
  const label = alt?.trim() || "عرض مميز من دار الكرمة";

  const inner = (
    <>
      <Image src={imageUrl} alt={label} fill sizes="100vw" className="object-cover hidden sm:block" />
      <Image
        src={imageMobileUrl || imageUrl}
        alt={label}
        aria-hidden
        fill
        sizes="100vw"
        className="object-cover sm:hidden"
      />
    </>
  );

  return (
    <section className="relative w-full">
      <div className="relative w-full h-[158px] sm:h-[232px] overflow-hidden bg-paper-mid">
        {href ? (
          <Link href={href} className="block relative w-full h-full">{inner}</Link>
        ) : (
          <div className="relative w-full h-full">{inner}</div>
        )}
      </div>
    </section>
  );
}
