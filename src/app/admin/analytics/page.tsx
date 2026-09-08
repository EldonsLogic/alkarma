import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Analytics — Admin" };

async function getAnalyticsData() {
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const prevMonthStart = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const [
    // Revenue
    todayRev, weekRev, monthRev, prevMonthRev,
    // Orders
    todayOrders, weekOrders, monthOrders, totalOrders,
    // Customers
    totalCustomers, newCustomersMonth,
    // Products
    totalActiveBooks, outOfStock, lowStock,
    // Order status breakdown
    statusBreakdown,
    // Top selling books
    topBooks,
    // Daily revenue for last 7 days
    recentOrders,
  ] = await Promise.all([
    // Revenue aggregates
    prisma.order.aggregate({ where: { createdAt: { gte: todayStart }, status: { notIn: ["CANCELLED", "REFUNDED"] } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: weekAgo }, status: { notIn: ["CANCELLED", "REFUNDED"] } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: monthAgo }, status: { notIn: ["CANCELLED", "REFUNDED"] } }, _sum: { total: true } }),
    prisma.order.aggregate({ where: { createdAt: { gte: prevMonthStart, lt: monthAgo }, status: { notIn: ["CANCELLED", "REFUNDED"] } }, _sum: { total: true } }),
    // Order counts
    prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.order.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.order.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.order.count(),
    // Customers
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.user.count({ where: { role: "CUSTOMER", createdAt: { gte: monthAgo } } }),
    // Products
    prisma.book.count({ where: { isActive: true } }),
    prisma.book.count({ where: { isActive: true, stock: 0 } }),
    prisma.book.count({ where: { isActive: true, stock: { gt: 0, lte: 5 } } }),
    // Status breakdown
    prisma.order.groupBy({ by: ["status"], _count: { _all: true }, orderBy: { _count: { status: "desc" } } }),
    // Top books by sales
    prisma.book.findMany({
      where: { isActive: true, salesCount: { gt: 0 } },
      orderBy: { salesCount: "desc" },
      take: 10,
      select: { id: true, title: true, author: true, salesCount: true, priceEgp: true, stock: true },
    }),
    // Recent orders for the activity feed
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return {
    revenue: {
      today: Number(todayRev._sum.total ?? 0),
      week: Number(weekRev._sum.total ?? 0),
      month: Number(monthRev._sum.total ?? 0),
      prevMonth: Number(prevMonthRev._sum.total ?? 0),
    },
    orders: { today: todayOrders, week: weekOrders, month: monthOrders, total: totalOrders },
    customers: { total: totalCustomers, newMonth: newCustomersMonth },
    products: { active: totalActiveBooks, outOfStock, lowStock },
    statusBreakdown,
    topBooks,
    recentOrders,
  };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  REFUNDED: "bg-red-100 text-red-600",
};

function pct(a: number, b: number) {
  if (b === 0) return 0;
  return Math.round(((a - b) / b) * 100);
}

function Trend({ value }: { value: number }) {
  if (value === 0) return <span className="text-[12px] text-[#94a3b8]">—</span>;
  const up = value > 0;
  return (
    <span className={`text-[12px] font-bold ${up ? "text-[#2e7d52]" : "text-red-500"}`}>
      {up ? "▲" : "▼"} {Math.abs(value)}% vs prev month
    </span>
  );
}

export default async function AdminAnalyticsPage() {
  const d = await getAnalyticsData();
  const monthTrend = pct(d.revenue.month, d.revenue.prevMonth);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[24px] font-black text-[#1e293b]">Analytics</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/search-analytics" className="px-3 py-1.5 border border-[#e2e8f0] text-[12px] font-bold rounded-sm hover:bg-[#f8fafc] transition-colors">
            🔎 Search Analytics
          </Link>
          <a href="/api/admin/export/sales?days=30" className="px-3 py-1.5 border border-[#e2e8f0] text-[12px] font-bold rounded-sm hover:bg-[#f8fafc] transition-colors">
            ↓ Export Sales CSV
          </a>
        </div>
      </div>

      {/* ── Revenue KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today's Revenue", value: d.revenue.today, sub: `${d.orders.today} orders today`, color: "text-[#3b82f6]" },
          { label: "This Week", value: d.revenue.week, sub: `${d.orders.week} orders`, color: "text-[#8b5cf6]" },
          { label: "This Month", value: d.revenue.month, sub: <Trend value={monthTrend} />, color: "text-brand" },
          { label: "All Time", value: null, countValue: d.orders.total, sub: `${d.customers.total} customers`, color: "text-[#2e7d52]" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#e2e8f0] rounded-sm p-5">
            <p className="text-[11px] text-[#64748b] font-bold uppercase tracking-wide mb-2">{kpi.label}</p>
            <p className={`text-[22px] font-black ${kpi.color} leading-none mb-1`}>
              {kpi.value !== null ? `${kpi.value.toLocaleString()} EGP` : kpi.countValue?.toLocaleString()}
            </p>
            <div className="text-[12px] text-[#94a3b8]">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Product health + New customers ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
          <p className="text-[11px] text-[#64748b] font-bold uppercase tracking-wide mb-2">Active Products</p>
          <p className="text-[28px] font-black text-[#1e293b] leading-none mb-1">{d.products.active}</p>
          <p className="text-[12px] text-[#94a3b8]">Listed in store</p>
        </div>
        <div className={`border rounded-sm p-5 ${d.products.outOfStock > 0 ? "bg-red-50 border-red-200" : "bg-white border-[#e2e8f0]"}`}>
          <p className="text-[11px] text-[#64748b] font-bold uppercase tracking-wide mb-2">Out of Stock</p>
          <p className={`text-[28px] font-black leading-none mb-1 ${d.products.outOfStock > 0 ? "text-red-500" : "text-[#2e7d52]"}`}>
            {d.products.outOfStock}
          </p>
          {d.products.outOfStock > 0 ? (
            <Link href="/admin/inventory?stock=out" className="text-[12px] text-red-500 hover:underline font-bold">
              Fix inventory →
            </Link>
          ) : (
            <p className="text-[12px] text-[#94a3b8]">All stocked</p>
          )}
        </div>
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
          <p className="text-[11px] text-[#64748b] font-bold uppercase tracking-wide mb-2">New Customers</p>
          <p className="text-[28px] font-black text-[#1e293b] leading-none mb-1">{d.customers.newMonth}</p>
          <p className="text-[12px] text-[#94a3b8]">This month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        {/* Left — Top books + Order status */}
        <div className="space-y-6">

          {/* Top selling books */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
              <h2 className="text-[15px] font-black text-[#1e293b]">Top Selling Books</h2>
              <Link href="/admin/products" className="text-[12px] text-[#3b82f6] hover:underline">View all</Link>
            </div>
            {d.topBooks.length === 0 ? (
              <p className="py-8 text-center text-[#94a3b8] text-[13px]">No sales data yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#f8fafc] text-[#64748b] text-[11px] uppercase tracking-wide">
                      <th className="text-left px-5 py-2.5 font-bold">#</th>
                      <th className="text-left px-5 py-2.5 font-bold">Book</th>
                      <th className="text-left px-5 py-2.5 font-bold">Sales</th>
                      <th className="text-left px-5 py-2.5 font-bold">Revenue</th>
                      <th className="text-left px-5 py-2.5 font-bold">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.topBooks.map((book, i) => (
                      <tr key={book.id} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]">
                        <td className="px-5 py-3 text-[#94a3b8] font-bold">{i + 1}</td>
                        <td className="px-5 py-3">
                          <p className="font-bold text-[#1e293b] line-clamp-1">{book.title}</p>
                          <p className="text-[11px] text-[#94a3b8]">{book.author}</p>
                        </td>
                        <td className="px-5 py-3 font-bold text-[#1e293b]">{book.salesCount}</td>
                        <td className="px-5 py-3 text-[#1e293b]">
                          {(book.salesCount * Number(book.priceEgp)).toLocaleString()} EGP
                        </td>
                        <td className="px-5 py-3">
                          <span className={`font-bold ${book.stock === 0 ? "text-red-500" : book.stock <= 5 ? "text-brand" : "text-[#2e7d52]"}`}>
                            {book.stock}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Order status breakdown */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
            <h2 className="text-[15px] font-black text-[#1e293b] mb-4">Order Status Breakdown</h2>
            {d.statusBreakdown.length === 0 ? (
              <p className="text-[#94a3b8] text-[13px]">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {d.statusBreakdown.map((row) => {
                  const count = row._count._all;
                  const pctVal = d.orders.total > 0 ? Math.round((count / d.orders.total) * 100) : 0;
                  return (
                    <div key={row.status}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status] ?? ""}`}>
                          {row.status}
                        </span>
                        <span className="text-[13px] font-bold text-[#1e293b]">
                          {count} <span className="text-[#94a3b8] font-normal">({pctVal}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#3b82f6] rounded-full transition-all"
                          style={{ width: `${pctVal}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right — Recent activity */}
        <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
            <h2 className="text-[15px] font-black text-[#1e293b]">Recent Orders</h2>
            <Link href="/admin/orders" className="text-[12px] text-[#3b82f6] hover:underline">View all</Link>
          </div>
          <ul className="divide-y divide-[#f1f5f9]">
            {d.recentOrders.map((order) => (
              <li key={order.id}>
                <Link href={`/admin/orders/${order.id}`} className="flex items-start justify-between gap-3 px-5 py-3.5 hover:bg-[#f8fafc] transition-colors">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#1e293b] truncate">{order.orderNumber}</p>
                    <p className="text-[11px] text-[#94a3b8] truncate">
                      {order.user ? `${order.user.firstName} ${order.user.lastName}` : (order.guestName || "Guest")}
                    </p>
                    <p className="text-[11px] text-[#94a3b8]">
                      {new Date(order.createdAt).toLocaleDateString("en-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-black">{Number(order.total).toLocaleString()} {order.currency}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? ""}`}>
                      {order.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {d.recentOrders.length === 0 && (
            <p className="py-8 text-center text-[#94a3b8] text-[13px]">No orders yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
