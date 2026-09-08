import { prisma } from "@/lib/prisma";
import { CategoryGrid } from "@/components/storefront/CategoryGrid";
import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "كل التصنيفات",
  description: "Browse all book categories at دار الكرمة.",
  ...canonical("/category"),
};

export default async function AllCategoriesPage() {
  const categories = await prisma.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { books: true } },
      children: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { books: true } } },
      },
    },
  });

  return (
    <div className="min-h-screen bg-paper-mid">
      <div className="bg-ink text-paper py-10 px-4 sm:px-10 text-center">
        <h1 className="text-[28px] sm:text-[36px] font-black mb-2">تصفّح التصنيفات</h1>
        <p className="text-[14px] text-ink-muted">اعثر على قراءتك القادمة حسب التصنيف</p>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-10 py-10">
        <CategoryGrid
          categories={categories.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            nameAr: c.nameAr,
            imageUrl: c.imageUrl,
            sortOrder: c.sortOrder,
            children: c.children.map((ch) => ({
              id: ch.id,
              slug: ch.slug,
              name: ch.name,
              nameAr: ch.nameAr,
              imageUrl: ch.imageUrl,
              sortOrder: ch.sortOrder,
            })),
          }))}
          title="كل التصنيفات"
        />

        {/* Sub-categories per parent */}
        {categories
          .filter((c) => c.children.length > 0)
          .map((parent) => (
            <div key={parent.id} className="mt-10">
              <h2 className="text-[18px] font-black text-ink mb-4 pb-2 border-b border-paper-dark">
                {parent.name}
              </h2>
              <div className="flex flex-wrap gap-3">
                {parent.children.map((child) => (
                  <a
                    key={child.id}
                    href={`/category/${child.slug}`}
                    className="px-4 py-2 border border-paper-dark text-[13px] text-ink-soft hover:border-brand hover:text-brand transition-colors font-medium"
                  >
                    {child.name}
                    {child._count.books > 0 && (
                      <span className="ml-1.5 text-ink-muted text-[11px]">({child._count.books})</span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
