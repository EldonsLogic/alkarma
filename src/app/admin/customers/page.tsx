import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImportExportBar } from "@/components/admin/ImportExportBar";

export const metadata = { title: "Customers — Admin" };

interface Props {
  searchParams: { page?: string; q?: string };
}

export default async function AdminCustomersPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 25;
  const skip = (page - 1) * limit;
  const q = searchParams.q?.trim();

  const where = {
    role: "CUSTOMER",
    ...(q ? {
      OR: [
        { email: { contains: q } },
        { firstName: { contains: q } },
        { lastName: { contains: q } },
      ],
    } : {}),
  };

  const [customers, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        country: true,
        createdAt: true,
        _count: { select: { orders: true, wishlistItems: true } },
        orders: {
          select: { total: true, currency: true },
          where: { status: { notIn: ["CANCELLED", "REFUNDED"] } },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Customers ({total})</h1>
          <div className="mt-2">
            <ImportExportBar
              exportHref="/api/admin/export/customers"
              exportLabel="Export CSV"
            />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm p-4 mb-4">
        <form className="flex gap-3">
          <input name="q" defaultValue={q} placeholder="Search by name or email..."
            className="flex-1 px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
          <button type="submit" className="px-4 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm">Search</button>
          {q && <Link href="/admin/customers" className="px-4 py-2 text-[13px] text-[#64748b] self-center">Clear</Link>}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] text-[#64748b] text-[11px] uppercase tracking-wide border-b border-[#e2e8f0]">
                {["Customer", "Country", "Joined", "Orders", "Total Spend", "Wishlist"].map((h) => (
                  <th key={h} className="text-left px-5 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => {
                const egpSpend = c.orders.reduce((s, o) => s + Number(o.total), 0);
                return (
                  <tr key={c.id} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]">
                    <td className="px-5 py-3">
                      <Link href={`/admin/customers/${c.id}`} className="font-bold text-[#1e293b] hover:text-[#3b82f6]">
                        {c.firstName} {c.lastName}
                      </Link>
                      <p className="text-[11px] text-[#94a3b8]">{c.email}</p>
                      {c.phone && <p className="text-[11px] text-[#94a3b8]">{c.phone}</p>}
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">{c.country}</td>
                    <td className="px-5 py-3 text-[#64748b]">
                      {new Date(c.createdAt).toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3 font-bold text-[#1e293b]">{c._count.orders}</td>
                    <td className="px-5 py-3 text-[#1e293b]">
                      {egpSpend > 0 && <p className="font-bold">{egpSpend.toLocaleString()} EGP</p>}
                      {egpSpend === 0 && <span className="text-[#94a3b8]">—</span>}
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">{c._count.wishlistItems}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {customers.length === 0 && <div className="py-12 text-center text-[#94a3b8]">No customers found.</div>}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-1 justify-center mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={`/admin/customers?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`w-8 h-8 flex items-center justify-center text-[13px] rounded-sm border transition-colors ${
                p === page ? "bg-[#3b82f6] text-white border-[#3b82f6]" : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#3b82f6]"
              }`}>
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
