import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImportExportBar } from "@/components/admin/ImportExportBar";
import { displayPrice } from "@/lib/currency";

export const metadata = { title: "Stationery — Admin" };

export default async function AdminStationeryPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q;
  const where = {
    type: "STATIONERY",
    ...(q ? { OR: [{ title: { contains: q } }, { titleAr: { contains: q } }] } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.book.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { categories: { include: { category: true }, take: 1 } },
    }),
    prisma.book.count({ where }),
  ]);

  return (
    <div>
      <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Stationery ({total})</h1>
          <p className="text-[13px] text-[#64748b] mt-1">Bilingual products (name & description in English + Arabic).</p>
          <div className="mt-2">
            <ImportExportBar
              exportHref="/api/admin/export/products"
              exportLabel="Export CSV"
              importAction="/api/admin/import/stationery"
              templateHref="/api/admin/import/stationery"
            />
          </div>
        </div>
        <Link href="/admin/stationery/new"
          className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors">
          + Add Stationery
        </Link>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-sm p-4 mb-4">
        <form className="flex gap-3 flex-wrap">
          <input name="q" defaultValue={q} placeholder="Search name (EN or AR)…"
            className="flex-1 min-w-[200px] px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
          <button type="submit" className="px-4 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm hover:bg-[#334155]">Filter</button>
          {q && <Link href="/admin/stationery" className="px-4 py-2 text-[13px] text-[#64748b] hover:text-[#1e293b]">Clear</Link>}
        </form>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        {items.length === 0 ? (
          <p className="p-12 text-center text-[#94a3b8] text-[14px]">No stationery items yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
              <tr>
                {["Name (EN)", "Name (AR)", "Category", "EGP", "Stock", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-[11px] font-bold uppercase text-[#94a3b8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f1f5f9]">
              {items.map((it) => (
                <tr key={it.id} className="hover:bg-[#f8fafc]">
                  <td className="px-4 py-3 font-bold text-[#1e293b]">{it.title || "—"}</td>
                  <td className="px-4 py-3" dir="rtl">{it.titleAr || "—"}</td>
                  <td className="px-4 py-3 text-[#64748b]">{it.categories[0]?.category.name ?? "—"}</td>
                  <td className="px-4 py-3">{displayPrice(it.priceEgp)}</td>
                  <td className="px-4 py-3">{it.stock}</td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/stationery/${it.id}`} className="text-[12px] text-[#3b82f6] font-bold hover:underline">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
