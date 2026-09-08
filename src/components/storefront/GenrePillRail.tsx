"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CategorySummary } from "@/types";

interface Props {
  categories: CategorySummary[];
}

export function GenrePillRail({ categories }: Props) {
  const pathname = usePathname();

  if (categories.length === 0) return null;

  return (
    <div className="bg-paper border-b border-paper-dark">
      <div
        className="flex gap-2 overflow-x-auto px-4 sm:px-10 py-3"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {categories.map((cat) => {
          const active = pathname.startsWith(`/category/${cat.slug}`);
          return (
            <Link
              key={cat.id}
              href={`/category/${cat.slug}`}
              className={`flex-shrink-0 px-4 py-[7px] text-[11px] font-bold uppercase tracking-[0.08em] border transition-colors whitespace-nowrap ${
                active
                  ? "bg-brand border-brand text-white"
                  : "bg-paper border-paper-dark text-ink-muted hover:border-brand hover:text-brand"
              }`}
            >
              {cat.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
