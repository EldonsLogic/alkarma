import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "My Orders" };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-red-100 text-red-600",
};

const STATUS_AR: Record<string, string> = {
  PENDING: "قيد الانتظار",
  CONFIRMED: "مؤكد",
  PROCESSING: "قيد التجهيز",
  SHIPPED: "تم الشحن",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  REFUNDED: "مسترد",
};

const STRINGS = {
    title: "طلباتي",
    orders: (n: number) => `${n} طلب`,
    all: "الكل",
    noOrders: "لا توجد طلبات بعد",
    noOrdersHint: "لم تقم بأي طلب حتى الآن.",
    noStatusOrders: (s: string) => `لا توجد طلبات بحالة ${STATUS_AR[s] ?? s}.`,
    startShopping: "ابدأ التسوق",
    order: "الطلب",
    date: "التاريخ",
    total: "الإجمالي",
    items: "المنتجات",
    viewDetails: "عرض التفاصيل ←",
    tracking: "التتبع:",
    moreItems: (n: number) => `+ ${n} منتجات أخرى`,
    statusLabel: (s: string) => STATUS_AR[s] ?? s,
  } as const;

interface Props {
  searchParams: { page?: string; status?: string };
}

export default async function AccountOrdersPage({ searchParams }: Props) {
  const [session] = await Promise.all([auth()]);
  const t = STRINGS;
  const userId = session!.user!.id!;

  const page = Math.max(1, parseInt(searchParams.page ?? "1"));
  const limit = 10;
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(searchParams.status ? { status: searchParams.status } : {}),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        items: { take: 3, include: { book: { select: { coverUrl: true, slug: true } } } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);
  const dateLocale = "ar-EG";

  const STATUSES = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[22px] font-black">{t.title}</h1>
        <span className="text-[13px] text-[#666]">{t.orders(total)}</span>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Link
          href="/account/orders"
          className={`px-3 py-1.5 text-[12px] font-bold rounded-full border transition-colors ${
            !searchParams.status ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "bg-white text-[#666] border-[#ddd] hover:border-[#1a1a1a]"
          }`}
        >
          {t.all}
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/account/orders?status=${s}`}
            className={`px-3 py-1.5 text-[12px] font-bold rounded-full border transition-colors ${
              searchParams.status === s ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "bg-white text-[#666] border-[#ddd] hover:border-[#1a1a1a]"
            }`}
          >
            {t.statusLabel(s)}
          </Link>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-[#ddd] p-12 text-center">
          <p className="text-[18px] font-bold mb-2">{t.noOrders}</p>
          <p className="text-[14px] text-[#666] mb-6">
            {searchParams.status ? t.noStatusOrders(searchParams.status) : t.noOrdersHint}
          </p>
          <Link
            href="/"
            className="inline-block bg-brand hover:bg-brand-dark text-white px-8 py-3 font-bold uppercase text-[13px] tracking-wide transition-colors"
          >
            {t.startShopping}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-[#ddd] overflow-hidden">
              {/* Order header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-[#f9f9f9] border-b border-[#ddd]">
                <div className="flex flex-wrap items-center gap-3 sm:gap-5">
                  <div>
                    <p className="text-[11px] text-[#666] uppercase tracking-wide font-bold">{t.order}</p>
                    <p className="text-[14px] font-black text-[#1a1a1a]">{order.orderNumber}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#666] uppercase tracking-wide font-bold">{t.date}</p>
                    <p className="text-[14px] font-bold">
                      {new Date(order.createdAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#666] uppercase tracking-wide font-bold">{t.total}</p>
                    <p className="text-[14px] font-black">{Number(order.total).toLocaleString()} {order.currency}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-[#666] uppercase tracking-wide font-bold">{t.items}</p>
                    <p className="text-[14px] font-bold">{order._count.items}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] ?? ""}`}>
                    {t.statusLabel(order.status)}
                  </span>
                  <Link
                    href={`/account/orders/${order.id}`}
                    className="text-[13px] font-bold text-brand hover:underline whitespace-nowrap"
                  >
                    {t.viewDetails}
                  </Link>
                </div>
              </div>

              {/* Order items preview */}
              <div className="px-5 py-4">
                <div className="flex flex-col gap-2">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-[13px]">
                      {item.book?.coverUrl && !false ? (
                        <img
                          src={item.book.coverUrl}
                          alt={item.title}
                          className="w-8 h-12 object-cover flex-shrink-0 bg-[#eee]"
                        />
                      ) : (
                        <div className="w-8 h-12 bg-[#eee] flex-shrink-0" />
                      )}
                      <span className="text-[#333] line-clamp-1 flex-1">{item.title}</span>
                      <span className="text-[#666] flex-shrink-0">×{item.quantity}</span>
                      <span className="font-bold flex-shrink-0">{(Number(item.unitPrice) * item.quantity).toLocaleString()} {order.currency}</span>
                    </div>
                  ))}
                  {order._count.items > 3 && (
                    <p className="text-[12px] text-[#aaa] mt-1">
                      {t.moreItems(order._count.items - 3)}
                    </p>
                  )}
                </div>

                {/* Tracking info */}
                {order.trackingNumber && (
                  <div className="mt-3 pt-3 border-t border-[#eee] text-[12px] text-[#666]">
                    <span className="font-bold">{t.tracking} </span>
                    {order.carrierName && <span>{order.carrierName} — </span>}
                    <span className="font-mono">{order.trackingNumber}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex gap-1 justify-center mt-8">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/account/orders?page=${p}${searchParams.status ? `&status=${searchParams.status}` : ""}`}
              className={`w-9 h-9 flex items-center justify-center text-[13px] border transition-colors ${
                p === page
                  ? "bg-brand text-white border-brand"
                  : "bg-white border-[#ddd] text-[#666] hover:border-brand"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
