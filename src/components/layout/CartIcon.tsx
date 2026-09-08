"use client";

import { useState, useEffect } from "react";
import { useCartStore } from "@/stores/cart.store";

export function CartIcon() {
  const { totalItems, openDrawer } = useCartStore();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const count = mounted ? totalItems() : 0;

  return (
    <button
      onClick={openDrawer}
      aria-label={`Cart, ${count} items`}
      className="flex flex-col items-center gap-[2px] relative cursor-pointer"
    >
      <div className="relative" suppressHydrationWarning>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-[6px] -right-[8px] bg-brand text-white rounded-full w-[18px] h-[18px] text-[10px] font-bold flex items-center justify-center leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>
      <span className="text-[11px] text-[#666]">السلة</span>
    </button>
  );
}
