import Link from "next/link";
import Image from "next/image";

export interface FeaturedAuthor {
  slug: string;
  name: string;
  photoUrl: string;
  featuredColor: string | null;
}

interface Props {
  authors: FeaturedAuthor[];
}

/**
 * "أعمال <author>" banner row — wide portrait tiles linking to each author's
 * page, matching the store's homepage.
 *
 * The photo sits on the leading edge with a gradient wash running across it so
 * the name stays legible whatever the underlying image looks like. Only the
 * accent colour is stored per author; the gradient is composed here.
 */
export function FeaturedAuthors({ authors }: Props) {
  if (!authors.length) return null;

  return (
    <section className="px-4 sm:px-10 my-5" aria-label="أعمال المؤلفين">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {authors.map((a) => {
          const c = a.featuredColor || "#121E0C";
          return (
            <Link
              key={a.slug}
              href={`/author/${a.slug}`}
              className="group relative block overflow-hidden h-[132px] sm:h-[150px] bg-ink"
            >
              <Image
                src={a.photoUrl}
                alt={`أعمال ${a.name}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
              />
              {/* Wash runs from the text edge outward so the name stays readable. */}
              <span
                aria-hidden
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(270deg, ${hexToRgba(c, 0.94)} 0%, ${hexToRgba(c, 0.55)} 55%, ${hexToRgba(c, 0)} 100%)`,
                }}
              />
              <span className="absolute inset-y-0 end-0 flex flex-col justify-center pe-6 ps-16 text-end">
                <span className="text-white/75 text-[13px] leading-tight">أعمال</span>
                <span className="text-white font-display font-bold leading-tight text-[20px] sm:text-[23px]">
                  {a.name}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/** #RRGGBB → rgba(); falls back to the store's ink when unparseable. */
function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return `rgba(18,14,12,${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
