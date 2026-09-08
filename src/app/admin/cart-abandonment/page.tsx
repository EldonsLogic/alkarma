import { prisma } from "@/lib/prisma";
import { ImportExportBar } from "@/components/admin/ImportExportBar";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { page?: string; status?: string };
}

interface CartItemSnapshot {
  title: string;
  quantity: number;
  priceEgp: number;
}

export default async function CartAbandonmentPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const status = searchParams.status ?? "all"; // all | abandoned | recovered
  const limit = 40;
  const skip = (page - 1) * limit;

  const where =
    status === "abandoned"
      ? { isRecovered: false }
      : status === "recovered"
      ? { isRecovered: true }
      : {};

  const [carts, total, abandonedCount, recoveredCount, totalCount] = await Promise.all([
    prisma.abandonedCart.findMany({
      where,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.abandonedCart.count({ where }),
    prisma.abandonedCart.count({ where: { isRecovered: false } }),
    prisma.abandonedCart.count({ where: { isRecovered: true } }),
    prisma.abandonedCart.count(),
  ]);

  const recoveryRate = totalCount > 0 ? Math.round((recoveredCount / totalCount) * 100) : 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Cart Abandonment</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">
            Track customers who started checkout but didn&apos;t complete their order
          </p>
          <div className="mt-2">
            <ImportExportBar
              exportHref="/api/admin/export/cart-abandonment"
              exportLabel="Export CSV"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total", value: totalCount.toLocaleString(), color: "text-[#1e293b]" },
          { label: "Abandoned", value: abandonedCount.toLocaleString(), color: "text-red-600" },
          { label: "Recovered", value: recoveredCount.toLocaleString(), color: "text-green-600" },
          { label: "Recovery Rate", value: `${recoveryRate}%`, color: "text-brand" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-lg border border-[#e2e8f0] px-5 py-4">
            <p className="text-[12px] text-[#64748b] font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-[24px] font-black mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[
          { value: "all", label: `All (${totalCount})` },
          { value: "abandoned", label: `Abandoned (${abandonedCount})` },
          { value: "recovered", label: `Recovered (${recoveredCount})` },
        ].map((tab) => (
          <a
            key={tab.value}
            href={`/admin/cart-abandonment?status=${tab.value}`}
            className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
              status === tab.value
                ? "bg-[#1e293b] text-white"
                : "bg-white border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-[#e2e8f0] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#e2e8f0] bg-[#f8fafc]">
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Customer</th>
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Items</th>
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Value</th>
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Step</th>
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Status</th>
              <th className="text-left px-5 py-3 font-semibold text-[#64748b]">Date</th>
            </tr>
          </thead>
          <tbody>
            {carts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[#94a3b8]">
                  No abandoned carts found.
                </td>
              </tr>
            ) : (
              carts.map((cart) => {
                let parsedItems: CartItemSnapshot[] = [];
                try {
                  parsedItems = JSON.parse(cart.items);
                } catch {}
                const itemCount = parsedItems.reduce((s, i) => s + (i.quantity ?? 1), 0);

                return (
                  <tr key={cart.id} className="border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors">
                    <td className="px-5 py-3">
                      {cart.user ? (
                        <div>
                          <p className="font-medium text-[#1e293b]">
                            {cart.user.firstName} {cart.user.lastName}
                          </p>
                          <p className="text-[#94a3b8] text-[11px]">{cart.user.email}</p>
                        </div>
                      ) : cart.guestEmail ? (
                        <div>
                          <p className="font-medium text-[#1e293b]">{cart.guestEmail}</p>
                          <p className="text-[#94a3b8] text-[11px]">Guest</p>
                        </div>
                      ) : (
                        <span className="text-[#94a3b8]">Anonymous</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">
                      {itemCount} item{itemCount !== 1 ? "s" : ""}
                      {parsedItems.length > 0 && (
                        <p className="text-[11px] text-[#94a3b8] mt-0.5 truncate max-w-[180px]">
                          {parsedItems.slice(0, 2).map((i) => i.title).join(", ")}
                          {parsedItems.length > 2 ? ` +${parsedItems.length - 2} more` : ""}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 font-bold text-[#1e293b]">
                      {`${Math.round(cart.totalEgp).toLocaleString()} EGP`}
                    </td>
                    <td className="px-5 py-3">
                      <span className="capitalize text-[#64748b]">{cart.step}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          cart.isRecovered
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {cart.isRecovered ? "Recovered" : "Abandoned"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-[#64748b]">
                      {new Date(cart.updatedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center gap-3 justify-end text-[13px]">
          <span className="text-[#64748b]">
            Page {page} of {totalPages}
          </span>
          {page > 1 && (
            <a
              href={`/admin/cart-abandonment?page=${page - 1}&status=${status}`}
              className="px-3 py-1.5 border border-[#e2e8f0] rounded-md hover:bg-[#f8fafc]"
            >
              ← Prev
            </a>
          )}
          {page < totalPages && (
            <a
              href={`/admin/cart-abandonment?page=${page + 1}&status=${status}`}
              className="px-3 py-1.5 border border-[#e2e8f0] rounded-md hover:bg-[#f8fafc]"
            >
              Next →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
