"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { BRAND_SHORT_AR } from "@/lib/brand";

interface Banner {
  id: string;
  imageUrl?: string | null;
  imageMobileUrl?: string | null;
  linkUrl?: string | null;
  subtitle?: string | null;
  subtitleAr?: string | null;
  imageUrlAr?: string | null;
  imageMobileUrlAr?: string | null;
  linkUrlAr?: string | null;
  title?: string;
}

interface Props {
  banners: Banner[];
}

/**
 * Resolve a slide's images + link for the active locale, falling back to the
 * other language when this language's version wasn't uploaded.
 */
function resolveBanner(b: Banner, isAr: boolean) {
  const desktop = (b.imageUrlAr || b.imageUrl);
  const mobile = (b.imageMobileUrlAr || b.imageMobileUrl || desktop);
  const link = (b.linkUrlAr || b.linkUrl);
  return { desktop: desktop || "", mobile: mobile || "", link: link || null };
}

/**
 * Image-based hero: one or more full-width banner slides, each with a desktop
 * and (optional) mobile image and a single click-through link. Auto-rotates
 * when there is more than one slide. Images are uploaded from the admin with
 * recommended sizes — desktop 1920×720 (8:3), mobile 1080×1350 (4:5).
 */
export function HeroBanner({ banners }: Props) {
  // Resolve each slide for the active language (with cross-language fallback),
  // then keep only slides that actually have an image to show.
  const slides = banners
    .map((b) => ({ id: b.id, title: b.title, cta: b.subtitleAr || b.subtitle || null, ...resolveBanner(b, true) }))
    .filter((b) => b.desktop);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    // Live's Smart Slider: autoplay duration 3500ms, looping, paused on hover.
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 3500);
    return () => clearInterval(t);
  }, [slides.length, paused]);

  // No banners uploaded yet — simple branded fallback
  if (slides.length === 0) {
    /*
      Live's hero fills the 1200-wide container at 330px tall and carries no
      border — measured on the live homepage. The old 1170 ratio and the panel
      border made it sit narrower than, and visually detached from, the rails
      beneath it.
    */
    return (
      <section className="w-[calc(100%-30px)] max-w-[1170px] mx-auto my-5 relative bg-paper-mid text-ink flex items-center justify-center aspect-[16/9] sm:aspect-[1170/330]">
        <div className="text-center px-6">
          <p className="text-[12px] text-ink-muted mb-3">{BRAND_SHORT_AR}</p>
          <h1 className="font-display font-bold text-brand mb-5 text-[20px] sm:text-[22px]">
            اكتشف قراءتك القادمة
          </h1>
          <Link href="/bestsellers" className="inline-block bg-brand hover:bg-brand-dark text-white px-7 py-2.5 text-[14px] font-bold transition-colors">
            تسوق الآن
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative w-[calc(100%-30px)] max-w-[1170px] mx-auto my-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative w-full aspect-[16/9] sm:aspect-[1170/330] overflow-hidden bg-paper-mid">
        {/* Horizontal track, matching live's Smart Slider: mainanimation
            {type:"horizontal", duration:1500, ease:"easeOutQuad"} — a slide,
            not the cross-fade this had before.

            dir="ltr" is deliberate. The page is RTL, which would reverse the
            flex order and send the track the wrong way; the slides are
            self-contained artwork, so pinning the track to LTR keeps the
            transform math straightforward without affecting what is drawn. */}
        <div
          dir="ltr"
          className="flex h-full w-full transition-transform duration-[1500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((b, i) => {
            const inner = (
              <>
                <Image
                  src={b.desktop}
                  alt={b.title ?? ""}
                  fill
                  priority={i === 0}
                  sizes="(max-width: 640px) 100vw, 1170px"
                  className="object-cover hidden sm:block"
                />
                <Image
                  src={b.mobile || b.desktop}
                  alt={b.title ?? ""}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className="object-cover sm:hidden"
                />
              </>
            );
            return (
              <div key={b.id} className="relative w-full h-full shrink-0">
                {b.link ? (
                  <Link href={b.link} className="block relative w-full h-full">{inner}</Link>
                ) : (
                  <div className="relative w-full h-full">{inner}</div>
                )}

                {/* CTA over the artwork. Style is live's own button:
                    background #ff0000, padding 7px 25px, square corners,
                    Cairo 800 at 87.5% (=14px), white, and anchored to the
                    LEFT — live's layer sets text-align:left, which is why the
                    previous right-hand placement read as wrong. The label
                    comes from the banner's subtitle, so it stays editable in
                    Admin › Banners. */}
                {b.cta && b.link && (
                  <div dir="rtl" className="absolute inset-0 pointer-events-none flex items-center">
                    <Link
                      href={b.link}
                      className={`pointer-events-auto ms-auto me-[8%] mt-[86px] sm:mt-[104px] bg-brand text-white font-extrabold text-[12px] sm:text-[14px] leading-none px-[18px] sm:px-[25px] py-[7px] hover:bg-brand-dark transition-all duration-500 ${
                        i === current ? "opacity-100 translate-y-0 delay-[600ms]" : "opacity-0 translate-y-2"
                      }`}
                    >
                      {b.cta}
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-[8px] z-[2]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`الشريحة ${i + 1}`}
              /* Live's bullets: 10px circles, #ced3d5 at 0.8, active #ff0000. */
              className={`w-[10px] h-[10px] rounded-full transition-colors duration-300 ${
                i === current ? "bg-brand" : "bg-[#ced3d5]/80 hover:bg-brand"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
