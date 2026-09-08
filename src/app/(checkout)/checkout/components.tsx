"use client";

import { formatPrice } from "@/lib/currency";

// ─── Checkout Step Progress Bar ───────────────────────────────────────────────

export function CheckoutProgress({ step }: { step: number }) {
  const steps = ["السلة", "الشحن", "الدفع", "التأكيد"];

  return (
    <div className="flex items-center w-full">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center flex-1 last:flex-none">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-[11px] sm:text-[12px] font-bold transition-colors ${
                i < step
                  ? "bg-green-600 text-white"
                  : i === step
                  ? "bg-brand text-white"
                  : "bg-paper-dark text-ink-muted"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`price-mono text-[10px] sm:text-[11px] uppercase tracking-[0.08em] font-bold ${
                i === step ? "text-brand" : i < step ? "text-green-600" : "text-ink-muted"
              }`}
            >
              {s}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`flex-1 h-px mx-1.5 sm:mx-3 min-w-[12px] ${
                i < step ? "bg-green-600" : "bg-paper-dark"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Order Summary Sidebar ────────────────────────────────────────────────────

export function OrderSummary({
  items,
  sub,
}: {
  items: any[];
  sub: number;
}) {

  return (
    <div className="bg-paper border border-paper-dark sticky top-[89px]">
      <div className="px-5 py-4 border-b border-paper-dark">
        <h3 className="font-display text-[17px] font-bold text-ink">ملخص الطلب</h3>
      </div>
      <ul className="divide-y divide-paper-dark">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-5 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-ink line-clamp-1">{item.title}</p>
              <p className="price-mono text-[11px] text-ink-muted">×{item.quantity}</p>
            </div>
            <span className="price-mono text-[13px] font-medium text-brand flex-shrink-0">
              {formatPrice(
                (item.priceEgp) * item.quantity
              )}
            </span>
          </li>
        ))}
      </ul>
      <div className="px-5 py-4 border-t border-paper-dark flex justify-between items-baseline">
        <span className="font-display text-[15px] font-bold text-ink">المجموع</span>
        <span className="price-mono text-[18px] font-medium text-brand">
          {formatPrice(sub)}
        </span>
      </div>
    </div>
  );
}
