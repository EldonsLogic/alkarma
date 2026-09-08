import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_AR: Record<string, string> = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  REFUNDED: "مسترد",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-red-100 text-red-600",
};

export default async function AccountDashboard() {
  const [session] = await Promise.all([auth()]);
  const userId = session!.user!.id!;
  const dateLocale = "ar-EG";

  const [orderCount, wishlistCount, addressCount, recentOrders] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.wishlistItem.count({ where: { userId } }),
    prisma.address.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
  ]);

  const stats = [
    { label: "طلباتي",    value: orderCount,   href: "/account/orders" },
    { label: "المفضلة",  value: wishlistCount, href: "/account/wishlist" },
    { label: "عناويني", value: addressCount,  href: "/account/addresses" },
  ];

  return (
    <div>
      <h1 className="text-[22px] font-black mb-6">حسابي</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.href} href={stat.href}
            className="bg-white border border-[#ddd] p-5 text-center hover:border-brand transition-colors">
            <p className="text-[28px] font-black text-brand">{stat.value}</p>
            <p className="text-[13px] text-[#666] mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="bg-white border border-[#ddd] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[16px] font-black">آخر الطلبات</h2>
            <Link href="/account/orders" className="text-[13px] text-brand hover:underline">
              عرض الكل
            </Link>
          </div>
          <ul className="space-y-3">
            {recentOrders.map((order) => (
              <li key={order.id}>
                <Link href={`/account/orders/${order.id}`}
                  className="flex items-center justify-between py-3 border-b border-[#eee] hover:bg-[#f9f9f9] px-2 -mx-2 transition-colors">
                  <div>
                    <p className="text-[14px] font-bold">{order.orderNumber}</p>
                    <p className="text-[12px] text-[#666]">
                      {new Date(order.createdAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[order.status] ?? ""}`}>
                      {(STATUS_AR[order.status] ?? order.status)}
                    </span>
                    <span className="text-[14px] font-bold">
                      {Number(order.total).toLocaleString()} {order.currency}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
