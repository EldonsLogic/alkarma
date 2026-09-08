import Link from "next/link";
import type { CategorySummary } from "@/types";
import { Reveal } from "@/components/ui/Reveal";

interface Props {
  categories: CategorySummary[];
  title?: string;
}

// Small decorative book-stack glyph (generic — works for any category).
function BookGlyph({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export function CategoryGrid({ categories, title }: Props) {
  if (!categories.length) return null;

  return (
    <section className="py-6 sm:py-8 px-4 sm:px-10 bg-paper-mid">
      {title && (
        <div className="mb-6 pb-4 border-b-2 border-brand">
          <span className="section-overline">استعرض حسب النوع</span>
          <h2 className="font-display font-bold text-brand leading-tight text-[20px] sm:text-[22px]">
            استعرض حسب القسم
          </h2>
        </div>
      )}

      <Reveal stagger className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {categories.map((cat) => {
          const count = cat.bookCount ?? 0;
          const countLabel =
            count > 0
              ? `${count} كتاب`
              : "استكشف";

          return (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className="group relative overflow-hidden rounded-md border border-paper-dark bg-paper p-4 sm:p-5 min-h-[132px] flex flex-col justify-between hover:border-brand hover:shadow-card-hover transition-all"
            >
              {/* Decorative glyph washed into the corner */}
              <BookGlyph className="pointer-events-none absolute -top-2 -end-3 text-paper-dark/70 group-hover:text-brand/25 transition-colors" />

              {/* Count pill */}
              <span className="relative inline-flex w-fit items-center rounded-full bg-brand-pale px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-brand-dark">
                {countLabel}
              </span>

              <div className="relative">
                <h3 className="text-[15px] sm:text-[16px] font-bold text-ink leading-snug group-hover:text-brand transition-colors" dir="auto">
                  {cat.nameAr ? cat.nameAr : cat.name}
                </h3>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.08em] text-brand opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                  تسوق ←
                </span>
              </div>
            </Link>
          );
        })}
      </Reveal>
    </section>
  );
}
