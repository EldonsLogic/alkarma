"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useCartStore } from "@/stores/cart.store";
import { useShipsToEgypt } from "@/hooks/use-ships-to-egypt";
import { formatPrice, getPrice } from "@/lib/currency";
import { gtmBeginCheckout } from "@/lib/gtm";
import { coverSrc } from "@/lib/coverSrc";

const STRINGS = {
    items: (n: number) => `${n} ${n === 1 ? "منتج" : "منتجات"}`,
    yourBasket: "سلة التسوق",
    empty: "سلتك فارغة",
    emptyHint: "يبدو أنك لم تضف أي شيء بعد.",
    continueShopping: "تسوق الآن",
    each: "للقطعة",
    remove: "حذف",
    orderSummary: "ملخص الطلب",
    subtotal: (n: number) => `المجموع (${n} منتجات)`,
    shipping: "الشحن",
    atCheckout: "يُحسب عند الدفع",
    free: "مجاني",
    discount: "خصم",
    total: "الإجمالي",
    checkout: "إتمام الشراء ←",
    egyptOnly: "الدفع متاح داخل مصر فقط حاليًا. يمكنك التصفح بحرية — الطلب أونلاين خارج مصر قريبًا.",
    promoApplied: "تم تطبيق الكوبون",
    havePromo: "لديك كود خصم؟",
    enterCode: "أدخل الكود",
    apply: "تطبيق",
    giftCard: "بطاقة هدايا",
    giftApplied: "تم تطبيق بطاقة الهدايا",
    haveGift: "لديك بطاقة هدايا؟",
    enterGift: "أدخل كود بطاقة الهدايا",
    secure: "دفع آمن",
    returns: "إرجاع سهل خلال ١٤ يومًا",
    continueArrow: "تسوق المزيد ←",
  } as const;

export default function CartPage() {
  const t = STRINGS;
  const { items, removeItem, updateQty, subtotal, couponCode, couponDiscount, applyCoupon, removeCoupon, giftCardCode, giftCardBalance, applyGiftCard, removeGiftCard } = useCartStore();
  const shipsHere = useShipsToEgypt();
  const sub = subtotal();
  // Shipping is NOT charged here — it's calculated at the shipping step once the
  // customer enters their address/governorate. The cart total excludes shipping.
  const discount = couponDiscount;
  // Gift card applies against the amount due (an estimate here; shipping is added
  // at the next step, and the server re-computes the exact amount authoritatively).
  const giftCardApplied = giftCardCode ? Math.min(giftCardBalance, Math.max(0, sub - discount)) : 0;
  const total = Math.max(0, sub - discount - giftCardApplied);

  const [promoVisible, setPromoVisible] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [giftVisible, setGiftVisible] = useState(false);
  const [giftInput, setGiftInput] = useState("");
  const [giftError, setGiftError] = useState("");

  async function applyPromo() {
    setPromoError("");
    const res = await fetch("/api/cart/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: promoInput, subtotal: sub }),
    });
    const data = await res.json();
    if (!res.ok) { setPromoError(data.error ?? "Invalid code"); return; }
    applyCoupon(data.code, data.discount);
  }

  async function applyGift() {
    setGiftError("");
    const res = await fetch("/api/cart/gift-card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: giftInput }),
    });
    const data = await res.json();
    if (!res.ok) { setGiftError(data.error ?? "Invalid gift card"); return; }
    applyGiftCard(data.code, data.balance);
  }

  return (
    <div className="min-h-screen bg-paper-mid">

      {/* Page header */}
      <div className="bg-ink py-10 sm:py-14 px-4 sm:px-10 text-center">
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-brand block mb-3">
          {t.items(items.length)}
        </span>
        <h1
          className="font-display font-bold text-paper leading-tight"
          style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
        >
          {t.yourBasket}
        </h1>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-10 py-8 sm:py-12">

        {items.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border-2 border-paper-dark">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
            </div>
            <p className="font-display text-[24px] font-bold text-ink mb-2">{t.empty}</p>
            <p className="text-[14px] text-ink-muted mb-8 font-light">{t.emptyHint}</p>
            <Link
              href="/"
              className="inline-block bg-brand hover:bg-brand-dark text-white px-10 py-3.5 font-bold uppercase text-[13px] tracking-[0.08em] transition-colors"
            >
              {t.continueShopping}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

            {/* ─── Items column ─── */}
            <div>
              {/* Item rows */}
              <div className="bg-paper border border-paper-dark divide-y divide-paper-dark">
                {items.map((item) => (
                  <div key={item.id} className="grid grid-cols-[80px_1fr] sm:grid-cols-[90px_1fr_auto] gap-4 sm:gap-5 p-4 sm:p-5 items-start">

                    {/* Cover */}
                    <Link href={`/book/${item.slug}`} className="flex-shrink-0 block">
                      <div className="w-[80px] sm:w-[90px] h-[120px] sm:h-[135px] overflow-hidden">
                        {item.coverUrl ? (
                          <Image
                            src={coverSrc(item.coverUrl)}
                            alt={item.title}
                            width={90}
                            height={135}
                            className="cover-img w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center p-2">
                            <span className="text-[9px] text-ink-muted text-center leading-snug">{item.title}</span>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info + qty */}
                    <div className="flex flex-col min-w-0">
                      <Link href={`/book/${item.slug}`} className="group">
                        <p className="font-display text-[15px] sm:text-[16px] font-semibold text-ink leading-snug group-hover:text-brand transition-colors mb-1">
                          {item.title}
                        </p>
                      </Link>
                      {item.author && (
                        <p className="text-[13px] text-ink-muted mb-3">{item.author}</p>
                      )}
                      <p className="price-mono text-[12px] text-ink-muted mb-4">
                        {formatPrice(item.priceEgp)} {t.each}
                      </p>

                      {/* Quantity stepper */}
                      <div className="flex items-center w-fit border border-paper-dark mb-4">
                        <button
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                          className="w-9 h-9 bg-paper-mid hover:bg-paper-dark text-ink text-[18px] leading-none transition-colors flex items-center justify-center"
                          aria-label="تقليل الكمية"
                        >
                          −
                        </button>
                        <span className="w-10 h-9 flex items-center justify-center price-mono text-[14px] font-bold text-ink border-x border-paper-dark">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          className="w-9 h-9 bg-paper-mid hover:bg-paper-dark text-ink text-[18px] leading-none transition-colors flex items-center justify-center"
                          aria-label="زيادة الكمية"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[12px] text-ink-muted hover:text-brand transition-colors underline underline-offset-2 self-start"
                      >
                        {t.remove}
                      </button>
                    </div>

                    {/* Line total — desktop only */}
                    <div className="hidden sm:block text-right flex-shrink-0 pt-1">
                      <span className="price-mono text-[18px] font-medium text-brand">
                        {formatPrice(
                          (item.priceEgp) * item.quantity
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Continue shopping link */}
              <div className="mt-5">
                <Link href="/" className="text-[13px] text-brand font-bold hover:underline underline-offset-2">
                  {t.continueArrow}
                </Link>
              </div>
            </div>

            {/* ─── Order Summary ─── */}
            <div className="sticky top-[80px]">
              <div className="bg-paper border border-paper-dark">
                <div className="px-6 py-5 border-b border-paper-dark">
                  <h2 className="font-display text-[20px] font-bold text-ink">{t.orderSummary}</h2>
                </div>

                <div className="px-6 py-5 space-y-3">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-ink-muted">{t.subtotal(items.reduce((a, i) => a + i.quantity, 0))}</span>
                    <span className="price-mono font-medium text-ink">{formatPrice(sub)}</span>
                  </div>

                  {/* Shipping — computed later from the delivery address */}
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-ink-muted">{t.shipping}</span>
                    <span className="font-medium text-[12px] text-ink-muted">{t.atCheckout}</span>
                  </div>

                  {/* Discount */}
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-[14px] text-green-600">
                      <span>{t.discount} <span className="font-mono text-[11px]">({couponCode})</span></span>
                      <span className="price-mono font-medium">−{formatPrice(discount)}</span>
                    </div>
                  )}

                  {/* Gift card */}
                  {giftCardApplied > 0 && (
                    <div className="flex justify-between items-center text-[14px] text-green-600">
                      <span>{t.giftCard} <span className="font-mono text-[11px]">({giftCardCode})</span></span>
                      <span className="price-mono font-medium">−{formatPrice(giftCardApplied)}</span>
                    </div>
                  )}

                  {/* Total */}
                  <div className="flex justify-between items-baseline pt-4 mt-2 border-t border-paper-dark">
                    <span className="font-display text-[17px] font-bold text-ink">{t.total}</span>
                    <span className="price-mono text-[22px] font-medium text-brand">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* CTA */}
                <div className="px-6 pb-5">
                  {shipsHere ? (
                    <Link
                      href="/checkout/shipping"
                      onClick={() =>
                        gtmBeginCheckout(
                          items.map((i) => ({
                            item_id: i.slug ?? i.id,
                            item_name: i.title,
                            item_brand: i.author,
                            price: getPrice(i),
                            quantity: i.quantity,
                          })),
                          total,
                          couponCode ?? undefined
                        )
                      }
                      className="block w-full text-center py-4 bg-brand hover:bg-brand-dark text-white text-[14px] font-bold uppercase tracking-[0.08em] transition-colors"
                    >
                      {t.checkout}
                    </Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled
                        className="block w-full text-center py-4 bg-ink/40 text-white/70 text-[14px] font-bold uppercase tracking-[0.08em] cursor-not-allowed"
                      >
                        {t.checkout}
                      </button>
                      <p className="mt-3 text-[12px] text-ink-soft bg-paper-mid border border-paper-dark px-3 py-2.5 leading-relaxed">
                        🚚 {t.egyptOnly}
                      </p>
                    </>
                  )}
                </div>

                {/* Promo code */}
                <div className="px-6 pb-6 border-t border-paper-dark pt-5">
                  {couponCode ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 px-4 py-3">
                      <div>
                        <p className="text-[12px] font-mono font-bold text-green-700 uppercase tracking-wide">{couponCode}</p>
                        <p className="text-[12px] text-green-600">{t.promoApplied}</p>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-[12px] text-ink-muted hover:text-brand transition-colors underline underline-offset-2"
                      >
                        {t.remove}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => setPromoVisible((v) => !v)}
                        className="text-[13px] text-brand font-bold hover:underline underline-offset-2 flex items-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {promoVisible ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                        </svg>
                        {t.havePromo}
                      </button>
                      {promoVisible && (
                        <div className="flex gap-2 mt-3">
                          <input
                            type="text"
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                            placeholder={t.enterCode}
                            className="flex-1 px-3 py-2.5 border border-paper-dark bg-paper text-[13px] text-ink outline-none focus:border-brand transition-colors placeholder:text-ink-muted font-mono uppercase"
                          />
                          <button
                            onClick={applyPromo}
                            className="px-4 py-2.5 bg-ink hover:bg-brand text-paper text-[12px] font-bold uppercase tracking-wide transition-colors"
                          >
                            {t.apply}
                          </button>
                        </div>
                      )}
                      {promoError && (
                        <p className="text-[12px] text-red-500 mt-1.5 font-mono">{promoError}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Gift card */}
                <div className="px-6 pb-6 border-t border-paper-dark pt-5">
                  {giftCardCode ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 px-4 py-3">
                      <div>
                        <p className="text-[12px] font-mono font-bold text-green-700 uppercase tracking-wide">{giftCardCode}</p>
                        <p className="text-[12px] text-green-600">{t.giftApplied} — {formatPrice(giftCardBalance)}</p>
                      </div>
                      <button
                        onClick={removeGiftCard}
                        className="text-[12px] text-ink-muted hover:text-brand transition-colors underline underline-offset-2"
                      >
                        {t.remove}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <button
                        onClick={() => setGiftVisible((v) => !v)}
                        className="text-[13px] text-brand font-bold hover:underline underline-offset-2 flex items-center gap-1"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          {giftVisible ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
                        </svg>
                        {t.haveGift}
                      </button>
                      {giftVisible && (
                        <div className="flex gap-2 mt-3">
                          <input
                            type="text"
                            value={giftInput}
                            onChange={(e) => setGiftInput(e.target.value.toUpperCase())}
                            placeholder={t.enterGift}
                            className="flex-1 px-3 py-2.5 border border-paper-dark bg-paper text-[13px] text-ink outline-none focus:border-brand transition-colors placeholder:text-ink-muted font-mono uppercase"
                          />
                          <button
                            onClick={applyGift}
                            className="px-4 py-2.5 bg-ink hover:bg-brand text-paper text-[12px] font-bold uppercase tracking-wide transition-colors"
                          >
                            {t.apply}
                          </button>
                        </div>
                      )}
                      {giftError && (
                        <p className="text-[12px] text-red-500 mt-1.5 font-mono">{giftError}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Trust signals */}
              <div className="mt-4 bg-paper border border-paper-dark px-5 py-4 space-y-2.5">
                {[
                  { icon: "🔒", text: t.secure },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-3">
                    <span className="text-[18px] flex-shrink-0">{icon}</span>
                    <span className="text-[12px] text-ink-muted">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
