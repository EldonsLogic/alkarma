"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui.store";

// Default banner shown whenever the admin hasn't set custom promo text.
// Replaces the old free-shipping-threshold message (removed — no longer applicable).
const DEFAULT_PROMO = "🚚 توصيل سريع في جميع أنحاء مصر خلال ٥-٦ أيام عمل";

export function PromoBar() {
  const { promoVisible, dismissPromo } = useUIStore();

  // Optional custom promo text for THIS visitor's region (admin-configured)
  const [data, setData] = useState<{ promoText: string; promoTextAr: string } | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/shipping/free-threshold`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setData({ promoText: d.promoText ?? "", promoTextAr: d.promoTextAr ?? "" }))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  if (!promoVisible) return null;

  const custom = data?.promoTextAr;
  const content: React.ReactNode = custom || DEFAULT_PROMO;

  if (!content) return null;

  return (
    <div
      className="bg-ink text-paper-mid text-center py-[9px] px-4 text-[12px] tracking-[0.04em] relative font-mono"
      role="banner"
    >
      {content}
      <button
        onClick={dismissPromo}
        aria-label={"إغلاق"}
        className="absolute end-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
