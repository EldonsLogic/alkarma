import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export const metadata = { title: "Inventory — Admin" };

async function updateStock(formData: FormData) {
  "use server";
  const bookId = formData.get("bookId") as string;
  const newStock = parseInt(formData.get("stock") as string, 10);
  const lowStockAt = parseInt(formData.get("lowStockAt") as string, 10);
  const note = (formData.get("note") as string)?.trim() || null;
  if (!bookId || isNaN(newStock) || newStock < 0) return;

  const current = await prisma.book.findUnique({ where: { id: bookId }, select: { stock: true } });
  const delta = current ? newStock - current.stock : 0;

  await prisma.book.update({
    where: { id: bookId },
    data: {
      stock: newStock,
      ...(isNaN(lowStockAt) ? {} : { lowStockAt }),
    },
  });

  if (delta !== 0) {
    await prisma.inventoryLog.create({
      data: {
        bookId,
        delta,
        stockAfter: newStock,
        reason: "ADJUSTMENT",
        note,
      },
    });
  }

  revalidatePath("/admin/inventory");
}

interface Props {
  searchParams: { stock?: string; q?: string; page?: string; tab?: string };
}

export default async function AdminInventoryPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 30;
  const skip = (page - 1) * limit;
  const tab = searchParams.tab ?? "stock";

  const stockFilter = searchParams.stock;
  const q = searchParams.q?.trim();

  const where = {
    isActive: true,
    ...(stockFilter === "out" ? { stock: 0 } : {}),
    ...(stockFilter === "low" ? { stock: { gt: 0, lte: 5 } } : {}),
    ...(stockFilter === "ok" ? { stock: { gt: 5 } } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { author: { contains: q, mode: "insensitive" as const } },
        { isbn: { contains: q, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [books, total, summary, recentLogs] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: [{ stock: "asc" }, { title: "asc" }],
      skip,
      take: limit,
      select: {
        id: true,
        title: true,
        author: true,
        isbn: true,
        stock: true,
        lowStockAt: true,
        priceEgp: true,
        salesCount: true,
        categories: { take: 1, include: { category: { select: { name: true } } } },
      },
    }),
    prisma.book.count({ where }),
    prisma.book.aggregate({
      where: { isActive: true },
      _count: { _all: true },
    }).then(async (all) => {
      const [outOfStock, lowStockBooks] = await Promise.all([
        prisma.book.count({ where: { isActive: true, stock: 0 } }),
        prisma.book.count({ where: { isActive: true, stock: { gt: 0, lte: 5 } } }),
      ]);
      return { total: all._count._all, outOfStock, lowStock: lowStockBooks };
    }),
    prisma.inventoryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { book: { select: { title: true, author: true } } },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black text-[#1e293b]">Inventory</h1>
        <Link href="/admin/products/new"
          className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors">
          + Add Product
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Link href="/admin/inventory" className={`border rounded-sm p-4 text-center transition-colors ${!stockFilter ? "border-[#3b82f6] bg-blue-50" : "bg-white border-[#e2e8f0] hover:border-[#3b82f6]"}`}>
          <p className="text-[24px] font-black text-[#1e293b]">{summary.total}</p>
          <p className="text-[12px] text-[#64748b] font-bold mt-1">All Products</p>
        </Link>
        <Link href="/admin/inventory?stock=low" className={`border rounded-sm p-4 text-center transition-colors ${stockFilter === "low" ? "border-brand bg-brand/5" : "bg-white border-[#e2e8f0] hover:border-brand"}`}>
          <p className="text-[24px] font-black text-brand-500">{summary.lowStock}</p>
          <p className="text-[12px] text-[#64748b] font-bold mt-1">Low Stock (≤5)</p>
        </Link>
        <Link href="/admin/inventory?stock=out" className={`border rounded-sm p-4 text-center transition-colors ${stockFilter === "out" ? "border-red-400 bg-red-50" : "bg-white border-[#e2e8f0] hover:border-red-400"}`}>
          <p className="text-[24px] font-black text-red-500">{summary.outOfStock}</p>
          <p className="text-[12px] text-[#64748b] font-bold mt-1">Out of Stock</p>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e2e8f0] mb-4">
        {[{ key: "stock", label: "Stock Levels" }, { key: "log", label: "Inventory Log" }].map((t) => (
          <Link key={t.key} href={`/admin/inventory?tab=${t.key}`}
            className={`px-5 py-2.5 text-[13px] font-bold border-b-2 -mb-px transition-colors ${
              tab === t.key ? "border-[#3b82f6] text-[#3b82f6]" : "border-transparent text-[#64748b] hover:text-[#1e293b]"
            }`}>
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "stock" ? (
        <>
          {/* Search */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-4 mb-4">
            <form className="flex gap-3 flex-wrap">
              <input name="q" defaultValue={q} placeholder="Search title, author, ISBN..."
                className="flex-1 min-w-[200px] px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              {stockFilter && <input type="hidden" name="stock" value={stockFilter} />}
              <input type="hidden" name="tab" value="stock" />
              <button type="submit" className="px-4 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm hover:bg-[#334155]">Search</button>
              {(q || stockFilter) && (
                <Link href="/admin/inventory?tab=stock" className="px-4 py-2 text-[13px] text-[#64748b] hover:text-[#1e293b] self-center">Clear</Link>
              )}
            </form>
          </div>

          {/* Table */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#e2e8f0] bg-[#f8fafc]">
              <p className="text-[12px] text-[#64748b] font-bold">
                {total} product{total !== 1 ? "s" : ""}
                {stockFilter === "out" && " — out of stock"}
                {stockFilter === "low" && " — low stock"}
              </p>
              <p className="text-[12px] text-[#94a3b8]">Update stock inline and optionally add a note</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-[#64748b] text-[11px] uppercase tracking-wide border-b border-[#e2e8f0]">
                    {["Product", "Category", "Price EGP", "Sales", "Low Alert", "Stock", "Adjust"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 font-bold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => {
                    const isOut = book.stock === 0;
                    const isLow = book.stock > 0 && book.stock <= (book.lowStockAt ?? 5);
                    return (
                      <tr key={book.id} className={`border-t border-[#f1f5f9] ${isOut ? "bg-red-50" : isLow ? "bg-brand-50" : ""}`}>
                        <td className="px-5 py-3">
                          <p className="font-bold text-[#1e293b] line-clamp-1">{book.title}</p>
                          <p className="text-[11px] text-[#94a3b8]">{book.author}</p>
                          {book.isbn && <p className="text-[11px] text-[#94a3b8]">ISBN: {book.isbn}</p>}
                        </td>
                        <td className="px-5 py-3 text-[#64748b]">{book.categories[0]?.category.name ?? "—"}</td>
                        <td className="px-5 py-3 text-[#64748b]">{Number(book.priceEgp).toLocaleString()}</td>
                        <td className="px-5 py-3 text-[#64748b]">{book.salesCount}</td>
                        <td className="px-5 py-3 text-[#64748b]">{book.lowStockAt ?? 5}</td>
                        <td className="px-5 py-3">
                          <span className={`font-black text-[15px] ${isOut ? "text-red-500" : isLow ? "text-brand-500" : "text-[#2e7d52]"}`}>
                            {book.stock}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <form action={updateStock} className="flex items-center gap-2">
                            <input type="hidden" name="bookId" value={book.id} />
                            <input
                              type="number"
                              name="stock"
                              defaultValue={book.stock}
                              min={0}
                              className="w-[68px] px-2 py-1.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] text-center"
                            />
                            <input
                              type="text"
                              name="note"
                              placeholder="Reason..."
                              className="w-[100px] px-2 py-1.5 border border-[#e2e8f0] text-[12px] rounded-sm outline-none focus:border-[#3b82f6]"
                            />
                            <input type="hidden" name="lowStockAt" value={book.lowStockAt ?? 5} />
                            <button
                              type="submit"
                              className="px-3 py-1.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[11px] font-bold rounded-sm transition-colors"
                            >
                              Save
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {books.length === 0 && (
                <div className="py-12 text-center text-[#94a3b8]">No products found</div>
              )}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex gap-1 justify-center mt-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/admin/inventory?tab=stock&page=${p}${stockFilter ? `&stock=${stockFilter}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                  className={`w-8 h-8 flex items-center justify-center text-[13px] rounded-sm border transition-colors ${
                    p === page ? "bg-[#3b82f6] text-white border-[#3b82f6]" : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#3b82f6]"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Inventory Log Tab */
        <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#f8fafc] text-[#64748b] text-[11px] uppercase tracking-wide border-b border-[#e2e8f0]">
                  {["Date", "Product", "Change", "Stock After", "Reason", "Note"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log) => (
                  <tr key={log.id} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]">
                    <td className="px-5 py-3 text-[#64748b] whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3">
                      <p className="font-bold text-[#1e293b] line-clamp-1">{log.book.title}</p>
                      <p className="text-[11px] text-[#94a3b8]">{log.book.author}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`font-black text-[14px] ${log.delta > 0 ? "text-[#2e7d52]" : "text-red-500"}`}>
                        {log.delta > 0 ? `+${log.delta}` : log.delta}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-[#1e293b]">{log.stockAfter}</td>
                    <td className="px-5 py-3">
                      <span className="text-[11px] font-bold uppercase text-[#64748b] bg-[#f1f5f9] px-2 py-0.5 rounded">
                        {log.reason}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">{log.note ?? "—"}</td>
                  </tr>
                ))}
                {recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#94a3b8]">No inventory changes recorded yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
