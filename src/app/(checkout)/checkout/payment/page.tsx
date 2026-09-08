"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/cart.store";
import { formatPrice } from "@/lib/currency";
import { CheckoutProgress, OrderSummary } from "../components";

export default function PaymentPage() {
  const router = useRouter();
  const { items, subtotal, couponCode, couponDiscount, giftCardCode, giftCardBalance, clearCart } = useCartStore();
  const [shipping, setShipping] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "ONLINE">("COD");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = sessionStorage.getItem("alkarma_shipping");
    if (!saved) { router.push("/checkout/shipping"); return; }
    setShipping(JSON.parse(saved));
  }, [router]);

  const sub = subtotal();
  const shippingFee = shipping?.rate?.price ?? 0;
  const dueBeforeGift = Math.max(0, sub + shippingFee - couponDiscount);
  const giftCardApplied = giftCardCode ? Math.min(giftCardBalance, dueBeforeGift) : 0;
  const total = Math.max(0, dueBeforeGift - giftCardApplied);
  const isEgypt = shipping?.address?.country === "EG";

  async function handlePlaceOrder() {
    setError("");
    setPlacing(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shippingAddress: shipping.address,
        paymentMethod,
        email: shipping.email || undefined,
        couponCode: couponCode ?? undefined,
        giftCardCode: giftCardCode ?? undefined,
        shippingRateId: shipping?.rate?.id,
        // Server recomputes prices + shipping from the DB — we only send what & how many
        items: items.map((i) => ({
          bookId: i.bookId ?? undefined,
          bundleId: i.bundleId ?? undefined,
          quantity: i.quantity,
        })),
      }),
    });
    const data = await res.json();
    setPlacing(false);
    if (!res.ok) { setError(data.error ?? "تعذّر إتمام الطلب"); return; }
    clearCart();
    sessionStorage.removeItem("alkarma_shipping");
    router.push(`/checkout/confirmation/${data.orderId}`);
  }

  if (!shipping) return null;

  return (
    <div className="min-h-screen bg-paper-mid">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-10 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8 sm:gap-10 items-start">

        {/* Left column */}
        <div>
          <CheckoutProgress step={2} />

          <h2 className="font-display text-[22px] font-bold text-ink mt-8 mb-5 pb-3 border-b-2 border-brand">
            طريقة الدفع
          </h2>

          <div className="space-y-3 mb-8">
            {isEgypt && (
              <label
                className={`flex items-start gap-4 px-4 py-4 border cursor-pointer transition-all ${
                  paymentMethod === "COD"
                    ? "border-brand bg-brand/5"
                    : "border-paper-dark bg-paper hover:border-brand"
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="COD"
                  checked={paymentMethod === "COD"}
                  onChange={() => setPaymentMethod("COD")}
                  className="accent-brand mt-0.5"
                />
                <div>
                  <p className="text-[14px] font-bold text-ink mb-0.5">الدفع عند الاستلام</p>
                  <p className="text-[13px] text-ink-muted font-light">الدفع نقدًا عند استلام الطلب. متاح داخل مصر فقط.</p>
                </div>
              </label>
            )}
            <label
              className={`flex items-start gap-4 px-4 py-4 border cursor-pointer transition-all ${
                paymentMethod === "ONLINE"
                  ? "border-brand bg-brand/5"
                  : "border-paper-dark bg-paper hover:border-brand"
              }`}
            >
              <input
                type="radio"
                name="payment"
                value="ONLINE"
                checked={paymentMethod === "ONLINE"}
                onChange={() => setPaymentMethod("ONLINE")}
                className="accent-brand mt-0.5"
              />
              <div>
                <p className="text-[14px] font-bold text-ink mb-0.5">الدفع أونلاين</p>
                <p className="text-[13px] text-ink-muted font-light">دفع إلكتروني آمن (بوابة الدفع قريبًا).</p>
              </div>
            </label>
          </div>

          {/* Shipping address recap */}
          {shipping?.address && (
            <div className="bg-paper border border-paper-dark px-5 py-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <p className="price-mono text-[11px] uppercase tracking-[0.1em] text-ink-muted">التوصيل إلى</p>
                <button
                  onClick={() => router.push("/checkout/shipping")}
                  className="text-[12px] text-brand font-bold hover:underline underline-offset-2"
                >
                  تغيير
                </button>
              </div>
              <p className="text-[14px] font-semibold text-ink">{shipping.address.fullName}</p>
              <p className="text-[13px] text-ink-muted">
                {shipping.address.line1}{shipping.address.line2 ? `, ${shipping.address.line2}` : ""}, {shipping.address.city}
              </p>
            </div>
          )}

          {error && (
            <p className="bg-red-50 text-red-600 text-[13px] px-4 py-3 border border-red-200 mb-4">
              {error}
            </p>
          )}

          <button
            onClick={handlePlaceOrder}
            disabled={placing}
            className="w-full py-4 bg-brand hover:bg-brand-dark text-white font-bold uppercase tracking-[0.08em] text-[14px] transition-colors disabled:opacity-60"
          >
            {placing ? "جارٍ تأكيد الطلب…" : `تأكيد الطلب — ${formatPrice(total)}`}
          </button>
          <p className="price-mono text-[11px] text-ink-muted mt-3 text-center">
            بتأكيد طلبك فإنك توافق على شروط الخدمة
          </p>
        </div>

        {/* Summary sidebar */}
        <div className="sticky top-[89px] space-y-4">
          <OrderSummary items={items} sub={sub} />

          {/* Total breakdown */}
          <div className="bg-paper border border-paper-dark px-5 py-4 space-y-2.5">
            <div className="flex justify-between text-[14px]">
              <span className="text-ink-muted">المجموع الفرعي</span>
              <span className="price-mono font-medium text-ink">{formatPrice(sub)}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-ink-muted">الشحن</span>
              <span className={`price-mono font-medium ${shippingFee === 0 ? "text-green-600" : "text-ink"}`}>
                {shippingFee === 0 ? "مجاني" : formatPrice(shippingFee)}
              </span>
            </div>
            {couponDiscount > 0 && (
              <div className="flex justify-between text-[14px] text-green-600">
                <span>الخصم</span>
                <span className="price-mono font-medium">−{formatPrice(couponDiscount)}</span>
              </div>
            )}
            {giftCardApplied > 0 && (
              <div className="flex justify-between text-[14px] text-green-600">
                <span>بطاقة هدايا <span className="font-mono text-[11px]">({giftCardCode})</span></span>
                <span className="price-mono font-medium">−{formatPrice(giftCardApplied)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-3 border-t border-paper-dark">
              <span className="font-display text-[16px] font-bold text-ink">الإجمالي</span>
              <span className="price-mono text-[20px] font-medium text-brand">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
