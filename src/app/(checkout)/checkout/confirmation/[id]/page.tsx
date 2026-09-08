import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MarkRecovered } from "./MarkRecovered";
import { PurchaseEvent } from "./PurchaseEvent";
import { ClaimAccount } from "./ClaimAccount";

export default async function ConfirmationPage({ params }: { params: { id: string } }) {
  const session = await auth();
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true },
  });

  if (!order || (session?.user?.id && order.userId !== session.user.id)) notFound();

  const isGuestOrder = !order.userId && !session?.user?.id;

  const t = {
    confirmed: "تم تأكيد طلبك",
    thanks: "شكرًا لتسوقك من متجر جي",
    orderNumber: "رقم الطلب",
    items: "المنتجات",
    total: "الإجمالي",
    codNote: "💵 سيتم تحصيل المبلغ عند الاستلام.",
    onlineNote: "💳 جارٍ معالجة الدفع.",
    shippingNote: "سنرسل لك تحديثًا بالشحن عبر البريد الإلكتروني بمجرد شحن الطلب.",
    viewOrder: "عرض الطلب",
    continueShopping: "متابعة التسوق",
  };

  return (
    <div className="min-h-screen bg-paper-mid flex flex-col items-center justify-center gap-5 px-4 py-16">
      <MarkRecovered />
      <PurchaseEvent
        transactionId={order.id}
        orderNumber={order.orderNumber}
        items={order.items.map((i) => ({
          id: i.id,
          title: i.title,
          author: "",
          slug: null,
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
        }))}
        total={Number(order.total)}
        shipping={Number(order.shippingFee ?? 0)}
        currency={order.currency}
        coupon={order.couponCode}
      />

      <div className="bg-paper border border-paper-dark max-w-[580px] w-full shadow-card-hover">
        {/* Top ink strip */}
        <div className="bg-ink px-8 py-8 text-center">
          <div className="w-14 h-14 bg-green-600 flex items-center justify-center mx-auto mb-4">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="font-display font-bold text-paper leading-tight mb-1" style={{ fontSize: "clamp(24px, 3vw, 32px)" }}>
            {t.confirmed}
          </h1>
          <p className="text-paper/60 text-[14px] font-light">{t.thanks}</p>
        </div>

        {/* Order number */}
        <div className="px-8 py-5 border-b border-paper-dark text-center">
          <p className="price-mono text-[11px] uppercase tracking-[0.12em] text-ink-muted mb-1">{t.orderNumber}</p>
          <p className="font-display text-[22px] font-bold text-brand">{order.orderNumber}</p>
        </div>

        {/* Items */}
        <div className="px-8 py-5">
          <p className="price-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted mb-3">{t.items}</p>
          <ul className="space-y-2.5 mb-5">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between items-center text-[13px]">
                <span dir="auto" className="text-ink flex-1 line-clamp-1 me-3">
                  {item.title}
                  <span className="text-ink-muted ms-1">×{item.quantity}</span>
                </span>
                <span className="price-mono text-brand font-medium flex-shrink-0">
                  {Number(item.unitPrice) * item.quantity} {order.currency}
                </span>
              </li>
            ))}
          </ul>
          <div className="border-t border-paper-dark pt-4 flex justify-between items-baseline">
            <span className="font-display text-[16px] font-bold text-ink">{t.total}</span>
            <span className="price-mono text-[20px] font-medium text-brand">
              {Number(order.total)} {order.currency}
            </span>
          </div>
        </div>

        {/* Payment note */}
        <div className="px-8 pb-5">
          <div className="bg-paper-mid border border-paper-dark px-4 py-3 text-[13px] text-ink-soft leading-relaxed">
            {order.paymentMethod === "COD" ? t.codNote : t.onlineNote}
            {" "}{t.shippingNote}
          </div>
        </div>

        {/* CTAs */}
        <div className="px-8 pb-8 flex flex-col sm:flex-row gap-3">
          {!isGuestOrder && (
            <Link
              href={`/account/orders/${order.id}`}
              className="flex-1 py-3 border-2 border-brand text-brand font-bold text-[13px] uppercase tracking-[0.06em] hover:bg-brand hover:text-white transition-colors text-center"
            >
              {t.viewOrder}
            </Link>
          )}
          <Link
            href="/"
            className="flex-1 py-3 bg-brand hover:bg-brand-dark text-white font-bold text-[13px] uppercase tracking-[0.06em] transition-colors text-center"
          >
            {t.continueShopping}
          </Link>
        </div>
      </div>

      {/* Guest orders: offer to create an account (links this order to it) */}
      {isGuestOrder && order.guestEmail && (
        <div className="max-w-[580px] w-full">
          <ClaimAccount email={order.guestEmail} />
        </div>
      )}
    </div>
  );
}
