import Link from "next/link";
import Image from "next/image";
import type { HomeBanner } from "@/content/home-banners";

/**
 * A row of three promo banners, as the live site runs between its homepage
 * rails. Measured off live at 1280: the container is 1200 wide with 10px of
 * side padding, split into three 393px columns each carrying 5px of padding,
 * which leaves a 383px image — the artwork's own 570x253 ratio scaled down.
 * Vertical padding on the strip is 23px.
 *
 * Stacks on small screens, where three 570-wide banners side by side would be
 * unreadable.
 */
export function BannerStrip({ banners }: { banners: HomeBanner[] }) {
  if (!banners.length) return null;

  return (
    <section className="w-[calc(100%-30px)] sm:w-[calc(100%-80px)] max-w-[1200px] mx-auto py-[23px]">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-0 sm:px-[10px]">
        {banners.map((b) => (
          <Link
            key={b.src}
            href={b.href}
            className="block sm:w-1/3 sm:px-[5px] group"
            aria-label={b.alt}
          >
            <Image
              src={b.src}
              alt={b.alt}
              width={570}
              height={253}
              sizes="(max-width: 640px) 100vw, 383px"
              className="w-full h-auto block transition-opacity group-hover:opacity-90"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
