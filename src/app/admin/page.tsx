import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Admin Dashboard" };

async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOrders,
    todayOrders,
    totalCustomers,
    totalBooks,
    lowStockCount,
    recentOrders,
    todayRevenue,
    weekRevenue,
    monthRevenue,
  ] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.book.count({ where: { isActive: true } }),
    prisma.book.count({ where: { isActive: true, stock: { lte: 5, gt: 0 } } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: today }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: weekAgo }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { total: true },
    }),
    prisma.order.aggregate({
      where: { createdAt: { gte: monthAgo }, status: { notIn: ["CANCELLED", "REFUNDED"] } },
      _sum: { total: true },
    }),
  ]);

  return {
    totalOrders, todayOrders, totalCustomers, totalBooks, lowStockCount,
    recentOrders,
    todayRevenue: Number(todayRevenue._sum.total ?? 0),
    weekRevenue: Number(weekRevenue._sum.total ?? 0),
    monthRevenue: Number(monthRevenue._sum.total ?? 0),
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-red-100 text-red-600",
};

export default async function AdminDashboard() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="text-[24px] font-black text-[#1e293b] mb-6">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Today's Revenue", value: `${stats.todayRevenue.toLocaleString()} EGP`, sub: `${stats.todayOrders} orders today`, color: "text-[#3b82f6]" },
          { label: "This Week", value: `${stats.weekRevenue.toLocaleString()} EGP`, sub: "Revenue (7 days)", color: "text-[#8b5cf6]" },
          { label: "This Month", value: `${stats.monthRevenue.toLocaleString()} EGP`, sub: "Revenue (30 days)", color: "text-brand" },
          { label: "Customers", value: stats.totalCustomers.toLocaleString(), sub: `${stats.totalBooks} active products`, color: "text-[#2e7d52]" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-sm border border-[#e2e8f0] p-5">
            <p className="text-[12px] text-[#64748b] font-bold uppercase tracking-wide mb-2">{kpi.label}</p>
            <p className={`text-[26px] font-black ${kpi.color} leading-none mb-1`}>{kpi.value}</p>
            <p className="text-[12px] text-[#94a3b8]">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Low stock alert */}
      {stats.lowStockCount > 0 && (
        <div className="bg-brand/10 border border-brand/30 rounded-sm p-4 mb-6 flex items-center justify-between">
          <p className="text-[14px] font-bold text-[#b34f00]">
            ⚠️ {stats.lowStockCount} product{stats.lowStockCount !== 1 ? "s" : ""} running low on stock
          </p>
          <Link href="/admin/inventory" className="text-[13px] text-brand font-bold hover:underline">
            View Inventory →
          </Link>
        </div>
      )}

      {/* Recent orders */}
      <div className="bg-white rounded-sm border border-[#e2e8f0]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0]">
          <h2 className="text-[16px] font-black text-[#1e293b]">Recent Orders</h2>
          <Link href="/admin/orders" className="text-[13px] text-[#3b82f6] hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] text-[#64748b] text-[11px] uppercase tracking-wide">
                {["Order", "Customer", "Date", "Total", "Status", "Payment"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((order) => (
                <tr key={order.id} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]">
                  <td className="px-6 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-bold text-[#3b82f6] hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-6 py-3 text-[#1e293b]">
                    {order.user ? `${order.user.firstName} ${order.user.lastName}` : (order.guestName || "Guest")}
                  </td>
                  <td className="px-6 py-3 text-[#64748b]">
                    {new Date(order.createdAt).toLocaleDateString("en-EG", { day: "numeric", month: "short" })}
                  </td>
                  <td className="px-6 py-3 font-bold">{Number(order.total).toLocaleString()} {order.currency}</td>
                  <td className="px-6 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? ""}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-[#64748b]">{order.paymentMethod}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
