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
  // Placeholder until an image is uploaded in Admin → Campaign Banner
  if (!imageUrl) {
    return (
      <section className="relative w-full">
        <div
          className="relative w-full h-[158px] sm:h-[232px] overflow-hidden flex items-center justify-center text-center"
          style={{ background: "linear-gradient(135deg,#000000 0%,#333333 55%,#A81A19 130%)" }}
        >
          <div className="absolute -top-1/3 start-1/4 w-[60%] h-[140%] rounded-full blur-3xl opacity-30 pointer-events-none" style={{ background: "radial-gradient(circle,#CD201F,transparent 60%)" }} />
          <div className="relative px-6">
            <p className="text-brand font-mono text-[10px] sm:text-[11px] tracking-[0.22em] uppercase mb-3">لافتة مميزة</p>
            <p className="text-paper/80 font-display font-bold" style={{ fontSize: "clamp(18px,2.4vw,28px)" }}>
              أضِف صورة اللافتة من لوحة التحكم ← اللافتة المميزة
            </p>
            <p className="text-paper/40 text-[11px] mt-2">Desktop 1920×232 · Mobile 1080×316</p>
          </div>
        </div>
      </section>
    );
  }

  // A linked promotional banner is content, not decoration — it needs a real
  // alt. Only the visible (desktop OR mobile) copy carries it; the hidden one
  // is aria-hidden so screen readers don't announce the banner twice.
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
