import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImportExportBar } from "@/components/admin/ImportExportBar";

export const metadata = { title: "Orders — Admin" };

const STATUSES = ["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","RETURNED","CANCELLED","REFUNDED"] as const;
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  RETURNED: "bg-brand-100 text-brand-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-red-100 text-red-600",
};

interface Props {
  searchParams: { page?: string; status?: string; q?: string };
}

export default async function AdminOrdersPage({ searchParams }: Props) {
  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 25;
  const skip = (page - 1) * limit;

  const where = {
    ...(searchParams.status ? { status: searchParams.status as any } : {}),
    ...(searchParams.q ? {
      OR: [
        { orderNumber: { contains: searchParams.q } },
        { user: { email: { contains: searchParams.q } } },
        { guestEmail: { contains: searchParams.q } },
        { guestName: { contains: searchParams.q } },
      ],
    } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Orders ({total})</h1>
          <div className="mt-2">
            <ImportExportBar
              exportHref="/api/admin/export/orders"
              exportLabel="Export CSV"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm p-4 mb-4 flex gap-3 flex-wrap">
        <form className="flex gap-3 flex-wrap flex-1">
          <input name="q" defaultValue={searchParams.q} placeholder="Order # or customer email..."
            className="flex-1 min-w-[220px] px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
          <select name="status" defaultValue={searchParams.status ?? ""}
            className="px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none">
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" className="px-4 py-2 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm">Filter</button>
          {(searchParams.q || searchParams.status) && (
            <Link href="/admin/orders" className="px-4 py-2 text-[13px] text-[#64748b]">Clear</Link>
          )}
        </form>
      </div>

      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-[#f8fafc] text-[11px] uppercase text-[#64748b] tracking-wide border-b border-[#e2e8f0]">
              {["Order", "Customer", "Date", "Items", "Total", "Status", "Payment", ""].map((h) => (
                <th key={h} className="text-left px-5 py-3 font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]">
                <td className="px-5 py-3 font-bold text-[#3b82f6]">
                  <Link href={`/admin/orders/${order.id}`} className="hover:underline">{order.orderNumber}</Link>
                </td>
                <td className="px-5 py-3">
                  <p className="font-bold text-[#1e293b]">
                    {order.user ? `${order.user.firstName} ${order.user.lastName}` : (order.guestName || "Guest")}
                    {!order.user && <span className="ml-2 text-[10px] font-bold uppercase text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.5 rounded">Guest</span>}
                  </p>
                  <p className="text-[11px] text-[#94a3b8]">{order.user?.email ?? order.guestEmail ?? "—"}</p>
                </td>
                <td className="px-5 py-3 text-[#64748b]">
                  {new Date(order.createdAt).toLocaleDateString("en-EG", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3 text-[#64748b]">{order._count.items}</td>
                <td className="px-5 py-3 font-bold">{Number(order.total).toLocaleString()} {order.currency}</td>
                <td className="px-5 py-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-[#64748b]">{order.paymentMethod} / {order.paymentStatus}</td>
                <td className="px-5 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="text-[#3b82f6] hover:underline font-bold text-[12px]">
                    Manage →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="py-12 text-center text-[#94a3b8]">No orders found</div>}
      </div>
    </div>
  );
}
