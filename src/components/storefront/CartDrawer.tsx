"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect } from "react";
import { useCartStore } from "@/stores/cart.store";
import { formatPrice, getPrice } from "@/lib/currency";
import { gtmViewCart } from "@/lib/gtm";
import { coverSrc } from "@/lib/coverSrc";

export function CartDrawer() {
  const { items, isOpen, closeDrawer, removeItem, updateQty, subtotal } = useCartStore();
  const sub = subtotal();

  // GA4 view_cart when drawer opens
  useEffect(() => {
    if (!isOpen || items.length === 0) return;
    gtmViewCart(
      items.map((i) => ({ item_id: i.slug ?? i.id, item_name: i.title, item_brand: i.author, price: getPrice(i), quantity: i.quantity })),
      sub
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const t = {
    basket: "سلة التسوق",
    close: "إغلاق السلة",
    empty: "سلتك فارغة",
    emptyHint: "استعرض مجموعتنا",
    continueShopping: "تسوق الآن",
    remove: "حذف",
    subtotal: "المجموع",
    shippingNote: "يتم احتساب الشحن عند الدفع",
    viewBasket: "عرض السلة والدفع",
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/40 z-[200]"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      {/* Drawer — always on right in LTR, left in RTL is handled by browser */}
      <div
        role="dialog"
        aria-label={t.basket}
        aria-modal="true"
        className={`fixed top-0 right-0 h-full w-full max-w-[420px] bg-paper z-[201] shadow-2xl flex flex-col transition-transform duration-[240ms] ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-paper-dark">
          <h2 className="font-display text-[22px] font-bold text-ink">
            {t.basket}{" "}
            {items.length > 0 && (
              <span className="font-sans text-[16px] font-normal text-brand">({items.length})</span>
            )}
          </h2>
          <button
            onClick={closeDrawer}
            aria-label={t.close}
            className="text-ink-muted hover:text-ink text-2xl leading-none p-1 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-paper-dark">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 01-8 0" />
              </svg>
              <div>
                <p className="font-display text-[18px] font-semibold text-ink">{t.empty}</p>
                <p className="text-[13px] text-ink-muted mt-1">{t.emptyHint}</p>
              </div>
              <button
                onClick={closeDrawer}
                className="mt-1 px-6 py-2.5 bg-brand hover:bg-brand-dark text-white text-[12px] font-bold uppercase tracking-[0.08em] transition-colors"
              >
                {t.continueShopping}
              </button>
            </div>
          ) : (
            <ul className="space-y-0 divide-y divide-paper-dark">
              {items.map((item) => (
                <li key={item.id} className="flex gap-4 py-5">
                  {/* Cover */}
                  <div className="flex-shrink-0 w-16 h-24 bg-paper-mid shadow-sm overflow-hidden">
                    {item.coverUrl ? (
                      <Image
                        src={coverSrc(item.coverUrl)}
                        alt={item.title}
                        width={64}
                        height={96}
                        className="w-16 h-24 object-cover"
                      />
                    ) : (
                      <div className="w-16 h-24 bg-gradient-to-br from-paper-dark to-paper-mid flex items-center justify-center">
                        <span className="text-[9px] text-ink-muted text-center px-1 leading-snug">{item.title}</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[14px] font-semibold text-ink line-clamp-2 leading-snug mb-1">
                      {item.title}
                    </p>
                    {item.author && (
                      <p className="text-[12px] text-ink-muted mb-2">{item.author}</p>
                    )}

                    {/* Qty stepper */}
                    <div className="flex items-center border border-paper-dark w-fit mb-2">
                      <button
                        onClick={() => updateQty(item.id, item.quantity - 1)}
                        className="w-8 h-8 bg-paper-mid hover:bg-paper-dark text-[16px] flex items-center justify-center transition-colors"
                        aria-label="تقليل الكمية"
                      >
                        −
                      </button>
                      <span className="w-10 h-8 flex items-center justify-center text-[13px] font-bold border-x border-paper-dark price-mono">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQty(item.id, item.quantity + 1)}
                        className="w-8 h-8 bg-paper-mid hover:bg-paper-dark text-[16px] flex items-center justify-center transition-colors"
                        aria-label="زيادة الكمية"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-[11px] text-ink-muted hover:text-brand underline transition-colors"
                    >
                      {t.remove}
                    </button>
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0 text-right">
                    <p className="price-mono text-[15px] font-medium text-ink">
                      {formatPrice(
                        (item.priceEgp) * item.quantity
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-5 border-t border-paper-dark space-y-3 bg-paper">
            <div className="flex justify-between text-[14px]">
              <span className="text-ink-muted">{t.subtotal}</span>
              <span className="price-mono font-bold text-ink">{formatPrice(sub)}</span>
            </div>
            <p className="text-[11px] text-ink-muted font-mono">{t.shippingNote}</p>
            <Link
              href="/cart"
              onClick={closeDrawer}
              className="block w-full py-4 bg-brand hover:bg-brand-dark text-white text-[13px] font-bold uppercase tracking-[0.08em] text-center transition-colors"
            >
              {t.viewBasket}
            </Link>
            <button
              onClick={closeDrawer}
              className="block w-full py-2.5 text-ink-muted text-[12px] font-bold uppercase tracking-[0.06em] text-center hover:text-ink transition-colors"
            >
              {t.continueShopping}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
