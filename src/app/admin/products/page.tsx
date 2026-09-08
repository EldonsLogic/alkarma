import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImportExportBar } from "@/components/admin/ImportExportBar";
import { searchProductIds } from "@/lib/search";
import { ProductsTableClient } from "./ProductsTableClient";
import { RefreshRatingsButton } from "./RefreshRatingsButton";

export const metadata = { title: "Products — Admin" };

interface Props {
  searchParams: { page?: string; q?: string; category?: string; stock?: string };
}

export default async function AdminProductsPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;
  const q = searchParams.q;

  // Arabic-tolerant search: ignores diacritics and letter variants, and is
  // case-insensitive for Latin text (plain `contains` fails on both).
  const matchedIds = q ? await searchProductIds(q, "BOOK") : null;

  const where = {
    type: "BOOK",
    ...(matchedIds ? { id: { in: matchedIds } } : {}),
    ...(searchParams.stock === "low" ? { stock: { lte: 5, gt: 0 } } : {}),
    ...(searchParams.stock === "out" ? { stock: 0 } : {}),
  };

  const [books, total, bookCategories] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
      include: { categories: { include: { category: true }, take: 1 } },
    }),
    prisma.book.count({ where }),
    prisma.category.findMany({
      where: { kind: "BOOK", isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  // Tree-ordered category options (parent → children) for the bulk-edit picker
  const catRoots = bookCategories.filter((c) => !c.parentId);
  const catOptions = catRoots.flatMap((r) => [
    { id: r.id, name: r.name },
    ...bookCategories.filter((c) => c.parentId === r.id).map((c) => ({ id: c.id, name: `   ↳ ${c.name}` })),
  ]);

  const totalPages = Math.ceil(total / limit);

  const rows = books.map((b) => ({
    id: b.id,
    title: b.title,
    author: b.author,
    isbn: b.isbn ?? null,
    priceEgp: Number(b.priceEgp),
    stock: b.stock,
    isActive: b.isActive,
    category: b.categories[0]?.category.name ?? null,
  }));

  return (
    <div>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Products ({total})</h1>
          <div className="mt-2">
            <ImportExportBar
              exportHref="/api/admin/export/products"
              exportLabel="Export CSV"
              importAction="/api/admin/import/products"
              templateHref="/api/admin/import/products"
              supportsImageZip
            />
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <RefreshRatingsButton />
          <Link href="/admin/products/new"
            className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors">
            + Add Product
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm p-4 mb-4 flex gap-4 flex-wrap">
        <form className="flex gap-3 flex-1 flex-wrap">
          <input name="q" defaultValue={q} placeholder="Search title, author, ISBN..."
            className="flex-1 min-w-[200px] px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
          <select name="stock" defaultValue={searchParams.stock ?? ""}
            className="px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
            <option value="">All Stock</option>
            <option value="low">Low Stock (≤5)</option>
            <option value="out">Out of Stock</option>
          </select>
          <button type="submit" className="px-4 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm hover:bg-[#334155]">
            Filter
          </button>
          {(q || searchParams.stock) && (
            <Link href="/admin/products" className="px-4 py-2 text-[13px] text-[#64748b] hover:text-[#1e293b]">Clear</Link>
          )}
        </form>
      </div>

      <ProductsTableClient
        books={rows}
        categories={catOptions}
        page={page}
        totalPages={totalPages}
        q={q}
        stock={searchParams.stock}
      />
    </div>
  );
}
