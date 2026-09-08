"use client";

import { useCartStore } from "@/stores/cart.store";

export function useCart() {
  const store = useCartStore();

  return {
    ...store,
    subtotalAmount: store.subtotal(),
  };
}
