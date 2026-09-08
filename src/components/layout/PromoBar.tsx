"use client";

import { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui.store";

// The live storefront has no promo strip above the header, so this renders
// NOTHING unless an admin sets promo text in Admin → Content. The feature is
// kept (it is genuinely useful for campaigns) but is off by default rather
// than shipping a message the real site doesn't show.

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

  const content: React.ReactNode = data?.promoTextAr?.trim() || null;

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
