import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RequestReturn } from "./RequestReturn";

export const metadata = { title: "Order Details" };

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  PROCESSING: "bg-purple-100 text-purple-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  RETURNED: "bg-brand-100 text-brand-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-red-100 text-red-600",
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  UNPAID: "bg-gray-100 text-gray-600",
  PAID: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-600",
  REFUNDED: "bg-red-100 text-red-600",
};

const STATUS_LABELS: Record<string, { en: string; ar: string }> = {
  PENDING: { en: "Pending", ar: "قيد الانتظار" },
  CONFIRMED: { en: "Confirmed", ar: "مؤكد" },
  PROCESSING: { en: "Processing", ar: "قيد التجهيز" },
  SHIPPED: { en: "Shipped", ar: "تم الشحن" },
  DELIVERED: { en: "Delivered", ar: "تم التوصيل" },
  RETURNED: { en: "Returned", ar: "تم الإرجاع" },
  CANCELLED: { en: "Cancelled", ar: "ملغي" },
  REFUNDED: { en: "Refunded", ar: "مسترد" },
};

const PAYMENT_LABELS: Record<string, { en: string; ar: string }> = {
  UNPAID: { en: "Unpaid", ar: "غير مدفوع" },
  PAID: { en: "Paid", ar: "مدفوع" },
  FAILED: { en: "Failed", ar: "فشل" },
  REFUNDED: { en: "Refunded", ar: "مسترد" },
};

const STATUS_STEPS = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];

export default async function AccountOrderDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = session!.user!.id!;
  const dateLocale = "ar-EG";
  const sLabel = (s: string) => (STATUS_LABELS[s] ? STATUS_LABELS[s].ar : s);
  const pLabel = (s: string) => (PAYMENT_LABELS[s] ? PAYMENT_LABELS[s].ar : s);

  const t = {
    back: "→ العودة إلى الطلبات",
    placedOn: "تاريخ الطلب",
    itemsOrdered: "المنتجات المطلوبة",
    qty: "الكمية",
    shippingAddress: "عنوان الشحن",
    tracking: "التتبع",
    shipped: "تاريخ الشحن",
    orderSummary: "ملخص الطلب",
    subtotal: "المجموع الفرعي",
    shipping: "الشحن",
    free: "مجاني",
    discount: "الخصم",
    total: "الإجمالي",
    payment: "الدفع",
    method: "طريقة الدفع",
    cod: "الدفع عند الاستلام",
    online: "عبر الإنترنت",
    status: "الحالة",
    paidOn: "تاريخ الدفع",
    yourNote: "ملاحظتك",
  };

  const order = await prisma.order.findFirst({
    where: { id: params.id, userId }, // ensure the order belongs to this user
    include: {
      items: { include: { book: { select: { coverUrl: true, slug: true } } } },
      returns: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
    },
  });

  if (!order) notFound();

  const existingReturn = order.returns[0] ?? null;
  const withinReturnWindow =
    (Date.now() - new Date(order.deliveredAt ?? order.createdAt).getTime()) / 86_400_000 <= 14;
  const canReturn = order.status === "DELIVERED" && withinReturnWindow;

  const subtotal = Number(order.subtotal);
  const shippingFee = Number(order.shippingFee);
  const discount = Number(order.discount);
  const total = Number(order.total);

  let shippingAddr: Record<string, string> = {};
  try { shippingAddr = JSON.parse(order.shippingAddress); } catch {}

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isCancelledOrRefunded = order.status === "CANCELLED" || order.status === "REFUNDED" || order.status === "RETURNED";

  return (
    <div>
      {/* Back */}
      <Link href="/account/orders" className="text-[13px] text-brand hover:underline mb-5 inline-block">
        {t.back}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-[22px] font-black">{order.orderNumber}</h1>
          <p className="text-[13px] text-[#666] mt-0.5">
            {t.placedOn} {new Date(order.createdAt).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${STATUS_COLORS[order.status] ?? ""}`}>
            {sLabel(order.status)}
          </span>
          <span className={`text-[12px] font-bold px-3 py-1 rounded-full ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? ""}`}>
            {pLabel(order.paymentStatus)}
          </span>
        </div>
      </div>

      {/* Progress tracker */}
      {!isCancelledOrRefunded && (
        <div className="bg-white border border-[#ddd] p-5 mb-5">
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition-colors ${
                    i < currentStep
                      ? "bg-[#2e7d52] text-white"
                      : i === currentStep
                      ? "bg-brand text-white"
                      : "bg-[#e0e0e0] text-[#999]"
                  }`}>
                    {i < currentStep ? "✓" : i + 1}
                  </div>
                  <span className={`text-[10px] font-bold mt-1.5 text-center whitespace-nowrap ${
                    i === currentStep ? "text-brand" : i < currentStep ? "text-[#2e7d52]" : "text-[#aaa]"
                  }`}>
                    {sLabel(step)}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 ${i < currentStep ? "bg-[#2e7d52]" : "bg-[#ddd]"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* Items */}
          <div className="bg-white border border-[#ddd]">
            <h2 className="text-[15px] font-black px-5 py-4 border-b border-[#ddd]">{t.itemsOrdered}</h2>
            <ul className="divide-y divide-[#f0f0f0]">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                  {item.book?.coverUrl && !false ? (
                    <img
                      src={item.book.coverUrl}
                      alt={item.title}
                      className="w-12 h-[72px] object-cover flex-shrink-0 bg-[#eee]"
                    />
                  ) : (
                    <div className="w-12 h-[72px] bg-[#eee] flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {item.book?.slug ? (
                      <Link href={`/book/${item.book.slug}`} className="text-[14px] font-bold text-[#1a1a1a] hover:text-brand line-clamp-2">
                        {item.title}
                      </Link>
                    ) : (
                      <p className="text-[14px] font-bold text-[#1a1a1a] line-clamp-2">{item.title}</p>
                    )}
                    <p className="text-[12px] text-[#666] mt-0.5">{t.qty}: {item.quantity} × {Number(item.unitPrice).toLocaleString()} {order.currency}</p>
                  </div>
                  <p className="text-[14px] font-black flex-shrink-0">
                    {(Number(item.unitPrice) * item.quantity).toLocaleString()} {order.currency}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* Shipping address */}
          <div className="bg-white border border-[#ddd] p-5">
            <h2 className="text-[15px] font-black mb-3">{t.shippingAddress}</h2>
            <div className="text-[14px] text-[#444] leading-[1.8]">
              {shippingAddr.fullName && <p className="font-bold text-[#1a1a1a]">{shippingAddr.fullName}</p>}
              {shippingAddr.phone && <p>{shippingAddr.phone}</p>}
              {shippingAddr.line1 && <p>{shippingAddr.line1}</p>}
              {shippingAddr.line2 && <p>{shippingAddr.line2}</p>}
              <p>
                {[shippingAddr.city, shippingAddr.state, shippingAddr.postcode].filter(Boolean).join("، ")}
              </p>
              {shippingAddr.country && <p>{shippingAddr.country}</p>}
            </div>
          </div>

          {/* Tracking */}
          {order.trackingNumber && (
            <div className="bg-white border border-[#ddd] p-5">
              <h2 className="text-[15px] font-black mb-3">{t.tracking}</h2>
              <p className="text-[14px] text-[#444]">
                {order.carrierName && <><span className="font-bold">{order.carrierName}</span> — </>}
                <span className="font-mono">{order.trackingNumber}</span>
              </p>
              {order.shippedAt && (
                <p className="text-[12px] text-[#666] mt-1">
                  {t.shipped}: {new Date(order.shippedAt).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right column — summary */}
        <div className="space-y-5">
          <div className="bg-white border border-[#ddd] p-5">
            <h2 className="text-[15px] font-black mb-4">{t.orderSummary}</h2>
            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between">
                <span className="text-[#666]">{t.subtotal}</span>
                <span className="font-bold">{subtotal.toLocaleString()} {order.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">{t.shipping}</span>
                <span className={`font-bold ${shippingFee === 0 ? "text-[#2e7d52]" : ""}`}>
                  {shippingFee === 0 ? t.free : `${shippingFee.toLocaleString()} ${order.currency}`}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#2e7d52]">
                  <span>{t.discount}{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                  <span className="font-bold">−{discount.toLocaleString()} {order.currency}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-[16px] border-t border-[#ddd] pt-2 mt-1">
                <span>{t.total}</span>
                <span>{total.toLocaleString()} {order.currency}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#ddd] p-5">
            <h2 className="text-[15px] font-black mb-3">{t.payment}</h2>
            <div className="text-[14px] text-[#444] space-y-1">
              <div className="flex justify-between">
                <span className="text-[#666]">{t.method}</span>
                <span className="font-bold">{order.paymentMethod === "COD" ? t.cod : t.online}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#666]">{t.status}</span>
                <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${PAYMENT_STATUS_COLORS[order.paymentStatus] ?? ""}`}>
                  {pLabel(order.paymentStatus)}
                </span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-[#666]">{t.paidOn}</span>
                  <span className="font-bold">
                    {new Date(order.paidAt).toLocaleDateString(dateLocale, { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {order.notes && (
            <div className="bg-white border border-[#ddd] p-5">
              <h2 className="text-[15px] font-black mb-2">{t.yourNote}</h2>
              <p className="text-[14px] text-[#444] leading-relaxed">{order.notes}</p>
            </div>
          )}

          {(canReturn || existingReturn) && (
            <RequestReturn
              orderId={order.id}
              items={order.items.map((i) => ({ id: i.id, bookId: i.bookId, title: i.title, quantity: i.quantity }))}
              existingStatus={existingReturn?.status ?? null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
