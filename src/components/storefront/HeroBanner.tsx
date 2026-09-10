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
    .map((b) => ({ id: b.id, title: b.title, ...resolveBanner(b, true) }))
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
      <section className="w-[calc(100%-30px)] max-w-[1170px] mx-auto my-5 relative bg-paper-mid text-ink flex items-center justify-center aspect-[1170/330]">
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
      {/* One ratio at every width. The slides are 1170x330 and live shows them
          whole on mobile too — the old 16/9 mobile ratio cropped them. */}
      <div className="relative w-full aspect-[1170/330] overflow-hidden bg-paper-mid">
        {/* Horizontal track, matching live's Smart Slider: mainanimation
            {type:"horizontal", duration:1500, ease:"easeOutQuad"}.

            dir="ltr" is deliberate. The page is RTL, which would reverse the
            flex order and send the track the wrong way; the slides are
            self-contained artwork, so pinning the track to LTR keeps the
            transform maths straightforward without affecting what is drawn. */}
        <div
          dir="ltr"
          className="flex h-full w-full transition-transform duration-[1500ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)]"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((b, i) => {
            /* ONE image, contained rather than cropped, and no separate mobile
               artwork — live adapts the same slide to every screen, so this
               deliberately does NOT follow the upstream project's practice of
               uploading a second mobile banner. */
            const inner = (
              <Image
                src={b.desktop}
                alt={b.title ?? ""}
                fill
                priority={i === 0}
                sizes="(max-width: 1200px) 100vw, 1170px"
                className="object-contain"
              />
            );
            return (
              <div key={b.id} className="relative w-full h-full shrink-0">
                {b.link ? (
                  <Link href={b.link} className="block relative w-full h-full">{inner}</Link>
                ) : (
                  <div className="relative w-full h-full">{inner}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bullets sit BELOW the artwork, as live's do — not floating over it.
          10px circles, #ced3d5 at 80%, active brand red. */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-[8px] mt-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`الشريحة ${i + 1}`}
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
