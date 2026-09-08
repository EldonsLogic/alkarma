"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart.store";
import { gtmPurchase } from "@/lib/gtm";

interface Props {
  transactionId: string;
  orderNumber: string;
  items: Array<{ id: string; title: string; author: string; slug?: string | null; quantity: number; unitPrice: number }>;
  total: number;
  shipping: number;
  currency: string;
  coupon?: string | null;
}

export function PurchaseEvent({ transactionId, orderNumber, items, total, shipping, coupon }: Props) {
  const clearCart = useCartStore((s) => s.clearCart);

  useEffect(() => {
    gtmPurchase(
      orderNumber,
      items.map((i) => ({
        item_id: i.slug ?? i.id,
        item_name: i.title,
        item_brand: i.author,
        price: i.unitPrice,
        quantity: i.quantity,
      })),
      total,
      shipping,
      coupon ?? undefined
    );
    // Clear the cart after successful purchase
    clearCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
