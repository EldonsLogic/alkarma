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

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5500);
    return () => clearInterval(t);
  }, [slides.length]);

  // No banners uploaded yet — simple branded fallback
  if (slides.length === 0) {
    /*
      Live's hero fills the 1200-wide container at 330px tall and carries no
      border — measured on the live homepage. The old 1170 ratio and the panel
      border made it sit narrower than, and visually detached from, the rails
      beneath it.
    */
    return (
      <section className="w-[calc(100%-30px)] sm:w-[calc(100%-80px)] max-w-[1200px] mx-auto my-5 relative bg-paper-mid text-ink flex items-center justify-center aspect-[16/9] sm:aspect-[1200/330]">
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
    <section className="relative w-[calc(100%-30px)] sm:w-[calc(100%-80px)] max-w-[1200px] mx-auto my-5">
      <div className="relative w-full aspect-[16/9] sm:aspect-[1200/330] overflow-hidden bg-paper-mid">
        {slides.map((b, i) => {
          const inner = (
            <>
              {/* Desktop */}
              <Image
                src={b.desktop}
                alt={b.title ?? ""}
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover hidden sm:block"
              />
              {/* Mobile (falls back to desktop image if none uploaded) */}
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
          const active = i === current;
          return (
            <div
              key={b.id}
              aria-hidden={!active}
              className={`absolute inset-0 transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                active
                  ? "opacity-100 scale-100 z-[1]"
                  : "opacity-0 scale-[1.04] pointer-events-none"
              }`}
            >
              {b.link ? (
                <Link href={b.link} className="block relative w-full h-full">{inner}</Link>
              ) : (
                <div className="relative w-full h-full">{inner}</div>
              )}

              {/* CTA floating over the artwork, as on live. The label is the
                  banner's subtitle, so it is editable from Admin › Banners
                  without a schema change; a banner with no subtitle simply
                  shows no button. It rides in slightly after the slide settles. */}
              {b.cta && b.link && (
                <Link
                  href={b.link}
                  className={`absolute z-[2] bottom-6 sm:bottom-10 start-6 sm:start-12 inline-block bg-brand text-white text-[13px] sm:text-[15px] font-bold px-6 sm:px-8 py-[10px] sm:py-[13px] rounded-[3px] shadow-lg hover:bg-brand-dark transition-all duration-500 ${
                    active ? "opacity-100 translate-y-0 delay-200" : "opacity-0 translate-y-3"
                  }`}
                >
                  {b.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-[2]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-[4px] rounded-full transition-all duration-300 ${i === current ? "bg-brand w-9" : "bg-white/70 hover:bg-white w-3"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
